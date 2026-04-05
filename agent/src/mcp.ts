#!/usr/bin/env node
/**
 * CCP MCP Server — Model Context Protocol server for the Containment Certificate Protocol
 *
 * Exposes all CCP protocol operations as MCP tools so AI agents (e.g. OpenClaw)
 * can interact with the protocol natively without shelling out to a CLI.
 *
 * Usage:
 *   npx @iamnotdou/ccp mcp               # stdio transport (for Claude, OpenClaw, etc.)
 *
 *   Minimum config (agent only — read + pay):
 *   {
 *     "mcpServers": {
 *       "ccp": {
 *         "command": "npx",
 *         "args": ["@iamnotdou/ccp", "mcp"],
 *         "env": { "AGENT_PRIVATE_KEY": "0x..." }
 *       }
 *     }
 *   }
 */

import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  formatUnits,
  formatEther,
  parseUnits,
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
import { getTopicMessages } from "./hedera/mirrorNode.js";

// ─── Helpers ───

const USDC_DECIMALS = 6;
const fmt = (amount: bigint) => formatUnits(amount, USDC_DECIMALS);
const parse = (amount: string) => parseUnits(amount, USDC_DECIMALS);

const STATUS_NAMES = ["ACTIVE", "REVOKED", "EXPIRED", "CHALLENGED"] as const;
const CLASS_NAMES = ["NONE", "C1", "C2", "C3"] as const;
const CHALLENGE_TYPE_NAMES = [
  "RESERVE_SHORTFALL", "CONSTRAINT_BYPASS", "FALSE_INDEPENDENCE",
  "INVALID_VERIFICATION", "SCOPE_NOT_PERFORMED",
] as const;
const CHALLENGE_STATUS_NAMES = ["PENDING", "UPHELD", "REJECTED", "INFORMATIONAL"] as const;

