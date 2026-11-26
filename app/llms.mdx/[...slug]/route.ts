import { notFound } from 'next/navigation';
import { markdownRoute } from '@/lib/shared';
import { connectorsLlms, connectorsSource, docsLlms, markdownURL, source } from '@/lib/source';

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

// The pages that have a Markdown copy, which their pages link to as an
// alternate (lib/source.tsx's markdownURL).
export function generateStaticParams() {
  return [...source.getPages(), ...connectorsSource.getPages()].flatMap((p) => {
    const url = markdownURL(p);
    return url ? [{ slug: url.slice(`${markdownRoute}/`.length).split('/') }] : [];
  });
}
