import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { revenuePosition, marginPosition } from './scale-up-metrics.ts';

test('metric tracks share bounded, zero-safe scales', () => {
  assert.ok(Math.abs(revenuePosition(28, 200) - 14) < 1e-9);
  assert.equal(revenuePosition(28, 0), 0);
  assert.equal(revenuePosition(300, 200), 100);
  assert.equal(marginPosition(0), 50);
  assert.equal(marginPosition(8.9), 67.8);
  assert.equal(marginPosition(-3), 44);
  assert.equal(marginPosition(-40), 0);
  assert.equal(marginPosition(40), 100);
});
