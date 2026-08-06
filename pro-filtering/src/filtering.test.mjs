import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const readSource = file => readFile(join(root, file), 'utf8');

test('advanced filtering showcase exposes every requested behavior', async () => {
  const [columns, config] = await Promise.all([
    readSource('filtering.columns.ts'),
    readSource('filtering.config.ts'),
  ]);

  assert.equal((columns.match(/columnTemplate: columnTypeRenderer/g) ?? []).length, 9);
  assert.match(columns, /name: 'Order date',[\s\S]*?size: 180/);
  assert.match(config, /case 'high-value-europe'/);
  assert.match(config, /case 'recent-expedited'/);
  assert.match(config, /case 'review-queue'/);
  assert.match(config, /cascadeOptions:\s*{\s*enabled: true,\s*showDependencyNumbers: true/);
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

test('showcase does not depend on unavailable advanced-filter badge exports', async () => {
  const files = [
    'filtering.shared.ts',
    'filtering.ts',
    'filtering.react.tsx',
    'filtering.vue',
    'filtering.angular.ts',
  ];
  const sources = await Promise.all(files.map(readSource));

  for (const source of sources) {
    assert.doesNotMatch(source, /mountAdvancedFilterBadges|AdvancedFilterBadges|mountOrderExplorerFilterBadges/);
    assert.doesNotMatch(source, /badgesRef|order-explorer__active-filters/);
  }
  await assert.rejects(readSource('filtering.badges.ts'), { code: 'ENOENT' });
});

test('frameworks wait for grid readiness before assigning advanced filter config', async () => {
  const [typescript, react, vue, angular] = await Promise.all([
    readSource('filtering.ts'),
    readSource('filtering.react.tsx'),
    readSource('filtering.vue'),
    readSource('filtering.angular.ts'),
  ]);

  assert.ok(typescript.indexOf('componentOnReady') < typescript.indexOf('grid.filter = initialFilter'));
  assert.match(react, /useState<ColumnFilterConfig \| undefined>\(undefined\)/);
  assert.match(react, /componentOnReady[\s\S]*?grid\.filter = initialFilter/);
  assert.match(vue, /const filter = ref<ColumnFilterConfig>[\s\S]*?componentOnReady[\s\S]*?grid\.filter = initialFilter/);
  assert.match(angular, /filter: ColumnFilterConfig \| undefined[\s\S]*?componentOnReady[\s\S]*?grid\.filter = initialFilter/);
});

test('shared filtering modules stay small and focused', async () => {
  const sourceFiles = (await readdir(root))
    .filter(file => /\.(?:ts|tsx|vue|scss)$/.test(file));

  for (const file of sourceFiles) {
    const lineCount = (await readSource(file)).split('\n').length;
    assert.ok(lineCount <= 250, `${file} should stay at or below 250 lines; found ${lineCount}`);
  }

  const facade = await readSource('filtering.shared.ts');
  for (const module of ['columns', 'config', 'data']) {
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

test('all framework variants reactively apply the native RevoGrid theme', async () => {
  const files = ['filtering.ts', 'filtering.react.tsx', 'filtering.vue', 'filtering.angular.ts'];
  const sources = await Promise.all(files.map(readSource));
  const styles = await readSource('filtering.scss');

  for (const source of sources) {
    assert.match(source, /currentTheme/);
    assert.match(source, /observeCurrentTheme/);
    assert.match(source, /darkMaterial/);
  }
  assert.doesNotMatch(styles, /@media \(prefers-color-scheme: dark\)/);
  assert.doesNotMatch(styles, /\.order-explorer\.is-dark/);
});

test('showcase UI uses medium font weight only', async () => {
  const styles = await readSource('filtering.scss');

  assert.match(styles, /font-weight:\s*500/);
  assert.match(styles, /--revo-grid-header-font-weight:\s*500/);
  assert.doesNotMatch(styles, /font-weight:\s*(?:bold|[6-9]00)/);
});

test('showcase controls keep the host background visible', async () => {
  const styles = await readSource('filtering.scss');

  assert.match(styles, /\.order-explorer__search-input\s*\{[^}]*background:\s*transparent/);
  assert.doesNotMatch(styles, /background:\s*var\(--rv-ui-surface,\s*#fff\)/);
});
