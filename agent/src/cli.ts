#!/usr/bin/env node
/**
 * CCP — Containment Certificate Protocol CLI
 *
 * Usage: ccp <command> [options]
 *
 * Commands:
 *   status                          Show full system overview
 *   cert:get <certHash>             Get certificate details
 *   cert:lookup <agentAddress>      Lookup active certificate by agent address
 *   cert:verify <agentAddress>      Verify agent meets containment requirements
 *   cert:valid <certHash>           Check if certificate is valid
 *   cert:publish                    Publish a new certificate (full flow)
 *   cert:revoke <certHash>          Revoke a certificate (operator only)
 *   reserve:status                  Show reserve vault status
 *   reserve:deposit <amount>        Deposit USDC into reserve vault
 *   reserve:lock <days>             Lock reserve for N days
 *   spending:status                 Show spending limit status
 *   spending:pay <to> <amount>      Execute a payment through SpendingLimit
 *   spending:pay:cosign <to> <amt>  Execute payment with Ledger co-sign
 *   auditor:status [address]        Show auditor info
 *   auditor:audit                   Run containment audit
 *   auditor:attest <certHash>       Full attest flow (audit + stake + sign)
 *   challenge:get <id>              Get challenge details
 *   challenge:list <certHash>       List challenges for a certificate
 *   hcs:timeline                    Show HCS event timeline
 *   hcs:create-topic                Create a new HCS topic
 *   addresses                       Show all contract addresses
 *   actors                          Show all actor addresses
 *   help                            Show this help message
 */

