const CLASS_MAP: Record<number, { label: string; color: string; desc: string }> = {
  1: { label: "C1", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", desc: "Most Stringent" },
  2: { label: "C2", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", desc: "Moderate" },
  3: { label: "C3", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", desc: "Standard" },
};

interface ClassBadgeProps {
  certClass: number;
  showDesc?: boolean;
}

export function ClassBadge({ certClass, showDesc = false }: ClassBadgeProps) {
  const { label, color, desc } = CLASS_MAP[certClass] || {
    label: "?",
    color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    desc: "Unknown",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${color}`}>
      {label}
      {showDesc && <span className="font-normal opacity-75">{desc}</span>}
    </span>
  );
}
