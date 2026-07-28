import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { processNewsletter } from '..';

const pdfium = vi.hoisted(() => {
  const destroyDocument = vi.fn();
  const destroyLibrary = vi.fn();
  const render = vi.fn().mockRejectedValue(new Error('render failed'));
  const loadDocument = vi.fn().mockResolvedValue({
    destroy: destroyDocument,
    getPage: () => ({ render })
  });
  const initialize = vi.fn().mockResolvedValue({
    destroy: destroyLibrary,
    loadDocument
  });

  return {
    destroyDocument,
    destroyLibrary,
    initialize,
    loadDocument,
    render
  };
});

vi.mock('@hyzyla/pdfium', () => ({
  PDFiumLibrary: {
    init: pdfium.initialize
  }
}));

describe('PDFium lifecycle', () => {
  const issuePdf = fileURLToPath(
    new URL('../../../../newsletter/Jan 25 v1.pdf', import.meta.url)
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not initialize PDFium for metadata-only processing', async () => {
    await processNewsletter(issuePdf);

    expect(pdfium.initialize).not.toHaveBeenCalled();
  });

  it('destroys the PDFium document and library when rendering fails', async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), 'yeoford-failure-'));

    try {
      await expect(
        processNewsletter(issuePdf, { outputImageDir: outputDirectory })
      ).rejects.toThrow('render failed');

      expect(pdfium.destroyDocument).toHaveBeenCalledOnce();
      expect(pdfium.destroyLibrary).toHaveBeenCalledOnce();
    } finally {
      await rm(outputDirectory, { force: true, recursive: true });
    }
  });
});
