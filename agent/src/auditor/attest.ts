import { type Hash, type Address, formatUnits, keccak256, encodePacked } from "viem";
import { publicClient, getWalletClient } from "../client.js";
import { AuditorStakingABI, ReserveVaultABI, SpendingLimitABI } from "../contracts/index.js";
import { addresses, keys } from "../config.js";
import { ledgerSignAttestation } from "../ledger/cosigner.js";
import { publishAttestationSigned } from "../hcs/publisher.js";

export interface AuditResult {
  passed: boolean;
  findings: string[];
  certClass: string;
  attestationSignature?: Hash;
}

/**
 * Automated containment audit checks.
 * In production: auditor reviews these results + manual analysis.
 * For demo: automated checks against SpendingLimit and ReserveVault.
 */
export async function auditContainment(
  spendingLimitAddress: Address,
  reserveVaultAddress: Address,
  expectedBound: bigint
): Promise<AuditResult> {
  const findings: string[] = [];
  let passed = true;

  console.log("  [Auditor] Starting containment audit...");

  // Check 1: SpendingLimit configuration
  const maxSingle = await publicClient.readContract({
    address: spendingLimitAddress,
    abi: SpendingLimitABI,
    functionName: "maxSingleAction",
  });

  const maxPeriodic = await publicClient.readContract({
    address: spendingLimitAddress,
    abi: SpendingLimitABI,
    functionName: "maxPeriodicLoss",
  });

  const cosignThreshold = await publicClient.readContract({
    address: spendingLimitAddress,
    abi: SpendingLimitABI,
    functionName: "cosignThreshold",
  });

  const ledgerCosigner = await publicClient.readContract({
    address: spendingLimitAddress,
    abi: SpendingLimitABI,
    functionName: "ledgerCosigner",
  });

  findings.push(`  SpendingLimit: maxSingle=${formatUnits(maxSingle, 6)} USDC`);
  findings.push(`  SpendingLimit: maxPeriodic=${formatUnits(maxPeriodic, 6)} USDC`);
  findings.push(`  SpendingLimit: cosignThreshold=${formatUnits(cosignThreshold, 6)} USDC`);
  findings.push(`  SpendingLimit: ledgerCosigner=${ledgerCosigner}`);

  // Verify containment bound matches
  if (maxPeriodic > expectedBound) {
    findings.push("  FAIL: maxPeriodicLoss > stated containment bound");
    passed = false;
  }

  // Check 2: Ledger cosigner is set (agent-independent constraint)
  if (ledgerCosigner === "0x0000000000000000000000000000000000000000") {
    findings.push("  FAIL: No ledger cosigner configured — not agent-independent");
    passed = false;
  }

  // Check 3: Reserve adequacy
  const reserveBalance = await publicClient.readContract({
    address: reserveVaultAddress,
    abi: ReserveVaultABI,
    functionName: "getReserveBalance",
  });

  const isAdequate = await publicClient.readContract({
    address: reserveVaultAddress,
    abi: ReserveVaultABI,
    functionName: "isAdequate",
    args: [expectedBound, 30000], // 3x for C2
  });

  const isLocked = await publicClient.readContract({
    address: reserveVaultAddress,
    abi: ReserveVaultABI,
    functionName: "isLocked",
  });

  findings.push(`  Reserve: balance=${formatUnits(reserveBalance, 6)} USDC`);
  findings.push(`  Reserve: adequate (3x)=${isAdequate}`);
  findings.push(`  Reserve: locked=${isLocked}`);

  if (!isAdequate) {
    findings.push("  FAIL: Reserve insufficient for C2 (need 3x containment bound)");
    passed = false;
  }

  if (!isLocked) {
    findings.push("  FAIL: Reserve not locked");
    passed = false;
  }

  const certClass = passed ? "C2" : "UNCLASSIFIED";
  console.log(`  [Auditor] Audit ${passed ? "PASSED" : "FAILED"} — class: ${certClass}`);
  findings.forEach((f) => console.log(`    ${f}`));

  return { passed, findings, certClass };
}

/**
 * Full auditor attestation workflow:
 * 1. Audit containment (automated checks)
 * 2. Stake capital
 * 3. Sign attestation (via Ledger)
 * 4. Publish HCS event
 * 5. Return signature to operator
 */
export async function attestCertificate(
  certHash: Hash,
  spendingLimitAddress: Address,
  reserveVaultAddress: Address,
  containmentBound: bigint,
  stakeAmount: bigint
): Promise<{ signature: Hash; auditResult: AuditResult }> {
  // Step 1: Audit
  const auditResult = await auditContainment(spendingLimitAddress, reserveVaultAddress, containmentBound);

  if (!auditResult.passed) {
    throw new Error("Audit failed — cannot attest");
  }

  // Step 2: Stake
  console.log(`  [Auditor] Staking ${formatUnits(stakeAmount, 6)} USDC...`);
  const auditorWallet = getWalletClient(keys.auditor);

  // Approve staking contract
  const erc20Abi = [
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

  const approveTx = await auditorWallet.writeContract({
    address: addresses.usdc,
    abi: erc20Abi,
    functionName: "approve",
    args: [addresses.auditorStaking, stakeAmount],
  });
  console.log(`  [Auditor] Approve tx: ${approveTx}`);
  await publicClient.waitForTransactionReceipt({ hash: approveTx });

  const stakeTx = await auditorWallet.writeContract({
    address: addresses.auditorStaking,
    abi: AuditorStakingABI,
    functionName: "stake",
    args: [certHash, stakeAmount],
  });
  await publicClient.waitForTransactionReceipt({ hash: stakeTx });

  console.log(`  [Auditor] Staked ${formatUnits(stakeAmount, 6)} USDC for cert ${certHash.slice(0, 18)}...`);

  // Step 3: Sign attestation (via Ledger)
  const signature = await ledgerSignAttestation(certHash);

  // Step 4: Publish HCS event (non-fatal — demo continues if HCS fails)
  try {
    await publishAttestationSigned(certHash, auditorWallet.account.address, auditResult.certClass);
  } catch (e: any) {
    console.log(`  [HCS] Event publish skipped: ${e.message?.slice(0, 60)}`);
  }

  return { signature, auditResult };
}
