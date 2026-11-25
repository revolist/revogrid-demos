const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

/** Position a revenue benchmark on the same scale as the displayed rows. */
export function revenuePosition(value: number, maximum: number) {
  return maximum > 0 ? clamp((value / maximum) * 100, 0, 100) : 0;
}

/** Margins use a centered zero and a displayed range of -25% to +25%. */
export function marginPosition(value: number) {
  return clamp(50 + value * 2, 0, 100);
}
