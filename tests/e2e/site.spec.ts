import { expect, test, type Page } from '@playwright/test';

const applicationErrors = (page: Page) => {
  const errors: string[] = [];

  page.on('console', message => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  page.on('pageerror', error => errors.push(error.message));

  return errors;
};

const expectNoHorizontalOverflow = async (page: Page) => {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));

  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
};

test('homepage and public routes remain available', async ({
  page,
  request
}) => {
  const errors = applicationErrors(page);

  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Yeoford Village' })
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'The Village' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Community Hall' })
  ).toBeVisible();
  await expect(
    page.getByRole('link', { exact: true, name: 'Village Voice' })
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Contact' })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  for (const route of [
    '/the-village',
    '/community-hall',
    '/village-voice',
    '/newsletter',
    '/newsletter/newsletter-2025-0-405',
    '/contact',
    '/sitemap-index.xml'
  ]) {
    const response = await request.get(route);
    expect(response.ok(), `${route} should return a successful response`).toBe(
      true
    );
  }

  expect(errors).toEqual([]);
});

test('map loads and retains a usable external-data fallback', async ({
  page
}) => {
  const errors = applicationErrors(page);
  const unpkgRequests: string[] = [];
  page.on('request', request => {
    if (request.url().includes('unpkg.com')) {
      unpkgRequests.push(request.url());
    }
  });

  await page.route(
    'https://tiles.openfreemap.org/styles/liberty',
    async route => {
      await route.fulfill({
        body: JSON.stringify({ layers: [], sources: {}, version: 8 }),
        contentType: 'application/json'
      });
    }
  );
  await page.goto('/the-village');
  await expect(page.locator('.maplibregl-canvas')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(unpkgRequests).toEqual([]);
  expect(errors).toEqual([]);

  await page.getByRole('link', { name: 'Contact' }).click();
  await expect(page).toHaveURL(/\/contact\/?$/);
  await page.getByRole('link', { name: 'The Village' }).click();
  await expect(page.locator('.maplibregl-canvas')).toBeVisible();

  await page.unroute('https://tiles.openfreemap.org/styles/liberty');
  await page.route('https://tiles.openfreemap.org/styles/liberty', route =>
    route.abort()
  );
  await page.reload();
  await expect(page.getByText('Map unavailable')).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Open Yeoford on OpenStreetMap' })
  ).toBeVisible();
});

test('latest and archive Issue PDFs expose working controls', async ({
  page
}) => {
  const errors = applicationErrors(page);
  const workerResponses: { ok: boolean; url: string }[] = [];
  const unpkgRequests: string[] = [];
  page.on('request', request => {
    if (request.url().includes('unpkg.com')) {
      unpkgRequests.push(request.url());
    }
  });
  page.on('response', response => {
    if (response.url().includes('pdf.worker')) {
      workerResponses.push({ ok: response.ok(), url: response.url() });
    }
  });

  for (const route of ['/village-voice', '/newsletter/newsletter-2025-0-405']) {
    await page.goto(route);
    await expect(page.getByText(/^Page 1 of \d+$/)).toBeVisible({
      timeout: 30_000
    });
    await expect(page.getByRole('button', { name: 'First' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText(/^Page 2 of \d+$/)).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }

  expect(unpkgRequests).toEqual([]);
  expect(workerResponses.length).toBeGreaterThan(0);
  expect(workerResponses.every(response => response.ok)).toBe(true);
  expect(
    workerResponses.every(response =>
      response.url.startsWith(page.url().split('/newsletter')[0])
    )
  ).toBe(true);
  expect(errors).toEqual([]);
});
