import { demoColors } from '../../../../composables/demo-colors';
import type { MetricTileHistory } from '@revolist/revogrid-pro';

export type Division = "Footwear" | "Apparel" | "Camp" | "Packs";
export type Tier = "Strategic" | "Core" | "Trial";
export type Disposition = "Accepted" | "Rework" | "Rejected";
export type Lot = {
  id: string;
  supplier: string;
  month: number;
  day: number;
  score: number;
  value: number;
  disposition: Disposition;
  product: string;
  defects: number;
};
export type Supplier = {
  id: number;
  name: string;
  division: Division;
  tier: Tier;
  status: string;
  buyer: string;
  lots: Lot[];
};
export type Reading = {
  score: number | null;
  accepted: number;
  rework: number;
  rejected: number;
  spend: number;
  lots: Lot[];
  trend: number[];
  rate: number | null;
};
export type QualityRow = {
  label: string;
  division: Division;
  tier?: Tier;
  supplier?: Supplier;
  group?: boolean;
  qualityRowClass?: string;
  divisionHead?: boolean;
  divisionCompact?: boolean;
  divisionCount?: number;
  divisionReading?: Reading;
  expanded?: boolean;
  reading: Reading;
  previous: Reading;
  accepted: number | null;
  spend: number;
  lots: number;
  plot: {
    value: number;
    size: number;
    color: string;
    borderColor: string;
    title: string;
    tooltip: MetricTileHistory;
  }[];
  trend: number[];
};
export const divisions: Division[] = ["Footwear", "Apparel", "Camp", "Packs"];
export const tiers: Tier[] = ["Strategic", "Core", "Trial"];
const specs: [string, Division, Tier, number, number, number, number][] = [
  ["Cobalt Sole Studio", "Footwear", "Strategic", 27, 25, 8.2, 1255600],
  ["Juniper Form Co.", "Footwear", "Strategic", 21, 20, 7.6, 858000],
  ["Tidepath Footwear", "Footwear", "Core", 15, 12, 7.5, 415000],
  ["Canyon Rubberworks", "Footwear", "Core", 10, 6, 6.8, 184200],
  ["Willow Footbeds", "Footwear", "Core", 8, 8, 8.6, 59400],
  ["Bluefern Molding", "Footwear", "Trial", 9, 0, 5.8, 138000],
  ["Aurora Textiles", "Apparel", "Strategic", 30, 27, 8, 1930000],
  ["Cedar Loom", "Apparel", "Strategic", 18, 9, 7, 743000],
  ["Riverbend Garments", "Apparel", "Core", 15, 10, 6.9, 294800],
  ["Mossfield Apparel", "Apparel", "Core", 15, 13, 7.6, 271900],
  ["Meadow Stitchworks", "Apparel", "Core", 10, 1, 6.3, 174200],
  ["Indigo Dye House", "Apparel", "Trial", 7, 4, 7, 56800],
  ["Forgepoint Metals", "Camp", "Strategic", 20, 18, 7.7, 755600],
  ["Skyward Shelters", "Camp", "Strategic", 17, 11, 7, 1450300],
  ["Solstice Cookware", "Camp", "Core", 9, 8, 7.8, 88600],
  ["Violet Fabrics", "Camp", "Core", 13, 4, 6.2, 215900],
  ["Waypoint Poles", "Camp", "Core", 13, 13, 8.2, 121200],
  ["Hearth Gear Lab", "Camp", "Trial", 0, 0, 0, 0],
  ["Summit Packworks", "Packs", "Strategic", 24, 23, 8, 1477700],
  ["Anchor Webbing", "Packs", "Strategic", 17, 16, 8.4, 306600],
  ["Glide Fasteners", "Packs", "Core", 16, 13, 7.2, 227300],
  ["Atlas Bags", "Packs", "Core", 12, 9, 7.1, 246800],
  ["Horizon Hardware", "Packs", "Core", 7, 0, 6.1, 47000],
  ["Trekline Packs", "Packs", "Trial", 5, 1, 5.9, 53000],
];
export const buyers = ["Amara Okafor", "Lucas Moreau", "Hana Mori", "Diego Alvarez"];
// Vary lot values while keeping each supplier's current-period total unchanged.
const lotWeight = (supplier: number, index: number) => 0.65 + ((supplier * 11 + index * 7) % 13) * 0.06;
const lotAmount = (total: number, count: number, supplier: number, index: number) =>
  total * lotWeight(supplier, index) / Array.from({ length: count }, (_, i) => lotWeight(supplier, i)).reduce((sum, value) => sum + value, 0);
