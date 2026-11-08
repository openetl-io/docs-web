'use client';

import { useTheme } from 'next-themes';
import { use, useEffect, useId, useState } from 'react';

// Draws a `mermaid` code block, which remarkMdxMermaid turns into this
// component, in the site's light or dark theme.
export function Mermaid({ chart }: { chart: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <Chart chart={chart} />;
}

const cache = new Map<string, Promise<unknown>>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  let p = cache.get(key) as Promise<T> | undefined;
  if (!p) {
    p = load();
    cache.set(key, p);
  }
  return p;
}

function Chart({ chart }: { chart: string }) {
  const id = `mermaid-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const { resolvedTheme } = useTheme();
  const { default: mermaid } = use(cached('mermaid', () => import('mermaid')));
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    fontFamily: 'inherit',
    theme: resolvedTheme === 'dark' ? 'dark' : 'neutral',
  });
  const { svg } = use(cached(`${resolvedTheme}:${chart}`, () => mermaid.render(id, chart)));
  return <div className="my-6 flex justify-center [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}
