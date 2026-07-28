import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

describe('PDF Reader runtime', () => {
  it('uses the matching direct PDF.js package and its locally bundled worker', async () => {
    const packageJson = JSON.parse(
      await readFile(new URL('../../../package.json', import.meta.url), 'utf8')
    ) as {
      dependencies: Record<string, string>;
    };
    const source = await readFile(
      new URL('index.tsx', import.meta.url),
      'utf8'
    );

    expect(packageJson.dependencies['react-pdf']).toBe('10.4.1');
    expect(packageJson.dependencies['pdfjs-dist']).toBe('5.4.296');
    expect(source).toContain('new URL(');
    expect(source).toContain("'pdfjs-dist/build/pdf.worker.min.mjs'");
    expect(source).toContain('import.meta.url');
    expect(source).not.toContain('unpkg.com');
  });
});
