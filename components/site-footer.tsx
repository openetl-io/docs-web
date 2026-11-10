import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { repos } from '@/lib/shared';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <Link href="/" className="site-footer-brand">
          <img src="/logo.svg" alt="" width={24} height={24} />
          <span>OpenETL <span className="text-fd-muted-foreground">/ Documentation</span></span>
        </Link>
        <nav aria-label="Footer" className="site-footer-links">
          <Link href="/changelog">Changelog</Link>
          <a href={`https://github.com/${repos.openetl}`}>
            GitHub <ArrowUpRight aria-hidden="true" size={14} />
          </a>
          <Link href="/llms.txt">llms.txt <ArrowUpRight aria-hidden="true" size={14} /></Link>
        </nav>
      </div>
    </footer>
  );
}
