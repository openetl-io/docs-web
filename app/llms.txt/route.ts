import type * as PageTree from 'fumadocs-core/page-tree';
import { versionFolder } from '@/lib/layout.shared';
import { definition } from '@/lib/metadata';
import { homeUrl, markdownRoute, repos, siteName, siteUrl } from '@/lib/shared';
import { connectorsLlms, connectorsSource, type DocsPage, docsLlms, isAPINode, source } from '@/lib/source';
import { readSources } from '@/lib/sources';

export const dynamic = 'force-static';

// What OpenETL is, from the first paragraphs of openetl's README.md, after the
// sentence that defines it.
const summary =
  'It replicates databases with change data capture (CDC), runs SQL transforms in a Rust engine that uses Apache Arrow, and defines pipelines as YAML; it is open source under the Apache 2.0 license, and in alpha.';

function link(title: string, url: string, description?: string): string {
  return `- [${title.replace(/[[\]]/g, '\\$&')}](${url})${description ? `: ${description}` : ''}`;
}

const pageLink = (page: DocsPage | undefined) =>
  page && link(page.data.title ?? page.url, `${siteUrl}${page.url}`, page.data.description);

// A version's folder without its API reference, and the API reference, whose
// generated page per operation readers with little room can skip.
function splitAPI(folder: PageTree.Folder, version: string): { docs: PageTree.Folder; api: PageTree.Node[] } {
  const api: PageTree.Node[] = [];
  const strip = (f: PageTree.Folder): PageTree.Folder => ({
    ...f,
    children: f.children.flatMap((n): PageTree.Node[] => {
      if (isAPINode(n, version)) {
        api.push(n);
        return [];
      }
      return n.type === 'folder' ? [strip(n)] : [n];
    }),
  });
  return { docs: strip(folder), api };
}

// llms.txt, as llmstxt.org lays it out: what OpenETL is, where to start, the
// default version's docs and the connectors as lists of links, and the API
// reference last, under Optional.
export function GET() {
  const { defaultVersion } = readSources();
  const folder = versionFolder(source.getPageTree(), defaultVersion);
  const { docs, api } = folder ? splitAPI(folder, defaultVersion) : { docs: undefined, api: [] };
  const quickstart = source.getPage([defaultVersion, 'get-started', 'quickstart']);
  const start = [
    link('openetl.io', homeUrl, "OpenETL's website"),
    link('openetl on GitHub', `https://github.com/${repos.openetl}`, 'The source code, issues and releases'),
    pageLink(source.getPage([defaultVersion, 'get-started', 'install'])),
    pageLink(quickstart),
  ].filter((l) => l !== undefined);
  const example = quickstart ? `, such as ${siteUrl}${markdownRoute}${quickstart.url}.md` : '';
  const parts = [
    `# ${siteName}`,
    `> ${definition} ${summary}`,
    `The docs' guides and the connectors' pages are also served as Markdown, at ${siteUrl}${markdownRoute} followed by the page's path and .md${example}. ${siteUrl}/llms-full.txt has every page in one file.`,
    `## Start here\n\n${start.join('\n')}`,
    `## Docs\n\n${docs ? docsLlms.indexNode(docs) : docsLlms.index()}`,
    `## Connectors\n\n${connectorsSource
      .getPageTree()
      .children.map((n) => connectorsLlms.indexNode(n))
      .join('\n')}`,
  ];
  if (api.length > 0) parts.push(`## Optional\n\n${api.map((n) => docsLlms.indexNode(n)).join('\n')}`);
  return new Response(`${parts.join('\n\n')}\n`);
}
