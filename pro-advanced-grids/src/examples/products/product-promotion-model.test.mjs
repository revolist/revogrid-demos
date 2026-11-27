import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promotionReport, weeklyContribution } from './product-promotion-model.ts';
import { productFixtures } from './product-fixtures.ts';
import { productDetailFixtures } from './product-detail-fixtures.ts';

test('promotion events and attributed payback follow the active window', () => {
  const ridge = productFixtures.find(item => item.sku === 'RT-1001');
  const report = promotionReport(ridge.weeks, 13, ridge.markdown, ridge.landed, ridge.serve, productDetailFixtures[ridge.sku].promotions);
  assert.deepEqual(report.map(item => [item.key, item.weeks]), [['members', 2]]);
  assert.equal(Math.round(report[0].payback), -3372);
  assert.equal(Math.round(report[0].lift), 5122);
  assert.equal(Math.round(report[0].subsidy), -8493);
  assert.equal(Math.round(weeklyContribution(ridge.weeks[39], ridge.landed, ridge.serve)[3]), 16995);
  for (const product of productFixtures) for (const week of product.weeks) {
    assert.ok(Math.abs(week[3] - weeklyContribution(week, product.landed, product.serve)[3]) < .02);
  }
  assert.ok(productFixtures.some(product => product.weeks.some(week => week[3] < 0)));
});
