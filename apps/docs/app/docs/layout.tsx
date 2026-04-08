import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';
import type { ReactNode } from 'react';
import Image from 'next/image';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: (
          <span className="flex items-center gap-2">
            <Image src="/bound-seal.png" alt="Bound" width={24} height={24} />
            Bound Docs
          </span>
        ),
        links: [
          {
            text: 'Dashboard',
            url: process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://ccp-dashboard-amber.vercel.app',
          },
        ],
      }}
      sidebar={{ collapsible: true }}
    >
      {children}
    </DocsLayout>
  );
}
