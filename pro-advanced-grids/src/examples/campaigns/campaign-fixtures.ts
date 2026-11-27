/** Deterministic campaign sample used by the performance demo. */
export interface Campaign {
  id: string;
  label: string;
  channel: string;
  market: string;
  owner: string;
  audience: string;
  status: string;
  spend: number;
  budget: number;
  impressions: number;
  clicks: number;
  conversions: number;
  trialStarts: number;
  previousSpend: number;
  previousConversions: number;
  revenue: number;
  buyers: number;
  target: number;
  trend: number[];
  dailySpend: number[];
  activeFrom: number;
  activeTo: number;
}
// Fictional subscription campaigns authored for this demo. Values are period totals,
// not a transformation of another campaign dataset.
type Sample = readonly [id: number, label: string, channel: string, market: string, audience: string, status: string, spend: number, budget: number, impressions: number, clicks: number, conversions: number, trials: number, revenue: number, target: number, buyers: number];
const samples: readonly Sample[] = [
  [8, 'Community Plan Member Event', 'LinkedIn Ads', 'CA', 'Prospecting', 'Live', 48360, 63000, 2843000, 48200, 2360, 7400, 178000, 3.4, 68],
  [2, 'Creator Plan Community Stories', 'TikTok', 'US', 'Lookalike', 'Live', 42180, 59000, 3610000, 57600, 1920, 6300, 152000, 3.1, 74],
  [3, 'Enterprise Plan Always On', 'Microsoft Ads', 'GB', 'Brand Search', 'Limited', 39420, 40800, 1180000, 41200, 1740, 4650, 225000, 5.1, 32],
  [4, 'Discovery Plan Community Stories', 'Meta Ads', 'AU', 'Prospecting', 'Live', 36750, 52000, 4200000, 52200, 1550, 5320, 108000, 3.5, 81],
  [5, 'Family Plan Community Stories', 'Pinterest', 'US', 'Retargeting', 'Live', 33540, 46000, 2140000, 38900, 2140, 5980, 158000, 4.8, 39],
  [6, 'Learning Plan Launch', 'Twitch', 'CA', 'Lookalike', 'Live', 30120, 42000, 3170000, 34800, 980, 4100, 71400, 3.2, 86],
  [7, 'Enterprise Plan Community Stories', 'LinkedIn Ads', 'DE', 'Prospecting', 'Live', 28480, 38000, 1960000, 27900, 1040, 3650, 97100, 3.8, 61],
  [1, 'Community Plan Brand Exact', 'Microsoft Ads', 'US', 'Brand Search', 'Live', 27160, 34000, 1040000, 32400, 2380, 6270, 192600, 5.6, 35],
  [9, 'Community Plan Evergreen', 'Meta Ads', 'FR', 'Retargeting', 'Live', 25480, 36500, 2310000, 36200, 1870, 5130, 126400, 4.2, 44],
  [10, 'Annual Plan Preview', 'TikTok', 'GB', 'Lookalike', 'Live', 23700, 35000, 2650000, 28700, 810, 3150, 66200, 3.3, 77],
  [11, 'Family Plan Member Event', 'LinkedIn Ads', 'BR', 'Prospecting', 'Live', 22280, 31000, 1340000, 22400, 920, 2910, 72500, 3.6, 72],
  [12, 'Starter Plan Getting Started', 'Microsoft Ads', 'DE', 'Brand Search', 'Live', 20750, 28500, 920000, 25100, 1420, 4380, 103500, 4.5, 51],
  [13, 'Campus Plan Trial Offer', 'Twitch', 'US', 'Prospecting', 'Learning', 18420, 36000, 2120000, 22500, 520, 2300, 36400, 3.0, 89],
  [14, 'Studio Plan Member Stories', 'Meta Ads', 'CA', 'Lookalike', 'Learning', 17280, 29500, 1840000, 21100, 640, 2600, 42300, 3.4, 79],
  [15, 'Wellness Plan Annual Preview', 'Pinterest', 'AU', 'Prospecting', 'Learning', 15840, 27000, 1350000, 17600, 480, 1900, 31900, 3.0, 82],
  [16, 'Team Plan Getting Started', 'LinkedIn Ads', 'FR', 'Retargeting', 'Limited', 14680, 15000, 690000, 13700, 710, 1840, 62400, 3.8, 37],
  [17, 'Campus Plan Community Stories', 'TikTok', 'DE', 'Prospecting', 'Limited', 13950, 14500, 1720000, 19500, 620, 2500, 46200, 3.6, 87],
  [18, 'Creator Plan Trial Offer', 'Meta Ads', 'JP', 'Lookalike', 'Paused', 12870, 24000, 1210000, 14200, 460, 1700, 33800, 3.2, 69],
  [19, 'Starter Plan Member Event', 'Pinterest', 'ES', 'Prospecting', 'Paused', 11720, 21000, 980000, 12300, 380, 1540, 25300, 3.1, 76],
  [20, 'Team Plan Brand Phrase', 'Microsoft Ads', 'CA', 'Brand Search', 'Paused', 10890, 18500, 540000, 11600, 690, 2010, 58700, 4.7, 41],
  [21, 'Wellness Plan Member Stories', 'TikTok', 'FR', 'Lookalike', 'Ended', 9640, 10100, 1070000, 11800, 310, 1320, 20800, 2.9, 80],
  [22, 'Studio Plan Community Stories', 'Meta Ads', 'GB', 'Retargeting', 'Ended', 8820, 9300, 740000, 10700, 560, 1720, 46100, 4.1, 46],
  [23, 'Annual Plan Getting Started', 'LinkedIn Ads', 'US', 'Prospecting', 'Live', 7960, 12000, 530000, 8900, 290, 1120, 24600, 3.7, 71],
  [24, 'Discovery Plan Trial Offer', 'Twitch', 'BR', 'Lookalike', 'Live', 7130, 11500, 880000, 9400, 260, 1090, 17500, 3.0, 84],
  [25, 'Family Plan Evergreen', 'Microsoft Ads', 'ES', 'Brand Search', 'Live', 6480, 9000, 330000, 8400, 480, 1540, 37500, 4.4, 42],
  [26, 'Learning Plan Member Stories', 'Pinterest', 'JP', 'Prospecting', 'Live', 5890, 8500, 610000, 7300, 220, 1020, 15000, 3.0, 78],
  [27, 'Creator Plan Brand Phrase', 'Microsoft Ads', 'AU', 'Brand Search', 'Live', 5120, 7000, 280000, 6900, 390, 1240, 30100, 4.5, 48],
  [28, 'Starter Plan Annual Preview', 'TikTok', 'MX', 'Lookalike', 'Learning', 4370, 10500, 530000, 5800, 140, 730, 8200, 3.1, 90],
  [29, 'Team Plan Member Event', 'LinkedIn Ads', 'CA', 'Prospecting', 'Paused', 3620, 7600, 220000, 4100, 120, 580, 10800, 3.8, 63],
  [30, 'Campus Plan Getting Started', 'Meta Ads', 'US', 'Retargeting', 'Ended', 2850, 3100, 190000, 3500, 175, 620, 14200, 4.0, 40],
];
export const campaignOwners = ['Nadia Wells', 'Tomas Ibarra', 'Leila Farouk', 'Evan Sato', 'Marin Ellis', 'Jules Okoro'];
const dailyProfiles = [
  [3, 4, 5, 6, 5, 2, 1], [2, 3, 4, 5, 6, 4, 2], [5, 4, 3, 4, 5, 3, 2],
];

