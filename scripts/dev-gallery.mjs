import { createServer } from 'node:http';
import { watch } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { featureDirectory, featureSlugs, loadCatalog, root } from './catalog.mjs';

const host = '127.0.0.1';
const port = Number(process.env.PORT ?? 4173);
const clients = new Set();
const mime = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
const reloadScript = `<script>new EventSource('/__gallery_events').addEventListener('reload', () => location.reload());</script>`;

let debounce;
let revision = 0;
function notifyClients() {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    revision += 1;
    for (const client of clients) client.write('event: reload\ndata: changed\n\n');
  }, 100);
}

watch(join(root, 'gallery'), { recursive: true }, notifyClients);
watch(join(root, 'scripts'), (event, name) => {
  if (name === 'build-gallery.mjs' || name === 'catalog.mjs') notifyClients();
});
for (const slug of featureSlugs) watch(join(root, featureDirectory(slug), 'feature.json'), notifyClients);

async function serveFile(response, base, relativePath) {
  const directory = resolve(base);
  let target = resolve(directory, relativePath);
  if (target !== directory && !target.startsWith(`${directory}${sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  if ((await stat(target)).isDirectory()) target = join(target, 'index.html');
  const content = await readFile(target);
  response.writeHead(200, { 'Content-Type': mime[extname(target)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  response.end(content);
}

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', `http://${host}:${port}`).pathname);
    if (pathname === '/__gallery_events') {
      response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      response.write(': connected\n\n');
      clients.add(response);
      request.on('close', () => clients.delete(response));
      return;
    }
    if (pathname.startsWith('/assets/')) return await serveFile(response, join(root, 'gallery'), pathname.slice('/assets/'.length));
    const [, slug, section, ...rest] = pathname.split('/');
    if (slug === 'examples' && section && (!rest.length || (rest.length === 1 && rest[0] === ''))) {
      const gallery = await import(`./build-gallery.mjs?dev=${revision}`);
      if (!gallery.scenarioShowcases.some(example => example.slug === `advanced:${section}`)) return response.writeHead(404).end('Not found');
      const html = await readFile(join(root, 'pro-advanced-grids', 'dist', 'index.html'), 'utf8');
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return response.end(gallery.standaloneExampleHtml(html));
    }
    if (!slug || (!section && slug)) {
      const gallery = await import(`./build-gallery.mjs?dev=${revision}`);
      const showcase = gallery.catalog.find(entry => entry.slug === slug);
      if (slug && !showcase) return response.writeHead(404).end('Not found');
      const html = slug ? gallery.detail(showcase) : gallery.home;
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return response.end(html.replace('</body>', `${reloadScript}</body>`));
    }
    const showcase = (await loadCatalog()).find(entry => entry.slug === slug);
    if (!showcase || !['demo', 'media'].includes(section)) return response.writeHead(404).end('Not found');
    const folder = section === 'demo' ? (showcase.demoOutput ?? 'dist') : 'assets';
    return await serveFile(response, join(root, showcase.sourceDir, folder), rest.join('/'));
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return response.writeHead(404).end('Not found');
    console.error(error);
    response.writeHead(500).end('Could not load gallery');
  }
}).listen(port, host, () => console.log(`RevoGrid gallery dev server: http://${host}:${port}`));
