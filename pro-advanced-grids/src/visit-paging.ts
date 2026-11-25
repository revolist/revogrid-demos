/** Sort the complete filtered kitchen list before selecting a page. */
export function visitPage<T extends { label: string; coverage: { rank: number } }>(
  rows: readonly T[], skip: number, take: number, order?: Record<string, 'asc' | 'desc' | undefined>,
): T[] {
  const key = order?.label ? 'label' : 'coverage';
  const direction = (order?.[key] ?? 'asc') === 'desc' ? -1 : 1;
  return rows.slice().sort((a, b) => {
    const name = a.label.localeCompare(b.label);
    return key === 'label' ? direction * name : direction * (a.coverage.rank - b.coverage.rank) || name;
  }).slice(skip, skip + take);
}
