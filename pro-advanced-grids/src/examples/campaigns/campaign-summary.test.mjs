import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createCampaigns, distributeConversions } from './campaign-fixtures.ts';
import { summarizeCampaigns } from './campaign-summary.ts';

test('campaign sample summarizes distinct generated campaign data', () => {
  const rows = createCampaigns().sort((a, b) => b.spend - a.spend);
  const summary = summarizeCampaigns(rows);
  assert.equal(rows.length, 30);
  assert.equal(rows[0].label, 'Boreal Gloves Member Event');
  assert.equal(rows[0].spend, 55433);
  assert.equal(summary.live, 17);
  assert.equal(summary.spend, 602677);
  assert.equal(summary.impressions, 41235519);
  assert.equal(summary.conversions, 25689);
  assert.equal(summary.budget, 787500);
  assert.equal(summary.below, 21);
  assert.equal(summary.target.toFixed(1), '4.4');
  assert.equal((summary.revenue / summary.spend).toFixed(1), '5.1');
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
  for (const campaign of createCampaigns()) {
    assert.equal(campaign.dailySpend.length, 30);
    assert.equal(campaign.dailySpend.reduce((sum, value) => sum + value, 0), campaign.spend);
    assert.equal(campaign.trend.reduce((sum, value) => sum + value, 0), campaign.conversions);
    assert.ok(campaign.dailySpend.every((amount, day) => (day >= campaign.activeFrom && day <= campaign.activeTo) || amount === 0));
  }
});

test('CPA comparison is unavailable when the current period has no conversions', () => {
  const campaign = { ...createCampaigns()[0], previousConversions: 10, previousSpend: 100, conversions: 0, spend: 50 };
  const summary = summarizeCampaigns([campaign]);
  assert.equal(summary.conversionChange, -100);
  assert.equal(summary.cpaChange, null);
});
