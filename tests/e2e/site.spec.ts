import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

import { MAP_STYLE_URL } from '../../src/constants';

const routes = [
  '/',
  '/the-village',
  '/community-hall',
  '/village-voice',
  '/newsletter',
  '/newsletter/newsletter-2025-0-405',
  '/contact'
] as const;

const staticMetadata = {
  '/': {
    description: 'Yeoford is a small village in Mid-Devon, England.',
    title: 'Yeoford Village'
  },
  '/community-hall': {
    description:
      'View the Yeoford Community Hall calendar, facilities, hire charges, and booking details.',
    title: 'Community Hall | Yeoford'
  },
  '/contact': {
    description:
      'Contact Yeoford about village groups, events, and facility bookings.',
    title: 'Contact | Yeoford'
  },
  '/newsletter': {
    description:
      'Browse the complete archive of published Yeoford Village Voice issues.',
    title: 'Village Voice Archive | Yeoford'
  },
  '/the-village': {
    description:
      'Learn about Yeoford village, local transport, community life, and social links.',
    title: 'The Village | Yeoford'
  }
} as const;

const cdnRequests = (page: Page) => {
  const urls: string[] = [];

  page.on('request', request => {
    if (request.url().includes('unpkg.com')) {
      urls.push(request.url());
    }
  });

  return urls;
};

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

const expectVisibleFocus = async (page: Page) => {
  const focusedStyles = await page.evaluate(() => {
    const focused = document.activeElement;
    if (!(focused instanceof HTMLElement)) {
      return null;
    }

    const styles = getComputedStyle(focused);
    return {
      boxShadow: styles.boxShadow,
      outlineStyle: styles.outlineStyle,
      outlineWidth: styles.outlineWidth
    };
  });

  expect(focusedStyles).not.toBeNull();
  expect(
    focusedStyles?.outlineStyle !== 'none' ||
      focusedStyles?.outlineWidth !== '0px' ||
      focusedStyles?.boxShadow !== 'none'
  ).toBe(true);
};

const tabTo = async (page: Page, locator: Locator) => {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await page.keyboard.press('Tab');
    if (await locator.evaluate(element => element === document.activeElement)) {
      return;
    }
  }

  await expect(locator).toBeFocused();
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

test('representative routes meet metadata, heading, and WCAG requirements', async ({
  page,
  request
}) => {
  for (const route of routes) {
    await page.goto(route);

    await expect(page.locator('h1')).toHaveCount(1);
    const expectedMetadata =
      staticMetadata[route as keyof typeof staticMetadata];
    if (expectedMetadata) {
      await expect(page).toHaveTitle(expectedMetadata.title);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        expectedMetadata.description
      );
    } else {
      await expect(page).toHaveTitle(
        /^Village Voice \d+ — \w+ \d{4} \| Yeoford$/
      );
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        /^This month: .+/
      );
    }
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`^https://yeoford\\.org${route === '/' ? '/?$' : route}`)
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      /^https:\/\/yeoford\.org/
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      /^https:\/\/yeoford\.org\/.+/
    );
    await expect(page.locator('meta[name="twitter:url"]')).toHaveAttribute(
      'content',
      /^https:\/\/yeoford\.org/
    );
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
      'content',
      /^https:\/\/yeoford\.org\/.+/
    );
    await expect(page.locator('meta[property^="twitter:"]')).toHaveCount(0);
    await expect(
      page.locator('link[rel="alternate"][type*="rss"]')
    ).toHaveCount(0);

    const imageUrl = await page
      .locator('meta[property="og:image"]')
      .getAttribute('content');
    expect(imageUrl).not.toBeNull();
    // Metadata points at production; check the asset exists in this build.
    const imageResponse = await request.get(new URL(imageUrl!).pathname);
    expect(imageResponse.ok(), `${imageUrl} should be available`).toBe(true);

    const accessibility = await new AxeBuilder({ page })
      .exclude('iframe')
      .withTags([
        'wcag2a',
        'wcag2aa',
        'wcag21a',
        'wcag21aa',
        'wcag22a',
        'wcag22aa'
      ])
      .analyze();
    const blockingViolations = accessibility.violations.filter(
      violation =>
        violation.impact === 'serious' || violation.impact === 'critical'
    );
    expect(
      blockingViolations.map(violation => ({
        id: violation.id,
        targets: violation.nodes.map(node => node.target)
      }))
    ).toEqual([]);
  }
});

