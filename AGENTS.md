# Working on docs-web

For people and coding agents. This repository builds OpenETL's documentation site with Fumadocs, as a static site that Cloudflare serves at [docs.openetl.io](https://docs.openetl.io). It owns the site's layout, theme, components, home page and build. It owns no documentation: every page comes from the repository whose code it describes, so the pages change in the same pull requests as the code.

## Where the pages come from

| Pages | From | On the site |
|---|---|---|
| OpenETL's docs | [openetl](https://github.com/openetl-io/openetl): `docs/`, with its `meta.json` files | The docs, one copy per version: `next`, and `stable` once there's a stable release |
| The official connectors | [openetl-connectors](https://github.com/openetl-io/openetl-connectors): each package's `README.md` (and `<package>/docs/`, if it has one), `openetl-connector.yaml`, and its `source.schema.json` and `destination.schema.json` | Connectors: a page per package |
| The API reference | openetl's `internal/api/openapi.yaml`, generated from its protos | The Reference section, per version |
| JSON Schemas | openetl's `internal/spec/connector.schema.json` (a connector descriptor), `internal/connectorpkg/openetl-connector.schema.json` (the authored `openetl-connector.yaml`), `internal/declarative/manifest.schema.json` (a declarative source's manifest) and `internal/events/event.schema.json` (an event) | Published as files for editors and validators: per version, and at the path each schema's `$id` names |
| Release notes | GitHub Releases of openetl, and of each connector package (tags such as `postgres/v0.2.0`) | Changelog pages |

