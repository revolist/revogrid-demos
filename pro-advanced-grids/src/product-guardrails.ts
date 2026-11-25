export interface ProductGuardrails {
  weeklySalesTarget: number;
  marginFloor: number;
  discountCeiling: number;
}

/** Weekly net, gross, discount, contribution, full-price baseline, and promotion key. */
export type ProductWeek = [number, number, number, number, number, string | null];
export type GuardrailMark = 'met' | 'near' | 'miss';

function scoreBetween(value: number, minimum: number, target: number, excellent: number) {
  if (value <= minimum) return 0;
  if (value >= excellent) return 100;
  return value < target
    ? ((value - minimum) / (target - minimum)) * 70
    : 70 + ((value - target) / (excellent - target)) * 30;
}

/** Derive the period health from the same weekly data used by the grid and calendar. */
export function productPeriodHealth(
  weeks: readonly ProductWeek[],
  markdown: number,
  guardrails: ProductGuardrails,
  override: { margin?: number; discount?: number } = {},
) {
  const sum = (index: 0 | 1 | 2 | 3 | 4) => weeks.reduce((total, week) => total + week[index], 0);
  const revenue = sum(0);
  const gross = sum(1);
  const profit = override.margin === undefined ? sum(3) : revenue * override.margin / 100;
  const margin = revenue > 0 ? profit / revenue : 0;
  const discount = override.discount === undefined ? (gross > 0 ? sum(2) / gross : 0) : override.discount / 100;
  const target = guardrails.weeklySalesTarget * weeks.length;
  const baseline = sum(4) * (1 - markdown);
  const rounded = (value: number) => Math.round(value * 1000) / 1000;
  const passes = [
    revenue >= target && baseline >= target,
    rounded(margin) >= guardrails.marginFloor / 100 && profit >= 0,
    rounded(discount) < guardrails.discountCeiling / 100,
  ];
  if (revenue <= 0) return { revenue, profit, margin, discount, passes, marks: [] as GuardrailMark[], scores: [] as number[], status: 'No Sales', score: 0 };
  const floor = guardrails.marginFloor / 100;
  const ceiling = guardrails.discountCeiling / 100;
  const scores = [
    scoreBetween(target > 0 ? revenue / target : 0, .4, 1, 1.15),
    scoreBetween(margin, 0, floor, floor + .1),
    scoreBetween(-discount, -(ceiling + .15), -ceiling, -(ceiling - .1)),
  ];
  const average = scores.reduce((a, b) => a + b, 0) / scores.length;
  const severeMiss = scores.some((score, index) => !passes[index] && score < 55);
  const score = Math.round(profit < 0 ? Math.min(average, 40) : severeMiss ? Math.min(average, 79) : average);
  const marks: GuardrailMark[] = scores.map((value, index) => passes[index] ? 'met' : value >= 55 ? 'near' : 'miss');
  return { revenue, profit, margin, discount, passes, marks, scores, status: score >= 80 ? 'On Track' : score >= 55 ? 'At Risk' : 'Off Track', score };
}
