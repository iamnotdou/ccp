import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center text-center px-4">
      <h1 className="text-4xl font-bold mb-4">
        Containment Certificate Protocol
      </h1>
      <p className="text-fd-muted-foreground max-w-xl mb-8">
        Machine-readable, on-chain containment certificates for autonomous AI
        agents. Bound the loss, not the behavior.
      </p>
      <div className="flex gap-4">
        <Link
          href="/docs"
          className="rounded-lg bg-fd-primary px-6 py-3 text-fd-primary-foreground font-medium"
        >
          Read the Docs
        </Link>
        <a
          href="/downloads/containment-certificate-protocol-prd.pdf"
          className="rounded-lg border border-fd-border px-6 py-3 font-medium"
          download
        >
          Download PRD (PDF)
        </a>
      </div>
    </main>
  );
}
