import type { ProductWeek } from './product-guardrails';

export interface ProductFixture {
  label: string; sku: string; department: string; markdown: number; landed: number; serve: number;
  returned: boolean; weeks: ProductWeek[]; listPrice: number; onHand: number;
}

// Fictional catalog inputs authored for this demonstration. The quarterly demand
// figures are independent starting points, not rescaled historical sample rows.
type CatalogItem = readonly [name: string, category: string, price: number, stock: number, cost: number, service: number, demand: readonly [number, number, number, number], returned?: boolean];
const catalog: readonly CatalogItem[] = [
  ['Alder Summit Boot', 'footwear', 148, 180, .36, .11, [215, 185, 230, 248]],
  ['Fernbank Walking Boot', 'footwear', 126, 1450, .40, .12, [142, 128, 153, 160]],
  ['Polar Crossing Winter Boot', 'footwear', 164, 0, .42, .13, [0, 0, 0, 0]],
  ['Harbor Loop Running Shoe', 'footwear', 138, 680, .78, .18, [255, 278, 302, 315]],
  ['Quarry Scramble Shoe', 'footwear', 122, 370, .43, .13, [180, 192, 205, 217], true],
  ['Tidal Camp Sandal', 'footwear', 62, 580, .38, .14, [250, 310, 365, 295]],
  ['Copper Peak Rain Jacket', 'apparel', 198, 1340, .44, .12, [135, 147, 169, 181]],
  ['Bluewater Storm Shell', 'apparel', 182, 920, .37, .13, [112, 131, 156, 162]],
  ['Mossgrove Fleece', 'apparel', 96, 2100, .35, .11, [240, 220, 258, 275]],
  ['Ridgeway Walking Pant', 'apparel', 104, 1820, .41, .14, [175, 189, 201, 215]],
  ['Frostfield Thermal Top', 'apparel', 68, 960, .39, .12, [300, 224, 196, 288]],
  ['Northwind Layer Shirt', 'apparel', 88, 700, .42, .13, [188, 205, 220, 230]],
  ['Meadowline Day Pack', 'packs', 112, 1430, .46, .11, [160, 178, 195, 210]],
  ['Summit Route 50 Pack', 'packs', 216, 1510, .48, .12, [90, 105, 125, 119]],
  ['Riverside Travel Duffel', 'packs', 124, 620, .39, .14, [155, 171, 182, 192], true],
  ['Cedar Loop Waist Pack', 'packs', 48, 1300, .34, .12, [310, 338, 370, 352]],
  ['Evening Star Two-Person Tent', 'camp', 278, 250, .70, .19, [84, 110, 138, 126]],
  ['Riverbend Picnic Cooler', 'camp', 140, 390, .43, .15, [115, 145, 188, 154]],
  ['Pinegrove Compact Stove', 'camp', 86, 980, .40, .12, [190, 215, 241, 219]],
  ['Driftwood Sleeping Bag', 'camp', 172, 380, .45, .14, [115, 128, 147, 137]],
  ['Birchline Hammock', 'camp', 78, 900, .38, .12, [180, 225, 260, 205]],
  ['Highstone Climbing Rope', 'climb', 155, 420, .41, .13, [120, 139, 148, 156]],
  ['Granite Pass Helmet', 'climb', 94, 760, .39, .12, [150, 173, 189, 197]],
  ['Canyon Anchor Harness', 'climb', 116, 510, .44, .14, [130, 146, 159, 168]],
  ['Cragside Chalk Bag', 'climb', 34, 1400, .35, .12, [410, 435, 466, 448], true],
  ['Clearwater Flask', 'accessories', 32, 1700, .32, .10, [510, 560, 610, 572]],
  ['Winter Pines Gloves', 'accessories', 42, 0, .40, .12, [0, 0, 0, 0]],
  ['Oak Trail Merino Socks', 'accessories', 28, 2200, .37, .10, [620, 680, 740, 705]],
  ['Dawnpath Headlamp', 'accessories', 54, 850, .38, .12, [260, 275, 300, 318]],
];

const rhythm = [0.92, 1.03, 0.98, 1.08, 1.01, 0.94, 1.06, 0.99, 1.04, 0.96, 1.10, 0.97, 1.02];
const promotionKeys = ['explore', 'members', 'bundle', 'clearance'] as const;
const roundMoney = (value: number) => Math.round(value * 100) / 100;

function weeklyHistory(item: CatalogItem, index: number, markdown: number): ProductWeek[] {
  const [, , price, , cost, service, demand] = item;
  return Array.from({ length: 52 }, (_, week) => {
    const baseline = price * demand[Math.floor(week / 13)] * rhythm[(week + index * 3) % rhythm.length];
    const promotionIndex = index === 0 && (week === 44 || week === 45)
      ? 1
      : promotionKeys.findIndex((_, position) => week === (index * 5 + position * 11 + 3) % 52);
    const key = promotionIndex < 0 ? null : promotionKeys[promotionIndex];
    const depth = key ? Math.max(markdown, [0.12, 0.16, 0.19, 0.25][promotionIndex]) : markdown;
    const uplift = key ? [1.10, 1.18, 1.24, 1.30][promotionIndex] : 1;
    const gross = roundMoney(baseline * uplift);
    const discount = roundMoney(gross * depth);
    const net = roundMoney(gross - discount);
    const contribution = roundMoney(net * (1 - service) - gross * cost);
    return [net, gross, discount, contribution, roundMoney(baseline), key];
  });
}

export const productFixtures: ProductFixture[] = catalog.map((item, index) => {
  const [label, department, listPrice, onHand, landed, serve, , returned = false] = item;
  const markdown = index === 19 || index === 24 ? .23 : [0.03, 0.05, 0.07, 0.09][index % 4];
  return { label, sku: `RT-${1001 + index}`, department, markdown, landed, serve, returned, listPrice, onHand, weeks: weeklyHistory(item, index, markdown) };
});
