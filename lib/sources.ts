import fs from 'node:fs';
import path from 'node:path';

// What scripts/fetch.mjs placed, from generated/sources.json.

export interface Version {
  slug: string;
  title: string;
  // The branch or tag the version was fetched from.
  ref: string;
  // The newest tag of the release line; undefined for next.
  release?: string;
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

export interface Sources {
  local: boolean;
  defaultVersion: string;
  versions: Version[];
  // The ref each connector package was fetched from, by package.
  connectors: Record<string, string>;
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