import "dotenv/config";
import {
  formatUnits,
  formatEther,
  parseUnits,
  parseEther,
  keccak256,
  encodePacked,
  type Address,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { publicClient, getWalletClient } from "./client.js";
import { addresses, keys, hederaConfig } from "./config.js";
import {
  CCPRegistryABI,
  ReserveVaultABI,
  SpendingLimitABI,
  AuditorStakingABI,
  FeeEscrowABI,
  ChallengeManagerABI,
} from "./contracts/index.js";
import { auditContainment, attestCertificate } from "./auditor/attest.js";
import {
  ledgerSignCertificate,
  executeWithLedgerCosign,
} from "./ledger/cosigner.js";
import {
  publishCertificatePublished,
  publishAgentTransaction,
  publishTransactionBlocked,
} from "./hcs/publisher.js";
import { printEventTimeline, getTopicMessages } from "./hedera/mirrorNode.js";
import {
  getCCPTextRecords,
  resolveENS,
  discoverAgent,
  CCP_TEXT_KEYS,
} from "./ens/textRecords.js";
import { ensConfig } from "./config.js";

// ─── Helpers ───

const USDC_DECIMALS = 6;

function fmt(amount: bigint): string {
  return formatUnits(amount, USDC_DECIMALS);
}

function parse(amount: string): bigint {
  return parseUnits(amount, USDC_DECIMALS);
}

const STATUS_NAMES = ["ACTIVE", "REVOKED", "EXPIRED", "CHALLENGED"] as const;
const CLASS_NAMES = ["NONE", "C1", "C2", "C3"] as const;
const CHALLENGE_TYPE_NAMES = [
  "RESERVE_SHORTFALL",
  "CONSTRAINT_BYPASS",
  "FALSE_INDEPENDENCE",
  "INVALID_VERIFICATION",
  "SCOPE_NOT_PERFORMED",
] as const;
const CHALLENGE_STATUS_NAMES = [
  "PENDING",
  "UPHELD",
  "REJECTED",
  "INFORMATIONAL",
] as const;

function line(label: string, value: string | number | boolean | bigint) {
  console.log(`  ${label.padEnd(28)} ${value}`);
}

function header(title: string) {
  console.log(`\n${"━".repeat(50)}`);
  console.log(`  ${title}`);
  console.log(`${"━".repeat(50)}\n`);
}

function divider() {
  console.log(`  ${"─".repeat(46)}`);
}

function getActorAddresses() {
  return {
    operator: privateKeyToAccount(keys.operator).address,
    auditor: privateKeyToAccount(keys.auditor).address,
    agent: privateKeyToAccount(keys.agent).address,
    ledger: privateKeyToAccount(keys.ledger).address,
  };
}

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
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
  {
    name: "mint",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// ─── Commands ───

async function cmdStatus() {
  header("CCP Protocol Status");

  const actors = getActorAddresses();

  // Spending Limit
  console.log("  SPENDING LIMIT");
  divider();
  const [maxSingle, maxPeriodic, cosignThreshold, ledgerCosigner, remaining] =
    await Promise.all([
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
        address: addresses.spendingLimit,
        abi: SpendingLimitABI,
        functionName: "getRemainingAllowance",
      }),
    ]);

  const [spent, limit, periodEnd] = await publicClient.readContract({
    address: addresses.spendingLimit,
    abi: SpendingLimitABI,
    functionName: "getSpentInPeriod",
  });

  line("Max Single Action", `$${fmt(maxSingle)} USDC`);
  line("Max Periodic Loss", `$${fmt(maxPeriodic)} USDC`);
  line("Cosign Threshold", `$${fmt(cosignThreshold)} USDC`);
  line("Ledger Cosigner", ledgerCosigner as string);
  line("Period Spent", `$${fmt(spent)} / $${fmt(limit)} USDC`);
  line("Remaining Allowance", `$${fmt(remaining)} USDC`);
  line(
    "Period Ends",
    new Date(Number(periodEnd) * 1000).toISOString()
  );

  // Reserve Vault
  console.log("\n  RESERVE VAULT");
  divider();
  const [reserveBalance, isLocked, lockUntil, statedAmount] =
    await Promise.all([
      publicClient.readContract({
        address: addresses.reserveVault,
        abi: ReserveVaultABI,
        functionName: "getReserveBalance",
      }),
      publicClient.readContract({
        address: addresses.reserveVault,
        abi: ReserveVaultABI,
        functionName: "isLocked",
      }),
      publicClient.readContract({
        address: addresses.reserveVault,
        abi: ReserveVaultABI,
        functionName: "lockUntil",
      }),
      publicClient.readContract({
        address: addresses.reserveVault,
        abi: ReserveVaultABI,
        functionName: "getStatedAmount",
      }),
    ]);

  line("Reserve Balance", `$${fmt(reserveBalance)} USDC`);
  line("Stated Amount", `$${fmt(statedAmount)} USDC`);
  line("Locked", String(isLocked));
  line(
    "Lock Until",
    Number(lockUntil) > 0
      ? new Date(Number(lockUntil) * 1000).toISOString()
      : "Not locked"
  );

  // Balances (HBAR + USDC)
  console.log("\n  BALANCES (HBAR / USDC)");
  divider();
  for (const [name, addr] of Object.entries(actors)) {
    const [hbar, usdc] = await Promise.all([
      publicClient.getBalance({ address: addr as Address }),
      publicClient.readContract({
        address: addresses.usdc,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [addr as Address],
      }),
    ]);
    line(
      `${name.charAt(0).toUpperCase() + name.slice(1)}`,
      `${formatEther(hbar)} HBAR  |  $${fmt(usdc)} USDC`
    );
  }

  const slBal = await publicClient.readContract({
    address: addresses.usdc,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [addresses.spendingLimit],
  });
  line("SpendingLimit Contract", `$${fmt(slBal)} USDC`);

  // Active certificate for agent
  console.log("\n  AGENT CERTIFICATE");
  divider();
  try {
    const certHash = await publicClient.readContract({
      address: addresses.registry,
      abi: CCPRegistryABI,
      functionName: "getActiveCertificate",
      args: [actors.agent as Address],
    });
    if (
      certHash ===
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    ) {
      line("Status", "No active certificate");
    } else {
      line("Cert Hash", certHash as string);
      const cert = await publicClient.readContract({
        address: addresses.registry,
        abi: CCPRegistryABI,
        functionName: "getCertificate",
        args: [certHash],
      });
      line("Class", CLASS_NAMES[(cert as any).certificateClass] || "Unknown");
      line("Status", STATUS_NAMES[(cert as any).status] || "Unknown");
      line("Containment Bound", `$${fmt((cert as any).containmentBound)} USDC`);
      line(
        "Expires",
        new Date(Number((cert as any).expiresAt) * 1000).toISOString()
      );
      line("Valid", String(await publicClient.readContract({
        address: addresses.registry,
        abi: CCPRegistryABI,
        functionName: "isValid",
        args: [certHash],
      })));
    }
  } catch {
    line("Status", "No active certificate");
  }

  console.log("");
}

