import { mkdir, mkdtemp, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';

import type { VillageVoiceIssue } from '@types';

import {
  assertNoIssueConflicts,
  inspectArchive,
  type ArchiveIssue
} from './archive';
import {
  canonicalIssueFilename,
  descriptionsMatchAfterOptimization
} from './model';
import { optimizeWithGhostscript } from './optimize';
import {
  extractAllText,
  extractVillageVoiceIssue,
  type ExtractedIssuePdf
} from './pdf';

export type PdfOptimizer = (
  sourcePath: string,
  destinationPath: string
) => Promise<void>;

interface AddIssueOptions {
  archiveDirectory: string;
  optimizer?: PdfOptimizer;
  sourcePath: string;
}

export const addIssue = async ({
  archiveDirectory,
  optimizer = optimizeWithGhostscript,
  sourcePath
}: AddIssueOptions): Promise<VillageVoiceIssue> => {
  const resolvedArchive = path.resolve(archiveDirectory);
  const resolvedSource = path.resolve(sourcePath);
  const relativeSource = path.relative(resolvedArchive, resolvedSource);

  if (
    relativeSource === '' ||
    (!relativeSource.startsWith(`..${path.sep}`) &&
      relativeSource !== '..' &&
      !path.isAbsolute(relativeSource))
  ) {
    throw new Error('The source PDF must be outside the canonical Archive');
  }

  const sourceStats = await stat(resolvedSource);
  if (!sourceStats.isFile()) {
    throw new Error(`The source is not a regular file: ${resolvedSource}`);
  }

  await mkdir(resolvedArchive, { recursive: true });
  const source = await extractVillageVoiceIssue(resolvedSource);
  const archive = await inspectArchive(resolvedArchive, { allowEmpty: true });
  const sourceEntry: ArchiveIssue = {
    issue: source.issue,
    pageCount: source.pageCount,
    sourcePath: resolvedSource
  };
  assertNoIssueConflicts(archive, sourceEntry);

  const stagingDirectory = await mkdtemp(
    path.join(path.dirname(resolvedArchive), '.newsletter-add-')
  );
  const candidatePath = path.join(stagingDirectory, 'candidate.pdf');
  const destinationPath = path.join(
    resolvedArchive,
    canonicalIssueFilename(
      source.issue.publicationMonth,
      source.issue.issueNumber
    )
  );
  let installed = false;

  try {
    await optimizer(resolvedSource, candidatePath);
    const candidate = await extractVillageVoiceIssue(candidatePath);
    await validateOptimizedCandidate(source, candidate);

    await rename(candidatePath, destinationPath);
    installed = true;

    return candidate.issue;
  } finally {
    if (!installed) {
      await rm(destinationPath, { force: true });
    }
    await rm(stagingDirectory, { force: true, recursive: true });
  }
};

const validateOptimizedCandidate = async (
  source: ExtractedIssuePdf,
  candidate: ExtractedIssuePdf
) => {
  if (candidate.pageCount !== source.pageCount) {
    throw new Error(
      `Optimization changed page count from ${source.pageCount} to ${candidate.pageCount}`
    );
  }
  if (
    candidate.issue.publicationMonth !== source.issue.publicationMonth ||
    candidate.issue.issueNumber !== source.issue.issueNumber
  ) {
    throw new Error('Optimization changed the publication metadata');
  }
  if (
    !descriptionsMatchAfterOptimization(
      source.issue.description,
      candidate.issue.description
    )
  ) {
    throw new Error('Optimization changed the issue description');
  }
  if (!(await extractAllText(candidate.bytes)).trim()) {
    throw new Error('The optimized PDF contains no extractable text');
  }
};
