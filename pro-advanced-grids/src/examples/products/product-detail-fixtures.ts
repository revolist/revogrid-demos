import { productFixtures } from './product-fixtures.ts';

/** Detail records share catalog inputs with the sales and inventory views. */
export const productDetailFixtures: Record<string, {
  id: string; ownerId: string; list: number; onHand: number; decision: string | null; cap: number | null;
  note: string; promotions: { key: string; depth: number; lift: number }[]; activity: { text: string; by: string; when: string }[];
}> = Object.fromEntries(productFixtures.map((product, index) => {
  const ownerId = ['own_ao', 'own_lm', 'own_is', 'own_da', 'own_hm'][index % 5];
  return [product.sku, {
    id: `retail-product-${String(index + 1).padStart(3, '0')}`, ownerId,
    list: product.listPrice, onHand: product.onHand, decision: index === 0 ? 'noChange' : null, cap: null,
    note: product.onHand ? 'Review demand and available stock before the next order.' : 'Awaiting the first inventory delivery.',
    promotions: [
      { key: 'explore', depth: .12, lift: .10 }, { key: 'members', depth: .16, lift: .18 },
      { key: 'bundle', depth: .19, lift: .24 }, { key: 'clearance', depth: .25, lift: .30 },
    ],
    activity: [
      { text: 'Product added to the assortment', by: ownerId, when: 'Sep 12' },
      ...(index % 3 === 0 ? [{ text: 'Inventory plan reviewed', by: ownerId, when: 'Oct 4' }] : []),
    ],
  }];
}));
