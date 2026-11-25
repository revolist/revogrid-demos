import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attainment,
  departments,
  initialLines,
  newLine,
  readLine,
  rollup,
  sum,
} from './forecast-data.ts';

test('department growth changes projections while closed months retain actuals', () => {
  const line = initialLines[0];
  const baseline = readLine(line, 7, 0);
  const higher = readLine(line, 7, 10);
  assert.deepEqual(higher.months.slice(0, 8), line.actual.slice(0, 8));
  assert.equal(higher.actual, baseline.actual);
  assert.ok(higher.forecast > baseline.forecast);
  assert.equal(higher.outlook, sum(higher.months));
  assert.equal(readLine(line, 11, 10).forecast, 0);
});

test('fictional portfolio totals use precise actuals, prior sales and plans', () => {
  const readings = initialLines.map((line) => readLine(line, 7, departments.find((group) => group.name === line.department).growth));
  const total = rollup(readings);
  assert.equal(total.actual, 56864100);
  assert.equal(total.forecast, 26055900);
  assert.equal(total.plan, 72740000);
  assert.equal((total.actual / sum(total.prior.slice(0, 8)) - 1).toFixed(3), '0.237');
  assert.equal((total.forecast / sum(total.prior.slice(8)) - 1).toFixed(3), '0.134');
  assert.equal((100 * attainment(total)).toFixed(1), '105.7');
  assert.equal(total.plannedActual, sum(readings.filter((reading) => reading.plan > 0).map((reading) => reading.actual)));
});

test('exit projections stop after the final month and new-line forecasts do not apply prior-year growth', () => {
  const exit = initialLines.find((line) => line.name === 'Camp Chairs');
  const newItem = initialLines.find((line) => line.name === 'Kids Hikers');
  assert.deepEqual(readLine(exit, 7, -2).months.slice(10), [0, 0]);
  assert.deepEqual(readLine(newItem, 7, 5).months.slice(8), readLine(newItem, 7, 20).months.slice(8));
});

test('new lines without sales remain empty and can have no plan', () => {
  const line = newLine('new', {
    name: 'Socks',
    department: 'Footwear',
    planner: 'Morgan Reed',
    status: 'New',
    plan: 0,
  });
  const reading = readLine(line, 7, 10);
  assert.equal(reading.outlook, 0);
  assert.equal(attainment(reading), null);
  assert.equal(attainment({ ...reading, plan: 100 }), 0);
});

test('the rollup weights plan attainment by the value of each line', () => {
  const readings = initialLines.map((line) => readLine(line, 7, 5));
  const total = rollup(readings);
  assert.equal(total.outlook, sum(total.months));
  assert.equal(total.outlook, total.actual + total.forecast);
  assert.equal(
    attainment(total),
    sum(
      readings
        .filter((reading) => reading.plan > 0)
        .map((reading) => reading.outlook),
    ) / sum(initialLines.map((line) => line.plan)),
  );
  assert.equal(attainment(rollup([])), null);
});
