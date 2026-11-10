import { ArrowDown, ArrowRight, BookOpen, Terminal } from 'lucide-react';
import Link from 'next/link';
import { HomeSearch } from '@/components/home-search';
import { connectorsSection, sections } from '@/lib/layout.shared';
import { docsRoute } from '@/lib/shared';
import { source } from '@/lib/source';
import { readSources } from '@/lib/sources';

export default function HomePage() {
  const { defaultVersion, versions } = readSources();
  const base = `${docsRoute}/${defaultVersion}`;
  const index = source.getPage([defaultVersion]);
  const overview = source.getPage([defaultVersion, 'get-started', 'overview']);
  const quickstart = source.getPage([defaultVersion, 'get-started', 'quickstart']);
  const cards = [...sections(source.getPageTree(), defaultVersion), connectorsSection];
  const version = versions.find((v) => v.slug === defaultVersion);

  return (
    <main id="main-content" tabIndex={-1} className="home-main">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-intro">
          <div className="home-eyebrow">
            <span className="home-status-dot" aria-hidden="true" />
            The documentation
            <Link href={base} className="home-version">{version?.release ?? version?.title ?? defaultVersion}</Link>
          </div>
          <h1 id="home-title">OpenETL <span>documentation.</span></h1>
          <p className="home-description">
            {index?.data.description ??
              'Guides and reference for using, running, integrating and extending OpenETL.'}
          </p>
          <a href="#explore" className="home-explore-link">
            Explore the docs <ArrowDown aria-hidden="true" size={16} />
          </a>
        </div>
        <div className="home-start">
          <p className="home-label">New to OpenETL? Start here.</p>
          {quickstart && (
            <Link href={quickstart.url} className="home-start-link home-start-primary">
              <Terminal aria-hidden="true" size={22} />
              <span>
                <span className="home-start-title">{quickstart.data.title}</span>
                <span className="home-start-description">{quickstart.data.description}</span>
              </span>
              <ArrowRight aria-hidden="true" className="home-arrow" size={20} />
            </Link>
          )}
          {overview && (
            <Link href={overview.url} className="home-start-link">
              <BookOpen aria-hidden="true" size={22} />
              <span>
                <span className="home-start-title">{overview.data.title}</span>
                <span className="home-start-description">{overview.data.description}</span>
              </span>
              <ArrowRight aria-hidden="true" className="home-arrow" size={20} />
            </Link>
          )}
          {!overview && !quickstart && (
            <Link href={base} className="home-start-link home-start-primary">
              <BookOpen aria-hidden="true" size={22} />
              <span className="home-start-title">Read the docs</span>
              <ArrowRight aria-hidden="true" className="home-arrow" size={20} />
            </Link>
          )}
        </div>
      </section>
      <div className="home-search-strip">
        <p>Know what you&apos;re looking for?</p>
        <HomeSearch />
      </div>
      <section id="explore" className="home-directory" aria-labelledby="explore-title">
        <div className="home-directory-heading">
          <div>
            <p className="home-label">Explore the docs</p>
            <h2 id="explore-title">Find your way.</h2>
          </div>
          <p>From your first pipeline to the details.</p>
        </div>
        <div className="home-directory-grid">
          {cards.map((s, i) => (
            <Link key={s.url} href={s.url} className="home-directory-link">
              <span className="home-directory-number" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <span className="home-directory-copy">
                <span className="home-directory-title">{s.title}</span>
                {s.description && <span className="home-directory-description">{s.description}</span>}
              </span>
              <span className="home-directory-icon" aria-hidden="true">{s.icon}</span>
              <ArrowRight aria-hidden="true" className="home-arrow" size={18} />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
