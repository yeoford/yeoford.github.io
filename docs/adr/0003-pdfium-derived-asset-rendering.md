# ADR-0003: Render PDF Derived Assets with PDFium and Sharp

- Status: Accepted
- Date: 2026-07-28
- Related issues: #3, #4

## Context

Village Voice cover and page images are Derived Assets generated from canonical
Issue PDFs. The previous generator used PDF.js with a Node Canvas
implementation for both extraction and rendering. That tied build-time image
generation to browser-oriented Canvas APIs and made the rendering dependency
harder to update independently from the website's PDF Reader.

PDF.js remains a good fit for text and metadata extraction and is already used
by the browser reader. Image generation needs a server-side renderer with
predictable raw pixel output.

## Decision

- Keep PDF.js for newsletter metadata and text extraction and for the browser
  PDF Reader.
- Use PDFium for build-time rendering of PDF pages to raw RGBA data.
- Load PDFium lazily and only when an image output needs to be written.
- Use Sharp to preserve the existing 2× render scale, `1068×1201` cover crop,
  and JPEG quality.
- Destroy PDFium documents and libraries and PDF.js documents in `finally`
  blocks.

## Consequences

- Application code no longer imports or uses a Canvas implementation directly.
- Metadata-only generation does not initialize PDFium.
- Rendered JPEGs preserve dimensions and visual behavior but are not expected
  to be byte-identical to the former Canvas output.
- PDFium's WebAssembly runtime and Sharp's native binaries become build-time
  dependencies.

## Alternatives considered

### Continue rendering through PDF.js and Canvas

Rejected because it keeps the server-side generator coupled to Canvas and to
PDF.js rendering internals.

### Use PDFium for text extraction too

Rejected because the existing PDF.js extraction behavior is established and
separating extraction from rendering limits migration risk.
