import path from 'node:path';

import { addIssue } from '../src/helpers/newsletter/add';
import { inspectArchive } from '../src/helpers/newsletter/archive';
import {
  generateDerivedAssets,
  type NewsletterDirectories
} from '../src/helpers/newsletter/generate';

const projectDirectory = path.resolve(import.meta.dirname, '..');
const directories: NewsletterDirectories = {
  archiveDirectory: path.join(projectDirectory, 'newsletter'),
  imageDirectory: path.join(
    projectDirectory,
    'public',
    'images',
    'newsletters'
  ),
  metadataDirectory: path.join(
    projectDirectory,
    'src',
    'content',
    'newsletters'
  ),
  pdfDirectory: path.join(projectDirectory, 'public', 'pdf')
};
const [command, ...arguments_] = process.argv.slice(2);

try {
  switch (command) {
    case 'add': {
      if (arguments_.length !== 1) {
        throw new Error('Usage: bun run newsletter:add -- <source.pdf>');
      }
      const issue = await addIssue({
        archiveDirectory: directories.archiveDirectory,
        sourcePath: arguments_[0]
      });
      console.info(
        `Added Village Voice ${issue.issueNumber} (${issue.publicationMonth})`
      );
      break;
    }
    case 'check': {
      if (arguments_.length !== 0) {
        throw new Error('Usage: bun run newsletter:check');
      }
      const archive = await inspectArchive(directories.archiveDirectory);
      console.info(`Validated ${archive.length} canonical Issue PDFs`);
      break;
    }
    case 'generate': {
      if (arguments_.length !== 0) {
        throw new Error('Usage: bun run newsletter:generate');
      }
      const issues = await generateDerivedAssets(directories);
      console.info(`Generated Derived Assets for ${issues.length} issues`);
      break;
    }
    default:
      throw new Error('Usage: bun scripts/newsletter.ts <add|check|generate>');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
