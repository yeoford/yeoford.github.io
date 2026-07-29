import type { CollectionEntry } from 'astro:content';

export type Entry = NewsletterEntry;

export type NewsletterEntry = CollectionEntry<'newsletter'>;

export interface VillageVoiceIssue {
  coverPath: string;
  description: string;
  id: string;
  issueNumber: number;
  pdfPath: string;
  publicationMonth: string;
}
