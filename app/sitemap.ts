import type { MetadataRoute } from 'next';
import { connectorsRoute, siteUrl } from '@/lib/shared';
import { connectorsSource, source } from '@/lib/source';

export const dynamic = 'force-static';

// Every page of the site: the home page, the changelog, each version's docs
// and the connectors. /docs, a redirect, isn't one.
export default function sitemap(): MetadataRoute.Sitemap {
  const urls = [
    '/',
    '/changelog',
    connectorsRoute,
    ...connectorsSource.getPages().map((p) => p.url),
    ...source.getPages().map((p) => p.url),
  ];
  return [...new Set(urls)].map((url) => ({ url: `${siteUrl}${url === '/' ? '' : url}` }));
}
