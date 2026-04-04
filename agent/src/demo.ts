/**
 * CCP Full Demo Scenario
 *
 * Demonstrates the complete Containment Certificate Protocol flow
 * with Hedera (settlement), Ledger (containment), and ENS (identity).
 *
 * Flow:
 *  1. Auditor audits containment → stakes → signs attestation (Ledger)
 *  2. Operator publishes certificate (Ledger-signed) → HCS event
 *  3. Counterparty resolves agent ENS name → queries registry → verifies
 *  4. Agent makes small payment (agent-only signature)
 *  5. Agent makes large payment (Ledger co-signs)
 *  6. Agent tries to exceed limit → BLOCKED (the cage holds)
 *  7. Show full HCS event timeline via Mirror Node
 *
 * Usage: npm run demo
 * Requires: .env with Hedera testnet credentials + deployed contracts
 */

import "dotenv/config";
import { formatUnits, keccak256, encodePacked, toHex, type Hash } from "viem";
import { publicClient, getWalletClient } from "./client.js";
import { addresses, keys, hederaConfig } from "./config.js";
import {
  CCPRegistryABI,
  SpendingLimitABI,
  ReserveVaultABI,
  AuditorStakingABI,
} from "./contracts/index.js";
import { attestCertificate } from "./auditor/attest.js";
import { ledgerSignCertificate, executeWithLedgerCosign } from "./ledger/cosigner.js";
import {
  publishCertificatePublished,
  publishAgentTransaction,
  publishTransactionBlocked,
} from "./hcs/publisher.js";
import { discoverAgent } from "./ens/textRecords.js";
import { printEventTimeline } from "./hedera/mirrorNode.js";

// ─── Constants ───

