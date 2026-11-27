/** Shared chart domain for the axis and each brand's monthly range. */
export function brandRangeScale(values: readonly number[], preferredMax?: number) {
  const finite = values.filter(Number.isFinite);
  const min = Math.min(0, ...finite);
  const max = Math.max(preferredMax ?? 0, ...finite, min === 0 ? 1 : 0);
  const span = max - min || 1;
  return {
    ticks: [max, min + span * 2 / 3, min + span / 3, min],
    position: (value: number) => Math.min(80, Math.max(20, 20 + (value - min) / span * 60)),
  };
}
