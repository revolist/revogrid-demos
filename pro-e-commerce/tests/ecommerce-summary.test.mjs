import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  AdvanceFilterPlugin,
  ExportExcelPlugin,
  FilterHeaderPlugin,
  SummaryChartHeaderPlugin,
} from '@revolist/revogrid-pro';
import { validateFilterAst } from '../../../../packages/pro/plugins/filter/ast/validation.ts';

import {
  ECOMMERCE_COLUMNS,
  ECOMMERCE_FILTER_BY_PROP,
  ECOMMERCE_PLUGINS,
  renderEcommerceNumericAggregate,
} from './sys-data/ecommerce.columns.ts';
import {
  ECOMMERCE_FILTER_PRESETS,
  ECOMMERCE_QUICK_FILTER_COLUMNS,
  createEcommerceDerivedState,
  createEcommerceVisibleSourceSync,
} from './ecommerce.filtering.ts';
import { ECOMMERCE_DATA } from './sys-data/ecommerce.data.ts';

test('every e-commerce field declares its type-correct contextual filter', () => {
  const expected = new Map([
    ['Customer ID', 'string'],
    ['Customer', 'fuzzy'],
    ['Gender', 'selection'],
    ['City', 'facetedList'],
    ['Membership Type', 'chipBadgeToggles'],
    ['Age', 'slider'],
    ['Lifetime Value', 'histogramBrush'],
    ['Average Rating', 'ratingProgressThreshold'],
    ['Discount Applied', 'triStateBoolean'],
    ['Spend Change (%)', 'statisticalPresets'],
    ['Total Spend', 'histogramBrush'],
    ['Order Date', 'calendarRange'],
    ['Created At', 'timelineBrush'],
    ['Order Status', 'facetedList'],
    ['Product Category', 'selection'],
    ['SKU', 'tokenList'],
    ['Tags', 'arrayTags'],
    ['Country', 'selection'],
    ['Currency', 'selection'],
  ]);

  for (const [prop, filter] of expected) {
    assert.deepEqual(ECOMMERCE_FILTER_BY_PROP[prop], [filter], prop);
  }
  assert.deepEqual(Object.keys(ECOMMERCE_FILTER_BY_PROP).sort(), [...expected.keys()].sort());
  assert.notDeepEqual(ECOMMERCE_FILTER_BY_PROP['Customer ID'], ['slider']);
});

test('toolbar search uses an explicit customer-facing quick-filter projection', () => {
  assert.deepEqual(ECOMMERCE_QUICK_FILTER_COLUMNS.slice(0, 4), [
    'Customer ID',
    'Customer',
    'City',
    'Membership Type',
  ]);
  assert.ok(ECOMMERCE_QUICK_FILTER_COLUMNS.includes('SKU'));
  assert.ok(ECOMMERCE_QUICK_FILTER_COLUMNS.includes('Product'));
});

test('predefined advanced examples are canonical AST trees', () => {
  assert.deepEqual(ECOMMERCE_FILTER_PRESETS.highValueGold.ast, {
    type: 'group',
    operator: 'and',
    children: [
      { type: 'condition', field: 'Membership Type', operator: 'equal', valueType: 'string', value: 'Gold' },
      { type: 'condition', field: 'Lifetime Value', operator: 'greaterThanOrEqual', valueType: 'number', value: 10000 },
    ],
  });
  assert.equal(ECOMMERCE_FILTER_PRESETS.discountedChicago.ast.children[0].operator, 'isTrue');
  assert.equal(ECOMMERCE_FILTER_PRESETS.ratingAndGrowth.ast.children[1].value, 0);
  for (const preset of Object.values(ECOMMERCE_FILTER_PRESETS)) {
    assert.equal(validateFilterAst(preset.ast).valid, true, preset.label);
  }
});

test('derived toolbar state uses one visible snapshot and preserves zero/false/null rows', () => {
  const visibleRows = [
    { 'Customer ID': 'CUS-0001', 'Total Spend': 0, 'Discount Applied': false },
    { 'Customer ID': 'CUS-0002', 'Total Spend': 125.5, 'Discount Applied': null },
  ];
  const state = createEcommerceDerivedState(visibleRows, new Set(['CUS-0001', 'CUS-hidden']));

  assert.equal(state.visibleCount, 2);
  assert.equal(state.totalSpend, 125.5);
  assert.deepEqual([...state.selectedIds], ['CUS-0001', 'CUS-hidden']);
  assert.deepEqual([...state.visibleSelectedIds], ['CUS-0001']);
  assert.equal(state.empty, false);
});

