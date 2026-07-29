import { getCollection } from 'astro:content';

import type { Entry, NewsletterEntry } from '@types';

export const getPublishedNewsletters = async (): Promise<NewsletterEntry[]> =>
  getCollection('newsletter');

/** Newest Publication Month first, so the Latest Issue leads. */
export const sortEntriesByNewestPublicationMonth = <T extends Entry>(
  entries: T[]
): T[] =>
  entries.toSorted((a, b) =>
    b.data.publicationMonth.localeCompare(a.data.publicationMonth)
  );

/** The Latest Issue: the Issue with the greatest Publication Month. */
export const getLatestIssue = <T extends Entry>(entries: T[]): T => {
  const [latest] = sortEntriesByNewestPublicationMonth(entries);

  if (!latest) {
    throw new Error('There are no published Issues');
  }

  return latest;
};
