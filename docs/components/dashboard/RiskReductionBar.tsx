const segments = [
  { label: "Reserve Backing", pct: 35, color: "bg-green-500" },
  { label: "Spend Caps", pct: 30, color: "bg-blue-500" },
  { label: "Ledger Cosign", pct: 20, color: "bg-purple-500" },
  { label: "Reversibility", pct: 10, color: "bg-amber-500" },
  { label: "Auditor Attestation", pct: 5, color: "bg-cyan-500" },
];

const dotColors: Record<string, string> = {
  "bg-green-500": "bg-green-500",
  "bg-blue-500": "bg-blue-500",
  "bg-purple-500": "bg-purple-500",
  "bg-amber-500": "bg-amber-500",
  "bg-cyan-500": "bg-cyan-500",
};

interface RiskReductionBarProps {
  compact?: boolean;
}

export function RiskReductionBar({ compact }: RiskReductionBarProps) {
  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {!compact && (
        <div className="text-xs text-fd-muted-foreground font-medium uppercase tracking-wide">
          Risk Reduction Contribution
        </div>
      )}

      {/* Stacked bar */}
      <div className={`w-full flex rounded-full overflow-hidden ${compact ? "h-2.5" : "h-4"}`}>
        {segments.map((s) => (
          <div
            key={s.label}
            className={`${s.color} transition-all`}
            style={{ width: `${s.pct}%` }}
            title={`${s.label}: ${s.pct}%`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className={`flex flex-wrap gap-x-4 gap-y-1 ${compact ? "text-[10px]" : "text-xs"}`}>
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${dotColors[s.color]}`} />
            <span className="text-fd-muted-foreground">{s.label}</span>
            <span className="font-mono font-medium">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
