import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { root } from './catalog.mjs';

const host = '127.0.0.1';
const port = Number(process.env.PORT ?? 4173);
const publicRoot = join(root, 'dist');
const mime = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4', '.svg': 'image/svg+xml' };

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', `http://${host}:${port}`).pathname);
    let target = normalize(join(publicRoot, pathname));
    if (!target.startsWith(publicRoot)) return response.writeHead(403).end('Forbidden');
    try {
      if ((await stat(target)).isDirectory()) target = join(target, 'index.html');
    } catch {
      target = join(publicRoot, 'index.html');
    }
    response.writeHead(200, { 'Content-Type': mime[extname(target)] ?? 'application/octet-stream' });
    response.end(await readFile(target));
  } catch (error) {
    response.writeHead(500).end(String(error));
  }
});

server.listen(port, host, () => console.log(`RevoGrid gallery: http://${host}:${port}`));
