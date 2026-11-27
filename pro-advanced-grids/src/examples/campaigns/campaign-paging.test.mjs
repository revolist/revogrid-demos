import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createCampaigns } from './campaign-fixtures.ts';
import { campaignPage } from './campaign-paging.ts';

test('campaign paging sorts all filtered records before slicing', () => {
  const rows = createCampaigns();
  const ascending = campaignPage(rows, 0, 10, { spend: 'asc' });
  const second = campaignPage(rows, 10, 10, { spend: 'asc' });
  assert.equal(ascending[0].spend, Math.min(...rows.map((row) => row.spend)));
  assert.ok(ascending.at(-1).spend <= second[0].spend);
  assert.equal(campaignPage(rows, 0, 10)[0].spend, Math.max(...rows.map((row) => row.spend)));
});
test('missing values remain last in either direction', () => {
  const rows = [{ spend: 1, cpa: null }, { spend: 2, cpa: 10 }, { spend: 3, cpa: 5 }];
  assert.deepEqual(campaignPage(rows, 0, 3, { cpa: 'desc' }).map((row) => row.spend), [2, 3, 1]);
  assert.deepEqual(campaignPage(rows, 0, 3, { cpa: 'asc' }).map((row) => row.spend), [3, 2, 1]);
});
