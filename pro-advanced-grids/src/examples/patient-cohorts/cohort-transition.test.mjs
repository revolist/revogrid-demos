import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { cohortTransition } from './cohort-transition.ts';

test('sequential conversion uses the prior checkpoint and does not treat holds as a stage', () => {
  const counts = { answers: 1405, verified: 1174, booked: 840, arrived: 700, started: 608, hold: 107 };
  assert.deepEqual(cohortTransition('booked', counts), { label: 'verified', count: 840, denominator: 1174, percent: 72 });
  assert.equal(cohortTransition('hold', counts), null);
  assert.equal(cohortTransition('arrived', { booked: 0, arrived: 0 }).percent, null);
});
