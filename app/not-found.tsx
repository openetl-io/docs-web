import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { HomeSearch } from '@/components/home-search';
import { HomeShell } from '@/components/home-shell';
import { SiteFooter } from '@/components/site-footer';
import { baseOptions } from '@/lib/layout.shared';

export default function NotFound() {
  return (
    <HomeShell {...baseOptions()}>
      <main id="main-content" tabIndex={-1} className="home-main flex flex-1 flex-col items-start justify-center gap-6 py-24">
        <p className="home-label">404 / Page not found</p>
        <h1 className="text-4xl font-medium tracking-tight sm:text-5xl">There&apos;s no page here.</h1>
        <p className="text-fd-muted-foreground max-w-md leading-relaxed">
          This page may have moved, or it may not exist in this version. Search the docs to find what you need.
        </p>
        <HomeSearch />
        <Link href="/" className="home-explore-link">
          <ArrowLeft aria-hidden="true" size={16} /> Back to the home page
        </Link>
      </main>
      <SiteFooter />
    </HomeShell>
  );
}
