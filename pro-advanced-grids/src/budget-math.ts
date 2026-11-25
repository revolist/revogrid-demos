/** Compute the budget and forecast for a line with an optional fixed addition. */
export function budgetLineTotals(row: {
  units: number;
  rate: number;
  baseFee: number;
  actual: number;
  remaining: number;
}) {
  const budget = row.units * row.rate + row.baseFee;
  const forecast = row.actual + row.remaining;
  return {
    budget,
    actual: row.actual,
    forecast,
    delta: budget - forecast,
    spent: budget > 0 && row.actual > 0 ? (row.actual / budget) * 100 : null,
  };
}
