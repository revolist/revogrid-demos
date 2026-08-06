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

test('all framework variants reactively apply the native RevoGrid theme', async () => {
  const files = [
    'infinity-scroll.ts',
    'infinity-scroll.react.tsx',
    'infinity-scroll.vue',
    'infinity-scroll.angular.ts',
  ];
  const sources = await Promise.all(files.map(readSource));
  const styles = await readSource('infinity-scroll.scss');

  for (const source of sources) {
    assert.match(source, /currentTheme/);
    assert.match(source, /observeCurrentTheme/);
    assert.match(source, /darkMaterial/);
  }
  assert.doesNotMatch(styles, /@media \(prefers-color-scheme: dark\)/);
});

test('showcase chrome stays transparent and inherits the host theme', async () => {
  const styles = await readSource('infinity-scroll.scss');

  assert.match(styles, /\.infinity-showcase\s*\{[^}]*background:\s*transparent/);
  assert.match(styles, /\.infinity-showcase\s*\{[^}]*border:\s*0/);
  assert.match(styles, /\.infinity-showcase\s*\{[^}]*border-radius:\s*0/);
  assert.match(styles, /\.infinity-toolbar\s*\{[^}]*background:\s*transparent/);
});

test('toolbar buttons share the Scheduler control treatment', async () => {
  const [shared, infinity, filtering, tree, scheduler, pivot, pivotHeader] = await Promise.all([
    readSource('../../styles/_scheduler-button.scss'),
    readSource('infinity-scroll.scss'),
    readSource('../../pro-filtering/src/filtering.scss'),
    readSource('../../pro-tree-data/src/tree.scss'),
    readSource('../../pro-advanced-scheduler/src/styles.scss'),
    readSource('../../pro-advanced-pivot/src/financial-pivot-header/financial-pivot-header.scss'),
    readSource('../../pro-advanced-pivot/src/financial-pivot-header/financial-pivot-header.ts'),
  ]);

  assert.match(shared, /@mixin scheduler-button/);
  assert.match(shared, /height:\s*36px/);
  assert.match(shared, /border-radius:\s*8px/);
  assert.match(shared, /box-shadow:\s*0 1px 2px/);
  assert.match(shared, /&:focus-visible/);
  assert.match(shared, /--demo-toolbar-control-bg,\s*transparent/);
  assert.match(shared, /color-mix\(in srgb, currentColor/);
  assert.doesNotMatch(shared, /background:\s*(?:#fff(?:fff)?|white)\b/i);
  for (const styles of [infinity, filtering, tree, scheduler]) {
    assert.match(styles, /@use '\.\.\/\.\.\/styles\/scheduler-button' as demo-controls/);
    assert.match(styles, /@include demo-controls\.scheduler-button/);
  }
  assert.match(pivot, /@use '\.\.\/\.\.\/\.\.\/styles\/scheduler-button' as demo-controls/);
  assert.match(pivot, /@include demo-controls\.scheduler-button/);
  assert.doesNotMatch(pivot, /--financial-header-button-(?:border|hover)/);
  assert.match(pivot, /:where\(\.dark, \[data-theme\^='dark'\]\) \.financial-pivot-showcase/);
  assert.match(pivot, /:where\(\.dark, \[data-theme\^='dark'\]\) financial-pivot-header/);
  assert.match(scheduler, /:root\[data-theme='dark'\] \.event-scheduler-shift-week-demo/);
  assert.match(scheduler, /:has\(\.event-scheduler-shift-week-grid\[theme\^='dark'\]\)/);
  assert.match(pivotHeader, /rv-segmented-switch financial-pivot-header__preset-switch/);
  assert.match(pivotHeader, /rv-segmented-switch-item/);
});