async function cmdCertGet(certHashArg: string) {
  header("Certificate Details");

  const certHash = certHashArg as Hash;
  const cert = (await publicClient.readContract({
    address: addresses.registry,
    abi: CCPRegistryABI,
    functionName: "getCertificate",
    args: [certHash],
  })) as any;

  const isValid = await publicClient.readContract({
    address: addresses.registry,
    abi: CCPRegistryABI,
    functionName: "isValid",
    args: [certHash],
  });

  line("Cert Hash", certHash);
  line("Operator", cert.operator);
  line("Agent", cert.agent);
  line("Class", CLASS_NAMES[cert.certificateClass] || "Unknown");
  line("Status", STATUS_NAMES[cert.status] || "Unknown");
  line("Valid", String(isValid));
  line("Containment Bound", `$${fmt(cert.containmentBound)} USDC`);
  line("Issued At", new Date(Number(cert.issuedAt) * 1000).toISOString());
  line("Expires At", new Date(Number(cert.expiresAt) * 1000).toISOString());
  line("Reserve Vault", cert.reserveVault);
  line("Spending Limit", cert.spendingLimit);
  line("IPFS URI", cert.ipfsUri);
  line("Auditors", cert.auditors?.length || 0);

  if (cert.auditors?.length > 0) {
    for (const auditor of cert.auditors) {
      line("  Auditor", auditor);
    }
  }

  console.log("");
}

async function cmdCertLookup(agentAddress: string) {
  header("Certificate Lookup");

  const certHash = await publicClient.readContract({
    address: addresses.registry,
    abi: CCPRegistryABI,
    functionName: "getActiveCertificate",
    args: [agentAddress as Address],
  });

  if (
    certHash ===
    "0x0000000000000000000000000000000000000000000000000000000000000000"
  ) {
    console.log("  No active certificate found for this agent.\n");
    return;
  }

  line("Agent", agentAddress);
  line("Active Cert Hash", certHash as string);
  console.log("");

  await cmdCertGet(certHash as string);
}

async function cmdCertVerify(agentAddress: string, minClass = "1", maxLoss = "100000") {
  header("Certificate Verification");

  const maxLossUsdc = parse(maxLoss);

  const [acceptable, certHash] = await publicClient.readContract({
    address: addresses.registry,
    abi: CCPRegistryABI,
    functionName: "verify",
    args: [agentAddress as Address, parseInt(minClass), maxLossUsdc],
  });

  line("Agent", agentAddress);
  line("Min Class Required", `C${minClass}`);
  line("Max Acceptable Loss", `$${maxLoss} USDC`);
  divider();
  line("Acceptable", String(acceptable));
  line("Cert Hash", (certHash as string).slice(0, 18) + "...");

  if (acceptable) {
    console.log("\n  VERIFICATION PASSED\n");
  } else {
    console.log("\n  VERIFICATION FAILED\n");
  }
}

async function cmdCertValid(certHash: string) {
  const isValid = await publicClient.readContract({
    address: addresses.registry,
    abi: CCPRegistryABI,
    functionName: "isValid",
    args: [certHash as Hash],
  });
  header("Certificate Validity");
  line("Cert Hash", certHash);
  line("Valid", String(isValid));
  console.log("");
}

async function cmdCertPublish() {
  header("Publish Certificate");

  const operatorWallet = getWalletClient(keys.operator);
  const agentWallet = getWalletClient(keys.agent);
  const containmentBound = 50_000_000_000n; // $50k
  const auditorStake = 1_500_000_000n; // $1.5k

  // Generate cert hash
  const certHash = keccak256(
    encodePacked(
      ["address", "address", "uint256", "string"],
      [
        agentWallet.account.address,
        operatorWallet.account.address,
        BigInt(Date.now()),
        "ccp-v0.2",
      ]
    )
  );

  console.log(`  Cert Hash: ${certHash}`);
  console.log(`  Agent: ${agentWallet.account.address}`);
  console.log(`  Operator: ${operatorWallet.account.address}`);
  console.log(`  Containment Bound: $${fmt(containmentBound)} USDC\n`);

  // Phase 1: Auditor attestation
  console.log("  [1/3] Auditor audit + stake + attest...");
  const { signature: auditorSig, auditResult } = await attestCertificate(
    certHash,
    addresses.spendingLimit,
    addresses.reserveVault,
    containmentBound,
    auditorStake
  );
  console.log(`  Audit: ${auditResult.certClass}`);

  // Phase 2: Operator signs
  console.log("\n  [2/3] Operator signing certificate (Ledger)...");
  const operatorSig = await ledgerSignCertificate(certHash);

  // Phase 3: Publish on-chain
  console.log("\n  [3/3] Publishing on-chain...");
  const publishParams = {
    certHash,
    agent: agentWallet.account.address,
    certificateClass: 2,
    expiresAt: Math.floor(Date.now() / 1000) + 60 * 24 * 3600,
    containmentBound,
    reserveVault: addresses.reserveVault,
    spendingLimit: addresses.spendingLimit,
    ipfsUri: "ipfs://QmCCPDemoCertificate",
  };

  const tx = await operatorWallet.writeContract({
    address: addresses.registry,
    abi: CCPRegistryABI,
    functionName: "publish",
    args: [publishParams, operatorSig, [auditorSig]],
  });
  await publicClient.waitForTransactionReceipt({ hash: tx });

  console.log(`\n  Certificate published!`);
  line("TX", tx);
  line("Cert Hash", certHash);

  // HCS event (non-fatal)
  try {
    await publishCertificatePublished(
      certHash,
      agentWallet.account.address,
      operatorWallet.account.address,
      "C2",
      fmt(containmentBound)
    );
  } catch {
    console.log("  [HCS] Event skipped");
  }

  console.log("");
}

