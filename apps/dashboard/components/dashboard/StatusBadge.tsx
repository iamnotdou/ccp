const STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: "ACTIVE", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  1: { label: "REVOKED", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  2: { label: "EXPIRED", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
  3: { label: "CHALLENGED", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
};

const CHALLENGE_STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: "PENDING", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  1: { label: "UPHELD", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  2: { label: "REJECTED", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  3: { label: "INFORMATIONAL", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

interface StatusBadgeProps {
  status: number;
  type?: "certificate" | "challenge";
}

export function StatusBadge({ status, type = "certificate" }: StatusBadgeProps) {
  const map = type === "challenge" ? CHALLENGE_STATUS_MAP : STATUS_MAP;
  const { label, color } = map[status] || { label: "UNKNOWN", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
