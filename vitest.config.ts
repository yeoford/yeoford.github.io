/// <reference types="vitest" />
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const helpersDirectory = fileURLToPath(
  new URL('./src/helpers', import.meta.url)
);

export default defineConfig({
  resolve: {
    alias: {
      '@helpers': helpersDirectory
    }
  },
  test: {}
});
