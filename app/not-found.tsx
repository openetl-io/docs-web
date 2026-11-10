import Link from 'next/link';
import { HomeSearch } from '@/components/home-search';
import { HomeShell } from '@/components/home-shell';
import { SiteFooter } from '@/components/site-footer';
import { baseOptions } from '@/lib/layout.shared';

export default function NotFound() {
  return (
    <HomeShell {...baseOptions()}>
      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center outline-none">
        <h1 className="text-2xl font-semibold">There&apos;s no page here</h1>
        <p className="text-fd-muted-foreground max-w-md leading-relaxed">
          This page may have moved, or it may not exist in this version. Search the docs to find what you need.
        </p>
        <HomeSearch />
        <Link href="/" className="hover:text-fd-primary focus-visible:ring-fd-ring inline-flex min-h-11 items-center rounded-md underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none">
          Back to the home page
        </Link>
      </main>
      <SiteFooter />
    </HomeShell>
  );
}
