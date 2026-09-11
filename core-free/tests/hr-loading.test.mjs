import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { transformWithEsbuild } from 'vite';

const source = await readFile(new URL('../src/hr-loading.ts', import.meta.url), 'utf8');
const { code } = await transformWithEsbuild(source, 'hr-loading.ts', {
  format: 'esm',
  loader: 'ts',
  target: 'esnext',
});
const { getHRLoadingOverlayHtml } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`,
);

test('loading overlay uses only the concise preparation message', () => {
  const overlay = getHRLoadingOverlayHtml();

  assert.match(overlay, />Preparing rows…</);
  assert.doesNotMatch(overlay, /percent|hr-loading-counter|%/);
});

test('all framework variants omit row-count and percentage loading feedback', () => {
  for (const variant of ['hr.ts', 'hr.react.tsx', 'hr.vue', 'hr.angular.ts']) {
    const variantSource = readFileSync(new URL(`../src/${variant}`, import.meta.url), 'utf8');

    assert.doesNotMatch(variantSource, /Preparing \$?\{.*rows/);
    assert.doesNotMatch(variantSource, /percent complete|hr-loading-counter/);
    assert.match(variantSource, /Preparing rows…/);
  }
});
