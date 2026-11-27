import { forecastFixtures } from './forecast-fixtures.ts';
import { demoDepartmentColors } from '../../composables/demo-colors.ts';

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
    planner: 'Maya Bennett',
    ...demoDepartmentColors.footwear,
  },
  {
    name: 'Apparel',
    growth: 3,
    planner: 'Rafael Costa',
    ...demoDepartmentColors.apparel,
  },
  {
    name: 'Camp',
    growth: -2,
    planner: 'Freya Lindholm',
    ...demoDepartmentColors.camp,
  },
  {
    name: 'Packs',
    growth: 6,
    planner: 'Mateo Rivas',
    ...demoDepartmentColors.packs,
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

/** Fiscal quarters follow the November–October planning year. */
export function quarterlyReadings(reading: Reading, closeMonth: number) {
  return Array.from({ length: 4 }, (_, index) => {
    const start = index * 3;
    const end = start + 2;
    const prior = sum(reading.prior.slice(start, end + 1));
    const current = sum(reading.months.slice(start, end + 1));
    return {
      label: `Q${index + 1}`,
      period: `${months[start]}–${months[end]}`,
      phase: end <= closeMonth ? 'Actual' : start > closeMonth ? 'Forecast' : 'Actual / forecast',
      prior,
      current,
      change: prior > 0 ? current / prior - 1 : null,
    };
  });
}

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
