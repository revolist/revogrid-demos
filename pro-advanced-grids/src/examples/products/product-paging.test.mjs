import assert from 'node:assert/strict';
import test from 'node:test';
import { productPage } from './product-paging.ts';

test('sorts the full catalog before paging and restores catalog order', () => {
  const rows = [{ label: 'A', revenue: 4, healthScore: 20 }, { label: 'B', revenue: 1, healthScore: 80 }, { label: 'C', revenue: 3, healthScore: 10 }, { label: 'D', revenue: 2, healthScore: 50 }];
  assert.deepEqual(productPage(rows, 0, 2, { revenue: 'desc' }).map((row) => row.label), ['A', 'C']);
  assert.deepEqual(productPage(rows, 2, 2, { revenue: 'desc' }).map((row) => row.label), ['D', 'B']);
  assert.deepEqual(productPage(rows, 0, 4, { status: 'asc' }).map((row) => row.label), ['C', 'A', 'D', 'B']);
  assert.deepEqual(productPage(rows, 0, 4).map((row) => row.label), ['A', 'B', 'C', 'D']);
});
