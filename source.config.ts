import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { remarkMdxMermaid } from 'fumadocs-core/mdx-plugins';
import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { remarkGitHubAlerts } from './lib/remark/github-alerts';
import { remarkSourceLinks } from './lib/remark/source-links';

// openetl's docs/, one folder per version, as scripts/fetch.mjs placed them.
export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema,
    postprocess: { includeProcessedMarkdown: true },
  },
  meta: { schema: metaSchema, files: ['**/meta.json'] },
});

// Each connector package's README.md, as index.md, and its docs/.
export const connectors = defineDocs({
  dir: 'content/connectors',
  docs: {
    schema: pageSchema,
    postprocess: { includeProcessedMarkdown: true },
  },
  meta: { schema: metaSchema, files: ['**/meta.json'] },
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: (defaults) => [remarkGitHubAlerts, remarkSourceLinks, remarkMdxMermaid, ...defaults],
    // A language Shiki doesn't know, such as promql, shows as plain text, as on GitHub.
    rehypeCodeOptions: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
      fallbackLanguage: 'text',
    },
  },
});
