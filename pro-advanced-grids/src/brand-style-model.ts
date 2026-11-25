export interface BrandStyle {
  id: string;
  name: string;
  category: string;
  net: number;
  cogs: number;
  markdown: number;
  units: number;
  returned: number;
  orders: number;
}

/** Contribution after the per-order and per-return costs in the reference. */
export const styleProfit = (style: BrandStyle) =>
  style.net - style.cogs - style.orders * 9.4 - style.returned * 6.8;

/** Choose three readable positive axis steps while retaining headroom. */
export function profitAxisMaximum(styles: readonly BrandStyle[]) {
  const maximum = Math.max(0, ...styles.map(styleProfit));
  if (!maximum) return 1;
  const raw = maximum / 3;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 1.5, 2, 2.5, 5, 10].find(value => value * power >= raw)! * power;
  return step * 3;
}
