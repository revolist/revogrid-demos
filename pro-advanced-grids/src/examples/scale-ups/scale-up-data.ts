import { referenceCompanies } from './scale-up-fixtures';
import { scaleUpRawCompanies } from './scale-up-raw-fixtures';
import { percentChange, quarterDirections, formatScaleRevenue } from './scale-up-financials';

export const provinces = [
  'North Brabant',
  'South Holland',
  'Drenthe',
  'Groningen',
  'Utrecht',
  'Overijssel',
  'Flevoland',
  'North Holland',
  'Gelderland',
  'Limburg',
  'Friesland',
  'Zeeland',
];
export const flags = ['Founder', 'Exports', 'Raising'] as const;
export type Flag = (typeof flags)[number];
export const answers = ['Yes', 'No', 'N/A'];
export const euros = formatScaleRevenue;
export const capital: Record<string, string> = {
  'North Brabant': 'Den Bosch',
  'South Holland': 'The Hague',
  Drenthe: 'Assen',
  Groningen: 'Groningen',
  Utrecht: 'Utrecht',
  Overijssel: 'Zwolle',
  Flevoland: 'Lelystad',
  'North Holland': 'Haarlem',
  Gelderland: 'Arnhem',
  Limburg: 'Maastricht',
  Friesland: 'Leeuwarden',
  Zeeland: 'Middelburg',
};
export interface Company {
  id: string;
  label: string;
  province: string;
  sector: string;
  revenue: number;
  margin: number | null;
  staff: number | null;
  growth: number | null;
  staffGrowth: number | null;
  city: string;
  sectorName: string;
  focus: string;
  founded: number;
  audited: string;
  screening: Record<Flag, string>;
  previousRevenue: number | null;
  priorRevenue: number | null;
  previousEbitda: number | null;
  staffSeries: (number | null)[];
  stage?: string;
  markKind?: number;
  staffHistory?: readonly (number | null)[];
}

export function createCompanies(): Company[] {
    const rawByName = new Map(scaleUpRawCompanies.map(company => [company.name, company]));
    return referenceCompanies.map((fixture, index) => {
      const raw = rawByName.get(fixture.label);
      if (!raw) throw new Error(`Missing financial data for ${fixture.label}`);
      const revenue = raw.revenue.fy25 * 1_000_000;
      const previousRevenue = raw.revenue.fy24 == null ? null : raw.revenue.fy24 * 1_000_000;
      const staffSeries = [...raw.staff];
      return {
        ...fixture, id: raw.id, revenue, previousRevenue, priorRevenue: raw.revenue.fy23 == null ? null : raw.revenue.fy23 * 1_000_000,
        previousEbitda: raw.ebitda.fy24 == null ? null : raw.ebitda.fy24 * 1_000_000,
        margin: revenue ? raw.ebitda.fy25 * 1_000_000 / revenue * 100 : null,
        growth: percentChange(revenue, previousRevenue),
        city: raw.city, sectorName: raw.sector, focus: raw.focus, founded: raw.founded, audited: raw.checks.audited === 'yes' ? 'Yes' : raw.checks.audited === 'no' ? 'No' : 'N/A',
        staff: staffSeries.at(-1) ?? null, staffSeries,
        staffGrowth: percentChange(staffSeries.at(-1) ?? null, staffSeries.at(-5) ?? null),
        staffHistory: quarterDirections(staffSeries),
        screening: { Founder: raw.checks.founder === 'yes' ? 'Yes' : raw.checks.founder === 'no' ? 'No' : 'N/A', Exports: raw.checks.exports === 'yes' ? 'Yes' : raw.checks.exports === 'no' ? 'No' : 'N/A', Raising: raw.checks.raising === 'yes' ? 'Yes' : raw.checks.raising === 'no' ? 'No' : 'N/A' }, stage: raw.stage,
        markKind: index < 5 ? index : undefined,
      };
    });
}