/** Allocate whole units to daily weights without losing the period total. */
export function distributeConversions(weights: readonly number[], total: number) {
  const values = weights.some(value => value > 0) ? weights : Array.from({ length: 30 }, () => 1);
  const sum = values.reduce((value, weight) => value + weight, 0);
  const shares = values.map((weight, index) => {
    const exact = weight * total / sum;
    return { index, whole: Math.floor(exact), remainder: exact % 1 };
  });
  const remaining = total - shares.reduce((value, share) => value + share.whole, 0);
  for (const share of [...shares].sort((a, b) => b.remainder - a.remainder || a.index - b.index).slice(0, remaining)) share.whole++;
  return shares.map(share => share.whole);
}

/** Each scenario has its own weekday pattern and an explicit active window. */
export function createCampaigns(): Campaign[] {
  return samples.map(([id, label, channel, market, audience, status, spend, budget, impressions, clicks, conversions, trialStarts, revenue, target, buyers], index) => {
    const activeFrom = status === 'Learning' ? 12 + index % 5 : 0;
    const activeTo = status === 'Paused' ? 19 + index % 5 : status === 'Ended' ? 25 + index % 4 : 29;
    const profile = dailyProfiles[index % dailyProfiles.length];
    const weights = Array.from({ length: 30 }, (_, day) => day < activeFrom || day > activeTo ? 0 : profile[(day + index) % profile.length] * (4 + Math.floor(day / 10) + index % 3));
    const spendWeights = Array.from({ length: 30 }, (_, day) => {
      if (day < activeFrom || day > activeTo) return 0;
      const weekday = (day + index) % 7;
      const pacing = [5, 6, 6, 5, 4, 3, 3][weekday];
      return pacing * (day < 10 ? 5 : day < 20 ? 4 : 6);
    });
    const previousConversions = status === 'Learning' ? 0 : Math.round(conversions * (0.82 + (index % 6) * 0.07));
    const previousSpend = status === 'Learning' ? 0 : Math.round(spend * (0.88 + (index % 5) * 0.06));
    return {
      id: `campaign-${String(id).padStart(3, '0')}`, label, channel, market, owner: campaignOwners[index % campaignOwners.length], audience, status,
      spend, budget, impressions, clicks, conversions, trialStarts, previousSpend, previousConversions, revenue, buyers, target,
      activeFrom, activeTo, trend: distributeConversions(weights, conversions), dailySpend: distributeConversions(spendWeights, spend),
    };
  });
}
