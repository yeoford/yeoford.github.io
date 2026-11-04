const ARCHIVE_PATH = '/newsletter/newsletter-2025-0-405/';
const LATEST_PATH = '/village-voice/';
const RETRY_ATTEMPTS = 12;
const RETRY_DELAY_MS = 10_000;

const requiredPageUrls = (baseUrl: URL) => [
  new URL('/', baseUrl).toString(),
  new URL(LATEST_PATH, baseUrl).toString(),
  new URL(ARCHIVE_PATH, baseUrl).toString()
];

const readAttributes = (tag: string): Map<string, string> => {
  const attributes = new Map<string, string>();
  const pattern =
    /([^\s=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  for (const match of tag.matchAll(pattern)) {
    const [, name, doubleQuoted, singleQuoted, unquoted] = match;
    if (name) {
      attributes.set(
        name.toLowerCase(),
        doubleQuoted ?? singleQuoted ?? unquoted ?? ''
      );
    }
  }

  return attributes;
};

const tags = (html: string, name: string): Map<string, string>[] =>
  [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(match =>
    readAttributes(match[0])
  );

const requiredAsset = (
  html: string,
  pageUrl: string,
  predicate: (attributes: Map<string, string>) => boolean,
  attribute: string,
  description: string
): string => {
  const tag = [...tags(html, 'meta'), ...tags(html, 'a')].find(predicate);
  const value = tag?.get(attribute);

  if (!value) {
    throw new Error(`Missing ${description} on ${pageUrl}`);
  }

  const assetUrl = new URL(value, pageUrl);
  if (assetUrl.origin !== new URL(pageUrl).origin) {
    throw new Error(
      `${description} on ${pageUrl} must use deployed origin: ${assetUrl}`
    );
  }

  return assetUrl.toString();
};

export const collectDeploymentUrls = (
  baseUrl: URL,
  pages: ReadonlyMap<string, string>
): string[] => {
  const pageUrls = requiredPageUrls(baseUrl);
  const urls = [
    ...pageUrls,
    new URL('/sitemap-index.xml', baseUrl).toString(),
    new URL('/favicon.svg', baseUrl).toString()
  ];

  for (const pageUrl of pageUrls) {
    const html = pages.get(pageUrl);
    if (html === undefined) {
      throw new Error(`Missing fetched page ${pageUrl}`);
    }

    urls.push(
      requiredAsset(
        html,
        pageUrl,
        attributes => attributes.get('property') === 'og:image',
        'content',
        'Open Graph image'
      )
    );

    if (pageUrl !== pageUrls[0]) {
      urls.push(
        requiredAsset(
          html,
          pageUrl,
          attributes => attributes.has('download') && attributes.has('href'),
          'href',
          'PDF download'
        )
      );
    }
  }

  return [...new Set(urls)];
};

const wait = (milliseconds: number) =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

const fetchSuccessful = async (
  url: string,
  attempts = RETRY_ATTEMPTS
): Promise<Response> => {
  let lastFailure = 'no response';

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: 'follow' });
      if (response.ok) {
        return response;
      }
      lastFailure = `HTTP ${response.status}`;
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
    }

    if (attempt < attempts) {
      await wait(RETRY_DELAY_MS);
    }
  }

  throw new Error(`${url} failed after ${attempts} attempts: ${lastFailure}`);
};

const run = async () => {
  const argument = process.argv[2];
  if (!argument) {
    throw new Error('Usage: bun run smoke:deployment -- <base-url>');
  }

  const baseUrl = new URL(argument);
  const pages = new Map<string, string>();

  for (const url of requiredPageUrls(baseUrl)) {
    const response = await fetchSuccessful(url);
    pages.set(url, await response.text());
  }

  const urls = collectDeploymentUrls(baseUrl, pages);
  await Promise.all(urls.map(url => fetchSuccessful(url)));

  console.log(`Deployment smoke passed for ${urls.length} URLs`);
};

if (import.meta.main) {
  await run();
}
