"use server";

import {
  formatUnits,
  keccak256,
  encodePacked,
  type Address,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  publicClient,
  operatorClient,
  auditorClient,
  agentClient,
} from "@/lib/contracts/client";
import { addresses, keys } from "@/lib/contracts/config";
import {
  CCPRegistryABI,
  SpendingLimitABI,
  ReserveVaultABI,
  AuditorStakingABI,
} from "@/lib/contracts/abis";

const ERC20_APPROVE_ABI = [
  {
    name: "approve",
    type: "function",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

const CONTAINMENT_BOUND = 50_000_000_000n;
const AUDITOR_STAKE = 1_500_000_000n;
const COUNTERPARTY = "0x000000000000000000000000000000000000dEaD" as Address;
const ZERO_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as Hash;

// ─── Helpers ───

async function getOrCreateCertHash(): Promise<{
  certHash: Hash;
  isExisting: boolean;
}> {
  const agentAccount = privateKeyToAccount(keys.agent);

  // Check if agent already has an active certificate
  const existing = (await publicClient.readContract({
    address: addresses.registry,
    abi: CCPRegistryABI,
    functionName: "getActiveCertificate",
    args: [agentAccount.address],
  })) as Hash;

  if (existing && existing !== ZERO_HASH) {
    return { certHash: existing, isExisting: true };
  }

  // Create a new one
  const operator = privateKeyToAccount(keys.operator);
  const certHash = keccak256(
    encodePacked(
      ["address", "address", "uint256", "string"],
      [agentAccount.address, operator.address, BigInt(Date.now()), "ccp-v0.2"],
    ),
  );
  return { certHash, isExisting: false };
}

// ─── Phase 1: Auditor Audit & Attestation ───

export async function demoPhase1_AuditorAttest(): Promise<{
  txHash?: string;
  error?: string;
  findings?: string[];
  certClass?: string;
  stakeAmount?: string;
  certHash?: string;
  reusedExisting?: boolean;
}> {
  try {
    const auditor = auditorClient();

    // Audit checks (read-only — always works)
    const [
      maxSingle,
      maxPeriodic,
      cosignThreshold,
      ledgerCosigner,
      reserveBalance,
      reserveAdequate,
      reserveLocked,
    ] = await Promise.all([
      publicClient.readContract({
        address: addresses.spendingLimit,
        abi: SpendingLimitABI,
        functionName: "maxSingleAction",
      }),
      publicClient.readContract({
        address: addresses.spendingLimit,
        abi: SpendingLimitABI,
        functionName: "maxPeriodicLoss",
      }),
      publicClient.readContract({
        address: addresses.spendingLimit,
        abi: SpendingLimitABI,
        functionName: "cosignThreshold",
      }),
      publicClient.readContract({
        address: addresses.spendingLimit,
        abi: SpendingLimitABI,
        functionName: "ledgerCosigner",
      }),
      publicClient.readContract({
        address: addresses.reserveVault,
        abi: ReserveVaultABI,
        functionName: "getReserveBalance",
      }),
      publicClient.readContract({
        address: addresses.reserveVault,
        abi: ReserveVaultABI,
        functionName: "isAdequate",
        args: [CONTAINMENT_BOUND, 30000],
      }),
      publicClient.readContract({
        address: addresses.reserveVault,
        abi: ReserveVaultABI,
        functionName: "isLocked",
      }),
    ]);

    const findings = [
      `maxSingleAction: ${formatUnits(maxSingle as bigint, 6)} USDC`,
      `maxPeriodicLoss: ${formatUnits(maxPeriodic as bigint, 6)} USDC`,
      `cosignThreshold: ${formatUnits(cosignThreshold as bigint, 6)} USDC`,
      `ledgerCosigner: ${(ledgerCosigner as string).slice(0, 12)}...`,
      `reserveBalance: ${formatUnits(reserveBalance as bigint, 6)} USDC`,
      `reserveAdequate (3x): ${reserveAdequate}`,
      `reserveLocked: ${reserveLocked}`,
    ];

    const { certHash, isExisting } = await getOrCreateCertHash();

    if (isExisting) {
      // Certificate already exists — skip staking, just show audit results
      const auditorAccount = privateKeyToAccount(keys.auditor);
      let existingStake = "0";
      try {
        const stake = await publicClient.readContract({
          address: addresses.auditorStaking,
          abi: AuditorStakingABI,
          functionName: "getStake",
          args: [auditorAccount.address, certHash],
        });
        existingStake = formatUnits(stake as bigint, 6);
      } catch {}

      return {
        findings,
        certClass: "C2",
        stakeAmount: existingStake,
        certHash,
        reusedExisting: true,
      };
    }

    // New cert — approve + stake
    const approveTx = await auditor.writeContract({
      address: addresses.usdc,
      abi: ERC20_APPROVE_ABI,
      functionName: "approve",
      args: [addresses.auditorStaking, AUDITOR_STAKE],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveTx });

    const stakeTx = await auditor.writeContract({
      address: addresses.auditorStaking,
      abi: AuditorStakingABI,
      functionName: "stake",
      args: [certHash, AUDITOR_STAKE],
    });
    await publicClient.waitForTransactionReceipt({ hash: stakeTx });

    return {
      txHash: stakeTx,
      findings,
      certClass: "C2",
      stakeAmount: formatUnits(AUDITOR_STAKE, 6),
      certHash,
    };
  } catch (e: any) {
    return { error: e.message?.slice(0, 200) || "Attestation failed" };
  }
}

// ─── Phase 2: Publish Certificate ───

export async function demoPhase2_PublishCert(phase1CertHash?: string): Promise<{
  txHash?: string;
  error?: string;
  certHash?: string;
  isValid?: boolean;
  reusedExisting?: boolean;
}> {
  try {
    // Use the cert hash from Phase 1 to avoid regenerating a different hash (Date.now() changes)
    const { certHash, isExisting } = phase1CertHash
      ? await (async () => {
          const hash = phase1CertHash as Hash;
          // Check if this cert is already published
          try {
            const valid = await publicClient.readContract({
              address: addresses.registry,
              abi: CCPRegistryABI,
              functionName: "isValid",
              args: [hash],
            });
            return { certHash: hash, isExisting: valid as boolean };
          } catch {
            return { certHash: hash, isExisting: false };
          }
        })()
      : await getOrCreateCertHash();

    if (isExisting) {
      // Already published — just verify it
      const valid = await publicClient.readContract({
        address: addresses.registry,
        abi: CCPRegistryABI,
        functionName: "isValid",
        args: [certHash],
      });
      return { certHash, isValid: valid as boolean, reusedExisting: true };
    }

    // Publish new cert
    const operator = operatorClient();
    const agentAccount = privateKeyToAccount(keys.agent);
    const auditorAccount = privateKeyToAccount(keys.auditor);

    const operatorSig = await operator.account.signMessage({
      message: { raw: certHash },
    });
    const auditorSig = await auditorAccount.signMessage({
      message: { raw: certHash },
    });

    const publishParams = {
      certHash,
      agent: agentAccount.address,
      certificateClass: 2,
      expiresAt: Math.floor(Date.now() / 1000) + 60 * 86400,
      containmentBound: CONTAINMENT_BOUND,
      reserveVault: addresses.reserveVault,
      spendingLimit: addresses.spendingLimit,
      ipfsUri: "ipfs://QmCCPDemoCertificate",
    };

    const txHash = await operator.writeContract({
      address: addresses.registry,
      abi: CCPRegistryABI,
      functionName: "publish",
      args: [publishParams, operatorSig, [auditorSig]],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    const valid = await publicClient.readContract({
      address: addresses.registry,
      abi: CCPRegistryABI,
      functionName: "isValid",
      args: [certHash],
    });

    return { txHash, certHash, isValid: valid as boolean };
  } catch (e: any) {
    return { error: e.message?.slice(0, 200) || "Publication failed" };
  }
}

// ─── Phase 3: Counterparty Verification ───

export async function demoPhase3_Verify(): Promise<{
  error?: string;
  acceptable?: boolean;
  certHash?: string;
  stake?: string;
  reserve?: string;
}> {
  try {
    const agentAccount = privateKeyToAccount(keys.agent);
    const auditorAccount = privateKeyToAccount(keys.auditor);
    const { certHash } = await getOrCreateCertHash();

    const [verifyResult, stake, reserve] = await Promise.all([
      publicClient.readContract({
        address: addresses.registry,
        abi: CCPRegistryABI,
        functionName: "verify",
        args: [agentAccount.address, 1, 100_000_000_000n],
      }),
      publicClient.readContract({
        address: addresses.auditorStaking,
        abi: AuditorStakingABI,
        functionName: "getStake",
        args: [auditorAccount.address, certHash],
      }),
      publicClient.readContract({
        address: addresses.reserveVault,
        abi: ReserveVaultABI,
        functionName: "getReserveBalance",
      }),
    ]);

    const [acceptable, foundCert] = verifyResult as [boolean, Hash];

    return {
      acceptable,
      certHash: foundCert,
      stake: formatUnits(stake as bigint, 6),
      reserve: formatUnits(reserve as bigint, 6),
    };
  } catch (e: any) {
    return { error: e.message?.slice(0, 200) || "Verification failed" };
  }
}

// ─── Phase 4: Small Payment ($500 — Agent Only) ───

export async function demoPhase4_SmallPayment(): Promise<{
  txHash?: string;
  error?: string;
  spent?: string;
  limit?: string;
}> {
  try {
    const agent = agentClient();
    const value = 500_000_000n; // $500

    const txHash = await agent.writeContract({
      address: addresses.spendingLimit,
      abi: SpendingLimitABI,
      functionName: "execute",
      args: [COUNTERPARTY, value, "0x"],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    const [spent, limit] = (await publicClient.readContract({
      address: addresses.spendingLimit,
      abi: SpendingLimitABI,
      functionName: "getSpentInPeriod",
    })) as unknown as [bigint, bigint, bigint];

    return {
      txHash,
      spent: formatUnits(spent, 6),
      limit: formatUnits(limit, 6),
    };
  } catch (e: any) {
    return { error: e.message?.slice(0, 200) || "Payment failed" };
  }
}

// ─── Phase 5: Large Payment ($7,000 — Ledger Co-Sign) ───

export async function demoPhase5_LargePayment(): Promise<{
  txHash?: string;
  error?: string;
  spent?: string;
  limit?: string;
}> {
  try {
    const agent = agentClient();
    const value = 7_000_000_000n; // $7,000

    // Generate Ledger co-signature
    const txHashToSign = keccak256(
      encodePacked(
        ["address", "uint256", "uint256", "address"],
        [COUNTERPARTY, value, 296n, addresses.spendingLimit],
      ),
    );
    const ledgerAccount = privateKeyToAccount(keys.ledger);
    const cosig = await ledgerAccount.signMessage({
      message: { raw: txHashToSign },
    });

    const txHash = await agent.writeContract({
      address: addresses.spendingLimit,
      abi: SpendingLimitABI,
      functionName: "executeWithCosign",
      args: [COUNTERPARTY, value, "0x", cosig],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    const [spent, limit] = (await publicClient.readContract({
      address: addresses.spendingLimit,
      abi: SpendingLimitABI,
      functionName: "getSpentInPeriod",
    })) as unknown as [bigint, bigint, bigint];

    return {
      txHash,
      spent: formatUnits(spent, 6),
      limit: formatUnits(limit, 6),
    };
  } catch (e: any) {
    return { error: e.message?.slice(0, 200) || "Payment failed" };
  }
}

// ─── Phase 6: Over-Limit ($45,000 — BLOCKED) ───

export async function demoPhase6_OverLimit(): Promise<{
  blocked?: boolean;
  error?: string;
  reason?: string;
  remaining?: string;
}> {
  try {
    const agent = agentClient();
    const value = 45_000_000_000n; // $45,000

    const txHashToSign = keccak256(
      encodePacked(
        ["address", "uint256", "uint256", "address"],
        [COUNTERPARTY, value, 296n, addresses.spendingLimit],
      ),
    );
    const ledgerAccount = privateKeyToAccount(keys.ledger);
    const cosig = await ledgerAccount.signMessage({
      message: { raw: txHashToSign },
    });

    try {
      await agent.writeContract({
        address: addresses.spendingLimit,
        abi: SpendingLimitABI,
        functionName: "executeWithCosign",
        args: [COUNTERPARTY, value, "0x", cosig],
      });
      // Should not reach here
      return { blocked: false, reason: "Transaction unexpectedly succeeded" };
    } catch {
      const remaining = await publicClient.readContract({
        address: addresses.spendingLimit,
        abi: SpendingLimitABI,
        functionName: "getRemainingAllowance",
      });
      return {
        blocked: true,
        reason: "EXCEEDS_PERIODIC_LIMIT",
        remaining: formatUnits(remaining as bigint, 6),
      };
    }
  } catch (e: any) {
    return { error: e.message?.slice(0, 200) || "Demo phase failed" };
  }
}

// ─── Phase 7: HCS Event Timeline ───

export async function demoPhase7_Timeline(): Promise<{
  events?: Array<{
    type: string;
    timestamp: string;
    details: Record<string, string>;
  }>;
  error?: string;
}> {
  try {
    const topicId = process.env.HCS_TOPIC_ID;
    if (!topicId) {
      return { events: [], error: "No HCS_TOPIC_ID configured" };
    }

    const { getTopicMessages } = await import("@/lib/hedera/mirror");
    const messages = await getTopicMessages(topicId, 20);

    const events = messages.map((msg) => ({
      type: msg.content.type,
      timestamp: msg.timestamp,
      details: {
        ...(msg.content.agent && { agent: msg.content.agent }),
        ...(msg.content.value && { value: `$${msg.content.value} USDC` }),
        ...(msg.content.class && { class: msg.content.class }),
        ...(msg.content.reason && { reason: msg.content.reason }),
        ...(msg.content.ledgerCosigned !== undefined && {
          cosigned: String(msg.content.ledgerCosigned),
        }),
      },
    }));

    return { events };
  } catch (e: any) {
    return { error: e.message?.slice(0, 200) || "Failed to fetch timeline" };
  }
}
