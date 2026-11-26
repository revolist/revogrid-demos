export interface ScoreLine {
  value: number | null;
  portfolio: number | null;
  step: number;
  lower?: boolean;
}

/** Mean signed distance from the portfolio in each comparable metric's units. */
export function scoreSection(lines: readonly ScoreLine[]): number | null {
  const comparable = lines.filter((line) => line.value !== null && line.portfolio !== null && line.step > 0);
  if (!comparable.length) return null;
  return comparable.reduce((sum, line) => sum + ((line.value! - line.portfolio!) / line.step) * (line.lower ? -1 : 1), 0) / comparable.length;
}
