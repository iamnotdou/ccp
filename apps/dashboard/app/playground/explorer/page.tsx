import { getProtocolState } from "@/lib/indexer/protocol-state";
import { ProtocolStatsBar } from "@/components/playground/ProtocolStatsBar";
import { NetworkGraph } from "@/components/playground/NetworkGraph";
import { ActivityFeed } from "@/components/playground/ActivityFeed";
import { EmptyProtocol } from "@/components/playground/EmptyProtocol";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ExplorerPage() {
  const state = await getProtocolState();

  const isEmpty = state.certificates.length === 0 && state.agents.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <img src="/bound-seal.png" alt="Bound" width={48} height={48} />
        <div>
          <h1 className="text-3xl font-bold">Protocol Explorer</h1>
          <p className="text-fd-muted-foreground mt-1">
            All agents, certificates, and auditors verified with Bound
          </p>
        </div>
      </div>

      {isEmpty ? (
        <EmptyProtocol />
      ) : (
        <>
          <ProtocolStatsBar stats={state.stats} />

          <NetworkGraph state={state} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick entity lists */}
            <div className="rounded-lg border border-fd-border bg-fd-card">
              <div className="px-4 py-3 border-b border-fd-border flex items-center justify-between">
                <span className="text-sm font-medium">Agents ({state.agents.length})</span>
                <Link href="/playground/agents" className="text-xs text-fd-primary hover:underline">View all</Link>
              </div>
              <div className="divide-y divide-fd-border/50">
                {state.agents.slice(0, 5).map((agent) => (
                  <Link
                    key={agent.address}
                    href={`/playground/agents/${agent.address}`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-fd-muted/30 transition-colors"
                  >
                    <span className="font-mono text-sm">{agent.address.slice(0, 6)}...{agent.address.slice(-4)}</span>
                    <span className="text-xs text-fd-muted-foreground">
                      {agent.txCount} tx{agent.blockedCount > 0 ? ` / ${agent.blockedCount} blocked` : ""}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-fd-border bg-fd-card">
              <div className="px-4 py-3 border-b border-fd-border flex items-center justify-between">
                <span className="text-sm font-medium">Certificates ({state.certificates.length})</span>
                <Link href="/playground/certificates" className="text-xs text-fd-primary hover:underline">View all</Link>
              </div>
              <div className="divide-y divide-fd-border/50">
                {state.certificates.slice(0, 5).map((cert) => (
                  <Link
                    key={cert.certHash}
                    href={`/playground/certificates/${cert.certHash}`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-fd-muted/30 transition-colors"
                  >
                    <span className="font-mono text-sm">{cert.certHash.slice(0, 10)}...</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${cert.isValid ? "bg-green-500/20 text-green-400" : "bg-zinc-500/20 text-zinc-400"}`}>
                        {cert.isValid ? "VALID" : "INVALID"}
                      </span>
                      <span className="text-xs text-fd-muted-foreground">
                        ${Number(cert.containmentBound).toLocaleString()}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-fd-border bg-fd-card">
              <div className="px-4 py-3 border-b border-fd-border flex items-center justify-between">
                <span className="text-sm font-medium">Auditors ({state.auditors.length})</span>
                <Link href="/playground/auditors" className="text-xs text-fd-primary hover:underline">View all</Link>
              </div>
              <div className="divide-y divide-fd-border/50">
                {state.auditors.slice(0, 5).map((auditor) => (
                  <Link
                    key={auditor.address}
                    href={`/playground/auditors`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-fd-muted/30 transition-colors"
                  >
                    <span className="font-mono text-sm">{auditor.address.slice(0, 6)}...{auditor.address.slice(-4)}</span>
                    <span className="text-xs text-fd-muted-foreground">
                      {auditor.totalAttestations} attestations / ${auditor.activeStake} staked
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <ActivityFeed events={state.activity} maxItems={15} showFilters />
        </>
      )}
    </div>
  );
}
