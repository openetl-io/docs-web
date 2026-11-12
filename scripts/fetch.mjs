// Fetches the pages and the files the site renders from the content
// repositories into content/ (pages and meta.json files, which fumadocs-mdx
// reads), generated/ (sources.json, release notes, OpenAPI documents,
// connector descriptors and schemas), public/schemas/ (JSON Schemas published
// per version, and at the address each names as its $id), public/logos/ and
// public/_redirects. All are generated and not committed. Pages are copied as
// they are, except that {{version}} in openetl's pages becomes the release
// their version installs.
//
//   node scripts/fetch.mjs            openetl at main as next and at the newest
//                                     stable release as stable (from its line's
//                                     branch release-X.Y, if that has it, or
//                                     its tag), and openetl-connectors at main,
//                                     from GitHub
//   node scripts/fetch.mjs --local    the working trees of sibling checkouts
//                                     (OPENETL_DIR, CONNECTORS_DIR; default
//                                     ../openetl and ../openetl-connectors),
//                                     uncommitted changes included, as next
//   --local --dev                     the same, then `next dev`, copying again
//                                     on every change to the checkouts
//
// OPENETL_REMOTE and CONNECTORS_REMOTE replace the GitHub remotes (a fork, or
// a file:// URL). GITHUB_TOKEN, if set, authenticates to GitHub's API for the
// published releases and their notes; the repositories are public, so git
// needs none.

import { githubReleases } from '@fumadocs/changelog/github';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYAML } from 'yaml';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const local = args.has('--local');
const dev = args.has('--dev');

const OPENETL = 'openetl-io/openetl';
const CONNECTORS = 'openetl-io/openetl-connectors';
const remoteURL = (repo) =>
  ({ [OPENETL]: process.env.OPENETL_REMOTE, [CONNECTORS]: process.env.CONNECTORS_REMOTE })[repo] ||
  `https://github.com/${repo}.git`;

const contentDir = path.join(root, 'content');
const generatedDir = path.join(root, 'generated');
const schemasDir = path.join(root, 'public', 'schemas');
const logosDir = path.join(root, 'public', 'logos');
const cacheDir = path.join(root, '.cache', 'git');

// The paths of openetl the site reads, relative to the repository's root.
const OPENETL_DOCS = 'docs';
const OPENETL_OPENAPI = 'internal/api/openapi.yaml';
const OPENETL_SCHEMAS = {
  'connector.schema.json': 'internal/spec/connector.schema.json',
  'openetl-connector.schema.json': 'internal/connectorpkg/openetl-connector.schema.json',
  'manifest.schema.json': 'internal/declarative/manifest.schema.json',
  'event.schema.json': 'internal/events/event.schema.json',
};
// Each schema's $id is https://openetl.io/schemas/PATH, which openetl.io
// redirects to /schemas/PATH here.
const SCHEMA_ID = /^https:\/\/openetl\.io\/schemas\/([a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)*\.json)$/;
// A version's own folder of schemas, which an $id's path mustn't land in, or
// one of LEGACY_VERSIONS.
const VERSION_SLUG = /^(next|stable|v\d+-\d+)(\/|$)/;
// The versions the site had when each release line of openetl was one. Their
// paths redirect to the version the site shows by default.
const LEGACY_VERSIONS = ['v0-1'];
// Files in openetl's docs/ that are notes for its authors, not pages.
const NOT_PAGES = new Set(['AGENTS.md', 'CLAUDE.md']);
// What openetl's pages write where they name the release to install, without
// its v (v{{version}} where they need the tag). Each version's pages get its
// release: next's the newest of any kind, stable's its own.
const VERSION_PLACEHOLDER = '{{version}}';
const CONNECTOR_FILES = ['openetl-connector.yaml', 'source.schema.json', 'destination.schema.json'];

