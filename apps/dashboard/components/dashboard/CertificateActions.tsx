"use client";

import { useState, useTransition } from "react";
import { revokeCertificate, checkCertificateValidity } from "@/lib/actions/certificate";
import { StatusBadge } from "./StatusBadge";
import { AddressDisplay } from "./AddressDisplay";

const CLASS_NAMES = ["NONE", "C1", "C2", "C3"];

// ─── Revoke Button ───

export function RevokeButton({ certHash }: { certHash: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ txHash?: string; error?: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  function handleClick() {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    setResult(null);
    startTransition(async () => {
      const res = await revokeCertificate(certHash);
      setResult(res);
      setConfirmed(false);
    });
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="rounded-lg px-4 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isPending ? (
          <span className="inline-flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Revoking...
          </span>
        ) : confirmed ? (
          "Confirm Revoke"
        ) : (
          "Revoke Certificate"
        )}
      </button>
      {confirmed && !isPending && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-yellow-400">Are you sure? This cannot be undone.</span>
          <button
            onClick={() => setConfirmed(false)}
            className="text-xs text-fd-muted-foreground hover:text-fd-foreground"
          >
            Cancel
          </button>
        </div>
      )}
      {result?.txHash && (
        <div className="mt-2 text-xs">
          <span className="text-green-400">Revoked: </span>
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

// ─── Certificate Validity Checker ───

interface ValidityResult {
  valid?: boolean;
  status?: number;
  agent?: string;
  operator?: string;
  certificateClass?: number;
  containmentBound?: string;
  expiresAt?: number;
  error?: string;
}

export function CertificateValidityChecker() {
  const [certHash, setCertHash] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ValidityResult | null>(null);

  function handleCheck() {
    if (!certHash) return;
    setResult(null);
    startTransition(async () => {
      const res = await checkCertificateValidity(certHash);
      setResult(res);
    });
  }

  return (
    <div className="rounded-lg border border-fd-border bg-fd-card p-6">
      <h2 className="text-lg font-semibold mb-4">Certificate Lookup</h2>
      <p className="text-sm text-fd-muted-foreground mb-4">
        Check the validity of any certificate by its hash.
      </p>
      <div className="flex gap-3">
        <input
          type="text"
          value={certHash}
          onChange={(e) => setCertHash(e.target.value)}
          placeholder="0x..."
          className="flex-1 rounded-lg border border-fd-border bg-fd-background px-4 py-2 text-sm font-mono focus:outline-none focus:border-fd-primary"
        />
        <button
          onClick={handleCheck}
          disabled={isPending || !certHash}
          className="rounded-lg bg-fd-primary px-6 py-2 text-sm font-medium text-fd-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Checking..." : "Check"}
        </button>
      </div>

      {result?.error && (
        <div className="mt-4 text-sm text-red-400">{result.error}</div>
      )}

      {result && !result.error && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <StatusBadge status={result.status!} />
            {result.valid ? (
              <span className="text-xs text-green-400 border border-green-500/30 rounded px-2 py-0.5">VALID</span>
            ) : (
              <span className="text-xs text-red-400 border border-red-500/30 rounded px-2 py-0.5">INVALID</span>
            )}
            <span className="text-xs font-mono text-fd-muted-foreground">
              {CLASS_NAMES[result.certificateClass!] || "Unknown"}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-fd-muted-foreground mb-1">Operator</div>
              <AddressDisplay address={result.operator!} />
            </div>
            <div>
              <div className="text-xs text-fd-muted-foreground mb-1">Agent</div>
              <AddressDisplay address={result.agent!} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-fd-muted-foreground">Containment Bound</span>
            <span className="text-sm font-mono">${result.containmentBound} USDC</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-fd-muted-foreground">Expires</span>
            <span className="text-sm font-mono">
              {new Date(result.expiresAt! * 1000).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
