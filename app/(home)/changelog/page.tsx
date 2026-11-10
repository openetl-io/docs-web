import { Markdown } from 'fumadocs-core/content/md';
import type { Metadata } from 'next';
import { readChangelog } from '@/lib/changelog';
import { repos } from '@/lib/shared';

export const metadata: Metadata = {
  title: 'Changelog',
  description: "OpenETL's releases and their notes.",
};

export default function ChangelogPage() {
  const changelog = readChangelog();
  const entries = changelog.openetl;
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-16 outline-none">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Changelog</h1>
        <p className="text-fd-muted-foreground">
          OpenETL&apos;s releases, from{' '}
          <a className="underline" href={`https://github.com/${repos.openetl}/releases`}>
            GitHub Releases
          </a>
          . Each connector&apos;s releases are on its page.
        </p>
      </div>
      {entries.length === 0 && (
        <p>{changelog.error ? `The releases couldn't be fetched: ${changelog.error}` : 'OpenETL has no releases yet.'}</p>
      )}
      {entries.map((e) => (
        <article key={e.id} className="flex flex-col gap-3 border-t pt-8">
          <header className="flex flex-wrap items-baseline gap-x-3">
            <h2 id={e.id} className="text-xl font-semibold">
              <a href={e.url}>{e.title}</a>
            </h2>
            <time className="text-fd-muted-foreground text-sm" dateTime={e.date}>
              {new Date(e.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </time>
            {e.prerelease && <span className="text-fd-muted-foreground text-sm">Pre-release</span>}
          </header>
          {e.content && (
            <div className="prose">
              <Markdown>{e.content}</Markdown>
            </div>
          )}
        </article>
      ))}
    </main>
  );
}
