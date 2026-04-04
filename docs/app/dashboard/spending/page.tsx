import { StatCard } from "@/components/dashboard/StatCard";
import { GaugeBar } from "@/components/dashboard/GaugeBar";
import { AddressDisplay } from "@/components/dashboard/AddressDisplay";
import { SponsorTag } from "@/components/dashboard/SponsorTag";
import {
  getSpentInPeriod,
  getRemainingAllowance,
  getSpendingConfig,
} from "@/lib/contracts/reads";
import { addresses } from "@/lib/contracts/config";

export const dynamic = "force-dynamic";

export default async function SpendingPage() {
  let spending = { spent: "0", limit: "0", periodEnd: 0, spentRaw: "0", limitRaw: "0" };
  let remaining = "0";
  let config = {
    maxSingleAction: "0",
    maxPeriodicLoss: "0",
    cosignThreshold: "0",
    ledgerCosigner: "0x" as `0x${string}`,
    periodDuration: 0,
  };
  let error: string | null = null;

  try {
    [spending, remaining, config] = await Promise.all([
      getSpentInPeriod(),
      getRemainingAllowance(),
      getSpendingConfig(),
    ]);
  } catch (e: any) {
    error = e.message?.slice(0, 100) || "Failed to load spending data";
  }

  const periodEndDate = spending.periodEnd
    ? new Date(spending.periodEnd * 1000).toLocaleString()
    : "N/A";
  const periodHours = Math.floor(config.periodDuration / 3600);
  const hasLedger = config.ledgerCosigner !== "0x0000000000000000000000000000000000000000";

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Spending Monitor</h1>
          <p className="text-fd-muted-foreground text-sm mt-1">
            Real-time spending limits and transaction enforcement
          </p>
        </div>
        <div className="flex gap-2">
          <SponsorTag sponsor="ledger" />
          <SponsorTag sponsor="circle" />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 mb-6 text-sm text-yellow-400">
          {error}
        </div>
      )}

      {/* Main Gauge */}
      <div className="rounded-lg border border-fd-border bg-fd-card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Period Spending</h2>
        <GaugeBar spent={spending.spent} limit={spending.limit} label="Current Period Usage" />
        <div className="flex items-center justify-between mt-4 text-sm text-fd-muted-foreground">
          <span>Period duration: {periodHours}h</span>
          <span>Period ends: {periodEndDate}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Remaining Allowance"
          value={`$${parseFloat(remaining).toLocaleString()}`}
          sub="Available this period"
          variant="success"
        />
        <StatCard
          label="Max Single Action"
          value={`$${parseFloat(config.maxSingleAction).toLocaleString()}`}
          sub="Per-transaction cap"
        />
        <StatCard
          label="Cosign Threshold"
          value={`$${parseFloat(config.cosignThreshold).toLocaleString()}`}
          sub="Ledger required above this"
          variant={hasLedger ? "success" : "danger"}
        />
      </div>

      {/* Spending Limits Detail */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border border-fd-border bg-fd-card p-6">
          <h2 className="text-lg font-semibold mb-4">Enforcement Rules</h2>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-fd-muted/20 border border-fd-border">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium">Below ${parseFloat(config.cosignThreshold).toLocaleString()}</span>
              </div>
              <p className="text-xs text-fd-muted-foreground ml-4">
                Agent can execute independently (single signature)
              </p>
            </div>
            <div className="p-3 rounded-lg bg-fd-muted/20 border border-fd-border">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-sm font-medium">
                  ${parseFloat(config.cosignThreshold).toLocaleString()} - ${parseFloat(config.maxSingleAction).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-fd-muted-foreground ml-4">
                Requires Ledger HSM co-signature (agent-independent)
              </p>
            </div>
            <div className="p-3 rounded-lg bg-fd-muted/20 border border-fd-border">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm font-medium">Above ${parseFloat(config.maxPeriodicLoss).toLocaleString()} / period</span>
              </div>
              <p className="text-xs text-fd-muted-foreground ml-4">
                Blocked by smart contract — no override possible
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-fd-border bg-fd-card p-6">
          <h2 className="text-lg font-semibold mb-4">Contract Details</h2>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-fd-muted-foreground mb-1">SpendingLimit Contract</div>
              <AddressDisplay address={addresses.spendingLimit} />
            </div>
            <div>
              <div className="text-xs text-fd-muted-foreground mb-1">Ledger Cosigner</div>
              {hasLedger ? (
                <AddressDisplay address={config.ledgerCosigner} />
              ) : (
                <span className="text-xs text-red-400">Not configured</span>
              )}
            </div>
            <div>
              <div className="text-xs text-fd-muted-foreground mb-1">Spend Asset (USDC)</div>
              <AddressDisplay address={addresses.usdc} />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-fd-border">
              <span className="text-sm text-fd-muted-foreground">Period Duration</span>
              <span className="text-sm font-mono">{periodHours} hours</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
