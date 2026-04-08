import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './global.css';

const baseUrl = 'https://dashboard.bound.xyz';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Bound Dashboard',
    template: '%s | Bound Dashboard',
  },
  description:
    'Bound — Containment Certificate Protocol Dashboard',
  openGraph: {
    type: 'website',
    siteName: 'Bound Dashboard',
    title: 'Bound Dashboard',
    description: 'Containment Certificate Protocol Dashboard',
    url: baseUrl,
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
