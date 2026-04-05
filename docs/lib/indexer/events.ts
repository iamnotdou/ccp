import { formatUnits, parseAbiItem, type Address } from "viem";
import { publicClient } from "../contracts/client";
import { addresses } from "../contracts/config";
import type { ActivityEvent } from "./types";

// Hedera testnet doesn't support very large block ranges, so we use a recent window.
// For hackathon demo, all activity is recent.
const FROM_BLOCK = 0n;

// ─── Discovered addresses/hashes from event logs ───

export interface DiscoveredEntities {
  agents: Set<Address>;
  operators: Set<Address>;
  auditors: Set<Address>;
  certHashes: Set<`0x${string}`>;
  activity: ActivityEvent[];
  txCountByAgent: Map<string, number>;
  blockedCountByAgent: Map<string, number>;
  volumeUsdc: bigint;
}

export async function getProtocolEventLogs(): Promise<DiscoveredEntities> {
  const agents = new Set<Address>();
  const operators = new Set<Address>();
  const auditors = new Set<Address>();
  const certHashes = new Set<`0x${string}`>();
  const activity: ActivityEvent[] = [];
  const txCountByAgent = new Map<string, number>();
  const blockedCountByAgent = new Map<string, number>();
  let volumeUsdc = 0n;

  // Fetch all event types in parallel
  const [
    publishedLogs,
    revokedLogs,
    challengedLogs,
    executedLogs,
    blockedLogs,
    stakedLogs,
  ] = await Promise.all([
    publicClient.getLogs({
      address: addresses.registry,
      event: parseAbiItem(
        "event CertificatePublished(bytes32 indexed certHash, address indexed agent, address indexed operator, uint8 certificateClass, uint128 containmentBound, uint48 expiresAt)"
      ),
      fromBlock: FROM_BLOCK,
    }).catch(() => []),
    publicClient.getLogs({
      address: addresses.registry,
      event: parseAbiItem(
        "event CertificateRevoked(bytes32 indexed certHash, address indexed agent)"
      ),
      fromBlock: FROM_BLOCK,
    }).catch(() => []),
    publicClient.getLogs({
      address: addresses.registry,
      event: parseAbiItem(
        "event CertificateChallenged(bytes32 indexed certHash, address indexed challenger)"
      ),
      fromBlock: FROM_BLOCK,
    }).catch(() => []),
    publicClient.getLogs({
      address: addresses.spendingLimit,
      event: parseAbiItem(
        "event TransactionExecuted(address indexed agent, address indexed to, uint256 value, bool ledgerCosigned)"
      ),
      fromBlock: FROM_BLOCK,
    }).catch(() => []),
    publicClient.getLogs({
      address: addresses.spendingLimit,
      event: parseAbiItem(
        "event TransactionBlocked(address indexed agent, uint256 value, string reason)"
      ),
      fromBlock: FROM_BLOCK,
    }).catch(() => []),
    publicClient.getLogs({
      address: addresses.auditorStaking,
      event: parseAbiItem(
        "event Staked(address indexed auditor, bytes32 indexed certHash, uint256 amount)"
      ),
      fromBlock: FROM_BLOCK,
    }).catch(() => []),
  ]);

  // Process CertificatePublished
  for (const log of publishedLogs) {
    const args = log.args;
    if (!args.certHash || !args.agent || !args.operator) continue;
    agents.add(args.agent);
    operators.add(args.operator);
    certHashes.add(args.certHash);
    activity.push({
      type: "CertificatePublished",
      timestamp: "",
      blockNumber: Number(log.blockNumber),
      data: {
        certHash: args.certHash,
        agent: args.agent,
        operator: args.operator,
        class: String(args.certificateClass ?? 0),
        bound: args.containmentBound ? formatUnits(args.containmentBound, 6) : "0",
        expiresAt: String(args.expiresAt ?? 0),
      },
    });
  }

  // Process CertificateRevoked
  for (const log of revokedLogs) {
    const args = log.args;
    if (!args.certHash || !args.agent) continue;
    agents.add(args.agent);
    certHashes.add(args.certHash);
    activity.push({
      type: "CertificateRevoked",
      timestamp: "",
      blockNumber: Number(log.blockNumber),
      data: { certHash: args.certHash, agent: args.agent },
    });
  }

  // Process CertificateChallenged
  for (const log of challengedLogs) {
    const args = log.args;
    if (!args.certHash || !args.challenger) continue;
    certHashes.add(args.certHash);
    activity.push({
      type: "CertificateChallenged",
      timestamp: "",
      blockNumber: Number(log.blockNumber),
      data: { certHash: args.certHash, challenger: args.challenger },
    });
  }

  // Process TransactionExecuted
  for (const log of executedLogs) {
    const args = log.args;
    if (!args.agent || !args.to) continue;
    agents.add(args.agent);
    const val = args.value ?? 0n;
    volumeUsdc += val;
    txCountByAgent.set(args.agent, (txCountByAgent.get(args.agent) || 0) + 1);
    activity.push({
      type: "TransactionExecuted",
      timestamp: "",
      blockNumber: Number(log.blockNumber),
      data: {
        agent: args.agent,
        to: args.to,
        value: formatUnits(val, 6),
        ledgerCosigned: String(args.ledgerCosigned ?? false),
      },
    });
  }

  // Process TransactionBlocked
  for (const log of blockedLogs) {
    const args = log.args;
    if (!args.agent) continue;
    agents.add(args.agent);
    blockedCountByAgent.set(args.agent, (blockedCountByAgent.get(args.agent) || 0) + 1);
    activity.push({
      type: "TransactionBlocked",
      timestamp: "",
      blockNumber: Number(log.blockNumber),
      data: {
        agent: args.agent,
        value: formatUnits(args.value ?? 0n, 6),
        reason: args.reason ?? "",
      },
    });
  }

  // Process Staked
  for (const log of stakedLogs) {
    const args = log.args;
    if (!args.auditor || !args.certHash) continue;
    auditors.add(args.auditor);
    certHashes.add(args.certHash);
    activity.push({
      type: "Staked",
      timestamp: "",
      blockNumber: Number(log.blockNumber),
      data: {
        auditor: args.auditor,
        certHash: args.certHash,
        amount: formatUnits(args.amount ?? 0n, 6),
      },
    });
  }

  // Sort activity by block number descending (most recent first)
  activity.sort((a, b) => (b.blockNumber || 0) - (a.blockNumber || 0));

  return { agents, operators, auditors, certHashes, activity, txCountByAgent, blockedCountByAgent, volumeUsdc };
}
