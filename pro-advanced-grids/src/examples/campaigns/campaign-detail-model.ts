/** Five reporting weeks covering the fixed 30-day reporting window. */
export function campaignWeeks(spend: readonly number[], conversions: readonly number[]) {
  return Array.from({ length: 5 }, (_, index) => {
    const start = index * 7, end = Math.min(30, start + 7);
    return { start, end: end - 1, spend: spend.slice(start, end).reduce((a, b) => a + b, 0), conversions: conversions.slice(start, end).reduce((a, b) => a + b, 0) };
  });
}
export const changePercent = (value: number, previous: number) => previous > 0 ? (value / previous - 1) * 100 : null;
export const safeRatio = (numerator: number, denominator: number) => denominator > 0 ? numerator / denominator : null;
