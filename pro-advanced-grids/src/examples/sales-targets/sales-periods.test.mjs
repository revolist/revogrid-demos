import assert from 'node:assert/strict';
import test from 'node:test';
import { attainment, periods } from './sales-periods.ts';

test('periods use the closed month and rolling three-month and year-to-date sums', () => {
  const values = periods([100, 200, 300, 400], [100, 100, 200, 500], 3);
  assert.deepEqual(values, {
    actual0: 400,
    variance0: -100,
    ratio0: 80,
    actual1: 900,
    variance1: 100,
    ratio1: 112.5,
    actual2: 1000,
    variance2: 100,
    ratio2: (1000 / 900) * 100,
  });
});

test('zero target remains distinct from zero attainment', () => {
  assert.equal(attainment(0, 0), null);
  assert.equal(attainment(0, 100), 0);
  assert.equal(periods([0], [0], 0).ratio0, null);
});
