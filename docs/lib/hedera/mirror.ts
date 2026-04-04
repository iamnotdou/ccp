const MIRROR_BASE = "https://testnet.mirrornode.hedera.com";

export async function getContractInfo(contractAddress: string) {
  const res = await fetch(`${MIRROR_BASE}/api/v1/contracts/${contractAddress}`);
  return res.json();
}

export async function getContractTransactions(contractAddress: string, limit = 25) {
  const res = await fetch(
    `${MIRROR_BASE}/api/v1/contracts/${contractAddress}/results?limit=${limit}&order=desc`
  );
  return res.json();
}

export interface HCSMessage {
  timestamp: string;
  sequenceNumber: number;
  content: {
    type: string;
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
    timestamp?: number;
  };
}

export async function getTopicMessages(topicId: string, limit = 100): Promise<HCSMessage[]> {
  const res = await fetch(
    `${MIRROR_BASE}/api/v1/topics/${topicId}/messages?limit=${limit}&order=asc`
  );
  const data = (await res.json()) as {
    messages?: Array<{
      consensus_timestamp: string;
      message: string;
      sequence_number: number;
    }>;
  };

  if (!data.messages) return [];

  return data.messages.map((msg) => ({
    timestamp: msg.consensus_timestamp,
    sequenceNumber: msg.sequence_number,
    content: JSON.parse(atob(msg.message)),
  }));
}
