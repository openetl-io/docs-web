import Link from 'next/link';
import { repos } from '@/lib/shared';

export function SiteFooter() {
  return (
    <footer className="text-fd-muted-foreground border-t text-sm">
      <div className="mx-auto flex w-full max-w-(--fd-layout-width) flex-wrap items-center justify-between gap-x-8 gap-y-2 px-4 py-4 md:px-8">
        <span>OpenETL documentation</span>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:rounded-md [&_a]:underline-offset-4 [&_a:hover]:text-fd-foreground [&_a:hover]:underline [&_a:focus-visible]:ring-2 [&_a:focus-visible]:ring-fd-ring [&_a:focus-visible]:outline-none">
          <Link href="/changelog">Changelog</Link>
          <a href={`https://github.com/${repos.openetl}`}>GitHub</a>
          <Link href="/llms.txt">llms.txt</Link>
        </nav>
      </div>
    </footer>
  );
}
