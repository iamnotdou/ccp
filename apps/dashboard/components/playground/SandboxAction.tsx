"use client";

import { useState, useTransition } from "react";

interface SandboxActionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  inputs: { name: string; label: string; placeholder: string; type?: string }[];
  action: (formData: Record<string, string>) => Promise<{ success: boolean; message: string; txHash?: string }>;
}

export function SandboxAction({ title, description, icon, color, inputs, action }: SandboxActionProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string; txHash?: string } | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    setResult(null);
    startTransition(async () => {
      try {
        const res = await action(values);
        setResult(res);
      } catch (e) {
        setResult({ success: false, message: e instanceof Error ? e.message : "Unknown error" });
      }
    });
  };

  return (
    <div className={`rounded-lg border bg-fd-card overflow-hidden ${result?.success === false ? "border-red-500/40" : result?.success ? "border-green-500/40" : "border-fd-border"}`}>
      <div className={`px-4 py-3 border-b border-fd-border/50 flex items-center gap-2 ${color}`}>
        {icon}
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs opacity-75">{description}</div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {inputs.map((input) => (
          <div key={input.name}>
            <label className="text-xs text-fd-muted-foreground block mb-1">{input.label}</label>
            <input
              type={input.type || "text"}
              placeholder={input.placeholder}
              value={values[input.name] || ""}
              onChange={(e) => setValues({ ...values, [input.name]: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded border border-fd-border bg-fd-background focus:outline-none focus:border-fd-primary"
              disabled={isPending}
            />
          </div>
        ))}

        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full py-2 rounded text-sm font-medium bg-fd-primary text-fd-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Executing on Hedera...
            </span>
          ) : (
            "Execute"
          )}
        </button>

        {result && (
          <div className={`rounded p-3 text-sm ${result.success ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
            <div>{result.message}</div>
            {result.txHash && (
              <a
                href={`https://hashscan.io/testnet/transaction/${result.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-fd-primary hover:underline mt-1 inline-block"
              >
                View on HashScan &rarr;
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