async function cmdCertRevoke(certHash: string) {
  header("Revoke Certificate");

  const operatorWallet = getWalletClient(keys.operator);
  const tx = await operatorWallet.writeContract({
    address: addresses.registry,
    abi: CCPRegistryABI,
    functionName: "revoke",
    args: [certHash as Hash],
  });
  await publicClient.waitForTransactionReceipt({ hash: tx });

  line("Cert Hash", certHash);
  line("TX", tx);
  console.log("  Certificate revoked.\n");
}

async function cmdReserveStatus() {
  header("Reserve Vault Status");

  const [balance, statedAmount, isLocked, lockUntil, operator, reserveAsset] =
    await Promise.all([
      publicClient.readContract({
        address: addresses.reserveVault,
        abi: ReserveVaultABI,
        functionName: "getReserveBalance",
      }),
      publicClient.readContract({
        address: addresses.reserveVault,
        abi: ReserveVaultABI,
        functionName: "getStatedAmount",
      }),
      publicClient.readContract({
        address: addresses.reserveVault,
        abi: ReserveVaultABI,
        functionName: "isLocked",
      }),
      publicClient.readContract({
        address: addresses.reserveVault,
        abi: ReserveVaultABI,
        functionName: "lockUntil",
      }),
      publicClient.readContract({
        address: addresses.reserveVault,
        abi: ReserveVaultABI,
        functionName: "operator",
      }),
      publicClient.readContract({
        address: addresses.reserveVault,
        abi: ReserveVaultABI,
        functionName: "reserveAsset",
      }),
    ]);

  line("Contract", addresses.reserveVault);
  line("Operator", operator as string);
  line("Reserve Asset", reserveAsset as string);
  divider();
  line("Balance", `$${fmt(balance as bigint)} USDC`);
  line("Stated Amount", `$${fmt(statedAmount as bigint)} USDC`);
  line("Locked", String(isLocked));
  line(
    "Lock Until",
    Number(lockUntil) > 0
      ? new Date(Number(lockUntil as number) * 1000).toISOString()
      : "Not locked"
  );

  // Adequacy check for C2 (3x)
  const isAdequateC2 = await publicClient.readContract({
    address: addresses.reserveVault,
    abi: ReserveVaultABI,
    functionName: "isAdequate",
    args: [50_000_000_000n, 30000], // $50k bound, 3x ratio
  });
  line("Adequate for C2 ($50k)", String(isAdequateC2));

  console.log("");
}

async function cmdReserveDeposit(amountStr: string) {
  header("Deposit Reserve");

  const amount = parse(amountStr);
  const operatorWallet = getWalletClient(keys.operator);

  console.log(`  Depositing $${amountStr} USDC...\n`);

  // Approve
  const approveTx = await operatorWallet.writeContract({
    address: addresses.usdc,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [addresses.reserveVault, amount],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveTx });
  line("Approve TX", approveTx);

  // Deposit
  const depositTx = await operatorWallet.writeContract({
    address: addresses.reserveVault,
    abi: ReserveVaultABI,
    functionName: "deposit",
    args: [amount],
  });
  await publicClient.waitForTransactionReceipt({ hash: depositTx });
  line("Deposit TX", depositTx);

  const newBalance = await publicClient.readContract({
    address: addresses.reserveVault,
    abi: ReserveVaultABI,
    functionName: "getReserveBalance",
  });
  line("New Balance", `$${fmt(newBalance)} USDC`);
  console.log("");
}

