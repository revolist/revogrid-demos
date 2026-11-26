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
const channelIds = ['google', 'youtube', 'apple', 'reddit', 'x', 'spotify'] as const;
type Channel = typeof channelIds[number];
const channelLabel: Record<Channel, string> = { google: 'Microsoft Ads', youtube: 'TikTok', apple: 'LinkedIn Ads', reddit: 'Meta Ads', x: 'Pinterest', spotify: 'Twitch' };
const audiences: Record<Channel, readonly string[]> = {
  google: ['Prospecting', 'Retargeting', 'Brand Search', 'Winback'],
  youtube: ['Prospecting', 'Retargeting', 'Lookalike', 'Winback'],
  apple: ['Brand Search', 'Prospecting'], reddit: ['Prospecting', 'Retargeting', 'Lookalike'],
  x: ['Prospecting', 'Retargeting', 'Lookalike', 'Winback'], spotify: ['Prospecting', 'Lookalike'],
};
const channelRates: Record<Channel, { cpm: number; ctr: number; cvr: number; aov: number }> = {
  google: { cpm: 42, ctr: .034, cvr: .042, aov: 136 }, youtube: { cpm: 11.5, ctr: .0072, cvr: .024, aov: 149 },
  apple: { cpm: 30, ctr: .06, cvr: .015, aov: 115 }, reddit: { cpm: 4.6, ctr: .0052, cvr: .018, aov: 109 },
  x: { cpm: 5.8, ctr: .0071, cvr: .014, aov: 104 }, spotify: { cpm: 11, ctr: .0045, cvr: .02, aov: 136 },
};
const audienceRates: Record<string, { cpm: number; ctr: number; cvr: number; target: number; buyers: number }> = {
  Prospecting: { cpm: 1, ctr: 1, cvr: 1, target: 2.5, buyers: .78 },
  Retargeting: { cpm: 1.3, ctr: 1.3, cvr: 2.4, target: 6, buyers: .22 },
  'Brand Search': { cpm: 1, ctr: 1.8, cvr: 1.4, target: 8, buyers: .48 },
  Lookalike: { cpm: 1.1, ctr: 1.05, cvr: 1.1, target: 3, buyers: .7 },
  Winback: { cpm: 1.2, ctr: 1.2, cvr: 1.6, target: 4.5, buyers: .12 },
};
const markets = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'ES', 'JP', 'BR', 'MX'];
const owners = ['Sana Qureshi', 'Kenji Tan', 'Priya Patel', 'Omar Haddad', 'Sofia Romero', 'Elijah Morgan'];
const products = ['Granite Trail Boot', 'Waypoint Pack', 'Skyward Tent', 'Tidewater Rain Shell', 'Evergreen Fleece', 'Solstice Bottle', 'Atlas Duffel', 'Hearth Stove', 'Boreal Gloves', 'Cove Hammock', 'Bluefern Rain Kit', 'Ridgeline Weather Jacket'];
const generalSuffixes = ['Autumn Field Notes', 'New Collection', 'All Season', 'Winter Preview', 'Trail Bundle', 'Community Stories', 'Weekend Guide', 'Member Event'];
const searchSuffixes = ['Brand Exact', 'Brand Phrase', 'Evergreen'];
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    let value = state = (state + 0x6d2b79f5) >>> 0;
    value = Math.imul(value ^ value >>> 15, 1 | value);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 0x100000000;
  };
}
const pick = <T>(next: () => number, values: readonly T[]) => values[Math.floor(next() * values.length)];
const between = (next: () => number, min: number, max: number) => min + next() * (max - min);
function dailyConversions(seed: number, activeFrom: number, activeTo: number, conversions: number, previous: number) {
  const next = random(seed + 11);
  const phase = Math.floor(7 * next());
  const middle = (activeFrom + activeTo) / 2;
  const growth = Math.max(-.9, Math.min(.9, 1.4 * (previous ? (conversions - previous) / previous : 0)));
  const weights = Array.from({ length: 30 }, (_, day) => day < activeFrom || day > activeTo ? 0 :
    Math.max(0, Math.min(1, (day - activeFrom + 1) / 5) * (1 + growth * (day - middle) / 30) * (1 + .14 * Math.sin((day + phase) / 7 * Math.PI * 2)) * (.72 + .56 * next())));
  return distributeConversions(weights, conversions);
}
/** Preserve a trend's shape while ensuring its daily values add to the total. */
export function distributeConversions(weights: readonly number[], conversions: number) {
  const values = weights.some((value) => value > 0) ? weights : Array.from({ length: 30 }, () => 1);
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!conversions) return values.map(() => 0);
  let cumulative = 0, previousTotal = 0;
  return values.map((weight) => {
    cumulative += weight / total * conversions;
    const nextTotal = Math.round(cumulative);
    const result = nextTotal - previousTotal;
    previousTotal = nextTotal;
    return result;
  });
}
export function createCampaigns(): Campaign[] {
  return Array.from({ length: 30 }, (_, index) => {
    const seed = 20978 + 977 * index;
    const next = random(seed);
    const channel = pick(next, channelIds);
    const audience = pick(next, audiences[channel]);
    const state = next();
    const status = state < .52 ? 'Live' : state < .64 ? 'Learning' : state < .74 ? 'Limited' : state < .9 ? 'Paused' : 'Ended';
    const market = pick(next, markets), owner = pick(next, owners);
    const suffix = pick(next, audience === 'Brand Search' ? searchSuffixes : generalSuffixes);
    const label = `${pick(next, products)} ${suffix}`;
    let activeFrom = 0, activeTo = 29;
    if (status === 'Learning') activeFrom = Math.round(between(next, 12, 25));
    if (status === 'Paused') activeTo = Math.round(between(next, 9, 24));
    if (status === 'Ended') activeTo = Math.round(between(next, 10, 22));
    const duration = (activeTo - activeFrom + 1) / 30;
    const budget = 500 * Math.round(Math.exp(between(next, Math.log(2800), Math.log(74000))) / 500);
    const pacing = status === 'Limited' ? between(next, .97, 1) : status === 'Ended' ? between(next, .94, 1) : status === 'Live' ? between(next, .72, 1.03) : duration * between(next, .85, 1);
    const spend = Math.round(budget * pacing);
    const channelRate = channelRates[channel], audienceRate = audienceRates[audience];
    const velocity = status === 'Limited' ? between(next, 1.05, 1.6) : between(next, .62, 1.55);
    const impressions = Math.round(spend / (channelRate.cpm * audienceRate.cpm) * 1000);
    const clicks = Math.round(impressions * channelRate.ctr * audienceRate.ctr * between(next, .8, 1.2));
    const conversions = Math.round(clicks * channelRate.cvr * audienceRate.cvr * velocity);
    const revenue = Math.round(conversions * channelRate.aov * between(next, .86, 1.14));
    const change = between(next, -.38, .46);
    const previousConversions = status === 'Learning' ? 0 : Math.round(conversions / (1 + change));
    const previousSpend = status === 'Learning' ? 0 : Math.round(spend * between(next, .82, 1.18));
    const buyers = Math.min(.96, Math.max(.04, audienceRate.buyers + between(next, -.14, .14))) * 100;
    const id = `campaign-${String(index + 1).padStart(3, '0')}`;
    const dailySpend = dailyConversions(seed + 521, activeFrom, activeTo, spend, previousSpend);
    return { id, dailySpend, activeFrom, activeTo, label, channel: channelLabel[channel], audience, status, market, owner, budget, spend, impressions, clicks, conversions, previousConversions, previousSpend, revenue, buyers, target: audienceRate.target, trend: dailyConversions(seed, activeFrom, activeTo, conversions, previousConversions) };
  });
}
