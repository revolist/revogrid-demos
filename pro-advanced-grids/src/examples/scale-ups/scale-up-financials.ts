/** Scale-up index calculations use revenue in euros, margins and growth in percent. */
export const percentChange = (current: number | null, previous: number | null) =>
  current != null && previous != null && previous > 0 ? (current / previous - 1) * 100 : null;
const clamp = (value: number) => Math.min(1, Math.max(0, value));
export function scoreComponents(growth: number | null, margin: number | null, revenue: number | null) {
  if (growth == null || margin == null || revenue == null || revenue <= 0) return null;
  return { growth: clamp((growth + 10) / 70) * 50, margin: clamp((margin + 20) / 45) * 30, scale: clamp(Math.log10(revenue / 2_000_000) / 2) * 20 };
}
export function indexScore(growth: number | null, margin: number | null, revenue: number | null) {
  const components = scoreComponents(growth, margin, revenue);
  return components ? Math.round((components.growth + components.margin + components.scale) * 10) / 10 : null;
}
export function averageScore(scores: readonly (number | null | undefined)[]) {
  const valid = scores.filter((score): score is number => score != null && Number.isFinite(score));
  return valid.length ? Math.round(valid.reduce((sum, score) => sum + score, 0) / valid.length * 10) / 10 : null;
}
function quarterDirection(current: number | null, previous: number | null) {
  if (current == null || previous == null || previous <= 0) return null;
  return current > previous * 1.01 ? 1 : current < previous * 0.99 ? -1 : 0;
}
export function quarterDirections(staff: readonly (number | null)[]) {
  return staff.slice(1).map((current, index) => {
    return quarterDirection(current, staff[index]);
  });
}
/** Display the same movement classification used by the quarterly tiles. */
export function quarterDirectionLabel(direction: number | null | undefined) {
  return direction == null ? '' : direction > 0 ? ', hired' : direction < 0 ? ', shrank' : ', held';
}
/** Aggregate adjacent quarters using only companies present in both periods. */
export function aggregateQuarterDirections(series: readonly (readonly (number | null)[])[]) {
  return Array.from({ length: 8 }, (_, index) => {
    const pairs = series.flatMap(values => values[index] != null && values[index + 1] != null ? [[values[index]!, values[index + 1]!]] : []);
    if (!pairs.length) return null;
    const previous = pairs.reduce((sum, pair) => sum + pair[0], 0);
    const current = pairs.reduce((sum, pair) => sum + pair[1], 0);
    return quarterDirection(current, previous);
  });
}
/** Format the reference's EUR-million scale, including its whole-million threshold. */
export function formatScaleRevenue(value: number) {
  const millions = Math.abs(value) / 1_000_000;
  const sign = value < 0 ? '-' : '';
  if (millions >= 999.5) return `${sign}€${(millions / 1000).toFixed(2)}B`;
  if (millions >= 99.95) return `${sign}€${Math.round(millions)}M`;
  return `${sign}€${millions.toFixed(1)}M`;
}
