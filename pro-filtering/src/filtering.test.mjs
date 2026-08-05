import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const readSource = file => readFile(join(root, file), 'utf8');

test('advanced filtering showcase exposes every requested behavior', async () => {
  const source = await readSource('filtering.shared.ts');

  assert.equal((source.match(/columnTemplate: columnTypeRenderer/g) ?? []).length, 9);
  assert.match(source, /name: 'Order date',[\s\S]*?size: 180/);
  assert.match(source, /case 'high-value-europe'/);
  assert.match(source, /case 'recent-expedited'/);
  assert.match(source, /case 'review-queue'/);
  assert.match(source, /cascadeOptions:\s*{\s*enabled: true,\s*showDependencyNumbers: true/);
  assert.match(source, /mountAdvancedFilterBadges\(\{/);
  assert.match(source, /ORDER_EXPLORER_QUICK_FILTER_EXAMPLE = 'Lisbon pending'/);
  assert.match(source, /quickFilter = \{/);
});

test('all framework examples use direct grid properties', async () => {
  const files = [
    'filtering.shared.ts',
    'filtering.ts',
    'filtering.react.tsx',
    'filtering.vue',
    'filtering.angular.ts',
  ];
  const sources = await Promise.all(files.map(readSource));

  for (const source of sources) assert.doesNotMatch(source, /additionalData/);
  for (const source of sources.slice(2)) {
    assert.match(source, /columns/);
    assert.match(source, /source/);
    assert.match(source, /plugins/);
    assert.match(source, /columnTypes/);
    assert.match(source, /filter/);
    assert.match(source, /QuickFilter|quickFilter/);
  }
});

test('showcase reuses the public customizable advanced-filter badge component', async () => {
  const source = await readSource('filtering.shared.ts');

  assert.match(source, /mountAdvancedFilterBadges\(\{/);
  assert.match(source, /formatLabel: formatOrderExplorerFilterBadge/);
  assert.doesNotMatch(source, /filter-badges/);
});

test('remote recipe documents and transports the complete callback payload', async () => {
  const [source, main] = await Promise.all([
    readSource('remote.shared.ts'),
    readSource('main.ts'),
  ]);

  assert.match(source, /Pagination\(skip, take, order, single, multi, quickFilter\)/);
  assert.match(source, /Infinity\(skip, limit, order, single, multi, quickFilter\)/);
  assert.match(source, /value instanceof Set/);
  assert.match(source, /value instanceof Date/);
  assert.match(source, /singleConditionFilters/);
  assert.match(source, /multiConditionFilters/);
  assert.match(source, /quickFilter/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.match(main, /recipe.*remote/);
});

test('framework examples follow their lifecycle conventions', async () => {
  const [typescript, react, vue, angular] = await Promise.all([
    readSource('filtering.ts'),
    readSource('filtering.react.tsx'),
    readSource('filtering.vue'),
    readSource('filtering.angular.ts'),
  ]);

  assert.ok(typescript.indexOf('parent.appendChild(container)') < typescript.indexOf('grid.source = source'));
  assert.match(react, /const plugins = useMemo/);
  assert.match(react, /const columnTypes = useMemo/);
  assert.match(vue, /const source = ref/);
  assert.match(vue, /const plugins = \[\.\.\.orderExplorerPlugins\]/);
  assert.match(vue, /const isDark = ref\(currentTheme\(\)\.isDark\(\)\)/);
  assert.match(vue, /disconnectTheme\?\.\(\)/);
  assert.match(angular, /standalone: true/);
  assert.match(angular, /encapsulation: ViewEncapsulation.None/);
});

test('showcase UI uses medium font weight only', async () => {
  const styles = await readSource('filtering.scss');

  assert.match(styles, /font-weight:\s*500/);
  assert.match(styles, /--revo-grid-header-font-weight:\s*500/);
  assert.doesNotMatch(styles, /font-weight:\s*(?:bold|[6-9]00)/);
});
