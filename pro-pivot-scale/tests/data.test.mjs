import test from 'node:test';
import assert from 'node:assert/strict';
import { generateScaleRows, makeScaleRow } from '../src/data.ts';

test('fixed workload sizes have stable prefix and unique IDs', () => {
  const small = generateScaleRows(10_000);
  const larger = generateScaleRows(100_000);
  assert.equal(small.length, 10_000);
  assert.equal(larger.length, 100_000);
  assert.deepEqual(larger.slice(0, small.length), small);
  assert.equal(new Set(larger.map((row) => row.id)).size, larger.length);
  assert.deepEqual(makeScaleRow(0), small[0]);
});

test('synthetic sales contains seasonal and negative-profit cases', () => {
  const rows = generateScaleRows(10_000);
  assert.ok(rows.some((row) => row.profit < 0));
  assert.ok(rows.every((row) => row.year === 2024 || row.year === 2025));
  assert.equal(rows.filter((row) => row.quarter === 'Q4').length, 2_500);
  assert.equal(Math.round(rows.reduce((total, row) => total + row.sales, 0) * 100), 607_948_994);
});

test('invalid workload sizes fail explicitly', () => {
  assert.throws(() => generateScaleRows(1_000_001), RangeError);
  assert.throws(() => makeScaleRow(-1), RangeError);
});
