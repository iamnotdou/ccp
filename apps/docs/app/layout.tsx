import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import 'katex/dist/katex.css';
import './global.css';

const baseUrl = 'https://docs.bound.xyz';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Bound Docs — Containment Certificate Protocol',
    template: '%s | Bound Docs',
  },
  description:
    'Machine-readable containment certificates for autonomous AI agents. Bound the loss, not the behavior.',
  openGraph: {
    type: 'website',
    siteName: 'Bound Docs',
    title: 'Bound Docs — Containment Certificate Protocol',
    description:
      'Machine-readable containment certificates for autonomous AI agents.',
    url: baseUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bound Docs — Containment Certificate Protocol',
    description:
      'Machine-readable containment certificates for autonomous AI agents.',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
