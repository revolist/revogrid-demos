import { forecastFixtures } from './forecast-fixtures.ts';

export const months = [
  'Nov',
  'Dec',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
] as const;
export const departments = [
  {
    name: 'Footwear',
    growth: 5,
    planner: 'Amara Okafor',
    color: '#6647f0',
    tint: '#eeeaff',
    surface: '#f9f7ff',
  },
  {
    name: 'Apparel',
    growth: 3,
    planner: 'Lucas Moreau',
    color: '#b52ac5',
    tint: '#fbe9fb',
    surface: '#fef8ff',
  },
  {
    name: 'Camp',
    growth: -2,
    planner: 'Ingrid Solberg',
    color: '#0077ca',
    tint: '#e4f3ff',
    surface: '#f6fbff',
  },
  {
    name: 'Packs',
    growth: 6,
    planner: 'Diego Alvarez',
    color: '#c25b14',
    tint: '#fff0e3',
    surface: '#fffaf5',
  },
] as const;
export type Department = (typeof departments)[number]['name'];
export type Status = 'Active' | 'New' | 'Exit';
export interface Line {
  id: string;
  name: string;
  department: Department;
  planner: string;
  status: Status;
  plan: number;
  prior: number[];
  actual: number[];
  /** Final projected month for an exiting line, when set. */
  lastMonth?: number;
}
export type LineDraft = Pick<
  Line,
  'name' | 'department' | 'planner' | 'status' | 'plan'
> & { lastMonth?: number };
export interface Reading {
  months: number[];
  prior: number[];
  actual: number;
  forecast: number;
  outlook: number;
  plan: number;
  plannedOutlook: number;
  plannedActual: number;
}

export const sum = (values: readonly number[]) =>
  values.reduce((total, value) => total + value, 0);

export const initialLines: Line[] = forecastFixtures.map((line) => ({
  ...line,
  prior: [...line.prior],
  actual: [...line.actual],
}));

export function newLine(id: string, draft: LineDraft): Line {
  return {
    ...draft,
    id,
    prior: months.map(() => 0),
    actual: months.map(() => 0),
  };
}

export function readLine(
  line: Line,
  closeMonth: number,
  growth: number,
): Reading {
  const actual = line.actual.slice(0, closeMonth + 1);
  const bookedPeriods = actual.filter((value) => value > 0);
  const newLineBaseline = bookedPeriods.length
    ? sum(bookedPeriods) / bookedPeriods.length
    : 0;
  const hasPrior = line.prior.some((value) => value > 0);
  const projected = months.slice(closeMonth + 1).map((_, offset) => {
    const month = closeMonth + offset + 1;
    if (line.status === 'Exit' && line.lastMonth !== undefined && month > line.lastMonth) return 0;
    const amount = hasPrior ? line.prior[month] * (1 + growth / 100) : newLineBaseline;
    return 100 * Math.round(amount / 100);
  });
  const outlook = sum(actual) + sum(projected);
  return {
    months: [...actual, ...projected],
    prior: line.prior,
    actual: sum(actual),
    forecast: sum(projected),
    outlook,
    plannedOutlook: line.plan > 0 ? outlook : 0,
    plannedActual: line.plan > 0 ? sum(actual) : 0,
    plan: line.plan,
  };
}

export function rollup(readings: readonly Reading[]): Reading {
  return {
    months: months.map((_, index) =>
      sum(readings.map((reading) => reading.months[index])),
    ),
    prior: months.map((_, index) =>
      sum(readings.map((reading) => reading.prior[index])),
    ),
    actual: sum(readings.map((reading) => reading.actual)),
    forecast: sum(readings.map((reading) => reading.forecast)),
    outlook: sum(readings.map((reading) => reading.outlook)),
    plannedOutlook: sum(readings.map((reading) => reading.plannedOutlook)),
    plannedActual: sum(readings.map((reading) => reading.plannedActual)),
    plan: sum(readings.map((reading) => reading.plan)),
  };
}

export function attainment(reading: Reading): number | null {
  return reading.plan > 0 ? reading.plannedOutlook / reading.plan : null;
}
