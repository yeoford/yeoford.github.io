import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { addIssue, type PdfOptimizer } from '../add';

const januaryPdf = fileURLToPath(
  new URL('../../../../newsletter/2025-01-405.pdf', import.meta.url)
);

const temporaryDirectories: string[] = [];

const temporaryDirectory = async () => {
  const directory = await mkdtemp(join(tmpdir(), 'yeoford-add-test-'));
  temporaryDirectories.push(directory);
  return directory;
};

const exists = async (target: string) => {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map(directory => rm(directory, { force: true, recursive: true }))
  );
});

describe('addIssue', () => {
  it('installs a valid optimized PDF and leaves the supplied source in place', async () => {
    const project = await temporaryDirectory();
    const incomingDirectory = await temporaryDirectory();
    const archiveDirectory = join(project, 'newsletter');
    const sourcePath = join(incomingDirectory, 'supplied.pdf');
    const originalBytes = await readFile(januaryPdf);
    await mkdir(archiveDirectory);
    await writeFile(
      sourcePath,
      Buffer.concat([originalBytes, Buffer.alloc(1024)])
    );
    const optimizer: PdfOptimizer = async (_source, destination) => {
      await copyFile(januaryPdf, destination);
    };

    const issue = await addIssue({
      archiveDirectory,
      optimizer,
      sourcePath
    });

    const canonicalPath = join(archiveDirectory, '2025-01-405.pdf');
    expect(issue.id).toBe('newsletter-2025-0-405');
    expect(await exists(sourcePath)).toBe(true);
    expect((await readFile(canonicalPath)).equals(originalBytes)).toBe(true);
  });

  it('accepts an optimized PDF that is no smaller than the source', async () => {
    const project = await temporaryDirectory();
    const incomingDirectory = await temporaryDirectory();
    const archiveDirectory = join(project, 'newsletter');
    const sourcePath = join(incomingDirectory, 'supplied.pdf');
    await mkdir(archiveDirectory);
    await copyFile(januaryPdf, sourcePath);
    const optimizer: PdfOptimizer = async (source, destination) => {
      await copyFile(source, destination);
    };

    const issue = await addIssue({ archiveDirectory, optimizer, sourcePath });

    expect(issue.id).toBe('newsletter-2025-0-405');
    expect(await exists(join(archiveDirectory, '2025-01-405.pdf'))).toBe(true);
  });

  it('rejects duplicate metadata before invoking the optimizer', async () => {
    const project = await temporaryDirectory();
    const incomingDirectory = await temporaryDirectory();
    const archiveDirectory = join(project, 'newsletter');
    const sourcePath = join(incomingDirectory, 'supplied.pdf');
    await mkdir(archiveDirectory);
    await Promise.all([
      copyFile(januaryPdf, join(archiveDirectory, '2025-01-405.pdf')),
      copyFile(januaryPdf, sourcePath)
    ]);
    let optimizerCalled = false;
    const optimizer: PdfOptimizer = async () => {
      optimizerCalled = true;
    };

    await expect(
      addIssue({ archiveDirectory, optimizer, sourcePath })
    ).rejects.toThrow('duplicate Publication Month 2025-01');

    expect(optimizerCalled).toBe(false);
    expect(await exists(sourcePath)).toBe(true);
  });

  it('rejects a source inside the canonical Archive', async () => {
    const project = await temporaryDirectory();
    const archiveDirectory = join(project, 'newsletter');
    const sourcePath = join(archiveDirectory, 'supplied.pdf');
    await mkdir(archiveDirectory);
    await copyFile(januaryPdf, sourcePath);

    await expect(
      addIssue({
        archiveDirectory,
        optimizer: async () => undefined,
        sourcePath
      })
    ).rejects.toThrow('must be outside');
  });
});
