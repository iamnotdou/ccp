import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
}

const variantStyles = {
  default: "border-fd-border",
  success: "border-green-500/40",
  warning: "border-yellow-500/40",
  danger: "border-red-500/40",
};

export function StatCard({ label, value, sub, icon, variant = "default" }: StatCardProps) {
  return (
    <div className={`rounded-lg border bg-fd-card p-6 ${variantStyles[variant]}`}>
      <div className="flex items-center gap-2 text-sm text-fd-muted-foreground mb-2">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-sm text-fd-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}
