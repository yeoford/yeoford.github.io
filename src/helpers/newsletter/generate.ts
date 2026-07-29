import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile
} from 'node:fs/promises';
import path from 'node:path';

import { inspectArchive } from './archive';
import { derivedAssetNames } from './model';
import { renderCover } from './pdf';

/** Where the canonical Archive lives and where its Derived Assets are written. */
export interface NewsletterDirectories {
  archiveDirectory: string;
  imageDirectory: string;
  metadataDirectory: string;
  pdfDirectory: string;
}

interface GenerateDerivedAssetsOptions extends NewsletterDirectories {
  coverRenderer?: typeof renderCover;
}

export const generateDerivedAssets = async ({
  archiveDirectory,
  coverRenderer = renderCover,
  imageDirectory,
  metadataDirectory,
  pdfDirectory
}: GenerateDerivedAssetsOptions) => {
  const archive = await inspectArchive(archiveDirectory);
  const stagingRoot = await mkdtemp(
    path.join(path.dirname(archiveDirectory), '.newsletter-generation-')
  );
  const stagedMetadata = path.join(stagingRoot, 'metadata');
  const stagedImages = path.join(stagingRoot, 'images');
  const stagedPdfs = path.join(stagingRoot, 'pdfs');

  try {
    await Promise.all([
      mkdir(stagedMetadata),
      mkdir(stagedImages),
      mkdir(stagedPdfs)
    ]);

    for (const entry of archive) {
      const { issue } = entry;
      const names = derivedAssetNames(issue.id);
      const bytes = new Uint8Array(await readFile(entry.sourcePath));
      await Promise.all([
        writeFile(
          path.join(stagedMetadata, names.metadata),
          `${JSON.stringify(issue, null, 2)}\n`
        ),
        coverRenderer(bytes, path.join(stagedImages, names.cover)),
        copyFile(entry.sourcePath, path.join(stagedPdfs, names.pdf))
      ]);
    }

    await replaceGeneratedDirectories([
      { destination: metadataDirectory, staged: stagedMetadata },
      { destination: imageDirectory, staged: stagedImages },
      { destination: pdfDirectory, staged: stagedPdfs }
    ]);
  } finally {
    await rm(stagingRoot, { force: true, recursive: true });
  }

  return archive.map(entry => entry.issue);
};

interface GeneratedDirectory {
  destination: string;
  staged: string;
}

const replaceGeneratedDirectories = async (
  directories: GeneratedDirectory[]
) => {
  const nonce = `${process.pid}-${Date.now()}`;
  const prepared = directories.map(directory => ({
    ...directory,
    backup: `${directory.destination}.backup-${nonce}`,
    hadDestination: false,
    installed: false
  }));

  try {
    for (const directory of prepared) {
      await mkdir(path.dirname(directory.destination), { recursive: true });
      directory.hadDestination = await exists(directory.destination);
      if (directory.hadDestination) {
        await rename(directory.destination, directory.backup);
      }
    }

    for (const directory of prepared) {
      await rename(directory.staged, directory.destination);
      directory.installed = true;
    }
  } catch (error) {
    for (const directory of prepared.toReversed()) {
      if (directory.installed) {
        await rm(directory.destination, { force: true, recursive: true });
      }
      if (directory.hadDestination && (await exists(directory.backup))) {
        await rename(directory.backup, directory.destination);
      }
    }
    throw error;
  }

  await Promise.all(
    prepared
      .filter(directory => directory.hadDestination)
      .map(directory => rm(directory.backup, { force: true, recursive: true }))
  );
};

const exists = async (target: string) => {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
};
