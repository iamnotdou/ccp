'use client';

import { useEffect, useId, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
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
  flowchart: {
    curve: 'basis',
    padding: 16,
  },
  sequence: {
    actorMargin: 80,
    messageMargin: 40,
  },
});

export function Mermaid({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, '-');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const render = async () => {
      if (!containerRef.current) return;
      try {
        const { svg } = await mermaid.render(`mermaid-${id}`, chart);
        containerRef.current.innerHTML = svg;
      } catch {
        containerRef.current.innerHTML = `<pre class="text-red-400 text-sm">${chart}</pre>`;
      }
    };
    render();
  }, [chart, id]);

  return (
    <div
      ref={containerRef}
      className="my-6 flex justify-center overflow-x-auto rounded-lg border border-fd-border bg-fd-background p-4 [&_svg]:max-w-full"
    />
  );
}
