"use client";

interface AddressDisplayProps {
  address: string;
  label?: string;
  full?: boolean;
}

export function AddressDisplay({ address, label, full = false }: AddressDisplayProps) {
  const truncated = full ? address : `${address.slice(0, 6)}...${address.slice(-4)}`;
  const explorerUrl = `https://hashscan.io/testnet/account/${address}`;

  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-sm">
      {label && <span className="text-fd-muted-foreground font-sans">{label}</span>}
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-fd-primary hover:underline"
      >
        {truncated}
      </a>
      <button
        onClick={() => navigator.clipboard.writeText(address)}
        className="text-fd-muted-foreground hover:text-fd-foreground"
        title="Copy address"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
        </svg>
      </button>
    </span>
  );
}
