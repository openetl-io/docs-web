import type { TOCItemType } from 'fumadocs-core/toc';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  EditOnGitHub,
  MarkdownCopyButton,
} from 'fumadocs-ui/layouts/docs/page';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ConfigReference } from '@/components/config-reference';
import { readChangelog } from '@/lib/changelog';
import { getMDXComponents } from '@/components/mdx';
import { type Connector, getConnector, getConnectors } from '@/lib/connectors';
import { connectorsRoute, docsRoute, markdownRoute, repos } from '@/lib/shared';
import { connectorsSource } from '@/lib/source';
import { githubURL, readSources } from '@/lib/sources';

const roleTitle = { source: 'Source', destination: 'Destination' } as const;

function Logo({ connector, className }: { connector: Connector; className: string }) {
  if (!connector.logo) return null;
  return <img src={connector.logo} alt="" className={className} />;
}

function Index() {
  return (
    <DocsPage>
      <DocsTitle>Connectors</DocsTitle>
      <DocsDescription>
        The official connectors, from openetl-connectors: what each one reads or writes, how to set it up, and the config
        it takes.
      </DocsDescription>
      <DocsBody>
        <Cards>
          {getConnectors().map((c) => (
            <Card
              key={c.name}
              href={`${connectorsRoute}/${c.name}`}
              title={c.title}
              icon={<Logo connector={c} className="size-5 object-contain" />}
              description={
                <>
                  {c.description}
                  <span className="mt-2 block text-xs">{c.roles.map((r) => roleTitle[r]).join(' · ')}</span>
                </>
              }
            />
          ))}
        </Cards>
      </DocsBody>
    </DocsPage>
  );
}

export default async function Page(props: PageProps<'/connectors/[[...slug]]'>) {
  const { slug } = await props.params;
  if (!slug || slug.length === 0) return <Index />;
  const page = connectorsSource.getPage(slug);
  if (!page) notFound();

  const name = slug[0];
  const connector = getConnector(name);
  // The package's page is its README; the rest are under its docs/.
  const isPackagePage = slug.length === 1 && connector !== undefined;
  const inRepo = isPackagePage ? `${name}/README.md` : page.path;
  // The package in openetl-connectors: at the tag or commit its page was
  // fetched from, and on the branch fixes go to, to edit.
  const source = connector?.source ?? { ref: 'main', branch: 'main' };

  const toc: TOCItemType[] = [...page.data.toc];
  const configs = isPackagePage
    ? connector.roles.flatMap((role) => {
        const schema = connector.schemas[role];
        return schema ? [{ role, schema }] : [];
      })
    : [];
  if (configs.length > 0) {
    toc.push({ title: 'Config', url: '#config', depth: 2 });
    for (const { role } of configs) toc.push({ title: roleTitle[role], url: `#config-${role}`, depth: 3 });
  }
  const releases = isPackagePage ? (readChangelog().connectors[name] ?? []) : [];
  if (releases.length > 0) toc.push({ title: 'Releases', url: '#releases', depth: 2 });

  const MDX = page.data.body;
  const secretsHref = `${docsRoute}/${readSources().defaultVersion}/pipelines#secrets`;
  return (
    <DocsPage toc={toc} full={page.data.full}>
      <div className="flex items-center gap-3">
        {isPackagePage && <Logo connector={connector} className="size-8 object-contain" />}
        <DocsTitle>{page.data.title}</DocsTitle>
      </div>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      <div className="flex flex-row flex-wrap items-center gap-2 border-b pb-6">
        <MarkdownCopyButton markdownUrl={`${markdownRoute}${page.url}.md`} />
        <EditOnGitHub href={githubURL(repos.connectors, 'blob', source.branch, inRepo)} />
        {isPackagePage && (
          <a
            className="text-fd-muted-foreground hover:text-fd-accent-foreground text-sm"
            href={githubURL(repos.connectors, 'tree', source.ref, name)}
          >
            {source.release ?? 'Unreleased, from main'}
          </a>
        )}
      </div>
      <DocsBody>
        <MDX components={getMDXComponents({ a: createRelativeLink(connectorsSource, page) })} />
        {configs.length > 0 && (
          <>
            <h2 id="config">Config</h2>
            <p>
              The <code>config</code> of a source or destination that names <code>{`connector: ${name}`}</code>, from the
              package&apos;s {configs.map(({ role }) => `${role}.schema.json`).join(' and ')}.
            </p>
            {configs.map(({ role, schema }) => (
              <section key={role}>
                <h3 id={`config-${role}`}>{roleTitle[role]}</h3>
                <ConfigReference schema={schema} secretsHref={secretsHref} />
              </section>
            ))}
          </>
        )}
        {releases.length > 0 && (
          <>
            <h2 id="releases">Releases</h2>
            <ul>
              {releases.map((r) => (
                <li key={r.id}>
                  <a href={r.url}>{r.title}</a>
                  {`, ${new Date(r.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`}
                  {r.prerelease && ', a pre-release'}
                </li>
              ))}
            </ul>
          </>
        )}
      </DocsBody>
    </DocsPage>
  );
}

// The site is a static export: a path not generated at build is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ slug: [] }, ...connectorsSource.generateParams()];
}

export async function generateMetadata(props: PageProps<'/connectors/[[...slug]]'>): Promise<Metadata> {
  const { slug } = await props.params;
  if (!slug || slug.length === 0) {
    return { title: 'Connectors', description: 'The official connectors for OpenETL.', alternates: { canonical: connectorsRoute } };
  }
  const page = connectorsSource.getPage(slug);
  if (!page) return {};
  return { title: page.data.title, description: page.data.description, alternates: { canonical: page.url } };
}
