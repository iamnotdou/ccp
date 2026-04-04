type Sponsor = "ledger" | "circle" | "ens";

const sponsorConfig: Record<Sponsor, { label: string; color: string; icon: string }> = {
  ledger: {
    label: "Ledger",
    color: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    icon: "shield",
  },
  circle: {
    label: "Circle / Arc",
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    icon: "coin",
  },
  ens: {
    label: "ENS",
    color: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    icon: "at",
  },
};

interface SponsorTagProps {
  sponsor: Sponsor;
}

export function SponsorTag({ sponsor }: SponsorTagProps) {
  const { label, color } = sponsorConfig[sponsor];
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${color}`}>
      {label}
    </span>
  );
}
