/** Sort the complete filtered dataset before selecting a page. */
export function campaignPage<T extends Record<string, unknown>>(rows: readonly T[], skip: number, take: number, order?: Record<string, 'asc' | 'desc' | undefined>): T[] {
  const sort = Object.entries(order ?? {}).filter((entry): entry is [string, 'asc' | 'desc'] => entry[1] === 'asc' || entry[1] === 'desc');
  if (!sort.length) sort.push(['spend', 'desc']);
  return rows.slice().sort((a, b) => {
    for (const [key, direction] of sort) {
      const scalar = (value: unknown) => Array.isArray(value) ? value.at(-1) : value;
      const left = scalar(a[key]), right = scalar(b[key]);
      if (left == null || right == null) {
        if (left !== right) return left == null ? 1 : -1;
        continue;
      }
      const comparison = typeof left === 'number' && typeof right === 'number'
        ? left - right : String(left).localeCompare(String(right));
      if (comparison) return direction === 'asc' ? comparison : -comparison;
    }
    return 0;
  }).slice(skip, skip + take);
}
