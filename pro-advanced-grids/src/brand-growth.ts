/** Portfolio growth uses only brands with a comparable prior-year period. */
export function comparableGrowth(
  brands: readonly { sales: number; change: number; isNew: boolean }[],
): number {
  const comparable = brands.filter(
    (brand) => brand.sales > 0 && !brand.isNew && brand.change > -100,
  );
  const current = comparable.reduce((sum, brand) => sum + brand.sales, 0);
  const prior = comparable.reduce(
    (sum, brand) => sum + brand.sales / (1 + brand.change / 100),
    0,
  );
  return prior ? (current / prior - 1) * 100 : 0;
}