test('keyboard users receive visible focus on primary interactions', async ({
  page
}) => {
  await page.goto('/');
  await tabTo(page, page.getByRole('link', { name: 'The Village' }));
  await expectVisibleFocus(page);

  await page.goto('/newsletter');
  await tabTo(page, page.locator('article a').first());
  await expectVisibleFocus(page);

  await page.goto('/community-hall');
  await page.getByRole('link', { name: 'yeoford.hall@gmail.com' }).focus();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('region', { name: 'Community Hall charges' })
  ).toBeFocused();
  await expectVisibleFocus(page);

  await page.goto('/contact');
  await tabTo(page, page.getByLabel('Your Name (required)'));
  await expectVisibleFocus(page);
});

test('map loads and retains a usable external-data fallback', async ({
  page
}) => {
  const errors = applicationErrors(page);
  const unpkgRequests = cdnRequests(page);

  await page.route(MAP_STYLE_URL, async route => {
    await route.fulfill({
      body: JSON.stringify({ layers: [], sources: {}, version: 8 }),
      contentType: 'application/json'
    });
  });
  await page.goto('/the-village');
  await expect(page.locator('.maplibregl-canvas')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(unpkgRequests).toEqual([]);
  expect(errors).toEqual([]);

  await page.getByRole('link', { name: 'Contact' }).click();
  await expect(page).toHaveURL(/\/contact\/?$/);
  await page.getByRole('link', { name: 'The Village' }).click();
  await expect(page.locator('.maplibregl-canvas')).toBeVisible();

  await page.unroute(MAP_STYLE_URL);
  await page.route(MAP_STYLE_URL, route => route.abort());
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
  const unpkgRequests = cdnRequests(page);
  page.on('response', response => {
    if (response.url().includes('pdf.worker')) {
      workerResponses.push({ ok: response.ok(), url: response.url() });
    }
  });

  for (const route of ['/village-voice', '/newsletter/newsletter-2025-0-405']) {
    await page.goto(route);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Village Voice \d+ - \w+ \d{4}/
      })
    ).toBeVisible();
    await expect(page.getByText(/^Page 1 of \d+$/)).toBeVisible({
      timeout: 30_000
    });
    await expect(page.getByRole('button', { name: 'First' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText(/^Page 2 of \d+$/)).toBeVisible();
    const download = page.getByRole('link', { name: 'Download PDF' });
    await expect(download).toHaveAttribute('download', '');
    const pdfPath = await download.getAttribute('href');
    expect(pdfPath).not.toBeNull();
    expect((await page.request.get(pdfPath!)).ok()).toBe(true);
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

test('Community Hall content contains overflow and keeps approved facts', async ({
  page
}, testInfo) => {
  await page.goto('/community-hall');

  const charges = page.getByRole('region', { name: 'Community Hall charges' });
  await expect(charges).toHaveAttribute('tabindex', '0');
  const scrollHint = page.getByText('Scroll horizontally to see all charges');
  if (testInfo.project.name === 'mobile') {
    await expect(scrollHint).toBeVisible();
  } else {
    await expect(scrollHint).toBeHidden();
  }
  await expect(
    page.getByRole('link', { name: 'yeoford.hall@gmail.com' })
  ).toHaveAttribute('href', 'mailto:yeoford.hall@gmail.com');
  await expect(page.getByTitle('Yeoford Hall Calendar')).toHaveAttribute(
    'src',
    /^https:\/\/www\.google\.com\/calendar\/embed\?/
  );
  await expectNoHorizontalOverflow(page);
});

test('contact form validates and generates the approved mailto URL', async ({
  page
}) => {
  await page.goto('/contact');

  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByLabel('Your Name (required)')).toBeFocused();

  await page.getByLabel('Your Name (required)').fill('Alex Example');
  await page.getByLabel('Your Email (required)').fill('alex@example.com');
  await page.getByLabel('Subject (required)').fill('Hall question');
  await page
    .getByLabel('Message (required)')
    .fill('Please send booking information.');
  await page.getByRole('button', { name: 'Send' }).click();

  await expect(page.locator('#contactForm')).toHaveAttribute(
    'data-mailto',
    'mailto:admin.hall@gmail.com?subject=Hall%20question&body=Hello%2C%0A%0AMy%20name%20is%20Alex%20Example.%0AMy%20email%20is%20alex%40example.com.%0A%0AMessage%3A%0A%0APlease%20send%20booking%20information.%0A%0A---%0AThis%20email%20was%20pre-filled%20from%20the%20yeoford.org%20contact%20form.'
  );
});
