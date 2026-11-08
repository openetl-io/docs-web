import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { readSources, siteRoot } from './sources';

// A connector package as openetl-connector.yaml describes it, with the
// config schema of each of its roles.
export interface Connector {
  name: string;
  title: string;
  description?: string;
  tags: string[];
  roles: ('source' | 'destination')[];
  schemas: Partial<Record<'source' | 'destination', ConfigSchema>>;
  // A path under public/, when the fetch could download the logo.
  logo?: string;
  // The tag or main the package's page was fetched from.
  ref: string;
}

export interface ConfigSchema {
  title?: string;
  description?: string;
  type?: string | string[];
  properties?: Record<string, ConfigSchema>;
  required?: string[];
  items?: ConfigSchema;
  enum?: unknown[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  minItems?: number;
  pattern?: string;
  format?: string;
  additionalProperties?: boolean | ConfigSchema;
  'x-secret'?: boolean;
}

const dir = path.join(siteRoot, 'generated', 'connectors');

function readJSON<T>(file: string): T | undefined {
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as T) : undefined;
}

export function getConnector(name: string): Connector | undefined {
  const descriptor = path.join(dir, name, 'openetl-connector.yaml');
  if (!fs.existsSync(descriptor)) return;
  const d = parse(fs.readFileSync(descriptor, 'utf8')) as {
    name: string;
    title?: string;
    description?: string;
    tags?: string[];
    roles?: Record<string, unknown>;
  };
  const roles = (['source', 'destination'] as const).filter((r) => d.roles && r in d.roles);
  const schemas: Connector['schemas'] = {};
  for (const role of roles) {
    const schema = readJSON<ConfigSchema>(path.join(dir, name, `${role}.schema.json`));
    if (schema) schemas[role] = schema;
  }
  const logo = readJSON<{ file?: string }>(path.join(dir, name, 'logo.json'))?.file;
  return {
    name: d.name,
    title: d.title ?? d.name,
    description: d.description,
    tags: d.tags ?? [],
    roles,
    schemas,
    logo,
    ref: readSources().connectors[name] ?? 'main',
  };
}

export function getConnectors(): Connector[] {
  return Object.keys(readSources().connectors)
    .map(getConnector)
    .filter((c): c is Connector => c !== undefined)
    .sort((a, b) => a.title.localeCompare(b.title));
}
