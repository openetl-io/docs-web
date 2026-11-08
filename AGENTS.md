# Working on docs-web

For people and coding agents. This repository builds OpenETL's documentation site with Fumadocs, as a static site that Cloudflare Pages serves. It owns the site's layout, theme, components, home page and build. It owns no documentation: every page comes from the repository whose code it describes, so the pages change in the same pull requests as the code.

## Where the pages come from

| Pages | From | On the site |
|---|---|---|
| OpenETL's docs | [openetl](https://github.com/openetl-io/openetl): `docs/`, with its `meta.json` files | The docs, one copy per version |
| The official connectors | [openetl-connectors](https://github.com/openetl-io/openetl-connectors): each package's `README.md` (and `<package>/docs/`, if it has one), `openetl-connector.yaml`, and its `source.schema.json` and `destination.schema.json` | Connectors: a page per package |
| The API reference | openetl's `internal/api/openapi.yaml`, generated from its protos | The Reference section, per version |
| JSON Schemas | openetl's `internal/spec/connector.schema.json` (a connector descriptor), `internal/connectorpkg/openetl-connector.schema.json` (the authored `openetl-connector.yaml`) and `internal/declarative/manifest.schema.json` (a declarative source's manifest) | Published as files at stable URLs, per version, for editors and validators |
| Release notes | GitHub Releases of openetl, and of each connector package (tags such as `postgres/v0.2.0`) | Changelog pages |

The format the pages follow is [openetl's docs/AGENTS.md](https://github.com/openetl-io/openetl/blob/main/docs/AGENTS.md): Markdown in `.md` files, frontmatter with `title` and `description`, no `# H1`, a `meta.json` per folder, relative links starting with `./` or `../`, GitHub's alert syntax for callouts, `mermaid` code blocks for diagrams, and no raw HTML. The site reads exactly that, so a page reads the same on GitHub and here. Don't ask the content repositories for anything that GitHub wouldn't render.

## The build

1. **Fetch.** `scripts/fetch.mjs` checks out openetl at `main` and at each release line's newest tag, and openetl-connectors at each package's newest tag or `main`: shallow, sparse and blobless clones of only the paths above, in `.cache/`. It copies the pages and `meta.json` files into `content/`, the OpenAPI documents, connector descriptors and schemas into `generated/`, and the JSON Schemas into `public/schemas/VERSION/`. It downloads each connector's logo into `public/logos/`, so readers' browsers don't fetch it from a third party, and the release notes into `generated/changelog.json`. It writes `generated/sources.json`, which says what came from which repository at which commit or tag, and `public/_redirects`. All of these are generated and not committed. It never edits a page: what has to change, the plugins change at render time. A package's `README.md` is placed as its folder's `index.md`.
2. **Render.** `fumadocs-mdx` reads `content/` (`source.config.ts`; `.md` files parse as Markdown, not MDX), and `lib/source.tsx` loads it. The build adds:
   - `lib/remark/github-alerts.ts`, which turns `> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` and `[!CAUTION]` blockquotes into Fumadocs `Callout`s titled as GitHub titles them;
   - `createRelativeLink` for links between pages, and `lib/remark/source-links.ts`, which points relative links leaving the pages (an example, a manifest, a source file) at GitHub, at the commit or tag the page was fetched from: `https://github.com/openetl-io/REPO/blob/REF/PATH`, or `tree` for a folder. It points links to GitHub at `main` for a page the site has (openetl's `docs/`, a package's `README.md`) at the site's page, and fails on a relative link to a path the repository doesn't have;
   - `mermaid` code blocks drawn by `components/mermaid.tsx`, and code in a language Shiki doesn't know shown as plain text, as GitHub does;
   - for connector packages: the page from `README.md`, its logo from `openetl-connector.yaml`, each role's config reference from its schema file (`components/config-reference.tsx`), and its releases;
   - the API reference from `openapi.yaml`, with `fumadocs-openapi`, under each version's Reference section. Each operation's page is titled with its RPC's name in words, and examples call `http://localhost:8080`, where `openetld dev` serves. There's no playground.
3. **Check.** Pages whose frontmatter doesn't validate fail the build. After it, `scripts/check-links.mjs` reads every page of `out/` and fails on a link within the site that doesn't resolve, or a fragment with no element of that id.
4. **Export.** Next.js's static export to `out/`, with a static search index (`/api/search`), `llms.txt`, `llms-full.txt` and each page's Markdown at `/llms.mdx/URL.md`. Nothing on the site needs a server.

## Versions

- `next` is openetl's `main`.
- Each release line of openetl, such as v0.1, is built from its newest tag (`v0.1.3`, or a pre-release such as `v0.1.0-alpha.1` until there is one), and the newest release is what the site shows by default: `/docs` redirects to it. Until there is a release, that's `next`. A release line's slug has no dot (`/docs/v0-1/`), which some static servers would read as a file extension.
- A tag from before openetl had `docs/meta.json` has no version.
- Each version is a Fumadocs root folder of type `version`, so the docs layout shows a version picker that keeps your place where the page exists. The version's title, icon and type come from `lib/source.tsx`, not from openetl's `docs/meta.json`.
- openetl's sections are folders in the version's sidebar, all of them at once, with their icons. The site drops `root` from every `meta.json` it reads: a root folder takes over the sidebar when you open one of its pages and moves into a picker of its own, which loses the reader. The version picker is the only one.
- Search looks in the version you're reading, and the connectors.
- Connector pages aren't tied to openetl's versions: each package's page is built from its newest release tag, or from `main` until it has one.
- The JSON Schemas and the API reference are published per version, from the same ref as its pages.

## Changelog

Release notes are GitHub Releases, written when a release is made. The fetch reads them with `@fumadocs/changelog`'s `githubReleases`, with `GITHUB_TOKEN` when it's set: `/changelog` has openetl's, and each connector's page the releases of its package's tags. Without the network, or over the API's limit, the changelog says why it's empty.

## When it builds

`.github/workflows/site.yml` fetches, type-checks, builds and checks the links:

- on each pull request, and on a push to `main`, where it also deploys;
- on a `repository_dispatch` of type `docs`, for openetl and openetl-connectors to send when their docs change or they make a release;
- nightly, which picks up what no dispatch announced.

Deploying to Cloudflare Pages needs the secret `CLOUDFLARE_API_TOKEN` and the variables `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_PAGES_PROJECT`. Without them the workflow builds and checks only.

## Working on it

- [README.md](README.md) has the commands. `pnpm dev:local` serves the working trees of `../openetl` and `../openetl-connectors` and copies them again on every change; `pnpm fetch-docs` takes what's on GitHub. `OPENETL_REMOTE` and `CONNECTORS_REMOTE` fetch from another remote, such as a fork, or a `file://` clone with test tags to try versions.
- `pnpm typecheck` and `pnpm build`, which checks the links, before a pull request; CI runs both.
- `app/` holds the routes, `components/` the site's components, `lib/` the loaders, the plugins and what reads `generated/`, and `scripts/` the fetch and the link check.
- Dependencies are pinned to exact versions.
- The types of Fumadocs' packages, in `node_modules`, are the reference for their APIs, which change between minor versions.

## Rules

- **Pages are never written or edited here.** The home page and the site's own chrome (navigation, footer, 404) are the only text this repository holds. A fix to a page is a pull request to the page's repository.
- **No business talk.** Nothing about products or services outside the open-source repositories, and nothing promised for later, the same as the content repositories.
- **What the content repositories write, the site shows as GitHub would.** A page that renders differently here is the site's bug, fixed here.
- Work on a branch from `main` and open a pull request; nothing is pushed to `main` directly.
