import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { monthlyMetric } from './brand-month-model.ts';
import { brandMonthFixtures } from './brand-month-fixtures.ts';
import { initialBrands } from './brand-fixtures.ts';

test('portfolio monthly markdown is calculated from sales and markdown, not averaged rates', () => {
  const active = initialBrands.filter((brand) => brand.styles);
  const january = active.map((brand) => brandMonthFixtures[brand.label][3]);
  const net = january.reduce((sum, month) => sum + month.net, 0);
  const markdown = january.reduce((sum, month) => sum + month.markdown, 0);
  assert.equal(monthlyMetric(january, 'markdown', 44), markdown / (net + markdown) * 100);
  assert.notEqual(monthlyMetric(january, 'markdown', 44).toFixed(1), monthlyMetric(active.map((brand) => brandMonthFixtures[brand.label][6]), 'markdown', 44).toFixed(1));
  assert.equal(monthlyMetric([], 'sales', 0), null);
});

test('new brands do not add incomparable sales to prior-year growth', () => {
  const old = brandMonthFixtures.Wildhaven[0], recent = brandMonthFixtures['Morrow Trail'][0];
  assert.equal(monthlyMetric([old, recent], 'change', 13), monthlyMetric([old], 'change', 8));
});