function git(cwd, ...argv) {
  return execFileSync('git', argv, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

// Semantic versions from tags such as v0.1.3 or postgres/v0.2.0-alpha.1.
// Returns undefined for a tag that isn't one.
function parseVersion(tag) {
  const m = /^v(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(tag);
  if (!m) return undefined;
  return { tag, major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] ? m[4].split('.') : [] };
}

function compareVersions(a, b) {
  for (const k of ['major', 'minor', 'patch']) if (a[k] !== b[k]) return a[k] - b[k];
  if (a.pre.length === 0 || b.pre.length === 0) return b.pre.length - a.pre.length;
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    const x = a.pre[i];
    const y = b.pre[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const nx = /^\d+$/.test(x);
    const ny = /^\d+$/.test(y);
    if (nx && ny && +x !== +y) return +x - +y;
    if (nx !== ny) return nx ? -1 : 1;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

// Each tag of repo, with the commit it points at.
function remoteTags(repo) {
  const tags = new Map();
  for (const line of git(root, 'ls-remote', '--tags', remoteURL(repo)).split('\n').filter(Boolean)) {
    const [sha, ref] = line.split('\t');
    const peeled = ref.endsWith('^{}');
    const tag = ref.slice('refs/tags/'.length).replace(/\^\{\}$/, '');
    // An annotated tag is listed twice: as itself, and peeled, as its commit.
    if (peeled || !tags.has(tag)) tags.set(tag, sha);
  }
  return tags;
}

// The release tags of repo, those parse reads a version from, with their
// commits and versions: the ones GitHub has published a release of, or every
// one when that isn't known.
function releaseTags(repo, published, parse) {
  const releases = [];
  const unpublished = [];
  for (const [tag, commit] of remoteTags(repo)) {
    const v = parse(tag);
    if (!v) continue;
    if (published && !published.has(tag)) unpublished.push(tag);
    else releases.push({ ...v, tag, commit });
  }
  if (unpublished.length > 0) console.log(`${repo}: ${unpublished.join(', ')} not published, skipped`);
  return releases;
}

// The tags GitHub has published a release of, drafts left out, in the order
// of GitHub's list of releases, newest first: a tag is pushed before its
// release workflow runs, and may never be released. Undefined, and every tag
// counts, when GitHub's releases of repo don't describe the remote
// (OPENETL_REMOTE or CONNECTORS_REMOTE replaces it), or can't be read
// (offline, or over the API's limit without GITHUB_TOKEN).
async function publishedReleases(repo) {
  if (remoteURL(repo) !== `https://github.com/${repo}.git`) return undefined;
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'openetl-docs-web' };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const tags = new Set();
  try {
    for (let page = 1; page <= 10; page++) {
      const res = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=100&page=${page}`, { headers });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const releases = await res.json();
      for (const r of releases) if (!r.draft) tags.add(r.tag_name);
      if (releases.length < 100) break;
    }
  } catch (err) {
    console.warn(`${repo}: releases: ${err.message}; every tag counts as released`);
    return undefined;
  }
  return tags;
}

// The tag of openetl's newest release of any kind, prerelease included: the
// first in GitHub's list, as install.sh resolves it, or, when that list isn't
// known, the highest version among releases. Undefined when there's none.
function newestRelease(published, releases) {
  if (published) {
    for (const tag of published) if (parseVersion(tag)) return tag;
  }
  let newest;
  for (const v of releases) if (!newest || compareVersions(v, newest) > 0) newest = v;
  return newest?.tag;
}

// The branches of repo matching pattern, such as release-*, with their commits.
function remoteBranches(repo, pattern) {
  const branches = new Map();
  for (const line of git(root, 'ls-remote', '--heads', remoteURL(repo), `refs/heads/${pattern}`).split('\n').filter(Boolean)) {
    const [sha, ref] = line.split('\t');
    branches.set(ref.slice('refs/heads/'.length), sha);
  }
  return branches;
}

// Whether commit is in branch's history, from a clone of its commits alone,
// made once per branch.
const histories = new Map();
function branchHas(repo, branch, commit) {
  const key = `${repo}@${branch}`;
  if (!histories.has(key)) {
    const dir = path.join(cacheDir, `${repo.replace('/', '__')}@${branch.replaceAll('/', '__')}.history`);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(dir), { recursive: true });
    execFileSync('git', ['clone', '--quiet', '--bare', '--filter=tree:0', '--single-branch', `--branch=${branch}`, remoteURL(repo), dir], { stdio: 'inherit' });
    histories.set(key, new Set(git(dir, 'rev-list', 'HEAD').split('\n')));
  }
  return histories.get(key).has(commit);
}

// A shallow, sparse, blobless clone of repo at ref with only paths checked out.
// Returns its directory, the commit and every path in the repository at ref.
function checkout(repo, ref, paths) {
  const dir = path.join(cacheDir, `${repo.replace('/', '__')}@${ref.replaceAll('/', '__')}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  execFileSync('git', ['-c', 'advice.detachedHead=false', 'clone', '--quiet', '--depth=1', '--filter=blob:none', '--sparse', `--branch=${ref}`, remoteURL(repo), dir], { stdio: 'inherit' });
  git(dir, 'sparse-checkout', 'set', '--no-cone', ...paths.map((p) => `/${p}`));
  return {
    dir,
    commit: git(dir, 'rev-parse', 'HEAD'),
    files: git(dir, 'ls-tree', '-r', '--name-only', 'HEAD').split('\n').filter(Boolean),
  };
}

// The working tree of a local checkout, untracked files included.
function workingTree(dir) {
  if (!fs.existsSync(dir)) throw new Error(`${dir} doesn't exist: set OPENETL_DIR and CONNECTORS_DIR to the checkouts`);
  return {
    dir,
    files: git(dir, 'ls-files', '--cached', '--others', '--exclude-standard').split('\n').filter(Boolean),
  };
}

// Makes dest hold exactly the files of src that keep() accepts, copying only
// what changed, so a running dev server sees one change per edit. transform,
// if given, returns what to write for a file, from its path in src and data.
function mirror(src, dest, keep = () => true, rename = (rel) => rel, transform) {
  const want = new Map();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      const rel = path.relative(src, abs);
      if (entry.isDirectory()) walk(abs);
      else if (entry.isFile() && keep(rel)) want.set(rename(rel), transform ? transform(rel, fs.readFileSync(abs)) : abs);
    }
  };
  if (fs.existsSync(src)) walk(src);
  sync(dest, want);
}

// Makes dest hold exactly the files of want, a map from a path relative to
// dest to the file to copy there, or to the data to write, copying only what
// changed.
function sync(dest, want) {
  if (fs.existsSync(dest)) {
    for (const rel of fs.readdirSync(dest, { recursive: true })) {
      const abs = path.join(dest, rel);
      if (fs.statSync(abs).isFile() && !want.has(rel)) fs.rmSync(abs);
    }
  }
  for (const [rel, from] of want) {
    const to = path.join(dest, rel);
    const data = Buffer.isBuffer(from) ? from : fs.readFileSync(from);
    if (fs.existsSync(to) && data.equals(fs.readFileSync(to))) continue;
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.writeFileSync(to, data);
  }
  removeEmptyDirs(dest);
}

function removeEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) removeEmptyDirs(path.join(dir, entry.name));
  }
  if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
}