const ERC20_ABI = [
  {
    name: "balanceOf", type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "approve", type: "function",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

const hasKey = (key: `0x${string}`) => key && key !== "0x" && key.length > 4;

function getActorAddresses() {
  return {
    operator: hasKey(keys.operator) ? privateKeyToAccount(keys.operator).address : null,
    auditor: hasKey(keys.auditor) ? privateKeyToAccount(keys.auditor).address : null,
    agent: hasKey(keys.agent) ? privateKeyToAccount(keys.agent).address : null,
    ledger: hasKey(keys.ledger) ? privateKeyToAccount(keys.ledger).address : null,
  };
}

function requireKey(name: string, key: `0x${string}`) {
  if (!hasKey(key)) {
    throw new Error(`${name} not configured. Set ${name.toUpperCase().replace(/ /g, "_")}_PRIVATE_KEY env var.`);
  }
}

// ─── MCP Server ───

const server = new McpServer({
  name: "ccp",
  version: "0.2.0",
});

// ─── Tool: status ───

server.tool(
  "ccp_status",
  "Get full CCP protocol status: spending limits, reserve vault, balances, and active certificate",
  {},
  async () => {
    const actors = getActorAddresses();

    const [maxSingle, maxPeriodic, cosignThreshold, ledgerCosigner, remaining] =
      await Promise.all([
        publicClient.readContract({ address: addresses.spendingLimit, abi: SpendingLimitABI, functionName: "maxSingleAction" }),
        publicClient.readContract({ address: addresses.spendingLimit, abi: SpendingLimitABI, functionName: "maxPeriodicLoss" }),
        publicClient.readContract({ address: addresses.spendingLimit, abi: SpendingLimitABI, functionName: "cosignThreshold" }),
        publicClient.readContract({ address: addresses.spendingLimit, abi: SpendingLimitABI, functionName: "ledgerCosigner" }),
        publicClient.readContract({ address: addresses.spendingLimit, abi: SpendingLimitABI, functionName: "getRemainingAllowance" }),
      ]);

    const [spent, limit, periodEnd] = await publicClient.readContract({
      address: addresses.spendingLimit, abi: SpendingLimitABI, functionName: "getSpentInPeriod",
    });

    const [reserveBalance, isLocked, lockUntil, statedAmount] = await Promise.all([
      publicClient.readContract({ address: addresses.reserveVault, abi: ReserveVaultABI, functionName: "getReserveBalance" }),
      publicClient.readContract({ address: addresses.reserveVault, abi: ReserveVaultABI, functionName: "isLocked" }),
      publicClient.readContract({ address: addresses.reserveVault, abi: ReserveVaultABI, functionName: "lockUntil" }),
      publicClient.readContract({ address: addresses.reserveVault, abi: ReserveVaultABI, functionName: "getStatedAmount" }),
    ]);

    // Balances
    const balances: Record<string, { hbar: string; usdc: string }> = {};
    for (const [name, addr] of Object.entries(actors)) {
      const [hbar, usdc] = await Promise.all([
        publicClient.getBalance({ address: addr as Address }),
        publicClient.readContract({ address: addresses.usdc, abi: ERC20_ABI, functionName: "balanceOf", args: [addr as Address] }),
      ]);
      balances[name] = { hbar: formatEther(hbar), usdc: fmt(usdc) };
    }

    // Active cert
    let certificate: any = null;
    try {
      const certHash = await publicClient.readContract({
        address: addresses.registry, abi: CCPRegistryABI, functionName: "getActiveCertificate", args: [actors.agent as Address],
      });
      if (certHash !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
        const cert = await publicClient.readContract({
          address: addresses.registry, abi: CCPRegistryABI, functionName: "getCertificate", args: [certHash],
        }) as any;
        const isValid = await publicClient.readContract({
          address: addresses.registry, abi: CCPRegistryABI, functionName: "isValid", args: [certHash],
        });
        certificate = {
          certHash,
          class: CLASS_NAMES[cert.certificateClass] || "Unknown",
          status: STATUS_NAMES[cert.status] || "Unknown",
          containmentBound: `$${fmt(cert.containmentBound)} USDC`,
          expires: new Date(Number(cert.expiresAt) * 1000).toISOString(),
          valid: isValid,
        };
      }
    } catch {}

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          spendingLimit: {
            maxSingleAction: `$${fmt(maxSingle)} USDC`,
            maxPeriodicLoss: `$${fmt(maxPeriodic)} USDC`,
            cosignThreshold: `$${fmt(cosignThreshold)} USDC`,
            ledgerCosigner,
            periodSpent: `$${fmt(spent)} / $${fmt(limit)} USDC`,
            remainingAllowance: `$${fmt(remaining)} USDC`,
            periodEnds: new Date(Number(periodEnd) * 1000).toISOString(),
          },
          reserveVault: {
            balance: `$${fmt(reserveBalance as bigint)} USDC`,
            statedAmount: `$${fmt(statedAmount as bigint)} USDC`,
            locked: isLocked,
            lockUntil: Number(lockUntil) > 0 ? new Date(Number(lockUntil) * 1000).toISOString() : null,
          },
          balances,
          certificate,
        }, null, 2),
      }],
    };
  }
);

// ─── Tool: addresses ───

server.tool(
  "ccp_addresses",
  "Get all CCP contract addresses and network config",
  {},
  async () => ({
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        contracts: {
          registry: addresses.registry,
          reserveVault: addresses.reserveVault,
          spendingLimit: addresses.spendingLimit,
          auditorStaking: addresses.auditorStaking,
          feeEscrow: addresses.feeEscrow,
          challengeManager: addresses.challengeManager,
          usdc: addresses.usdc,
        },
        network: {
          rpcUrl: hederaConfig.rpcUrl,
          chainId: hederaConfig.chainId,
          network: hederaConfig.network,
          hcsTopicId: hederaConfig.hcsTopicId || null,
        },
        actors: getActorAddresses(),
      }, null, 2),
    }],
  })
);

// ─── Tool: cert:verify ───

server.tool(
  "ccp_cert_verify",
  "Verify if an agent meets containment requirements. Returns whether the agent is acceptable for transacting.",
  {
    agentAddress: z.string().describe("The agent's Ethereum address to verify"),
    minClass: z.number().default(1).describe("Minimum certificate class required (1=C1, 2=C2, 3=C3)"),
    maxLoss: z.string().default("100000").describe("Maximum acceptable loss in USDC (e.g. '100000')"),
  },
  async ({ agentAddress, minClass, maxLoss }) => {
    const maxLossUsdc = parse(maxLoss);
    const [acceptable, certHash] = await publicClient.readContract({
      address: addresses.registry, abi: CCPRegistryABI, functionName: "verify",
      args: [agentAddress as Address, minClass, maxLossUsdc],
    });

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          agent: agentAddress,
          minClassRequired: `C${minClass}`,
          maxAcceptableLoss: `$${maxLoss} USDC`,
          acceptable,
          certHash,
          result: acceptable ? "VERIFICATION PASSED" : "VERIFICATION FAILED",
        }, null, 2),
      }],
    };
  }
);

