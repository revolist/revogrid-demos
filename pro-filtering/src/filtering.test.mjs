import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const readSource = file => readFile(join(root, file), 'utf8');

test('advanced filtering showcase exposes every requested behavior', async () => {
  const [columns, config, badges] = await Promise.all([
    readSource('filtering.columns.ts'),
    readSource('filtering.config.ts'),
    readSource('filtering.badges.ts'),
  ]);

  assert.equal((columns.match(/columnTemplate: columnTypeRenderer/g) ?? []).length, 9);
  assert.match(columns, /name: 'Order date',[\s\S]*?size: 180/);
  assert.match(config, /case 'high-value-europe'/);
  assert.match(config, /case 'recent-expedited'/);
  assert.match(config, /case 'review-queue'/);
  assert.match(config, /cascadeOptions:\s*{\s*enabled: true,\s*showDependencyNumbers: true/);
  assert.match(badges, /mountAdvancedFilterBadges\(\{/);
  assert.match(config, /ORDER_EXPLORER_QUICK_FILTER_EXAMPLE = 'Lisbon pending'/);
  assert.match(config, /quickFilter = \{/);
});

test('order explorer uses the requested column order and widths', async () => {
  const columnsSource = await readSource('filtering.columns.ts');
  const expectedColumns = [
    ['Order', 148],
    ['Customer', 175],
    ['Total', 152],
    ['Status', 150],
    ['Region', 170],
    ['City', 150],
    ['Category', 152],
    ['Expedited', 116],
    ['Order date', 180],
  ];

  let previousIndex = -1;
  for (const [name, size] of expectedColumns) {
    const columnPattern = new RegExp(`name: '${name}',[\\s\\S]*?size: ${size},`);
    const match = columnPattern.exec(columnsSource);
    assert.ok(match, `${name} should use a ${size}px width`);
    assert.ok(match.index > previousIndex, `${name} should follow the previous column`);
    previousIndex = match.index;
  }
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
  const source = await readSource('filtering.badges.ts');

  assert.match(source, /mountAdvancedFilterBadges\(\{/);
  assert.match(source, /formatLabel: formatOrderExplorerFilterBadge/);
  assert.doesNotMatch(source, /filter-badges/);
});

test('shared filtering modules stay small and focused', async () => {
  const sourceFiles = (await readdir(root))
    .filter(file => /\.(?:ts|tsx|vue|scss)$/.test(file));

  for (const file of sourceFiles) {
    const lineCount = (await readSource(file)).split('\n').length;
    assert.ok(lineCount <= 250, `${file} should stay at or below 250 lines; found ${lineCount}`);
  }

  const facade = await readSource('filtering.shared.ts');
  for (const module of ['badges', 'columns', 'config', 'data']) {
    assert.match(facade, new RegExp(`export \\* from './filtering\\.${module}'`));
  }
});

test('showcase stays focused on local filtering', async () => {
  const [typescript, react, vue, angular, main, styles] = await Promise.all([
    readSource('filtering.ts'),
    readSource('filtering.react.tsx'),
    readSource('filtering.vue'),
    readSource('filtering.angular.ts'),
    readSource('main.ts'),
    readSource('filtering.scss'),
  ]);

  for (const source of [typescript, react, vue, angular, main, styles]) {
    assert.doesNotMatch(source, /remote/i);
  }
  assert.match(styles, /\.order-explorer__search-input[\s\S]*?height:\s*32px/);
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
