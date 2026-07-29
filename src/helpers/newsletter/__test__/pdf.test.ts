import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { extractVillageVoiceIssue } from '../pdf';

const temporaryDirectories: string[] = [];

const temporaryDirectory = async () => {
  const directory = await mkdtemp(join(tmpdir(), 'yeoford-pdf-test-'));
  temporaryDirectories.push(directory);
  return directory;
};

/**
 * A structurally valid single-page PDF carrying no text, so extraction fails on
 * the page geometry or the missing metadata rather than on a parse error.
 */
const blankPdf = (width: number, height: number) => {
  const objects = [
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Kids[3 0 R]/Count 1>>',
    `<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${width} ${height}]/Resources<<>>>>`
  ];
  const offsets: number[] = [];
  let body = '%PDF-1.7\n';

  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const startxref = body.length;
  const entries = offsets
    .map(offset => `${offset.toString().padStart(10, '0')} 00000 n \n`)
    .join('');

  return Buffer.from(
    `${body}xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${entries}` +
      `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\n` +
      `startxref\n${startxref}\n%%EOF\n`,
    'latin1'
  );
};

const writePdf = async (name: string, bytes: Buffer) => {
  const directory = await temporaryDirectory();
  const filePath = join(directory, name);
  await writeFile(filePath, bytes);
  return filePath;
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map(directory => rm(directory, { force: true, recursive: true }))
  );
});

describe('extractVillageVoiceIssue', () => {
  it('rejects a first page too small to hold the metadata regions', async () => {
    const filePath = await writePdf('tiny.pdf', blankPdf(200, 200));

    await expect(extractVillageVoiceIssue(filePath)).rejects.toThrow(
      /cannot contain the metadata regions/u
    );
  });

  it('names the file when the first page carries no metadata', async () => {
    const filePath = await writePdf('blank.pdf', blankPdf(595, 842));

    await expect(extractVillageVoiceIssue(filePath)).rejects.toThrow(
      /^blank\.pdf: Invalid description/u
    );
  });
});
