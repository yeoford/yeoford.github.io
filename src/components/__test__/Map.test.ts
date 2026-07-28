import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

describe('Map component', () => {
  it('bundles MapLibre code and styles while keeping map data external', async () => {
    const source = await readFile(
      new URL('../Map.astro', import.meta.url),
      'utf8'
    );

    expect(source).toContain("from 'maplibre-gl'");
    expect(source).toContain("import 'maplibre-gl/dist/maplibre-gl.css'");
    expect(source).not.toContain('unpkg.com');
    expect(source).not.toContain('window.maplibregl');
  });
});
