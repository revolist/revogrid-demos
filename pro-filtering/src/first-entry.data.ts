import type { OrderExplorerRow, OrderStatus } from './filtering.data';

export type FirstEntryRow = Pick<OrderExplorerRow,
  'orderNumber' | 'customer' | 'status' | 'total' | 'city' | 'region' | 'orderDate'>;
export type FirstEntryMode = 'explorer' | 'first-entry';
export type FirstEntryAction = 'preset' | 'search' | 'filter';
export const FIRST_ENTRY_ACTION_EVENT = 'order-explorer-action';
export const FIRST_ENTRY_RESET_EVENT = 'order-explorer-reset';
export const FIRST_ENTRY_STEPS = ['Choose Review queue', 'Search “Northstar”', 'Filter Total ≥ $1,000'] as const;
export const REVIEW_STATUSES = ['Pending Review', 'Payment Hold'] as const;
export const FIRST_ENTRY_TRIAL_HREF = '/trial?source=demo-page&demo=filtering&demo_id=filtering&experiment_variant=order-first-entry';

const customers = [
  { customer: 'Northstar Supply', city: 'Lisbon', region: 'Europe' },
  { customer: 'Atlas Home', city: 'Berlin', region: 'Europe' },
  { customer: 'Maple Outfitters', city: 'Toronto', region: 'North America' },
  { customer: 'Harbour Retail', city: 'Sydney', region: 'Asia Pacific' },
] as const;

// A fixed operational snapshot: no random values, moving dates or unrelated test fields.
export function createFirstEntryRows(): FirstEntryRow[] {
  return Array.from({ length: 120 }, (_, index) => {
    const customer = customers[index < 6 ? 0 : 1 + (index % 3)];
    const status: OrderStatus = index < 24
      ? REVIEW_STATUSES[index % 3 === 0 ? 1 : 0]
      : (['Processing', 'Shipped', 'Delivered'] as const)[index % 3];
    return {
      ...customer,
      orderNumber: `ORD-${104001 + index}`,
      status,
      total: [240, 480, 760, 920, 1240, 1860][index % 6],
      orderDate: `2026-08-${String(10 + Math.floor(index / 6)).padStart(2, '0')}`,
    };
  });
}

export interface FirstEntryState {
  queue: boolean;
  query: string;
  highValue: boolean;
  status: string;
  visibleCount: number;
  progress: number;
  busy: boolean;
  compact: boolean;
  showAllColumns: boolean;
}
export const initialFirstEntryState = (compact = false): FirstEntryState => ({
  queue: false, query: '', highValue: false, status: '', visibleCount: 120, progress: 0, busy: false,
  compact, showAllColumns: false,
});

export const firstEntryStepState = (state: FirstEntryState, index: number) => ({
  complete: state.progress > index,
  current: state.progress === index,
});
