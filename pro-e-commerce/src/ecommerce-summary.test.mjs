import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  AdvanceFilterPlugin,
  FilterHeaderPlugin,
  SummaryChartHeaderPlugin,
} from '@revolist/revogrid-pro';

import {
  ECOMMERCE_COLUMNS,
  ECOMMERCE_PLUGINS,
  renderEcommerceNumericAggregate,
} from './sys-data/ecommerce.columns.ts';

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
    new URL('./ecommerce.scss', import.meta.url),
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
    new URL('./ecommerce.scss', import.meta.url),
    'utf8',
  );
  const aggregateRule = styles.match(/\.ecommerce-summary-aggregate\s*\{([\s\S]*?)\n\s*\}/);

  assert.match(aggregateRule?.[1] || '', /margin:\s*0 20px 0 15px;/);
  assert.match(aggregateRule?.[1] || '', /overflow:\s*hidden;/);
});

test('the ecommerce plugin stack composes summaries before column filter headers', () => {
  assert.ok(ECOMMERCE_PLUGINS.includes(AdvanceFilterPlugin));
  assert.ok(ECOMMERCE_PLUGINS.includes(FilterHeaderPlugin));
  assert.ok(
    ECOMMERCE_PLUGINS.indexOf(SummaryChartHeaderPlugin) <
      ECOMMERCE_PLUGINS.indexOf(FilterHeaderPlugin),
  );
});

test('combined filter and summary headers reserve space for both render layers', () => {
  const styles = readFileSync(
    new URL('./ecommerce.scss', import.meta.url),
    'utf8',
  );
  const combinedRule = styles.match(/&\.summary-header\.filter-header\s*\{([\s\S]*?)\n\s*\}/);

  assert.match(combinedRule?.[1] || '', /--rv-header-label-height:\s*70px;/);
  assert.match(combinedRule?.[1] || '', /--rv-header-height:\s*110px;/);
  assert.match(combinedRule?.[1] || '', /\.summary-header-content\s*\{[\s\S]*line-height:\s*normal;/);
});

test('combined headers keep selection, summary spacing, and column separators visible', () => {
  const styles = readFileSync(
    new URL('./ecommerce.scss', import.meta.url),
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
    new URL('./ecommerce.scss', import.meta.url),
    'utf8',
  );

  assert.match(styles, /\.filter-input\s*\{[\s\S]*?overflow:\s*hidden;/);
  assert.match(
    styles,
    /input\[type='text'\]\s*\{[\s\S]*?padding-right:\s*38px\s*!important;[\s\S]*?text-overflow:\s*ellipsis;/,
  );
});

test('all framework variants enable the grid filter property', () => {
  const variants = [
    ['ecommerce.ts', /grid\.filter\s*=\s*true/],
    ['ecommerce.react.tsx', /filter=\{true\}/],
    ['ecommerce.vue', /:filter="true"/],
    ['ecommerce.angular.ts', /\[filter\]="true"/],
  ];

  for (const [file, pattern] of variants) {
    const source = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8');
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
    const source = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, />\s*Reset\s*</, file);
    assert.doesNotMatch(source, />\s*Columns\s*</, file);
    assert.doesNotMatch(source, /isColumnsOpen|columnsMenu|columnsButton|resetFilters/, file);
  }
});
