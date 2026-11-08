import fs from 'node:fs';
import path from 'node:path';
import { siteRoot } from './sources';

// GitHub Releases, as scripts/fetch.mjs saved them in generated/changelog.json.

export interface Release {
  id: string;
  title: string;
  // ISO 8601.
  date: string;
  url?: string;
  // Markdown.
  content?: string;
  prerelease: boolean;
}

export interface Changelog {
  openetl: Release[];
  // By connector package, from tags such as postgres/v0.2.0.
  connectors: Record<string, Release[]>;
  // Why the releases couldn't be fetched, if they couldn't.
  error?: string;
}

export function readChangelog(): Changelog {
  const file = path.join(siteRoot, 'generated', 'changelog.json');
  if (!fs.existsSync(file)) return { openetl: [], connectors: {}, error: 'run pnpm fetch-docs' };
  return JSON.parse(fs.readFileSync(file, 'utf8')) as Changelog;
}
