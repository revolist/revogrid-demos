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

test('toolbar buttons and selects share the compact control height', () => {
  for (const selector of ['hr-button', 'hr-select']) {
    assert.match(
      css,
      new RegExp(`\\.${selector}\\s*\\{[\\s\\S]*?height:\\s*28px;[\\s\\S]*?line-height:\\s*20px;`),
    );
  }
  assert.match(css, /\.hr-button\s*\{[\s\S]*?text-align:\s*center;/);
});

test('toolbar selects use a left-aligned value and a shared down-chevron', () => {
  assert.match(css, /\.hr-select\s*\{[\s\S]*?appearance:\s*none;/);
  assert.match(css, /\.hr-select\s*\{[\s\S]*?padding:\s*3px 30px 3px 12px;/);
  assert.match(css, /\.hr-select\s*\{[\s\S]*?background-image:\s*url\("data:image\/svg\+xml,[\s\S]*?m1 1 5 5 5-5/);
  assert.match(css, /\.hr-select\s*\{[\s\S]*?text-align:\s*left;/);
  assert.match(css, /\.hr-select\s*\{[\s\S]*?text-align-last:\s*left;/);
  assert.match(css, /\[data-theme='dark'\]\s+\.hr-select\s*\{[\s\S]*?background-color:/);
});
