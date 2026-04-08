import { StatCard } from "@/components/dashboard/StatCard";
import { AddressDisplay } from "@/components/dashboard/AddressDisplay";
import { UsdcAmount } from "@/components/dashboard/UsdcAmount";
import { SponsorTag } from "@/components/dashboard/SponsorTag";
import { getAuditorRecord, getTotalStaked } from "@/lib/contracts/reads";
import { addresses } from "@/lib/contracts/config";
import { privateKeyToAccount } from "viem/accounts";
import { keys } from "@/lib/contracts/config";

export const dynamic = "force-dynamic";

export default async function AuditorsPage() {
  let record = { totalAttestations: 0, successfulChallenges: 0, activeStake: "0" };
  let totalStaked = "0";
  let auditorAddress = "";
  let error: string | null = null;

  try {
    const account = privateKeyToAccount(keys.auditor);
    auditorAddress = account.address;
    [record, totalStaked] = await Promise.all([
      getAuditorRecord(account.address),
      getTotalStaked(account.address),
    ]);
  } catch (e: any) {
    error = e.message?.slice(0, 100) || "Failed to load auditor data";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Auditor Panel</h1>
          <p className="text-fd-muted-foreground text-sm mt-1">
            Auditor stakes, attestations, and track record
          </p>
        </div>
        <div className="flex gap-2">
          <SponsorTag sponsor="ledger" />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 mb-6 text-sm text-yellow-400">
          {error}
        </div>
      )}

      {/* Auditor Identity */}
      <div className="rounded-lg border border-fd-border bg-fd-card p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-fd-primary/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-fd-primary"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
          <div>
            <div className="font-semibold">Demo Auditor</div>
            {auditorAddress && <AddressDisplay address={auditorAddress} />}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Total Attestations"
          value={record.totalAttestations.toString()}
          sub="Certificates attested"
          variant="success"
        />
        <StatCard
          label="Challenges Against"
          value={record.successfulChallenges.toString()}
          sub="Successful challenges"
          variant={record.successfulChallenges > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Active Stake"
          value={`$${parseFloat(record.activeStake).toLocaleString()}`}
          sub="USDC currently staked"
        />
      </div>

      {/* Staking Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border border-fd-border bg-fd-card p-6">
          <h2 className="text-lg font-semibold mb-4">Staking Overview</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-fd-muted-foreground">Total Staked</span>
              <UsdcAmount amount={totalStaked} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-fd-muted-foreground">Active Stake</span>
              <UsdcAmount amount={record.activeStake} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-fd-muted-foreground">Staking Contract</span>
              <AddressDisplay address={addresses.auditorStaking} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-fd-border bg-fd-card p-6">
          <h2 className="text-lg font-semibold mb-4">How Auditor Staking Works</h2>
          <div className="space-y-3 text-sm text-fd-muted-foreground">
            <p>
              Auditors stake USDC per certificate attestation as skin-in-the-game.
              If a challenge is upheld, the auditor&apos;s stake is slashed:
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>To challenger:</span>
                <span className="font-mono">30%</span>
              </div>
              <div className="flex justify-between">
                <span>To verifiers:</span>
                <span className="font-mono">50%</span>
              </div>
              <div className="flex justify-between">
                <span>Burned:</span>
                <span className="font-mono">20%</span>
              </div>
            </div>
            <div className="pt-2 border-t border-fd-border text-xs">
              <div className="flex justify-between">
                <span>C2 min stake:</span>
                <span className="font-mono">3% of bound</span>
              </div>
              <div className="flex justify-between">
                <span>C3 min stake:</span>
                <span className="font-mono">5% of bound</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
