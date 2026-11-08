import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  // A static site: Cloudflare Pages serves out/.
  output: 'export',
  images: { unoptimized: true },
  reactStrictMode: true,
  // next dev otherwise appends its own notes to AGENTS.md.
  agentRules: false,
  turbopack: { root: import.meta.dirname },
};

export default withMDX(config);
