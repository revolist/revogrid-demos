/** Normalized comparison positions for one scorecard metric. */
export interface SpreadInput {
  value: number | null;
  sales: number;
}
export function brandSpread(
  input: readonly SpreadInput[],
  portfolio: number | null,
  lowerIsBetter: boolean,
  diverging: boolean,
) {
  const included = input.flatMap((point, index) => point.value === null ? [] : [{ ...point, value: point.value, index }]);
  if (!included.length) return null;
  const domain = included.map((point) => point.value);
  if (portfolio !== null) domain.push(portfolio);
  if (diverging) domain.push(0);
  let low = Math.min(...domain), high = Math.max(...domain);
  if (high - low < 1e-9) { low -= 1; high += 1; }
  const padding = (high - low) * .06;
  low -= padding; high += padding;
  const position = (value: number) => {
    const normalized = (value - low) / (high - low);
    return lowerIsBetter ? 1 - normalized : normalized;
  };
  const maxSales = Math.max(0, ...included.map((point) => point.sales));
  return {
    points: included.map((point) => ({ index: point.index, position: position(point.value), size: 5 + 8 * (maxSales ? Math.sqrt(Math.max(0, point.sales) / maxSales) : 0) })),
    portfolio: portfolio === null ? null : position(portfolio),
    zero: diverging ? position(0) : null,
  };
}
