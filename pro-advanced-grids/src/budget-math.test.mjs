import assert from 'node:assert/strict';
import test from 'node:test';
import { budgetLineTotals } from './budget-math.ts';

test('monthly pricing includes its fixed addition in budget and variance', () => {
  assert.deepEqual(
    budgetLineTotals({
      units: 6,
      rate: 450,
      baseFee: 1500,
      actual: 1950,
      remaining: 2250,
    }),
    {
      budget: 4200,
      actual: 1950,
      forecast: 4200,
      delta: 0,
      spent: (1950 / 4200) * 100,
    },
  );
});

test('an unstarted line has no spend percentage', () => {
  assert.equal(
    budgetLineTotals({
      units: 1,
      rate: 8000,
      baseFee: 0,
      actual: 0,
      remaining: 8000,
    }).spent,
    null,
  );
});