// ─── Tool: cert:get ───

server.tool(
  "ccp_cert_get",
  "Get full certificate details by cert hash",
  { certHash: z.string().describe("The certificate hash") },
  async ({ certHash }) => {
    const cert = await publicClient.readContract({
      address: addresses.registry, abi: CCPRegistryABI, functionName: "getCertificate", args: [certHash as Hash],
    }) as any;

    const isValid = await publicClient.readContract({
      address: addresses.registry, abi: CCPRegistryABI, functionName: "isValid", args: [certHash as Hash],
    });

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          certHash,
          operator: cert.operator,
          agent: cert.agent,
          class: CLASS_NAMES[cert.certificateClass] || "Unknown",
          status: STATUS_NAMES[cert.status] || "Unknown",
          valid: isValid,
          containmentBound: `$${fmt(cert.containmentBound)} USDC`,
          issuedAt: new Date(Number(cert.issuedAt) * 1000).toISOString(),
          expiresAt: new Date(Number(cert.expiresAt) * 1000).toISOString(),
          reserveVault: cert.reserveVault,
          spendingLimit: cert.spendingLimit,
          ipfsUri: cert.ipfsUri,
          auditors: cert.auditors || [],
        }, null, 2),
      }],
    };
  }
);

// ─── Tool: cert:lookup ───

server.tool(
  "ccp_cert_lookup",
  "Look up the active certificate for an agent by their address",
  { agentAddress: z.string().describe("The agent's Ethereum address") },
  async ({ agentAddress }) => {
    const certHash = await publicClient.readContract({
      address: addresses.registry, abi: CCPRegistryABI, functionName: "getActiveCertificate",
      args: [agentAddress as Address],
    }) as string;

    const empty = certHash === "0x0000000000000000000000000000000000000000000000000000000000000000";

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          agent: agentAddress,
          activeCertHash: empty ? null : certHash,
          hasCertificate: !empty,
        }, null, 2),
      }],
    };
  }
);

// ─── Tool: cert:publish ───

server.tool(
  "ccp_cert_publish",
  "Publish a new containment certificate. Runs the full flow: auditor audit + stake + attest, operator Ledger sign, on-chain publish. Requires OPERATOR, AUDITOR, and LEDGER keys.",
  {},
  async () => {
    requireKey("operator", keys.operator);
    requireKey("auditor", keys.auditor);
    requireKey("ledger", keys.ledger);
    const operatorWallet = getWalletClient(keys.operator);
    const agentWallet = getWalletClient(keys.agent);
    const containmentBound = 50_000_000_000n;
    const auditorStake = 1_500_000_000n;

    const certHash = keccak256(
      encodePacked(
        ["address", "address", "uint256", "string"],
        [agentWallet.account.address, operatorWallet.account.address, BigInt(Date.now()), "ccp-v0.2"]
      )
    );

    // Phase 1: Auditor
    const { signature: auditorSig, auditResult } = await attestCertificate(
      certHash, addresses.spendingLimit, addresses.reserveVault, containmentBound, auditorStake,
    );

    // Phase 2: Operator sign
    const operatorSig = await ledgerSignCertificate(certHash);

    // Phase 3: Publish
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
      address: addresses.registry, abi: CCPRegistryABI, functionName: "publish",
      args: [publishParams, operatorSig, [auditorSig]],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });

    // HCS event
    try {
      await publishCertificatePublished(
        certHash, agentWallet.account.address, operatorWallet.account.address, "C2", fmt(containmentBound),
      );
    } catch {}

    const isValid = await publicClient.readContract({
      address: addresses.registry, abi: CCPRegistryABI, functionName: "isValid", args: [certHash],
    });

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          certHash,
          txHash: tx,
          agent: agentWallet.account.address,
          operator: operatorWallet.account.address,
          class: "C2",
          containmentBound: "$50,000 USDC",
          valid: isValid,
          auditClass: auditResult.certClass,
        }, null, 2),
      }],
    };
  }
);

