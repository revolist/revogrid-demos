import type { HRGenerationOptions } from './hr.data.generator';

export const HR_OPTIONS = [
  { label: '100 rows × 1,000 columns', value: 100, columns: 1_000 },
  { label: '1,000 rows × 100 columns', value: 1_000, columns: 100 },
  { label: '10,000 rows × 100 columns', value: 10_000, columns: 100 },
  { label: '100,000 rows × 100 columns', value: 100_000, columns: 100 },
  { label: '1,000,000 rows × 10 columns', value: 1_000_000, columns: 10 },
] as const;

const HR_BASE_COLUMN_COUNT = 7;
const HR_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const HR_MONTH_RANGE_START_YEAR = 2026;

export function getHRMonthColumns(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const month = index % HR_MONTH_NAMES.length;
    const year = HR_MONTH_RANGE_START_YEAR + Math.floor(index / HR_MONTH_NAMES.length);
    const monthNumber = String(month + 1).padStart(2, '0');
    return {
      label: `${HR_MONTH_NAMES[month]} ${year}`,
      prop: `hours${year}${monthNumber}`,
    };
  });
}

export interface HRCompanyAvatar {
  initials: string;
  color: string;
}

export interface HRCompanyOption {
  label: string;
  value: string;
  companyAvatar: HRCompanyAvatar;
}

export const HR_COMPANY_OPTIONS: HRCompanyOption[] = [
  { label: 'Northstar', value: 'Northstar', companyAvatar: { initials: 'NS', color: '#16a34a' } },
  { label: 'Acme', value: 'Acme', companyAvatar: { initials: 'AC', color: '#0891b2' } },
  { label: 'Globex', value: 'Globex', companyAvatar: { initials: 'GL', color: '#f59e0b' } },
  { label: 'Initech', value: 'Initech', companyAvatar: { initials: 'IN', color: '#9333ea' } },
  { label: 'Umbrella', value: 'Umbrella', companyAvatar: { initials: 'UM', color: '#3154b8' } },
];

export function getHRCompanyOption(value: unknown): HRCompanyOption | undefined {
  return HR_COMPANY_OPTIONS.find(option => option.value === value);
}

const FIRST_NAMES = ['Avery', 'Maya', 'Noah', 'Sofia', 'Liam', 'Zoe', 'Ethan', 'Nora'];
const LAST_NAMES = ['Chen', 'Silva', 'Brown', 'Khan', 'Martin', 'Garcia', 'Kim', 'Wilson'];
const DEPARTMENTS = ['Engineering', 'Design', 'Finance', 'Operations', 'Sales'];
const EYE_COLORS = ['#2563eb', '#16a34a', '#92400e', '#64748b'];

export function getHRColumnsCount(size: number) {
  return Math.max(0, getHRVisibleColumnsCount(size) - HR_BASE_COLUMN_COUNT);
}

export function getHRVisibleColumnsCount(size: number) {
  return [...HR_OPTIONS].reverse().find(option => size >= option.value)?.columns
    ?? HR_OPTIONS[0].columns;
}

const preparedRows: Array<Record<string, unknown>> = [];
let preparedMonthColumnCount: number | undefined;
const GENERATION_BUDGET_MS = 8;
const PROGRESS_INTERVAL_MS = 50;

function createHRRow(index: number, monthColumns: ReturnType<typeof getHRMonthColumns>) {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const lastName = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
  const company = HR_COMPANY_OPTIONS[index % HR_COMPANY_OPTIONS.length];
  const row: Record<string, unknown> = {
    id: index + 1,
    name: `${firstName} ${lastName}`,
    age: 20 + ((index * 7) % 46),
    company: company.value,
    companyAvatar: company.companyAvatar,
    department: DEPARTMENTS[index % DEPARTMENTS.length],
    eyeColor: EYE_COLORS[index % EYE_COLORS.length],
    joined: new Date(2018 + (index % 8), index % 12, 1 + (index % 27)),
    salary: 48_000 + ((index * 1_379) % 92_000),
  };

  for (const [monthIndex, month] of monthColumns.entries()) {
    row[month.prop] = 120 + ((index * 7 + monthIndex * 11) % 61);
  }
  return row;
}

function yieldToBrowser() {
  const browserScheduler = (globalThis as typeof globalThis & {
    scheduler?: { yield?: () => Promise<void> };
  }).scheduler;
  if (browserScheduler?.yield) {
    return browserScheduler.yield();
  }
  return new Promise<void>((resolve) => window.setTimeout(resolve));
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException('Data preparation aborted', 'AbortError');
  }
}

export async function getHRData(
  size: number,
  options: HRGenerationOptions = {},
) {
  throwIfAborted(options.signal);
  const monthColumnCount = getHRColumnsCount(size);
  const monthColumns = getHRMonthColumns(monthColumnCount);
  if (preparedMonthColumnCount !== monthColumnCount) {
    preparedRows.length = 0;
    preparedMonthColumnCount = monthColumnCount;
  }
  let lastProgressAt = performance.now();

  while (preparedRows.length < size) {
    const sliceStartedAt = performance.now();
    do {
      throwIfAborted(options.signal);
      preparedRows.push(createHRRow(preparedRows.length, monthColumns));
    } while (
      preparedRows.length < size
      && performance.now() - sliceStartedAt < GENERATION_BUDGET_MS
    );

    const now = performance.now();
    if (preparedRows.length < size && now - lastProgressAt >= PROGRESS_INTERVAL_MS) {
      options.onProgress?.({ loaded: Math.min(preparedRows.length, size), total: size });
      lastProgressAt = now;
    }

    if (preparedRows.length < size) {
      await yieldToBrowser();
    }
  }

  throwIfAborted(options.signal);
  options.onProgress?.({ loaded: size, total: size });
  return preparedRows.slice(0, size);
}

/** Clears module state for deterministic tests. */
export function resetHRDataCache() {
  preparedRows.length = 0;
  preparedMonthColumnCount = undefined;
}
