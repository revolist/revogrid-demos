import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { distributionPoints } from './forecast-distribution.ts';

test('positions lines by attainment and stacks nearby values', () => {
  const points = distributionPoints([0.8, 1, 1.01, 1.25, 2, 0]);
  assert.deepEqual(points.map(({ onPlan }) => onPlan), [false, true, true, true, true, false]);
  assert.equal(points[0].x, 64);
  assert.equal(points[1].x, 80);
  assert.equal(points[2].y, 10);
  assert.equal(points[4].x, 98);
  assert.equal(points[5].x, 2);
  assert.deepEqual(distributionPoints([]), []);
});
