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

1. **Fetch.** A script checks out each source at each ref it's built from (shallow and sparse: only the paths above) into `content/`, which is generated and not committed. It never edits a page; whatever it has to change, the build's plugins change at render time.
2. **Render.** `fumadocs-mdx` reads `content/` (`.md` files parse as Markdown, not MDX). The build adds:
   - a remark plugin that turns `> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` and `[!CAUTION]` blockquotes into Fumadocs `Callout`s;
   - `createRelativeLink` for links between pages, and a remark plugin that points relative links leaving the content tree (an example, a manifest, a source file) at GitHub, at the same ref the page was built from: `https://github.com/openetl-io/REPO/blob/REF/PATH`, or `tree` for a folder;
   - rendering for `mermaid` code blocks;
   - for connector packages: the page from `README.md`, its title and logo from `openetl-connector.yaml`, and each role's config reference from its schema file, rendered with `@fumadocs/json-schema`;
   - the API reference from `openapi.yaml`, with `fumadocs-openapi`.
3. **Check.** Broken links and anchors fail the build (`next-validate-link`), as do pages whose frontmatter doesn't validate.
4. **Export.** Next.js's static export, with a static search index and `llms.txt`, deployed to Cloudflare Pages. Nothing on the site needs a server.

## Versions

- `next` is openetl's `main`.
- Each release line of openetl, such as `0.1`, is built from its newest tag (`v0.1.3`), and the newest release is what the site shows by default. Until there is a release, that's `next`.
- Each version is a Fumadocs root folder of type `version`, so the docs layout shows a version picker that keeps your place where the page exists. openetl's sections keep their own `root: true` folders within it.
- Connector pages aren't tied to openetl's versions: each package's page is built from its newest release tag, or from `main` until it has one.
- The JSON Schemas and the API reference are published per version, from the same ref as its pages.

## Changelog

Release notes are GitHub Releases, written when a release is made. The site renders them with `@fumadocs/changelog`'s `githubReleases`, with a token at build time: one changelog for openetl, and one per connector package from its tags.

## When it builds

- On a push to `main` here.
- When openetl or openetl-connectors push to `main` or make a release, by `repository_dispatch`.
- Nightly, in case a dispatch was missed.

## Rules

- **Pages are never written or edited here.** The home page and the site's own chrome (navigation, footer, 404) are the only text this repository holds. A fix to a page is a pull request to the page's repository.
- **No business talk.** Nothing about products or services outside the open-source repositories, and nothing promised for later, the same as the content repositories.
- Work on a branch from `main` and open a pull request; nothing is pushed to `main` directly.
