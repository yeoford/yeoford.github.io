import type { VillageVoiceIssue } from '@types';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
] as const;

// Every month is spelled out or abbreviated to its first three letters on the
// cover; 'Sept' is the one irregular abbreviation the archive uses.
const MONTH_NUMBERS = new Map<string, number>([
  ...MONTH_NAMES.flatMap((name, index): [string, number][] => [
    [name.toLowerCase(), index + 1],
    [name.slice(0, 3).toLowerCase(), index + 1]
  ]),
  ['sept', 9]
]);

/** A Publication Month: a timezone-independent `YYYY-MM`. */
export const PUBLICATION_MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/u;

/** An Issue ID: the legacy route identifier, with its zero-based month. */
export const ISSUE_ID_PATTERN = /^newsletter-\d{4}-(?:[0-9]|1[01])-[1-9]\d*$/u;

const normalizeWhitespace = (value: string) =>
  value.trim().replace(/\s+/gu, ' ');

export const parsePublicationMonth = (value: string) => {
  const normalized = normalizeWhitespace(value);
  const match = /^([a-z]+) ([0-9]{4})$/iu.exec(normalized);
  const month = match ? MONTH_NUMBERS.get(match[1].toLowerCase()) : undefined;

  if (!match || !month) {
    throw new Error(`Invalid publication month: ${JSON.stringify(value)}`);
  }

  return `${match[2]}-${month.toString().padStart(2, '0')}`;
};

export const formatPublicationMonth = (publicationMonth: string) => {
  const match = PUBLICATION_MONTH_PATTERN.exec(publicationMonth);
  if (!match) {
    throw new Error(`Invalid Publication Month: ${publicationMonth}`);
  }
  return `${MONTH_NAMES[Number(match[2]) - 1]} ${match[1]}`;
};

export const parseIssueNumber = (value: string) => {
  const normalized = normalizeWhitespace(value);
  const match =
    /^(?:(?:issue(?: no\.)?|no\.)\s+([1-9][0-9]*)|#\s*([1-9][0-9]*))$/iu.exec(
      normalized
    );
  const issueNumber = match ? Number(match[1] ?? match[2]) : Number.NaN;

  if (!Number.isSafeInteger(issueNumber)) {
    throw new Error(`Invalid issue number: ${JSON.stringify(value)}`);
  }

  return issueNumber;
};

export const issueId = (publicationMonth: string, issueNumber: number) => {
  const [year, month] = publicationMonth.split('-');
  return `newsletter-${year}-${Number(month) - 1}-${issueNumber}`;
};

export const canonicalIssueFilename = (
  publicationMonth: string,
  issueNumber: number
) => `${publicationMonth}-${issueNumber}.pdf`;

export const COVER_URL_PREFIX = '/images/newsletters/';
export const PDF_URL_PREFIX = '/pdf/';

/** The file names of the Derived Assets generated for one Issue. */
export const derivedAssetNames = (id: string) => ({
  cover: `${id}-cover.jpg`,
  metadata: `${id}.json`,
  pdf: `${id}.pdf`
});

/** The public URLs those Derived Assets are served from. */
const derivedAssetUrls = (id: string) => {
  const names = derivedAssetNames(id);
  return {
    coverPath: `${COVER_URL_PREFIX}${names.cover}`,
    pdfPath: `${PDF_URL_PREFIX}${names.pdf}`
  };
};

interface VillageVoiceIssueInput {
  description: string;
  issueNumberText: string;
  publicationMonthText: string;
}

export const toVillageVoiceIssue = ({
  description,
  issueNumberText,
  publicationMonthText
}: VillageVoiceIssueInput): VillageVoiceIssue => {
  const normalizedDescription = normalizeWhitespace(description);

  if (!normalizedDescription) {
    throw new Error('Invalid description: it must not be empty');
  }

  const publicationMonth = parsePublicationMonth(publicationMonthText);
  const issueNumber = parseIssueNumber(issueNumberText);
  const id = issueId(publicationMonth, issueNumber);

  return {
    ...derivedAssetUrls(id),
    description: normalizedDescription,
    id,
    issueNumber,
    publicationMonth
  };
};

const normalizeOptimizationDescription = (value: string) =>
  normalizeWhitespace(value).replace(/\s*(['’])\s*/gu, '$1');

export const descriptionsMatchAfterOptimization = (
  original: string,
  optimized: string
) =>
  normalizeOptimizationDescription(original) ===
  normalizeOptimizationDescription(optimized);
