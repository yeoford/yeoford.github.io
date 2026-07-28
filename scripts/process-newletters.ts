import path from 'node:path';

import { createLog } from '@helpers/log';

import { processNewsletter } from '../src/helpers/pdf';

const log = createLog('process-newsletters');

const NEWSLETTERS_DIR = path.resolve(import.meta.dir, '..', 'newsletter');

const entries = await Bun.$`ls ${NEWSLETTERS_DIR}/*.pdf`.text();
const pdfFiles = entries.trim().split('\n');

const outputImageDir = path.resolve(
  import.meta.dir,
  '..',
  'public',
  'images',
  'newsletters'
);
const outputDataDir = path.resolve(
  import.meta.dir,
  '..',
  'src',
  'content',
  'newsletters'
);

const outputPdfDir = path.resolve(import.meta.dir, '..', 'public', 'pdf');

log.info('outputImageDir', outputImageDir);
log.info('outputDataDir', outputDataDir);

for await (const file of pdfFiles) {
  const result = await processNewsletter(file, {
    outputDataDir,
    outputImageDir,
    outputPdfDir,
    skipExistingOutputs: true
    // extractPagesToImage: [1, 3],
  });
  log.info('processed', result);
}
