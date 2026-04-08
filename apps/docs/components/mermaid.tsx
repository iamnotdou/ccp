'use client';

import { useEffect, useRef, useState } from 'react';

let mermaidPromise: Promise<typeof import('mermaid')> | null = null;
let counter = 0;

function getMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((m) => {
      m.default.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          primaryColor: '#3b82f6',
          primaryTextColor: '#f8fafc',
          primaryBorderColor: '#60a5fa',
          lineColor: '#94a3b8',
          secondaryColor: '#1e293b',
          tertiaryColor: '#0f172a',
          background: '#020617',
          mainBkg: '#1e293b',
          nodeBorder: '#60a5fa',
          clusterBkg: '#0f172a',
          clusterBorder: '#334155',
          titleColor: '#f8fafc',
          edgeLabelBackground: '#1e293b',
          nodeTextColor: '#f8fafc',
        },
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        flowchart: { curve: 'basis', padding: 16 },
        sequence: { actorMargin: 80, messageMargin: 40 },
      });
      return m;
    });
  }
  return mermaidPromise;
}

export function Mermaid({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const idRef = useRef(`mmd-${counter++}`);

  useEffect(() => {
    let cancelled = false;

    getMermaid().then(async (m) => {
      if (cancelled) return;
      try {
        const { svg: rendered } = await m.default.render(idRef.current, chart);
        if (!cancelled) setSvg(rendered);
      } catch (e) {
        if (!cancelled) {
          setSvg(`<pre style="color:#f87171;font-size:0.875rem;white-space:pre-wrap">${chart}</pre>`);
        }
      }
    });

    return () => { cancelled = true; };
  }, [chart]);

  if (!svg) {
    return (
      <div className="my-6 flex justify-center rounded-lg border border-fd-border bg-fd-background p-8">
        <div className="text-fd-muted-foreground text-sm">Loading diagram...</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-6 flex justify-center overflow-x-auto rounded-lg border border-fd-border bg-fd-background p-4 [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
