import assert from 'node:assert/strict';
import { test } from 'node:test';
import { campaignWeeks, changePercent, safeRatio } from './campaign-detail-model.ts';
import { createCampaigns } from './campaign-fixtures.ts';

test('generated daily spend produces the five displayed campaign weeks', () => {
  const daily = createCampaigns().find(campaign => campaign.id === 'campaign-008');
  const weeks = campaignWeeks(daily.dailySpend, []);
  assert.equal(weeks.length, 5);
  assert.equal(weeks.reduce((sum, item) => sum + item.spend, 0), daily.spend);
  assert.ok(new Set(weeks.map(item => item.spend)).size > 1);
  assert.equal(daily.activeFrom, 0); assert.equal(daily.activeTo, 29);
  assert.equal(changePercent(5, 0), null); assert.equal(safeRatio(5, 0), null);
});

test('paid subscriptions never exceed trial starts in the acquisition fixture', () => {
  const campaigns = createCampaigns();
  assert.ok(campaigns.some(campaign => campaign.trialStarts > campaign.conversions));
  assert.ok(campaigns.every(campaign => Number.isInteger(campaign.trialStarts) && campaign.trialStarts >= campaign.conversions));
  assert.ok(campaigns.every(campaign => campaign.trialStarts <= campaign.clicks));
});
