import { connectorsLlms, connectorsSource, docsLlms, source } from '@/lib/source';
import { readSources } from '@/lib/sources';

export const dynamic = 'force-static';

// Every page of the default version's docs and of the connectors, as Markdown.
export async function GET() {
  const { defaultVersion } = readSources();
  const docs = source.getPages().filter((p) => p.slugs[0] === defaultVersion);
  const pages = await Promise.all([
    ...docs.map((p) => docsLlms.page(p)),
    ...connectorsSource.getPages().map((p) => connectorsLlms.page(p)),
  ]);
  return new Response(pages.join('\n\n'));
}
