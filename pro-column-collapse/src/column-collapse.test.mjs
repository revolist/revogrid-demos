import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  createColumnCollapseColumns,
  createColumnCollapseRows,
} from './column-collapse.shared.ts';

const root = dirname(fileURLToPath(import.meta.url));
const readSource = file => readFile(join(root, file), 'utf8');

test('contact data and grouped column definitions are deterministic', () => {
  const rows = createColumnCollapseRows();
  const columns = createColumnCollapseColumns();

  assert.equal(rows.length, 12);
  assert.equal(columns.length, 3);
  assert.deepEqual(columns.map(group => group.name), ['Personal Information', 'Address', 'Contact']);
  assert.equal(columns.filter(group => group.collapsed).length, 2);
  assert.equal(columns.flatMap(group => group.children ?? []).filter(column => column.sealed).length, 3);
  assert.notStrictEqual(createColumnCollapseRows()[0], rows[0]);
});

test('all framework variants preserve the Column Collapse integrations', async () => {
  const files = [
    'column-collapse.ts',
    'column-collapse.react.tsx',
    'column-collapse.vue',
    'column-collapse.angular.ts',
  ];
  const sources = await Promise.all(files.map(readSource));

  for (const source of sources) {
    assert.match(source, /ColumnCollapsePlugin/);
    assert.match(source, /FilterHeaderPlugin/);
    assert.match(source, /RowSelectPlugin/);
    assert.match(source, /Contact workspace/);
  }
});

test('framework variants follow standalone demo lifecycle conventions', async () => {
  const [typescript, react, vue, angular] = await Promise.all([
    readSource('column-collapse.ts'),
    readSource('column-collapse.react.tsx'),
    readSource('column-collapse.vue'),
    readSource('column-collapse.angular.ts'),
  ]);

  assert.ok(typescript.indexOf('parent.appendChild(container)') < typescript.indexOf('grid.source ='));
  assert.match(typescript, /return \(\) =>/);
  assert.match(react, /const plugins = useMemo/);
  assert.match(react, /const columns = useMemo/);
  assert.match(vue, /const rows = ref/);
  assert.match(vue, /const plugins = \[/);
  assert.match(angular, /standalone: true/);
  assert.match(angular, /encapsulation: ViewEncapsulation.None/);
});
