import { StatCard } from "@/components/dashboard/StatCard";
import { GaugeBar } from "@/components/dashboard/GaugeBar";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ClassBadge } from "@/components/dashboard/ClassBadge";
import { AddressDisplay } from "@/components/dashboard/AddressDisplay";
import { SponsorTag } from "@/components/dashboard/SponsorTag";
import { TimelineEvent } from "@/components/dashboard/TimelineEvent";
import {
  getReserveBalance,
  isLocked,
  getSpentInPeriod,
  getRemainingAllowance,
  getSpendingConfig,
} from "@/lib/contracts/reads";
import { getTopicMessages } from "@/lib/hedera/mirror";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  let reserveBalance = "0";
  let locked = false;
  let spending = { spent: "0", limit: "0", periodEnd: 0, spentRaw: "0", limitRaw: "0" };
  let remaining = "0";
  let config = {
    maxSingleAction: "0",
    maxPeriodicLoss: "0",
    cosignThreshold: "0",
    ledgerCosigner: "0x" as `0x${string}`,
    periodDuration: 0,
  };
  let events: Awaited<ReturnType<typeof getTopicMessages>> = [];
  let error: string | null = null;

  try {
    [reserveBalance, locked, spending, remaining, config] = await Promise.all([
      getReserveBalance(),
      isLocked(),
      getSpentInPeriod(),
      getRemainingAllowance(),
      getSpendingConfig(),
    ]);
  } catch (e: any) {
    error = e.message?.slice(0, 100) || "Failed to fetch contract data";
  }

  const topicId = process.env.HCS_TOPIC_ID;
  if (topicId) {
    try {
      events = await getTopicMessages(topicId, 10);
    } catch {}
  }

  const periodEndDate = spending.periodEnd
    ? new Date(spending.periodEnd * 1000).toLocaleString()
    : "N/A";

  const hasLedger = config.ledgerCosigner !== "0x0000000000000000000000000000000000000000";

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">System Overview</h1>
          <p className="text-fd-muted-foreground text-sm mt-1">
            Containment Certificate Protocol — Hedera Testnet
          </p>
        </div>
        <div className="flex gap-2">
          <SponsorTag sponsor="ledger" />
          <SponsorTag sponsor="ens" />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 mb-6 text-sm text-yellow-400">
          Contract read error: {error}. Make sure environment variables are configured.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Reserve Balance"
          value={`$${parseFloat(reserveBalance).toLocaleString()}`}
          sub={locked ? "Locked" : "Unlocked"}
          variant={locked ? "success" : "warning"}
        />
        <StatCard
          label="Remaining Allowance"
          value={`$${parseFloat(remaining).toLocaleString()}`}
          sub="This period"
        />
        <StatCard
          label="Cosign Threshold"
          value={`$${parseFloat(config.cosignThreshold).toLocaleString()}`}
          sub="Ledger required above"
          variant={hasLedger ? "success" : "danger"}
        />
        <StatCard
          label="Max Single Action"
          value={`$${parseFloat(config.maxSingleAction).toLocaleString()}`}
          sub="Per transaction limit"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="rounded-lg border border-fd-border bg-fd-card p-6">
          <h2 className="text-lg font-semibold mb-4">Spending This Period</h2>
          <GaugeBar spent={spending.spent} limit={spending.limit} label="Period Usage" />
          <div className="text-xs text-fd-muted-foreground mt-3">
            Period ends: {periodEndDate}
          </div>
        </div>

        <div className="rounded-lg border border-fd-border bg-fd-card p-6">
          <h2 className="text-lg font-semibold mb-4">Containment Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-fd-muted-foreground">Ledger Cosigner</span>
              {hasLedger ? (
                <AddressDisplay address={config.ledgerCosigner} />
              ) : (
                <span className="text-xs text-red-400">Not configured</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-fd-muted-foreground">Reserve Locked</span>
              <StatusBadge status={locked ? 0 : 1} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-fd-muted-foreground">Period Limit</span>
              <span className="font-mono text-sm">
                ${parseFloat(config.maxPeriodicLoss).toLocaleString()} USDC
              </span>
            </div>
          </div>
        </div>
      </div>

      {events.length > 0 && (
        <div className="rounded-lg border border-fd-border bg-fd-card p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Events (HCS)</h2>
          <div className="max-h-80 overflow-y-auto">
            {events.map((evt, i) => (
              <TimelineEvent
                key={i}
                type={evt.content.type}
                timestamp={evt.timestamp}
                details={{
                  agent: evt.content.agent,
                  value: evt.content.value,
                  class: evt.content.class,
                  reason: evt.content.reason,
                  cosigned: evt.content.ledgerCosigned !== undefined
                    ? String(evt.content.ledgerCosigned)
                    : undefined,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