function writeIfChanged(file, data) {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === data) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
}

function writeJSON(file, value) {
  writeIfChanged(file, `${JSON.stringify(value, null, 2)}\n`);
}

function copyFile(from, to) {
  if (!fs.existsSync(from)) return false;
  writeIfChanged(to, fs.readFileSync(from, 'utf8'));
  return true;
}

// A page with {{version}} replaced by the release version.installs names,
// such as 0.1.0-alpha; the same data when it has none. Pages are left as they
// are, and listed in unfilled, when the version has no release to name.
function fillVersion(version, rel, data, unfilled) {
  if (!/\.mdx?$/.test(rel) || !data.includes(VERSION_PLACEHOLDER)) return data;
  if (!version.installs) {
    unfilled.push(rel);
    return data;
  }
  return Buffer.from(data.toString('utf8').replaceAll(VERSION_PLACEHOLDER, version.installs));
}

// openetl's docs/ at one version, and the files published with it. Adds the
// version's JSON Schemas to schemas, a map from a path under public/schemas/
// to the file: in the version's folder, and at the path of the schema's $id,
// unless an earlier version (stable; next comes last) has it.
function placeVersion(version, tree, schemas) {
  const unfilled = [];
  mirror(
    path.join(tree.dir, OPENETL_DOCS),
    path.join(contentDir, 'docs', version.slug),
    (rel) => !NOT_PAGES.has(rel),
    undefined,
    (rel, data) => fillVersion(version, rel, data, unfilled),
  );
  if (unfilled.length > 0) {
    console.warn(`openetl ${version.checkout}: no release to fill ${VERSION_PLACEHOLDER} in with, so ${unfilled.join(', ')} show it as it is`);
  }
  if (!copyFile(path.join(tree.dir, OPENETL_OPENAPI), path.join(generatedDir, 'openapi', `${version.slug}.yaml`))) {
    console.warn(`openetl ${version.checkout}: no ${OPENETL_OPENAPI}`);
  }
  for (const [name, from] of Object.entries(OPENETL_SCHEMAS)) {
    const file = path.join(tree.dir, from);
    if (!fs.existsSync(file)) continue;
    schemas.set(path.join(version.slug, name), file);
    let id;
    try {
      id = JSON.parse(fs.readFileSync(file, 'utf8')).$id;
    } catch (err) {
      console.warn(`openetl ${version.checkout}: ${from}: ${err.message}`);
      continue;
    }
    const idPath = SCHEMA_ID.exec(id ?? '')?.[1];
    if (!idPath || idPath.split('/').includes('..') || VERSION_SLUG.test(idPath)) {
      console.warn(`openetl ${version.checkout}: ${from}: $id ${id} isn't https://openetl.io/schemas/PATH.json, so it's published in ${version.slug}/ only`);
      continue;
    }
    const at = path.join(...idPath.split('/'));
    if (!schemas.has(at)) schemas.set(at, file);
  }
  return { dir: `content/docs/${version.slug}`, repo: OPENETL, ref: version.ref, root: OPENETL_DOCS, files: tree.files };
}

