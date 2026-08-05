import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  createInfinityScrollDataLoader,
  createInfinityScrollRows,
} from './infinity-scroll.shared.ts';

const root = dirname(fileURLToPath(import.meta.url));
const readSource = file => readFile(join(root, file), 'utf8');

test('remote loader pages, sorts, filters, and reports pagination state', async () => {
  const rows = createInfinityScrollRows(120);
  const load = createInfinityScrollDataLoader({ rows, selectionFilterType: 'selection', delayMs: 0 });
  const result = await load(
    0,
    10,
    { name: 'desc' },
    { region: { type: 'eq', value: 'Europe' } },
  );

  assert.equal(result.data.length, 10);
  assert.equal(result.total, rows.filter(row => row.region === 'Europe').length);
  assert.equal(result.hasMore, true);
  assert.ok(result.data[0].name > result.data[1].name);
  assert.ok(result.data.every(row => row.region === 'Europe'));
});

test('all framework variants use the direct infinityScroll property', async () => {
  const files = [
    'infinity-scroll.ts',
    'infinity-scroll.react.tsx',
    'infinity-scroll.vue',
    'infinity-scroll.angular.ts',
  ];
  const sources = await Promise.all(files.map(readSource));

  for (const source of sources) {
    assert.match(source, /InfinityScrollPlugin/);
    assert.match(source, /pinnedTopSource/);
    assert.match(source, /pinnedBottomSource/);
    assert.match(source, /Export all to Excel/);
    assert.doesNotMatch(source, /additionalData/);
  }
});

test('framework variants follow demo lifecycle conventions', async () => {
  const [typescript, react, vue, angular] = await Promise.all([
    readSource('infinity-scroll.ts'),
    readSource('infinity-scroll.react.tsx'),
    readSource('infinity-scroll.vue'),
    readSource('infinity-scroll.angular.ts'),
  ]);

  assert.ok(typescript.indexOf('parent.appendChild(container)') < typescript.indexOf('grid.source = source'));
  assert.match(react, /const plugins = useMemo/);
  assert.match(react, /const infinityScroll = useMemo/);
  assert.match(vue, /const rows = ref/);
  assert.match(vue, /const infinityScroll = computed/);
  assert.match(vue, /const plugins = \[/);
  assert.match(angular, /standalone: true/);
  assert.match(angular, /encapsulation: ViewEncapsulation.None/);
});
