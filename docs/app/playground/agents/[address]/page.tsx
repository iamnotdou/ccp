import { getProtocolState } from "@/lib/indexer/protocol-state";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ClassBadge } from "@/components/dashboard/ClassBadge";
import { AddressDisplay } from "@/components/dashboard/AddressDisplay";
import { ActivityFeed } from "@/components/playground/ActivityFeed";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Address } from "viem";

export const dynamic = "force-dynamic";

export default async function AgentDetailPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const state = await getProtocolState();

  const agent = state.agents.find(
    (a) => a.address.toLowerCase() === address.toLowerCase()
  );
  if (!agent) notFound();

  const certs = state.certificates.filter(
    (c) => c.agent.toLowerCase() === address.toLowerCase()
  );

  const agentActivity = state.activity.filter(
    (e) => Object.values(e.data).some((v) => v.toLowerCase() === address.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/playground/agents" className="text-xs text-fd-muted-foreground hover:text-fd-foreground mb-2 inline-block">
          &larr; All Agents
        </Link>
        <h1 className="text-3xl font-bold">Agent Detail</h1>
        <div className="mt-2">
          <AddressDisplay address={agent.address} full />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border border-fd-border bg-fd-card p-4">
          <div className="text-xs text-fd-muted-foreground">Transactions</div>
          <div className="text-2xl font-bold mt-1">{agent.txCount}</div>
        </div>
        <div className="rounded-lg border border-fd-border bg-fd-card p-4">
          <div className="text-xs text-fd-muted-foreground">Blocked</div>
          <div className="text-2xl font-bold mt-1 text-red-400">{agent.blockedCount}</div>
        </div>
        <div className="rounded-lg border border-fd-border bg-fd-card p-4">
          <div className="text-xs text-fd-muted-foreground">Containment Bound</div>
          <div className="text-2xl font-bold mt-1">
            {agent.containmentBound ? `$${Number(agent.containmentBound).toLocaleString()}` : "—"}
          </div>
        </div>
        <div className="rounded-lg border border-fd-border bg-fd-card p-4">
          <div className="text-xs text-fd-muted-foreground">Certificate Class</div>
          <div className="mt-2">
            {agent.certificateClass ? <ClassBadge certClass={agent.certificateClass} showDesc /> : <span className="text-fd-muted-foreground">None</span>}
          </div>
        </div>
      </div>

      {/* Operator */}
      {agent.operator && (
        <div className="rounded-lg border border-fd-border bg-fd-card p-4">
          <div className="text-xs text-fd-muted-foreground mb-1">Operator</div>
          <AddressDisplay address={agent.operator} />
        </div>
      )}

      {/* Certificates */}
      <div>
        <h2 className="text-lg font-bold mb-3">Certificates ({certs.length})</h2>
        {certs.length === 0 ? (
          <div className="rounded-lg border border-fd-border bg-fd-card p-6 text-center text-sm text-fd-muted-foreground">
            No certificates found for this agent.
          </div>
        ) : (
          <div className="space-y-3">
            {certs.map((cert) => (
              <Link
                key={cert.certHash}
                href={`/playground/certificates/${cert.certHash}`}
                className="block rounded-lg border border-fd-border bg-fd-card p-4 hover:border-fd-primary/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm">{cert.certHash.slice(0, 18)}...</span>
                  <div className="flex items-center gap-2">
                    <ClassBadge certClass={cert.certificateClass} />
                    <StatusBadge status={cert.status} />
                  </div>
                </div>
                <div className="flex gap-6 text-xs text-fd-muted-foreground">
                  <span>Bound: ${Number(cert.containmentBound).toLocaleString()}</span>
                  <span>{cert.auditors.length} auditor{cert.auditors.length !== 1 ? "s" : ""}</span>
                  <span>{cert.challengeCount} challenge{cert.challengeCount !== 1 ? "s" : ""}</span>
                  <span>Issued: {new Date(cert.issuedAt * 1000).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Activity */}
      {agentActivity.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-3">Activity</h2>
          <ActivityFeed events={agentActivity} maxItems={20} showFilters />
        </div>
      )}
    </div>
  );
}
