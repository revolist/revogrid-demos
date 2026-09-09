import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { transformWithEsbuild } from 'vite';

async function loadShared() {
  const source = await readFile(new URL('../src/prompt-library.shared.ts', import.meta.url), 'utf8');
  const prompts = await readFile(new URL('../src/prompts.json', import.meta.url), 'utf8');
  const testableSource = source.replace(
    /import promptRows from ['"]\.\/prompts\.json['"];?/,
    `const promptRows = ${prompts};`,
  );
  const { code } = await transformWithEsbuild(testableSource, 'prompt-library.shared.ts', { loader: 'ts', format: 'esm' });
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

test('ships a useful local prompt catalog and filters it', async () => {
  const { PROMPTS, filterPrompts } = await loadShared();
  assert.equal(PROMPTS.length, 100);
  assert.equal(filterPrompts(PROMPTS, 'quickstart', 'All').length, 1);
  assert.equal(filterPrompts(PROMPTS, '', 'Extensions').length, 20);
  assert.equal(filterPrompts(PROMPTS, '  MINIMAL GRID STARTER  ', 'Setup').length, 1);
});

test('loads a large predefined prompt catalog from bundled JSON', async () => {
  const shared = await readFile(new URL('../src/prompt-library.shared.ts', import.meta.url), 'utf8');
  const prompts = JSON.parse(await readFile(new URL('../src/prompts.json', import.meta.url), 'utf8'));
  const ids = new Set(prompts.map(prompt => prompt.id));
  const categories = new Set(prompts.map(prompt => prompt.category));

  assert.match(shared, /from ['"]\.\/prompts\.json['"]/);
  assert.equal(prompts.length, 100);
  assert.equal(ids.size, prompts.length);
  assert.deepEqual(categories, new Set(['Setup', 'Data', 'Interaction', 'Performance', 'Extensions']));
  assert.ok(prompts.every(prompt => /RevoGrid/i.test(prompt.prompt)));
  for (const category of categories) {
    assert.equal(prompts.filter(prompt => prompt.category === category).length, 20);
  }
});

test('all four framework entry points are present', async () => {
  for (const file of ['prompt-library.vue', 'prompt-library.ts', 'prompt-library.react.tsx', 'prompt-library.angular.ts']) {
    assert.ok((await readFile(new URL(`../src/${file}`, import.meta.url), 'utf8')).includes('prompt-demo'));
  }
});

test('all framework shells bind the host dark-mode state', async () => {
  for (const file of ['prompt-library.vue', 'prompt-library.ts', 'prompt-library.react.tsx', 'prompt-library.angular.ts']) {
    assert.match(await readFile(new URL(`../src/${file}`, import.meta.url), 'utf8'), /is-dark/);
  }
  assert.match(await readFile(new URL('../src/prompt-library.css', import.meta.url), 'utf8'), /\.prompt-demo\.is-dark/);
});

test('the demo and grid can shrink inside the viewport workspace', async () => {
  const css = await readFile(new URL('../src/prompt-library.css', import.meta.url), 'utf8');
  assert.match(css, /\.prompt-demo\s*\{[^}]*min-height:\s*0/);
  assert.match(css, /\.prompt-grid\s*\{[^}]*min-height:\s*0/);
});

test('uses the same neutral workspace surfaces as Grid at Scale', async () => {
  const css = await readFile(new URL('../src/prompt-library.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /gradient\(/);
  assert.match(css, /\.prompt-demo\s*\{[^}]*background:\s*#fff/);
  assert.match(css, /\.prompt-demo\.is-dark\s*\{[^}]*background:\s*#1a1a20/);
});

test('keeps only the toolbar padded and makes the light grid edge-to-edge and white', async () => {
  const css = await readFile(new URL('../src/prompt-library.css', import.meta.url), 'utf8');
  assert.match(css, /\.prompt-demo\s*\{[^}]*padding:\s*0[^}]*background:\s*#fff/);
  assert.match(css, /\.prompt-toolbar\s*\{[^}]*padding:\s*[^;}]*22px/);
  assert.match(css, /\.prompt-grid\s*\{[^}]*--revo-grid-background:\s*#fff/);
  assert.match(css, /\.prompt-grid\s*\{[^}]*--revo-grid-header-bg:\s*#fff/);
  assert.match(css, /\.prompt-grid\s*\{[^}]*border-left:\s*0[^}]*border-right:\s*0/);
});
