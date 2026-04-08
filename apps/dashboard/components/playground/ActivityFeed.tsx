"use client";

import { useState } from "react";
import type { ActivityEvent, ActivityEventType } from "@/lib/indexer/types";

const TYPE_STYLES: Record<ActivityEventType, { label: string; color: string }> = {
  CertificatePublished: { label: "PUBLISHED", color: "bg-green-500/20 text-green-400" },
  CertificateRevoked: { label: "REVOKED", color: "bg-red-500/20 text-red-400" },
  CertificateChallenged: { label: "CHALLENGED", color: "bg-yellow-500/20 text-yellow-400" },
  TransactionExecuted: { label: "TX", color: "bg-blue-500/20 text-blue-400" },
  TransactionBlocked: { label: "BLOCKED", color: "bg-red-500/20 text-red-400" },
  Staked: { label: "STAKED", color: "bg-emerald-500/20 text-emerald-400" },
  Slashed: { label: "SLASHED", color: "bg-red-500/20 text-red-400" },
  Released: { label: "RELEASED", color: "bg-zinc-500/20 text-zinc-400" },
  ReserveDeposited: { label: "DEPOSIT", color: "bg-violet-500/20 text-violet-400" },
  ChallengeResolved: { label: "RESOLVED", color: "bg-blue-500/20 text-blue-400" },
};

function EventRow({ event }: { event: ActivityEvent }) {
  const style = TYPE_STYLES[event.type] || { label: event.type, color: "bg-zinc-500/20 text-zinc-400" };

  const detail = (() => {
    switch (event.type) {
      case "CertificatePublished":
        return `Agent ${event.data.agent?.slice(0, 8)}... — $${Number(event.data.bound || 0).toLocaleString()} bound`;
      case "TransactionExecuted":
        return `${event.data.agent?.slice(0, 8)}... → $${Number(event.data.value || 0).toLocaleString()} ${event.data.ledgerCosigned === "true" ? "(cosigned)" : ""}`;
      case "TransactionBlocked":
        return `${event.data.agent?.slice(0, 8)}... — $${Number(event.data.value || 0).toLocaleString()} — ${event.data.reason || "limit exceeded"}`;
      case "Staked":
        return `${event.data.auditor?.slice(0, 8)}... staked $${Number(event.data.amount || 0).toLocaleString()}`;
      case "CertificateRevoked":
        return `Agent ${event.data.agent?.slice(0, 8)}...`;
      case "CertificateChallenged":
        return `Cert ${event.data.certHash?.slice(0, 10)}... by ${event.data.challenger?.slice(0, 8)}...`;
      default:
        return Object.entries(event.data).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(" | ");
    }
  })();

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 hover:bg-fd-muted/30 rounded transition-colors">
      <span className={`shrink-0 inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold ${style.color}`}>
        {style.label}
      </span>
      <span className="text-sm text-fd-foreground truncate flex-1">{detail}</span>
      {event.blockNumber && (
        <span className="text-xs text-fd-muted-foreground font-mono shrink-0">#{event.blockNumber}</span>
      )}
    </div>
  );
}

interface ActivityFeedProps {
  events: ActivityEvent[];
  maxItems?: number;
  showFilters?: boolean;
}

export function ActivityFeed({ events, maxItems = 20, showFilters = false }: ActivityFeedProps) {
  const [filter, setFilter] = useState<ActivityEventType | "all">("all");
  const filtered = filter === "all" ? events : events.filter((e) => e.type === filter);
  const displayed = filtered.slice(0, maxItems);

  const types = [...new Set(events.map((e) => e.type))];

  return (
    <div className="rounded-lg border border-fd-border bg-fd-card">
      <div className="px-4 py-3 border-b border-fd-border flex items-center justify-between">
        <div className="text-sm font-medium">Recent Activity</div>
        {showFilters && types.length > 1 && (
          <div className="flex gap-1">
            <button
              onClick={() => setFilter("all")}
              className={`px-2 py-0.5 rounded text-xs ${filter === "all" ? "bg-fd-primary/20 text-fd-primary" : "text-fd-muted-foreground hover:text-fd-foreground"}`}
            >
              All
            </button>
            {types.map((t) => {
              const s = TYPE_STYLES[t];
              return (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`px-2 py-0.5 rounded text-xs ${filter === t ? "bg-fd-primary/20 text-fd-primary" : "text-fd-muted-foreground hover:text-fd-foreground"}`}
                >
                  {s?.label || t}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="divide-y divide-fd-border/50">
        {displayed.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-fd-muted-foreground">
            No activity yet. Run the demo to populate events.
          </div>
        ) : (
          displayed.map((event, i) => <EventRow key={`${event.type}-${i}`} event={event} />)
        )}
      </div>
    </div>
  );
}
