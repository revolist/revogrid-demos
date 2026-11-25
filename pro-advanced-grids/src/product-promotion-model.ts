import type { ProductWeek } from './product-guardrails';
export interface PromotionRule { key: string; depth: number; lift: number; }
export const promotionNames: Record<string, string> = {
  explore: 'Explore Together', bundle: 'Adventure Bundle', weekend: 'Weekend Special', clearance: 'Season Closeout', thaw: 'Spring Thaw', longday: 'Longest Day Sale', flash: 'Midsummer Flash Sale', basecamp: 'Basecamp Days', swap: 'Pack Swap Week', fit: 'Trail Fit Event', lake: 'Lake Days', storm: 'Storm Shell Week', sleep: 'Sleep System Bundle', crag: 'Crag Days', longtrail: 'Long Trail Week', tailgate: 'Tailgate Week', lastlight: 'Last Light Sale', rain: 'Rain Ready Event', ftd: 'Fall Trail Days', members: 'Community Weekend', closeout: 'Summer Closeout', finalrun: 'Final Run Closeout', coldsnap: 'Cold Snap Sale', gift: 'Gift Guide Week', yearend: 'Year End Clearout', snowdays: 'Snow Days', winterclub: 'Members Winter Week', preview: 'Spring Preview',
};
/** Attribute a promotion's contribution against normal-price sales and the next week's pull-forward. */
export function promotionReport(weeks: readonly ProductWeek[], period: number, markdown: number, landed: number, serve: number, rules: readonly PromotionRule[] = []) {
  const from = Math.max(0, weeks.length - period); const map = new Map<string, { key: string; start: number; end: number; weeks: number; net: number; gross: number; discount: number; profit: number; payback: number; lift: number; subsidy: number }>();
  const normalMargin = (1 - markdown) * (1 - serve) - landed;
  for (let index = from; index < weeks.length; index++) {
    const [net, gross, discount, profit, usual, key] = weeks[index];
    if (key) {
      const event = map.get(key) ?? { key, start: index, end: index, weeks: 0, net: 0, gross: 0, discount: 0, profit: 0, payback: 0, lift: 0, subsidy: 0 };
      event.end = index; event.weeks++; event.net += net; event.gross += gross; event.discount += discount; event.profit += profit; event.payback += profit - usual * normalMargin; const depth = gross ? discount / gross : 0; const lift = rules.find(rule => rule.key === key)?.lift ?? 0; event.lift += usual * lift * ((1 - depth) * (1 - serve) - landed); event.subsidy -= usual * (depth - markdown) * (1 - serve); map.set(key, event);
    } else if (index > 0 && weeks[index - 1][5]) {
      const previous = map.get(weeks[index - 1][5]!); if (previous) previous.payback += profit - usual * normalMargin;
    }
  }
  return [...map.values()].sort((a, b) => a.start - b.start);
}
export function weeklyContribution(week: ProductWeek, landed: number, serve: number): ProductWeek {
  return [week[0], week[1], week[2], week[0] * (1 - serve) - week[1] * landed, week[4], week[5]];
}
