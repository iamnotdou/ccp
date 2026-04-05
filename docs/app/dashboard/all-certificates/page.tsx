import { getProtocolState } from "@/lib/indexer/protocol-state";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ClassBadge } from "@/components/dashboard/ClassBadge";
import { EmptyProtocol } from "@/components/playground/EmptyProtocol";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CertificatesPage() {
  const state = await getProtocolState();

  if (state.certificates.length === 0) return <EmptyProtocol />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">All Certificates</h1>
        <p className="text-fd-muted-foreground mt-1">
          {state.certificates.length} certificate{state.certificates.length !== 1 ? "s" : ""} — {state.stats.activeCertificates} active
        </p>
      </div>

      <div className="space-y-3">
        {state.certificates.map((cert) => (
          <Link
            key={cert.certHash}
            href={`/dashboard/all-certificates/${cert.certHash}`}
            className="block rounded-lg border border-fd-border bg-fd-card p-5 hover:border-fd-primary/40 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-medium">{cert.certHash.slice(0, 18)}...</span>
                <ClassBadge certClass={cert.certificateClass} showDesc />
              </div>
              <div className="flex items-center gap-2">
                {cert.isValid && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-green-500/20 text-green-400">
                    <img src="/bound-seal.png" alt="" width={12} height={12} />
                    BOUND
                  </span>
                )}
                <StatusBadge status={cert.status} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-xs text-fd-muted-foreground">Containment Bound</div>
                <div className="font-medium">${Number(cert.containmentBound).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-fd-muted-foreground">Agent</div>
                <div className="font-mono text-xs">{cert.agent.slice(0, 6)}...{cert.agent.slice(-4)}</div>
              </div>
              <div>
                <div className="text-xs text-fd-muted-foreground">Auditors</div>
                <div>{cert.auditors.length} auditor{cert.auditors.length !== 1 ? "s" : ""}</div>
              </div>
              <div>
                <div className="text-xs text-fd-muted-foreground">Challenges</div>
                <div className={cert.challengeCount > 0 ? "text-yellow-400" : ""}>
                  {cert.challengeCount}
                </div>
              </div>
            </div>

            <div className="flex gap-6 text-xs text-fd-muted-foreground mt-3 pt-3 border-t border-fd-border/50">
              <span>Issued: {new Date(cert.issuedAt * 1000).toLocaleDateString()}</span>
              <span>Expires: {new Date(cert.expiresAt * 1000).toLocaleDateString()}</span>
              <span>Operator: {cert.operator.slice(0, 6)}...{cert.operator.slice(-4)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
