import { test } from 'node:test';
import assert from 'node:assert/strict';
import { referenceStores } from './sales-reference-fixtures.ts';
import { periods } from './sales-periods.ts';

test('store monthly data preserves exact portfolio and store values', () => {
  assert.equal(referenceStores.length, 28);
  const portland = referenceStores.find(store => store.name === 'Portland Riverfront');
  assert.equal(portland.actuals[10], 371600);
  assert.equal(portland.targets[10], 383200);
  const results = periods(portland.actuals.map(n => n ?? 0), portland.targets.map(n => n ?? 0), 10);
  assert.equal(results.actual1, 1194900);
  assert.equal(results.variance2, -121900);
  assert.ok(referenceStores.reduce((sum, store) => sum + (store.actuals[10] ?? 0), 0) > 0);
  for (const store of referenceStores) if (store.target != null) assert.equal(store.targets.reduce((sum, value) => sum + (value ?? 0), 0), store.target);
  const hamburg = referenceStores.find(store => store.name === 'Hamburg Altona');
  assert.equal(hamburg.actuals[10], null);
  assert.equal(hamburg.targets[10], null);
  const barcelona = referenceStores.find(store => store.name === 'Barcelona Poblenou');
  assert.ok(barcelona.actuals.every(value => value === null));
  assert.ok(barcelona.targets.every(value => value === null));
});
