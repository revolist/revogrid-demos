import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { distributionPoints, plannedDistribution } from './forecast-distribution.ts';

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

test('keeps only planned lines and preserves the line for each plotted ratio', () => {
  const lines = [
    { line: { name: 'Ahead' }, reading: { plan: 100, outlook: 120 } },
    { line: { name: 'Unplanned' }, reading: { plan: 0, outlook: 50 } },
    { line: { name: 'Behind' }, reading: { plan: 200, outlook: 0 } },
  ];
  const result = plannedDistribution(lines);
  assert.deepEqual(result.map(({ item }) => item.line.name), ['Ahead', 'Behind']);
  assert.deepEqual(result.map(({ ratio }) => ratio), [1.2, 0]);
  assert.deepEqual(plannedDistribution([lines[1]]), []);
});
