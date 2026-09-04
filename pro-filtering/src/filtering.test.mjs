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

  assert.equal((columns.match(/columnTemplate: columnTypeRenderer/g) ?? []).length, 17);
  assert.match(columns, /name: 'Order date',[\s\S]*?size: 180/);
  assert.match(config, /case 'high-value-europe'/);
  assert.match(config, /case 'recent-expedited'/);
  assert.match(config, /case 'review-queue'/);
  assert.match(config, /cascadeOptions:\s*{\s*enabled: true,\s*showDependencyNumbers: true/);
  assert.match(config, /groupedFilter:\s*{}/);
  assert.match(config, /ORDER_EXPLORER_QUICK_FILTER_EXAMPLE = 'Lisbon pending'/);
  assert.match(config, /quickFilter = \{/);
});

test('order explorer uses the requested column order and widths', async () => {
  const columnsSource = await readSource('filtering.columns.ts');
  const expectedColumns = [
    ['Order', 148],
    ['Customer', 175],
    ['SKU', 150],
    ['Total', 152],
    ['Status', 150],
    ['Priority', 140],
    ['Region', 170],
    ['City', 150],
    ['Category', 152],
    ['Expedited', 116],
    ['Order date', 180],
    ['Rating', 124],
    ['Margin change', 156],
    ['Renewal date', 180],
    ['Created at', 190],
    ['Activity time', 190],
    ['Tags', 220],
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

test('all framework examples bind filter badges declaratively', async () => {
  const files = [
    'filtering.ts',
    'filtering.react.tsx',
    'filtering.vue',
    'filtering.angular.ts',
  ];
  const sources = await Promise.all(files.map(readSource));

  for (const source of sources) {
    assert.match(source, /filterBadges|filter-badges/);
    assert.doesNotMatch(source, /mountAdvancedFilterBadges|AdvancedFilterBadgesController|badgesRef/);
  }

  const config = await readSource('filtering.config.ts');
  assert.match(config, /AdvancedFilterBadgesOptions/);
  assert.match(config, /orderExplorerFilterBadgeOptions/);

  const packageJson = JSON.parse(await readSource('../package.json'));
  assert.equal(
    packageJson.dependencies['@revolist/revogrid-pro'],
    'npm:@revolist/rv-pro-trial@2.7.15',
  );

  const styles = await readSource('filtering.scss');
  assert.match(styles, /\.order-explorer__filter-badge/);
  assert.match(styles, /\.order-explorer__active-filters[\s\S]*?padding-bottom:\s*8px/);
});

test('frameworks configure advanced filters without custom-element readiness workarounds', async () => {
  const [typescript, react, vue, angular] = await Promise.all([
    readSource('filtering.ts'),
    readSource('filtering.react.tsx'),
    readSource('filtering.vue'),
    readSource('filtering.angular.ts'),
  ]);

  for (const source of [typescript, react, vue, angular]) {
    assert.doesNotMatch(source, /customElements\.whenDefined|componentOnReady|requestAnimationFrame/);
  }
  assert.match(typescript, /grid\.filter = createOrderExplorerFilter\(createOrderExplorerInitialFilters\(\)\)/);
  assert.match(react, /useState<ColumnFilterConfig>\(\(\) =>[\s\S]*?createOrderExplorerInitialFilters/);
  assert.match(vue, /const filter = ref<ColumnFilterConfig>\([\s\S]*?createOrderExplorerInitialFilters/);
  assert.match(angular, /filter: ColumnFilterConfig = createOrderExplorerFilter\(createOrderExplorerInitialFilters\(\)\)/);
});

test('all frameworks configure the default preset with declarative badges', async () => {
  const [config, typescript, react, vue, angular] = await Promise.all([
    readSource('filtering.config.ts'),
    readSource('filtering.ts'),
    readSource('filtering.react.tsx'),
    readSource('filtering.vue'),
    readSource('filtering.angular.ts'),
  ]);

  assert.match(config, /createOrderExplorerInitialFilters[\s\S]*?createOrderExplorerPreset\('high-value-europe'\)/);
  assert.ok(typescript.indexOf('grid.filter = createOrderExplorerFilter') < typescript.indexOf('grid.filterBadges ='));
  for (const source of [typescript, react, vue, angular]) {
    const initialFilterIndex = source.indexOf('createOrderExplorerInitialFilters()');
    assert.notEqual(initialFilterIndex, -1, 'a default filter should be created');
    assert.doesNotMatch(source, /componentOnReady|getPlugins\(\).*AdvanceFilterPlugin/);
  }
});

test('Vite resolves the monorepo-local Pro distribution before trial aliases', async () => {
  const [config, angular, tsconfig] = await Promise.all([
    readSource('../vite.config.ts'),
    readSource('filtering.angular.ts'),
    readSource('../tsconfig.app.json'),
  ]);

  assert.match(config, /\.\.\/\.\.\/\.\.\/packages\/pro\/dist\/revogrid-pro\.js/);
  assert.match(config, /\.\.\/\.\.\/\.\.\/packages\/pro\/dist\/revogrid-pro\.css/);
  assert.match(config, /\.\.\/\.\.\/\.\.\/node_modules\/@revolist\/revogrid\/dist\/index\.js/);
  assert.match(config, /existsSync\(localProEntry\)/);
  assert.match(tsconfig, /\.\.\/\.\.\/\.\.\/packages\/pro\/dist\/index\.d\.ts/);
  assert.match(tsconfig, /\.\.\/\.\.\/\.\.\/node_modules\/@revolist\/revogrid\/dist\/types\/index\.d\.ts/);
  assert.match(angular, /type AfterViewInit/);
  assert.match(angular, /type OnDestroy/);
});

test('shared filtering modules stay small and focused', async () => {
  const sourceFiles = (await readdir(root))
    .filter(file => /\.(?:ts|tsx|vue|scss)$/.test(file));

  for (const file of sourceFiles) {
    const lineCount = (await readSource(file)).split('\n').length;
    assert.ok(lineCount <= 250, `${file} should stay at or below 250 lines; found ${lineCount}`);
  }

  const facade = await readSource('filtering.shared.ts');
  for (const module of ['columns', 'config', 'data', 'structured']) {
    assert.match(facade, new RegExp(`export \\* from './filtering\\.${module}'`));
  }
});

test('order explorer fixture keeps 10,000 rows with visible numeric and date gaps', async () => {
  const data = await readSource('filtering.data.ts');

  assert.match(data, /ORDER_EXPLORER_ROW_COUNT = 10_000/);
  assert.match(data, /count = ORDER_EXPLORER_ROW_COUNT/);
  assert.match(data, /const TOTAL_BANDS/);
  assert.match(data, /\[900, 2_495\],[\s\S]*?\[6_800, 11_400\]/);
  assert.match(data, /const DATE_WINDOWS/);
  assert.match(data, /\[38, 18\],[\s\S]*?\[105, 24\]/);
  assert.match(data, /const dateOffset = getDateOffset\(index\)/);
  assert.match(data, /Math\.floor\(index \/ TOTAL_BANDS\.length\)/);
});

test('order columns expose every structured filter through the shared config', async () => {
  const [columns, config, structured] = await Promise.all([
    readSource('filtering.columns.ts'),
    readSource('filtering.config.ts'),
    readSource('filtering.structured.ts'),
  ]);
  const filterIds = [
    'FILTER_TOKEN_LIST',
    'FILTER_FUZZY',
    'FILTER_REGEX',
    'FILTER_CHIP_BADGE_TOGGLES',
    'FILTER_HISTOGRAM_BRUSH',
    'FILTER_RATING_PROGRESS_THRESHOLD',
    'FILTER_STATISTICAL_PRESETS',
    'FILTER_CALENDAR_RANGE',
    'FILTER_RELATIVE_WINDOW',
    'FILTER_TIMELINE_BRUSH',
    'FILTER_TIME_MATRIX',
    'FILTER_TRI_STATE_BOOLEAN',
    'FILTER_ARRAY_TAGS',
  ];

  for (const id of filterIds) assert.match(columns, new RegExp(id));
  assert.match(columns, /Status[\s\S]*filter: \[FIlTER_SELECTION\]/);
  assert.match(config, /optionProgress:[\s\S]*status:/);
  assert.match(config, /valueProp: 'count'/);
  assert.match(config, /getMax: \(\{ values \}\)/);
  assert.match(config, /count: 200/);
  assert.match(config, /structuredFilterTypes: orderExplorerStructuredFilterTypes/);
  assert.match(structured, /BUILT_IN_STRUCTURED_FILTER_TYPES\.map/);
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
  assert.match(styles, /\.order-explorer__search-input[\s\S]*?height:\s*36px/);
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
  const toolbarBlock = styles.match(/\.order-explorer__toolbar\s*\{([^}]*)\}/)?.[1] ?? '';
  const gridBlock = styles.match(/\.order-explorer__grid\s*\{([^}]*)\}/)?.[1] ?? '';

  assert.match(toolbarBlock, /margin-inline:\s*10px/);
  assert.match(styles, /\.order-explorer__search-input\s*\{[^}]*background:\s*transparent/);
  assert.doesNotMatch(gridBlock, /(?:^|\s)border:/);
  assert.doesNotMatch(gridBlock, /border-radius:/);
  assert.doesNotMatch(styles, /background:\s*var\(--rv-ui-surface,\s*#fff\)/);
});
