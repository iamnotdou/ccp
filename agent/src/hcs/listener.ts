import { Client, TopicMessageQuery, TopicId, AccountId, PrivateKey } from "@hashgraph/sdk";
import { hederaConfig } from "../config.js";
import type { CCPEvent } from "./publisher.js";

/**
 * Subscribe to CCP events on an HCS topic.
 * Uses Hedera Mirror Node for historical + live messages.
 */
export function subscribeToCCPEvents(
  topicIdStr: string,
  onEvent: (event: CCPEvent, sequenceNumber: number, timestamp: Date) => void
) {
  const client =
    hederaConfig.network === "testnet" ? Client.forTestnet() : Client.forMainnet();

  if (hederaConfig.hcsAccountId && hederaConfig.hcsPrivateKeyDer) {
    client.setOperator(
      AccountId.fromString(hederaConfig.hcsAccountId),
      PrivateKey.fromStringDer(hederaConfig.hcsPrivateKeyDer)
    );
  } else if (hederaConfig.accountId && hederaConfig.privateKey) {
    const rawKey = hederaConfig.privateKey.startsWith("0x")
      ? hederaConfig.privateKey.slice(2)
      : hederaConfig.privateKey;
    client.setOperator(
      AccountId.fromString(hederaConfig.accountId),
      PrivateKey.fromStringECDSA(rawKey)
    );
  }

  const topicId = TopicId.fromString(topicIdStr);

  new TopicMessageQuery()
    .setTopicId(topicId)
    .subscribe(client, null, (message) => {
      const content = Buffer.from(message.contents).toString("utf8");
      try {
        const event = JSON.parse(content) as CCPEvent;
        const seqNum = message.sequenceNumber.toNumber();
        const timestamp = message.consensusTimestamp.toDate();
        onEvent(event, seqNum, timestamp);
      } catch {
        console.warn("  [HCS] Failed to parse message:", content.slice(0, 100));
      }
    });

  console.log(`  [HCS] Subscribed to topic ${topicIdStr}`);
}

/**
 * Fetch historical CCP events from the Mirror Node REST API.
 */
export async function fetchCCPHistory(topicIdStr: string): Promise<CCPEvent[]> {
  const baseUrl =
    hederaConfig.network === "testnet"
      ? "https://testnet.mirrornode.hedera.com"
      : "https://mainnet.mirrornode.hedera.com";

  const url = `${baseUrl}/api/v1/topics/${topicIdStr}/messages?order=asc&limit=100`;

  const response = await fetch(url);
  const data = (await response.json()) as {
    messages: Array<{
      message: string;
      sequence_number: number;
      consensus_timestamp: string;
    }>;
  };

  return data.messages.map((msg) => {
    const decoded = Buffer.from(msg.message, "base64").toString("utf8");
    return JSON.parse(decoded) as CCPEvent;
  });
}
