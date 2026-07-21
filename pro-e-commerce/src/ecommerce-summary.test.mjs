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

test('the ecommerce plugin stack activates column filters before summary headers', () => {
  assert.ok(ECOMMERCE_PLUGINS.includes(AdvanceFilterPlugin));
  assert.ok(ECOMMERCE_PLUGINS.includes(FilterHeaderPlugin));
  assert.ok(
    ECOMMERCE_PLUGINS.indexOf(FilterHeaderPlugin) <
      ECOMMERCE_PLUGINS.indexOf(SummaryChartHeaderPlugin),
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
