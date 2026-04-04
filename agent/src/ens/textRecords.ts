import { createPublicClient, http, type Address } from "viem";
import { sepolia } from "viem/chains";
import { normalize } from "viem/ens";
import { ensConfig } from "../config.js";

// ENS lives on Ethereum Sepolia (testnet) while CCP contracts live on Hedera.
// ENS is the cross-chain discovery layer: ENS name → text records → Hedera addresses.

const ensClient = createPublicClient({
  chain: sepolia,
  transport: http(ensConfig.rpcUrl),
});

// ─── CCP-specific ENS text record keys ───

export const CCP_TEXT_KEYS = {
  CERTIFICATE: "ccp.certificate", // Active cert hash
  CLASS: "ccp.class", // C1, C2, C3
  BOUND: "ccp.bound", // Containment bound in USDC
  CHAIN: "ccp.chain", // Chain ID where registry lives (296 = Hedera testnet)
  REGISTRY: "ccp.registry", // Registry contract address
  RESERVE: "ccp.reserve", // ReserveVault address
  EXPIRES: "ccp.expires", // Certificate expiry timestamp
  // Auditor-specific
  ROLE: "ccp.role", // "operator", "auditor", "agent"
  SPECIALIZATION: "ccp.specialization", // Audit scope
  ATTESTATION_COUNT: "ccp.attestation_count",
  CHALLENGE_COUNT: "ccp.challenge_count",
  ACTIVE_STAKE: "ccp.active_stake",
  LATEST_ATTESTATION: "ccp.latest_attestation",
} as const;

export interface CCPTextRecords {
  certificate?: string;
  class?: string;
  bound?: string;
  chain?: string;
  registry?: string;
  reserve?: string;
  expires?: string;
  role?: string;
  specialization?: string;
  attestationCount?: string;
  challengeCount?: string;
}

/**
 * Read all CCP text records from an ENS name.
 * This is the entry point for the verification flow:
 *   ENS name → text records → certificate hash + chain → query Hedera registry
 */
export async function getCCPTextRecords(ensName: string): Promise<CCPTextRecords> {
  const name = normalize(ensName);
  const records: CCPTextRecords = {};

  const keys = [
    { key: CCP_TEXT_KEYS.CERTIFICATE, field: "certificate" as const },
    { key: CCP_TEXT_KEYS.CLASS, field: "class" as const },
    { key: CCP_TEXT_KEYS.BOUND, field: "bound" as const },
    { key: CCP_TEXT_KEYS.CHAIN, field: "chain" as const },
    { key: CCP_TEXT_KEYS.REGISTRY, field: "registry" as const },
    { key: CCP_TEXT_KEYS.RESERVE, field: "reserve" as const },
    { key: CCP_TEXT_KEYS.EXPIRES, field: "expires" as const },
    { key: CCP_TEXT_KEYS.ROLE, field: "role" as const },
    { key: CCP_TEXT_KEYS.SPECIALIZATION, field: "specialization" as const },
    { key: CCP_TEXT_KEYS.ATTESTATION_COUNT, field: "attestationCount" as const },
    { key: CCP_TEXT_KEYS.CHALLENGE_COUNT, field: "challengeCount" as const },
  ];

  for (const { key, field } of keys) {
    try {
      const value = await ensClient.getEnsText({ name, key });
      if (value) records[field] = value;
    } catch {
      // Record not set — skip
    }
  }

  return records;
}

/**
 * Resolve an ENS name to an Ethereum address.
 */
export async function resolveENS(ensName: string): Promise<Address | null> {
  try {
    const address = await ensClient.getEnsAddress({ name: normalize(ensName) });
    return address;
  } catch {
    return null;
  }
}

/**
 * Reverse resolve an address to an ENS name.
 */
export async function reverseResolveENS(address: Address): Promise<string | null> {
  try {
    const name = await ensClient.getEnsName({ address });
    return name;
  } catch {
    return null;
  }
}

/**
 * Full CCP discovery flow from ENS name:
 * 1. Resolve name → address
 * 2. Read CCP text records (cert hash, chain, registry)
 * 3. Return everything needed to query the Hedera registry
 */
export async function discoverAgent(ensName: string) {
  console.log(`  [ENS] Resolving ${ensName}...`);

  const address = await resolveENS(ensName);
  const records = await getCCPTextRecords(ensName);

  console.log(`  [ENS] Address: ${address || "not found"}`);
  console.log(`  [ENS] Certificate: ${records.certificate || "none"}`);
  console.log(`  [ENS] Class: ${records.class || "unknown"}`);
  console.log(`  [ENS] Chain: ${records.chain || "unknown"}`);

  return {
    ensName,
    address,
    certHash: records.certificate,
    certClass: records.class,
    chainId: records.chain ? parseInt(records.chain) : undefined,
    registryAddress: records.registry,
    reserveAddress: records.reserve,
    containmentBound: records.bound,
    role: records.role,
  };
}
