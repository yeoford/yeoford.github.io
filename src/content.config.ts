import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { defineCollection } from 'astro:content';

const newsletterCollection = defineCollection({
  loader: glob({ base: './src/content/newsletters', pattern: '**/*.json' }),
  schema: z.object({
    date: z.string().transform(str => new Date(str)),
    description: z.string().optional(),
    editorial: z.string().optional(),
    issueNumber: z.number(),
    path: z.string(),
    slug: z.string()
  })
});

export const collections = {
  newsletter: newsletterCollection
};
