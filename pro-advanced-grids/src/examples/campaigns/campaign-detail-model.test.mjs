import assert from 'node:assert/strict';
import { test } from 'node:test';
import { campaignWeeks, changePercent, safeRatio } from './campaign-detail-model.ts';
import { createCampaigns } from './campaign-fixtures.ts';

test('generated daily spend produces the five displayed campaign weeks', () => {
  const daily = createCampaigns().find(campaign => campaign.id === 'campaign-008');
  const weeks = campaignWeeks(daily.dailySpend, []);
  assert.deepEqual(weeks.map(item => item.spend), [9454, 13632, 14404, 13583, 4360]);
  assert.equal(weeks.reduce((sum, item) => sum + item.spend, 0), 55433);
  assert.equal(daily.activeFrom, 0); assert.equal(daily.activeTo, 29);
  assert.equal(changePercent(5, 0), null); assert.equal(safeRatio(5, 0), null);
});
