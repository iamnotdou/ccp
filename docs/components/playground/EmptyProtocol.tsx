import Link from "next/link";
import { addresses } from "@/lib/contracts/config";

export function EmptyProtocol() {
  return (
    <div className="rounded-lg border border-fd-border bg-fd-card p-8 text-center">
      <img src="/bound-seal.png" alt="Bound" width={80} height={80} className="mx-auto mb-4 opacity-40" />
      <h2 className="text-xl font-bold mb-2">No Protocol Activity Yet</h2>
      <p className="text-fd-muted-foreground text-sm max-w-md mx-auto mb-6">
        The Bound playground discovers agents, certificates, and auditors from on-chain events.
        Run the interactive demo first to populate the protocol with data.
      </p>
      <Link
        href="/dashboard/demo"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-fd-primary text-fd-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>
        Run 7-Phase Demo
      </Link>
      <div className="mt-8 text-xs text-fd-muted-foreground">
        <div className="font-medium mb-2">Deployed Contracts (Hedera Testnet)</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 font-mono max-w-lg mx-auto text-left">
          {Object.entries(addresses).map(([name, addr]) => (
            <div key={name}>
              <span className="text-fd-muted-foreground">{name}:</span>{" "}
              <a
                href={`https://hashscan.io/testnet/contract/${addr}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-fd-primary hover:underline"
              >
                {addr.slice(0, 6)}...{addr.slice(-4)}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
