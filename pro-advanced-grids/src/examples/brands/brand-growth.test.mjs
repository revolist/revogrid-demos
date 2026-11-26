import assert from 'node:assert/strict';
import test from 'node:test';
import { comparableGrowth } from './brand-growth.ts';

test('portfolio growth compares current sales against comparable prior sales', () => {
  const rows = [
    { sales: 100, change: 10, isNew: false },
    { sales: 100, change: -10, isNew: false },
    { sales: 1000, change: 0, isNew: true },
  ];
  assert.ok(Math.abs(comparableGrowth(rows) - -1) < 1e-10);
  assert.equal(comparableGrowth([{ sales: 100, change: 0, isNew: true }]), 0);
  assert.equal(
    comparableGrowth([{ sales: 100, change: -100, isNew: false }]),
    0,
  );
});
