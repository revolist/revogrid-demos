import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { referenceCompanies } from './scale-up-fixtures.ts';

test('reference companies retain complete province and screening data', () => {
  assert.equal(referenceCompanies.length, 42);
  assert.equal(new Set(referenceCompanies.map(({ label }) => label)).size, 42);
  const south = referenceCompanies.filter(({ province }) => province === 'South Holland');
  assert.equal(south.length, 5);
  assert.ok(south.some(({ label }) => label === 'Beacon Freight'));
  assert.equal(south.reduce((sum, row) => sum + row.staff, 0), 1265);
  for (const row of referenceCompanies) {
    assert.equal(row.staffHistory.length, 8);
    assert.ok(Object.values(row.screening).every((answer) => ['Yes', 'No', 'N/A'].includes(answer)));
  }
});
