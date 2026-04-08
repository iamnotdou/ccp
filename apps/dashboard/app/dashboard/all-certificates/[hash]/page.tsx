import { getProtocolState } from "@/lib/indexer/protocol-state";
import { getStake } from "@/lib/contracts/reads";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ClassBadge } from "@/components/dashboard/ClassBadge";
import { AddressDisplay } from "@/components/dashboard/AddressDisplay";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CertificateDetailPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const state = await getProtocolState();

  const cert = state.certificates.find(
    (c) => c.certHash.toLowerCase() === hash.toLowerCase()
  );
  if (!cert) notFound();

  // Fetch auditor stakes
  const auditorStakes = await Promise.all(
    cert.auditors.map(async (addr) => {
      const stake = await getStake(addr, cert.certHash).catch(() => "0");
      const auditorEntity = state.auditors.find(
        (a) => a.address.toLowerCase() === addr.toLowerCase()
      );
      return { address: addr, stake, record: auditorEntity };
    })
  );

  // Find challenges
  const challenges = state.activity.filter(
    (e) =>
      e.type === "CertificateChallenged" &&
      e.data.certHash?.toLowerCase() === hash.toLowerCase()
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/all-certificates" className="text-xs text-fd-muted-foreground hover:text-fd-foreground mb-2 inline-block">
          &larr; All Certificates
        </Link>
        <div className="flex items-center gap-3 mb-2">
          {cert.isValid && (
            <img src="/bound-seal.png" alt="Verified with Bound" width={40} height={40} title="Verified with Bound" />
          )}
          <h1 className="text-3xl font-bold">Certificate</h1>
          <ClassBadge certClass={cert.certificateClass} showDesc />
          <StatusBadge status={cert.status} />
          {cert.isValid && (
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
              VERIFIED WITH BOUND
            </span>
          )}
        </div>
        <div className="font-mono text-sm text-fd-muted-foreground break-all">{cert.certHash}</div>
      </div>

      {/* Core details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-fd-border bg-fd-card p-5 space-y-4">
          <h3 className="text-sm font-bold">Containment Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-fd-muted-foreground">Containment Bound</div>
              <div className="text-xl font-bold">${Number(cert.containmentBound).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-fd-muted-foreground">Certificate Class</div>
              <div className="mt-1"><ClassBadge certClass={cert.certificateClass} showDesc /></div>
            </div>
            <div>
              <div className="text-xs text-fd-muted-foreground">Issued</div>
              <div className="text-sm">{new Date(cert.issuedAt * 1000).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-fd-muted-foreground">Expires</div>
              <div className="text-sm">{new Date(cert.expiresAt * 1000).toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-fd-border bg-fd-card p-5 space-y-4">
          <h3 className="text-sm font-bold">Participants</h3>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-fd-muted-foreground mb-1">Agent</div>
              <Link href={`/dashboard/all-agents/${cert.agent}`} className="hover:underline">
                <AddressDisplay address={cert.agent} />
              </Link>
            </div>
            <div>
              <div className="text-xs text-fd-muted-foreground mb-1">Operator</div>
              <AddressDisplay address={cert.operator} />
            </div>
          </div>
        </div>
      </div>

      {/* Auditor attestations */}
      <div>
        <h2 className="text-lg font-bold mb-3">
          Auditor Attestations ({auditorStakes.length})
        </h2>
        {auditorStakes.length === 0 ? (
          <div className="rounded-lg border border-fd-border bg-fd-card p-6 text-center text-sm text-fd-muted-foreground">
            No auditor attestations.
          </div>
        ) : (
          <div className="space-y-2">
            {auditorStakes.map(({ address, stake, record }) => (
              <div
                key={address}
                className="rounded-lg border border-fd-border bg-fd-card p-4 flex items-center justify-between"
              >
                <div>
                  <AddressDisplay address={address} />
                  {record && (
                    <div className="text-xs text-fd-muted-foreground mt-1">
                      {record.totalAttestations} total attestations
                      {record.successfulChallenges > 0 && (
                        <span className="text-yellow-400"> / {record.successfulChallenges} challenged</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">${Number(stake).toLocaleString()}</div>
                  <div className="text-xs text-fd-muted-foreground">staked</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Challenges */}
      {challenges.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-3">Challenges ({challenges.length})</h2>
          <div className="space-y-2">
            {challenges.map((ch, i) => (
              <div key={i} className="rounded-lg border border-yellow-500/30 bg-fd-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Challenger: <span className="font-mono">{ch.data.challenger?.slice(0, 8)}...</span></span>
                  {ch.blockNumber && <span className="text-xs text-fd-muted-foreground font-mono">Block #{ch.blockNumber}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
