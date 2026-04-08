import { createPublicClient, http, type Address } from "viem";
import { sepolia } from "viem/chains";
import { normalize } from "viem/ens";

const ensClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.ENS_RPC_URL || "https://rpc.sepolia.org"),
});

export const CCP_TEXT_KEYS = {
  CERTIFICATE: "ccp.certificate",
  CLASS: "ccp.class",
  BOUND: "ccp.bound",
  CHAIN: "ccp.chain",
  REGISTRY: "ccp.registry",
  RESERVE: "ccp.reserve",
  EXPIRES: "ccp.expires",
  ROLE: "ccp.role",
  SPECIALIZATION: "ccp.specialization",
  ATTESTATION_COUNT: "ccp.attestation_count",
  CHALLENGE_COUNT: "ccp.challenge_count",
  ACTIVE_STAKE: "ccp.active_stake",
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
      // Record not set
    }
  }

  return records;
}

export async function resolveENS(ensName: string): Promise<Address | null> {
  try {
    const address = await ensClient.getEnsAddress({ name: normalize(ensName) });
    return address;
  } catch {
    return null;
  }
}

export async function reverseResolveENS(address: Address): Promise<string | null> {
  try {
    const name = await ensClient.getEnsName({ address });
    return name;
  } catch {
    return null;
  }
}

export async function discoverAgent(ensName: string) {
  const address = await resolveENS(ensName);
  const records = await getCCPTextRecords(ensName);

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
