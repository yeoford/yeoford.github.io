// @ts-check
import { resolve } from 'node:path';

import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const __dirname = import.meta.dirname;

// https://astro.build/config
export default defineConfig({
  compressHTML: true,

  integrations: [react(), sitemap()],

  site: 'https://yeoford.org',

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@layouts': resolve(__dirname, './src/layout')
      }
    }
  }
});
