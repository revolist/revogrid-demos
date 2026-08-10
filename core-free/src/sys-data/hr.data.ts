import type { HRGenerationOptions } from './hr.data.generator';

export const HR_OPTIONS = [
  { label: '100 rows', value: 100 },
  { label: '1,000 rows', value: 1_000 },
  { label: '10,000 rows', value: 10_000 },
  { label: '100,000 rows', value: 100_000 },
  { label: '1,000,000 rows', value: 1_000_000 },
] as const;

export const HR_MAX_EXTRA_COLUMNS = 8;

const FIRST_NAMES = ['Avery', 'Maya', 'Noah', 'Sofia', 'Liam', 'Zoe', 'Ethan', 'Nora'];
const LAST_NAMES = ['Chen', 'Silva', 'Brown', 'Khan', 'Martin', 'Garcia', 'Kim', 'Wilson'];
const COMPANIES = ['Northstar', 'Acme', 'Globex', 'Initech', 'Umbrella'];
const DEPARTMENTS = ['Engineering', 'Design', 'Finance', 'Operations', 'Sales'];
const EYE_COLORS = ['#2563eb', '#16a34a', '#92400e', '#64748b'];

export function getHRColumnsCount(size: number) {
  if (size >= 10_000) return 8;
  if (size >= 1_000) return 4;
  return 0;
}

export function getHRVisibleColumnsCount(size: number) {
  return 7 + getHRColumnsCount(size);
}

const preparedRows: Array<Record<string, unknown>> = [];
const GENERATION_BUDGET_MS = 8;
const PROGRESS_INTERVAL_MS = 50;

function createHRRow(index: number) {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const lastName = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
  const row: Record<string, unknown> = {
    id: index + 1,
    name: `${firstName} ${lastName}`,
    avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${firstName}%20${lastName}`,
    age: 20 + ((index * 7) % 46),
    company: COMPANIES[index % COMPANIES.length],
    department: DEPARTMENTS[index % DEPARTMENTS.length],
    eyeColor: EYE_COLORS[index % EYE_COLORS.length],
    joined: new Date(2018 + (index % 8), index % 12, 1 + (index % 27)),
    salary: 48_000 + ((index * 1_379) % 92_000),
  };

  for (let column = 0; column < HR_MAX_EXTRA_COLUMNS; column += 1) {
    row[`metric${column + 1}`] = (index * (column + 3)) % 1_000;
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
  let lastProgressAt = performance.now();

  while (preparedRows.length < size) {
    const sliceStartedAt = performance.now();
    do {
      throwIfAborted(options.signal);
      preparedRows.push(createHRRow(preparedRows.length));
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
}
