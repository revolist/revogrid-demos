/** Reserve room for classic scrollbars and rounding when filling a grid viewport. */
const SCROLLBAR_ALLOWANCE = 20;

export function stretchedColumnWidth(gridWidth: number, fixedWidth: number, minimum: number): number {
  return Math.max(minimum, Math.floor(gridWidth - fixedWidth - SCROLLBAR_ALLOWANCE));
}