async function cmdReserveLock(daysStr: string) {
  header("Lock Reserve");

  const days = parseInt(daysStr);
  const lockUntil = Math.floor(Date.now() / 1000) + days * 24 * 3600;
  const operatorWallet = getWalletClient(keys.operator);

  const tx = await operatorWallet.writeContract({
    address: addresses.reserveVault,
    abi: ReserveVaultABI,
    functionName: "lock",
    args: [lockUntil],
  });
  await publicClient.waitForTransactionReceipt({ hash: tx });

  line("TX", tx);
  line("Lock Until", new Date(lockUntil * 1000).toISOString());
  line("Days", String(days));
  console.log("");
}

async function cmdSpendingStatus() {
  header("Spending Limit Status");

  const [
    agent,
    maxSingle,
    maxPeriodic,
    cosignThreshold,
    ledgerCosigner,
    remaining,
    periodDuration,
    spendAsset,
  ] = await Promise.all([
    publicClient.readContract({
      address: addresses.spendingLimit,
      abi: SpendingLimitABI,
      functionName: "agent",
    }),
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
      address: addresses.spendingLimit,
      abi: SpendingLimitABI,
      functionName: "getRemainingAllowance",
    }),
    publicClient.readContract({
      address: addresses.spendingLimit,
      abi: SpendingLimitABI,
      functionName: "periodDuration",
    }),
    publicClient.readContract({
      address: addresses.spendingLimit,
      abi: SpendingLimitABI,
      functionName: "spendAsset",
    }),
  ]);

  const [spent, limit, periodEnd] = await publicClient.readContract({
    address: addresses.spendingLimit,
    abi: SpendingLimitABI,
    functionName: "getSpentInPeriod",
  });

  line("Contract", addresses.spendingLimit);
  line("Agent", agent as string);
  line("Ledger Cosigner", ledgerCosigner as string);
  line("Spend Asset", spendAsset as string);
  divider();
  line("Max Single Action", `$${fmt(maxSingle as bigint)} USDC`);
  line("Max Periodic Loss", `$${fmt(maxPeriodic as bigint)} USDC`);
  line("Cosign Threshold", `$${fmt(cosignThreshold as bigint)} USDC`);
  line(
    "Period Duration",
    `${Number(periodDuration as number) / 3600} hours`
  );
  divider();
  line("Period Spent", `$${fmt(spent)} / $${fmt(limit)} USDC`);
  line("Remaining Allowance", `$${fmt(remaining as bigint)} USDC`);
  line("Period Ends", new Date(Number(periodEnd) * 1000).toISOString());

  // Contract USDC balance
  const contractBal = await publicClient.readContract({
    address: addresses.usdc,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [addresses.spendingLimit],
  });
  line("Contract USDC Balance", `$${fmt(contractBal)} USDC`);

  console.log("");
}

async function cmdSpendingPay(to: string, amountStr: string) {
  header("Execute Payment (Agent Only)");

  const amount = parse(amountStr);
  const agentWallet = getWalletClient(keys.agent);

  console.log(`  Sending $${amountStr} USDC to ${to}\n`);

  const tx = await agentWallet.writeContract({
    address: addresses.spendingLimit,
    abi: SpendingLimitABI,
    functionName: "execute",
    args: [to as Address, amount, "0x"],
  });
  await publicClient.waitForTransactionReceipt({ hash: tx });

  const [spent, limit] = await publicClient.readContract({
    address: addresses.spendingLimit,
    abi: SpendingLimitABI,
    functionName: "getSpentInPeriod",
  });

  line("TX", tx);
  line("Amount", `$${amountStr} USDC`);
  line("Period Spent", `$${fmt(spent)} / $${fmt(limit)} USDC`);

  try {
    await publishAgentTransaction(
      agentWallet.account.address,
      to,
      amountStr,
      false,
      fmt(spent),
      fmt(limit)
    );
  } catch {
    console.log("  [HCS] Event skipped");
  }

  console.log("");
}

