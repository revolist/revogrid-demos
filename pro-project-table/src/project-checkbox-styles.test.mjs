import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const styles = readFileSync(
  new URL('./project-tracker-styles/_grid.scss', import.meta.url),
  'utf8',
);
const darkStyles = readFileSync(
  new URL('./project-tracker-styles/_dark.scss', import.meta.url),
  'utf8',
);
const headerFilterStyles = readFileSync(
  new URL('./project-tracker-styles/_header-filters.scss', import.meta.url),
  'utf8',
);

test('dark grouping rows use the same neutral surfaces as project rows', () => {
  assert.match(darkStyles, /--revo-grid-row-hover:\s*var\(--rv-ui-surface-hover,/);
  assert.match(
    darkStyles,
    /\.rgRow\.groupingRow,[\s\S]*?\.project-group-label\s*\{[\s\S]*?background:\s*transparent\s*!important;/,
  );
  assert.match(
    darkStyles,
    /\.rgRow\.groupingRow[^\{]*:hover[\s\S]*?\.project-group-label\s*\{[\s\S]*?background:\s*var\(--revo-grid-row-hover\)\s*!important;/,
  );
  assert.doesNotMatch(darkStyles, /background:\s*#111827\s*!important/);
  assert.doesNotMatch(darkStyles, /background:\s*#162235\s*!important/);
});

test('dark selection header filters stay unboxed while text filters keep their surface', () => {
  assert.match(
    headerFilterStyles,
    /\.filter-input\s*\{[\s\S]*?justify-content:\s*center\s*!important;/,
  );
  assert.match(
    darkStyles,
    /\.filter-input input\[type="text"\]\s*\{[\s\S]*?border-color:\s*token\(dark-border\)\s*!important;[\s\S]*?background:\s*token\(dark-elevated\)\s*!important;[\s\S]*?&:disabled\s*\{[\s\S]*?border-color:\s*token\(dark-border\)\s*!important;/,
  );
  assert.match(
    darkStyles,
    /\.filter-header-selection-trigger\.rv-filter\s*\{[\s\S]*?border-color:\s*transparent\s*!important;[\s\S]*?background:\s*transparent\s*!important;/,
  );
  assert.doesNotMatch(
    darkStyles,
    /\.filter-input input\[type="text"\],[\s\S]*?\.filter-header-selection-trigger\.rv-filter\s*\{/,
  );
});

test('row selection checkboxes use the shared Pro checkbox glyph', () => {
  assert.match(
    styles,
    /\.cell-checkbox[\s\S]*?input\[type="checkbox"\]:not\(\.rv-checkbox\)\s*\{\s*@include project-checkbox;/,
  );
  assert.match(
    styles,
    /\.cell-header-checkbox-container[\s\S]*?input\[type="checkbox"\]:not\(\.rv-checkbox\)\s*\{\s*@include project-checkbox;/,
  );
});

test('all framework variants synchronize the grid theme', () => {
  const variants = [
    'project-table.ts',
    'project-table.react.tsx',
    'project-table.vue',
    'project-table.angular.ts',
  ];

  for (const file of variants) {
    const source = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8');
    assert.match(source, /observeCurrentTheme/, file);
  }
});

test('all framework variants enable column dragging', () => {
  const variants = [
    ['project-table.ts', /grid\.canMoveColumns\s*=\s*true/],
    ['project-table.react.tsx', /canMoveColumns=\{true\}/],
    ['project-table.vue', /:can-move-columns="true"/],
    ['project-table.angular.ts', /\[canMoveColumns\]="true"/],
  ];

  for (const [file, pattern] of variants) {
    const source = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8');
    assert.match(source, pattern, file);
  }
});

test('semantic block columns fill the complete grid cell', () => {
  const renderers = readFileSync(
    new URL('./project-tracker/renderers.ts', import.meta.url),
    'utf8',
  );
  const tokens = readFileSync(
    new URL('./project-tracker-styles/_tokens.scss', import.meta.url),
    'utf8',
  );

  assert.match(renderers, /cellProperties:\s*\(\)\s*=>\s*\(\{[\s\S]*?class:\s*'project-block-cell'/);
  assert.match(
    styles,
    /\.rgCell\.project-block-cell[\s\S]*?padding:\s*0\s*!important/,
  );
  assert.match(
    tokens,
    /@mixin full-cell-block\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?inset:\s*0;/,
  );
});

test('project tags and synced owner options keep one aligned visual surface', () => {
  const columns = readFileSync(
    new URL('./project-tracker/columns.ts', import.meta.url),
    'utf8',
  );
  const dropdownStyles = readFileSync(
    new URL('./project-tracker-styles/_dropdowns.scss', import.meta.url),
    'utf8',
  );

  assert.match(styles, /\.selected-values\s*\{[\s\S]*?justify-content:\s*flex-start/);
  assert.match(
    dropdownStyles,
    /\.selected-tag:has\(\.project-skill--#\{[\s\S]*?background:\s*list\.nth\(\$pair,\s*1\)/,
  );
  assert.match(columns, /project-owner-select\$\{isOptionTemplate\s*\?\s*' project-owner-filter-option'/);
  assert.match(
    dropdownStyles,
    /\.project-owner-filter-option\s*\{[\s\S]*?justify-content:\s*flex-start;[\s\S]*?gap:\s*space\(3\)/,
  );
});

test('dark project skill tags retain the shared dark label foreground', () => {
  assert.match(darkStyles, /@use\s+"sass:list"/);
  assert.match(
    darkStyles,
    /@each\s+\$name,\s*\$pair\s+in\s+\$label-colors[\s\S]*?\.project-skill--#\{"" \+ \$name\}[\s\S]*?background:\s*list\.nth\(\$pair,\s*1\)[\s\S]*?color:\s*list\.nth\(\$pair,\s*2\)/,
  );
  assert.match(
    darkStyles,
    /\.selected-tag:has\(\.project-skill--#\{"" \+ \$name\}\)[\s\S]*?button\s*\{[\s\S]*?color:\s*list\.nth\(\$pair,\s*2\)/,
  );
});

test('project rows expose the shared Pro row-order configuration', () => {
  const columns = readFileSync(
    new URL('./project-tracker/columns.ts', import.meta.url),
    'utf8',
  );
  const plugins = readFileSync(
    new URL('./project-tracker/plugins.ts', import.meta.url),
    'utf8',
  );

  assert.match(columns, /prop:\s*'task',[\s\S]*?rowDrag:\s*true/);
  assert.match(
    plugins,
    /projectRowOrder[\s\S]*?prop:\s*'task'[\s\S]*?preview:\s*'compact'/,
  );
  assert.match(
    plugins,
    /projectRowSelect[\s\S]*?rowOrder:\s*true/,
  );
});

test('all framework variants bind row ordering and selected-row dragging', () => {
  const variants = [
    ['project-table.ts', /grid\.rowOrder\s*=\s*projectRowOrder[\s\S]*?grid\.rowSelect\s*=\s*projectRowSelect/],
    ['project-table.react.tsx', /rowOrder=\{projectRowOrder\}[\s\S]*?rowSelect=\{projectRowSelect\}/],
    ['project-table.vue', /:row-order\.prop="projectRowOrder"[\s\S]*?:row-select\.prop="projectRowSelect"/],
    ['project-table.angular.ts', /\[rowOrder\]="projectRowOrder"[\s\S]*?\[rowSelect\]="projectRowSelect"/],
  ];

  for (const [file, pattern] of variants) {
    const source = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8');
    assert.match(source, pattern, file);
  }
});

test('the project Sort menu exposes additive multi-column sorting', () => {
  const actions = readFileSync(
    new URL('./project-tracker/actions.ts', import.meta.url),
    'utf8',
  );
  const toolbar = readFileSync(
    new URL('./project-tracker/toolbar.ts', import.meta.url),
    'utf8',
  );

  assert.match(actions, /applyProjectSort\([\s\S]*?additive\s*=\s*false/);
  assert.match(actions, /updateColumnSorting\(column,\s*sort\.order,\s*additive\)/);
  assert.match(toolbar, /action:\s*'sort';\s*value:\s*ProjectSortValue;\s*additive:\s*boolean/);
  assert.match(toolbar, /Shift-click to add another sort/);
  assert.match(toolbar, /additive:\s*event\.shiftKey/);
});

test('all framework variants forward additive toolbar sorting', () => {
  const variants = [
    ['project-table.ts', /applyProjectSort\([^;]*detail\.additive\)/],
    ['project-table.react.tsx', /changeSort\(detail\.value,\s*detail\.additive\)/],
    ['project-table.vue', /changeSort\(detail\.value,\s*detail\.additive\)/],
    ['project-table.angular.ts', /changeSort\(detail\.value,\s*detail\.additive\)/],
  ];

  for (const [file, pattern] of variants) {
    const source = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8');
    assert.match(source, pattern, file);
  }
});
