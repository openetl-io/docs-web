export const siteName = 'OpenETL';

// The site's own name: its home page's title, and the name a link to any of
// its pages shows where it's shared.
export const siteTitle = 'OpenETL documentation';

// Where the site is served: its canonical URLs, sitemap and llms.txt use it,
// so a preview deployment points search engines and readers here.
export const siteUrl = 'https://docs.openetl.io';

// OpenETL's website.
export const homeUrl = 'https://openetl.io';

export const repos = {
  openetl: 'openetl-io/openetl',
  connectors: 'openetl-io/openetl-connectors',
  site: 'openetl-io/docs-web',
} as const;

export const docsRoute = '/docs';
export const connectorsRoute = '/connectors';
export const markdownRoute = '/llms.mdx';
