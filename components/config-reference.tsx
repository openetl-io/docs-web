import { TypeTable, type TypeNode } from 'fumadocs-ui/components/type-table';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ConfigSchema } from '@/lib/connectors';

function typeName(s: ConfigSchema): string {
  if (s.enum) return s.enum.map((v) => JSON.stringify(v)).join(' | ');
  const t = Array.isArray(s.type) ? s.type.join(' | ') : (s.type ?? 'any');
  if (t === 'array' && s.items) return `array of ${typeName(s.items)}`;
  if (t === 'object' && !s.properties && typeof s.additionalProperties === 'object') {
    return `map of ${typeName(s.additionalProperties)}`;
  }
  return t;
}

// What the schema allows beyond its type: the bounds, patterns and formats.
function constraints(s: ConfigSchema): string[] {
  const out: string[] = [];
  if (s.minimum !== undefined) out.push(`at least ${s.minimum}`);
  if (s.maximum !== undefined) out.push(`at most ${s.maximum}`);
  if (s.minLength !== undefined) out.push(s.minLength === 1 ? 'not empty' : `at least ${s.minLength} characters`);
  if (s.minItems !== undefined) out.push(s.minItems === 1 ? 'at least one item' : `at least ${s.minItems} items`);
  if (s.pattern) out.push(`matches ${s.pattern}`);
  if (s.format) out.push(`format ${s.format}`);
  if (s.items) out.push(...constraints(s.items).map((c) => `each item ${c}`));
  return out;
}

function properties(schema: ConfigSchema, secretsHref: string): Record<string, TypeNode> {
  const out: Record<string, TypeNode> = {};
  for (const [name, s] of Object.entries(schema.properties ?? {})) {
    const description: ReactNode[] = [];
    if (s.description) description.push(<p key="d">{s.description}</p>);
    const limits = constraints(s);
    if (limits.length > 0) description.push(<p key="c">{`${limits.join(', ')}.`.replace(/^./, (c) => c.toUpperCase())}</p>);
    if (s['x-secret']) {
      description.push(
        <p key="s">
          A secret: give it as <code>{'{ secret: NAME }'}</code>, as in <Link href={secretsHref}>Secrets</Link>.
        </p>,
      );
    }
    if (s.properties) {
      description.push(<TypeTable key="p" type={properties(s, secretsHref)} />);
    }
    out[name] = {
      type: typeName(s),
      description: description.length > 0 ? <div className="flex flex-col gap-2">{description}</div> : undefined,
      default: s.default !== undefined ? <code>{JSON.stringify(s.default)}</code> : undefined,
      required: schema.required?.includes(name),
    };
  }
  return out;
}

// The config a connector's role takes, from its JSON Schema.
export function ConfigReference({ schema, secretsHref }: { schema: ConfigSchema; secretsHref: string }) {
  if (!schema.properties || Object.keys(schema.properties).length === 0) {
    return <p>It takes no config.</p>;
  }
  return <TypeTable type={properties(schema, secretsHref)} />;
}
