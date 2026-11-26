import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeScreening } from './scale-up-screening.ts';

test('screening counts retain not-applicable answers independently', () => {
  assert.deepEqual(summarizeScreening(['Yes', 'Yes', 'No', 'N/A', 'N/A']), {
    yes: 2,
    no: 1,
    missing: 2,
  });
  assert.deepEqual(summarizeScreening([]), { yes: 0, no: 0, missing: 0 });
});
