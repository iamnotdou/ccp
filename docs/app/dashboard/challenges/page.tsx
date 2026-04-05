import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { AddressDisplay } from "@/components/dashboard/AddressDisplay";
import { UsdcAmount } from "@/components/dashboard/UsdcAmount";
import { SponsorTag } from "@/components/dashboard/SponsorTag";
import { getChallengesByCert, getChallenge, getActiveCertificate } from "@/lib/contracts/reads";

export const dynamic = "force-dynamic";

const CHALLENGE_TYPES = [
  "Reserve Shortfall",
  "Constraint Bypass",
  "False Independence",
  "Invalid Verification",
  "Scope Not Performed",
];

const CHALLENGE_DESCRIPTIONS: Record<number, string> = {
  0: "The reserve vault balance has fallen below the required ratio for the certificate class.",
  1: "A spending limit or other smart contract constraint was bypassed or not enforced correctly.",
  2: "A constraint marked as agent-independent can actually be influenced by the agent.",
  3: "The certificate verification function returns incorrect results for the stated parameters.",
  4: "The auditor attested to a scope they did not actually perform or verify.",
};

const AUTO_RESOLVABLE = new Set([0, 1, 2]);

// Challenge statuses: 0=PENDING, 1=UPHELD, 2=REJECTED, 3=INFORMATIONAL
const CHALLENGE_STATUS_NAMES: Record<number, string> = {
  0: "PENDING",
  1: "UPHELD",
  2: "REJECTED",
  3: "INFORMATIONAL",
};

export default async function ChallengesPage() {
  let challenges: Awaited<ReturnType<typeof getChallenge>>[] = [];
  let challengeIds: string[] = [];
  let error: string | null = null;

  const agentAddress = process.env.AGENT_ADDRESS as `0x${string}` | undefined;

  if (agentAddress) {
    try {
      const certHash = await getActiveCertificate(agentAddress);
      const zeroCert = "0x0000000000000000000000000000000000000000000000000000000000000000";
      if (certHash && certHash !== zeroCert) {
        challengeIds = await getChallengesByCert(certHash);
        challenges = await Promise.all(
          challengeIds.map((id) => getChallenge(BigInt(id)))
        );
      }
    } catch (e: any) {
      error = e.message?.slice(0, 100) || "Failed to load challenges";
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Challenges</h1>
          <p className="text-fd-muted-foreground text-sm mt-1">
            Dispute resolution and challenge tracking
          </p>
        </div>
        <SponsorTag sponsor="ledger" />
      </div>

      {error && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 mb-6 text-sm text-yellow-400">
          {error}
        </div>
      )}

      {!agentAddress && (
        <div className="rounded-lg border border-fd-border bg-fd-card p-8 text-center">
          <p className="text-fd-muted-foreground">
            Set <code className="bg-fd-muted px-1.5 py-0.5 rounded text-xs">AGENT_ADDRESS</code> to view challenges.
          </p>
        </div>
      )}

      {agentAddress && challenges.length === 0 && !error && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-8 text-center">
          <div className="text-3xl mb-2">0</div>
          <p className="text-fd-muted-foreground">No challenges filed against this certificate.</p>
        </div>
      )}

      {challenges.length > 0 && (
        <div className="space-y-3">
          {challenges.map((c, i) => (
            <details key={i} className="rounded-lg border border-fd-border bg-fd-card overflow-hidden group">
              <summary className="cursor-pointer p-4 flex items-center gap-4 hover:bg-fd-muted/10 transition-colors">
                <span className="font-mono text-sm text-fd-muted-foreground w-10">#{challengeIds[i]}</span>
                <span className="text-sm font-medium flex-1 flex items-center gap-2">
                  {CHALLENGE_TYPES[c.challengeType] || "Unknown"}
                  {AUTO_RESOLVABLE.has(c.challengeType) && (
                    <span className="text-[10px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/25 rounded px-1.5 py-0.5">
                      Auto
                    </span>
                  )}
                </span>
                <div className="hidden sm:block"><AddressDisplay address={c.challenger} /></div>
                <UsdcAmount amount={c.bond} size="sm" />
                <StatusBadge status={c.status} type="challenge" />
                <svg className="w-4 h-4 text-fd-muted-foreground transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </summary>

              <div className="border-t border-fd-border p-4 bg-fd-muted/5 space-y-3">
                {/* Description */}
                <div className="text-sm text-fd-muted-foreground">
                  {CHALLENGE_DESCRIPTIONS[c.challengeType] || "Unknown challenge type."}
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-fd-muted-foreground mb-0.5">Challenger</div>
                    <AddressDisplay address={c.challenger} />
                  </div>
                  <div>
                    <div className="text-xs text-fd-muted-foreground mb-0.5">Evidence Hash</div>
                    <div className="font-mono text-xs break-all">
                      {c.evidence && c.evidence !== "0x" ? c.evidence : "No evidence submitted"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-fd-muted-foreground mb-0.5">Submitted</div>
                    <span className="font-mono text-xs">
                      {c.submittedAt ? new Date(c.submittedAt * 1000).toLocaleString() : "N/A"}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-fd-muted-foreground mb-0.5">Bond</div>
                    <UsdcAmount amount={c.bond} size="sm" />
                  </div>
                </div>

                {/* Resolution details for non-pending challenges */}
                {c.status > 0 && (
                  <div className={`rounded-lg p-3 text-sm ${
                    c.status === 1
                      ? "bg-red-500/10 border border-red-500/20"
                      : "bg-green-500/10 border border-green-500/20"
                  }`}>
                    <div className="font-medium mb-1">
                      {c.status === 1 ? "Challenge Upheld — Slash Applied" : `Challenge ${CHALLENGE_STATUS_NAMES[c.status] || "Resolved"}`}
                    </div>
                    {c.resolvedAt > 0 && (
                      <div className="text-xs text-fd-muted-foreground">
                        Resolved: {new Date(c.resolvedAt * 1000).toLocaleString()}
                      </div>
                    )}
                    {c.status === 1 && (
                      <div className="text-xs text-fd-muted-foreground mt-1">
                        Slash distribution: 30% to challenger, 50% to verifier pool, 20% burned
                      </div>
                    )}
                    {c.status === 2 && (
                      <div className="text-xs text-fd-muted-foreground mt-1">
                        Challenge bond returned to challenger.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      )}

      {/* Challenge Types Info */}
      <div className="rounded-lg border border-fd-border bg-fd-card p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">Challenge Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CHALLENGE_TYPES.map((type, i) => (
            <div key={i} className="flex items-start gap-2 text-sm p-3 rounded bg-fd-muted/20">
              <span className="w-5 h-5 rounded-full bg-fd-muted flex items-center justify-center text-xs font-mono shrink-0 mt-0.5">
                {i}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{type}</span>
                  {AUTO_RESOLVABLE.has(i) && (
                    <span className="text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/25 rounded px-1.5 py-0.5">
                      Auto
                    </span>
                  )}
                </div>
                <div className="text-xs text-fd-muted-foreground mt-0.5">
                  {CHALLENGE_DESCRIPTIONS[i]}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-fd-muted-foreground">
          Minimum challenge bond: 200 USDC. Auto-resolvable types are verified directly on-chain.
        </div>
      </div>
    </div>
  );
}
