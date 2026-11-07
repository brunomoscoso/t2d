import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, sep, extname } from 'node:path';

const root = fileURLToPath(new URL('../web/', import.meta.url));
const mime = { '.html': 'text/html', '.css': 'text/css', '.mjs': 'text/javascript' };
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) throw new Error('path');
    const content = await readFile(file);
    response.writeHead(200, {
      'Content-Type': `${mime[extname(file)] || 'application/octet-stream'}; charset=utf-8`,
    });
    response.end(content);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(4173, '127.0.0.1', () => console.log('T2D: http://127.0.0.1:4173'));
