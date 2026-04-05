import { formatUnits } from "viem";
import { getProtocolEventLogs } from "./events";
import { hydrateAgents, hydrateAuditors, hydrateCertificates } from "./hydrate";
import { getTopicMessages } from "../hedera/mirror";
import type { ActivityEvent, ProtocolState } from "./types";

const HCS_TOPIC_ID = process.env.HCS_TOPIC_ID || "";

// Merge HCS messages into activity events
function hcsToActivity(hcsMessages: Awaited<ReturnType<typeof getTopicMessages>>): ActivityEvent[] {
  const typeMap: Record<string, ActivityEvent["type"]> = {
    CERTIFICATE_PUBLISHED: "CertificatePublished",
    AGENT_TRANSACTION: "TransactionExecuted",
    TRANSACTION_BLOCKED: "TransactionBlocked",
  };

  return hcsMessages
    .map((msg) => {
      const eventType = typeMap[msg.content.type];
      if (!eventType) return null;
      return {
        type: eventType,
        timestamp: msg.timestamp,
        data: Object.fromEntries(
          Object.entries(msg.content)
            .filter(([k]) => k !== "type")
            .map(([k, v]) => [k, String(v ?? "")])
        ),
      } satisfies ActivityEvent;
    })
    .filter((e): e is ActivityEvent => e !== null);
}

// Simple in-memory cache with TTL
let cached: { state: ProtocolState; expiry: number } | null = null;
const CACHE_TTL_MS = 30_000;

export async function getProtocolState(): Promise<ProtocolState> {
  const now = Date.now();
  if (cached && now < cached.expiry) return cached.state;

  // Fetch event logs and HCS messages in parallel
  const [discovered, hcsMessages] = await Promise.all([
    getProtocolEventLogs(),
    HCS_TOPIC_ID ? getTopicMessages(HCS_TOPIC_ID) : Promise.resolve([]),
  ]);

  // Merge HCS-discovered addresses into the event-log sets
  for (const msg of hcsMessages) {
    if (msg.content.agent) discovered.agents.add(msg.content.agent as `0x${string}`);
    if (msg.content.operator) discovered.operators.add(msg.content.operator as `0x${string}`);
    if (msg.content.auditor) discovered.auditors.add(msg.content.auditor as `0x${string}`);
    if (msg.content.certHash) discovered.certHashes.add(msg.content.certHash as `0x${string}`);
  }

  // Hydrate entities from on-chain state
  const certificates = await hydrateCertificates(discovered.certHashes);

  // Also discover auditors from certificate data
  for (const cert of certificates) {
    for (const auditor of cert.auditors) {
      discovered.auditors.add(auditor);
    }
  }

  const [agents, auditors] = await Promise.all([
    hydrateAgents(discovered.agents, discovered, certificates),
    hydrateAuditors(discovered.auditors, discovered.certHashes),
  ]);

  // Merge activity from event logs + HCS (dedupe by preferring event logs which have block numbers)
  const hcsActivity = hcsToActivity(hcsMessages);
  const allActivity = [...discovered.activity, ...hcsActivity];
  // Sort: events with block numbers first (desc), then HCS by timestamp (desc)
  allActivity.sort((a, b) => {
    if (a.blockNumber && b.blockNumber) return b.blockNumber - a.blockNumber;
    if (a.blockNumber) return -1;
    if (b.blockNumber) return 1;
    return b.timestamp.localeCompare(a.timestamp);
  });

  const state: ProtocolState = {
    agents,
    certificates,
    auditors,
    activity: allActivity.slice(0, 100), // cap at 100 events
    stats: {
      totalCertificates: certificates.length,
      activeCertificates: certificates.filter((c) => c.isValid).length,
      totalAgents: agents.length,
      totalAuditors: auditors.length,
      totalTransactions: discovered.activity.filter((a) => a.type === "TransactionExecuted").length,
      totalBlocked: discovered.activity.filter((a) => a.type === "TransactionBlocked").length,
      totalVolumeUsdc: formatUnits(discovered.volumeUsdc, 6),
    },
  };

  cached = { state, expiry: now + CACHE_TTL_MS };
  return state;
}
