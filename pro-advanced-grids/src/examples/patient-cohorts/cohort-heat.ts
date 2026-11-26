/** Presentation tiers for a percentage in the cohort outcome grid. */
export function cohortHeatTier(outcome: string, percent: number): string {
  if (outcome === 'hold') {
    if (percent >= 14) return 'risk-high';
    if (percent >= 10) return 'risk-watch';
    if (percent >= 8) return 'risk-caution';
    return 'risk-low';
  }
  if (percent >= 70) return 'high';
  if (percent >= 55) return 'medium';
  if (percent >= 35) return 'low';
  return 'very-low';
}
