import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { estimatedWeeksOfCover, replenishmentEstimate } from './product-replenishment.ts';

test('stock cover estimates weeks from the last four weeks of gross sales', () => {
  const week = gross => [0, gross, 0, 0, 0, null];
  assert.equal(estimatedWeeksOfCover(100, 20, [week(5000), week(1000), week(1000), week(1000), week(1000)]), 2);
  assert.equal(estimatedWeeksOfCover(0, 20, Array(4).fill(week(1000))), 0);
  assert.equal(estimatedWeeksOfCover(100, 20, Array(4).fill(week(0))), null);
  assert.equal(estimatedWeeksOfCover(100, 0, Array(4).fill(week(1000))), null);
  assert.equal(estimatedWeeksOfCover(100, 20, [week(1000)]), null);
});

test('suggested units fill eight weeks of estimated demand without negative orders', () => {
  const week = gross => [0, gross, 0, 0, 0, null];
  const weeks = Array(4).fill(week(1000));
  assert.deepEqual(replenishmentEstimate(100, 20, weeks), { averageUnits: 50, demandChange: null, cover: 2, suggestedUnits: 300 });
  assert.equal(replenishmentEstimate(500, 20, weeks).suggestedUnits, 0);
  assert.equal(replenishmentEstimate(1, 20, Array(4).fill(week(0))), null);
});

test('demand change compares adjacent four-week periods and handles missing history', () => {
  const week = gross => [0, gross, 0, 0, 0, null];
  const weeks = [...Array(4).fill(week(800)), ...Array(4).fill(week(1000))];
  assert.equal(replenishmentEstimate(100, 20, weeks).demandChange, 0.25);
  assert.equal(replenishmentEstimate(100, 20, [...Array(4).fill(week(0)), ...Array(4).fill(week(1000))]).demandChange, null);
});
