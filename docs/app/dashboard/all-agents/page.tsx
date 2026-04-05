import { getProtocolState } from "@/lib/indexer/protocol-state";
import { EmptyProtocol } from "@/components/playground/EmptyProtocol";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: "ACTIVE", color: "bg-green-500/20 text-green-400" },
  1: { label: "REVOKED", color: "bg-red-500/20 text-red-400" },
  2: { label: "EXPIRED", color: "bg-zinc-500/20 text-zinc-400" },
  3: { label: "CHALLENGED", color: "bg-yellow-500/20 text-yellow-400" },
};

export default async function AgentsPage() {
  const state = await getProtocolState();

  if (state.agents.length === 0) return <EmptyProtocol />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <img src="/bound-seal.png" alt="Bound" width={40} height={40} />
        <div>
          <h1 className="text-3xl font-bold">All Agents</h1>
          <p className="text-fd-muted-foreground mt-1">
            {state.agents.length} agent{state.agents.length !== 1 ? "s" : ""} verified with Bound
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {state.agents.map((agent) => {
          const statusInfo = agent.status !== null ? STATUS_LABELS[agent.status] : null;
          return (
            <Link
              key={agent.address}
              href={`/dashboard/all-agents/${agent.address}`}
              className="rounded-lg border border-fd-border bg-fd-card p-5 hover:border-fd-primary/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-sm font-medium">
                  {agent.address.slice(0, 6)}...{agent.address.slice(-4)}
                </span>
                {statusInfo && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                )}
              </div>

              {agent.containmentBound && (
                <div className="text-lg font-bold mb-1">
                  ${Number(agent.containmentBound).toLocaleString()} <span className="text-xs font-normal text-fd-muted-foreground">bound</span>
                </div>
              )}

              {agent.certificateClass && (
                <div className="text-xs text-fd-muted-foreground mb-3">
                  Class C{agent.certificateClass}
                </div>
              )}

              <div className="flex gap-4 text-xs text-fd-muted-foreground pt-3 border-t border-fd-border/50">
                <span>{agent.txCount} transactions</span>
                {agent.blockedCount > 0 && (
                  <span className="text-red-400">{agent.blockedCount} blocked</span>
                )}
              </div>

              {agent.operator && (
                <div className="text-xs text-fd-muted-foreground mt-2">
                  Operator: {agent.operator.slice(0, 6)}...{agent.operator.slice(-4)}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
