import type { ColumnProp, DataType, Order } from '@revolist/revogrid';

function scalar(value: unknown) {
  return Array.isArray(value) ? value.at(-1) : value;
}

/** Core reverses this comparator for descending order. Keep missing values last. */
export function compareCampaignCells(
  this: { order?: Order },
  prop: ColumnProp,
  a: DataType,
  b: DataType,
): number {
  const left = scalar(a[prop]);
  const right = scalar(b[prop]);
  if (left == null || right == null) {
    const missingLast = Number(left == null) - Number(right == null);
    return this.order === 'desc' ? -missingLast : missingLast;
  }
  return typeof left === 'number' && typeof right === 'number'
    ? left - right
    : String(left).localeCompare(String(right));
}
