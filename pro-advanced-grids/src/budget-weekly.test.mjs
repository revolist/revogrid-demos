import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { budgetActivityFixtures as fixtures } from './budget-activity-fixtures.ts';
import { referenceSchedule } from './budget-reference-schedule.ts';
import { weeklyBudget } from './budget-weekly.ts';
const build = ['Portal application', 'Account onboarding', 'Cloud hosting', 'Knowledge search', 'Inclusive design review'].map(name => ({ ...referenceSchedule[name], id: fixtures[name].id, plan: fixtures[name].plan, billedParts: fixtures[name].actual, leftParts: fixtures[name].left, lineStatus: fixtures[name].status }));
test('weekly budget matches billing pace and forecast distribution', () => {
  const spend = weeklyBudget(build, 'L-107', 'spend');
  assert.equal(spend.pace, 4004.25);
  assert.deepEqual(spend.visible.slice(0, 6).map(({ billed, ahead, line }) => [billed, ahead, line]), [[9384,0,7590],[11866,0,9405],[7095,0,7095],[14784,0,7590],[15456,0,9570],[0,7147,2310]]);
  const hours = weeklyBudget(build, 'L-107', 'hours');
  assert.equal(hours.pace, 18.75);
  assert.deepEqual(hours.visible.slice(0, 3).map(({ billed }) => billed), [46, 57, 43]);
});
test('weekly forecasts react to changed remaining hours and preserve missing history', () => {
  const changed = build.map(line => line.id === 'L-107' ? { ...line, leftParts: { ...line.leftParts, hours: 0 } } : line);
  assert.ok(weeklyBudget(changed, 'L-107', 'spend').points.reduce((sum, point) => sum + point.ahead, 0) < weeklyBudget(build, 'L-107', 'spend').points.reduce((sum, point) => sum + point.ahead, 0));
  const fresh = { ...build[0], billedParts: { hours: 0, qty: 0, fixed: 0 }, start: 100, plannedEnd: 120 };
  assert.equal(weeklyBudget([fresh], fresh.id, 'spend').pace, null);
});

test('cumulative budget chart joins actuals to the weekly forecast and limits its near range', async () => {
  const { budgetBurn } = await import('./budget-weekly.ts');
  const result = budgetBurn(build[0]);
  assert.equal(result.points[0].day, 62);
  assert.ok(Math.abs(result.points[0].planned - 69300 / 17) < .001);
  assert.deepEqual(result.points.slice(0, 5).map(point => point.actual), [7590, 16995, 24090, 31680, 41250]);
  const current = result.points.find(point => point.day === result.current);
  assert.equal(current.actual, 41250); assert.equal(current.forecast, 41250);
  assert.equal(result.points.at(-1).forecast, 74580);
  assert.equal(budgetBurn(build[0], true).visible.length, 13);
});
