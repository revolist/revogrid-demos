import assert from 'node:assert/strict';
import test from 'node:test';
import { productPeriodHealth } from './product-guardrails.ts';
import { productFixtures } from './product-fixtures.ts';

const defaults = { weeklySalesTarget: 20000, marginFloor: 25, discountCeiling: 20 };

test('fictional sample produces its default period totals and health', () => {
  assert.equal(productFixtures.length, 29);
  const expected = [
    ['Granite Trail Boot', 314036, 'On Track', ['met', 'met', 'met']],
    ['Cloudline Mid Boot', 140657, 'At Risk', ['miss', 'met', 'met']],
    ['Harbor Trail Runner', 416522, 'Off Track', ['met', 'miss', 'met']],
    ['Ridgeline Weather Jacket', 496261, 'On Track', ['met', 'met', 'met']],
    ['Mesa Trek Pant', 182911, 'At Risk', ['miss', 'met', 'met']],
  ];
  for (const [name, revenue, status, marks] of expected) {
    const product = productFixtures.find((item) => item.label === name);
    const result = productPeriodHealth(product.weeks.slice(-13), product.markdown, defaults);
    assert.equal(Math.round(result.revenue), revenue);
    assert.equal(result.status, status);
    assert.deepEqual(result.marks, marks);
  }
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
