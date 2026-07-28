import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

describe('Map component', () => {
  it('pins MapLibre browser assets to a version that provides the global bundle', async () => {
    const source = await readFile(
      new URL('../Map.astro', import.meta.url),
      'utf8'
    );

    expect(source).toContain('https://unpkg.com/maplibre-gl@5.6.2/dist');
    expect(source).toContain('maplibre-gl.js');
    expect(source).toContain('maplibre-gl.css');
    expect(source).not.toContain('https://unpkg.com/maplibre-gl/dist');
  });
});
