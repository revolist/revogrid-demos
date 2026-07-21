import type { HRGenerationOptions } from './hr.data.generator';

export const HR_OPTIONS = [
  { label: '100 rows', value: 100 },
  { label: '1,000 rows', value: 1_000 },
  { label: '10,000 rows', value: 10_000 },
  { label: '100,000 rows', value: 100_000 },
  { label: '1,000,000 rows', value: 1_000_000 },
] as const;

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

export async function getHRData(
  size: number,
  extraColumns: number,
  options: HRGenerationOptions = {},
) {
  const rows: Array<Record<string, unknown>> = [];
  const batchSize = 500;

  for (let start = 0; start < size; start += batchSize) {
    if (options.signal?.aborted) {
      throw new DOMException('Data generation aborted', 'AbortError');
    }

    const end = Math.min(size, start + batchSize);
    for (let index = start; index < end; index += 1) {
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

      for (let column = 0; column < extraColumns; column += 1) {
        row[`metric${column + 1}`] = (index * (column + 3)) % 1_000;
      }
      rows.push(row);
    }

    options.onProgress?.({ loaded: end, total: size });
    await new Promise<void>((resolve) => window.setTimeout(resolve));
  }

  return rows;
}
