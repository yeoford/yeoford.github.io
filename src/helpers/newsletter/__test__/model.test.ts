import { describe, expect, it } from 'vitest';

import {
  canonicalIssueFilename,
  descriptionsMatchAfterOptimization,
  formatPublicationMonth,
  issueId,
  parseIssueNumber,
  parsePublicationMonth,
  toVillageVoiceIssue
} from '../model';

describe('parsePublicationMonth', () => {
  it.each([
    ['April 2025', '2025-04'],
    ['apr 2025', '2025-04'],
    [' Sept 2026 ', '2026-09'],
    ['DECEMBER 2026', '2026-12']
  ])('parses %j without constructing a timestamp', (input, expected) => {
    expect(parsePublicationMonth(input)).toBe(expected);
  });

  it.each(['2025-04', 'April 25', 'April 2025 edition', 'Smarch 2025'])(
    'rejects the unsupported label %j',
    input => {
      expect(() => parsePublicationMonth(input)).toThrow('publication month');
    }
  );
});

describe('formatPublicationMonth', () => {
  it('formats a Publication Month without local-time date parsing', () => {
    expect(formatPublicationMonth('2025-04')).toBe('April 2025');
  });
});

describe('parseIssueNumber', () => {
  it.each([
    ['Issue 405', 405],
    ['issue no. 406', 406],
    ['No. 407', 407],
    ['#408', 408]
  ])('parses %j', (input, expected) => {
    expect(parseIssueNumber(input)).toBe(expected);
  });

  it.each([
    '405',
    'Issue405',
    'Issue No.406',
    'Issue 0',
    'Issue -1',
    'Issue 4 extra'
  ])('rejects the unsupported label %j', input => {
    expect(() => parseIssueNumber(input)).toThrow('issue number');
  });
});

describe('VillageVoiceIssue', () => {
  it('preserves the zero-based month segment in the legacy Issue ID', () => {
    expect(issueId('2025-01', 405)).toBe('newsletter-2025-0-405');
    expect(issueId('2025-12', 416)).toBe('newsletter-2025-11-416');
  });

  it('derives stable public paths and the canonical filename', () => {
    expect(canonicalIssueFilename('2025-04', 408)).toBe('2025-04-408.pdf');
    expect(
      toVillageVoiceIssue({
        description: '  This month:\nYeofest!  ',
        issueNumberText: 'Issue 408',
        publicationMonthText: 'April 2025'
      })
    ).toEqual({
      coverPath: '/images/newsletters/newsletter-2025-3-408-cover.jpg',
      description: 'This month: Yeofest!',
      id: 'newsletter-2025-3-408',
      issueNumber: 408,
      pdfPath: '/pdf/newsletter-2025-3-408.pdf',
      publicationMonth: '2025-04'
    });
  });

  it('rejects an empty normalized description', () => {
    expect(() =>
      toVillageVoiceIssue({
        description: ' \n ',
        issueNumberText: '#408',
        publicationMonthText: 'Apr 2025'
      })
    ).toThrow('description');
  });
});

describe('descriptionsMatchAfterOptimization', () => {
  it('allows whitespace changes immediately around apostrophes', () => {
    expect(
      descriptionsMatchAfterOptimization(
        'The Duck ’ s Golden Eggs',
        'The Duck’s Golden Eggs'
      )
    ).toBe(true);
    expect(
      descriptionsMatchAfterOptimization(
        'you ’ re not Hallucinating',
        'you’re not Hallucinating'
      )
    ).toBe(true);
  });

  it('rejects other wording or punctuation changes', () => {
    expect(
      descriptionsMatchAfterOptimization(
        'The Duck’s Golden Eggs!',
        'The Duck’s Golden Eggs?'
      )
    ).toBe(false);
  });
});
