interface GaugeBarProps {
  spent: string;
  limit: string;
  label?: string;
}

export function GaugeBar({ spent, limit, label }: GaugeBarProps) {
  const spentNum = parseFloat(spent);
  const limitNum = parseFloat(limit);
  const pct = limitNum > 0 ? Math.min((spentNum / limitNum) * 100, 100) : 0;

  const barColor =
    pct > 90
      ? "bg-red-500"
      : pct > 70
        ? "bg-yellow-500"
        : "bg-green-500";

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="text-fd-muted-foreground">{label}</span>
          <span className="font-mono">
            ${parseFloat(spent).toLocaleString()} / ${parseFloat(limit).toLocaleString()}
          </span>
        </div>
      )}
      <div className="h-3 w-full rounded-full bg-fd-muted/30 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-fd-muted-foreground mt-1 text-right">
        {pct.toFixed(1)}% utilized
      </div>
    </div>
  );
}
