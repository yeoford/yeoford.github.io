import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { defineCollection } from 'astro:content';

import {
  COVER_URL_PREFIX,
  ISSUE_ID_PATTERN,
  PDF_URL_PREFIX,
  PUBLICATION_MONTH_PATTERN
} from './helpers/newsletter/model';

const newsletterCollection = defineCollection({
  loader: glob({ base: './src/content/newsletters', pattern: '**/*.json' }),
  schema: z.object({
    coverPath: z.string().startsWith(COVER_URL_PREFIX),
    description: z.string().trim().min(1),
    id: z.string().regex(ISSUE_ID_PATTERN),
    issueNumber: z.number().int().positive(),
    pdfPath: z.string().startsWith(PDF_URL_PREFIX),
    publicationMonth: z.string().regex(PUBLICATION_MONTH_PATTERN)
  })
});

export const collections = {
  newsletter: newsletterCollection
};