// ─── Tool: cert:revoke ───

server.tool(
  "ccp_cert_revoke",
  "Revoke an active certificate (operator only). Requires OPERATOR key.",
  { certHash: z.string().describe("The certificate hash to revoke") },
  async ({ certHash }) => {
    requireKey("operator", keys.operator);
    const operatorWallet = getWalletClient(keys.operator);
    const tx = await operatorWallet.writeContract({
      address: addresses.registry, abi: CCPRegistryABI, functionName: "revoke", args: [certHash as Hash],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({ certHash, txHash: tx, status: "REVOKED" }, null, 2),
      }],
    };
  }
);

// ─── Tool: reserve:status ───

server.tool(
  "ccp_reserve_status",
  "Get reserve vault status: balance, lock, adequacy for C2/C3",
  {},
  async () => {
    const [balance, statedAmount, isLocked, lockUntil, isAdequateC2, isAdequateC3] = await Promise.all([
      publicClient.readContract({ address: addresses.reserveVault, abi: ReserveVaultABI, functionName: "getReserveBalance" }),
      publicClient.readContract({ address: addresses.reserveVault, abi: ReserveVaultABI, functionName: "getStatedAmount" }),
      publicClient.readContract({ address: addresses.reserveVault, abi: ReserveVaultABI, functionName: "isLocked" }),
      publicClient.readContract({ address: addresses.reserveVault, abi: ReserveVaultABI, functionName: "lockUntil" }),
      publicClient.readContract({ address: addresses.reserveVault, abi: ReserveVaultABI, functionName: "isAdequate", args: [50_000_000_000n, 30000] }),
      publicClient.readContract({ address: addresses.reserveVault, abi: ReserveVaultABI, functionName: "isAdequate", args: [50_000_000_000n, 50000] }),
    ]);

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          balance: `$${fmt(balance as bigint)} USDC`,
          statedAmount: `$${fmt(statedAmount as bigint)} USDC`,
          locked: isLocked,
          lockUntil: Number(lockUntil) > 0 ? new Date(Number(lockUntil as number) * 1000).toISOString() : null,
          adequateForC2: isAdequateC2,
          adequateForC3: isAdequateC3,
        }, null, 2),
      }],
    };
  }
);

// ─── Tool: reserve:deposit ───

server.tool(
  "ccp_reserve_deposit",
  "Deposit USDC into the reserve vault. Requires OPERATOR key.",
  { amount: z.string().describe("Amount in USDC to deposit (e.g. '150000')") },
  async ({ amount }) => {
    requireKey("operator", keys.operator);
    const amountParsed = parse(amount);
    const operatorWallet = getWalletClient(keys.operator);

    const approveTx = await operatorWallet.writeContract({
      address: addresses.usdc, abi: ERC20_ABI, functionName: "approve", args: [addresses.reserveVault, amountParsed],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveTx });

    const depositTx = await operatorWallet.writeContract({
      address: addresses.reserveVault, abi: ReserveVaultABI, functionName: "deposit", args: [amountParsed],
    });
    await publicClient.waitForTransactionReceipt({ hash: depositTx });

    const newBalance = await publicClient.readContract({
      address: addresses.reserveVault, abi: ReserveVaultABI, functionName: "getReserveBalance",
    });

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          deposited: `$${amount} USDC`,
          approveTxHash: approveTx,
          depositTxHash: depositTx,
          newBalance: `$${fmt(newBalance)} USDC`,
        }, null, 2),
      }],
    };
  }
);

// ─── Tool: reserve:lock ───

server.tool(
  "ccp_reserve_lock",
  "Lock the reserve vault for N days. Requires OPERATOR key.",
  { days: z.number().describe("Number of days to lock the reserve") },
  async ({ days }) => {
    requireKey("operator", keys.operator);
    const lockUntil = Math.floor(Date.now() / 1000) + days * 24 * 3600;
    const operatorWallet = getWalletClient(keys.operator);

    const tx = await operatorWallet.writeContract({
      address: addresses.reserveVault, abi: ReserveVaultABI, functionName: "lock", args: [lockUntil],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          txHash: tx,
          lockUntil: new Date(lockUntil * 1000).toISOString(),
          days,
        }, null, 2),
      }],
    };
  }
);

