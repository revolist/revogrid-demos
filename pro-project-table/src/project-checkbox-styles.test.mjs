import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const styles = readFileSync(
  new URL('./project-tracker-styles/_grid.scss', import.meta.url),
  'utf8',
);

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
