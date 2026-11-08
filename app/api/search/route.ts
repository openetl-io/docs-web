import { type AdvancedIndex, createSearchAPI } from 'fumadocs-core/search/server';
import { connectorsSource, source, versionOf } from '@/lib/source';
import { readSources } from '@/lib/sources';

export const dynamic = 'force-static';

// One static index of every page. Docs pages are tagged with their version;
// connector pages with every version, as they belong to none.
function indexes(): AdvancedIndex[] {
  const versions = readSources().versions.map((v) => v.slug);
  const docs = source.getPages().map((page) => ({
    id: page.url,
    url: page.url,
    title: page.data.title ?? page.url,
    description: page.data.description,
    structuredData: page.data.structuredData,
    tag: versionOf(page)?.slug ?? versions[0],
  }));
  const connectors = connectorsSource.getPages().map((page) => ({
    id: page.url,
    url: page.url,
    title: page.data.title,
    description: page.data.description,
    structuredData: page.data.structuredData,
    tag: versions,
  }));
  return [...docs, ...connectors];
}

export const { staticGET: GET } = createSearchAPI('advanced', {
  language: 'english',
  indexes,
});
