/** Returns null when a store has no target for the requested period. */
export const attainment = (actual: number, target: number) =>
  target > 0 ? (actual / target) * 100 : null;

/** Compare only store-months that have both a sales reading and a positive plan. */
export function comparablePeriods(
  stores: { sales: number[]; targets: number[]; missingSales: boolean[] }[],
  month: number,
) {
  const read = (from: number) => {
    let actual = 0, comparableActual = 0, target = 0, hasActual = false;
    for (const store of stores) {
      for (let index = from; index <= month; index++) {
        if (store.missingSales[index]) continue;
        hasActual = true;
        actual += store.sales[index];
        if (store.targets[index] > 0) {
          comparableActual += store.sales[index];
          target += store.targets[index];
        }
      }
    }
    return { actual, hasActual, comparableActual, target, variance: comparableActual - target, ratio: attainment(comparableActual, target) };
  };
  const current = read(month), lastThree = read(Math.max(0, month - 2)), year = read(0);
  return {
    actual0: current.actual, hasActual0: current.hasActual, comparableActual0: current.comparableActual, target0: current.target, variance0: current.variance, ratio0: current.ratio,
    actual1: lastThree.actual, hasActual1: lastThree.hasActual, comparableActual1: lastThree.comparableActual, target1: lastThree.target, variance1: lastThree.variance, ratio1: lastThree.ratio,
    actual2: year.actual, hasActual2: year.hasActual, comparableActual2: year.comparableActual, target2: year.target, variance2: year.variance, ratio2: year.ratio,
  };
}

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