test('the deterministic fixture covers a representative 1,000-row commerce domain', () => {
  assert.equal(ECOMMERCE_DATA.length, 1000);
  const requiredFields = [
    'Order Date', 'Created At', 'Order Status', 'Product Category', 'SKU',
    'Product', 'Tags', 'Country', 'Currency', 'Discount Applied',
    'Average Rating', 'City',
  ];
  for (const field of requiredFields) {
    assert.ok(ECOMMERCE_DATA.every(row => Object.hasOwn(row, field)), field);
  }

  assert.ok(ECOMMERCE_DATA.some(row => row['Discount Applied'] === null));
  assert.ok(ECOMMERCE_DATA.some(row => row['Average Rating'] === null));
  assert.ok(ECOMMERCE_DATA.some(row => row.City === null));
  assert.ok(ECOMMERCE_DATA.some(row => row.SKU === ''));
  assert.ok(ECOMMERCE_DATA.some(row => row.Tags.length === 0));
  assert.ok(ECOMMERCE_DATA.some(row => row['Total Spend'] === 0));
  assert.ok(ECOMMERCE_DATA.some(row => row['Spend Change (%)'] < 0));
  assert.ok(ECOMMERCE_DATA.some(row => /[^\x00-\x7F]/.test(row.Customer)));

  const labels = new Map();
  for (const row of ECOMMERCE_DATA) {
    const ids = labels.get(row.Customer) ?? new Set();
    ids.add(row['Customer ID']);
    labels.set(row.Customer, ids);
  }
  assert.ok([...labels.values()].some(ids => ids.size > 1));
  assert.ok(ECOMMERCE_DATA.some(row => row.Customer === 'Zoë Martín'));
  assert.ok(ECOMMERCE_DATA.some(row => row.Customer === '李明'));
});

test('derived toolbar state ignores synthetic grouping rows', () => {
  const state = createEcommerceDerivedState([
    { '__rg-name': 'Chicago', 'Total Spend': 999999 },
    { 'Customer ID': 'CUS-0042', 'Total Spend': 42 },
  ]);

  assert.equal(state.visibleCount, 1);
  assert.equal(state.totalSpend, 42);
});

test('visible-source synchronization does not update a disposed framework view', async () => {
  let resolveVisible;
  const visible = new Promise(resolve => {
    resolveVisible = resolve;
  });
  let applied = false;
  const sync = createEcommerceVisibleSourceSync(
    { getVisibleSource: () => visible },
    () => {
      applied = true;
    },
  );

  const pending = sync();
  sync.cancel();
  resolveVisible([{ 'Customer ID': 'CUS-0001' }]);
  await pending;

  assert.equal(applied, false);
});

test('catalog source files and live previews share the standalone implementation', () => {
  const catalog = readFileSync(
    new URL('../../../components/src/catalog/demo-catalog.ts', import.meta.url),
    'utf8',
  );
  const reactPreview = readFileSync(
    new URL('../../../../apps/demos/src/preview/react/lifecycles.tsx', import.meta.url),
    'utf8',
  );
  const vuePreview = readFileSync(
    new URL('../../../../apps/demos/src/preview/vue/lifecycles.ts', import.meta.url),
    'utf8',
  );

  for (const file of ['ecommerce.ts', 'ecommerce.react.tsx', 'ecommerce.vue', 'ecommerce.angular.ts']) {
    assert.match(catalog, new RegExp(`examples/revogrid-demos/pro-e-commerce/src/${file.replace('.', '\\.')}`));
  }
  for (const file of [
    'ecommerce.filtering.ts',
    'ecommerce.theme.ts',
    'sys-data/ecommerce.columns.ts',
    'sys-data/ecommerce.data.ts',
  ]) {
    const matches = catalog.match(new RegExp(
      `examples/revogrid-demos/pro-e-commerce/src/${file.replaceAll('.', '\\.').replaceAll('/', '\\/')}`,
      'g',
    ));
    assert.equal(matches?.length, 4, file);
  }
  assert.match(reactPreview, /@showcases\/pro-e-commerce\/src\/ecommerce\.react\.tsx/);
  assert.match(vuePreview, /@showcases\/pro-e-commerce\/src\/ecommerce\.vue/);
  assert.doesNotMatch(catalog, /components\/showcase\/ECommerce/);
});

test('numeric summary distributions keep positive frequency bars visible', () => {
  const column = ECOMMERCE_COLUMNS
    .flatMap((entry) => ('children' in entry ? entry.children : [entry]))
    .find((entry) => entry.prop === 'Lifetime Value');
  const h = (tag, props, children) => ({ tag, props, children });
  const chart = column.summaryVNode(h, { 100: 1, 200: 1, 300: 2 });
  const heights = chart.children[0].children.map(
    (bar) => bar.props.style.height,
  );

  assert.deepEqual(heights, ['50%', '50%', '100%']);
});

test('categorical summaries render at most two total lines', () => {
  const columns = ECOMMERCE_COLUMNS.flatMap((entry) =>
    'children' in entry ? entry.children : [entry],
  );
  const h = (tag, props, children) => ({ tag, props, children });
  const summary = { Chicago: 8, Lisbon: 8, Porto: 4 };

  for (const prop of ['City', 'Membership Type']) {
    const column = columns.find((entry) => entry.prop === prop);
    const rendered = column.summaryVNode(h, summary);

    assert.equal(rendered.children.length, 2, prop);
  }
});

