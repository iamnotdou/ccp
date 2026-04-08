"use server";

import { formatUnits, type Address, type Hash } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { publicClient } from "@/lib/contracts/client";
import { addresses, keys } from "@/lib/contracts/config";
import {
  SpendingLimitABI,
  ReserveVaultABI,
  AuditorStakingABI,
  CCPRegistryABI,
} from "@/lib/contracts/abis";

const CONTAINMENT_BOUND = 50_000_000_000n; // $50,000
const ZERO_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as Hash;

// ─── Step 1: Read containment config (read-only) ───

export async function auditStep1_ReadConfig(): Promise<{
  error?: string;
  checks?: Array<{ label: string; value: string; pass: boolean }>;
  maxSingleAction?: string;
  maxPeriodicLoss?: string;
  cosignThreshold?: string;
  ledgerCosigner?: string;
}> {
  try {
    const [maxSingle, maxPeriodic, cosignThreshold, ledgerCosigner] =
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
      ]);

    const cosignerAddr = ledgerCosigner as Address;
    const periodicVal = maxPeriodic as bigint;

    const checks = [
      {
        label: "Max Single Action",
        value: `$${formatUnits(maxSingle as bigint, 6)} USDC`,
        pass: true,
      },
      {
        label: "Max Periodic Loss",
        value: `$${formatUnits(periodicVal, 6)} USDC`,
        pass: periodicVal <= CONTAINMENT_BOUND,
      },
      {
        label: "Cosign Threshold",
        value: `$${formatUnits(cosignThreshold as bigint, 6)} USDC`,
        pass: true,
      },
      {
        label: "Ledger Cosigner",
        value: `${cosignerAddr.slice(0, 10)}...${cosignerAddr.slice(-8)}`,
        pass:
          cosignerAddr !==
          "0x0000000000000000000000000000000000000000",
      },
    ];

    return {
      checks,
      maxSingleAction: formatUnits(maxSingle as bigint, 6),
      maxPeriodicLoss: formatUnits(periodicVal, 6),
      cosignThreshold: formatUnits(cosignThreshold as bigint, 6),
      ledgerCosigner: cosignerAddr,
    };
  } catch (e: any) {
    return { error: e.message?.slice(0, 200) || "Failed to read spending config" };
  }
}

// ─── Step 2: Check reserve adequacy (read-only) ───

export async function auditStep2_CheckReserve(): Promise<{
  error?: string;
  checks?: Array<{ label: string; value: string; pass: boolean }>;
  reserveBalance?: string;
  isAdequateC2?: boolean;
  isAdequateC3?: boolean;
  isLocked?: boolean;
}> {
  try {
    const [balance, adequateC2, adequateC3, locked] = await Promise.all([
      publicClient.readContract({
        address: addresses.reserveVault,
        abi: ReserveVaultABI,
        functionName: "getReserveBalance",
      }),
      publicClient.readContract({
        address: addresses.reserveVault,
        abi: ReserveVaultABI,
        functionName: "isAdequate",
        args: [CONTAINMENT_BOUND, 30000], // 3x for C2
      }),
      publicClient.readContract({
        address: addresses.reserveVault,
        abi: ReserveVaultABI,
        functionName: "isAdequate",
        args: [CONTAINMENT_BOUND, 50000], // 5x for C3
      }),
      publicClient.readContract({
        address: addresses.reserveVault,
        abi: ReserveVaultABI,
        functionName: "isLocked",
      }),
    ]);

    const balFormatted = formatUnits(balance as bigint, 6);
    const isLockedVal = locked as boolean;
    const isC2 = adequateC2 as boolean;
    const isC3 = adequateC3 as boolean;

    const checks = [
      {
        label: "Reserve Balance",
        value: `$${parseFloat(balFormatted).toLocaleString()} USDC`,
        pass: parseFloat(balFormatted) > 0,
      },
      {
        label: "C2 Adequacy (3x = $150,000)",
        value: isC2 ? "ADEQUATE" : "INSUFFICIENT",
        pass: isC2,
      },
      {
        label: "C3 Adequacy (5x = $250,000)",
        value: isC3 ? "ADEQUATE" : "INSUFFICIENT",
        pass: isC3,
      },
      {
        label: "Reserve Lock",
        value: isLockedVal ? "LOCKED" : "UNLOCKED",
        pass: isLockedVal,
      },
    ];

    return {
      checks,
      reserveBalance: balFormatted,
      isAdequateC2: isC2,
      isAdequateC3: isC3,
      isLocked: isLockedVal,
    };
  } catch (e: any) {
    return { error: e.message?.slice(0, 200) || "Failed to check reserve" };
  }
}

