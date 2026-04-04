import { hederaConfig } from "../config.js";

const MIRROR_BASE =
  hederaConfig.network === "testnet"
    ? "https://testnet.mirrornode.hedera.com"
    : "https://mainnet.mirrornode.hedera.com";

/**
 * Query contract state via Mirror Node REST API.
 */
export async function getContractInfo(contractAddress: string) {
  const res = await fetch(`${MIRROR_BASE}/api/v1/contracts/${contractAddress}`);
  return res.json();
}

/**
 * Get token balance for an account.
 */
export async function getAccountTokens(accountId: string) {
  const res = await fetch(`${MIRROR_BASE}/api/v1/accounts/${accountId}/tokens`);
  return res.json();
}

/**
 * Get transaction history for a contract.
 */
export async function getContractTransactions(contractAddress: string, limit = 25) {
  const res = await fetch(
    `${MIRROR_BASE}/api/v1/contracts/${contractAddress}/results?limit=${limit}&order=desc`
  );
  return res.json();
}

/**
 * Get all messages from an HCS topic (certificate event history).
 */
export async function getTopicMessages(topicId: string, limit = 100) {
  const res = await fetch(
    `${MIRROR_BASE}/api/v1/topics/${topicId}/messages?limit=${limit}&order=asc`
  );
  const data = (await res.json()) as {
    messages: Array<{
      consensus_timestamp: string;
      message: string;
      sequence_number: number;
    }>;
  };

  return data.messages.map((msg) => ({
    timestamp: msg.consensus_timestamp,
    sequenceNumber: msg.sequence_number,
    content: JSON.parse(Buffer.from(msg.message, "base64").toString("utf8")),
  }));
}

/**
 * Print a formatted event timeline from HCS.
 */
export async function printEventTimeline(topicId: string) {
  console.log("\n═══ CCP Event Timeline (HCS) ═══\n");

  const messages = await getTopicMessages(topicId);

  for (const msg of messages) {
    const event = msg.content;
    const time = new Date(parseFloat(msg.timestamp) * 1000).toISOString();

    switch (event.type) {
      case "CERTIFICATE_PUBLISHED":
        console.log(`  ${time} | CERT PUBLISHED | agent=${event.agent?.slice(0, 10)}... class=${event.class}`);
        break;
      case "ATTESTATION_SIGNED":
        console.log(`  ${time} | ATTESTED       | auditor=${event.auditor?.slice(0, 10)}... class=${event.class}`);
        break;
      case "AGENT_TRANSACTION":
        console.log(
          `  ${time} | TX EXECUTED    | to=${event.to?.slice(0, 10)}... value=${event.value} cosigned=${event.ledgerCosigned}`
        );
        break;
      case "TRANSACTION_BLOCKED":
        console.log(`  ${time} | TX BLOCKED     | value=${event.value} reason=${event.reason}`);
        break;
      case "CHALLENGE_SUBMITTED":
        console.log(`  ${time} | CHALLENGED     | id=${event.challengeId}`);
        break;
      case "CHALLENGE_UPHELD":
        console.log(`  ${time} | SLASH          | challenge=${event.challengeId} UPHELD`);
        break;
      case "CHALLENGE_REJECTED":
        console.log(`  ${time} | REJECTED       | challenge=${event.challengeId} frivolous`);
        break;
      default:
        console.log(`  ${time} | ${event.type}`);
    }
  }

  console.log("\n═══════════════════════════════\n");
}
