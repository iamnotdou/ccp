"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/playground/explorer", label: "Explorer", icon: "globe" },
  { href: "/playground/agents", label: "Agents", icon: "bot" },
  { href: "/playground/certificates", label: "Certificates", icon: "file" },
  { href: "/playground/auditors", label: "Auditors", icon: "shield" },
  { href: "/playground/activity", label: "Activity", icon: "activity" },
  { href: "/playground/sandbox", label: "Sandbox", icon: "play" },
];

const ICONS: Record<string, React.ReactNode> = {
  globe: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
  ),
  bot: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
  ),
  file: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m9 15 2 2 4-4"/></svg>
  ),
  shield: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
  ),
  activity: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
  ),
  play: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>
  ),
};

export function PlaygroundNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 py-4">
      <div className="px-4 pb-3 mb-2 border-b border-fd-border">
        <div className="flex items-center gap-2">
          <img src="/bound-seal.png" alt="Bound" width={24} height={24} />
          <Link href="/playground" className="text-lg font-bold">Bound Playground</Link>
        </div>
        <div className="text-xs text-fd-muted-foreground mt-0.5">Hedera Testnet — All Participants</div>
      </div>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 px-4 py-2 text-sm rounded-lg mx-2 transition-colors ${
              isActive
                ? "bg-fd-primary/10 text-fd-primary font-medium"
                : "text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-muted/50"
            } ${item.label === "Sandbox" ? "mt-4 border border-fd-primary/30 bg-fd-primary/5" : ""}`}
          >
            {ICONS[item.icon]}
            {item.label}
          </Link>
        );
      })}
      <div className="mt-auto px-4 pt-4 border-t border-fd-border mt-6 flex flex-col gap-1">
        <Link href="/dashboard" className="text-xs text-fd-muted-foreground hover:text-fd-foreground">
          Agent Dashboard
        </Link>
        <a href={process.env.NEXT_PUBLIC_DOCS_URL || "/docs"} className="text-xs text-fd-muted-foreground hover:text-fd-foreground">
          Documentation
        </a>
      </div>
    </nav>
  );
}
