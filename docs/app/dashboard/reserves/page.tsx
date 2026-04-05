import { StatCard } from "@/components/dashboard/StatCard";
import { UsdcAmount } from "@/components/dashboard/UsdcAmount";
import { AddressDisplay } from "@/components/dashboard/AddressDisplay";
import { SponsorTag } from "@/components/dashboard/SponsorTag";
import {
  getReserveBalance,
  getStatedAmount,
  isAdequate,
  isLocked,
} from "@/lib/contracts/reads";
import { addresses } from "@/lib/contracts/config";

export const dynamic = "force-dynamic";

export default async function ReservesPage() {
  let balance = "0";
  let stated = "0";
  let adequateC2 = false;
  let adequateC3 = false;
  let locked = false;
  let error: string | null = null;

  try {
    // Use a reasonable containment bound for adequacy checks
    const bound = 50_000_000_000n; // $50k USDC
    [balance, stated, adequateC2, adequateC3, locked] = await Promise.all([
      getReserveBalance(),
      getStatedAmount(),
      isAdequate(bound, 30000), // 3x for C2
      isAdequate(bound, 50000), // 5x for C3
      isLocked(),
    ]);
  } catch (e: any) {
    error = e.message?.slice(0, 100) || "Failed to load reserve data";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Reserve Vault</h1>
          <p className="text-fd-muted-foreground text-sm mt-1">
            USDC reserves backing containment certificates
          </p>
        </div>
        <SponsorTag sponsor="ledger" />
      </div>

      {error && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 mb-6 text-sm text-yellow-400">
          {error}
        </div>
      )}

      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border border-fd-border bg-fd-card p-6 md:col-span-2">
          <div className="text-sm text-fd-muted-foreground mb-2">Actual Reserve Balance</div>
          <UsdcAmount amount={balance} size="lg" />
          <div className="flex items-center gap-2 mt-3">
            <div className={`w-2 h-2 rounded-full ${locked ? "bg-green-500" : "bg-yellow-500"}`} />
            <span className="text-sm text-fd-muted-foreground">
              {locked ? "Vault is locked" : "Vault is unlocked"}
            </span>
          </div>
        </div>
        <StatCard
          label="Stated Amount"
          value={`$${parseFloat(stated).toLocaleString()}`}
          sub="Certificate-claimed reserve"
        />
      </div>

      {/* Adequacy Checks */}
      <div className="rounded-lg border border-fd-border bg-fd-card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Reserve Adequacy</h2>
        <p className="text-sm text-fd-muted-foreground mb-4">
          Based on $50,000 containment bound
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className={`rounded-lg border p-4 ${
              adequateC2
                ? "border-green-500/30 bg-green-500/5"
                : "border-red-500/30 bg-red-500/5"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">C2 Requirement (3x)</span>
              <span
                className={`text-xs font-medium ${adequateC2 ? "text-green-400" : "text-red-400"}`}
              >
                {adequateC2 ? "ADEQUATE" : "INSUFFICIENT"}
              </span>
            </div>
            <div className="text-sm text-fd-muted-foreground">
              Requires $150,000 USDC reserve
            </div>
            <div className="text-sm text-fd-muted-foreground">
              Min auditor stake: 3% of bound
            </div>
          </div>

          <div
            className={`rounded-lg border p-4 ${
              adequateC3
                ? "border-green-500/30 bg-green-500/5"
                : "border-red-500/30 bg-red-500/5"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">C3 Requirement (5x)</span>
              <span
                className={`text-xs font-medium ${adequateC3 ? "text-green-400" : "text-red-400"}`}
              >
                {adequateC3 ? "ADEQUATE" : "INSUFFICIENT"}
              </span>
            </div>
            <div className="text-sm text-fd-muted-foreground">
              Requires $250,000 USDC reserve
            </div>
            <div className="text-sm text-fd-muted-foreground">
              Min auditor stake: 5% of bound
            </div>
          </div>
        </div>
      </div>

      {/* Contract Info */}
      <div className="rounded-lg border border-fd-border bg-fd-card p-6">
        <h2 className="text-lg font-semibold mb-4">Contract Details</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-fd-muted-foreground">Reserve Vault</span>
            <AddressDisplay address={addresses.reserveVault} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-fd-muted-foreground">Reserve Asset (USDC)</span>
            <AddressDisplay address={addresses.usdc} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-fd-muted-foreground">Lock Status</span>
            <span className={`text-sm font-medium ${locked ? "text-green-400" : "text-yellow-400"}`}>
              {locked ? "Locked" : "Unlocked"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
