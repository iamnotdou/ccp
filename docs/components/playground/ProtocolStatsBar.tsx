import type { ProtocolState } from "@/lib/indexer/types";

export function ProtocolStatsBar({ stats }: { stats: ProtocolState["stats"] }) {
  const items = [
    { label: "Certificates", value: String(stats.totalCertificates), sub: `${stats.activeCertificates} active` },
    { label: "Agents", value: String(stats.totalAgents) },
    { label: "Auditors", value: String(stats.totalAuditors) },
    { label: "Transactions", value: String(stats.totalTransactions), sub: `${stats.totalBlocked} blocked` },
    { label: "Volume", value: `$${Number(stats.totalVolumeUsdc).toLocaleString()}`, sub: "USDC" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-fd-border bg-fd-card p-4">
          <div className="text-xs text-fd-muted-foreground">{item.label}</div>
          <div className="text-2xl font-bold mt-1">{item.value}</div>
          {item.sub && <div className="text-xs text-fd-muted-foreground mt-0.5">{item.sub}</div>}
        </div>
      ))}
    </div>
  );
}
