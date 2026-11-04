// Serves the built `dist/` for Playwright. `astro preview` intermittently
// never became reachable on CI, so the e2e suite uses this instead.
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../../dist');
const port = Number(process.env.PORT ?? 4321);

const CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.xml': 'application/xml'
};

const resolveFile = async (pathname: string) => {
  const target = path.join(root, decodeURIComponent(pathname));
  if (!target.startsWith(root)) {
    return null;
  }

  for (const candidate of [target, path.join(target, 'index.html')]) {
    const info = await stat(candidate).catch(() => null);
    if (info?.isFile()) {
      return candidate;
    }
  }

  return null;
};

createServer(async (request, response) => {
  const file = await resolveFile(
    new URL(request.url ?? '/', 'http://localhost').pathname
  );

  if (!file) {
    response.writeHead(404).end('Not found');
    return;
  }

  response.writeHead(200, {
    'Content-Type':
      CONTENT_TYPES[path.extname(file)] ?? 'application/octet-stream'
  });
  createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Serving ${root} at http://127.0.0.1:${port}`);
});
