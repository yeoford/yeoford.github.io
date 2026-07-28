import { readdir } from 'node:fs/promises';
import path from 'node:path';

import { createLog } from '@helpers/log';

import { processNewsletter } from '../src/helpers/pdf';

const log = createLog('process-newsletters');

const PROJECT_DIR = path.resolve(import.meta.dirname, '..');
const NEWSLETTERS_DIR = path.resolve(PROJECT_DIR, 'newsletter');

const entries = await readdir(NEWSLETTERS_DIR);
const pdfFiles = entries
  .filter(entry => entry.endsWith('.pdf'))
  .map(entry => path.resolve(NEWSLETTERS_DIR, entry));

const outputImageDir = path.resolve(
  PROJECT_DIR,
  'public',
  'images',
  'newsletters'
);
const outputDataDir = path.resolve(
  PROJECT_DIR,
  'src',
  'content',
  'newsletters'
);

const outputPdfDir = path.resolve(PROJECT_DIR, 'public', 'pdf');

log.info('outputImageDir', outputImageDir);
log.info('outputDataDir', outputDataDir);

for (const file of pdfFiles) {
  const result = await processNewsletter(file, {
    outputDataDir,
    outputImageDir,
    outputPdfDir,
    skipExistingOutputs: true
    // extractPagesToImage: [1, 3],
  });
  log.info('processed', result);
}
