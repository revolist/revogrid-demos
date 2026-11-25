import { partsAmount, planAmount, type BudgetParts, type BudgetPlan } from './budget-components.ts';

export type BudgetDecision = 'Cover' | 'Adjust' | 'Hold';
export interface ComponentDecisionLine { plan: BudgetPlan; billedParts: BudgetParts; leftParts: BudgetParts; lineStatus: string; }
/** Preview component-level decisions without mutating billed history or the input. */
export function previewDecision(line: ComponentDecisionLine, decision: BudgetDecision, reserve: number, draft: BudgetParts) {
  const beforeBudget = planAmount(line.plan), actual = partsAmount(line.billedParts, line.plan);
  const forecast = actual + partsAmount(line.leftParts, line.plan), difference = forecast - beforeBudget;
  const plan = { ...line.plan }, left = { ...line.leftParts };
  let nextReserve = reserve;
  if (decision === 'Cover') {
    if (difference === 0) return { error: 'There is no budget difference to move.' } as const;
    if (difference > reserve) return { error: 'The overrun exceeds the remaining contingency.' } as const;
    plan.hours = line.billedParts.hours + left.hours;
    plan.qty = line.billedParts.qty + left.qty;
    plan.fixed = line.billedParts.fixed + left.fixed;
    nextReserve -= difference;
  } else if (decision === 'Hold') {
    if (line.lineStatus === 'done' || difference <= 0) return { error: 'There is no overrun to hold.' } as const;
    left.hours = Math.max(0, plan.hours - line.billedParts.hours);
    left.qty = Math.max(0, plan.qty - line.billedParts.qty);
    left.fixed = Math.max(0, plan.fixed - line.billedParts.fixed);
  } else {
    if (line.lineStatus === 'done') return { error: 'A completed line cannot be adjusted.' } as const;
    if (Object.values(draft).some(value => !Number.isFinite(value) || value < 0)) return { error: 'Enter a non-negative amount left.' } as const;
    Object.assign(left, draft);
  }
  const budget = planAmount(plan), remaining = partsAmount(left, plan), nextForecast = actual + remaining;
  return { plan, left, reserve: nextReserve, totals: { budget, actual, remaining, forecast: nextForecast, delta: budget - nextForecast }, difference } as const;
}
export function availableDecisions(line: ComponentDecisionLine) {
  const difference = partsAmount(line.billedParts, line.plan) + partsAmount(line.leftParts, line.plan) - planAmount(line.plan);
  return { Cover: difference !== 0, Adjust: line.lineStatus !== 'done', Hold: line.lineStatus !== 'done' && difference > 0, difference };
}
