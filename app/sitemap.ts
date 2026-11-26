import type { MetadataRoute } from 'next';
import { connectorsRoute, siteUrl } from '@/lib/shared';
import { canonicalUrl, connectorsSource, source } from '@/lib/source';
import { readSources } from '@/lib/sources';

export const dynamic = 'force-static';

// Every page of the site that names itself as canonical: the home page, the
// changelog, the connectors, and of the docs the default version's pages and
// those that only another version has. /docs, a redirect, isn't one.
//
// A page from a content repository was last modified no later than the
// commit it was fetched from, whose date generated/sources.json has: one date
// for each version's pages, and one for the connectors'. The site's own
// pages, and pages fetched with --local, have none.
export default function sitemap(): MetadataRoute.Sitemap {
  const { trees } = readSources();
  const dateOf = (dir: string) => trees.find((t) => t.dir === dir)?.date;
  const pages: { url: string; date?: string }[] = [
    { url: '/' },
    { url: '/changelog' },
    { url: connectorsRoute },
    ...connectorsSource.getPages().map((p) => ({ url: p.url, date: dateOf(`content/connectors/${p.slugs[0]}`) })),
    ...source
      .getPages()
      .filter((p) => canonicalUrl(p) === p.url)
      .map((p) => ({ url: p.url, date: dateOf(`content/docs/${p.slugs[0]}`) })),
  ];
  return pages
    .filter((p, i) => pages.findIndex((q) => q.url === p.url) === i)
    .map((p) => ({ url: `${siteUrl}${p.url === '/' ? '' : p.url}`, ...(p.date ? { lastModified: p.date } : {}) }));
}
