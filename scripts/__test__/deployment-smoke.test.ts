import { describe, expect, it } from 'vitest';

import { collectDeploymentUrls } from '../deployment-smoke';

describe('collectDeploymentUrls', () => {
  it('includes required routes and discovers PDF and social assets', () => {
    const baseUrl = new URL('https://yeoford.org/');
    const pages = new Map([
      [
        'https://yeoford.org/',
        '<meta property="og:image" content="/assets/countryside.jpg">'
      ],
      [
        'https://yeoford.org/village-voice/',
        [
          '<meta content="/images/newsletters/latest-cover.jpg" property="og:image">',
          '<a href="/pdf/latest.pdf" download>Download PDF</a>'
        ].join('')
      ],
      [
        'https://yeoford.org/newsletter/newsletter-2025-0-405/',
        [
          '<meta property="og:image" content="https://yeoford.org/images/newsletters/archive-cover.jpg">',
          '<a download href="/pdf/archive.pdf">Download PDF</a>'
        ].join('')
      ]
    ]);

    expect(collectDeploymentUrls(baseUrl, pages)).toEqual([
      'https://yeoford.org/',
      'https://yeoford.org/village-voice/',
      'https://yeoford.org/newsletter/newsletter-2025-0-405/',
      'https://yeoford.org/sitemap-index.xml',
      'https://yeoford.org/favicon.svg',
      'https://yeoford.org/assets/countryside.jpg',
      'https://yeoford.org/images/newsletters/latest-cover.jpg',
      'https://yeoford.org/pdf/latest.pdf',
      'https://yeoford.org/images/newsletters/archive-cover.jpg',
      'https://yeoford.org/pdf/archive.pdf'
    ]);
  });

  it('rejects pages without required PDF or social asset references', () => {
    const baseUrl = new URL('https://yeoford.org/');
    const pages = new Map([
      ['https://yeoford.org/', '<title>Home</title>'],
      ['https://yeoford.org/village-voice/', '<title>Latest</title>'],
      [
        'https://yeoford.org/newsletter/newsletter-2025-0-405/',
        '<title>Archive</title>'
      ]
    ]);

    expect(() => collectDeploymentUrls(baseUrl, pages)).toThrow(
      'Missing Open Graph image'
    );
  });

  it('rejects discovered assets outside the deployed origin', () => {
    const baseUrl = new URL('https://yeoford.org/');
    const pages = new Map([
      [
        'https://yeoford.org/',
        '<meta property="og:image" content="https://example.com/image.jpg">'
      ],
      [
        'https://yeoford.org/village-voice/',
        '<meta property="og:image" content="/latest.jpg"><a download href="/latest.pdf">'
      ],
      [
        'https://yeoford.org/newsletter/newsletter-2025-0-405/',
        '<meta property="og:image" content="/archive.jpg"><a download href="/archive.pdf">'
      ]
    ]);

    expect(() => collectDeploymentUrls(baseUrl, pages)).toThrow(
      'must use deployed origin'
    );
  });
});
