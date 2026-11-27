import assert from 'node:assert/strict';
import test from 'node:test';
import { productPeriodHealth } from './product-guardrails.ts';
import { productFixtures } from './product-fixtures.ts';

const defaults = { weeklySalesTarget: 20000, marginFloor: 25, discountCeiling: 20 };

test('fictional sample produces its default period totals and health', () => {
  assert.equal(productFixtures.length, 29);
  const expected = [
    ['Alder Summit Boot', 467954, 'On Track', ['met', 'met', 'met']],
    ['Fernbank Walking Boot', 251365, 'On Track', ['near', 'met', 'met']],
    ['Harbor Loop Running Shoe', 525658, 'Off Track', ['met', 'miss', 'met']],
    ['Copper Peak Rain Jacket', 439027, 'On Track', ['met', 'met', 'met']],
    ['Ridgeway Walking Pant', 278713, 'On Track', ['met', 'met', 'met']],
  ];
  for (const [name, revenue, status, marks] of expected) {
    const product = productFixtures.find((item) => item.label === name);
    const result = productPeriodHealth(product.weeks.slice(-13), product.markdown, defaults);
    assert.equal(Math.round(result.revenue), revenue);
    assert.equal(result.status, status);
    assert.deepEqual(result.marks, marks);
  }
  assert.equal(new Set(productFixtures.map(product => product.sku)).size, 29);
  for (const product of productFixtures) {
    assert.equal(product.weeks.length, 52);
    for (const [net, gross, discount] of product.weeks) assert.ok(Math.abs(net + discount - gross) < .02);
  }
  assert.ok(productFixtures.some(product => productPeriodHealth(product.weeks.slice(-13), product.markdown, defaults).discount >= .2));
});

test('health uses the period sales target, distinguishes near misses, and caps losses', () => {
  const weeks = Array.from({ length: 4 }, () => [20000, 25000, 5000, 6000, 25000, null]);
  const atLimit = productPeriodHealth(weeks, 0, defaults);
  assert.deepEqual(atLimit.passes, [true, true, false]);
  assert.deepEqual(atLimit.marks, ['met', 'met', 'near']);
  assert.equal(productPeriodHealth(weeks, 0, { ...defaults, weeklySalesTarget: 30000 }).passes[0], false);
  assert.equal(productPeriodHealth(weeks, .5, defaults).passes[0], false);
  assert.equal(productPeriodHealth(weeks, 0, defaults, { margin: -1 }).status, 'Off Track');
  assert.equal(productPeriodHealth([[0, 0, 0, 0, 0, null]], 0, defaults).status, 'No Sales');
});
