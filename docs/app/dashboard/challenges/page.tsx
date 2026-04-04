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
        <div className="rounded-lg border border-fd-border bg-fd-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-fd-border bg-fd-muted/30">
                <th className="text-left text-xs font-medium text-fd-muted-foreground p-3">ID</th>
                <th className="text-left text-xs font-medium text-fd-muted-foreground p-3">Type</th>
                <th className="text-left text-xs font-medium text-fd-muted-foreground p-3">Challenger</th>
                <th className="text-left text-xs font-medium text-fd-muted-foreground p-3">Bond</th>
                <th className="text-left text-xs font-medium text-fd-muted-foreground p-3">Status</th>
                <th className="text-left text-xs font-medium text-fd-muted-foreground p-3">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {challenges.map((c, i) => (
                <tr key={i} className="border-b border-fd-border last:border-0">
                  <td className="p-3 font-mono text-sm">#{challengeIds[i]}</td>
                  <td className="p-3 text-sm">{CHALLENGE_TYPES[c.challengeType] || "Unknown"}</td>
                  <td className="p-3"><AddressDisplay address={c.challenger} /></td>
                  <td className="p-3"><UsdcAmount amount={c.bond} size="sm" /></td>
                  <td className="p-3"><StatusBadge status={c.status} type="challenge" /></td>
                  <td className="p-3 text-sm text-fd-muted-foreground">
                    {c.submittedAt ? new Date(c.submittedAt * 1000).toLocaleDateString() : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Challenge Types Info */}
      <div className="rounded-lg border border-fd-border bg-fd-card p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">Challenge Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CHALLENGE_TYPES.map((type, i) => (
            <div key={i} className="flex items-center gap-2 text-sm p-2 rounded bg-fd-muted/20">
              <span className="w-5 h-5 rounded-full bg-fd-muted flex items-center justify-center text-xs font-mono">
                {i}
              </span>
              {type}
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-fd-muted-foreground">
          Minimum challenge bond: 200 USDC. Auto-resolvable: Reserve Shortfall, Constraint Bypass, False Independence.
        </div>
      </div>
    </div>
  );
}
