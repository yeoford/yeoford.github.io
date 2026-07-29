import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';

import { generateDerivedAssets } from '../generate';

const januaryPdf = fileURLToPath(
  new URL('../../../../newsletter/2025-01-405.pdf', import.meta.url)
);

const temporaryDirectories: string[] = [];

const temporaryDirectory = async () => {
  const directory = await mkdtemp(join(tmpdir(), 'yeoford-generate-test-'));
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

describe('generateDerivedAssets', () => {
  it('replaces only known outputs with complete deterministic assets', async () => {
    const project = await temporaryDirectory();
    const archiveDirectory = join(project, 'newsletter');
    const metadataDirectory = join(project, 'src/content/newsletters');
    const imageDirectory = join(project, 'public/images/newsletters');
    const pdfDirectory = join(project, 'public/pdf');
    const unrelatedFile = join(project, 'public/keep.txt');

    await Promise.all([
      mkdir(archiveDirectory, { recursive: true }),
      mkdir(metadataDirectory, { recursive: true }),
      mkdir(imageDirectory, { recursive: true }),
      mkdir(pdfDirectory, { recursive: true }),
      mkdir(dirname(unrelatedFile), { recursive: true })
    ]);
    await Promise.all([
      copyFile(januaryPdf, join(archiveDirectory, '2025-01-405.pdf')),
      writeFile(join(metadataDirectory, 'stale.json'), 'stale'),
      writeFile(join(imageDirectory, 'stale.jpg'), 'stale'),
      writeFile(join(pdfDirectory, 'stale.pdf'), 'stale'),
      writeFile(unrelatedFile, 'keep')
    ]);

    await generateDerivedAssets({
      archiveDirectory,
      imageDirectory,
      metadataDirectory,
      pdfDirectory
    });

    const id = 'newsletter-2025-0-405';
    const metadataPath = join(metadataDirectory, `${id}.json`);
    const coverPath = join(imageDirectory, `${id}-cover.jpg`);
    const publicPdfPath = join(pdfDirectory, `${id}.pdf`);
    const firstMetadata = await readFile(metadataPath);
    const firstCover = await readFile(coverPath);
    const firstPublicPdf = await readFile(publicPdfPath);

    expect(JSON.parse(firstMetadata.toString())).toEqual({
      coverPath: `/images/newsletters/${id}-cover.jpg`,
      description: expect.stringContaining('Garden Bins!'),
      id,
      issueNumber: 405,
      pdfPath: `/pdf/${id}.pdf`,
      publicationMonth: '2025-01'
    });
    expect(firstMetadata.toString()).toMatch(/\n$/u);
    expect(firstPublicPdf.equals(await readFile(januaryPdf))).toBe(true);
    expect(await sharp(firstCover).metadata()).toMatchObject({
      format: 'jpeg',
      height: 1201,
      width: 1068
    });
    expect(await readFile(unrelatedFile, 'utf8')).toBe('keep');

    await generateDerivedAssets({
      archiveDirectory,
      imageDirectory,
      metadataDirectory,
      pdfDirectory
    });

    expect((await readFile(metadataPath)).equals(firstMetadata)).toBe(true);
    expect((await readFile(coverPath)).equals(firstCover)).toBe(true);
    expect((await readFile(publicPdfPath)).equals(firstPublicPdf)).toBe(true);
  }, 30_000);

  it('leaves published outputs unchanged when archive preflight fails', async () => {
    const project = await temporaryDirectory();
    const archiveDirectory = join(project, 'newsletter');
    const metadataDirectory = join(project, 'src/content/newsletters');
    const imageDirectory = join(project, 'public/images/newsletters');
    const pdfDirectory = join(project, 'public/pdf');

    await Promise.all([
      mkdir(archiveDirectory, { recursive: true }),
      mkdir(metadataDirectory, { recursive: true }),
      mkdir(imageDirectory, { recursive: true }),
      mkdir(pdfDirectory, { recursive: true })
    ]);
    await Promise.all([
      writeFile(join(metadataDirectory, 'sentinel'), 'metadata'),
      writeFile(join(imageDirectory, 'sentinel'), 'image'),
      writeFile(join(pdfDirectory, 'sentinel'), 'pdf')
    ]);

    await expect(
      generateDerivedAssets({
        archiveDirectory,
        imageDirectory,
        metadataDirectory,
        pdfDirectory
      })
    ).rejects.toThrow('Archive contains no canonical Issue PDFs');

    expect(await readFile(join(metadataDirectory, 'sentinel'), 'utf8')).toBe(
      'metadata'
    );
    expect(await readFile(join(imageDirectory, 'sentinel'), 'utf8')).toBe(
      'image'
    );
    expect(await readFile(join(pdfDirectory, 'sentinel'), 'utf8')).toBe('pdf');
  });

  it('leaves published outputs unchanged when cover rendering fails', async () => {
    const project = await temporaryDirectory();
    const archiveDirectory = join(project, 'newsletter');
    const metadataDirectory = join(project, 'src/content/newsletters');
    const imageDirectory = join(project, 'public/images/newsletters');
    const pdfDirectory = join(project, 'public/pdf');

    await Promise.all([
      mkdir(archiveDirectory, { recursive: true }),
      mkdir(metadataDirectory, { recursive: true }),
      mkdir(imageDirectory, { recursive: true }),
      mkdir(pdfDirectory, { recursive: true })
    ]);
    await Promise.all([
      copyFile(januaryPdf, join(archiveDirectory, '2025-01-405.pdf')),
      writeFile(join(metadataDirectory, 'sentinel'), 'metadata'),
      writeFile(join(imageDirectory, 'sentinel'), 'image'),
      writeFile(join(pdfDirectory, 'sentinel'), 'pdf')
    ]);

    await expect(
      generateDerivedAssets({
        archiveDirectory,
        coverRenderer: async () => {
          throw new Error('render failed');
        },
        imageDirectory,
        metadataDirectory,
        pdfDirectory
      })
    ).rejects.toThrow('render failed');

    expect(await readFile(join(metadataDirectory, 'sentinel'), 'utf8')).toBe(
      'metadata'
    );
    expect(await readFile(join(imageDirectory, 'sentinel'), 'utf8')).toBe(
      'image'
    );
    expect(await readFile(join(pdfDirectory, 'sentinel'), 'utf8')).toBe('pdf');
  });
});
