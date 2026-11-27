import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planAmount, partsAmount, primaryBasis } from './budget-components.ts';

test('mixed labor, licenses and fee retain an exact grid budget and billed amount', () => {
  const plan = { hours: 100, rate: 150, qty: 6, unit: 'mo', price: 500, fixed: 2000 };
  assert.equal(planAmount(plan), 20000);
  assert.equal(partsAmount({ hours: 20, qty: 2, fixed: 500 }, plan), 4500);
  const primary = primaryBasis(plan);
  assert.equal(primary.units * primary.rate + primary.baseFee, 20000);
  assert.equal(primary.unit, 'Hours');
});

test('sample billing entries reconcile with their recorded actual amounts', async () => {
  const { budgetActivityFixtures } = await import('./budget-activity-fixtures.ts');
  const { partsAmount } = await import('./budget-components.ts');
  for (const line of Object.values(budgetActivityFixtures)) {
    const billed = line.entries
      .filter(entry => !/-u[hlqf]$/.test(entry.id))
      .reduce((sum, entry) => sum + entry.amount, 0);
    assert.equal(billed, partsAmount(line.actual, line.plan), line.id);
  }
});