// ─── Step 3: Determine class & check existing cert ───

export async function auditStep3_ClassifyAndCheck(): Promise<{
  error?: string;
  certClass?: string;
  requiredStake?: string;
  hasExistingCert?: boolean;
  existingCertHash?: string;
  existingCertValid?: boolean;
  agentAddress?: string;
  auditorAddress?: string;
}> {
  try {
    const agentAccount = privateKeyToAccount(keys.agent);
    const auditorAccount = privateKeyToAccount(keys.auditor);

    // Check reserve adequacy for classification
    const [adequateC2, adequateC3] = await Promise.all([
      publicClient.readContract({
        address: addresses.reserveVault,
        abi: ReserveVaultABI,
        functionName: "isAdequate",
        args: [CONTAINMENT_BOUND, 30000],
      }),
      publicClient.readContract({
        address: addresses.reserveVault,
        abi: ReserveVaultABI,
        functionName: "isAdequate",
        args: [CONTAINMENT_BOUND, 50000],
      }),
    ]);

    // Determine class
    let certClass = "UNCLASSIFIED";
    let requiredStake = "0";
    if (adequateC3 as boolean) {
      certClass = "C3";
      requiredStake = formatUnits((CONTAINMENT_BOUND * 5n) / 100n, 6); // 5%
    } else if (adequateC2 as boolean) {
      certClass = "C2";
      requiredStake = formatUnits((CONTAINMENT_BOUND * 3n) / 100n, 6); // 3%
    }

    // Check existing cert
    const existing = (await publicClient.readContract({
      address: addresses.registry,
      abi: CCPRegistryABI,
      functionName: "getActiveCertificate",
      args: [agentAccount.address],
    })) as Hash;

    let existingCertValid = false;
    if (existing && existing !== ZERO_HASH) {
      existingCertValid = (await publicClient.readContract({
        address: addresses.registry,
        abi: CCPRegistryABI,
        functionName: "isValid",
        args: [existing],
      })) as boolean;
    }

    return {
      certClass,
      requiredStake,
      hasExistingCert: existing !== ZERO_HASH,
      existingCertHash: existing,
      existingCertValid,
      agentAddress: agentAccount.address,
      auditorAddress: auditorAccount.address,
    };
  } catch (e: any) {
    return { error: e.message?.slice(0, 200) || "Failed to classify" };
  }
}

// ─── Step 4: Check auditor stake status ───

export async function auditStep4_AuditorStatus(): Promise<{
  error?: string;
  auditorAddress?: string;
  totalAttestations?: number;
  successfulChallenges?: number;
  activeStake?: string;
  totalStaked?: string;
  existingStakeOnCert?: string;
}> {
  try {
    const auditorAccount = privateKeyToAccount(keys.auditor);
    const agentAccount = privateKeyToAccount(keys.agent);

    const [record, totalStaked] = await Promise.all([
      publicClient.readContract({
        address: addresses.auditorStaking,
        abi: AuditorStakingABI,
        functionName: "getAuditorRecord",
        args: [auditorAccount.address],
      }),
      publicClient.readContract({
        address: addresses.auditorStaking,
        abi: AuditorStakingABI,
        functionName: "getTotalStaked",
        args: [auditorAccount.address],
      }),
    ]);

    const r = record as {
      totalAttestations: bigint;
      successfulChallenges: bigint;
      activeStake: bigint;
    };

    // Check if there's an existing cert to see auditor stake on it
    let existingStakeOnCert = "0";
    try {
      const existing = (await publicClient.readContract({
        address: addresses.registry,
        abi: CCPRegistryABI,
        functionName: "getActiveCertificate",
        args: [agentAccount.address],
      })) as Hash;

      if (existing && existing !== ZERO_HASH) {
        const stake = await publicClient.readContract({
          address: addresses.auditorStaking,
          abi: AuditorStakingABI,
          functionName: "getStake",
          args: [auditorAccount.address, existing],
        });
        existingStakeOnCert = formatUnits(stake as bigint, 6);
      }
    } catch {}

    return {
      auditorAddress: auditorAccount.address,
      totalAttestations: Number(r.totalAttestations),
      successfulChallenges: Number(r.successfulChallenges),
      activeStake: formatUnits(r.activeStake, 6),
      totalStaked: formatUnits(totalStaked as bigint, 6),
      existingStakeOnCert,
    };
  } catch (e: any) {
    return { error: e.message?.slice(0, 200) || "Failed to load auditor status" };
  }
}

