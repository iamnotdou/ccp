import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center text-center px-4">
      <Image
        src="/bound-seal.png"
        alt="Bound — Verified with Bound"
        width={120}
        height={120}
        className="mb-6"
        priority
      />
      <h1 className="text-5xl font-bold mb-2">
        Bound
      </h1>
      <p className="text-lg text-fd-muted-foreground mb-1">Containment Certificate Protocol</p>
      <p className="text-fd-muted-foreground max-w-xl mb-8">
        Machine-readable, on-chain containment certificates for autonomous AI
        agents. Bound the loss, not the behavior.
      </p>
      <div className="flex gap-4 flex-wrap justify-center">
        <Link
          href="/dashboard/explorer"
          className="rounded-lg bg-fd-primary px-6 py-3 text-fd-primary-foreground font-medium"
        >
          Enter Bound
        </Link>
        <Link
          href="/dashboard/demo"
          className="rounded-lg border border-fd-primary/40 px-6 py-3 font-medium text-fd-primary"
        >
          Live Demo
        </Link>
        <Link
          href="/docs"
          className="rounded-lg border border-fd-border px-6 py-3 font-medium"
        >
          Read the Docs
        </Link>
      </div>
    </main>
  );
}
