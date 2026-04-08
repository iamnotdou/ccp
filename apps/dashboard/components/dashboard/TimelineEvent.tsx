interface TimelineEventProps {
  type: string;
  timestamp: string;
  details: Record<string, string | boolean | undefined>;
}

const EVENT_COLORS: Record<string, string> = {
  CERTIFICATE_PUBLISHED: "bg-green-500",
  ATTESTATION_SIGNED: "bg-blue-500",
  AGENT_TRANSACTION: "bg-emerald-500",
  TRANSACTION_BLOCKED: "bg-red-500",
  CHALLENGE_SUBMITTED: "bg-yellow-500",
  CHALLENGE_UPHELD: "bg-red-500",
  CHALLENGE_REJECTED: "bg-green-500",
};

const EVENT_LABELS: Record<string, string> = {
  CERTIFICATE_PUBLISHED: "Certificate Published",
  ATTESTATION_SIGNED: "Attestation Signed",
  AGENT_TRANSACTION: "Transaction Executed",
  TRANSACTION_BLOCKED: "Transaction Blocked",
  CHALLENGE_SUBMITTED: "Challenge Submitted",
  CHALLENGE_UPHELD: "Challenge Upheld",
  CHALLENGE_REJECTED: "Challenge Rejected",
};

export function TimelineEvent({ type, timestamp, details }: TimelineEventProps) {
  const color = EVENT_COLORS[type] || "bg-zinc-500";
  const label = EVENT_LABELS[type] || type;
  const time = new Date(parseFloat(timestamp) * 1000);
  const timeStr = time.toLocaleTimeString();

  return (
    <div className="flex gap-3 pb-4">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${color} mt-1.5 shrink-0`} />
        <div className="w-px h-full bg-fd-border" />
      </div>
      <div className="pb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{label}</span>
          <span className="text-xs text-fd-muted-foreground">{timeStr}</span>
        </div>
        <div className="text-xs text-fd-muted-foreground mt-0.5 space-x-3">
          {Object.entries(details).map(
            ([k, v]) =>
              v !== undefined && (
                <span key={k}>
                  <span className="opacity-60">{k}:</span>{" "}
                  <span className="font-mono">
                    {typeof v === "string" && v.startsWith("0x") ? `${v.slice(0, 10)}...` : String(v)}
                  </span>
                </span>
              )
          )}
        </div>
      </div>
    </div>
  );
}