// A logo that is a file beside openetl-connector.yaml, such as ./logo.svg,
// rather than an https URL.
const LOGO_FILE = /^[^:/][^:]*\.(svg|png)$/;
const MAX_LOGO = 1 << 20;

function readDescriptor(pkg) {
  const file = path.join(generatedDir, 'connectors', pkg, 'openetl-connector.yaml');
  return fs.existsSync(file) ? parseYAML(fs.readFileSync(file, 'utf8')) : undefined;
}

// Saves a package's logo as public/logos/PKG.EXT, replacing one of another
// type, and records where it came from in generated/connectors/PKG/logo.json.
function saveLogo(pkg, source, ext, data) {
  const to = path.join(logosDir, `${pkg}.${ext}`);
  fs.mkdirSync(logosDir, { recursive: true });
  for (const f of fs.readdirSync(logosDir)) {
    if (f.startsWith(`${pkg}.`) && f !== `${pkg}.${ext}`) fs.rmSync(path.join(logosDir, f));
  }
  if (!fs.existsSync(to) || !data.equals(fs.readFileSync(to))) fs.writeFileSync(to, data);
  writeJSON(path.join(generatedDir, 'connectors', pkg, 'logo.json'), { url: source, file: `/logos/${pkg}.${ext}` });
}

function removeLogo(pkg) {
  fs.rmSync(path.join(generatedDir, 'connectors', pkg, 'logo.json'), { force: true });
  if (!fs.existsSync(logosDir)) return;
  for (const f of fs.readdirSync(logosDir)) if (f.startsWith(`${pkg}.`)) fs.rmSync(path.join(logosDir, f));
}

