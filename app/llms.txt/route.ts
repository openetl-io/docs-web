import { versionFolder } from '@/lib/layout.shared';
import { connectorsLlms, docsLlms, source } from '@/lib/source';
import { readSources } from '@/lib/sources';

export const dynamic = 'force-static';

// The default version's docs and the connectors, as a list of links.
export function GET() {
  const { defaultVersion } = readSources();
  const version = versionFolder(source.getPageTree(), defaultVersion);
  const docs = version ? docsLlms.indexNode(version) : docsLlms.index();
  return new Response(`# OpenETL\n\n${docs}\n\n${connectorsLlms.index()}`);
}