// ─── Tool: spending:status ───

server.tool(
  "ccp_spending_status",
  "Get spending limit configuration and current period tracking",
  {},
  async () => {
    const [maxSingle, maxPeriodic, cosignThreshold, ledgerCosigner, remaining, periodDuration] = await Promise.all([
      publicClient.readContract({ address: addresses.spendingLimit, abi: SpendingLimitABI, functionName: "maxSingleAction" }),
      publicClient.readContract({ address: addresses.spendingLimit, abi: SpendingLimitABI, functionName: "maxPeriodicLoss" }),
      publicClient.readContract({ address: addresses.spendingLimit, abi: SpendingLimitABI, functionName: "cosignThreshold" }),
      publicClient.readContract({ address: addresses.spendingLimit, abi: SpendingLimitABI, functionName: "ledgerCosigner" }),
      publicClient.readContract({ address: addresses.spendingLimit, abi: SpendingLimitABI, functionName: "getRemainingAllowance" }),
      publicClient.readContract({ address: addresses.spendingLimit, abi: SpendingLimitABI, functionName: "periodDuration" }),
    ]);

    const [spent, limit, periodEnd] = await publicClient.readContract({
      address: addresses.spendingLimit, abi: SpendingLimitABI, functionName: "getSpentInPeriod",
    });

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          maxSingleAction: `$${fmt(maxSingle as bigint)} USDC`,
          maxPeriodicLoss: `$${fmt(maxPeriodic as bigint)} USDC`,
          cosignThreshold: `$${fmt(cosignThreshold as bigint)} USDC`,
          ledgerCosigner,
          periodDuration: `${Number(periodDuration as number) / 3600} hours`,
          periodSpent: `$${fmt(spent)} USDC`,
          periodLimit: `$${fmt(limit)} USDC`,
          remainingAllowance: `$${fmt(remaining as bigint)} USDC`,
          periodEnds: new Date(Number(periodEnd) * 1000).toISOString(),
          rules: {
            belowThreshold: "Agent-only signature (no Ledger needed)",
            aboveThreshold: "Requires Ledger co-signature",
            aboveMaxSingle: "BLOCKED (absolute limit, cannot be bypassed)",
            exceedsPeriodic: "BLOCKED (period limit, resets after period duration)",
          },
        }, null, 2),
      }],
    };
  }
);

// ─── Tool: spending:pay ───

server.tool(
  "ccp_spending_pay",
  "Execute a payment through SpendingLimit (agent-only signature, for amounts below cosign threshold of $5,000). Requires AGENT key.",
  {
    to: z.string().describe("Recipient address"),
    amount: z.string().describe("Amount in USDC (e.g. '500')"),
  },
  async ({ to, amount }) => {
    requireKey("agent", keys.agent);
    const amountParsed = parse(amount);
    const agentWallet = getWalletClient(keys.agent);

    try {
      const tx = await agentWallet.writeContract({
        address: addresses.spendingLimit, abi: SpendingLimitABI, functionName: "execute",
        args: [to as Address, amountParsed, "0x"],
      });
      await publicClient.waitForTransactionReceipt({ hash: tx });

      const [spent, limit] = await publicClient.readContract({
        address: addresses.spendingLimit, abi: SpendingLimitABI, functionName: "getSpentInPeriod",
      });

      try {
        await publishAgentTransaction(agentWallet.account.address, to, amount, false, fmt(spent), fmt(limit));
      } catch {}

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            txHash: tx,
            amount: `$${amount} USDC`,
            to,
            cosigned: false,
            periodSpent: `$${fmt(spent)} / $${fmt(limit)} USDC`,
          }, null, 2),
        }],
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            error: "TRANSACTION_FAILED",
            reason: error.message?.slice(0, 200),
            amount: `$${amount} USDC`,
            to,
          }, null, 2),
        }],
        isError: true,
      };
    }
  }
);

// ─── Tool: spending:pay:cosign ───