// A package's logo when it's a file in the package: copied from the checkout,
// which fetchLogos, for an https URL, can't.
function placeLogoFile(pkg, packageDir) {
  const logo = readDescriptor(pkg)?.logo;
  if (typeof logo !== 'string' || !LOGO_FILE.test(logo)) return;
  const from = path.resolve(packageDir, logo);
  try {
    if (!from.startsWith(`${packageDir}${path.sep}`)) throw new Error('not in the package');
    const data = fs.readFileSync(from);
    if (data.length > MAX_LOGO) throw new Error(`${data.length} bytes, over 1 MiB`);
    saveLogo(pkg, logo, path.extname(from).slice(1), data);
  } catch (err) {
    console.warn(`${pkg}: logo ${logo}: ${err.code === 'ENOENT' ? 'no such file' : err.message}`);
    removeLogo(pkg);
  }
}

// A connector package: its README.md is its page (index.md here, so the
// package's folder is the page), its docs/ the pages under it.
function placeConnector(pkg, tree, ref) {
  const keep = (rel) => rel === 'README.md' || rel.startsWith(`docs${path.sep}`);
  const rename = (rel) => (rel === 'README.md' ? 'index.md' : rel);
  mirror(path.join(tree.dir, pkg), path.join(contentDir, 'connectors', pkg), keep, rename);
  for (const name of CONNECTOR_FILES) {
    const to = path.join(generatedDir, 'connectors', pkg, name);
    if (!copyFile(path.join(tree.dir, pkg, name), to)) fs.rmSync(to, { force: true });
  }
  placeLogoFile(pkg, path.join(tree.dir, pkg));
  return {
    dir: `content/connectors/${pkg}`,
    repo: CONNECTORS,
    ref,
    root: pkg,
    renamed: { 'index.md': 'README.md' },
    files: tree.files,
  };
}

function connectorPackages(files) {
  return files
    .filter((f) => f.split('/').length === 2 && f.endsWith('/openetl-connector.yaml'))
    .map((f) => f.split('/')[0])
    .sort();
}

function writeIndexes(versions, packages) {
  // The site's own meta.json files: the versions, stable first, and
  // the connector packages by title.
  const title = (pkg) => readDescriptor(pkg)?.title || pkg;
  const byTitle = [...packages].sort((a, b) => title(a).localeCompare(title(b)));
  writeJSON(path.join(contentDir, 'docs', 'meta.json'), { pages: versions.map((v) => v.slug) });
  writeJSON(path.join(contentDir, 'connectors', 'meta.json'), { title: 'Connectors', pages: byTitle });
}