async function cmdSpendingPayCosign(to: string, amountStr: string) {
  header("Execute Payment (Ledger Co-Sign)");

  const amount = parse(amountStr);
  const agentWallet = getWalletClient(keys.agent);

  console.log(`  Sending $${amountStr} USDC to ${to} (with Ledger co-sign)\n`);

  try {
    const tx = await executeWithLedgerCosign(
      to as Address,
      amount,
      addresses.spendingLimit
    );

    const [spent, limit] = await publicClient.readContract({
      address: addresses.spendingLimit,
      abi: SpendingLimitABI,
      functionName: "getSpentInPeriod",
    });

    line("TX", tx);
    line("Amount", `$${amountStr} USDC`);
    line("Period Spent", `$${fmt(spent)} / $${fmt(limit)} USDC`);

    try {
      await publishAgentTransaction(
        agentWallet.account.address,
        to,
        amountStr,
        true,
        fmt(spent),
        fmt(limit)
      );
    } catch {
      console.log("  [HCS] Event skipped");
    }
  } catch (error: any) {
    console.log("  TRANSACTION BLOCKED");
    console.log(`  Reason: ${error.message?.slice(0, 120)}`);

    try {
      const [spent] = await publicClient.readContract({
        address: addresses.spendingLimit,
        abi: SpendingLimitABI,
        functionName: "getSpentInPeriod",
      });
      await publishTransactionBlocked(
        agentWallet.account.address,
        amountStr,
        "EXCEEDS_LIMIT",
        fmt(spent),
        "50000"
      );
    } catch {}
  }

  console.log("");
}

async function cmdAuditorStatus(auditorAddress?: string) {
  header("Auditor Status");

  const addr =
    (auditorAddress as Address) || privateKeyToAccount(keys.auditor).address;

  const record = (await publicClient.readContract({
    address: addresses.auditorStaking,
    abi: AuditorStakingABI,
    functionName: "getAuditorRecord",
    args: [addr],
  })) as any;

  const totalStaked = await publicClient.readContract({
    address: addresses.auditorStaking,
    abi: AuditorStakingABI,
    functionName: "getTotalStaked",
    args: [addr],
  });

  line("Auditor Address", addr);
  divider();
  line("Total Attestations", String(record.totalAttestations));
  line("Successful Challenges", String(record.successfulChallenges));
  line("Active Stake", `$${fmt(record.activeStake)} USDC`);
  line("Total Staked", `$${fmt(totalStaked as bigint)} USDC`);

  // USDC balance
  const bal = await publicClient.readContract({
    address: addresses.usdc,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [addr],
  });
  line("USDC Balance", `$${fmt(bal)} USDC`);

  console.log("");
}

async function cmdAuditorAudit() {
  header("Containment Audit");

  await auditContainment(
    addresses.spendingLimit,
    addresses.reserveVault,
    50_000_000_000n
  );

  console.log("");
}

async function cmdAuditorAttest(certHashArg: string) {
  header("Auditor Attestation");

  const certHash = certHashArg as Hash;
  const stakeAmount = 1_500_000_000n; // $1.5k

  const { signature, auditResult } = await attestCertificate(
    certHash,
    addresses.spendingLimit,
    addresses.reserveVault,
    50_000_000_000n,
    stakeAmount
  );

  console.log(`\n  Attestation complete.`);
  line("Cert Hash", certHash);
  line("Class", auditResult.certClass);
  line("Signature", (signature as string).slice(0, 30) + "...");
  console.log("");
}

async function cmdChallengeGet(challengeIdStr: string) {
  header("Challenge Details");

  const challengeId = BigInt(challengeIdStr);
  const challenge = (await publicClient.readContract({
    address: addresses.challengeManager,
    abi: ChallengeManagerABI,
    functionName: "getChallenge",
    args: [challengeId],
  })) as any;

  line("Challenge ID", challengeIdStr);
  line("Cert Hash", challenge.certHash);
  line("Challenger", challenge.challenger);
  line(
    "Type",
    CHALLENGE_TYPE_NAMES[challenge.challengeType] || "Unknown"
  );
  line(
    "Status",
    CHALLENGE_STATUS_NAMES[challenge.status] || "Unknown"
  );
  line("Bond", `$${fmt(challenge.bond)} USDC`);
  line(
    "Submitted At",
    new Date(Number(challenge.submittedAt) * 1000).toISOString()
  );
  if (Number(challenge.resolvedAt) > 0) {
    line(
      "Resolved At",
      new Date(Number(challenge.resolvedAt) * 1000).toISOString()
    );
  }

  console.log("");
}

async function cmdChallengeList(certHash: string) {
  header("Challenges for Certificate");

  const ids = (await publicClient.readContract({
    address: addresses.challengeManager,
    abi: ChallengeManagerABI,
    functionName: "getChallengesByCert",
    args: [certHash as Hash],
  })) as bigint[];

  line("Cert Hash", certHash);
  line("Total Challenges", String(ids.length));

  if (ids.length > 0) {
    divider();
    for (const id of ids) {
      const c = (await publicClient.readContract({
        address: addresses.challengeManager,
        abi: ChallengeManagerABI,
        functionName: "getChallenge",
        args: [id],
      })) as any;
      console.log(
        `  #${id}  ${CHALLENGE_TYPE_NAMES[c.challengeType] || "?"} — ${CHALLENGE_STATUS_NAMES[c.status] || "?"} — bond: $${fmt(c.bond)} USDC`
      );
    }
  }

  console.log("");
}

