export interface BrandMonth {
  net: number;
  cogs: number;
  markdown: number;
  orders: number;
  units: number;
  returned: number;
  newCustomers: number;
  repeatOrders: number;
  ratingPoints: number;
  reviews: number;
  stockUnits: number;
  agedUnits: number;
  stockCost: number;
  lyNet: number | null;
}
export type BrandMetricKey = 'sales' | 'change' | 'orders' | 'average' | 'margin' | 'markdown' | 'returns' | 'profitPerStyle' | 'newCustomers' | 'repeat' | 'rating' | 'sellThrough' | 'agedStock' | 'stockCost';

/** New demo records have sales but no other measures until data is supplied. */
export function emptyBrandMonth(net: number): BrandMonth {
  return { net, cogs: net, markdown: 0, orders: 0, units: 0, returned: 0, newCustomers: 0, repeatOrders: 0, ratingPoints: 0, reviews: 0, stockUnits: 0, agedUnits: 0, stockCost: 0, lyNet: null };
}

/** A monthly portfolio is computed from its inputs, never by averaging rates. */
export function monthlyMetric(months: readonly BrandMonth[], key: BrandMetricKey, styles: number): number | null {
  if (!months.length) return null;
  const sum = (name: Exclude<keyof BrandMonth, 'lyNet'>) => months.reduce((total, month) => total + month[name], 0);
  const ratio = (numerator: number, denominator: number, scale = 1) => denominator ? numerator / denominator * scale : null;
  const net = sum('net'), orders = sum('orders'), units = sum('units');
  switch (key) {
    case 'sales': return net;
    case 'orders': return orders;
    case 'average': return ratio(net, orders);
    case 'margin': return ratio(net - sum('cogs'), net, 100);
    case 'markdown': return ratio(sum('markdown'), net + sum('markdown'), 100);
    case 'returns': return ratio(sum('returned'), units, 100);
    case 'profitPerStyle': return ratio(net - sum('cogs') - orders * 9.4 - sum('returned') * 6.8, styles);
    case 'newCustomers': return sum('newCustomers');
    case 'repeat': return ratio(sum('repeatOrders'), orders, 100);
    case 'rating': return ratio(sum('ratingPoints'), sum('reviews'));
    case 'sellThrough': return ratio(units, units + sum('stockUnits'), 100);
    case 'agedStock': return ratio(sum('agedUnits'), sum('stockUnits'), 100);
    case 'stockCost': return sum('stockCost');
    case 'change': {
      const comparable = months.filter((month) => month.lyNet !== null);
      const prior = comparable.reduce((total, month) => total + month.lyNet!, 0);
      return prior ? (comparable.reduce((total, month) => total + month.net, 0) / prior - 1) * 100 : null;
    }
  }
}
