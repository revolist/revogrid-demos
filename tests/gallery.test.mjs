import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { featureSlugs, loadCatalog, root } from '../scripts/catalog.mjs';

const output = join(root, 'dist');
const featureLiveDemoUrls = {
  pivot: 'https://pivot.rv-grid.com/demo/',
  gantt: 'https://gantt.rv-grid.com/',
  kanban: 'https://kanban.rv-grid.com/demo/',
  scheduler: 'https://scheduler.rv-grid.com/demo/',
};

test('feature repositories track their public main branches', async () => {
  const modules = await readFile(join(root, '.gitmodules'), 'utf8');
  for (const slug of featureSlugs) {
    assert.match(modules, new RegExp(`path = pro-advanced-${slug}`));
    assert.match(modules, new RegExp(`url = https://github\\.com/revolist/${slug}\\.git`));
  }
  assert.equal((modules.match(/branch\s*=\s*main/g) ?? []).length, featureSlugs.length);
  assert.doesNotMatch(modules, /private\/tmp/);
});

test('child metadata is complete and remains the source for feature copy', async () => {
  const catalog = await loadCatalog();
  assert.equal(catalog.length, 22);
  for (const slug of featureSlugs) {
    const showcase = catalog.find((entry) => entry.slug === slug);
    assert.ok(showcase);
    assert.equal(showcase.liveDemoUrl, featureLiveDemoUrls[slug]);
    assert.deepEqual(showcase.frameworks, ['ts', 'react', 'vue', 'angular']);
    assert.ok(showcase.recipes.length >= 2);
  }
});

test('every catalog source has a build manifest and gallery media', async () => {
  for (const showcase of await loadCatalog()) {
    const source = join(root, showcase.sourceDir);
    await access(join(source, 'package.json'));
    await access(join(source, 'assets'));
  }
});

test('gallery publishes canonical demos and legacy redirects', async () => {
  const manifest = JSON.parse(await readFile(join(output, 'manifest.json'), 'utf8'));
  assert.equal(manifest.showcases.length, 22);
  for (const showcase of manifest.showcases) {
    const redirect = await readFile(join(output, showcase.slug, 'index.html'), 'utf8');
    assert.match(redirect, new RegExp(`url=/${showcase.slug}/demo/`));
    assert.equal(showcase.route, `/${showcase.slug}/demo/`);
    await access(join(output, showcase.slug, 'demo', 'index.html'));
  }
  assert.equal(await readFile(join(output, 'CNAME'), 'utf8'), 'example.rv-grid.com\n');
});

test('all generated internal links and media references resolve', async () => {
  const catalog = await loadCatalog();
  const htmlFiles = [join(output, 'index.html'), ...catalog.map((entry) => join(output, entry.slug, 'index.html'))];
  for (const htmlFile of htmlFiles) {
    const html = await readFile(htmlFile, 'utf8');
    for (const [, target] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^(?:https?:|#)/.test(target)) continue;
      const withoutFragment = target.split(/[?#]/)[0];
      const absolute = withoutFragment.startsWith('/')
        ? join(output, withoutFragment)
        : resolve(dirname(htmlFile), withoutFragment);
      const file = withoutFragment.endsWith('/') ? join(absolute, 'index.html') : absolute;
      await access(file);
    }
  }
});

test('home page renders a keyboard-reachable link for each showcase', async () => {
  const html = await readFile(join(output, 'index.html'), 'utf8');
  const catalog = await loadCatalog();
  assert.equal((html.match(/class="showcase-card"/g) ?? []).length, catalog.length - 1 + 12);
  for (const { slug } of catalog.filter(entry => entry.slug !== 'advanced-grids')) assert.ok(html.includes(`href="/${slug}/demo/"`), slug);
  assert.equal((html.match(/href="\/examples\//g) ?? []).length, 12);
});

test('standalone example pages load assets from the shared example build', async () => {
  const html = await readFile(join(output, 'index.html'), 'utf8');
  const routes = [...html.matchAll(/href="(\/examples\/[^"/]+\/)"/g)].map(([, route]) => route);
  assert.equal(new Set(routes).size, 12);
  for (const route of routes) {
    const example = await readFile(join(output, route, 'index.html'), 'utf8');
    const script = example.match(/src="(\/advanced-grids\/demo\/assets\/[^\"]+\.js)"/);
    assert.ok(script, route);
    await access(join(output, script[1]));
  }
});
