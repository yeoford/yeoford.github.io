# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added Playwright browser smoke coverage for desktop and mobile navigation,
  public routes, maps, PDF reading, layout overflow, and browser errors.
- Added Node `22.22.3` configuration, a Node `>=22.22.3` engine requirement,
  and Chromium installation in the required CI quality job.
- Added weekly Dependabot updates for npm and GitHub Actions, grouping minor
  and patch updates while leaving major updates separate.
- Added architectural decisions for locally bundled browser runtimes and
  PDFium-based Derived Asset rendering.
- Added PDF Reader and Map Fallback definitions to the project glossary.

### Changed

- Upgraded the site through independently buildable Astro 6 and Astro 7
  checkpoints to Astro `7.1.4`, React integration `6.0.1`, and Vite `8.1.5`.
- Upgraded React to `19.2.8`, React-PDF to `10.4.1`, MapLibre GL to `6.0.0`,
  Tailwind CSS to `4.3.3`, TypeScript to `6.0.3`, Vitest to `4.1.10`,
  Playwright to `1.62.0`, and ESLint to version 10.
- Replaced application-level Canvas PDF rendering with lazily initialized
  PDFium and Sharp while preserving filenames, output locations, the 2× render
  scale, the `1068×1201` cover crop, and JPEG quality.
- Bundled MapLibre code and CSS locally while retaining external OpenFreeMap
  data, the OpenStreetMap fallback, and Astro view-transition support.
- Bundled the PDF.js worker as a hashed local asset and pinned PDF.js to
  `5.4.296` to match React-PDF.
- Expanded the quality gate to run formatting, linting, type checking, unit
  tests, unused-code analysis, a production build, and browser tests.
- Updated setup, runtime, browser-test, publishing, and verification
  documentation.

### Removed

- Removed the unused MDX integration, empty Tailwind configuration,
  `@nkzw/eslint-config`, the broken RSS metadata link, unused dependencies, and
  direct application imports of `@napi-rs/canvas`.
- Removed runtime loading of PDF.js and MapLibre code from UNPKG.

### Security

- Updated and constrained vulnerable transitive dependencies so `bun audit`
  reports no known vulnerabilities.
