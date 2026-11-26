import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { brandSpread } from './brand-spread.ts';

test('spread positions reverse for lower-is-better rates and include the portfolio', () => {
  const result = brandSpread([{ value: 10, sales: 100 }, { value: 20, sales: 25 }, { value: null, sales: 500 }], 15, true, false);
  assert.ok(result.points[0].position > result.portfolio && result.portfolio > result.points[1].position);
  assert.deepEqual(result.points.map(point => point.index), [0, 1]);
  assert.deepEqual(result.points.map(point => point.size), [13, 9]);
});

test('spread includes zero for diverging values and handles identical values', () => {
  const result = brandSpread([{ value: 5, sales: 10 }, { value: 5, sales: 10 }], null, false, true);
  assert.ok(result.zero < result.points[0].position);
  assert.equal(result.points[0].position, result.points[1].position);
  assert.equal(brandSpread([{ value: null, sales: 0 }], null, false, false), null);
});
