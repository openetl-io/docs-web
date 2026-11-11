# docs-web

The website for OpenETL's documentation. It holds the site, not the pages: those live next to the code they describe, in [openetl](https://github.com/openetl-io/openetl/tree/main/docs) (`docs/`) and in [openetl-connectors](https://github.com/openetl-io/openetl-connectors) (each package's `README.md`). The site is built from them with [Fumadocs](https://fumadocs.dev) and served by Cloudflare Pages at [docs.openetl.io](https://docs.openetl.io).

To change what a page says, change it in its own repository. [AGENTS.md](AGENTS.md) has how the site is put together.

## Run it

You need Git, [Node](https://nodejs.org) 22.13 or later and [pnpm](https://pnpm.io/installation).

```sh
pnpm install
```

To see your own changes to the docs as you write them, clone openetl and openetl-connectors next to this repository and run:

```sh
pnpm dev:local
```

The site is at [localhost:3000](http://localhost:3000). It reads the working trees of `../openetl` and `../openetl-connectors`, uncommitted changes included, and shows each change when you save it. `OPENETL_DIR` and `CONNECTORS_DIR` point it at checkouts somewhere else.

To see the docs as they are on GitHub, at `main` and at each release, fetch them first:

```sh
pnpm fetch-docs
pnpm dev
```

To build the static site that Cloudflare Pages serves, check its links, and serve it on [localhost:3000](http://localhost:3000):

```sh
pnpm fetch-docs
pnpm build
pnpm preview
```

`pnpm typecheck` checks the site's code.

## License

[Apache 2.0](LICENSE)
