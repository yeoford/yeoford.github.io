# ADR-0001: Keep Village Voice publishing PDF-first

- Status: Accepted
- Date: 2026-07-28
- Related issues: #1, #2, #4

## Context

The Village Voice is supplied as a PDF. The website currently commits both
Issue PDFs and a partial set of generated newsletter metadata, cover images,
and public PDF copies. This duplicates large files and makes it unclear which
asset should be edited when the Archive changes.

Moving Issue PDFs to external storage would reduce repository size, but it
would also introduce another system to configure, secure, document, and keep
available. The current repository size does not yet justify that operational
cost.

## Decision

Village Voice publishing remains PDF-first:

- The canonical Issue PDF for every Village Voice Issue is committed to this
  repository.
- Canonical Issue PDFs will be optimized while preserving their content and
  extractability.
- Newsletter metadata, cover images, and public PDF copies are deterministic
  Derived Assets. They are replaceable and are not sources of truth.
- Existing newsletter and PDF URLs must remain valid.
- Publication Month is represented as timezone-independent `YYYY-MM` data.
- External storage is deferred. It should be reconsidered when canonical Issue
  PDFs or repository size reaches 750 MB, or when repository-hosted PDFs cause
  a demonstrated operational problem.

Issue #2 records this decision but does not migrate existing assets. Removing
tracked Derived Assets, optimizing the existing Issue PDFs, and introducing
deterministic generation remain in the scope of issue #4.

## Consequences

- A Village Voice Issue can be rebuilt from its committed Issue PDF.
- Generated outputs can be cleaned and recreated without losing editorial
  source material.
- Repository history continues to contain large binary files.
- Publishing remains possible without credentials for an external storage
  provider.
- PDF optimization and generation must validate that public behavior and
  existing URLs are preserved.

## Alternatives considered

### Treat generated public files as canonical

Rejected because it creates multiple editable sources for one Village Voice
Issue and makes regeneration unsafe.

### Move Issue PDFs to external storage now

Deferred because the added operational dependency is not justified at the
current scale.
