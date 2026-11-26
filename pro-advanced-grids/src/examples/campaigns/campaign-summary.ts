import type { Campaign } from './campaign-fixtures';

/** Recompute the visible campaign totals using only comparable prior periods. */
export function summarizeCampaigns(rows: readonly Campaign[]) {
  const sum = (get: (row: Campaign) => number) => rows.reduce((total, row) => total + get(row), 0);
  const spend = sum((row) => row.spend), budget = sum((row) => row.budget);
  const impressions = sum((row) => row.impressions), clicks = sum((row) => row.clicks);
  const conversions = sum((row) => row.conversions), revenue = sum((row) => row.revenue);
  const comparable = rows.filter((row) => row.previousConversions > 0);
  const previousConversions = comparable.reduce((total, row) => total + row.previousConversions, 0);
  const currentConversions = comparable.reduce((total, row) => total + row.conversions, 0);
  const previousSpend = comparable.reduce((total, row) => total + row.previousSpend, 0);
  const currentSpend = comparable.reduce((total, row) => total + row.spend, 0);
  const previousCpa = previousConversions ? previousSpend / previousConversions : 0;
  const currentCpa = currentConversions ? currentSpend / currentConversions : 0;
  return {
    spend, budget, impressions, clicks, conversions, revenue,
    live: rows.filter((row) => row.status === 'Live').length,
    below: rows.filter((row) => row.spend > 0 && row.revenue / row.spend < row.target).length,
    target: spend ? sum((row) => row.target * row.spend) / spend : 0,
    conversionChange: previousConversions ? (currentConversions / previousConversions - 1) * 100 : null,
    cpaChange: previousCpa && currentConversions ? (currentCpa / previousCpa - 1) * 100 : null,
  };
}
