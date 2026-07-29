import { copyFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { ArchiveValidationError, inspectArchive } from '../archive';
import { extractVillageVoiceIssue } from '../pdf';

const januaryPdf = fileURLToPath(
  new URL('../../../../newsletter/2025-01-405.pdf', import.meta.url)
);
const februaryPdf = fileURLToPath(
  new URL('../../../../newsletter/2025-02-406.pdf', import.meta.url)
);

const temporaryDirectories: string[] = [];

const temporaryDirectory = async () => {
  const directory = await mkdtemp(join(tmpdir(), 'yeoford-archive-test-'));
  temporaryDirectories.push(directory);
  return directory;
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map(directory => rm(directory, { force: true, recursive: true }))
  );
});

describe('extractVillageVoiceIssue', () => {
  it('extracts timezone-independent metadata from the first page', async () => {
    const result = await extractVillageVoiceIssue(januaryPdf);

    expect(result.issue).toEqual({
      coverPath: '/images/newsletters/newsletter-2025-0-405-cover.jpg',
      description: expect.stringContaining('Garden Bins!'),
      id: 'newsletter-2025-0-405',
      issueNumber: 405,
      pdfPath: '/pdf/newsletter-2025-0-405.pdf',
      publicationMonth: '2025-01'
    });
    expect(result.pageCount).toBe(16);
  });

  it('rejects an unreadable PDF with its filename in the error', async () => {
    const directory = await temporaryDirectory();
    const invalidPdf = join(directory, 'invalid.pdf');
    await writeFile(invalidPdf, 'not a PDF');

    await expect(extractVillageVoiceIssue(invalidPdf)).rejects.toThrow(
      /invalid\.pdf/
    );
  });
});

describe('inspectArchive', () => {
  it('returns canonical issues in stable publication order', async () => {
    const directory = await temporaryDirectory();
    await Promise.all([
      copyFile(februaryPdf, join(directory, '2025-02-406.pdf')),
      copyFile(januaryPdf, join(directory, '2025-01-405.pdf'))
    ]);

    const archive = await inspectArchive(directory);

    expect(archive.map(entry => entry.issue.id)).toEqual([
      'newsletter-2025-0-405',
      'newsletter-2025-1-406'
    ]);
    expect(archive[0]).not.toHaveProperty('bytes');
  });

  it('rejects an empty archive', async () => {
    const directory = await temporaryDirectory();

    await expect(inspectArchive(directory)).rejects.toThrow(
      'Archive contains no canonical Issue PDFs'
    );
  });

  it('aggregates filename and duplicate errors in stable order', async () => {
    const directory = await temporaryDirectory();
    const first = join(directory, 'wrong-name.pdf');
    const second = join(directory, 'also-wrong.pdf');
    await copyFile(januaryPdf, first);
    await copyFile(januaryPdf, second);

    let error: unknown;
    try {
      await inspectArchive(directory);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ArchiveValidationError);
    expect((error as ArchiveValidationError).problems).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'also-wrong.pdf: expected canonical filename 2025-01-405.pdf'
        ),
        expect.stringContaining(
          'wrong-name.pdf: expected canonical filename 2025-01-405.pdf'
        ),
        expect.stringContaining('duplicate Publication Month 2025-01'),
        expect.stringContaining('duplicate Issue Number 405'),
        expect.stringContaining('duplicate Issue ID newsletter-2025-0-405'),
        expect.stringContaining(
          'duplicate output path /pdf/newsletter-2025-0-405.pdf'
        )
      ])
    );
    expect((error as ArchiveValidationError).problems).toEqual(
      [...(error as ArchiveValidationError).problems].toSorted()
    );
  });

  it('rejects a noncanonical uppercase PDF extension', async () => {
    const directory = await temporaryDirectory();
    await copyFile(januaryPdf, join(directory, '2025-01-405.PDF'));

    await expect(inspectArchive(directory)).rejects.toThrow(
      '2025-01-405.PDF: expected canonical filename 2025-01-405.pdf'
    );
  });
});
