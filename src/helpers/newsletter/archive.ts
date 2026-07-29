import { readdir } from 'node:fs/promises';
import path from 'node:path';

import type { VillageVoiceIssue } from '@types';

import { canonicalIssueFilename, derivedAssetNames } from './model';
import { extractVillageVoiceIssue } from './pdf';

export interface ArchiveIssue {
  issue: VillageVoiceIssue;
  pageCount: number;
  sourcePath: string;
}

export class ArchiveValidationError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(
      `Village Voice Archive validation failed:\n${problems
        .map(problem => `- ${problem}`)
        .join('\n')}`
    );
    this.name = 'ArchiveValidationError';
    this.problems = problems;
  }
}

export const inspectArchive = async (
  archiveDirectory: string,
  { allowEmpty = false }: { allowEmpty?: boolean } = {}
): Promise<ArchiveIssue[]> => {
  const filenames = (await readdir(archiveDirectory))
    .filter(filename => filename.toLowerCase().endsWith('.pdf'))
    .toSorted();

  if (filenames.length === 0 && !allowEmpty) {
    throw new ArchiveValidationError([
      'Archive contains no canonical Issue PDFs'
    ]);
  }

  const problems: string[] = [];
  const issues: ArchiveIssue[] = [];

  for (const filename of filenames) {
    const sourcePath = path.join(archiveDirectory, filename);
    try {
      const extracted = await extractVillageVoiceIssue(sourcePath);
      const expectedFilename = canonicalIssueFilename(
        extracted.issue.publicationMonth,
        extracted.issue.issueNumber
      );

      if (filename !== expectedFilename) {
        problems.push(
          `${filename}: expected canonical filename ${expectedFilename}`
        );
      }

      issues.push({
        issue: extracted.issue,
        pageCount: extracted.pageCount,
        sourcePath
      });
    } catch (error) {
      problems.push(error instanceof Error ? error.message : String(error));
    }
  }

  addDuplicateProblems(problems, issues);

  if (problems.length > 0) {
    throw new ArchiveValidationError(problems.toSorted());
  }

  return issues.toSorted((first, second) =>
    first.issue.publicationMonth.localeCompare(second.issue.publicationMonth)
  );
};

export const assertNoIssueConflicts = (
  archiveIssues: ArchiveIssue[],
  candidate: ArchiveIssue
) => {
  const problems: string[] = [];
  addDuplicateProblems(problems, [...archiveIssues, candidate]);

  if (problems.length > 0) {
    throw new ArchiveValidationError(problems.toSorted());
  }
};

const addDuplicateProblems = (
  problems: string[],
  archiveIssues: ArchiveIssue[]
) => {
  addDuplicates(
    problems,
    archiveIssues,
    'Publication Month',
    issue => issue.publicationMonth
  );
  addDuplicates(problems, archiveIssues, 'Issue Number', issue =>
    String(issue.issueNumber)
  );
  addDuplicates(problems, archiveIssues, 'Issue ID', issue => issue.id);
  addDuplicates(problems, archiveIssues, 'output path', issue => issue.pdfPath);
  addDuplicates(
    problems,
    archiveIssues,
    'output path',
    issue => issue.coverPath
  );
  addDuplicates(
    problems,
    archiveIssues,
    'output path',
    issue => derivedAssetNames(issue.id).metadata
  );
};

const addDuplicates = (
  problems: string[],
  archiveIssues: ArchiveIssue[],
  label: string,
  value: (issue: VillageVoiceIssue) => string
) => {
  const counts = new Map<string, number>();

  for (const archiveIssue of archiveIssues) {
    const key = value(archiveIssue.issue);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  for (const [key, count] of counts) {
    if (count > 1) {
      problems.push(`duplicate ${label} ${key}`);
    }
  }
};
