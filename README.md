# Yeoford

The source for [yeoford.org](https://yeoford.org), including village
information, the Community Hall Calendar, and the Village Voice Archive.

The site is built with Astro and deployed to GitHub Pages. Bun `1.3.14` is the
project package manager and JavaScript runtime.

## Setup

Install Bun `1.3.14`, clone the repository, and install the locked dependency
graph:

```sh
bun ci
```

`bun ci` fails rather than changing `bun.lock`, making it suitable for clean
checkouts and CI.

## Development

Start the local development server:

```sh
bun run dev
```

Astro serves the site at `http://localhost:4321` by default. To create and
inspect a production build locally:

```sh
bun run build
bun run preview
```

## Verification

Run the complete project quality gate:

```sh
bun run check
```

It runs, in order:

1. Prettier formatting checks.
2. ESLint.
3. Astro and TypeScript checks.
4. Vitest in non-watch mode.
5. Knip unused-code analysis.
6. The production build.

Individual commands are also available:

| Command                | Purpose                                       |
| ---------------------- | --------------------------------------------- |
| `bun run format`       | Format supported repository files             |
| `bun run format:check` | Check formatting without changing files       |
| `bun run lint`         | Run ESLint                                    |
| `bun run lint:fix`     | Apply safe ESLint fixes                       |
| `bun run typecheck`    | Run Astro and TypeScript diagnostics          |
| `bun run test --run`   | Run unit tests once                           |
| `bun run unused`       | Find unused files, dependencies, and exports  |
| `bun run build`        | Generate newsletter assets and build the site |

Running the complete gate must not create tracked cache or Derived Asset
changes.

## Publishing the Village Voice

The current workflow is PDF-first. The committed Issue PDF is the source of
truth; newsletter metadata, cover images, and public PDF copies are Derived
Assets generated during builds.

To publish an Issue with the current processor:

1. Add the supplied PDF to `newsletter/`, following the existing source-file
   naming convention.
2. Generate the Derived Assets:

   ```sh
   bun run process-newsletters
   ```

3. Run `bun run check`.
4. Review the Latest Issue and Archive locally with `bun run preview`.
5. Commit the Issue PDF and the intended source changes. New Derived Assets are
   ignored because CI regenerates them before building.

The current processor extracts data but does not fully validate or optimize a
new Issue PDF. GitHub issue #4 owns the deterministic `newsletter:add`,
`newsletter:generate`, and `newsletter:check` workflow, archive optimization,
and removal of the remaining tracked legacy Derived Assets.

## Deployment

GitHub Actions runs the quality job for pull requests and pushes to `main`. On a
successful `main` quality run, that same job uploads the verified GitHub Pages
artifact and the dependent deployment job publishes it.

Deployment can also be started manually from the repository's Actions page.
The `CNAME` file preserves the `yeoford.org` custom domain in the generated
site.

## Domain documentation

Project vocabulary is defined in [`CONTEXT.md`](CONTEXT.md). Durable technical
decisions are recorded in [`docs/adr/`](docs/adr/).
