/** Sort the filtered catalog before slicing a page; an empty sort retains catalog order. */
export function productPage<T extends Record<string, unknown>>(
  rows: readonly T[], skip: number, take: number, order?: Record<string, 'asc' | 'desc' | undefined>,
): T[] {
  const sort = Object.entries(order ?? {}).filter((entry): entry is [string, 'asc' | 'desc'] => entry[1] === 'asc' || entry[1] === 'desc');
  return rows.slice().sort((a, b) => {
    for (const [column, direction] of sort) {
      const key = column === 'status' ? 'healthScore' : column;
      const left = a[key], right = b[key];
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
