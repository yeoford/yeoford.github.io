// @ts-check
import { resolve } from 'node:path';

import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const __dirname = import.meta.dirname;

// https://astro.build/config
export default defineConfig({
  integrations: [mdx(), react(), sitemap()],

  site: 'https://yeoford.org',

  vite: {
    plugins: [
      // @ts-ignore Bun may install identical Vite types at two paths.
      tailwindcss()
    ],
    resolve: {
      alias: {
        '@layouts': resolve(__dirname, './src/layout')
      }
    }
  }
});
