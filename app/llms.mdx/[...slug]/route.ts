import { notFound } from 'next/navigation';
import { connectorsLlms, connectorsSource, docsLlms, source } from '@/lib/source';

export const dynamic = 'force-static';
// The site is a static export: a path not generated at build is a 404.
export const dynamicParams = false;

// A page as Markdown at /llms.mdx/<the page's URL>.md.
export async function GET(_req: Request, { params }: RouteContext<'/llms.mdx/[...slug]'>) {
  const { slug } = await params;
  const last = slug.at(-1);
  if (!last?.endsWith('.md')) notFound();
  const [section, ...rest] = [...slug.slice(0, -1), last.slice(0, -'.md'.length)];
  let markdown: string | undefined;
  if (section === 'docs') {
    const page = source.getPage(rest);
    if (page) markdown = await docsLlms.page(page);
  } else if (section === 'connectors') {
    const page = connectorsSource.getPage(rest);
    if (page) markdown = await connectorsLlms.page(page);
  }
  if (markdown === undefined) notFound();
  return new Response(markdown, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
}

export function generateStaticParams() {
  const md = (url: string) => {
    const parts = url.split('/').filter(Boolean);
    parts[parts.length - 1] += '.md';
    return { slug: parts };
  };
  return [...source.getPages(), ...connectorsSource.getPages()]
    .filter((p) => !('getOpenAPIPageProps' in p.data))
    .map((p) => md(p.url));
}
