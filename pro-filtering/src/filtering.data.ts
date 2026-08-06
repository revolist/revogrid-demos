export type OrderStatus = 'Processing' | 'Pending Review' | 'Payment Hold' | 'Shipped' | 'Delivered';
export type OrderRegion = 'Europe' | 'North America' | 'Asia Pacific' | 'Latin America';
export type OrderCategory = 'Electronics' | 'Home' | 'Fashion' | 'Sports';
export type OrderExpedited = 'Yes' | 'No';
export type OrderCity = 'Lisbon' | 'Berlin' | 'Paris' | 'New York' | 'Toronto' | 'Tokyo' | 'Sydney' | 'São Paulo';

export interface OrderExplorerRow {
  orderNumber: string;
  customer: string;
  status: OrderStatus;
  region: OrderRegion;
  city: OrderCity;
  category: OrderCategory;
  expedited: OrderExpedited;
  total: number;
  orderDate: string;
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
export const ORDER_EXPEDITED: readonly OrderExpedited[] = ['Yes', 'No'];

export const ORDER_OPTIONS_BY_PROP: Record<string, readonly string[]> = {
  status: ORDER_STATUSES,
  region: ORDER_REGIONS,
  category: ORDER_CATEGORIES,
  expedited: ORDER_EXPEDITED,
};

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Deterministic rows make every preset and screenshot repeatable.
export function createOrderExplorerRows(count = 1000, now = new Date()): OrderExplorerRow[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() - ((index * 17) % 120));
    return {
      orderNumber: `ORD-${String(100001 + index).padStart(6, '0')}`,
      customer: CUSTOMERS[(index * 7) % CUSTOMERS.length],
      status: ORDER_STATUSES[(index * 3 + Math.floor(index / 11)) % ORDER_STATUSES.length],
      region: ORDER_REGIONS[(index * 5 + Math.floor(index / 7)) % ORDER_REGIONS.length],
      city: CITIES[(index * 3 + Math.floor(index / 9)) % CITIES.length],
      category: ORDER_CATEGORIES[(index * 11 + Math.floor(index / 5)) % ORDER_CATEGORIES.length],
      expedited: index % 4 === 0 || index % 11 === 0 ? 'Yes' : 'No',
      total: Math.round((45 + ((index * 7919) % 245000) / 100) * 100) / 100,
      orderDate: localDateString(date),
    };
  });
}
