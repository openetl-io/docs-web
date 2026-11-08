import fs from 'node:fs';
import path from 'node:path';
import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';
import { githubURL, readSources, siteRoot, type Sources, type Tree } from '../sources';

const posix = path.posix;
const toPosix = (p: string) => p.split(path.sep).join('/');

interface PathIndex {
  files: Set<string>;
  dirs: Set<string>;
}

const indexes = new WeakMap<string[], PathIndex>();

function pathIndex(tree: Tree): PathIndex {
  let index = indexes.get(tree.files);
  if (!index) {
    index = { files: new Set(tree.files), dirs: new Set() };
    for (const f of tree.files) {
      for (let d = posix.dirname(f); d !== '.'; d = posix.dirname(d)) index.dirs.add(d);
    }
    indexes.set(tree.files, index);
  }
  return index;
}

function treeOf(sources: Sources, file: string): Tree | undefined {
  return sources.trees.find((t) => file.startsWith(path.join(siteRoot, t.dir) + path.sep));
}

// The file's name in content/, for a file of the tree's repository folder.
function placedName(tree: Tree, inTree: string): string {
  for (const [placed, original] of Object.entries(tree.renamed ?? {})) {
    if (inTree === original) return placed;
    if (inTree.endsWith(`/${original}`)) return inTree.slice(0, -original.length) + placed;
  }
  return inTree;
}

function originalName(tree: Tree, placed: string): string {
  const base = posix.basename(placed);
  const original = tree.renamed?.[base];
  return original ? posix.join(posix.dirname(placed), original) : placed;
}

function slugOf(page: string): string {
  return page.replace(/\.mdx?$/, '').replace(/(^|\/)index$/, '');
}

// Links that leave the content: relative links to files outside the pages
// (an example, a manifest, a source file) point at GitHub at the ref the page
// was fetched from, and links to GitHub at main for pages the site has point
// at the site. Relative links between pages are left for createRelativeLink.
// A relative link to a path that isn't in the repository fails the build.
export function remarkSourceLinks() {
  return (tree: Root, file: { path?: string }) => {
    if (!file.path) return;
    const sources = readSources();
    const own = treeOf(sources, file.path);
    if (!own) return;
    const repoFile = posix.join(own.root, originalName(own, toPosix(path.relative(path.join(siteRoot, own.dir), file.path))));

    const hosted = (url: string): string | undefined => {
      const m = /^https:\/\/github\.com\/([^/]+\/[^/]+)\/(blob|tree)\/main\/([^#?]*)(#.*)?$/.exec(url);
      if (!m) return;
      const [, repo, kind, p, hash = ''] = m;
      if (repo === 'openetl-io/openetl') {
        const next = sources.trees.find((t) => t.dir === 'content/docs/next');
        if (!next) return;
        const inDocs = p === 'docs' || p === 'docs/' ? '' : p.startsWith('docs/') ? p.slice('docs/'.length) : undefined;
        if (inDocs === undefined) return;
        if (kind === 'tree' && inDocs === '') return `/docs/next${hash}`;
        if (kind === 'blob' && /\.md$/.test(inDocs) && fileExists(path.join(siteRoot, next.dir, inDocs))) {
          const slug = slugOf(inDocs);
          return `/docs/next${slug ? `/${slug}` : ''}${hash}`;
        }
      }
      if (repo === 'openetl-io/openetl-connectors' && kind === 'blob') {
        const pkg = /^([^/]+)\/README\.md$/.exec(p)?.[1];
        if (pkg && pkg in sources.connectors) return `/connectors/${pkg}${hash}`;
      }
    };

    const rewrite = (url: string): string => {
      const site = hosted(url);
      if (site) return site;
      if (!url.startsWith('./') && !url.startsWith('../')) return url;

      const hashAt = url.indexOf('#');
      const hash = hashAt < 0 ? '' : url.slice(hashAt);
      const rel = decodeURI(hashAt < 0 ? url : url.slice(0, hashAt));
      const target = posix.normalize(posix.join(posix.dirname(repoFile), rel)).replace(/\/$/, '');

      // A page the site has, in this tree or, for a connector package, another.
      for (const t of sources.trees) {
        if (t.repo !== own.repo || (t !== own && t.root === own.root)) continue;
        if (!target.startsWith(`${t.root}/`)) continue;
        const placed = placedName(t, target.slice(t.root.length + 1));
        if (!/\.mdx?$/.test(placed)) continue;
        const abs = path.join(siteRoot, t.dir, placed);
        if (!fileExists(abs)) continue;
        const fromHere = toPosix(path.relative(path.dirname(file.path!), abs));
        return (fromHere.startsWith('.') ? fromHere : `./${fromHere}`) + hash;
      }

      const index = pathIndex(own);
      if (index.files.has(target)) return githubURL(own.repo, 'blob', own.ref, target) + hash;
      if (target === '.' || index.dirs.has(target)) return githubURL(own.repo, 'tree', own.ref, target === '.' ? '' : target) + hash;
      throw new Error(`${own.repo} ${repoFile}: the link ${url} points at ${target}, which isn't in the repository at ${own.ref}`);
    };

    visit(tree, (node) => {
      if (node.type === 'link' || node.type === 'definition') node.url = rewrite(node.url);
    });
  };
}

function fileExists(p: string): boolean {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}
