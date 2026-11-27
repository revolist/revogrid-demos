import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attainment,
  departments,
  initialLines,
  newLine,
  quarterlyReadings,
  readLine,
  rollup,
  sum,
} from './forecast-data.ts';

test('fiscal quarters preserve totals and identify mixed actual and forecast periods', () => {
  const line = initialLines[0];
  const reading = readLine(line, 7, 5);
  const quarters = quarterlyReadings(reading, 7);
  assert.deepEqual(quarters.map(quarter => quarter.phase), ['Actual', 'Actual', 'Actual / forecast', 'Forecast']);
  assert.deepEqual(quarters.map(quarter => quarter.period), ['Nov–Jan', 'Feb–Apr', 'May–Jul', 'Aug–Oct']);
  assert.equal(sum(quarters.map(quarter => quarter.current)), reading.outlook);
  assert.equal(sum(quarters.map(quarter => quarter.prior)), sum(reading.prior));
  assert.equal(quarterlyReadings(readLine(newLine('new', { name: 'New', department: 'Camp', planner: 'A', status: 'New', plan: 0 }), 7, 0), 7)[0].change, null);
});

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
  assert.equal(total.actual, 31588700);
  assert.equal(total.forecast, 14534500);
  assert.equal(total.plan, 45829800);
  assert.equal((total.actual / sum(total.prior.slice(0, 8)) - 1).toFixed(3), '0.117');
  assert.equal((total.forecast / sum(total.prior.slice(8)) - 1).toFixed(3), '0.105');
  assert.equal((100 * attainment(total)).toFixed(1), '97.8');
  assert.equal(total.plannedActual, sum(readings.filter((reading) => reading.plan > 0).map((reading) => reading.actual)));
});

test('seasonal products peak in a plausible part of the year', () => {
  for (const name of ['Recovery Slides', 'Beach Shelters', 'Water Bottles']) {
    const prior = initialLines.find(line => line.name === name).prior;
    assert.ok(Math.max(...prior.slice(5, 10)) > Math.max(...prior.slice(0, 3)), name);
  }
  const parkas = initialLines.find(line => line.name === 'Commuter Parkas').prior;
  assert.ok(Math.max(...parkas.slice(0, 3)) > Math.max(...parkas.slice(6, 9)));
});

test('forecast lines have varied seasonal histories and no future actuals', () => {
  const active = initialLines.filter(line => line.status === 'Active');
  const seasonalProfiles = active.map(line => line.prior.map(value => (value / sum(line.prior)).toFixed(2)).join(','));
  assert.equal(new Set(seasonalProfiles).size, active.length);
  for (const line of initialLines) {
    assert.equal(line.prior.length, 12);
    assert.equal(line.actual.length, 12);
    assert.ok(line.actual.slice(8).every(value => value === 0));
    if (line.status === 'New') assert.ok(line.prior.every(value => value === 0));
  }
});

test('exit projections stop after the final month and new-line forecasts do not apply prior-year growth', () => {
  const exit = initialLines.find((line) => line.name === 'Folding Stools');
  const newItem = initialLines.find((line) => line.name === 'Junior Rain Boots');
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