async function cmdHcsTimeline() {
  if (!hederaConfig.hcsTopicId) {
    console.log("\n  No HCS_TOPIC_ID configured in .env\n");
    return;
  }
  await printEventTimeline(hederaConfig.hcsTopicId);
}

async function cmdHcsCreateTopic() {
  header("Create HCS Topic");

  const { createCCPTopic } = await import("./hcs/publisher.js");
  const topicId = await createCCPTopic();
  console.log(`\n  Topic created: ${topicId}`);
  console.log(`  Add to .env: HCS_TOPIC_ID=${topicId}\n`);
}

async function cmdFund(targetName?: string, amountStr?: string) {
  header("Fund Accounts (HBAR)");

  const actors = getActorAddresses();
  const operatorWallet = getWalletClient(keys.operator);
  const amount = parseEther(amountStr || "50");
  const hbarAmount = amountStr || "50";

  // If a specific target is given, fund only that one
  if (targetName) {
    const targetAddr =
      (actors as any)[targetName.toLowerCase()] ||
      (targetName.startsWith("0x") ? targetName : null);
    if (!targetAddr) {
      console.log(`  Unknown target: ${targetName}`);
      console.log(`  Use: operator, auditor, agent, ledger, or an address\n`);
      return;
    }
    const tx = await operatorWallet.sendTransaction({
      to: targetAddr as Address,
      value: amount,
    });
    line("Sent", `${hbarAmount} HBAR to ${targetName}`);
    line("TX", tx);
    console.log("");
    return;
  }

  // Fund all non-operator actors
  for (const [name, addr] of Object.entries(actors)) {
    if (name === "operator") continue;
    try {
      const tx = await operatorWallet.sendTransaction({
        to: addr as Address,
        value: amount,
      });
      line(`${name}`, `${hbarAmount} HBAR sent — ${tx.slice(0, 22)}...`);
    } catch (e: any) {
      line(`${name}`, `FAILED — ${e.message?.slice(0, 60)}`);
    }
  }

  console.log("");
}

function cmdAddresses() {
  header("Contract Addresses");
  line("CCPRegistry", addresses.registry);
  line("ReserveVault", addresses.reserveVault);
  line("SpendingLimit", addresses.spendingLimit);
  line("AuditorStaking", addresses.auditorStaking);
  line("FeeEscrow", addresses.feeEscrow);
  line("ChallengeManager", addresses.challengeManager);
  line("USDC (Mock)", addresses.usdc);
  divider();
  line("RPC URL", hederaConfig.rpcUrl);
  line("Chain ID", String(hederaConfig.chainId));
  line("Network", hederaConfig.network);
  if (hederaConfig.hcsTopicId) {
    line("HCS Topic", hederaConfig.hcsTopicId);
  }
  console.log("");
}

function cmdActors() {
  header("Actor Addresses");
  const actors = getActorAddresses();
  line("Operator", actors.operator);
  line("Auditor", actors.auditor);
  line("Agent", actors.agent);
  line("Ledger", actors.ledger);
  console.log("");
}

function cmdHelp() {
  console.log(`
CCP — Containment Certificate Protocol

Usage: ccp <command> [args]

OVERVIEW
  status                              Full system overview
  addresses                           Show contract addresses
  actors                              Show actor addresses
  fund [target] [amount]              Send HBAR for gas (default: 50 to all)

CERTIFICATES
  cert:get <certHash>                 Get certificate details
  cert:lookup <agentAddress>          Lookup active cert by agent
  cert:verify <agent> [minClass] [maxLoss]
                                      Verify agent containment
  cert:valid <certHash>               Check certificate validity
  cert:publish                        Publish new certificate (full flow)
  cert:revoke <certHash>              Revoke certificate

RESERVE VAULT
  reserve:status                      Show reserve vault info
  reserve:deposit <amount>            Deposit USDC (e.g. 150000)
  reserve:lock <days>                 Lock reserve for N days

SPENDING LIMITS
  spending:status                     Show spending limit details
  spending:pay <to> <amount>          Pay (agent-only signature)
  spending:pay:cosign <to> <amount>   Pay with Ledger co-sign

AUDITOR
  auditor:status [address]            Show auditor record
  auditor:audit                       Run containment audit checks
  auditor:attest <certHash>           Full attestation flow

CHALLENGES
  challenge:get <id>                  Get challenge details
  challenge:list <certHash>           List challenges for cert

HCS (HEDERA CONSENSUS SERVICE)
  hcs:timeline                        Show event timeline
  hcs:create-topic                    Create new HCS topic

EXAMPLES
  ccp status
  ccp cert:lookup 0x89cFD052...
  ccp spending:pay 0xdead...  500
  ccp spending:pay:cosign 0xdead... 7000
  ccp reserve:status
  ccp hcs:timeline

INSTALL
  npm install -g ccp-cli              Install globally
  npx ccp-cli status                 Run without installing

ENV
  Copy .env.example to .env and fill in your Hedera testnet credentials.
  The CLI reads from .env in the current working directory.
`);
}

