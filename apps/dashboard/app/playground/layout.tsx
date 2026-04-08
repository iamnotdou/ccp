import type { ReactNode } from "react";
import { PlaygroundNav } from "@/components/playground/PlaygroundNav";

export const metadata = {
  title: "Bound Protocol Playground",
  description: "Explore all agents, certificates, and flows in the Bound Protocol",
};

export default function PlaygroundLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-fd-border bg-fd-card/50 hidden md:flex flex-col">
        <PlaygroundNav />
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
