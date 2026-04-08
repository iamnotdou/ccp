"use client";

import { useState, useTransition } from "react";

interface ActionButtonProps {
  label: string;
  action: () => Promise<{ txHash?: string; error?: string }>;
  variant?: "primary" | "danger" | "secondary";
  disabled?: boolean;
}

const variantStyles = {
  primary: "bg-fd-primary text-fd-primary-foreground hover:opacity-90",
  danger: "bg-red-600 text-white hover:bg-red-700",
  secondary: "border border-fd-border text-fd-foreground hover:bg-fd-muted/50",
};

export function ActionButton({ label, action, variant = "primary", disabled }: ActionButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ txHash?: string; error?: string } | null>(null);

  function handleClick() {
    setResult(null);
    startTransition(async () => {
      const res = await action();
      setResult(res);
    });
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending || disabled}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]}`}
      >
        {isPending ? (
          <span className="inline-flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Processing...
          </span>
        ) : (
          label
        )}
      </button>
      {result?.txHash && (
        <div className="mt-2 text-xs">
          <span className="text-green-400">Success: </span>
          <a
            href={`https://hashscan.io/testnet/transaction/${result.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-fd-primary hover:underline"
          >
            {result.txHash.slice(0, 18)}...
          </a>
        </div>
      )}
      {result?.error && (
        <div className="mt-2 text-xs text-red-400">{result.error}</div>
      )}
    </div>
  );
}
