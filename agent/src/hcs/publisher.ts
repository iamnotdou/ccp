import {
  Client,
  TopicMessageSubmitTransaction,
  TopicCreateTransaction,
  TopicId,
  PrivateKey,
  AccountId,
} from "@hashgraph/sdk";
import { hederaConfig } from "../config.js";

export type CCPEventType =
  | "CERTIFICATE_PUBLISHED"
  | "CERTIFICATE_REVOKED"
  | "ATTESTATION_SIGNED"
  | "AGENT_TRANSACTION"
  | "TRANSACTION_BLOCKED"
  | "CHALLENGE_SUBMITTED"
  | "CHALLENGE_UPHELD"
  | "CHALLENGE_REJECTED";

export interface CCPEvent {
  type: CCPEventType;
  certHash?: string;
  agent?: string;
  operator?: string;
  auditor?: string;
  class?: string;
  containmentBound?: string;
  to?: string;
  value?: string;
  ledgerCosigned?: boolean;
  periodSpent?: string;
  periodLimit?: string;
  reason?: string;
  challengeId?: string;
  timestamp: number;
}

let hederaClient: Client | null = null;
let topicId: TopicId | null = null;

function getClient(): Client {
  if (!hederaClient) {
    hederaClient =
      hederaConfig.network === "testnet" ? Client.forTestnet() : Client.forMainnet();

    // Prefer ED25519 (DER) key for native Hedera operations (HCS)
    if (hederaConfig.hcsAccountId && hederaConfig.hcsPrivateKeyDer) {
      hederaClient.setOperator(
        AccountId.fromString(hederaConfig.hcsAccountId),
        PrivateKey.fromStringDer(hederaConfig.hcsPrivateKeyDer)
      );
    } else if (hederaConfig.accountId && hederaConfig.privateKey) {
      const rawKey = hederaConfig.privateKey.startsWith("0x")
        ? hederaConfig.privateKey.slice(2)
        : hederaConfig.privateKey;
      hederaClient.setOperator(
        AccountId.fromString(hederaConfig.accountId),
        PrivateKey.fromStringECDSA(rawKey)
      );
    }
  }
  return hederaClient;
}

/**
 * Create a new HCS topic for CCP events.
 * Call once during setup.
 */
export async function createCCPTopic(): Promise<string> {
  const client = getClient();

  const tx = new TopicCreateTransaction().setTopicMemo("CCP Protocol Events — Containment Certificate Protocol");

  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);

  const newTopicId = receipt.topicId!.toString();
  console.log(`  [HCS] Created CCP topic: ${newTopicId}`);

  topicId = TopicId.fromString(newTopicId);
  return newTopicId;
}

/**
 * Set the topic ID (if already created).
 */
export function setTopicId(id: string) {
  topicId = TopicId.fromString(id);
}

/**
 * Publish a CCP event to the HCS topic.
 * Events are timestamped by Hedera consensus with guaranteed ordering.
 */
export async function publishEvent(event: CCPEvent): Promise<string> {
  if (!topicId) {
    if (hederaConfig.hcsTopicId) {
      topicId = TopicId.fromString(hederaConfig.hcsTopicId);
    } else {
      console.warn("  [HCS] No topic ID set. Skipping event publish.");
      return "";
    }
  }

  const client = getClient();
  const message = JSON.stringify(event);

  const tx = new TopicMessageSubmitTransaction().setTopicId(topicId).setMessage(message);

  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);

  const seqNum = receipt.topicSequenceNumber?.toString() || "?";
  console.log(`  [HCS] Published ${event.type} (seq: ${seqNum})`);

  return seqNum;
}

// ─── Convenience publishers ───

export async function publishCertificatePublished(
  certHash: string,
  agent: string,
  operator: string,
  certClass: string,
  containmentBound: string
) {
  return publishEvent({
    type: "CERTIFICATE_PUBLISHED",
    certHash,
    agent,
    operator,
    class: certClass,
    containmentBound,
    timestamp: Date.now(),
  });
}

export async function publishAttestationSigned(certHash: string, auditor: string, certClass: string) {
  return publishEvent({
    type: "ATTESTATION_SIGNED",
    certHash,
    auditor,
    class: certClass,
    timestamp: Date.now(),
  });
}

export async function publishAgentTransaction(
  agent: string,
  to: string,
  value: string,
  ledgerCosigned: boolean,
  periodSpent: string,
  periodLimit: string
) {
  return publishEvent({
    type: "AGENT_TRANSACTION",
    agent,
    to,
    value,
    ledgerCosigned,
    periodSpent,
    periodLimit,
    timestamp: Date.now(),
  });
}

export async function publishTransactionBlocked(
  agent: string,
  value: string,
  reason: string,
  periodSpent: string,
  periodLimit: string
) {
  return publishEvent({
    type: "TRANSACTION_BLOCKED",
    agent,
    value,
    reason,
    periodSpent,
    periodLimit,
    timestamp: Date.now(),
  });
}

export async function publishChallengeSubmitted(
  challengeId: string,
  certHash: string,
  challenger: string
) {
  return publishEvent({
    type: "CHALLENGE_SUBMITTED",
    challengeId,
    certHash,
    agent: challenger,
    timestamp: Date.now(),
  });
}

export async function publishChallengeResolved(
  challengeId: string,
  certHash: string,
  upheld: boolean
) {
  return publishEvent({
    type: upheld ? "CHALLENGE_UPHELD" : "CHALLENGE_REJECTED",
    challengeId,
    certHash,
    timestamp: Date.now(),
  });
}
