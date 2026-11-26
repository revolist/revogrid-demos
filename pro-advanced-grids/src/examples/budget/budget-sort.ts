export type BudgetSortKey = 'budget' | 'actual' | 'spent' | 'forecast' | 'delta';
export type BudgetFigures = Record<BudgetSortKey, number | null>;
/** Missing spend stays last in either direction, and equal rows retain their prior order. */
export function compareBudget(a: BudgetFigures, b: BudgetFigures, key: BudgetSortKey, direction: 1 | -1) {
  const left = a[key], right = b[key];
  if (left === null || right === null) return left === right ? 0 : left === null ? 1 : -1;
  return direction * (left - right);
}
