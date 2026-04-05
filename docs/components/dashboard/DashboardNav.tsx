"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Protocol",
    items: [
      { href: "/dashboard/explorer", label: "Explorer", icon: "globe" },
      { href: "/dashboard/all-agents", label: "All Agents", icon: "bot" },
      { href: "/dashboard/all-certificates", label: "All Certificates", icon: "file" },
      { href: "/dashboard/auditor-board", label: "Auditor Board", icon: "shield" },
    ],
  },
  {
    title: "Agent",
    items: [
      { href: "/dashboard/overview", label: "Overview", icon: "grid" },
      { href: "/dashboard/certificates", label: "Certificate", icon: "file" },
      { href: "/dashboard/reserves", label: "Reserves", icon: "vault" },
      { href: "/dashboard/spending", label: "Spending", icon: "activity" },
      { href: "/dashboard/auditors", label: "Auditors", icon: "shield" },
      { href: "/dashboard/challenges", label: "Challenges", icon: "alert" },
      { href: "/dashboard/identity", label: "Identity (ENS)", icon: "at" },
    ],
  },
  {
    title: "Interact",
    items: [
      { href: "/dashboard/demo", label: "Live Demo", icon: "play" },
      { href: "/dashboard/audit-flow", label: "Audit Flow", icon: "search" },
      { href: "/dashboard/sandbox", label: "Sandbox", icon: "zap" },
    ],
  },
];

const ICONS: Record<string, React.ReactNode> = {
  globe: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
  ),
  bot: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
  ),
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
  search: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
  ),
  play: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>
  ),
  zap: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>
  ),
  feed: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
  ),
};

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 py-4 overflow-y-auto">
      <div className="px-4 pb-3 mb-2 border-b border-fd-border">
        <div className="flex items-center gap-2">
          <img src="/bound-seal.png" alt="Bound" width={24} height={24} />
          <Link href="/dashboard" className="text-lg font-bold">Bound</Link>
        </div>
        <div className="text-xs text-fd-muted-foreground mt-0.5">Hedera Testnet</div>
      </div>

      {NAV_SECTIONS.map((section) => (
        <div key={section.title} className="mb-2">
          <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-fd-muted-foreground">
            {section.title}
          </div>
          {section.items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const isHighlighted = item.label === "Live Demo";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-4 py-1.5 text-sm rounded-lg mx-2 transition-colors ${
                  isActive
                    ? "bg-fd-primary/10 text-fd-primary font-medium"
                    : "text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-muted/50"
                } ${isHighlighted ? "border border-fd-primary/30 bg-fd-primary/5" : ""}`}
              >
                {ICONS[item.icon]}
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}

      {/* Activity at bottom */}
      <div className="mb-2">
        <Link
          href="/dashboard/activity"
          className={`flex items-center gap-2.5 px-4 py-1.5 text-sm rounded-lg mx-2 transition-colors ${
            pathname === "/dashboard/activity"
              ? "bg-fd-primary/10 text-fd-primary font-medium"
              : "text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-muted/50"
          }`}
        >
          {ICONS.feed}
          Activity Feed
        </Link>
      </div>

      <div className="px-4 pt-3 border-t border-fd-border mt-auto">
        <Link href="/docs" className="text-xs text-fd-muted-foreground hover:text-fd-foreground">
          Documentation
        </Link>
      </div>
    </nav>
  );
}
