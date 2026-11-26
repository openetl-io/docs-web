import fs from 'node:fs';
import path from 'node:path';
import { connectors, docs } from '@/.source/server';
import type * as PageTree from 'fumadocs-core/page-tree';
import { llms, loader, type LoaderPlugin } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/plugins/lucide-icons';
import { createOpenAPI, type OpenAPIServer } from 'fumadocs-openapi/server';
import type { Document } from 'fumadocs-openapi';
import { parse as parseYAML } from 'yaml';
import { canonicalSlugs } from './canonical';
import { getConnector } from './connectors';
import type { Crumb } from './metadata';
import { connectorsRoute, docsRoute, markdownRoute, siteUrl } from './shared';
import { readSources, siteRoot } from './sources';

const sources = readSources();

const openapiFile = (version: string) => path.join(siteRoot, 'generated', 'openapi', `${version}.yaml`);

const methods = ['get', 'put', 'post', 'delete', 'patch'] as const;

// The RPC of an operation ID such as AuditService_ListAuditEntries, in words:
// List audit entries.
function rpcWords(operationId: string): string {
  const rpc = operationId.split('_').pop() ?? operationId;
  const words = rpc
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(' ');
  return words.map((w, i) => (i === 0 || /^[A-Z0-9]+$/.test(w) ? w : w.toLowerCase())).join(' ');
}

// openapi.yaml, generated from the protos, has an operation ID and no summary
// for each operation; the summary, which titles its page, is the RPC's name.
// It names no server either.
function loadOpenAPI(file: string): Document {
  const doc = parseYAML(fs.readFileSync(file, 'utf8')) as Document;
  // Examples call the API where `openetld dev` serves it.
  if (!doc.servers?.length) doc.servers = [{ url: 'http://localhost:8080', description: 'openetld dev' }];
  for (const item of Object.values(doc.paths ?? {})) {
    for (const m of methods) {
      const op = item?.[m];
      if (op?.operationId && !op.summary) op.summary = rpcWords(op.operationId);
    }
  }
  return doc;
}

// Where a version's API reference is: its folder in the version's.
const apiDir = (version: string) => `${version}/reference/api`;

// The API reference of each version, from its openapi.yaml, as pages under
// its Reference section: reference/api/<service>/<operation>.
const apis = await Promise.all(
  sources.versions
    .filter((v) => fs.existsSync(openapiFile(v.slug)))
    .map(async (v) => {
      const server = createOpenAPI({ input: { [v.slug]: () => loadOpenAPI(openapiFile(v.slug)) } });
      const pages = await server.staticSource({
        baseDir: apiDir(v.slug),
        groupBy: 'tag',
        meta: true,
        name: (output: { info: { title: string } }) =>
          output.info.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      });
      return { version: v.slug, server, pages };
    }),
);

// Each version's folder is a root of type version, which gives the version
// picker. openetl's sections are folders in the version's sidebar, not roots:
// a root takes over the sidebar when you open one of its pages, and moves into
// a picker of its own. So the site ignores their `root: true`.
function versionsPlugin(): LoaderPlugin {
  return {
    name: 'openetl:versions',
    transformStorage({ storage }) {
      for (const file of storage.getFiles()) {
        const meta = storage.read(file);
        if (meta?.format !== 'meta' || meta.data.root === undefined) continue;
        const { root: _, ...data } = meta.data;
        meta.data = data;
      }
      for (const v of sources.versions) {
        const meta = storage.read(`${v.slug}/meta.json`);
        if (meta?.format !== 'meta') continue;
        meta.data = {
          ...meta.data,
          title: v.title,
          description: v.release ? 'The newest stable release' : 'From main, with what is not released yet',
          icon: v.release ? 'Tag' : 'GitBranch',
          root: 'version',
        };

        // The API reference goes last in the Reference section.
        if (!apis.some((a) => a.version === v.slug)) continue;
        const reference = storage.read(`${v.slug}/reference/meta.json`);
        if (reference?.format === 'meta' && reference.data.pages && !reference.data.pages.includes('api')) {
          reference.data = { ...reference.data, pages: [...reference.data.pages, 'api'] };
        }
        const apiMeta = `${v.slug}/reference/api/meta.json`;
        const existing = storage.read(apiMeta);
        storage.write(apiMeta, {
          type: existing?.type ?? 'docs',
          path: apiMeta,
          format: 'meta',
          data: { ...(existing?.format === 'meta' ? existing.data : {}), title: 'API' },
        });
      }
    },
  };
}

type APISource = Awaited<ReturnType<OpenAPIServer['staticSource']>>;

// Pages of type docs are openetl's; those of type api-<version> its API's.
const input = {
  docs: docs.toFumadocsSource(),
  ...Object.fromEntries(apis.map((a) => [`api-${a.version}`, a.pages])),
} as { docs: ReturnType<typeof docs.toFumadocsSource> } & Record<`api-${string}`, APISource>;

export const source = loader(
  input,
  {
    baseUrl: docsRoute,
    plugins: [versionsPlugin(), lucideIconsPlugin(), ...apis.slice(0, 1).map((a) => a.server.loaderPlugin())],
  },
);

