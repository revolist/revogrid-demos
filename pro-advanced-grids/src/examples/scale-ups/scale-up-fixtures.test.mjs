import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { referenceCompanies } from './scale-up-fixtures.ts';
import { scaleUpRawCompanies } from './scale-up-raw-fixtures.ts';

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

test('each province has at least two companies in the shortlist view', () => {
  for (const province of new Set(referenceCompanies.map(company => company.province))) {
    const names = new Set(referenceCompanies.filter(company => company.province === province).map(company => company.label));
    const visible = scaleUpRawCompanies.filter(company => names.has(company.name) && ['Shortlisted', 'In Talks'].includes(company.stage));
    assert.ok(visible.length >= 2, province);
  }
});

test('company details and screening agree across fixtures', () => {
  const display = { yes: 'Yes', no: 'No', na: 'N/A' };
  for (const company of scaleUpRawCompanies) {
    const summary = referenceCompanies.find(row => row.label === company.name);
    assert.ok(summary, company.name);
    assert.equal(summary.sector, `${company.focus}, ${company.city}`);
    assert.deepEqual(summary.screening, {
      Founder: display[company.checks.founder],
      Exports: display[company.checks.exports],
      Raising: display[company.checks.raising],
    });
  }
});
