import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createCampaigns, distributeConversions } from './campaign-fixtures.ts';
import { summarizeCampaigns } from './campaign-summary.ts';

test('campaign sample summarizes distinct generated campaign data', () => {
  const rows = createCampaigns().sort((a, b) => b.spend - a.spend);
  const summary = summarizeCampaigns(rows);
  assert.equal(rows.length, 30);
  assert.equal(rows[0].label, 'Community Plan Member Event');
  assert.equal(rows[0].spend, 48360);
  assert.equal(summary.live, 16);
  assert.equal(summary.spend, 555750);
  assert.equal(summary.impressions, 43193000);
  assert.equal(summary.conversions, 26575);
  assert.equal(summary.budget, 779900);
  assert.equal(summary.below, 18);
  assert.equal(summary.target.toFixed(1), '3.8');
  assert.equal((summary.revenue / summary.spend).toFixed(1), '3.8');
});
test('filtered totals and prior comparisons omit campaigns without a prior period', () => {
  const rows = createCampaigns();
  const learning = rows.filter((row) => row.status === 'Learning');
  assert.ok(learning.length);
  assert.equal(summarizeCampaigns(learning).conversionChange, null);
  assert.equal(summarizeCampaigns([]).target, 0);
  for (const row of rows) assert.equal(row.trend.reduce((sum, n) => sum + n, 0), row.conversions);
  assert.equal(distributeConversions([], 17).reduce((sum, n) => sum + n, 0), 17);
});


test('all generated daily spend series match campaign totals', () => {
  const campaigns = createCampaigns();
  assert.equal(new Set(campaigns.map(campaign => campaign.id)).size, campaigns.length);
  assert.deepEqual(new Set(campaigns.map(campaign => campaign.status)), new Set(['Live', 'Limited', 'Learning', 'Paused', 'Ended']));
  for (const campaign of campaigns) {
    assert.equal(campaign.dailySpend.length, 30);
    assert.equal(campaign.dailySpend.reduce((sum, value) => sum + value, 0), campaign.spend);
    assert.equal(campaign.trend.reduce((sum, value) => sum + value, 0), campaign.conversions);
    assert.ok(campaign.dailySpend.every((amount, day) => (day >= campaign.activeFrom && day <= campaign.activeTo) || amount === 0));
    assert.ok(campaign.conversions <= campaign.trialStarts && campaign.trialStarts <= campaign.clicks && campaign.clicks <= campaign.impressions);
  }
});

test('CPA comparison is unavailable when the current period has no conversions', () => {
  const campaign = { ...createCampaigns()[0], previousConversions: 10, previousSpend: 100, conversions: 0, spend: 50 };
  const summary = summarizeCampaigns([campaign]);
  assert.equal(summary.conversionChange, -100);
  assert.equal(summary.cpaChange, null);
});
