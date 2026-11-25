import assert from 'node:assert/strict';
import { test } from 'node:test';
import { availableDecisions, previewDecision } from './budget-decisions.ts';
const line = { lineStatus: 'inProgress', plan: { hours: 420, rate: 165, qty: 0, unit: 'mo', price: 0, fixed: 0 }, billedParts: { hours: 250, qty: 0, fixed: 0 }, leftParts: { hours: 202, qty: 0, fixed: 0 } };
test('cover transfers the overrun and adjusts the planned components', () => {
  const result = previewDecision(line, 'Cover', 28610, line.leftParts);
  assert.equal(result.plan.hours, 452); assert.equal(result.totals.budget, 74580); assert.equal(result.reserve, 23330);
  assert.ok(previewDecision(line, 'Cover', 5000, line.leftParts).error); assert.equal(line.plan.hours, 420);
});
test('hold and adjust preserve the plan and billed components', () => {
  const hold = previewDecision(line, 'Hold', 28610, line.leftParts);
  assert.equal(hold.left.hours, 170); assert.equal(hold.totals.forecast, 69300);
  const adjust = previewDecision(line, 'Adjust', 28610, { ...line.leftParts, hours: 180 });
  assert.equal(adjust.totals.forecast, 70950);
  assert.ok(previewDecision(line, 'Adjust', 28610, { ...line.leftParts, hours: -1 }).error);
});
test('release and hold preserve independent mixed-pricing components', () => {
  const mixed = { lineStatus: 'inProgress', plan: { hours: 100, rate: 100, qty: 6, unit: 'mo', price: 500, fixed: 2000 }, billedParts: { hours: 20, qty: 2, fixed: 500 }, leftParts: { hours: 60, qty: 3, fixed: 1000 } };
  const release = previewDecision(mixed, 'Cover', 1000, mixed.leftParts);
  assert.deepEqual([release.plan.hours, release.plan.qty, release.plan.fixed], [80, 5, 1500]);
  assert.equal(release.reserve, 4000); assert.equal(release.totals.budget, release.totals.forecast);
  assert.equal(availableDecisions(mixed).Hold, false);
  const done = { ...mixed, lineStatus: 'done', leftParts: { hours: 0, qty: 0, fixed: 0 } };
  assert.equal(availableDecisions(done).Adjust, false); assert.equal(availableDecisions(done).Cover, true);
});
