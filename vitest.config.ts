/// <reference types="vitest" />
import { fileURLToPath } from 'node:url';

import { configDefaults, defineConfig } from 'vitest/config';

const helpersDirectory = fileURLToPath(
  new URL('./src/helpers', import.meta.url)
);

export default defineConfig({
  resolve: {
    alias: {
      '@helpers': helpersDirectory
    }
  },
  test: {
    // Playwright owns tests/e2e; everything else is a unit test.
    exclude: [...configDefaults.exclude, 'tests/e2e/**']
  }
});
