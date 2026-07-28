import { getCollection } from 'astro:content';

import type { Entry, EntryTypes, NewsletterEntry } from '@types';

const getEntries = async (collection: EntryTypes): Promise<Entry[]> => {
  const entries: Entry[] = await getCollection(collection);
  // return entries.map((entry) => {
  //   entry.url = getEntryUrl(entry);
  //   return entry;
  // });
  return entries;
};

export const getPublishedNewsletters = async () =>
  (await getEntries('newsletter')) as NewsletterEntry[];

export const sortEntriesByDate = <T extends Entry>(entries: T[]): T[] =>
  entries.toSorted((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
