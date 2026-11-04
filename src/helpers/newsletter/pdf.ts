import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { PDFPageProxy } from 'pdfjs-dist/types/src/display/api';
import sharp from 'sharp';

import type { VillageVoiceIssue } from '@types';

import { toVillageVoiceIssue } from './model';

interface Rect {
  height: number;
  width: number;
  x: number;
  y: number;
}

const COVER_IMAGE_RECT: Rect = {
  height: 1201,
  width: 1068,
  x: 60,
  y: 333
};

// The header's right column holds the Publication Month above the issue
// number. Their vertical positions differ between the Publisher and PowerPoint
// cover templates, so both are read from one region and told apart by content.
const HEADER_RECT: Rect = {
  height: 220,
  width: 373,
  x: 785,
  y: 97
};

const DESCRIPTION_RECT: Rect = {
  height: 100,
  width: 1093,
  x: 49,
  y: 1540
};

const FIRST_PAGE_RECTS = [COVER_IMAGE_RECT, HEADER_RECT, DESCRIPTION_RECT];

const ISSUE_NUMBER_TEXT = /^(?:issue|no\.|#)/iu;

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

export interface ExtractedIssuePdf {
  bytes: Uint8Array;
  issue: VillageVoiceIssue;
  pageCount: number;
}

export const extractVillageVoiceIssue = async (
  filePath: string
): Promise<ExtractedIssuePdf> => {
  try {
    const sourceBytes = await readFile(filePath);
    const bytes = new Uint8Array(sourceBytes);
    const document = await pdfjs.getDocument({ data: bytes.slice() }).promise;

    try {
      const firstPage = await document.getPage(1);
      assertCompatibleFirstPage(firstPage);
      const [headerItems, description] = await Promise.all([
        getTextItemsInRect(firstPage, HEADER_RECT),
        getTextInRect(firstPage, DESCRIPTION_RECT)
      ]);
      const issueNumberText = headerItems
        .filter(text => ISSUE_NUMBER_TEXT.test(text.trim()))
        .join(' ');
      const publicationMonthText = headerItems
        .filter(text => !ISSUE_NUMBER_TEXT.test(text.trim()))
        .join(' ');

      return {
        bytes,
        issue: toVillageVoiceIssue({
          description,
          issueNumberText,
          publicationMonthText
        }),
        pageCount: document.numPages
      };
    } finally {
      await document.destroy();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${path.basename(filePath)}: ${message}`, {
      cause: error
    });
  }
};

export const extractAllText = async (bytes: Uint8Array) => {
  const document = await pdfjs.getDocument({ data: bytes.slice() }).promise;

  try {
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(
        content.items
          .map(item => ('str' in item ? item.str : ''))
          .join(' ')
          .trim()
      );
    }
    return pages.join('\n');
  } finally {
    await document.destroy();
  }
};

export const renderCover = async (bytes: Uint8Array, outputPath: string) => {
  const { PDFiumLibrary } = await import('@hyzyla/pdfium');
  const library = await PDFiumLibrary.init();
  let document;

  try {
    document = await library.loadDocument(bytes);
    const page = document.getPage(0);
    const image = await page.render({
      render: async ({ data, height, width }) =>
        sharp(data, {
          raw: { channels: 4, height, width }
        })
          .extract({
            height: COVER_IMAGE_RECT.height,
            left: COVER_IMAGE_RECT.x,
            top: COVER_IMAGE_RECT.y,
            width: COVER_IMAGE_RECT.width
          })
          .jpeg({ quality: 60 })
          .toBuffer(),
      scale: 2
    });
    await writeFile(outputPath, image.data);
  } finally {
    document?.destroy();
    library.destroy();
  }
};

const assertCompatibleFirstPage = (page: PDFPageProxy) => {
  const viewport = page.getViewport({ scale: 2 });
  const incompatible = FIRST_PAGE_RECTS.some(
    rect =>
      rect.x < 0 ||
      rect.y < 0 ||
      rect.x + rect.width > viewport.width ||
      rect.y + rect.height > viewport.height
  );

  if (incompatible) {
    throw new Error(
      `First page ${viewport.width}x${viewport.height} cannot contain the metadata regions and cover crop`
    );
  }
};

const getTextInRect = async (page: PDFPageProxy, rect: Rect) =>
  (await getTextItemsInRect(page, rect)).join(' ');

const getTextItemsInRect = async (page: PDFPageProxy, rect: Rect) => {
  const textContent = await page.getTextContent();
  const viewport = page.getViewport({ scale: 2 });

  return textContent.items
    .filter(item => {
      if (!('str' in item) || item.height === 0) {
        return false;
      }

      const itemRect = {
        height: item.height * viewport.scale,
        width: item.width * viewport.scale,
        x: item.transform[4] * viewport.scale,
        y:
          (viewport.height / viewport.scale - item.transform[5]) *
            viewport.scale -
          item.height * viewport.scale
      };

      return rectIntersects(itemRect, rect);
    })
    .map(item => ('str' in item ? item.str : ''))
    .filter(text => text.trim() !== '');
};

const rectIntersects = (first: Rect, second: Rect) =>
  first.x < second.x + second.width &&
  first.x + first.width > second.x &&
  first.y < second.y + second.height &&
  first.y + first.height > second.y;
