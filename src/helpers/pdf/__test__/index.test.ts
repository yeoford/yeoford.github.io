import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { processNewsletter } from '..';

describe('processNewsletter', () => {
  const issuePdf = fileURLToPath(
    new URL('../../../../newsletter/Jan 25 v1.pdf', import.meta.url)
  );

  it('extracts issue metadata without writing derived assets', async () => {
    const result = await processNewsletter(issuePdf);

    expect(result.metadata.issueDate?.getUTCFullYear()).toBe(2025);
    expect(result.metadata.issueDate?.getUTCMonth()).toBe(0);
    expect(result.metadata.issueNumber).toBe(405);
    expect(result.slug).toBe('newsletter-2025-0-405');
    expect(result.text.description).toContain('Garden Bins!');
  });

  it('preserves an existing legacy derived asset during generation', async () => {
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

  it('writes a deterministic JPEG cover with the legacy crop dimensions', async () => {
    const firstDirectory = await mkdtemp(join(tmpdir(), 'yeoford-cover-a-'));
    const secondDirectory = await mkdtemp(join(tmpdir(), 'yeoford-cover-b-'));
    const coverName = 'newsletter-2025-0-405-cover.jpg';

    try {
      await processNewsletter(issuePdf, { outputImageDir: firstDirectory });
      await processNewsletter(issuePdf, { outputImageDir: secondDirectory });

      const firstCover = await readFile(join(firstDirectory, coverName));
      const secondCover = await readFile(join(secondDirectory, coverName));
      const metadata = await sharp(firstCover).metadata();

      expect(metadata.format).toBe('jpeg');
      expect(metadata.width).toBe(1068);
      expect(metadata.height).toBe(1201);
      expect(firstCover.equals(secondCover)).toBe(true);
    } finally {
      await Promise.all([
        rm(firstDirectory, { force: true, recursive: true }),
        rm(secondDirectory, { force: true, recursive: true })
      ]);
    }
  }, 30_000);

  it('does not use application-level Canvas rendering', async () => {
    const source = await readFile(
      fileURLToPath(new URL('../index.ts', import.meta.url)),
      'utf8'
    );

    expect(source).not.toContain('@napi-rs/canvas');
    expect(source).toContain('@hyzyla/pdfium');
    expect(source).toContain("from 'sharp'");
  });
});