// published: each repository's published releases, from publishedReleases.
function fetchRemote(published) {
  const trees = [];
  const schemas = new Map();

  // openetl: the newest stable line as stable, and main as next. A release
  // with a suffix, such as v0.2.0-alpha.1 or v0.2.0-rc.1, is a prerelease,
  // whose docs are next's. stable's pages come from the line's branch,
  // release-X.Y, which fixes to its docs go to, when the branch has the line's
  // newest release; otherwise from that release's tag, such as v0.2.0.
  const releases = releaseTags(OPENETL, published.openetl, parseVersion);
  const newest = newestRelease(published.openetl, releases);
  let stable;
  for (const v of releases) if (v.pre.length === 0 && (!stable || compareVersions(v, stable) > 0)) stable = v;
  const candidates = [];
  if (stable) {
    const name = `release-${stable.major}.${stable.minor}`;
    let branch;
    if (remoteBranches(OPENETL, name).has(name)) {
      if (branchHas(OPENETL, name, stable.commit)) branch = name;
      else console.warn(`openetl ${name} doesn't have ${stable.tag}: stable's docs are built from the tag`);
    }
    candidates.push({ slug: 'stable', title: stable.tag, checkout: branch ?? stable.tag, release: stable.tag, branch, installs: stable.tag.slice(1) });
  }
  candidates.push({ slug: 'next', title: 'next', checkout: 'main', branch: 'main', installs: newest?.slice(1) });

  // A release from before openetl had docs/ has no version on the site.
  const versions = [];
  const sparse = [`${OPENETL_DOCS}/`, OPENETL_OPENAPI, ...Object.values(OPENETL_SCHEMAS)];
  for (const candidate of candidates) {
    const tree = checkout(OPENETL, candidate.checkout, sparse);
    if (!fs.existsSync(path.join(tree.dir, OPENETL_DOCS, 'meta.json'))) {
      console.log(`openetl ${candidate.checkout}: no ${OPENETL_DOCS}/meta.json, skipped`);
      continue;
    }
    // Links to GitHub point at the tag, or at the commit of a branch, which
    // moves.
    const version = { ...candidate, ref: candidate.checkout === candidate.release ? candidate.release : tree.commit };
    const from = candidate.branch && candidate.release ? `${candidate.branch} (${candidate.release})` : candidate.checkout;
    console.log(`openetl ${from} → ${version.slug}, ${VERSION_PLACEHOLDER} ${version.installs ?? 'unfilled'}`);
    versions.push(version);
    trees.push(placeVersion(version, tree, schemas));
  }

  // openetl-connectors: every package's page and files from main, so a fix to
  // them is on the site without a release. Each package's newest published
  // release, from its tags such as postgres/v0.2.0, is named beside its page.
  const newestOfPackage = new Map();
  const packageVersion = (tag) => {
    const [pkg, rest, ...more] = tag.split('/');
    const v = rest && more.length === 0 ? parseVersion(rest) : undefined;
    return v && { ...v, pkg };
  };
  for (const v of releaseTags(CONNECTORS, published.connectors, packageVersion)) {
    if (!newestOfPackage.has(v.pkg) || compareVersions(v, newestOfPackage.get(v.pkg)) > 0) newestOfPackage.set(v.pkg, v);
  }
  const main = checkout(CONNECTORS, 'main', ['*/openetl-connector.yaml']);
  const packages = connectorPackages(main.files);
  git(main.dir, 'sparse-checkout', 'set', '--no-cone', ...packages.map((pkg) => `/${pkg}/`));
  console.log(`openetl-connectors main → ${packages.map((pkg) => `${pkg} (${newestOfPackage.get(pkg)?.tag ?? 'unreleased'})`).join(', ')}`);
  // Links to GitHub point at main's commit, which moves.
  const connectorRefs = {};
  for (const pkg of packages) {
    trees.push(placeConnector(pkg, main, main.commit));
    connectorRefs[pkg] = { release: newestOfPackage.get(pkg)?.tag, ref: main.commit, branch: 'main' };
  }

  return { versions, packages, trees, connectorRefs, schemas };
}

// --local: openetl's newest release, which next's {{version}} names, from
// GitHub's releases or else the remote's tags. Undefined offline, when pages
// show the placeholder as it is.
function localNewest(published) {
  if (published) return newestRelease(published, []);
  try {
    return newestRelease(undefined, releaseTags(OPENETL, undefined, parseVersion));
  } catch (err) {
    console.warn(`openetl: tags: ${err.message.split('\n').find((l) => l.startsWith('fatal:')) ?? err.message}`);
    return undefined;
  }
}

// newest: the tag of openetl's newest release, from localNewest.
function fetchLocal(newest) {
  const openetlDir = path.resolve(root, process.env.OPENETL_DIR ?? '../openetl');
  const connectorsDir = path.resolve(root, process.env.CONNECTORS_DIR ?? '../openetl-connectors');
  const version = { slug: 'next', title: 'next', checkout: 'main', ref: 'main', branch: 'main', installs: newest?.slice(1) };
  console.log(`openetl ${openetlDir} → next, ${VERSION_PLACEHOLDER} ${version.installs ?? 'unfilled'}`);

  const openetl = workingTree(openetlDir);
  const schemas = new Map();
  const trees = [placeVersion(version, openetl, schemas)];
  const connectors = workingTree(connectorsDir);
  const packages = connectorPackages(connectors.files);
  const connectorRefs = {};
  for (const pkg of packages) {
    trees.push(placeConnector(pkg, connectors, 'main'));
    connectorRefs[pkg] = { ref: 'main', branch: 'main' };
  }
  return { versions: [version], packages, trees, connectorRefs, schemas, dirs: [openetlDir, connectorsDir] };
}

