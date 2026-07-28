import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

describe('PDF Reader runtime', () => {
  it('resolves its PDF.js worker from the locally bundled package', async () => {
    const source = await readFile(
      new URL('index.tsx', import.meta.url),
      'utf8'
    );

    expect(source).toContain('new URL(');
    expect(source).toContain("'pdfjs-dist/build/pdf.worker.min.mjs'");
    expect(source).toContain('import.meta.url');
    expect(source).not.toContain('unpkg.com');
  });
});
