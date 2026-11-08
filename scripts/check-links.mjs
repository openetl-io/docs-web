// Checks every link within the built site, out/, as readers get it: each
// href to a page or file of the site has to resolve to a file, and each
// fragment to an id on the page it points at. Links to other sites aren't
// checked. Exits 1, listing them, if any link is broken.
//
//   node scripts/check-links.mjs [OUT_DIR]

import fs from 'node:fs';
import path from 'node:path';

const out = path.resolve(process.argv[2] ?? 'out');
if (!fs.existsSync(out)) {
  console.error(`${out} doesn't exist: run pnpm build first`);
  process.exit(1);
}

const pages = fs
  .readdirSync(out, { recursive: true })
  .filter((f) => f.endsWith('.html'))
  .map((f) => f.split(path.sep).join('/'));

const ids = new Map();
function idsOf(file) {
  let set = ids.get(file);
  if (!set) {
    const html = fs.readFileSync(path.join(out, file), 'utf8');
    set = new Set([...html.matchAll(/\sid="([^"]*)"/g)].map((m) => decodeEntities(m[1])));
    ids.set(file, set);
  }
  return set;
}

function decodeEntities(s) {
  return s
    .replaceAll('&quot;', '"')
    .replaceAll('&#x27;', "'")
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

// The URL a page of out/ is served at: docs/next.html is /docs/next, and
// index.html is /.
function urlOf(file) {
  return `/${file.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '')}`;
}

// The file of out/ a pathname resolves to, as Cloudflare Pages serves it.
function fileOf(pathname) {
  const p = decodeURIComponent(pathname).replace(/^\/+/, '').replace(/\/$/, '');
  for (const candidate of [p, `${p}.html`, `${p}/index.html`, p === '' ? 'index.html' : undefined]) {
    if (candidate === undefined) continue;
    const abs = path.join(out, candidate);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return candidate;
  }
}

const broken = [];
for (const page of pages) {
  if (page === '404.html' || page.startsWith('_next/') || page.startsWith('_not-found')) continue;
  const html = fs.readFileSync(path.join(out, page), 'utf8');
  const base = new URL(urlOf(page), 'https://site.invalid');
  // Links in the page's content and chrome, not Next.js's own assets.
  for (const m of html.matchAll(/<a\s[^>]*?href="([^"]*)"/g)) {
    const href = decodeEntities(m[1]);
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) && !href.startsWith('https://site.invalid')) continue;
    const url = new URL(href, base);
    if (url.origin !== base.origin) continue;
    const target = fileOf(url.pathname);
    if (!target) {
      broken.push(`${urlOf(page)}: ${href}: no such page`);
      continue;
    }
    const fragment = decodeURIComponent(url.hash.slice(1));
    if (fragment && target.endsWith('.html') && !idsOf(target).has(fragment)) {
      broken.push(`${urlOf(page)}: ${href}: no #${fragment} on ${urlOf(target)}`);
    }
  }
}

if (broken.length > 0) {
  console.error(`${broken.length} broken links:\n${[...new Set(broken)].map((b) => `  ${b}`).join('\n')}`);
  process.exit(1);
}
console.log(`links: ${pages.length} pages checked, none broken`);