// ─── Step 5: Verify full system state (final verdict) ───

export async function auditStep5_FinalVerdict(): Promise<{
  error?: string;
  verdict?: "PASS" | "FAIL";
  certClass?: string;
  reasons?: string[];
  summary?: {
    spendingConfigured: boolean;
    ledgerSet: boolean;
    reserveAdequate: boolean;
    reserveLocked: boolean;
    auditorStaked: boolean;
    certActive: boolean;
  };
}> {
  try {
    const agentAccount = privateKeyToAccount(keys.agent);
    const auditorAccount = privateKeyToAccount(keys.auditor);

    const [
      maxPeriodic,
      ledgerCosigner,
      reserveAdequate,
      reserveLocked,
      existingCert,
    ] = await Promise.all([
      publicClient.readContract({
        address: addresses.spendingLimit,
        abi: SpendingLimitABI,
        functionName: "maxPeriodicLoss",
      }),
      publicClient.readContract({
        address: addresses.spendingLimit,
        abi: SpendingLimitABI,
        functionName: "ledgerCosigner",
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
      publicClient.readContract({
        address: addresses.registry,
        abi: CCPRegistryABI,
        functionName: "getActiveCertificate",
        args: [agentAccount.address],
      }),
    ]);

    const cosignerAddr = ledgerCosigner as Address;
    const periodicVal = maxPeriodic as bigint;

    const spendingConfigured = periodicVal <= CONTAINMENT_BOUND;
    const ledgerSet =
      cosignerAddr !== "0x0000000000000000000000000000000000000000";
    const reserveAdequateVal = reserveAdequate as boolean;
    const reserveLockedVal = reserveLocked as boolean;

    const certHash = existingCert as Hash;
    const certActive = certHash !== ZERO_HASH;

    let auditorStaked = false;
    if (certActive) {
      try {
        const stake = await publicClient.readContract({
          address: addresses.auditorStaking,
          abi: AuditorStakingABI,
          functionName: "getStake",
          args: [auditorAccount.address, certHash],
        });
        auditorStaked = (stake as bigint) > 0n;
      } catch {}
    }

    const reasons: string[] = [];
    if (!spendingConfigured) reasons.push("Periodic loss exceeds containment bound");
    if (!ledgerSet) reasons.push("Ledger cosigner not configured");
    if (!reserveAdequateVal) reasons.push("Reserve below 3x requirement");
    if (!reserveLockedVal) reasons.push("Reserve is not locked");
    if (!auditorStaked) reasons.push("Auditor has not staked on active certificate");
    if (!certActive) reasons.push("No active certificate found");

    const allPass =
      spendingConfigured &&
      ledgerSet &&
      reserveAdequateVal &&
      reserveLockedVal &&
      auditorStaked &&
      certActive;

    return {
      verdict: allPass ? "PASS" : "FAIL",
      certClass: allPass ? "C2" : "UNCLASSIFIED",
      reasons,
      summary: {
        spendingConfigured,
        ledgerSet,
        reserveAdequate: reserveAdequateVal,
        reserveLocked: reserveLockedVal,
        auditorStaked,
        certActive,
      },
    };
  } catch (e: any) {
    return { error: e.message?.slice(0, 200) || "Failed to run final verdict" };
  }
}
