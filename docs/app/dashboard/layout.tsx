import type { ReactNode } from "react";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

export const metadata = {
  title: "CCP Dashboard",
  description: "Containment Certificate Protocol — Operational Dashboard",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-fd-border bg-fd-card/50 hidden md:flex flex-col">
        <DashboardNav />
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
