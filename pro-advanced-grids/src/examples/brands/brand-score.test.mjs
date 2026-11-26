import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { scoreSection } from './brand-score.ts';
import { initialBrands } from './brand-fixtures.ts';

test('section score averages comparable rates and respects lower-is-better lines', () => {
  assert.equal(scoreSection([{value: 16, portfolio: 10, step: 3}, {value: 4, portfolio: 8, step: 2, lower: true}, {value: null, portfolio: 1, step: 1}]), 2);
  assert.equal(scoreSection([{value: null, portfolio: 1, step: 1}]), null);
});
test('fixture retains the style, units and stock inputs for the portfolio', () => {
  assert.equal(initialBrands.reduce((sum, item) => sum + item.styles, 0), 44);
  const net = initialBrands.reduce((sum, item) => sum + item.sales, 0);
  assert.equal(net, 11370914);
  const stock = initialBrands.reduce((sum, item) => sum + item.stockCost, 0);
  assert.ok(stock === 1855300);
});
