/** Keep planned rows and their source together so chart tooltips follow the points. */
export function plannedDistribution<T extends { reading: { plan: number; outlook: number } }>(items: readonly T[]) {
  return items.flatMap(item => item.reading.plan > 0
    ? [{ item, ratio: item.reading.outlook / item.reading.plan }]
    : []);
}

/** Position each planned line by its outlook as a proportion of plan. */
export function distributionPoints(ratios: readonly number[]) {
  const stacks = new Map<number, number>();
  return ratios.map((ratio) => {
    const x = Math.max(2, Math.min(98, (ratio / 1.25) * 100));
    const bin = Math.round(x / 3);
    const level = stacks.get(bin) ?? 0;
    stacks.set(bin, level + 1);
    return { x, y: 4 + level * 6, onPlan: ratio >= 1 };
  });
}
