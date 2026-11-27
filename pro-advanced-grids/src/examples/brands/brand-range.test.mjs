import assert from 'node:assert/strict';
import { test } from 'node:test';
import { brandRangeScale } from './brand-range.ts';

test('axis ticks and points share a domain, including negative and empty data', () => {
  const scale = brandRangeScale([-15, 0, 30]);
  assert.deepEqual(scale.ticks, [30, 15, 0, -15]);
  assert.equal(scale.position(-15), 20);
  assert.equal(scale.position(30), 80);
  assert.equal(scale.position(0), 40);
  assert.deepEqual(brandRangeScale([], 45).ticks, [45, 30, 15, 0]);
  assert.ok(Number.isFinite(brandRangeScale([]).position(0)));
});
