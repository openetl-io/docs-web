import { Card, Cards } from 'fumadocs-ui/components/card';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import Link from 'next/link';
import { connectorsSection, sections } from '@/lib/layout.shared';
import { docsRoute } from '@/lib/shared';
import { source } from '@/lib/source';
import { readSources } from '@/lib/sources';

export default function HomePage() {
  const { defaultVersion } = readSources();
  const base = `${docsRoute}/${defaultVersion}`;
  const index = source.getPage([defaultVersion]);
  const overview = source.getPage([defaultVersion, 'get-started', 'overview']);
  const quickstart = source.getPage([defaultVersion, 'get-started', 'quickstart']);
  const cards = [...sections(source.getPageTree(), defaultVersion), connectorsSection];

  return (
    <main className="mx-auto flex w-full max-w-(--fd-layout-width) flex-1 flex-col gap-12 px-4 py-16 md:px-8">
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">OpenETL documentation</h1>
        <p className="text-fd-muted-foreground max-w-2xl text-lg">
          {index?.data.description ??
            'Guides and reference for using, running, integrating and extending OpenETL.'}
        </p>
        <div className="flex flex-wrap gap-2">
          {overview && (
            <Link href={overview.url} className={buttonVariants({ color: 'primary' })}>
              {overview.data.title}
            </Link>
          )}
          {quickstart && (
            <Link href={quickstart.url} className={buttonVariants({ color: 'secondary' })}>
              {quickstart.data.title}
            </Link>
          )}
          {!overview && !quickstart && (
            <Link href={base} className={buttonVariants({ color: 'primary' })}>
              Read the docs
            </Link>
          )}
        </div>
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Find your way</h2>
        <Cards>
          {cards.map((s) => (
            <Card key={s.url} href={s.url} icon={s.icon} title={s.title} description={s.description} />
          ))}
        </Cards>
      </section>
    </main>
  );
}