// ─── Main ───

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    cmdHelp();
    return;
  }

  try {
    switch (command) {
      case "status":
        await cmdStatus();
        break;

      case "cert:get":
        if (!args[1]) throw new Error("Usage: cert:get <certHash>");
        await cmdCertGet(args[1]);
        break;

      case "cert:lookup":
        if (!args[1]) throw new Error("Usage: cert:lookup <agentAddress>");
        await cmdCertLookup(args[1]);
        break;

      case "cert:verify":
        if (!args[1]) throw new Error("Usage: cert:verify <agentAddress> [minClass] [maxLoss]");
        await cmdCertVerify(args[1], args[2] || "1", args[3] || "100000");
        break;

      case "cert:valid":
        if (!args[1]) throw new Error("Usage: cert:valid <certHash>");
        await cmdCertValid(args[1]);
        break;

      case "cert:publish":
        await cmdCertPublish();
        break;

      case "cert:revoke":
        if (!args[1]) throw new Error("Usage: cert:revoke <certHash>");
        await cmdCertRevoke(args[1]);
        break;

      case "reserve:status":
        await cmdReserveStatus();
        break;

      case "reserve:deposit":
        if (!args[1]) throw new Error("Usage: reserve:deposit <amount>");
        await cmdReserveDeposit(args[1]);
        break;

      case "reserve:lock":
        if (!args[1]) throw new Error("Usage: reserve:lock <days>");
        await cmdReserveLock(args[1]);
        break;

      case "spending:status":
        await cmdSpendingStatus();
        break;

      case "spending:pay":
        if (!args[1] || !args[2])
          throw new Error("Usage: spending:pay <to> <amount>");
        await cmdSpendingPay(args[1], args[2]);
        break;

      case "spending:pay:cosign":
        if (!args[1] || !args[2])
          throw new Error("Usage: spending:pay:cosign <to> <amount>");
        await cmdSpendingPayCosign(args[1], args[2]);
        break;

      case "auditor:status":
        await cmdAuditorStatus(args[1]);
        break;

      case "auditor:audit":
        await cmdAuditorAudit();
        break;

      case "auditor:attest":
        if (!args[1]) throw new Error("Usage: auditor:attest <certHash>");
        await cmdAuditorAttest(args[1]);
        break;

      case "challenge:get":
        if (!args[1]) throw new Error("Usage: challenge:get <challengeId>");
        await cmdChallengeGet(args[1]);
        break;

      case "challenge:list":
        if (!args[1]) throw new Error("Usage: challenge:list <certHash>");
        await cmdChallengeList(args[1]);
        break;

      case "hcs:timeline":
        await cmdHcsTimeline();
        break;

      case "hcs:create-topic":
        await cmdHcsCreateTopic();
        break;

      case "fund":
        await cmdFund(args[1], args[2]);
        break;

      case "mcp": {
        // Launch MCP server (stdio transport)
        const { execFileSync } = await import("child_process");
        const { fileURLToPath } = await import("url");
        const { dirname, join } = await import("path");
        const __dirname = dirname(fileURLToPath(import.meta.url));
        const mcpPath = join(__dirname, "mcp.js");
        execFileSync("node", [mcpPath], { stdio: "inherit" });
        break;
      }

      case "addresses":
        cmdAddresses();
        break;

      case "actors":
        cmdActors();
        break;

      default:
        console.error(`  Unknown command: ${command}\n`);
        cmdHelp();
        process.exit(1);
    }
  } catch (error: any) {
    console.error(`\n  Error: ${error.message}\n`);
    process.exit(1);
  }
}

main();