// GitHub Releases: openetl's, and each connector package's from its tags.
// A failure (offline, or rate limited without GITHUB_TOKEN) leaves the
// changelog empty with the reason, rather than failing the fetch.
async function fetchChangelog(packages) {
  const releases = async (repo) => {
    const [owner, name] = repo.split('/');
    const out = [];
    for (let page = 1; page !== undefined && page <= 10; ) {
      const result = await githubReleases({ owner, repo: name, token: process.env.GITHUB_TOKEN, page, perPage: 100 });
      out.push(...result.entries);
      page = result.nextPage;
    }
    return out.map((e) => ({
      id: e.id,
      title: e.title,
      date: new Date(e.date).toISOString(),
      url: e.url,
      content: e.content,
      prerelease: e.prerelease,
    }));
  };
  try {
    const openetl = await releases(OPENETL);
    const connectors = Object.fromEntries(packages.map((p) => [p, []]));
    for (const r of await releases(CONNECTORS)) {
      const pkg = r.id.split('/')[0];
      if (pkg in connectors) connectors[pkg].push(r);
    }
    return { openetl, connectors };
  } catch (err) {
    console.warn(`changelog: ${err.message}`);
    return { openetl: [], connectors: {}, error: err.message };
  }
}

const logoTypes = { 'image/svg+xml': 'svg', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

// Each package's logo, from the URL in its openetl-connector.yaml, served by
// the site so readers' browsers don't fetch it from a third party.
// A logo that's a file in the package is copied with the package, by
// placeLogoFile.
async function fetchLogos(packages) {
  fs.mkdirSync(logosDir, { recursive: true });
  for (const pkg of packages) {
    const info = path.join(generatedDir, 'connectors', pkg, 'logo.json');
    const url = readDescriptor(pkg)?.logo;
    if (typeof url === 'string' && LOGO_FILE.test(url)) continue;
    if (!url) {
      removeLogo(pkg);
      continue;
    }
    const known = fs.existsSync(info) ? JSON.parse(fs.readFileSync(info, 'utf8')) : undefined;
    if (known?.url === url && known.file && fs.existsSync(path.join(root, 'public', known.file))) continue;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'follow' });
      const type = res.headers.get('content-type')?.split(';')[0].trim();
      const ext = logoTypes[type];
      if (!res.ok || !ext) throw new Error(`${res.status} ${type ?? 'no content type'}`);
      const data = Buffer.from(await res.arrayBuffer());
      if (data.length > MAX_LOGO) throw new Error(`${data.length} bytes, over 1 MiB`);
      saveLogo(pkg, url, ext, data);
    } catch (err) {
      console.warn(`${pkg}: logo ${url}: ${err.message}`);
    }
  }
}

