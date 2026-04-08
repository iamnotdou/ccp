import type { Address } from "viem";

// ─── Entity Types ───

export interface AgentEntity {
  address: Address;
  operator: Address | null;
  activeCertHash: `0x${string}` | null;
  certificateClass: number | null;
  containmentBound: string | null;
  status: number | null; // 0=active,1=revoked,2=expired,3=challenged
  txCount: number;
  blockedCount: number;
}

export interface CertificateEntity {
  certHash: `0x${string}`;
  agent: Address;
  operator: Address;
  certificateClass: number;
  containmentBound: string;
  status: number;
  issuedAt: number;
  expiresAt: number;
  auditors: Address[];
  challengeCount: number;
  isValid: boolean;
}

export interface AuditorEntity {
  address: Address;
  totalAttestations: number;
  successfulChallenges: number;
  activeStake: string;
  certHashes: `0x${string}`[];
}

// ─── Activity Events ───

export type ActivityEventType =
  | "CertificatePublished"
  | "CertificateRevoked"
  | "CertificateChallenged"
  | "TransactionExecuted"
  | "TransactionBlocked"
  | "Staked"
  | "Slashed"
  | "Released"
  | "ReserveDeposited"
  | "ChallengeResolved";

export interface ActivityEvent {
  type: ActivityEventType;
  timestamp: string;
  blockNumber?: number;
  data: Record<string, string>;
}

// ─── Protocol State ───

export interface ProtocolState {
  agents: AgentEntity[];
  certificates: CertificateEntity[];
  auditors: AuditorEntity[];
  activity: ActivityEvent[];
  stats: {
    totalCertificates: number;
    activeCertificates: number;
    totalAgents: number;
    totalAuditors: number;
    totalTransactions: number;
    totalBlocked: number;
    totalVolumeUsdc: string;
  };
}