// A package whose only page is its README is a page in the sidebar, not a
// folder, with its logo.
function connectorsPlugin(): LoaderPlugin {
  const logo = (name: string) => {
    const file = getConnector(name)?.logo;
    return file ? <img src={file} alt="" className="size-4 object-contain" /> : undefined;
  };
  return {
    name: 'openetl:connectors',
    transformPageTree: {
      root(node) {
        const children: PageTree.Node[] = node.children.map((child) => {
          if (child.type !== 'folder' || !child.index) return child;
          const name = child.index.url.split('/').pop() ?? '';
          if (child.children.length > 0) return { ...child, icon: logo(name) ?? child.icon };
          return { ...child.index, icon: logo(name) ?? child.index.icon };
        });
        return { ...node, children };
      },
    },
  };
}

export const connectorsSource = loader(connectors.toFumadocsSource(), {
  baseUrl: connectorsRoute,
  plugins: [connectorsPlugin()],
});

export type DocsPage = (typeof source)['$inferPage'];
export type ConnectorPage = (typeof connectorsSource)['$inferPage'];

// The version a docs page belongs to: the first segment of its slugs.
export function versionOf(page: { slugs: string[] }) {
  return sources.versions.find((v) => v.slug === page.slugs[0]);
}

// The URL a docs page names as canonical: the same page in the default
// version, when it has it, or the page's own (lib/canonical.ts).
export function canonicalUrl(page: DocsPage): string {
  const exists = (slugs: string[]) => source.getPage(slugs) !== undefined;
  const slugs = canonicalSlugs(page.slugs, readSources().defaultVersion, exists);
  return slugs === page.slugs ? page.url : (source.getPage(slugs)?.url ?? page.url);
}

// Whether a version's page tree node is its API reference, or in it: every
// page under it is one of the API reference's.
export function isAPINode(node: PageTree.Node, version: string): boolean {
  const prefix = `${docsRoute}/${apiDir(version)}/`;
  if (node.type === 'page') return node.url.startsWith(prefix);
  if (node.type !== 'folder') return false;
  const urls = pageURLs(node);
  return urls.length > 0 && urls.every((url) => url.startsWith(prefix));
}

function pageURLs(folder: PageTree.Folder): string[] {
  return [
    ...(folder.index ? [folder.index.url] : []),
    ...folder.children.flatMap((n) => (n.type === 'page' ? [n.url] : n.type === 'folder' ? pageURLs(n) : [])),
  ];
}

// The Markdown copy of a page, at /llms.mdx/<the page's URL>.md. The API
// reference's pages, generated from openapi.yaml, have none.
export function markdownURL(page: DocsPage | ConnectorPage): string | undefined {
  return 'getOpenAPIPageProps' in page.data ? undefined : `${markdownRoute}${page.url}.md`;
}

// The way to a page: each page whose URL its URL is under, such as a
// section's first page, and the page itself. A folder without a page of its
// own has nowhere to link to, so it's left out.
function crumbs(page: DocsPage | ConnectorPage, getPage: (slugs: string[]) => DocsPage | ConnectorPage | undefined): Crumb[] {
  return page.slugs.flatMap((_, i) => {
    const p = i === page.slugs.length - 1 ? page : getPage(page.slugs.slice(0, i + 1));
    return p ? [{ name: p.data.title ?? p.slugs.at(-1) ?? p.url, url: p.url }] : [];
  });
}

// A docs page's, from its version's first page.
export function docsCrumbs(page: DocsPage): Crumb[] {
  return crumbs(page, (slugs) => source.getPage(slugs));
}

// A connector page's, from the connectors' index.
export function connectorCrumbs(page: ConnectorPage): Crumb[] {
  return [{ name: 'Connectors', url: connectorsRoute }, ...crumbs(page, (slugs) => connectorsSource.getPage(slugs))];
}

// A page as Markdown, for llms.txt and the Markdown copy of each page. The API
// reference has none: its pages are generated from openapi.yaml.
async function pageMarkdown(page: DocsPage | ConnectorPage): Promise<string> {
  const heading = `# ${page.data.title} (${siteUrl}${page.url})\n\n`;
  if (page.type !== 'docs' && page.type !== undefined) return `${heading}${page.data.description ?? ''}\n`;
  return heading + (await page.data.getText('processed'));
}

// llms.txt links to each page by its full URL, as readers outside the site
// need it, and gives each description on one line, as Fumadocs does but with
// its line breaks as spaces: a description from openapi.yaml can run over
// several lines, which would end its item of the list.
function llmsOptions(loader: {
  getNodePage: (node: PageTree.Item) => { data: { description?: string } } | undefined;
  getNodeMeta: (node: PageTree.Folder | PageTree.Root) => { data: { description?: string } } | undefined;
}) {
  return {
    renderPage: pageMarkdown,
    renderUrl: (node: PageTree.Item) => `${siteUrl}${node.url}`,
    renderDescription: (node: PageTree.Root | PageTree.Item | PageTree.Folder) => {
      const data = node.type === 'page' ? loader.getNodePage(node)?.data : loader.getNodeMeta(node)?.data;
      const description = data?.description ?? (typeof node.description === 'string' ? node.description : '');
      return description.replace(/\s+/g, ' ').trim();
    },
  };
}

export const docsLlms = llms(source, llmsOptions(source));
export const connectorsLlms = llms(connectorsSource, llmsOptions(connectorsSource));
