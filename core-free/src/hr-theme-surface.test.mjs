import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('./hr.css', import.meta.url), 'utf8');

test('the HR grid paints the selected theme surface', () => {
  assert.match(
    css,
    /\.hr-grid-wrapper\s*>\s*revo-grid\.hr-scale-grid\[theme\]\s*\{[\s\S]*?background-color:\s*var\(--rg-theme-background\);/,
  );
});
