import assert from 'node:assert/strict';
import test from 'node:test';
import { attainment, comparablePeriods, periods } from './sales-periods.ts';

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

test('attainment compares matching store-months while actual includes unplanned sales', () => {
  const values = comparablePeriods([
    { sales: [100, 200], targets: [100, 0], missingSales: [false, false] },
    { sales: [0, 50], targets: [200, 100], missingSales: [true, false] },
  ], 1);
  assert.equal(values.actual1, 350);
  assert.equal(values.comparableActual1, 150);
  assert.equal(values.target1, 200);
  assert.equal(values.variance1, -50);
  assert.equal(values.ratio1, 75);
  const missing = comparablePeriods([{ sales: [0], targets: [100], missingSales: [true] }], 0);
  assert.equal(missing.ratio0, null);
  assert.equal(missing.hasActual0, false);
  const zero = comparablePeriods([{ sales: [0], targets: [0], missingSales: [false] }], 0);
  assert.equal(zero.ratio0, null);
  assert.equal(zero.hasActual0, true);
  assert.equal(zero.actual0, 0);
});

test('zero target remains distinct from zero attainment', () => {
  assert.equal(attainment(0, 0), null);
  assert.equal(attainment(0, 100), 0);
  assert.equal(periods([0], [0], 0).ratio0, null);
});
