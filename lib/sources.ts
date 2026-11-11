import fs from 'node:fs';
import path from 'node:path';

// What scripts/fetch.mjs placed, from generated/sources.json.

export interface Version {
  // The release line's, such as v0-1, or next.
  slug: string;
  // What the version picker shows: the release, such as v0.1.0-alpha, or next.
  title: string;
  // The tag or commit the version's pages were fetched from, which links to
  // GitHub point at.
  ref: string;
  // The newest published release of the line; undefined for next.
  release?: string;
  // The branch fixes to the version's pages go to: main for next, and the
  // line's release-X.Y when the pages were fetched from it.
  branch?: string;
}

// A folder of content/ and where in which repository its files come from.
export interface Tree {
  // Relative to the site's root, such as content/docs/next.
  dir: string;
  // owner/name on GitHub.
  repo: string;
  // The commit or tag links to GitHub point at.
  ref: string;
  // The folder of the repository that dir holds, such as docs.
  root: string;
  // Files renamed when placed, by their name in dir.
  renamed?: Record<string, string>;
  // Every file in the repository at ref.
  files: string[];
}

// Where a connector package's page came from.
export interface ConnectorSource {
  // The package's newest published release, such as postgres/v0.1.0-alpha;
  // undefined until it has one.
  release?: string;
  // The tag or commit the page was fetched from, which links to GitHub point
  // at.
  ref: string;
  // The branch fixes to the page go to: the release line's release-X.Y when
  // the page was fetched from it, or main.
  branch: string;
}

export interface Sources {
  local: boolean;
  defaultVersion: string;
  versions: Version[];
  // Where each connector package's page came from, by package.
  connectors: Record<string, ConnectorSource>;
  trees: Tree[];
}

export const siteRoot = process.cwd();
const file = path.join(siteRoot, 'generated', 'sources.json');

let cached: { mtime: number; sources: Sources } | undefined;

export function readSources(): Sources {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(file);
  } catch {
    throw new Error('generated/sources.json is missing: run `pnpm fetch-docs` or `pnpm dev:local` first');
  }
  if (cached?.mtime !== stat.mtimeMs) {
    cached = { mtime: stat.mtimeMs, sources: JSON.parse(fs.readFileSync(file, 'utf8')) as Sources };
  }
  return cached.sources;
}

export function githubURL(repo: string, kind: 'blob' | 'tree', ref: string, filePath: string): string {
  return `https://github.com/${repo}/${kind}/${ref}/${filePath}`;
}
