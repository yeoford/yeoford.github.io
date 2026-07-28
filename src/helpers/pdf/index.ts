import {
  access,
  copyFile,
  readFile,
  unlink,
  writeFile
} from 'node:fs/promises';
import path from 'node:path';

import type { PDFPageProxy } from 'pdfjs-dist/types/src/display/api';
import sharp from 'sharp';

import { createLog } from '@helpers/log';

import { parseMonthYear } from '../date';
import { safeParseInt } from '../number';
import { slugify } from '../string';

// Set up Node.js environment for PDF.js
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

const log = createLog('pdf');

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

const EDITORIAL_RECT: Rect = {
  height: 800,
  width: 1064,
  x: 80,
  y: 200
};

const DATE_RECT: Rect = {
  height: 120,
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

const ISSUE_RECT: Rect = {
  height: 73,
  width: 193,
  x: 936,
  y: 244
};

interface ProcessNewsletterOptions {
  extractPagesToImage?: number[];
  outputDataDir?: string;
  outputImageDir?: string;
  outputPdfDir?: string;
  removeAfterProcessing?: boolean;
  skipExistingOutputs?: boolean;
}

export const processNewsletter = async (
  filePath: string,
  {
    extractPagesToImage,
    outputDataDir,
    outputImageDir,
    outputPdfDir,
    removeAfterProcessing,
    skipExistingOutputs
  }: ProcessNewsletterOptions = {}
) => {
  // PDF.js takes ownership of the buffer it is handed, so it gets a copy and
  // the original bytes stay available for rendering.
  const pdfBytes = await readFile(filePath);
  const pdfDoc = await pdfjs.getDocument({ data: new Uint8Array(pdfBytes) })
    .promise;

  try {
    const [firstPage, editorialPage] = await Promise.all([
      pdfDoc.getPage(1),
      pdfDoc.getPage(3)
    ]);

    const [dateText, description, issueText, editorialText] = await Promise.all(
      [
        getTextInRect(firstPage, DATE_RECT),
        getTextInRect(firstPage, DESCRIPTION_RECT),
        getTextInRect(firstPage, ISSUE_RECT),
        getTextInRect(editorialPage, EDITORIAL_RECT)
      ]
    );

    const date = parseMonthYear(dateText);
    const issueNumber = issueTextToIssueNumber(issueText);

    const slug = slugify(
      `newsletter-${date?.getFullYear()}-${date?.getMonth()}-${issueNumber}`
    );

    if (outputImageDir) {
      const imageOutputs: ImageOutput[] = [];
      const coverImagePath = path.resolve(outputImageDir, `${slug}-cover.jpg`);

      if (await shouldWriteOutput(coverImagePath, skipExistingOutputs)) {
        imageOutputs.push({
          crop: COVER_IMAGE_RECT,
          pageNumber: 1,
          path: coverImagePath
        });
      }

      for (const pageNumber of extractPagesToImage ?? []) {
        const imagePath = path.resolve(
          outputImageDir,
          `${slug}-page-${pageNumber}.jpg`
        );

        if (await shouldWriteOutput(imagePath, skipExistingOutputs)) {
          imageOutputs.push({ pageNumber, path: imagePath });
        }
      }

      if (imageOutputs.length > 0) {
        await renderPdfImages(pdfBytes, imageOutputs);
      }
    }

    if (outputDataDir) {
      const dataPath = path.resolve(outputDataDir, `${slug}.json`);

      if (await shouldWriteOutput(dataPath, skipExistingOutputs)) {
        await writeFile(
          dataPath,
          JSON.stringify(
            {
              date,
              description,
              editorial: editorialText,
              issueNumber,
              path: `/pdf/${slug}.pdf`,
              slug
            },
            null,
            2
          )
        );
      }
    }

    if (outputPdfDir) {
      const pdfPath = path.resolve(outputPdfDir, `${slug}.pdf`);

      if (await shouldWriteOutput(pdfPath, skipExistingOutputs)) {
        await copyFile(filePath, pdfPath);
      }
    }

    if (removeAfterProcessing) {
      await unlink(filePath);
    }

    return {
      metadata: {
        issueDate: date,
        issueNumber
      },
      path: filePath,
      slug,
      text: {
        date: dateText,
        description,
        editorial: editorialText,
        issue: issueText
      }
    };
  } finally {
    await pdfDoc.destroy();
  }
};

const shouldWriteOutput = async (
  outputPath: string,
  skipExistingOutputs = false
) => {
  if (!skipExistingOutputs) {
    return true;
  }

  try {
    await access(outputPath);
    return false;
  } catch {
    return true;
  }
};

const issueTextToIssueNumber = (issueText: string) => {
  const issueNumber = issueText.split(' ')[1];
  return safeParseInt(issueNumber);
};

interface ImageOutput {
  crop?: Rect;
  pageNumber: number;
  path: string;
}

const renderPdfImages = async (
  pdfBytes: Uint8Array,
  imageOutputs: ImageOutput[]
) => {
  const { PDFiumLibrary } = await import('@hyzyla/pdfium');
  const library = await PDFiumLibrary.init();
  let pdfiumDocument;

  try {
    pdfiumDocument = await library.loadDocument(pdfBytes);

    for (const output of imageOutputs) {
      const page = pdfiumDocument.getPage(output.pageNumber - 1);
      const image = await page.render({
        render: async ({ data, height, width }) => {
          let pipeline = sharp(data, {
            raw: { channels: 4, height, width }
          });

          if (output.crop) {
            pipeline = pipeline.extract({
              height: output.crop.height,
              left: output.crop.x,
              top: output.crop.y,
              width: output.crop.width
            });
          }

          return pipeline.jpeg({ quality: 60 }).toBuffer();
        },
        scale: 2
      });

      await writeFile(output.path, image.data);
    }
  } catch (error) {
    log.error('Error rendering PDF page:', error);
    throw error;
  } finally {
    pdfiumDocument?.destroy();
    library.destroy();
  }
};

const getTextInRect = async (page: PDFPageProxy, rect: Rect) => {
  const textContent = await page.getTextContent();
  const viewport = page.getViewport({ scale: 2.0 });

  const pdfRectToPixelRect = (pdfRect: {
    height: number;
    width: number;
    x: number;
    y: number;
  }) => {
    // Convert from PDF coordinates to pixel coordinates
    const pixelX = pdfRect.x * viewport.scale;
    const pixelY =
      (viewport.height / viewport.scale - pdfRect.y) * viewport.scale;
    const pixelWidth = pdfRect.width * viewport.scale;
    const pixelHeight = pdfRect.height * viewport.scale;

    return {
      height: pixelHeight,
      width: pixelWidth,
      x: pixelX,
      y: pixelY - pixelHeight
    };
  };

  const text = textContent.items
    .filter(item => {
      if ('str' in item) {
        // Get the text item's bounding box in PDF coordinates
        const x = item.transform[4];
        const y = item.transform[5];
        const width = item.width || 0;
        const height = item.height || 0;

        if (height === 0) {
          return false;
        }

        // Convert to pixel coordinates for debugging
        const pixelRect = pdfRectToPixelRect({ height, width, x, y });
        // Check if the text item is within the target rectangle
        return rectIntersects(pixelRect, rect);
      }
      return false;
    })
    .map(item => ('str' in item ? item.str : ''))
    .join(' ');

  return text;
};

const rectIntersects = (rect1: Rect, rect2: Rect) =>
  rect1.x < rect2.x + rect2.width &&
  rect1.x + rect1.width > rect2.x &&
  rect1.y < rect2.y + rect2.height &&
  rect1.y + rect1.height > rect2.y;
