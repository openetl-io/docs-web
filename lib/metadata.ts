import type { Metadata } from 'next';
import { homeUrl, siteName, siteTitle, siteUrl } from './shared';

// What OpenETL is, in one sentence: the home page's description, and the
// summary that opens llms.txt.
export const definition =
  'OpenETL is a self-hosted, open-source data integration platform for batch and streaming ETL and ELT pipelines.';

// The picture that a link to any page of the site shows where it's shared:
// public/social-card.png, which scripts/social-card.mjs draws.
const socialImage = { url: '/social-card.png', width: 1200, height: 630, alt: siteTitle };

// A page's title in the browser's tab is the page's own, then the site's name
// (app/layout.tsx), unless it already starts with that name, as "OpenETL
// documentation" does.
function documentTitle(title: string | undefined): Metadata['title'] {
  return title?.startsWith(siteName) ? { absolute: title } : title;
}

// A page's title, description, canonical URL (a path) and Markdown copy, if it
// has one, and the same for the cards that show a link to it where it's
// shared: Open Graph's, and Twitter's, which X and others read. Each page
// gives all of them, as Next.js replaces a parent's openGraph or twitter
// rather than merging it.
export function pageMetadata({
  title,
  description,
  url,
  type,
  markdown,
}: {
  title: string | undefined;
  description?: string;
  url: string;
  type: 'website' | 'article';
  markdown?: string;
}): Metadata {
  return {
    title: documentTitle(title),
    description,
    alternates: { canonical: url, ...(markdown ? { types: { 'text/markdown': markdown } } : {}) },
    openGraph: { type, siteName: siteTitle, title, description, url, images: [socialImage] },
    twitter: { card: 'summary_large_image', title, description, images: [socialImage] },
  };
}

// The card of a page that gives no metadata of its own, such as the 404.
export const defaultSocial: Pick<Metadata, 'openGraph' | 'twitter'> = {
  openGraph: { type: 'website', siteName: siteTitle, images: [socialImage] },
  twitter: { card: 'summary_large_image', images: [socialImage] },
};

// Structured data, as JSON-LD (components/json-ld.tsx).

// The organization behind OpenETL, as openetl.io describes it, by its @id
// there.
const organizationId = `${homeUrl}/#organization`;

// The home page's: the site, published by the organization of openetl.io.
export function websiteJsonLd(description: string) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: `${siteUrl}/`,
        name: siteTitle,
        description,
        inLanguage: 'en',
        publisher: { '@id': organizationId },
      },
      { '@type': 'Organization', '@id': organizationId, name: siteName, url: homeUrl },
    ],
  };
}

export interface Crumb {
  name: string;
  // A path of the site.
  url: string;
}

// The way to a page, from the first crumb to the page itself. Undefined for a
// way of one crumb, which says nothing.
export function breadcrumbJsonLd(crumbs: Crumb[]) {
  if (crumbs.length < 2) return undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: `${siteUrl}${c.url}`,
    })),
  };
}