server.tool(
  "ccp_spending_pay_cosign",
  "Execute a payment with Ledger co-signature (for amounts above cosign threshold of $5,000, up to $10,000 max single action). Requires AGENT and LEDGER keys.",
  {
    to: z.string().describe("Recipient address"),
    amount: z.string().describe("Amount in USDC (e.g. '7000')"),
  },
  async ({ to, amount }) => {
    requireKey("agent", keys.agent);
    requireKey("ledger", keys.ledger);
    const amountParsed = parse(amount);
    const agentWallet = getWalletClient(keys.agent);

    try {
      const tx = await executeWithLedgerCosign(to as Address, amountParsed, addresses.spendingLimit);

      const [spent, limit] = await publicClient.readContract({
        address: addresses.spendingLimit, abi: SpendingLimitABI, functionName: "getSpentInPeriod",
      });

      try {
        await publishAgentTransaction(agentWallet.account.address, to, amount, true, fmt(spent), fmt(limit));
      } catch {}

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            txHash: tx,
            amount: `$${amount} USDC`,
            to,
            cosigned: true,
            periodSpent: `$${fmt(spent)} / $${fmt(limit)} USDC`,
          }, null, 2),
        }],
      };
    } catch (error: any) {
      const [spent] = await publicClient.readContract({
        address: addresses.spendingLimit, abi: SpendingLimitABI, functionName: "getSpentInPeriod",
      });

      try {
        await publishTransactionBlocked(agentWallet.account.address, amount, "EXCEEDS_LIMIT", fmt(spent), "50000");
      } catch {}

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            error: "TRANSACTION_BLOCKED",
            reason: error.message?.slice(0, 200),
            amount: `$${amount} USDC`,
            to,
            containmentHeld: true,
          }, null, 2),
        }],
        isError: true,
      };
    }
  }
);

// ─── Tool: auditor:status ───

server.tool(
  "ccp_auditor_status",
  "Get auditor record: attestation count, active stake, challenge history",
  { address: z.string().optional().describe("Auditor address (defaults to configured auditor)") },
  async ({ address: addr }) => {
    const auditorAddr = (addr || privateKeyToAccount(keys.auditor).address) as Address;

    const [record, totalStaked, balance] = await Promise.all([
      publicClient.readContract({ address: addresses.auditorStaking, abi: AuditorStakingABI, functionName: "getAuditorRecord", args: [auditorAddr] }),
      publicClient.readContract({ address: addresses.auditorStaking, abi: AuditorStakingABI, functionName: "getTotalStaked", args: [auditorAddr] }),
      publicClient.readContract({ address: addresses.usdc, abi: ERC20_ABI, functionName: "balanceOf", args: [auditorAddr] }),
    ]) as [any, bigint, bigint];

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          auditor: auditorAddr,
          totalAttestations: Number(record.totalAttestations),
          successfulChallenges: Number(record.successfulChallenges),
          activeStake: `$${fmt(record.activeStake)} USDC`,
          totalStaked: `$${fmt(totalStaked)} USDC`,
          usdcBalance: `$${fmt(balance)} USDC`,
        }, null, 2),
      }],
    };
  }
);

// ─── Tool: auditor:audit ───

