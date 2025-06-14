import { createLog } from '@helpers/log';
import path from 'node:path';
import type {
  PDFPageProxy,
  TextItem,
  TextMarkedContent,
} from 'pdfjs-dist/types/src/display/api';
import { Canvas, createCanvas } from '@napi-rs/canvas';
import { parseMonthYear } from '../date';
import { safeParseInt } from '../number';
import { slugify } from '../string';

// Set up Node.js environment for PDF.js
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

const log = createLog('pdf');

const NEWSLETTERS_DIR = path.resolve(import.meta.dir, '../../../newsletter');

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
  y: 333,
};

const EDITORIAL_RECT: Rect = {
  height: 800,
  width: 1064,
  x: 80,
  y: 200,
};

export const scanNewsletters = async () => {
  log.debug('newsletters path is ', NEWSLETTERS_DIR);

  const entries = await Bun.$`ls ${NEWSLETTERS_DIR}/*.pdf`.text();
  const pdfFiles = entries.trim().split('\n');

  for await (const file of pdfFiles) {
    const result = await processNewsletter(file);
    log.debug('result', result);
  }

  // const newsletters = await Promise.all(files.map(async (file) => {
  //   const pdf = await PDFDocument.load(file);
  //   return pdf;
  // }));
};

export const extractPageToImage = async (
  filePath: string,
  pageNumber: number,
  { outputImageDir }: ProcessNewsletterOptions = {}
) => {
  const pdfBytes = await Bun.file(filePath).arrayBuffer();
  const pdfDoc = await pdfjs.getDocument({ data: pdfBytes }).promise;
  const page = await pdfDoc.getPage(pageNumber);
  const imageBuffer = await renderPageToImage(page);

  if (outputImageDir) {
    const imageFileName = `page-${pageNumber}.jpg`;
    await Bun.write(path.resolve(outputImageDir, imageFileName), imageBuffer);
  }

  return imageBuffer;
};

interface ProcessNewsletterOptions {
  extractPagesToImage?: number[];
  outputDataDir?: string;
  outputImageDir?: string;
  outputPdfDir?: string;
  removeAfterProcessing?: boolean;
}

export const processNewsletter = async (
  filePath: string,
  {
    extractPagesToImage,
    outputDataDir,
    outputImageDir,
    outputPdfDir,
    removeAfterProcessing,
  }: ProcessNewsletterOptions = {}
) => {
  const pdfBytes = await Bun.file(filePath).arrayBuffer();

  const pdfDoc = await pdfjs.getDocument({ data: pdfBytes }).promise;
  const firstPage = await pdfDoc.getPage(1);
  const editorialPage = await pdfDoc.getPage(3);

  const dateRect = {
    height: 120,
    width: 373,
    x: 785,
    y: 97,
  };

  const descriptionRect = {
    height: 100,
    width: 1093,
    x: 49,
    y: 1540,
  };

  const issueRect = {
    height: 73,
    width: 193,
    x: 936,
    y: 244,
  };

  const dateText = await getTextInRect(firstPage, dateRect);
  const description = await getTextInRect(firstPage, descriptionRect);
  const issueText = await getTextInRect(firstPage, issueRect);
  const editorialText = await getTextInRect(editorialPage, EDITORIAL_RECT);

  const date = parseMonthYear(dateText);
  const issueNumber = issueTextToIssueNumber(issueText);

  const slug = slugify(
    `newsletter-${date?.getFullYear()}-${date?.getMonth()}-${issueNumber}`
  );

  if (outputImageDir) {
    const coverImageFileName = `${slug}-cover.jpg`;

    const imageBuffer = await renderPageToImage(firstPage, COVER_IMAGE_RECT);

    // save the image buffer to a file
    await Bun.write(
      path.resolve(outputImageDir, coverImageFileName),
      imageBuffer
    );

    if (extractPagesToImage) {
      for (const pageNumber of extractPagesToImage) {
        const page = await pdfDoc.getPage(pageNumber);
        const imageBuffer = await renderPageToImage(page);
        const imageFileName = `${slug}-page-${pageNumber}.jpg`;
        await Bun.write(
          path.resolve(outputImageDir, imageFileName),
          imageBuffer
        );
      }
    }
  }

  if (outputDataDir) {
    const dataFileName = `${slug}.json`;
    await Bun.write(
      path.resolve(outputDataDir, dataFileName),
      JSON.stringify(
        {
          date,
          description,
          editorial: editorialText,
          issueNumber,
          path: `/pdf/${slug}.pdf`,
          slug,
        },
        null,
        2
      )
    );
  }

  if (outputPdfDir) {
    const pdfFileName = `${slug}.pdf`;
    await Bun.write(
      path.resolve(outputPdfDir, pdfFileName),
      Bun.file(filePath)
    );
  }

  if (removeAfterProcessing) {
    await Bun.$`rm ${filePath}`.text();
  }

  await pdfDoc.cleanup();
  // log.debug('pdf', { title, author, subject, keywords });

  return {
    metadata: {
      issueDate: date,
      issueNumber,
    },
    path: filePath,
    slug,
    text: {
      date: dateText,
      description,
      editorial: editorialText,
      issue: issueText,
    },
  };
};

const issueTextToIssueNumber = (issueText: string) => {
  const issueNumber = issueText.split(' ')[1];
  return safeParseInt(issueNumber);
};

/**
 * Crops a canvas by a specified rectangle.
 *
 * @param {Canvas} sourceCanvas - The source canvas to crop from
 * @param {Rect} cropRect - The rectangle defining the crop area
 * @returns {Canvas} A new canvas containing the cropped area
 */
const cropCanvas = (sourceCanvas: Canvas, cropRect: Rect): Canvas => {
  // Create a new canvas with the dimensions of the crop rectangle
  const croppedCanvas = createCanvas(cropRect.width, cropRect.height);
  const ctx = croppedCanvas.getContext('2d');

  // Draw the cropped portion from the source canvas to the new canvas
  ctx.drawImage(
    sourceCanvas,
    cropRect.x,
    cropRect.y,
    cropRect.width,
    cropRect.height,
    0,
    0,
    cropRect.width,
    cropRect.height
  );

  return croppedCanvas;
};

/**
 * Renders a single PDF page to an image buffer.
 *
 * @param {PDFPageProxy} page - The PDF.js page object.
 * @returns {Promise<Buffer>} The image as a buffer (JPEG format).
 */
const renderPageToImage = async (page: PDFPageProxy, cropRect?: Rect) => {
  // Scale the page to 2x for a higher quality image output
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d');

  // Create a compatible render context
  const renderContext = {
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport,
  };

  try {
    // Render the PDF page to the canvas
    await page.render(renderContext).promise;

    if (cropRect) {
      const cropped = cropCanvas(canvas, COVER_IMAGE_RECT);
      return cropped.toBuffer('image/jpeg', 60);
    }

    return canvas.toBuffer('image/jpeg', 60);
  } catch (error) {
    log.error('Error rendering PDF page:', error);
    throw error;
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
      y: pixelY - pixelHeight,
    };
  };

  const text = textContent.items
    .filter((item: TextItem | TextMarkedContent) => {
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
    .map((item: TextItem | TextMarkedContent) =>
      'str' in item ? item.str : ''
    )
    .join(' ');

  return text;
};

const rectIntersects = (rect1: Rect, rect2: Rect) =>
  rect1.x < rect2.x + rect2.width &&
  rect1.x + rect1.width > rect2.x &&
  rect1.y < rect2.y + rect2.height &&
  rect1.y + rect1.height > rect2.y;