test('the ecommerce grid has square corners', () => {
  const styles = readFileSync(
    new URL('../src/ecommerce.scss', import.meta.url),
    'utf8',
  );
  const gridRule = styles.match(/revo-grid\.ecommerce-grid\s*\{([\s\S]*?)&\[theme/);

  assert.match(gridRule?.[1] || '', /border-radius:\s*0;/);
});

test('numeric aggregate summaries use weighted values and compact formatting', () => {
  const h = (tag, props, children) => ({ tag, props, children });
  const summary = { '-10': 1, 5: 2, 20: 1 };

  const average = renderEcommerceNumericAggregate(h, summary, 'average');
  const sum = renderEcommerceNumericAggregate(h, summary, 'sum');

  assert.equal(average.children[1].children, '5.0%');
  assert.equal(sum.children[1].children, '$20');
});

test('aggregate summary styles cancel chart margins and clip long values', () => {
  const styles = readFileSync(
    new URL('../src/ecommerce.scss', import.meta.url),
    'utf8',
  );
  const aggregateRule = styles.match(/\.ecommerce-summary-aggregate\s*\{([\s\S]*?)\n\s*\}/);

  assert.match(aggregateRule?.[1] || '', /margin:\s*0 20px 0 15px;/);
  assert.match(aggregateRule?.[1] || '', /overflow:\s*hidden;/);
});

test('the ecommerce plugin stack composes summaries before column filter headers', () => {
  assert.ok(ECOMMERCE_PLUGINS.includes(AdvanceFilterPlugin));
  assert.ok(ECOMMERCE_PLUGINS.includes(FilterHeaderPlugin));
  assert.ok(ECOMMERCE_PLUGINS.includes(ExportExcelPlugin));
  assert.ok(
    ECOMMERCE_PLUGINS.indexOf(SummaryChartHeaderPlugin) <
      ECOMMERCE_PLUGINS.indexOf(FilterHeaderPlugin),
  );
});

test('combined filter and summary headers reserve space for both render layers', () => {
  const styles = readFileSync(
    new URL('../src/ecommerce.scss', import.meta.url),
    'utf8',
  );
  const combinedRule = styles.match(/&\.summary-header\.filter-header\s*\{([\s\S]*?)\n\s*\}/);

  assert.match(combinedRule?.[1] || '', /--rv-header-label-height:\s*70px;/);
  assert.match(combinedRule?.[1] || '', /--rv-header-height:\s*110px;/);
  assert.match(combinedRule?.[1] || '', /\.summary-header-content\s*\{[\s\S]*line-height:\s*normal;/);
});

test('combined headers keep selection, summary spacing, and column separators visible', () => {
  const styles = readFileSync(
    new URL('../src/ecommerce.scss', import.meta.url),
    'utf8',
  );

  assert.match(styles, /\.summary-header-box\[data-value='_checkbox'\]/);
  assert.match(styles, /\.cell-header-checkbox-container\s*\{[\s\S]*?margin:\s*0;/);
  assert.match(styles, /\.summary-container\s*\{[\s\S]*?padding-block:\s*8px;/);
  assert.match(
    styles,
    /\.rgHeaderCell\s*\{[\s\S]*?box-shadow:\s*-1px 0 0 0 var\(--ecommerce-border\) inset;/,
  );
});

test('narrow filter inputs stay contained and reserve space for the filter icon', () => {
  const styles = readFileSync(
    new URL('../src/ecommerce.scss', import.meta.url),
    'utf8',
  );

  assert.match(styles, /\.filter-input\s*\{[\s\S]*?overflow:\s*hidden;/);
  assert.match(
    styles,
    /input\[type='text'\]\s*\{[\s\S]*?padding-right:\s*38px\s*!important;[\s\S]*?text-overflow:\s*ellipsis;/,
  );
});

test('all framework variants pass the configured contextual filter templates', () => {
  const variants = [
    ['ecommerce.ts', /grid\.filter\s*=\s*ecommerceFilterConfig/],
    ['ecommerce.react.tsx', /filter=\{ecommerceFilterConfig\}/],
    ['ecommerce.vue', /:filter="ecommerceFilterConfig"/],
    ['ecommerce.angular.ts', /\[filter\]="filterConfig"/],
  ];

  for (const [file, pattern] of variants) {
    const source = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
    assert.match(source, pattern, file);
  }
});

test('all framework variants omit reset and toolbar column chooser controls', () => {
  const files = [
    'ecommerce.ts',
    'ecommerce.react.tsx',
    'ecommerce.vue',
    'ecommerce.angular.ts',
  ];

  for (const file of files) {
    const source = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, />\s*Reset\s*</, file);
    assert.doesNotMatch(source, />\s*Columns\s*</, file);
    assert.doesNotMatch(source, /isColumnsOpen|columnsMenu|columnsButton|resetFilters/, file);
  }
});
