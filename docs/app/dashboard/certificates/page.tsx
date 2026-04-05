import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ClassBadge } from "@/components/dashboard/ClassBadge";
import { AddressDisplay } from "@/components/dashboard/AddressDisplay";
import { UsdcAmount } from "@/components/dashboard/UsdcAmount";
import { SponsorTag } from "@/components/dashboard/SponsorTag";
import { RiskReductionBar } from "@/components/dashboard/RiskReductionBar";
import {
  getActiveCertificate,
  getCertificate,
  isValid,
  getCertificateAuditors,
  getReserveBalance,
  getStake,
} from "@/lib/contracts/reads";
import { addresses } from "@/lib/contracts/config";

export const dynamic = "force-dynamic";

export default async function CertificatesPage() {
  let cert: Awaited<ReturnType<typeof getCertificate>> | null = null;
  let certHash: `0x${string}` | null = null;
  let valid = false;
  let auditors: `0x${string}`[] = [];
  let auditorStakes: string[] = [];
  let reserveBalance = "0";
  let error: string | null = null;

  const agentAddress = process.env.AGENT_ADDRESS as `0x${string}` | undefined;

  if (agentAddress) {
    try {
      certHash = await getActiveCertificate(agentAddress);
      const zeroCert = "0x0000000000000000000000000000000000000000000000000000000000000000";
      if (certHash && certHash !== zeroCert) {
        [cert, valid, auditors, reserveBalance] = await Promise.all([
          getCertificate(certHash),
          isValid(certHash),
          getCertificateAuditors(certHash),
          getReserveBalance(),
        ]);
        // Fetch stake for each auditor
        auditorStakes = await Promise.all(
          auditors.map((addr) => getStake(addr, certHash!))
        );
      }
    } catch (e: any) {
      error = e.message?.slice(0, 100) || "Failed to load certificate";
    }
  }

  // Computed values
  const containmentBoundNum = cert ? parseFloat(cert.containmentBound) : 0;
  const reserveNum = parseFloat(reserveBalance);
  const reserveRatio = containmentBoundNum > 0 ? (reserveNum / containmentBoundNum) : 0;

  const now = Date.now();
  const expiresMs = cert ? cert.expiresAt * 1000 : 0;
  const daysLeft = cert ? Math.max(0, Math.ceil((expiresMs - now) / 86_400_000)) : 0;
  const expiryColor = daysLeft > 30 ? "text-green-400" : daysLeft > 7 ? "text-yellow-400" : "text-red-400";

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Certificates</h1>
          <p className="text-fd-muted-foreground text-sm mt-1">
            View and manage containment certificates
          </p>
        </div>
        <div className="flex gap-2">
          <SponsorTag sponsor="ledger" />
          <SponsorTag sponsor="ens" />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 mb-6 text-sm text-yellow-400">
          {error}
        </div>
      )}

      {!agentAddress && (
        <div className="rounded-lg border border-fd-border bg-fd-card p-8 text-center">
          <p className="text-fd-muted-foreground">
            Set <code className="bg-fd-muted px-1.5 py-0.5 rounded text-xs">AGENT_ADDRESS</code> in
            your environment to view certificates.
          </p>
        </div>
      )}

      {agentAddress && !cert && !error && (
        <div className="rounded-lg border border-fd-border bg-fd-card p-8 text-center">
          <p className="text-fd-muted-foreground">No active certificate found for this agent.</p>
        </div>
      )}

      {cert && certHash && (
        <div className="space-y-6">
          {/* Certificate Header */}
          <div className="rounded-lg border border-fd-border bg-fd-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <ClassBadge certClass={cert.certificateClass} showDesc />
              <StatusBadge status={cert.status} />
              {valid && (
                <span className="text-xs text-green-400 border border-green-500/30 rounded px-2 py-0.5">
                  VALID
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-fd-muted-foreground mb-1">Certificate Hash</div>
                <div className="font-mono text-xs break-all">{certHash}</div>
              </div>
              <div>
                <div className="text-xs text-fd-muted-foreground mb-1">IPFS URI</div>
                <div className="font-mono text-xs break-all">{cert.ipfsUri || "N/A"}</div>
              </div>
            </div>
          </div>

          {/* Risk Reduction Contribution */}
          <div className="rounded-lg border border-fd-border bg-fd-card p-6">
            <h2 className="text-lg font-semibold mb-4">Protection Breakdown</h2>
            <RiskReductionBar />
          </div>

          {/* Containment Details + Participants */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-lg border border-fd-border bg-fd-card p-6">
              <h2 className="text-lg font-semibold mb-4">Containment</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-fd-muted-foreground">Containment Bound</span>
                  <UsdcAmount amount={cert.containmentBound} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-fd-muted-foreground">Certificate Class</span>
                  <ClassBadge certClass={cert.certificateClass} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-fd-muted-foreground">Reserve Balance</span>
                  <UsdcAmount amount={reserveBalance} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-fd-muted-foreground">Reserve Ratio</span>
                  <span className={`text-sm font-mono font-medium ${reserveRatio >= 3 ? "text-green-400" : reserveRatio >= 1 ? "text-yellow-400" : "text-red-400"}`}>
                    {reserveRatio.toFixed(1)}x
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-fd-muted-foreground">Issued</span>
                  <span className="text-sm font-mono">
                    {new Date(cert.issuedAt * 1000).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-fd-muted-foreground">Expires</span>
                  <div className="text-right">
                    <span className="text-sm font-mono">
                      {new Date(cert.expiresAt * 1000).toLocaleDateString()}
                    </span>
                    <span className={`text-xs ml-2 ${expiryColor}`}>
                      {daysLeft === 0 ? "Expired" : `${daysLeft}d left`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-fd-border bg-fd-card p-6">
              <h2 className="text-lg font-semibold mb-4">Participants</h2>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-fd-muted-foreground mb-1">Operator</div>
                  <AddressDisplay address={cert.operator} />
                </div>
                <div>
                  <div className="text-xs text-fd-muted-foreground mb-1">Agent</div>
                  <AddressDisplay address={cert.agent} />
                </div>
                <div>
                  <div className="text-xs text-fd-muted-foreground mb-1">Reserve Vault</div>
                  <AddressDisplay address={cert.reserveVault} />
                </div>
                <div>
                  <div className="text-xs text-fd-muted-foreground mb-1">Spending Limit</div>
                  <AddressDisplay address={cert.spendingLimit} />
                </div>
              </div>
            </div>
          </div>

          {/* Auditors */}
          <div className="rounded-lg border border-fd-border bg-fd-card p-6">
            <h2 className="text-lg font-semibold mb-4">
              Auditor Attestations ({auditors.length})
            </h2>
            {auditors.length > 0 ? (
              <div className="space-y-2">
                {auditors.map((addr, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-fd-muted/20">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <AddressDisplay address={addr} />
                    <SponsorTag sponsor="ledger" />
                    <div className="ml-auto flex items-center gap-3">
                      <span className="text-xs text-fd-muted-foreground">
                        Stake: <UsdcAmount amount={auditorStakes[i] || "0"} size="sm" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-fd-muted-foreground text-sm">No auditors found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
