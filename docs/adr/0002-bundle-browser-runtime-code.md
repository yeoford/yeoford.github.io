# ADR-0002: Bundle Browser Runtime Code Locally

- Status: Accepted
- Date: 2026-07-28
- Related issue: #3

## Context

The Map and PDF Reader previously loaded executable browser code from UNPKG.
That made core page behavior depend on a third-party package CDN at runtime and
allowed the loaded implementation to drift away from the dependencies tested
by the repository.

Map data is different from runtime code: the interactive map necessarily uses
an external style and tile service. Visitors still need a useful destination
when that service is unavailable.

## Decision

- Install MapLibre and PDF.js from npm and bundle their browser code and styles
  through Astro and Vite.
- Emit the PDF.js worker as a hashed local build asset from the same exact
  PDF.js version used by React-PDF.
- Keep the OpenFreeMap style and its map data external.
- Keep a visible OpenStreetMap link as the Map Fallback when external map data
  cannot load.
- Initialize and destroy MapLibre instances around Astro view transitions.

## Consequences

- PDF Reader and Map runtime code are served from the site rather than UNPKG.
- Deployed assets match the versions installed and tested in the lockfile.
- The interactive map still depends on OpenFreeMap availability.
- Visitors can reach the mapped location through OpenStreetMap when interactive
  map data fails.

## Alternatives considered

### Continue loading versioned UNPKG assets

Rejected because a third-party runtime CDN remains an avoidable availability
and supply-chain dependency even when URLs are versioned.

### Self-host all map styles and tiles

Rejected because operating map infrastructure is disproportionate for this
site. The Map Fallback provides a simpler failure mode.
