export interface BudgetPlan { hours: number; rate: number; qty: number; unit: string; price: number; fixed: number; }
export interface BudgetParts { hours: number; qty: number; fixed: number; }
export const planAmount = (plan: BudgetPlan) => plan.hours * plan.rate + plan.qty * plan.price + plan.fixed;
export const partsAmount = (parts: BudgetParts, plan: BudgetPlan) => parts.hours * plan.rate + parts.qty * plan.price + parts.fixed;
/** Project a mixed plan into the existing grid's primary basis plus additions. */
export function primaryBasis(plan: BudgetPlan) {
  if (plan.hours || plan.rate) return { unit: 'Hours', units: plan.hours, rate: plan.rate, baseFee: plan.qty * plan.price + plan.fixed };
  if (plan.qty || plan.price) return { unit: 'Licenses', units: plan.qty, rate: plan.price, baseFee: plan.fixed };
  return { unit: 'Fixed fee', units: 1, rate: plan.fixed, baseFee: 0 };
}
