"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard/overview", label: "Overview", icon: "grid" },
  { href: "/dashboard/certificates", label: "Certificates", icon: "file" },
  { href: "/dashboard/reserves", label: "Reserves", icon: "vault" },
  { href: "/dashboard/spending", label: "Spending", icon: "activity" },
  { href: "/dashboard/auditors", label: "Auditors", icon: "shield" },
  { href: "/dashboard/challenges", label: "Challenges", icon: "alert" },
  { href: "/dashboard/identity", label: "Identity (ENS)", icon: "at" },
  { href: "/dashboard/demo", label: "Live Demo", icon: "play" },
];

const ICONS: Record<string, React.ReactNode> = {
  grid: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
  ),
  file: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m9 15 2 2 4-4"/></svg>
  ),
  vault: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
  ),
  activity: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
  ),
  shield: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
  ),
  alert: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
  ),
  at: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/></svg>
  ),
  play: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>
  ),
};

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 py-4">
      <div className="px-4 pb-3 mb-2 border-b border-fd-border">
        <Link href="/dashboard" className="text-lg font-bold">CCP Dashboard</Link>
        <div className="text-xs text-fd-muted-foreground mt-0.5">Hedera Testnet</div>
      </div>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 px-4 py-2 text-sm rounded-lg mx-2 transition-colors ${
              isActive
                ? "bg-fd-primary/10 text-fd-primary font-medium"
                : "text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-muted/50"
            } ${item.label === "Live Demo" ? "mt-4 border border-fd-primary/30 bg-fd-primary/5" : ""}`}
          >
            {ICONS[item.icon]}
            {item.label}
          </Link>
        );
      })}
      <div className="mt-auto px-4 pt-4 border-t border-fd-border mt-6 flex flex-col gap-1">
        <Link href="/playground" className="text-xs text-fd-primary hover:underline font-medium">
          Protocol Playground
        </Link>
        <Link href="/docs" className="text-xs text-fd-muted-foreground hover:text-fd-foreground">
          Back to Docs
        </Link>
      </div>
    </nav>
  );
}
