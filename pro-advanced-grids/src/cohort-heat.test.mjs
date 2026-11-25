import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { cohortHeatTier } from './cohort-heat.ts';

test('outcome colors follow percentage bands at each boundary', () => {
  assert.deepEqual([34, 35, 54, 55, 69, 70].map((n) => cohortHeatTier('started', n)),
    ['very-low', 'low', 'low', 'medium', 'medium', 'high']);
  assert.deepEqual([7, 8, 9, 10, 13, 14].map((n) => cohortHeatTier('hold', n)),
    ['risk-low', 'risk-caution', 'risk-caution', 'risk-watch', 'risk-watch', 'risk-high']);
});
