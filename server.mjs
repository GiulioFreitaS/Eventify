import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.EVENTIFY_PORT || 4173);
const contentTypes = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.ts': 'text/javascript; charset=utf-8', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.woff2': 'font/woff2',
};
const sourceCache = new Map();

const server = createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const asset = /^\/(assets\/[a-z0-9._-]+|src\/[a-z0-9_-]+\.ts|styles\.css)$/i.test(pathname);
    const page = !pathname.includes('.');
    if (!asset && !page) {
      response.writeHead(404).end();
      return;
    }
    const file = resolve(root, asset ? '.' + pathname : 'index.html');
    if (!file.startsWith(resolve(root) + sep)) {
      response.writeHead(404).end();
      return;
    }
    const extension = extname(file);
    let body = await readFile(file);
    if (extension === '.ts') {
      const source = body.toString('utf8');
      const cached = sourceCache.get(file);
      if (cached?.source === source) {
        body = cached.body;
      } else {
        body = Buffer.from(stripTypeScriptTypes(source, { mode: 'strip' }));
        sourceCache.set(file, { source, body });
      }
    }
    response.writeHead(200, {
      'Content-Type': contentTypes[extension] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    }).end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    const status = error.code === 'ENOENT' ? 404 : error instanceof URIError ? 400 : 500;
    if (status === 500) console.error(error);
    response.writeHead(status).end();
  }
});

server.on('error', error => {
  console.error(`Não foi possível iniciar a Eventify: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`Eventify disponível em http://127.0.0.1:${port}`));
