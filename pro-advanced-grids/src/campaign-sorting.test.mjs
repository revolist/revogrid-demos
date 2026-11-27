import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createCampaigns } from './campaign-fixtures.ts';
import { compareCampaignCells } from './campaign-sorting.ts';

const sorted = (rows, prop, order) => rows.toSorted((a, b) =>
  compareCampaignCells.call({ order }, prop, a, b) * (order === 'desc' ? -1 : 1));

test('campaign spend sorts numerically across the dataset', () => {
  const rows = createCampaigns();
  assert.equal(sorted(rows, 'spend', 'asc')[0].spend, Math.min(...rows.map(row => row.spend)));
  assert.equal(sorted(rows, 'spend', 'desc')[0].label, 'Boreal Gloves Member Event');
});

test('missing values remain last in either direction', () => {
  const rows = [{ spend: 1, cpa: null }, { spend: 2, cpa: 10 }, { spend: 3, cpa: 5 }];
  assert.deepEqual(sorted(rows, 'cpa', 'desc').map(row => row.spend), [2, 3, 1]);
  assert.deepEqual(sorted(rows, 'cpa', 'asc').map(row => row.spend), [3, 2, 1]);
});

test('trend sorts by the last sample', () => {
  const rows = [{ trend: [1, 20] }, { trend: [2, 10] }];
  assert.deepEqual(sorted(rows, 'trend', 'asc'), [rows[1], rows[0]]);
});
