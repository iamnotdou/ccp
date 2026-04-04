import { formatUnits, type Address } from "viem";
import { publicClient } from "./client";
import { addresses } from "./config";
import {
  CCPRegistryABI,
  ReserveVaultABI,
  SpendingLimitABI,
  AuditorStakingABI,
  ChallengeManagerABI,
} from "./abis";

// All read helpers return serializable types (strings/numbers/booleans)
// because Next.js Server Components cannot pass BigInt as props.

// ─── CCPRegistry ───

export async function getCertificate(certHash: `0x${string}`) {
  const cert = await publicClient.readContract({
    address: addresses.registry,
    abi: CCPRegistryABI,
    functionName: "getCertificate",
    args: [certHash],
  });
  const c = cert as unknown as {
    operator: Address;
    agent: Address;
    certificateClass: number;
    issuedAt: bigint;
    expiresAt: bigint;
    status: number;
    containmentBound: bigint;
    reserveVault: Address;
    spendingLimit: Address;
    ipfsUri: string;
    auditors: Address[];
  };
  return {
    operator: c.operator,
    agent: c.agent,
    certificateClass: Number(c.certificateClass),
    issuedAt: Number(c.issuedAt),
    expiresAt: Number(c.expiresAt),
    status: Number(c.status),
    containmentBound: formatUnits(c.containmentBound, 6),
    containmentBoundRaw: c.containmentBound.toString(),
    reserveVault: c.reserveVault,
    spendingLimit: c.spendingLimit,
    ipfsUri: c.ipfsUri,
    auditors: c.auditors,
  };
}

export async function getActiveCertificate(agent: Address) {
  const certHash = await publicClient.readContract({
    address: addresses.registry,
    abi: CCPRegistryABI,
    functionName: "getActiveCertificate",
    args: [agent],
  });
  return certHash as `0x${string}`;
}

export async function isValid(certHash: `0x${string}`) {
  const valid = await publicClient.readContract({
    address: addresses.registry,
    abi: CCPRegistryABI,
    functionName: "isValid",
    args: [certHash],
  });
  return valid as boolean;
}

export async function verify(agent: Address, minClass: number, maxLoss: bigint) {
  const [acceptable, certHash] = (await publicClient.readContract({
    address: addresses.registry,
    abi: CCPRegistryABI,
    functionName: "verify",
    args: [agent, minClass, maxLoss],
  })) as [boolean, `0x${string}`];
  return { acceptable, certHash };
}

export async function getCertificateAuditors(certHash: `0x${string}`) {
  const auditors = await publicClient.readContract({
    address: addresses.registry,
    abi: CCPRegistryABI,
    functionName: "getCertificateAuditors",
    args: [certHash],
  });
  return auditors as Address[];
}

// ─── ReserveVault ───

export async function getReserveBalance() {
  const balance = await publicClient.readContract({
    address: addresses.reserveVault,
    abi: ReserveVaultABI,
    functionName: "getReserveBalance",
  });
  return formatUnits(balance as bigint, 6);
}

export async function getStatedAmount() {
  const amount = await publicClient.readContract({
    address: addresses.reserveVault,
    abi: ReserveVaultABI,
    functionName: "getStatedAmount",
  });
  return formatUnits(amount as bigint, 6);
}

export async function isAdequate(containmentBound: bigint, requiredRatioBps: number) {
  const adequate = await publicClient.readContract({
    address: addresses.reserveVault,
    abi: ReserveVaultABI,
    functionName: "isAdequate",
    args: [containmentBound, requiredRatioBps],
  });
  return adequate as boolean;
}

export async function isLocked() {
  const locked = await publicClient.readContract({
    address: addresses.reserveVault,
    abi: ReserveVaultABI,
    functionName: "isLocked",
  });
  return locked as boolean;
}

// ─── SpendingLimit ───

export async function getSpentInPeriod() {
  const [spent, limit, periodEnd] = (await publicClient.readContract({
    address: addresses.spendingLimit,
    abi: SpendingLimitABI,
    functionName: "getSpentInPeriod",
  })) as unknown as [bigint, bigint, bigint];
  return {
    spent: formatUnits(spent, 6),
    limit: formatUnits(limit, 6),
    periodEnd: Number(periodEnd),
    spentRaw: spent.toString(),
    limitRaw: limit.toString(),
  };
}

export async function getRemainingAllowance() {
  const remaining = await publicClient.readContract({
    address: addresses.spendingLimit,
    abi: SpendingLimitABI,
    functionName: "getRemainingAllowance",
  });
  return formatUnits(remaining as bigint, 6);
}

export async function getSpendingConfig() {
  const [maxSingle, maxPeriodic, cosignThreshold, ledgerCosigner, periodDuration] =
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
        functionName: "periodDuration",
      }),
    ]);
  return {
    maxSingleAction: formatUnits(maxSingle as bigint, 6),
    maxPeriodicLoss: formatUnits(maxPeriodic as bigint, 6),
    cosignThreshold: formatUnits(cosignThreshold as bigint, 6),
    ledgerCosigner: ledgerCosigner as Address,
    periodDuration: Number(periodDuration),
  };
}

// ─── AuditorStaking ───

export async function getStake(auditor: Address, certHash: `0x${string}`) {
  const stake = await publicClient.readContract({
    address: addresses.auditorStaking,
    abi: AuditorStakingABI,
    functionName: "getStake",
    args: [auditor, certHash],
  });
  return formatUnits(stake as bigint, 6);
}

export async function getTotalStaked(auditor: Address) {
  const total = await publicClient.readContract({
    address: addresses.auditorStaking,
    abi: AuditorStakingABI,
    functionName: "getTotalStaked",
    args: [auditor],
  });
  return formatUnits(total as bigint, 6);
}

export async function getAuditorRecord(auditor: Address) {
  const record = await publicClient.readContract({
    address: addresses.auditorStaking,
    abi: AuditorStakingABI,
    functionName: "getAuditorRecord",
    args: [auditor],
  });
  const r = record as { totalAttestations: bigint; successfulChallenges: bigint; activeStake: bigint };
  return {
    totalAttestations: Number(r.totalAttestations),
    successfulChallenges: Number(r.successfulChallenges),
    activeStake: formatUnits(r.activeStake, 6),
  };
}

// ─── ChallengeManager ───

export async function getChallenge(challengeId: bigint) {
  const challenge = await publicClient.readContract({
    address: addresses.challengeManager,
    abi: ChallengeManagerABI,
    functionName: "getChallenge",
    args: [challengeId],
  });
  const c = challenge as unknown as {
    certHash: `0x${string}`;
    challenger: Address;
    challengeType: number;
    status: number;
    bond: bigint;
    evidence: `0x${string}`;
    submittedAt: bigint;
    resolvedAt: bigint;
  };
  return {
    certHash: c.certHash,
    challenger: c.challenger,
    challengeType: Number(c.challengeType),
    status: Number(c.status),
    bond: formatUnits(c.bond, 6),
    submittedAt: Number(c.submittedAt),
    resolvedAt: Number(c.resolvedAt),
  };
}

export async function getChallengesByCert(certHash: `0x${string}`) {
  const challenges = await publicClient.readContract({
    address: addresses.challengeManager,
    abi: ChallengeManagerABI,
    functionName: "getChallengesByCert",
    args: [certHash],
  });
  return (challenges as bigint[]).map((id) => id.toString());
}