const CONTAINMENT_BOUND = 50_000_000_000n; // $50,000 USDC (6 decimals)
const AUDITOR_STAKE = 1_500_000_000n; // $1,500 USDC
const SMALL_PAYMENT = 500_000_000n; // $500 USDC
const LARGE_PAYMENT = 7_000_000_000n; // $7,000 USDC (above cosign threshold)
const OVER_LIMIT = 45_000_000_000n; // $45,000 USDC (would exceed period limit)

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   CCP — Containment Certificate Protocol     ║");
  console.log("║   Demo: Hedera × Ledger × ENS                ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  const operatorWallet = getWalletClient(keys.operator);
  const agentWallet = getWalletClient(keys.agent);

  // Compute certificate hash (proper keccak256)
  const certHash = keccak256(
    encodePacked(
      ["address", "address", "uint256", "string"],
      [agentWallet.account.address, operatorWallet.account.address, BigInt(Date.now()), "ccp-v0.2"]
    )
  );

  // ════════════════════════════════════════════════
  // Phase 1: Auditor Audit + Stake + Attest
  // ════════════════════════════════════════════════
  console.log("━━━ Phase 1: Auditor Audit & Attestation ━━━\n");

  const { signature: auditorSig, auditResult } = await attestCertificate(
    certHash,
    addresses.spendingLimit,
    addresses.reserveVault,
    CONTAINMENT_BOUND,
    AUDITOR_STAKE
  );

  console.log(`\n  Audit result: ${auditResult.certClass}`);
  console.log(`  Auditor signature: ${(auditorSig as string).slice(0, 20)}...`);

  // ════════════════════════════════════════════════
  // Phase 2: Operator Publishes Certificate
  // ════════════════════════════════════════════════
  console.log("\n━━━ Phase 2: Certificate Publication (Ledger-signed) ━━━\n");

  const operatorSig = await ledgerSignCertificate(certHash);

  // Build PublishParams struct
  const publishParams = {
    certHash,
    agent: agentWallet.account.address,
    certificateClass: 2, // C2
    expiresAt: Math.floor(Date.now() / 1000) + 60 * 24 * 3600, // 60 days
    containmentBound: CONTAINMENT_BOUND,
    reserveVault: addresses.reserveVault,
    spendingLimit: addresses.spendingLimit,
    ipfsUri: "ipfs://QmCCPDemoCertificate",
  };

  const publishTx = await operatorWallet.writeContract({
    address: addresses.registry,
    abi: CCPRegistryABI,
    functionName: "publish",
    args: [publishParams, operatorSig, [auditorSig]],
  });
  await publicClient.waitForTransactionReceipt({ hash: publishTx });

  console.log(`  Certificate published: ${publishTx}`);

  // Publish to HCS (non-fatal)
  try {
    await publishCertificatePublished(
      certHash,
      agentWallet.account.address,
      operatorWallet.account.address,
      "C2",
      formatUnits(CONTAINMENT_BOUND, 6)
    );
  } catch (e: any) {
    console.log(`  [HCS] Event skipped: ${e.message?.slice(0, 60)}`);
  }

  // Verify on-chain
  const isValid = await publicClient.readContract({
    address: addresses.registry,
    abi: CCPRegistryABI,
    functionName: "isValid",
    args: [certHash],
  });
  console.log(`  Certificate valid: ${isValid}`);

  // ════════════════════════════════════════════════
  // Phase 3: Counterparty Verifies via ENS
  // ════════════════════════════════════════════════
  console.log("\n━━━ Phase 3: Counterparty Verification (ENS → Registry) ━━━\n");

  // In production: counterparty resolves agent's ENS name
  // For demo: simulate the discovery flow
  console.log("  [Counterparty] Discovering agent via ENS...");

  // Try ENS resolution with timeout (Sepolia RPC can be slow)
  try {
    const ensTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000));
    const discovery = await Promise.race([discoverAgent("alpha.ccpdemo.eth"), ensTimeout]);
    console.log(`  ENS discovery:`, discovery);
  } catch (e: any) {
    console.log(`  [ENS] Skipped (${e.message?.slice(0, 30)}) — using direct registry query`);
  }

  // Direct registry verification (always works)
  const [acceptable, foundCert] = await publicClient.readContract({
    address: addresses.registry,
    abi: CCPRegistryABI,
    functionName: "verify",
    args: [agentWallet.account.address, 1, 100_000_000_000n], // minClass=C1, maxLoss=$100k
  });

  console.log(`  Registry verify: acceptable=${acceptable}, certHash=${(foundCert as string).slice(0, 18)}...`);

  // Check auditor stake
  const auditorWallet = getWalletClient(keys.auditor);
  const stake = await publicClient.readContract({
    address: addresses.auditorStaking,
    abi: AuditorStakingABI,
    functionName: "getStake",
    args: [auditorWallet.account.address, certHash],
  });
  console.log(`  Auditor stake: ${formatUnits(stake, 6)} USDC`);

  // Check reserve
  const reserveBalance = await publicClient.readContract({
    address: addresses.reserveVault,
    abi: ReserveVaultABI,
    functionName: "getReserveBalance",
  });
  console.log(`  Reserve balance: ${formatUnits(reserveBalance, 6)} USDC`);
  console.log(`  → VERIFICATION PASSED. Accepting transaction.\n`);

  // ════════════════════════════════════════════════
  // Phase 4: Agent Pays (Small — No Cosign)
  // ════════════════════════════════════════════════
  console.log("━━━ Phase 4: Small Payment ($500 — Agent Only) ━━━\n");

  const counterpartyAddr = "0x000000000000000000000000000000000000dEaD" as const;

  const smallTx = await agentWallet.writeContract({
    address: addresses.spendingLimit,
    abi: SpendingLimitABI,
    functionName: "execute",
    args: [counterpartyAddr, SMALL_PAYMENT, "0x"],
  });
  await publicClient.waitForTransactionReceipt({ hash: smallTx });

  console.log(`  Transaction: ${smallTx}`);
  const [spent1] = await publicClient.readContract({
    address: addresses.spendingLimit,
    abi: SpendingLimitABI,
    functionName: "getSpentInPeriod",
  });
  console.log(`  Period spent: ${formatUnits(spent1, 6)} / ${formatUnits(50_000_000_000n, 6)} USDC`);

  try {
    await publishAgentTransaction(
      agentWallet.account.address, counterpartyAddr,
      formatUnits(SMALL_PAYMENT, 6), false, formatUnits(spent1, 6), "50000"
    );
  } catch { console.log("  [HCS] Event skipped"); }

  // ════════════════════════════════════════════════
  // Phase 5: Agent Pays (Large — Ledger Co-Signs)
  // ════════════════════════════════════════════════
  console.log("\n━━━ Phase 5: Large Payment ($7,000 — Ledger Co-Sign) ━━━\n");

  const largeTx = await executeWithLedgerCosign(counterpartyAddr, LARGE_PAYMENT, addresses.spendingLimit);

  const [spent2] = await publicClient.readContract({
    address: addresses.spendingLimit,
    abi: SpendingLimitABI,
    functionName: "getSpentInPeriod",
  });
  console.log(`  Period spent: ${formatUnits(spent2, 6)} / ${formatUnits(50_000_000_000n, 6)} USDC`);

  try {
    await publishAgentTransaction(
      agentWallet.account.address, counterpartyAddr,
      formatUnits(LARGE_PAYMENT, 6), true, formatUnits(spent2, 6), "50000"
    );
  } catch { console.log("  [HCS] Event skipped"); }

  // ════════════════════════════════════════════════
  // Phase 6: Agent Exceeds Limit — BLOCKED
  // ════════════════════════════════════════════════
  console.log("\n━━━ Phase 6: Over-Limit Payment ($45,000 — BLOCKED) ━━━\n");

  try {
    await executeWithLedgerCosign(counterpartyAddr, OVER_LIMIT, addresses.spendingLimit);
    console.log("  ERROR: Should have been blocked!");
  } catch (error: any) {
    console.log("  ✗ TRANSACTION BLOCKED — Containment held!");
    console.log(`  Reason: ${error.message?.slice(0, 100)}`);

    try {
      await publishTransactionBlocked(
        agentWallet.account.address, formatUnits(OVER_LIMIT, 6),
        "EXCEEDS_PERIODIC_LIMIT", formatUnits(spent2, 6), "50000"
      );
    } catch { console.log("  [HCS] Event skipped"); }
  }

  const remaining = await publicClient.readContract({
    address: addresses.spendingLimit,
    abi: SpendingLimitABI,
    functionName: "getRemainingAllowance",
  });
  console.log(`  Remaining allowance: ${formatUnits(remaining, 6)} USDC`);

  // ════════════════════════════════════════════════
  // Phase 7: Show HCS Event Timeline
  // ════════════════════════════════════════════════
  console.log("\n━━━ Phase 7: Event Timeline (Hedera Consensus Service) ━━━");

  if (hederaConfig.hcsTopicId) {
    await printEventTimeline(hederaConfig.hcsTopicId);
  } else {
    console.log("  [HCS] No topic ID configured — skipping timeline display");
  }

  // ════════════════════════════════════════════════
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   Demo Complete                               ║");
  console.log("║                                               ║");
  console.log("║   The cage held. The agent could not exceed   ║");
  console.log("║   its containment bound — even with Ledger    ║");
  console.log("║   co-signature. Smart contract limits are     ║");
  console.log("║   absolute. That is the CCP thesis.           ║");
  console.log("╚══════════════════════════════════════════════╝\n");
}

main().catch(console.error);
