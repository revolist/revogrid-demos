import { demoColors } from '../../../../composables/demo-colors';
import type { MetricTileHistory } from '@revolist/revogrid-pro';

export type Division = "Electronics" | "Precision Parts" | "Materials" | "Packaging";
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
export const divisions: Division[] = ["Electronics", "Precision Parts", "Materials", "Packaging"];
export const tiers: Tier[] = ["Strategic", "Core", "Trial"];
// Fictional annual inspection profiles: lots, accepted lots, score and spend.
const specs: [string, Division, Tier, number, number, number, number][] = [
  ["Aster Circuit Works", "Electronics", "Strategic", 32, 30, 8.4, 2042000],
  ["Juniper Sensors", "Electronics", "Strategic", 16, 13, 7.2, 624000],
  ["Tidepath Controls", "Electronics", "Core", 18, 15, 7.8, 538000],
  ["Canyon Semiconductors", "Electronics", "Core", 8, 5, 6.6, 243000],
  ["Willow Instruments", "Electronics", "Core", 11, 11, 8.8, 97800],
  ["Bluefern Microdevices", "Electronics", "Trial", 6, 1, 6.1, 92300],
  ["Aurora Precision", "Precision Parts", "Strategic", 25, 22, 7.9, 1818000],
  ["Cedar Machining", "Precision Parts", "Strategic", 22, 16, 7.4, 915000],
  ["Riverbend Components", "Precision Parts", "Core", 12, 9, 7.1, 321000],
  ["Mossfield Tooling", "Precision Parts", "Core", 19, 17, 8.0, 458000],
  ["Meadow Forging", "Precision Parts", "Core", 8, 2, 6.0, 157000],
  ["Indigo Fabrication", "Precision Parts", "Trial", 5, 3, 7.3, 74800],
  ["Forgepoint Alloys", "Materials", "Strategic", 23, 19, 7.6, 986000],
  ["Skyward Polymers", "Materials", "Strategic", 14, 10, 7.1, 1132000],
  ["Solstice Ceramics", "Materials", "Core", 11, 9, 7.9, 134000],
  ["Violet Composites", "Materials", "Core", 16, 7, 6.7, 287000],
  ["Waypoint Coatings", "Materials", "Core", 9, 9, 8.5, 169000],
  ["Hearth Materials Lab", "Materials", "Trial", 0, 0, 0, 0],
  ["Summit Carton Works", "Packaging", "Strategic", 28, 26, 8.1, 1486000],
  ["Anchor Reusables", "Packaging", "Strategic", 13, 12, 8.3, 385000],
  ["Glide Closures", "Packaging", "Core", 19, 14, 7.0, 318000],
  ["Atlas Containers", "Packaging", "Core", 10, 8, 7.4, 196000],
  ["Horizon Inserts", "Packaging", "Core", 6, 1, 6.3, 68400],
  ["Trekline Packaging", "Packaging", "Trial", 4, 1, 6.4, 41700],
];
export const buyers = ["Maya Bennett", "Rafael Costa", "Keira Voss", "Mateo Rivas"];
const components = [
  'Control board', 'Temperature sensor', 'Motor controller', 'Power module', 'Pressure gauge', 'Signal processor',
  'Valve body', 'Bearing housing', 'Drive shaft', 'Cutting die', 'Steel bracket', 'Machined coupling',
  'Aluminium alloy', 'Polymer resin', 'Ceramic substrate', 'Composite sheet', 'Protective coating', 'Insulation sample',
  'Shipping carton', 'Reusable tray', 'Tamper seal', 'Storage container', 'Protective insert', 'Transit packaging',
] as const;
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
      "Bluefern Microdevices",
      "Meadow Forging",
      "Horizon Inserts",
    ].includes(name)
      ? "Probation"
      : name === "Trekline Packaging" || !count
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
        product: `${components[id]} · Lot ${index + 1}`,
        defects:
          disposition === "Rejected" ? 2 : disposition === "Rework" ? 1 : 0,
      };
    }),
  }),
);
// Prior-year inspection profiles are separate from the current year's lots.
// Each tuple records lot count, accepted count, rejected count and average score.
const priorProfiles: [number, number, number, number][] = [
  [27, 23, 1, 8.1], [19, 17, 0, 7.7], [15, 11, 1, 7.3], [10, 7, 1, 6.9],
  [9, 8, 0, 8.4], [8, 3, 3, 6.4], [28, 23, 2, 7.6], [18, 15, 1, 7.8],
  [15, 10, 2, 6.8], [16, 12, 1, 7.5], [11, 4, 3, 6.4], [7, 5, 0, 7.5],
  [20, 15, 2, 7.3], [17, 14, 1, 7.5], [13, 10, 1, 7.5], [12, 7, 2, 6.9],
  [11, 9, 0, 8.1], [0, 0, 0, 0], [24, 20, 1, 7.8], [16, 13, 1, 8.0],
  [22, 18, 1, 7.4], [8, 5, 1, 7.0], [9, 3, 3, 6.5], [0, 0, 0, 0],
];
for (const [supplierIndex, supplier] of initial.entries()) {
  const [count, accepted, rejected, average] = priorProfiles[supplierIndex];
  const priorSpend = specs[supplierIndex][6] * (0.81 + (supplierIndex % 7) * 0.055);
  supplier.lots.push(...Array.from({ length: count }, (_, index): Lot => {
    const disposition: Disposition = index < accepted ? 'Accepted' : index >= count - rejected ? 'Rejected' : 'Rework';
    return {
      id: `LOT-${24000 + supplierIndex * 100 + index}`,
      supplier: supplier.name,
      month: 12 + ((index * 5 + supplierIndex) % 12),
      day: 1 + ((index * 11 + supplierIndex * 3) % 27),
      score: Math.max(3.6, Math.min(9.5, average + (((index * 7 + supplierIndex * 3) % 13) - 6) * 0.14)),
      value: lotAmount(priorSpend, count, supplierIndex + 3, index),
      disposition,
      product: `${components[supplierIndex]} · Lot ${index + 1}`,
      defects: disposition === 'Rejected' ? 2 : disposition === 'Rework' ? 1 : 0,
    };
  }));
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
        ? "var(--rv-ui-surface-hover)"
        : colors[l.disposition].fill,
    borderColor:
      highlight && highlight !== l.disposition
        ? "var(--rv-ui-border)"
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
