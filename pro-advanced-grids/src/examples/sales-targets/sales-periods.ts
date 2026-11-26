/** Returns null when a store has no target for the requested period. */
export const attainment = (actual: number, target: number) =>
  target > 0 ? (actual / target) * 100 : null;

/** Aggregate a closed month, its rolling three months and fiscal year to date. */
export function periods(
  sales: number[],
  monthlyTarget: number[],
  month: number,
) {
  const sumRange = (values: number[], from: number) =>
    values.slice(from, month + 1).reduce((sum, value) => sum + value, 0);
  const read = (from: number) => {
    const actual = sumRange(sales, from);
    const target = sumRange(monthlyTarget, from);
    return {
      actual,
      variance: actual - target,
      ratio: attainment(actual, target),
    };
  };
  const current = read(month),
    lastThree = read(Math.max(0, month - 2)),
    year = read(0);
  return {
    actual0: current.actual,
    variance0: current.variance,
    ratio0: current.ratio,
    actual1: lastThree.actual,
    variance1: lastThree.variance,
    ratio1: lastThree.ratio,
    actual2: year.actual,
    variance2: year.variance,
    ratio2: year.ratio,
  };
}