export const initial: Supplier[] = specs.map(
  ([name, division, tier, count, accepted, average, spend], id) => ({
    id,
    name,
    division,
    tier,
    status: [
      "Bluefern Molding",
      "Meadow Stitchworks",
      "Horizon Hardware",
    ].includes(name)
      ? "Probation"
      : name === "Trekline Packs" || !count
        ? "Onboarding"
        : "Active",
    buyer: buyers[id % buyers.length],
    lots: Array.from({ length: count }, (_, index) => {
      const rejectedCounts = [
        0, 0, 0, 1, 0, 3, 0, 3, 0, 0, 2, 0, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 1, 1,
      ];
      const rejected = index >= count - rejectedCounts[id];
      const disposition: Disposition =
        index < accepted ? "Accepted" : rejected ? "Rejected" : "Rework";
      const variation = (((index * 5 + id * 7) % 13) - 6) * 0.16;
      return {
        id: `LOT-${36500 + id * 100 + index}`,
        supplier: name,
        month: index % 12,
        day: 1 + ((index * 7) % 27),
        score: Math.max(3.6, Math.min(9.5, average + variation)),
        value: lotAmount(spend, count, id, index),
        disposition,
        product: `${division} lot ${index + 1}`,
        defects:
          disposition === "Rejected" ? 2 : disposition === "Rework" ? 1 : 0,
      };
    }),
  }),
);
for (const [supplierIndex, supplier] of initial.entries()) {
  supplier.lots.push(
    ...supplier.lots.map((lot) => ({
      ...lot,
      month: lot.month + 12,
      score: Math.max(0, lot.score - 0.1),
      value: lot.value * (0.86 + (supplierIndex % 7) * 0.05),
    })),
  );
}
export const colors: Record<Disposition, { fill: string; stroke: string }> = {
  Accepted: { fill: demoColors.tealFill, stroke: demoColors.teal },
  Rework: { fill: demoColors.orangeFill, stroke: demoColors.orange },
  Rejected: { fill: demoColors.pinkFill, stroke: demoColors.pink },
};
export const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: value >= 1e6 ? 2 : 1,
  }).format(value);
export function read(suppliers: Supplier[], months: number, start = 0): Reading {
  const lots = suppliers.flatMap((s) =>
    s.lots.filter((l) => l.month >= start && l.month < start + months),
  );
  const n = lots.length;
  const accepted = lots.filter((l) => l.disposition === "Accepted").length;
  return {
    lots,
    score: n ? lots.reduce((sum, l) => sum + l.score, 0) / n : null,
    accepted,
    rework: lots.filter((l) => l.disposition === "Rework").length,
    rejected: lots.filter((l) => l.disposition === "Rejected").length,
    spend: lots.reduce((sum, l) => sum + l.value, 0),
    trend: Array.from({ length: months }, (_, month) =>
      lots
        .filter((l) => l.month === month + start)
        .reduce((sum, l) => sum + l.value, 0),
    ).reverse(),
    rate: n ? (accepted / n) * 100 : null,
  };
}
export const score = (r: Reading) =>
  r.score === null ? "No lots" : r.score.toFixed(1);
export const rate = (r: Reading) =>
  r.rate === null ? "No lots" : `${Math.round(r.rate)}%`;
export const signed = (value: number, digits = 1) =>
  `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
export const percentChange = (value: number, previous: number) =>
  previous ? `${signed((value / previous - 1) * 100)}%` : value ? "New" : "—";
export const scoreChange = (current: Reading, previous: Reading) =>
  current.score === null
    ? "—"
    : previous.score === null
      ? "New"
      : signed(current.score - previous.score);
export const rateChange = (current: Reading, previous: Reading) =>
  current.rate === null
    ? "—"
    : previous.rate === null
      ? "New"
      : `${signed(current.rate - previous.rate, 0)} pts`;
// The fixture's month is an age offset from the September 2026 reporting month.
export const lotDate = (lot: Lot) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const offset = 8 - lot.month;
  return `${months[((offset % 12) + 12) % 12]} ${lot.day}, ${2026 + Math.floor(offset / 12)}`;
};
export const plot = (r: Reading, highlight: Disposition | undefined) =>
  r.lots.map((l) => ({
    value: l.score,
    size: Math.max(6, Math.min(14, 5 + Math.sqrt(l.value / 1800))),
    color:
      highlight && highlight !== l.disposition
        ? "#e5e5e5"
        : colors[l.disposition].fill,
    borderColor:
      highlight && highlight !== l.disposition
        ? "#c7c7c7"
        : colors[l.disposition].stroke,
    title: `${l.product}, ${l.score.toFixed(1)}, ${l.disposition}`,
    tooltip: {
      title: l.product,
      subtitle: `${l.supplier} · ${lotDate(l)}`,
      rows: [
        { label: "Lot", value: l.id },
        { label: "Score", value: `${l.score.toFixed(1)} of 10` },
        { label: "Against the Bar", value: `${Math.abs(l.score - 7).toFixed(1)} ${l.score >= 7 ? "over" : "under"}` },
        { label: "Lot Value", value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(l.value) },
        { label: "Major Defects", value: String(l.defects) },
      ],
      footer: { text: l.disposition, color: colors[l.disposition].stroke },
    },
  }));