The format the pages follow is [openetl's docs/AGENTS.md](https://github.com/openetl-io/openetl/blob/main/docs/AGENTS.md): Markdown in `.md` files, frontmatter with `title` and `description`, no `# H1`, a `meta.json` per folder, relative links starting with `./` or `../`, GitHub's alert syntax for callouts, `mermaid` code blocks for diagrams, and no raw HTML. The site reads exactly that, so a page reads the same on GitHub and here. Don't ask the content repositories for anything that GitHub wouldn't render.

## The build

1. **Fetch.** `scripts/fetch.mjs` checks out openetl at `main` and at its newest stable release, once it has one (see [Versions](#versions)), and openetl-connectors at each package's newest release or `main`, once per commit, as packages released at the same commit share one: shallow, sparse and blobless clones of only the paths above, in `.cache/`. It copies the pages and `meta.json` files into `content/`, the OpenAPI documents, connector descriptors and schemas into `generated/`, and the JSON Schemas into `public/schemas/` (see [Schemas](#schemas)). It puts each connector's logo in `public/logos/`, so readers' browsers don't fetch it from a third party: downloaded when `openetl-connector.yaml` names an https URL, copied when it names a file in the package. It fetches the release notes into `generated/changelog.json`. It writes `generated/sources.json`, which says what came from which repository at which commit or tag, and `public/_redirects`. All of these are generated and not committed. The one change it makes to a page is to replace `{{version}}` in openetl's pages with the release their version installs (see [Versions](#versions)); anything else that has to change, the plugins change at render time. A package's `README.md` is placed as its folder's `index.md`.
2. **Render.** `fumadocs-mdx` reads `content/` (`source.config.ts`; `.md` files parse as Markdown, not MDX), and `lib/source.tsx` loads it. The build adds:
   - `lib/remark/github-alerts.ts`, which turns `> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` and `[!CAUTION]` blockquotes into Fumadocs `Callout`s titled as GitHub titles them;
   - `createRelativeLink` for links between pages, and `lib/remark/source-links.ts`, which points relative links leaving the pages (an example, a manifest, a source file) at GitHub, at the commit or tag the page was fetched from: `https://github.com/openetl-io/REPO/blob/REF/PATH`, or `tree` for a folder. It points links to GitHub at `main` for a page the site has (openetl's `docs/`, a package's `README.md`) at the site's page, and fails on a relative link to a path the repository doesn't have;
   - `mermaid` code blocks drawn by `components/mermaid.tsx`, and code in a language Shiki doesn't know shown as plain text, as GitHub does;
   - for connector packages: the page from `README.md`, its logo from `openetl-connector.yaml`, each role's config reference from its schema file (`components/config-reference.tsx`), and its releases;
   - the API reference from `openapi.yaml`, with `fumadocs-openapi`, under each version's Reference section. Each operation's page is titled with its RPC's name in words, and examples call `http://localhost:8080`, where `openetld dev` serves. There's no playground. `components/api-reference.tsx` loads its client code with `next/dynamic`, so only the API reference's pages download it; the docs' other pages share their route with it, and would otherwise load it too.
3. **Check.** Pages whose frontmatter doesn't validate fail the build. After it, `scripts/check-links.mjs` reads every page of `out/` and fails on a link within the site that doesn't resolve, or a fragment with no element of that id. Both run on the pages as fetched, so after `{{version}}` has been replaced.
4. **Export.** Next.js's static export to `out/`, with a static search index per version (`/api/search/VERSION.json`), `sitemap.xml`, `robots.txt`, `llms.txt`, `llms-full.txt` and each page's Markdown at `/llms.mdx/URL.md`. Nothing on the site needs a server, and readers' browsers fetch nothing from GitHub or a registry: what the site shows is what the last build fetched. In the browser, search runs on the index of the version you're reading, downloaded the first time you search, and `mermaid` diagrams are drawn, as GitHub draws them.

## Hosting

The site's address, `https://docs.openetl.io`, is `siteUrl` in `lib/shared.ts`. Each page names its URL there as canonical, so a preview deployment points search engines at the site, and `sitemap.xml` and `llms.txt` use full URLs. `public/_headers`, committed, has Cloudflare cache Next.js's build output, whose names change with its content, for a year, and lets other sites fetch the schemas. `public/_redirects`, generated, redirects `/docs` to the default version, and the paths of the versions the site no longer has to it (see [Versions](#versions)).

Cloudflare builds and deploys the site from its GitHub app, as the Worker `openetl-docs`, which serves `out/` as static assets: a push to `main` to `docs.openetl.io`, a push to another branch as a preview, and a call to the deploy hook builds and deploys `main` again (see [When it builds](#when-it-builds)). `wrangler.toml` has the build command, `pnpm fetch-docs && pnpm build`, which checks the links too, so a broken link fails the deploy and the site stays as it was. `wrangler deploy`, the deploy command of Cloudflare's build, runs it, so the dashboard's own build command stays empty. Pages are served without a trailing slash, as their canonical URLs have none, and a path with no file gets `404.html`. The Node.js version is in `.node-version`.

Cloudflare's dashboard holds the rest:

- the build secret `GITHUB_TOKEN`, a fine-grained token with read-only access to public repositories, for the published releases and their notes. Without it the build shares GitHub's unauthenticated limit with whatever else builds from the same address, and when that runs out every tag counts as released, `{{version}}` names the highest tag, and the changelog is empty;
- the custom domain, `docs.openetl.io`;
- the deploy hook, for branch `main`. Its URL is a secret here, `CLOUDFLARE_DEPLOY_HOOK`, and in openetl and openetl-connectors, whose workflows call it.

## Schemas

The fetch publishes each JSON Schema of each version as `/schemas/VERSION/NAME`, such as `/schemas/next/connector.schema.json`. A schema's `$id` is `https://openetl.io/schemas/PATH`, such as `https://openetl.io/schemas/connector/v1alpha2.json`, so it's also published as `/schemas/PATH`, from `stable` if it has it, or from `next`. openetl.io redirects `/schemas/*` here, in the `public/_redirects` of [website](https://github.com/openetl-io/website), so an editor that follows a schema's `$id` gets the schema. A schema whose `$id` isn't of that form is published in its version's folder only, with a warning.

## Versions

- The site has two versions of openetl's docs: `next`, from openetl's `main`, and `stable`, from its newest stable release. Until there is a stable release, `next` is the only one. The default version, which `/docs` redirects to and the home page links to, is `stable`, or `next` until there's a stable release.
- A release is a tag, `vX.Y.Z`, or `vX.Y.Z-alpha.N`, `-beta.N` or `-rc.N` for a prerelease, that GitHub has published a release of: a tag is pushed before openetl's `release` workflow publishes it, and a draft may be discarded. The fetch reads the published releases from GitHub's API. When it can't (offline, or over the API's limit), or `OPENETL_REMOTE` or `CONNECTORS_REMOTE` replaces the remote, every tag counts, with a warning.
- A prerelease has no docs of its own: `next` is its docs. A tag with any suffix counts as one, such as `v0.1.0-alpha`.
- `stable` is the newest release with no suffix, such as `v0.2.1`, which titles it in the version picker. Its pages come from its line's branch, `release-X.Y` such as `release-0.2`, when the branch has that release, so a fix to the stable docs reaches the site without a release; otherwise from the release's tag. openetl's CONTRIBUTING.md has when the branch is made and how a fix gets to it. A branch that doesn't have the release, such as one left from before the release was tagged on `main`, is ignored with a warning, and the branch of a line with only prereleases is never read.
- The slugs are `next` and `stable`, so a page's URL stays the same from one release to the next. The site used to have a version per release line, such as `v0-1`: `LEGACY_VERSIONS` in `scripts/fetch.mjs` lists those, and `public/_redirects` sends their pages, Markdown copies and schemas to the default version.
- **`{{version}}`.** openetl's pages write `{{version}}` where they name the release to install, without its `v`, and `v{{version}}` where they need the tag. The fetch replaces it in each page of a version, in code blocks and link URLs as anywhere else: in `stable`'s pages with its release, such as `0.2.1`, and in `next`'s with openetl's newest release of any kind, prerelease included. That's the first of GitHub's list of releases, as `install.sh` resolves it, or the highest version when the list can't be read. `pnpm dev:local` gets it the same way, and offline leaves `{{version}}` as it is, with a warning. A page without it is copied unchanged. What it became is each version's `installs` in `generated/sources.json`. The links are checked on the replaced pages.
- **Edit on GitHub** opens the page on the branch fixes to it go to: `stable`'s `release-X.Y`, or `main`. **As of RELEASE**, on `stable`'s pages, opens it at the tag or commit it was fetched from.
- A tag from before openetl had `docs/meta.json` has no version.
- Each version is a Fumadocs root folder of type `version`, so the docs layout shows a version picker that keeps your place where the page exists. The version's title, description, icon and type come from `lib/source.tsx`, not from openetl's `docs/meta.json`.
- openetl's sections are folders in the version's sidebar, all of them at once, with their icons. The site drops `root` from every `meta.json` it reads: a root folder takes over the sidebar when you open one of its pages and moves into a picker of its own, which loses the reader. The version picker is the only one.
- Search looks in the version you're reading, and the connectors: each version has an index of its own, so readers don't download every version's.
- Connector pages aren't tied to openetl's versions. Each package has versions of its own, tagged `PACKAGE/vX.Y.Z` such as `postgres/v0.2.0`, and its page, schemas and logo come from its newest release's tag, prerelease included, or from `main` until it has one. Its **Edit on GitHub** opens `main`, and its release's name links to the tag or commit it was fetched from. `{{version}}` isn't replaced in connector pages.
- The JSON Schemas and the API reference are published per version, from the same ref as its pages; the schemas also at their `$id`'s path (see [Schemas](#schemas)).

## Changelog

Release notes are GitHub Releases, written when a release is made. The fetch reads them with `@fumadocs/changelog`'s `githubReleases`, with `GITHUB_TOKEN` when it's set: `/changelog` has openetl's, and each connector's page the releases of its package's tags. Without the network, or over the API's limit, the changelog says why it's empty.

## When it builds

Cloudflare builds and deploys the site:

- on a push to this repository: `main` to `docs.openetl.io`, another branch as a preview;
- when its deploy hook is called, which builds `main` again. openetl and openetl-connectors call it from their workflows on a push to `main` (or, in openetl, to a `release-X.Y` branch) that changes what the site reads, and when they publish a release, which can change `{{version}}`, `stable`, a connector's page and the changelog. Nothing polls.

`.github/workflows/site.yml` fetches, type-checks, builds and checks the links:

- on each pull request, and on a push to `main`, which Cloudflare builds and deploys as well;
- when run by hand on `main` (`gh workflow run site.yml`), after which it calls the deploy hook, the URL in the secret `CLOUDFLARE_DEPLOY_HOOK`, so that Cloudflare builds and deploys `main` again: for a change whose call to the hook failed.

A change to a content repository that breaks the site's build fails Cloudflare's build, and the site stays as it was. That shows in Cloudflare's dashboard, not in the content repository's checks.

## Working on it

- [README.md](README.md) has the commands. `pnpm dev:local` serves the working trees of `../openetl` and `../openetl-connectors` and copies them again on every change; `pnpm fetch-docs` takes what's on GitHub. `OPENETL_REMOTE` and `CONNECTORS_REMOTE` fetch from another remote, such as a fork, or a `file://` clone with test tags and `release-X.Y` branches to try versions and `{{version}}`; every tag of such a remote counts as released. Don't push such tags or branches to GitHub.
- `pnpm typecheck` and `pnpm build`, which checks the links, before a pull request; CI runs both.
- `app/` holds the routes, `components/` the site's components, `lib/` the loaders, the plugins and what reads `generated/`, and `scripts/` the fetch and the link check.
- Dependencies are pinned to exact versions.
- The types of Fumadocs' packages, in `node_modules`, are the reference for their APIs, which change between minor versions.

## Rules

- **Pages are never written or edited here.** The home page and the site's own chrome (navigation, footer, 404) are the only text this repository holds. A fix to a page is a pull request to the page's repository.
- **No business talk.** Nothing about products or services outside the open-source repositories, and nothing promised for later, the same as the content repositories.
- **What the content repositories write, the site shows as GitHub would.** A page that renders differently here is the site's bug, fixed here.
- Work on a branch from `main` and open a pull request; nothing is pushed to `main` directly.
