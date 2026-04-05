import { formatUnits, type Address } from "viem";
import {
  getCertificate,
  isValid,
  getCertificateAuditors,
  getAuditorRecord,
  getChallengesByCert,
  getActiveCertificate,
} from "../contracts/reads";
import type { DiscoveredEntities } from "./events";
import type { AgentEntity, AuditorEntity, CertificateEntity } from "./types";

const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

export async function hydrateCertificates(
  certHashes: Set<`0x${string}`>
): Promise<CertificateEntity[]> {
  const results = await Promise.allSettled(
    [...certHashes].map(async (certHash) => {
      const [cert, valid, auditors, challengeIds] = await Promise.all([
        getCertificate(certHash),
        isValid(certHash),
        getCertificateAuditors(certHash),
        getChallengesByCert(certHash),
      ]);
      return {
        certHash,
        agent: cert.agent,
        operator: cert.operator,
        certificateClass: cert.certificateClass,
        containmentBound: cert.containmentBound,
        status: cert.status,
        issuedAt: cert.issuedAt,
        expiresAt: cert.expiresAt,
        auditors,
        challengeCount: challengeIds.length,
        isValid: valid,
      } satisfies CertificateEntity;
    })
  );
  return results
    .filter((r): r is PromiseFulfilledResult<CertificateEntity> => r.status === "fulfilled")
    .map((r) => r.value);
}

export async function hydrateAgents(
  agentAddresses: Set<Address>,
  discovered: DiscoveredEntities,
  certificates: CertificateEntity[]
): Promise<AgentEntity[]> {
  const certByAgent = new Map<string, CertificateEntity>();
  for (const cert of certificates) {
    // Keep the most recent cert per agent
    const existing = certByAgent.get(cert.agent.toLowerCase());
    if (!existing || cert.issuedAt > existing.issuedAt) {
      certByAgent.set(cert.agent.toLowerCase(), cert);
    }
  }

  return [...agentAddresses].map((address) => {
    const cert = certByAgent.get(address.toLowerCase());
    // Find operator from discovered data or cert
    let operator: Address | null = null;
    if (cert) operator = cert.operator;

    return {
      address,
      operator,
      activeCertHash: cert?.certHash ?? null,
      certificateClass: cert?.certificateClass ?? null,
      containmentBound: cert?.containmentBound ?? null,
      status: cert?.status ?? null,
      txCount: discovered.txCountByAgent.get(address) || 0,
      blockedCount: discovered.blockedCountByAgent.get(address) || 0,
    } satisfies AgentEntity;
  });
}

export async function hydrateAuditors(
  auditorAddresses: Set<Address>,
  certHashes: Set<`0x${string}`>
): Promise<AuditorEntity[]> {
  const results = await Promise.allSettled(
    [...auditorAddresses].map(async (address) => {
      const record = await getAuditorRecord(address);
      // Find which certs this auditor attested
      const attestedCerts: `0x${string}`[] = [];
      for (const certHash of certHashes) {
        try {
          const auditors = await getCertificateAuditors(certHash);
          if (auditors.some((a) => a.toLowerCase() === address.toLowerCase())) {
            attestedCerts.push(certHash);
          }
        } catch {
          // skip
        }
      }
      return {
        address,
        totalAttestations: record.totalAttestations,
        successfulChallenges: record.successfulChallenges,
        activeStake: record.activeStake,
        certHashes: attestedCerts,
      } satisfies AuditorEntity;
    })
  );
  return results
    .filter((r): r is PromiseFulfilledResult<AuditorEntity> => r.status === "fulfilled")
    .map((r) => r.value);
}
