import { getProtocolState } from "@/lib/indexer/protocol-state";
import { AddressDisplay } from "@/components/dashboard/AddressDisplay";
import { EmptyProtocol } from "@/components/playground/EmptyProtocol";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AuditorsPage() {
  const state = await getProtocolState();

  if (state.auditors.length === 0) return <EmptyProtocol />;

  // Sort by active stake descending
  const sorted = [...state.auditors].sort(
    (a, b) => Number(b.activeStake) - Number(a.activeStake)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <img src="/bound-seal.png" alt="Bound" width={40} height={40} />
        <div>
          <h1 className="text-3xl font-bold">Auditor Leaderboard</h1>
          <p className="text-fd-muted-foreground mt-1">
            {state.auditors.length} auditor{state.auditors.length !== 1 ? "s" : ""} ranked by stake
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-fd-border bg-fd-card overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-fd-border text-xs text-fd-muted-foreground font-medium">
          <div className="col-span-1">#</div>
          <div className="col-span-4">Auditor</div>
          <div className="col-span-2 text-right">Active Stake</div>
          <div className="col-span-2 text-right">Attestations</div>
          <div className="col-span-2 text-right">Challenges</div>
          <div className="col-span-1 text-right">Certs</div>
        </div>

        {/* Rows */}
        {sorted.map((auditor, i) => (
          <div
            key={auditor.address}
            className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-fd-border/50 hover:bg-fd-muted/30 transition-colors items-center"
          >
            <div className="col-span-1 text-fd-muted-foreground font-bold">
              {i + 1}
            </div>
            <div className="col-span-4">
              <AddressDisplay address={auditor.address} />
            </div>
            <div className="col-span-2 text-right font-bold">
              ${Number(auditor.activeStake).toLocaleString()}
            </div>
            <div className="col-span-2 text-right">
              {auditor.totalAttestations}
            </div>
            <div className="col-span-2 text-right">
              {auditor.successfulChallenges > 0 ? (
                <span className="text-yellow-400">{auditor.successfulChallenges}</span>
              ) : (
                <span className="text-fd-muted-foreground">0</span>
              )}
            </div>
            <div className="col-span-1 text-right">
              {auditor.certHashes.length > 0 ? (
                <div className="flex flex-wrap gap-1 justify-end">
                  {auditor.certHashes.map((h) => (
                    <Link
                      key={h}
                      href={`/dashboard/all-certificates/${h}`}
                      className="text-xs text-fd-primary hover:underline font-mono"
                    >
                      {h.slice(0, 6)}..
                    </Link>
                  ))}
                </div>
              ) : (
                <span className="text-fd-muted-foreground">0</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Explanation */}
      <div className="rounded-lg border border-fd-border bg-fd-card p-5">
        <h3 className="text-sm font-bold mb-2">How Auditor Staking Works</h3>
        <div className="text-sm text-fd-muted-foreground space-y-1">
          <p>Auditors stake capital against each certificate they attest. If a certificate is successfully challenged:</p>
          <ul className="list-disc list-inside ml-2 space-y-0.5">
            <li>30% of the slash goes to the challenger as a bounty</li>
            <li>50% goes to the verification panel</li>
            <li>20% is burned (permanent removal from supply)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
