import type { ProductWeek } from './product-guardrails';

/** Estimate demand from gross sales at list price; this is not a purchase order. */
export function replenishmentEstimate(onHand: number, listPrice: number, weeks: readonly ProductWeek[]) {
  if (!Number.isFinite(onHand) || onHand < 0 || !Number.isFinite(listPrice) || listPrice <= 0) return null;
  const recent = weeks.slice(-4);
  if (recent.length < 4 || recent.some(week => !Number.isFinite(week[1]) || week[1] < 0)) return null;
  const averageUnits = recent.reduce((sum, week) => sum + week[1] / listPrice, 0) / recent.length;
  if (averageUnits <= 0) return null;
  const prior = weeks.slice(-8, -4);
  const priorAverage = prior.length === 4 && prior.every(week => Number.isFinite(week[1]) && week[1] >= 0)
    ? prior.reduce((sum, week) => sum + week[1] / listPrice, 0) / prior.length
    : null;
  return {
    averageUnits,
    demandChange: priorAverage !== null && priorAverage > 0 ? averageUnits / priorAverage - 1 : null,
    cover: onHand / averageUnits,
    suggestedUnits: Math.max(0, Math.ceil(8 * averageUnits - onHand)),
  };
}

export function estimatedWeeksOfCover(onHand: number, listPrice: number, weeks: readonly ProductWeek[]): number | null {
  return replenishmentEstimate(onHand, listPrice, weeks)?.cover ?? null;
}
