import { test } from 'node:test';
import assert from 'node:assert/strict';
import { referenceStores } from './sales-reference-fixtures.ts';
import { periods } from './sales-periods.ts';
import { memberCounts } from './sales-membership.ts';

test('store monthly data preserves exact portfolio and store values', () => {
  assert.equal(referenceStores.length, 28);
  const portland = referenceStores.find(store => store.name === 'Denver Union Station');
  assert.equal(portland.actuals[10], 371600);
  assert.equal(portland.targets[10], 383200);
  const results = periods(portland.actuals.map(n => n ?? 0), portland.targets.map(n => n ?? 0), 10);
  assert.equal(results.actual1, 1194900);
  assert.equal(results.variance2, -121900);
  assert.ok(referenceStores.reduce((sum, store) => sum + (store.actuals[10] ?? 0), 0) > 0);
  for (const store of referenceStores) if (store.target != null) assert.equal(store.targets.reduce((sum, value) => sum + (value ?? 0), 0), store.target);
  const refit = referenceStores.find(store => store.name === 'Nantes Bouffay');
  assert.equal(refit.actuals[10], null);
  assert.equal(refit.targets[10], null);
  const preOpening = referenceStores.find(store => store.name === 'Adelaide Norwood');
  assert.ok(preOpening.actuals.every(value => value === null));
  assert.ok(preOpening.targets.every(value => value === null));
});

test('every fictional co-operative store has a valid member count', () => {
  assert.deepEqual(Object.keys(memberCounts).sort(), referenceStores.map(store => store.id).sort());
  assert.ok(Object.values(memberCounts).every(value => Number.isInteger(value) && value >= 0));
  for (const store of referenceStores) {
    if (store.status === 'Pre-opening') {
      assert.equal(store.opened, null);
      assert.equal(memberCounts[store.id], 0);
      assert.ok(store.actuals.every(value => value === null));
    } else {
      assert.ok(store.opened, store.name);
      assert.ok(memberCounts[store.id] > 0, store.name);
    }
  }
});
