import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { budgetHealth, monthForDay, projectedFinish, scheduleGeometry, projectToday, timelineEnd } from './budget-schedule.ts';
import { compareBudget } from './budget-sort.ts';

test('forecast extends a time-based line by its projected hours', () => {
  const row = { start: 44, plannedEnd: 97, unit: 'Hours', units: 96, rate: 150, actual: 13200, remaining: 3000 };
  assert.equal(projectedFinish(row), 104);
  const geometry = scheduleGeometry({ ...row, finish: 104 }, false);
  assert.ok(Math.abs(geometry.today - projectToday / timelineEnd * 100) < 1e-9);
  assert.ok(Math.abs(geometry.extensionWidth - 7 / timelineEnd * 100) < 1e-9);
  assert.equal(monthForDay(44), 1);
});
test('completed and unstarted work respect their planned dates', () => {
  assert.equal(projectedFinish({ start: 30, plannedEnd: 55, unit: 'Hours', units: 120, rate: 150, actual: 16800, remaining: 0 }), 55);
  assert.equal(projectedFinish({ start: 163, plannedEnd: 181, unit: 'Fixed fee', units: 1, rate: 8000, actual: 0, remaining: 8000 }), 181);
  assert.equal(scheduleGeometry({ start: 163, plannedEnd: 181, finish: 181 }, false).elapsedWidth, 0);
});
test('sorting keeps missing values last in both directions', () => {
  const missing = { budget: 1, actual: 0, spent: null, forecast: 1, delta: 0 };
  const value = { ...missing, spent: 25 };
  assert.ok(compareBudget(missing, value, 'spent', 1) > 0);
  assert.ok(compareBudget(missing, value, 'spent', -1) > 0);
});
test('health compares spending to both forecast and elapsed time', () => {
  const row = { start: 79, plannedEnd: 167, budget: 29600, actual: 11100, forecast: 28860 };
  assert.equal(budgetHealth(row), 'ahead');
  assert.equal(budgetHealth({ ...row, forecast: 30000 }), 'over');
  assert.equal(budgetHealth({ ...row, actual: 0 }), 'idle');
  assert.equal(budgetHealth({ ...row, actual: 28860 }), 'done');
});
