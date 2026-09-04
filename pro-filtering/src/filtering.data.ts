import { addDays, formatIsoDate } from '@revolist/revogrid-pro';

export type OrderStatus = 'Processing' | 'Pending Review' | 'Payment Hold' | 'Shipped' | 'Delivered';
export type OrderRegion = 'Europe' | 'North America' | 'Asia Pacific' | 'Latin America';
export type OrderCategory = 'Electronics' | 'Home' | 'Fashion' | 'Sports';
export type OrderPriority = 'Critical' | 'High' | 'Normal' | 'Low' | 'Backlog';
export type OrderCity = 'Lisbon' | 'Berlin' | 'Paris' | 'New York' | 'Toronto' | 'Tokyo' | 'Sydney' | 'São Paulo';

export interface OrderExplorerRow {
  orderNumber: string;
  customer: string;
  sku: string;
  email: string;
  status: OrderStatus;
  priority: OrderPriority | null;
  region: OrderRegion;
  city: OrderCity;
  category: OrderCategory;
  expedited: boolean | null;
  total: number;
  rating: number;
  marginDelta: number;
  orderDate: string;
  renewalDate: string;
  createdAt: string;
  activityAt: string;
  tags: Array<string | number | boolean | null>;
}

const CUSTOMERS = [
  'Avery Johnson', 'Mina Patel', 'Lucas Martin', 'Sofia Rossi', 'Noah Williams',
  'Emma Dubois', 'Mateo Silva', 'Yuki Tanaka', 'Amara Okafor', 'Oliver Smith',
] as const;

const CITIES: readonly OrderCity[] = [
  'Lisbon', 'Berlin', 'Paris', 'New York', 'Toronto', 'Tokyo', 'Sydney', 'São Paulo',
];

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'Processing', 'Pending Review', 'Payment Hold', 'Shipped', 'Delivered',
];
export const ORDER_REGIONS: readonly OrderRegion[] = [
  'Europe', 'North America', 'Asia Pacific', 'Latin America',
];
export const ORDER_CATEGORIES: readonly OrderCategory[] = [
  'Electronics', 'Home', 'Fashion', 'Sports',
];
export const ORDER_EXPEDITED = ['Yes', 'No'] as const;
export const ORDER_PRIORITIES: readonly OrderPriority[] = ['Critical', 'High', 'Normal', 'Low', 'Backlog'];

export const ORDER_OPTIONS_BY_PROP: Record<string, readonly string[]> = {
  status: ORDER_STATUSES,
  region: ORDER_REGIONS,
  category: ORDER_CATEGORIES,
  expedited: ORDER_EXPEDITED,
  priority: ORDER_PRIORITIES,
};

const ORDER_TAG_SETS: readonly OrderExplorerRow['tags'][] = [
  ['enterprise', 'priority'],
  ['growth', 'self-serve'],
  ['enterprise', 'renewal'],
  ['pilot'],
  ['priority', true],
  ['regional', 2026],
  [],
  ['renewal', null],
];
const SKU_REGIONS = ['EU', 'US', 'AP'] as const;
const ACTIVITY_HOURS = [7, 9, 11, 14, 16, 19, 22] as const;

// Deliberately separated bands keep the histogram brush useful for testing
// selections across empty numeric ranges.
const TOTAL_BANDS: ReadonlyArray<readonly [number, number]> = [
  [45, 280],
  [900, 2_495],
  [6_800, 11_400],
  [22_000, 34_000],
  [80_000, 140_000],
];

// Date windows are intentionally discontinuous so the calendar and timeline
// brushes show gaps instead of one uninterrupted stream of records.
const DATE_WINDOWS: ReadonlyArray<readonly [startDaysAgo: number, length: number]> = [
  [0, 12],
  [38, 18],
  [105, 24],
  [205, 32],
  [340, 28],
  [530, 45],
];

export const ORDER_EXPLORER_ROW_COUNT = 10_000;

function createSku(index: number): string {
  const region = SKU_REGIONS[index % SKU_REGIONS.length];
  const firstLetter = String.fromCharCode(65 + (index % 6));
  const secondLetter = String.fromCharCode(75 + (index % 8));
  const number = String(101 + index * 17).padStart(3, '0');
  return `${region}-${firstLetter}${secondLetter}-${number}`;
}

function createDateTime(date: string, hour: number, minutes: string): string {
  return `${date}T${String(hour).padStart(2, '0')}:${minutes}:00Z`;
}

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function seededUnit(index: number, salt: number): number {
  let hash = (index + salt) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x21f0aaad);
  hash = Math.imul(hash ^ (hash >>> 15), 0x735a2d97);
  return ((hash ^ (hash >>> 15)) >>> 0) / 0x1_0000_0000;
}

function createTotal(index: number): number {
  const [minimum, maximum] = TOTAL_BANDS[index % TOTAL_BANDS.length];
  return Number((minimum + seededUnit(index, 41) * (maximum - minimum)).toFixed(2));
}

function getDateOffset(index: number): number {
  const [startDaysAgo, length] = DATE_WINDOWS[index % DATE_WINDOWS.length];
  return startDaysAgo + Math.floor(seededUnit(index, 97) * length);
}

// Deterministic rows make every preset and screenshot repeatable.
export function createOrderExplorerRows(count = ORDER_EXPLORER_ROW_COUNT, now = new Date()): OrderExplorerRow[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const referenceDate = formatIsoDate(today);

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today);
    const dateOffset = getDateOffset(index);
    date.setDate(date.getDate() - dateOffset);
    const createdDate = addDays(referenceDate, -(dateOffset + Math.floor(seededUnit(index, 151) * 3)));
    return {
      orderNumber: `ORD-${String(100001 + index).padStart(6, '0')}`,
      customer: CUSTOMERS[(index * 7) % CUSTOMERS.length],
      sku: createSku(index),
      email: `customer${index + 1}@revolist.eu`,
      status: ORDER_STATUSES[(index * 3 + Math.floor(index / 11)) % ORDER_STATUSES.length],
      // Include every priority in each total band so the default high-value
      // preset remains populated while retaining deterministic variation.
      priority: index % 19 === 0
        ? null
        : ORDER_PRIORITIES[(index * 3 + Math.floor(index / TOTAL_BANDS.length)) % ORDER_PRIORITIES.length],
      region: ORDER_REGIONS[(index * 5 + Math.floor(index / 7)) % ORDER_REGIONS.length],
      city: CITIES[(index * 3 + Math.floor(index / 9)) % CITIES.length],
      category: ORDER_CATEGORIES[(index * 11 + Math.floor(index / 5)) % ORDER_CATEGORIES.length],
      expedited: index % 17 === 0 ? null : index % 4 === 0 || index % 11 === 0,
      total: createTotal(index),
      orderDate: localDateString(date),
      rating: 1 + (index % 9) * 0.5,
      marginDelta: Number((((index * 17) % 43) - 19 + (index % 127 === 0 ? 35 : 0)).toFixed(1)),
      renewalDate: addDays(referenceDate, ((index % 91) - 30)),
      createdAt: createDateTime(
        createdDate,
        8 + (index % 10),
        '30',
      ),
      activityAt: createDateTime(
        addDays(referenceDate, (index % 15) - 7),
        ACTIVITY_HOURS[index % ACTIVITY_HOURS.length],
        index % 2 ? '45' : '15',
      ),
      tags: [...ORDER_TAG_SETS[index % ORDER_TAG_SETS.length]],
    };
  });
}