server.tool(
  "ccp_auditor_audit",
  "Run a read-only containment audit — checks spending limits, Ledger cosigner, reserve adequacy, and lock status",
  {},
  async () => {
    const [maxSingle, maxPeriodic, cosignThreshold, ledgerCosigner, reserveBalance, reserveAdequate, reserveLocked] =
      await Promise.all([
        publicClient.readContract({ address: addresses.spendingLimit, abi: SpendingLimitABI, functionName: "maxSingleAction" }),
        publicClient.readContract({ address: addresses.spendingLimit, abi: SpendingLimitABI, functionName: "maxPeriodicLoss" }),
        publicClient.readContract({ address: addresses.spendingLimit, abi: SpendingLimitABI, functionName: "cosignThreshold" }),
        publicClient.readContract({ address: addresses.spendingLimit, abi: SpendingLimitABI, functionName: "ledgerCosigner" }),
        publicClient.readContract({ address: addresses.reserveVault, abi: ReserveVaultABI, functionName: "getReserveBalance" }),
        publicClient.readContract({ address: addresses.reserveVault, abi: ReserveVaultABI, functionName: "isAdequate", args: [50_000_000_000n, 30000] }),
        publicClient.readContract({ address: addresses.reserveVault, abi: ReserveVaultABI, functionName: "isLocked" }),
      ]);

    const hasLedger = ledgerCosigner !== "0x0000000000000000000000000000000000000000";

    const findings = {
      maxSingleAction: `$${fmt(maxSingle as bigint)} USDC`,
      maxPeriodicLoss: `$${fmt(maxPeriodic as bigint)} USDC`,
      cosignThreshold: `$${fmt(cosignThreshold as bigint)} USDC`,
      ledgerCosignerSet: hasLedger,
      ledgerCosigner: ledgerCosigner as string,
      reserveBalance: `$${fmt(reserveBalance as bigint)} USDC`,
      reserveAdequateForC2: reserveAdequate,
      reserveLocked: reserveLocked,
    };

    const passed = hasLedger && reserveAdequate && reserveLocked;

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          findings,
          passed,
          recommendedClass: passed ? "C2" : "INSUFFICIENT",
          message: passed
            ? "All containment checks passed. Agent-independent constraints verified."
            : "Audit failed. Check ledger, reserve adequacy, and lock status.",
        }, null, 2),
      }],
    };
  }
);

// ─── Tool: challenge:get ───

server.tool(
  "ccp_challenge_get",
  "Get details of a specific challenge by ID",
  { challengeId: z.string().describe("The challenge ID") },
  async ({ challengeId }) => {
    const challenge = await publicClient.readContract({
      address: addresses.challengeManager, abi: ChallengeManagerABI, functionName: "getChallenge",
      args: [BigInt(challengeId)],
    }) as any;

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          challengeId,
          certHash: challenge.certHash,
          challenger: challenge.challenger,
          type: CHALLENGE_TYPE_NAMES[challenge.challengeType] || "Unknown",
          status: CHALLENGE_STATUS_NAMES[challenge.status] || "Unknown",
          bond: `$${fmt(challenge.bond)} USDC`,
          submittedAt: new Date(Number(challenge.submittedAt) * 1000).toISOString(),
          resolvedAt: Number(challenge.resolvedAt) > 0 ? new Date(Number(challenge.resolvedAt) * 1000).toISOString() : null,
        }, null, 2),
      }],
    };
  }
);

// ─── Tool: challenge:list ───

server.tool(
  "ccp_challenge_list",
  "List all challenges for a certificate",
  { certHash: z.string().describe("The certificate hash") },
  async ({ certHash }) => {
    const ids = await publicClient.readContract({
      address: addresses.challengeManager, abi: ChallengeManagerABI, functionName: "getChallengesByCert",
      args: [certHash as Hash],
    }) as bigint[];

    const challenges = [];
    for (const id of ids) {
      const c = await publicClient.readContract({
        address: addresses.challengeManager, abi: ChallengeManagerABI, functionName: "getChallenge", args: [id],
      }) as any;
      challenges.push({
        id: String(id),
        type: CHALLENGE_TYPE_NAMES[c.challengeType] || "Unknown",
        status: CHALLENGE_STATUS_NAMES[c.status] || "Unknown",
        bond: `$${fmt(c.bond)} USDC`,
      });
    }

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({ certHash, totalChallenges: ids.length, challenges }, null, 2),
      }],
    };
  }
);

// ─── Tool: hcs:timeline ───

server.tool(
  "ccp_hcs_timeline",
  "Get the HCS event timeline — all protocol events (cert published, transactions, blocks, challenges) from Hedera Consensus Service",
  {},
  async () => {
    if (!hederaConfig.hcsTopicId) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "No HCS_TOPIC_ID configured" }) }],
        isError: true,
      };
    }

    const messages = await getTopicMessages(hederaConfig.hcsTopicId, 25);
    const events = messages.map((msg: any) => {
      const { timestamp: _eventTs, ...rest } = msg.content;
      return {
        ...rest,
        sequenceNumber: msg.sequenceNumber,
        timestamp: new Date(parseFloat(msg.timestamp as string) * 1000).toISOString(),
      };
    });

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({ topicId: hederaConfig.hcsTopicId, totalEvents: events.length, events }, null, 2),
      }],
    };
  }
);

// ─── Start ───

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
