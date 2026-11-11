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
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { APIReference } from '@/components/api-reference';
import { getMDXComponents } from '@/components/mdx';
import { markdownRoute, repos } from '@/lib/shared';
import { source, versionOf } from '@/lib/source';
import { githubURL, readSources } from '@/lib/sources';

// /docs is the default version's docs. Cloudflare Pages redirects it with
// public/_redirects, which the fetch writes; this page does it elsewhere.
function ToDefaultVersion() {
  const to = `/docs/${readSources().defaultVersion}`;
  return (
    <DocsPage>
      <meta httpEquiv="refresh" content={`0; url=${to}`} />
      <DocsBody>
        <p>
          The docs are at <Link href={to}>{to}</Link>.
        </p>
      </DocsBody>
    </DocsPage>
  );
}

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const { slug } = await props.params;
  if (!slug || slug.length === 0) return <ToDefaultVersion />;
  const page = source.getPage(slug);
  if (!page) notFound();

  if (page.type !== 'docs') {
    return (
      <DocsPage full toc={page.data.toc}>
        <DocsTitle>{page.data.title}</DocsTitle>
        <DocsDescription>{page.data.description}</DocsDescription>
        <DocsBody>
          <APIReference {...page.data.getOpenAPIPageProps()} />
        </DocsBody>
      </DocsPage>
    );
  }

  const MDX = page.data.body;
  const version = versionOf(page);
  // The page in openetl: docs/ at the tag or commit it was fetched from, and on
  // the branch its fixes go to, to edit: the release line's, or main.
  const inRepo = `docs/${page.path.split('/').slice(1).join('/')}`;
  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      <div className="flex flex-row items-center gap-2 border-b pb-6">
        <MarkdownCopyButton markdownUrl={`${markdownRoute}${page.url}.md`} />
        <EditOnGitHub href={githubURL(repos.openetl, 'blob', version?.branch ?? 'main', inRepo)} />
        {version?.release && (
          <a
            className="text-fd-muted-foreground hover:text-fd-accent-foreground text-sm"
            href={githubURL(repos.openetl, 'blob', version.ref, inRepo)}
          >
            {`As of ${version.release}`}
          </a>
        )}
      </div>
      <DocsBody>
        <MDX components={getMDXComponents({ a: createRelativeLink(source, page) })} />
      </DocsBody>
    </DocsPage>
  );
}

// The site is a static export: a path not generated at build is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ slug: [] }, ...source.generateParams()];
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const page = source.getPage(slug);
  if (!page) return {};
  const version = versionOf(page);
  return {
    title: version && version.slug !== readSources().defaultVersion ? `${page.data.title} (${version.title})` : page.data.title,
    description: page.data.description,
    alternates: { canonical: page.url },
  };
}
