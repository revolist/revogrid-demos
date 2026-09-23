/** Deterministic, synthetic USD transactions. Every workload shares the same prefix. */
export interface ScaleRow {
  id: string;
  region: string;
  segment: string;
  category: string;
  year: number;
  quarter: string;
  sales: number;
  profit: number;
}

const REGIONS = ['North America', 'Europe', 'Asia Pacific', 'Latin America'];
const SEGMENTS = ['Enterprise', 'Midmarket', 'Small Business'];
const CATEGORIES = ['Software', 'Hardware', 'Services', 'Support'];

function mix(value: number): number {
  let x = value ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

export function makeScaleRow(index: number): ScaleRow {
  if (!Number.isSafeInteger(index) || index < 0) throw new RangeError('index must be a nonnegative safe integer');
  const random = mix(index);
  const quarter = index % 4;
  const category = CATEGORIES[(random >>> 11) % CATEGORIES.length];
  const cents = 12000 + (random % 88000) + (quarter === 3 ? 18000 : 0);
  const costRate = category === 'Hardware' ? 0.82 : category === 'Support' ? 0.45 : 0.62;
  const costCents = Math.round(cents * costRate) + (index % 17 === 0 ? 30000 : 0);
  return {
    id: `S-${String(index + 1).padStart(7, '0')}`,
    region: REGIONS[(random >>> 2) % REGIONS.length],
    segment: SEGMENTS[(random >>> 7) % SEGMENTS.length],
    category,
    year: 2024 + (Math.floor(index / 4) % 2),
    quarter: `Q${quarter + 1}`,
    sales: cents / 100,
    profit: (cents - costCents) / 100,
  };
}

export function generateScaleRows(count: number): ScaleRow[] {
  if (!Number.isSafeInteger(count) || count < 0 || count > 1_000_000) {
    throw new RangeError('count must be between 0 and 1,000,000');
  }
  return Array.from({ length: count }, (_, index) => makeScaleRow(index));
}

/** Yields between chunks so the large opt-in workload does not lock controls for one long task. */
export async function generateScaleRowsAsync(count: number, chunkSize = 10_000): Promise<ScaleRow[]> {
  if (!Number.isSafeInteger(count) || count < 0 || count > 1_000_000) {
    throw new RangeError('count must be between 0 and 1,000,000');
  }
  const rows: ScaleRow[] = [];
  for (let offset = 0; offset < count; offset += chunkSize) {
    const end = Math.min(offset + chunkSize, count);
    for (let index = offset; index < end; index++) rows.push(makeScaleRow(index));
    if (end < count) await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  return rows;
}
