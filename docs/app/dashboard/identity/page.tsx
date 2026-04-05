"use client";

import { useState, useTransition } from "react";
import { AddressDisplay } from "@/components/dashboard/AddressDisplay";
import { SponsorTag } from "@/components/dashboard/SponsorTag";
import { registerEnsName, setupEnsRecords } from "@/lib/actions/ens";

interface DiscoveryResult {
  ensName: string;
  address: string | null;
  certHash?: string;
  certClass?: string;
  chainId?: number;
  registryAddress?: string;
  reserveAddress?: string;
  containmentBound?: string;
  role?: string;
}

export default function IdentityPage() {
  const [ensName, setEnsName] = useState("alpha.ccpdemo.eth");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/ens/discover?name=${encodeURIComponent(ensName)}`);
      if (!res.ok) throw new Error("ENS lookup failed");
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message || "ENS resolution failed. Sepolia RPC may be unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Agent Identity (ENS)</h1>
          <p className="text-fd-muted-foreground text-sm mt-1">
            Discover agents via ENS names and CCP text records
          </p>
        </div>
        <SponsorTag sponsor="ens" />
      </div>

      {/* ENS Lookup */}
      <div className="rounded-lg border border-fd-border bg-fd-card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">ENS Discovery</h2>
        <p className="text-sm text-fd-muted-foreground mb-4">
          Resolve an agent&apos;s ENS name to discover their containment certificate on Hedera.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={ensName}
            onChange={(e) => setEnsName(e.target.value)}
            placeholder="alpha.ccpdemo.eth"
            className="flex-1 rounded-lg border border-fd-border bg-fd-background px-4 py-2 text-sm font-mono focus:outline-none focus:border-fd-primary"
          />
          <button
            onClick={handleLookup}
            disabled={loading || !ensName}
            className="rounded-lg bg-fd-primary px-6 py-2 text-sm font-medium text-fd-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Resolving..." : "Resolve"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 mb-6 text-sm text-yellow-400">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Resolution Result */}
          <div className="rounded-lg border border-fd-border bg-fd-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-400"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/></svg>
              </div>
              <div>
                <div className="font-semibold">{result.ensName}</div>
                <div className="text-xs text-fd-muted-foreground">ENS Name (Sepolia)</div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-fd-muted-foreground">Ethereum Address</span>
                {result.address ? (
                  <AddressDisplay address={result.address} />
                ) : (
                  <span className="text-xs text-red-400">Not resolved</span>
                )}
              </div>
              {result.role && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-fd-muted-foreground">Role</span>
                  <span className="text-sm font-medium capitalize">{result.role}</span>
                </div>
              )}
            </div>
          </div>

          {/* CCP Text Records */}
          {result.certHash && (
            <div className="rounded-lg border border-fd-border bg-fd-card p-6">
              <h2 className="text-lg font-semibold mb-4">CCP Text Records</h2>
              <div className="space-y-3">
                {result.certHash && (
                  <div>
                    <div className="text-xs text-fd-muted-foreground mb-1">ccp.certificate</div>
                    <div className="font-mono text-xs break-all">{result.certHash}</div>
                  </div>
                )}
                {result.certClass && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-fd-muted-foreground">ccp.class</span>
                    <span className="font-mono text-sm">{result.certClass}</span>
                  </div>
                )}
                {result.containmentBound && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-fd-muted-foreground">ccp.bound</span>
                    <span className="font-mono text-sm">${result.containmentBound} USDC</span>
                  </div>
                )}
                {result.chainId && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-fd-muted-foreground">ccp.chain</span>
                    <span className="font-mono text-sm">{result.chainId} (Hedera Testnet)</span>
                  </div>
                )}
                {result.registryAddress && (
                  <div>
                    <div className="text-xs text-fd-muted-foreground mb-1">ccp.registry</div>
                    <AddressDisplay address={result.registryAddress} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Discovery Flow Diagram */}
          <div className="rounded-lg border border-fd-border bg-fd-card p-6">
            <h2 className="text-lg font-semibold mb-4">Discovery Flow</h2>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className="rounded bg-sky-500/20 text-sky-400 px-3 py-1.5 font-mono text-xs">
                {result.ensName}
              </span>
              <span className="text-fd-muted-foreground">-&gt;</span>
              <span className="rounded bg-fd-muted/30 px-3 py-1.5 font-mono text-xs">
                {result.address?.slice(0, 10)}...
              </span>
              <span className="text-fd-muted-foreground">-&gt;</span>
              <span className="rounded bg-fd-muted/30 px-3 py-1.5 font-mono text-xs">
                ccp.certificate
              </span>
              <span className="text-fd-muted-foreground">-&gt;</span>
              <span className="rounded bg-emerald-500/20 text-emerald-400 px-3 py-1.5 font-mono text-xs">
                Hedera Registry
              </span>
            </div>
            <p className="text-xs text-fd-muted-foreground mt-3">
              ENS provides the cross-chain bridge: resolve a human-readable name on Ethereum,
              read CCP text records, then query the containment certificate on Hedera.
            </p>
          </div>
        </div>
      )}

      {/* ENS Register & Setup */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <EnsRegisterCard />
        <EnsSetupCard />
      </div>

      {/* Fleet View */}
      <div className="rounded-lg border border-fd-border bg-fd-card p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">Agent Fleet Discovery</h2>
        <p className="text-sm text-fd-muted-foreground mb-4">
          Operators register agent subnames under their ENS domain for fleet management.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {["alpha", "beta", "gamma"].map((name) => (
            <button
              key={name}
              onClick={() => setEnsName(`${name}.ccpdemo.eth`)}
              className="text-left rounded-lg border border-fd-border p-3 hover:border-fd-primary/50 transition-colors"
            >
              <div className="font-mono text-sm">{name}.ccpdemo.eth</div>
              <div className="text-xs text-fd-muted-foreground mt-1">Agent subname</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ENS Register Card ───

function EnsRegisterCard() {
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ txHash?: string; error?: string; owner?: string; resolvesTo?: string } | null>(null);

  function handleRegister() {
    if (!name) return;
    const fullName = name.endsWith(".eth") ? name : `${name}.eth`;
    setResult(null);
    startTransition(async () => {
      const res = await registerEnsName(fullName);
      setResult(res);
    });
  }

  return (
    <div className="rounded-lg border border-fd-border bg-fd-card p-6">
      <h2 className="text-lg font-semibold mb-2">Register ENS Name</h2>
      <p className="text-sm text-fd-muted-foreground mb-4">
        Register a new .eth name on Sepolia for your agent. Takes ~65 seconds.
      </p>
      <div className="flex gap-3 mb-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="myagent"
          className="flex-1 rounded-lg border border-fd-border bg-fd-background px-4 py-2 text-sm font-mono focus:outline-none focus:border-fd-primary"
        />
        <span className="flex items-center text-sm text-fd-muted-foreground">.eth</span>
      </div>
      <button
        onClick={handleRegister}
        disabled={isPending || !name}
        className="w-full rounded-lg bg-fd-primary px-6 py-2 text-sm font-medium text-fd-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? (
          <span className="inline-flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Registering (~65s)...
          </span>
        ) : (
          "Register"
        )}
      </button>
      {result?.txHash && (
        <div className="mt-3 space-y-1 text-xs">
          <div><span className="text-green-400">Registered!</span></div>
          <div className="text-fd-muted-foreground">Owner: <span className="font-mono">{result.owner?.slice(0, 14)}...</span></div>
          <div className="text-fd-muted-foreground">Resolves to: <span className="font-mono">{result.resolvesTo?.slice(0, 14)}...</span></div>
        </div>
      )}
      {result?.error && (
        <div className="mt-3 text-xs text-red-400">{result.error}</div>
      )}
    </div>
  );
}

// ─── ENS Setup Card ───

function EnsSetupCard() {
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success?: number; total?: number; error?: string } | null>(null);

  function handleSetup() {
    if (!name) return;
    const fullName = name.endsWith(".eth") ? name : `${name}.eth`;
    setResult(null);
    startTransition(async () => {
      const res = await setupEnsRecords(fullName);
      setResult(res);
    });
  }

  return (
    <div className="rounded-lg border border-fd-border bg-fd-card p-6">
      <h2 className="text-lg font-semibold mb-2">Write CCP Records</h2>
      <p className="text-sm text-fd-muted-foreground mb-4">
        Publish your active certificate data as ENS text records for cross-chain discovery.
      </p>
      <div className="flex gap-3 mb-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="myagent.eth"
          className="flex-1 rounded-lg border border-fd-border bg-fd-background px-4 py-2 text-sm font-mono focus:outline-none focus:border-fd-primary"
        />
      </div>
      <button
        onClick={handleSetup}
        disabled={isPending || !name}
        className="w-full rounded-lg border border-fd-border px-6 py-2 text-sm font-medium text-fd-foreground hover:bg-fd-muted/50 disabled:opacity-50 transition-all"
      >
        {isPending ? (
          <span className="inline-flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Writing records...
          </span>
        ) : (
          "Write CCP Records"
        )}
      </button>
      {result?.success !== undefined && (
        <div className="mt-3 text-xs">
          <span className={result.success === result.total ? "text-green-400" : "text-yellow-400"}>
            {result.success}/{result.total} records set
          </span>
          {result.success === result.total && (
            <span className="text-fd-muted-foreground ml-2">All CCP records written!</span>
          )}
        </div>
      )}
      {result?.error && (
        <div className="mt-3 text-xs text-red-400">{result.error}</div>
      )}
    </div>
  );
}
