import { type AdvancedIndex, createSearchAPI } from 'fumadocs-core/search/server';
import { notFound } from 'next/navigation';
import { connectorsSource, source } from '@/lib/source';
import { readSources } from '@/lib/sources';

export const dynamic = 'force-static';
// The site is a static export: a path not generated at build is a 404.
export const dynamicParams = false;

// A static index per version, at /api/search/VERSION.json: the version's
// pages, and the connectors', which belong to no version. Search looks in the
// version the reader is on, so a reader downloads only that version's index,
// however many versions the site has.
function indexes(version: string): AdvancedIndex[] {
  const docs = source
    .getPages()
    .filter((page) => page.slugs[0] === version)
    .map((page) => ({
      id: page.url,
      url: page.url,
      title: page.data.title ?? page.url,
      description: page.data.description,
      structuredData: page.data.structuredData,
    }));
  const connectors = connectorsSource.getPages().map((page) => ({
    id: page.url,
    url: page.url,
    title: page.data.title,
    description: page.data.description,
    structuredData: page.data.structuredData,
  }));
  return [...docs, ...connectors];
}

export async function GET(_req: Request, { params }: RouteContext<'/api/search/[file]'>) {
  const { file } = await params;
  const version = file.replace(/\.json$/, '');
  if (version === file || !readSources().versions.some((v) => v.slug === version)) notFound();
  return createSearchAPI('advanced', { language: 'english', indexes: () => indexes(version) }).staticGET();
}

export function generateStaticParams() {
  return readSources().versions.map((v) => ({ file: `${v.slug}.json` }));
}
