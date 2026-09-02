import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const stylesheet = readFileSync(
  fileURLToPath(new URL('../src/spreadsheet.scss', import.meta.url)),
  'utf8',
);

test('themes the Advanced Filter selection list in the dark Excel workbench', () => {
  assert.match(
    stylesheet,
    /\.spreadsheet-workbench\.is-dark revogr-filter-panel/,
  );
  assert.match(
    stylesheet,
    /revogr-filter-panel[\s\S]*--revo-grid-background:\s*var\(--sheet-panel-strong\)/,
  );
  assert.match(
    stylesheet,
    /revogr-filter-panel[\s\S]*\.filter-list-grid[\s\S]*--revo-grid-text:\s*var\(--sheet-text\)/,
  );
  assert.match(
    stylesheet,
    /revogr-filter-panel[\s\S]*\.filter-list-grid[\s\S]*--revo-grid-cell-disabled-bg:\s*var\(--sheet-panel-strong\)/,
  );
  assert.match(
    stylesheet,
    /\.filter-list-grid revogr-data \.rgRow,[\s\S]*\.filter-list-grid revogr-data \.rgCell[\s\S]*color:\s*var\(--sheet-text\)/,
  );
});
