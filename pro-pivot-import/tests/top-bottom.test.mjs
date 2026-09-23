import assert from 'node:assert/strict';
import test from 'node:test';
import { rankImportedRows } from '../src/top-bottom.ts';

const rows = [
  { Region: 'North', Sales: 10, Quarter: 'Q1' },
  { Region: 'South', Sales: 30, Quarter: 'Q1' },
  { Region: 'North', Sales: 15, Quarter: 'Q2' },
  { Region: 'East', Sales: 20, Quarter: 'Q1' },
];
const sum = data => data.reduce((total, row) => total + row.Sales, 0);

test('Top N selects exactly N members and Other preserves the source total', () => {
  const ranked = rankImportedRows(rows, 'Region', 'Sales', { direction: 'top', count: 1, includeOther: true });
  assert.deepEqual(ranked.rows.map(row => row.Region), ['South', 'Other', 'Other', 'Other']);
  assert.equal(ranked.keptMembers, 1);
  assert.equal(ranked.remainderMembers, 2);
  assert.equal(sum(ranked.rows), 75);
  assert.equal(sum(rows), 75);
});

test('Bottom N excludes the remainder when Other is off, including it in no totals', () => {
  const ranked = rankImportedRows(rows, 'Region', 'Sales', { direction: 'bottom', count: 1, includeOther: false });
  assert.deepEqual(ranked.rows.map(row => row.Region), ['East']);
  assert.equal(sum(ranked.rows), 20);
  assert.equal(ranked.remainderMembers, 2);
});

test('ties use first appearance, and Other gets a distinct label', () => {
  const source = [
    { Region: 'A', Sales: 10 },
    { Region: 'Other', Sales: 10 },
    { Region: 'B', Sales: 5 },
  ];
  const ranked = rankImportedRows(source, 'Region', 'Sales', { direction: 'top', count: 1, includeOther: true });
  assert.equal(ranked.rows[0].Region, 'A');
  assert.equal(ranked.otherLabel, 'Other (ranked remainder 2)');
  assert.equal(sum(ranked.rows), 25);
  assert.throws(() => rankImportedRows(rows, 'Region', 'Sales', { direction: 'top', count: 0, includeOther: true }), /positive whole/);
});