function run(published) {
  const result = local ? fetchLocal(published.newest) : fetchRemote(published);
  const { versions, packages, trees, connectorRefs, schemas } = result;
  sync(schemasDir, schemas);

  // Remove what an earlier run placed that this one didn't.
  const keepVersions = new Set(versions.map((v) => v.slug));
  const docsDir = path.join(contentDir, 'docs');
  if (fs.existsSync(docsDir)) {
    for (const entry of fs.readdirSync(docsDir, { withFileTypes: true })) {
      if (entry.isDirectory() && !keepVersions.has(entry.name)) fs.rmSync(path.join(docsDir, entry.name), { recursive: true });
    }
  }
  if (fs.existsSync(logosDir)) {
    for (const f of fs.readdirSync(logosDir)) {
      if (!packages.includes(f.replace(/\.[^.]*$/, ''))) fs.rmSync(path.join(logosDir, f));
    }
  }
  const openapiDir = path.join(generatedDir, 'openapi');
  if (fs.existsSync(openapiDir)) {
    for (const f of fs.readdirSync(openapiDir)) {
      if (!keepVersions.has(f.replace(/\.yaml$/, ''))) fs.rmSync(path.join(openapiDir, f));
    }
  }
  for (const dir of [path.join(contentDir, 'connectors'), path.join(generatedDir, 'connectors')]) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && !packages.includes(entry.name)) fs.rmSync(path.join(dir, entry.name), { recursive: true });
    }
  }

  writeIndexes(versions, packages);
  // Cloudflare's redirects: /docs, and the paths of LEGACY_VERSIONS, to the
  // version the site shows by default.
  const to = versions[0].slug;
  const redirects = [`/docs /docs/${to}`];
  for (const slug of LEGACY_VERSIONS.filter((s) => !keepVersions.has(s))) {
    redirects.push(
      `/docs/${slug} /docs/${to}`,
      `/docs/${slug}/* /docs/${to}/:splat`,
      `/llms.mdx/docs/${slug}.md /llms.mdx/docs/${to}.md`,
      `/llms.mdx/docs/${slug}/* /llms.mdx/docs/${to}/:splat`,
      `/schemas/${slug}/* /schemas/${to}/:splat`,
    );
  }
  writeIfChanged(path.join(root, 'public', '_redirects'), redirects.map((r) => `${r} 302\n`).join(''));
  // Compiled pages hold links resolved against these sources, which Next.js's
  // cache doesn't know about: a fetch of other refs starts it afresh.
  const sourcesFile = path.join(generatedDir, 'sources.json');
  const fingerprint = (s) => JSON.stringify([s.local, s.trees.map((t) => [t.dir, t.repo, t.ref])]);
  const previous = fs.existsSync(sourcesFile) ? JSON.parse(fs.readFileSync(sourcesFile, 'utf8')) : undefined;
  if (previous && fingerprint(previous) !== fingerprint({ local, trees })) {
    fs.rmSync(path.join(root, '.next'), { recursive: true, force: true });
  }
  writeJSON(sourcesFile, {
    local,
    // The version the site shows by default: stable, or next until there's a
    // stable release.
    defaultVersion: versions[0].slug,
    versions: versions.map(({ slug, title, ref, release, branch, installs }) => ({ slug, title, ref, release, branch, installs })),
    connectors: connectorRefs,
    trees,
  });
  return result;
}

// What counts as a release, read once: a run in --dev reads the working trees
// again, not the releases. --local needs only openetl's newest.
const published = local
  ? { newest: localNewest(await publishedReleases(OPENETL)) }
  : { openetl: await publishedReleases(OPENETL), connectors: await publishedReleases(CONNECTORS) };
let result = run(published);
await fetchLogos(result.packages);
writeJSON(path.join(generatedDir, 'changelog.json'), await fetchChangelog(result.packages));
console.log(`content/: ${result.versions.map((v) => v.slug).join(', ')}; connectors: ${result.packages.join(', ')}`);

if (dev) {
  if (!local) throw new Error('--dev works with --local');
  let timer;
  const [openetlDir, connectorsDir] = result.dirs;
  const openetlPaths = [`${OPENETL_DOCS}/`, OPENETL_OPENAPI, ...Object.values(OPENETL_SCHEMAS)];
  const watched = [
    [openetlDir, (file) => openetlPaths.some((p) => file === p || file.startsWith(p))],
    [connectorsDir, (file) => !file.startsWith('.git') && file.includes('/')],
  ];
  for (const [dir, relevant] of watched) {
    fs.watch(dir, { recursive: true }, (_event, file) => {
      if (!file || !relevant(file.split(path.sep).join('/'))) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          result = run(published);
        } catch (err) {
          console.error(err.message);
        }
      }, 150);
    });
  }
  console.log(`watching ${openetlDir} and ${connectorsDir}`);

  const next = spawn('next', ['dev'], { stdio: 'inherit' });
  next.on('exit', (code) => process.exit(code ?? 0));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => next.kill(signal));
}
