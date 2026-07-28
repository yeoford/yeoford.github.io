import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { processNewsletter } from '..';

describe('processNewsletter', () => {
  it('extracts issue metadata without writing derived assets', async () => {
    const issuePdf = fileURLToPath(
      new URL('../../../../newsletter/Jan 25 v1.pdf', import.meta.url)
    );

    const result = await processNewsletter(issuePdf);

    expect(result.metadata.issueDate?.getUTCFullYear()).toBe(2025);
    expect(result.metadata.issueDate?.getUTCMonth()).toBe(0);
    expect(result.metadata.issueNumber).toBe(405);
    expect(result.slug).toBe('newsletter-2025-0-405');
    expect(result.text.description).toContain('Garden Bins!');
  });

  it('preserves an existing legacy derived asset during generation', async () => {
    const issuePdf = fileURLToPath(
      new URL('../../../../newsletter/Jan 25 v1.pdf', import.meta.url)
    );
    const temporaryDirectory = await mkdtemp(
      join(tmpdir(), 'yeoford-newsletter-')
    );
    const outputDataDirectory = join(temporaryDirectory, 'metadata');
    const existingMetadata = join(
      outputDataDirectory,
      'newsletter-2025-0-405.json'
    );

    try {
      await mkdir(outputDataDirectory);
      await writeFile(existingMetadata, 'legacy asset');

      await processNewsletter(issuePdf, {
        outputDataDir: outputDataDirectory,
        skipExistingOutputs: true
      });

      expect(await readFile(existingMetadata, 'utf8')).toBe('legacy asset');
    } finally {
      await rm(temporaryDirectory, { force: true, recursive: true });
    }
  });
});
