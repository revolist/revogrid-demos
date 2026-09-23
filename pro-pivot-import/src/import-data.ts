export type FieldType = 'text' | 'number' | 'date' | 'boolean';
export type RawRow = Record<string, string | number | boolean | null>;
export type FieldSetting = { name: string; type: FieldType; dateGroup: 'none' | 'year' | 'quarter' | 'month'; binSize: number | null };

export function parseCsv(input: string): RawRow[] {
  const text = input.replace(/^\uFEFF/, '');
  const records: string[][] = [];
  let record: string[] = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { value += '"'; i++; }
      else if (ch === '"') quoted = false;
      else value += ch;
    } else if (ch === '"') {
      if (value) throw new Error('Invalid CSV quote.');
      quoted = true;
    } else if (ch === ',') { record.push(value); value = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      record.push(value); value = '';
      if (record.some(cell => cell !== '')) records.push(record);
      record = [];
    } else value += ch;
  }
  if (quoted) throw new Error('CSV has an unclosed quoted field.');
  record.push(value);
  if (record.some(cell => cell !== '')) records.push(record);
  const [headers, ...rows] = records;
  if (!headers?.length || headers.some(h => !h.trim()) || new Set(headers).size !== headers.length) throw new Error('CSV needs unique, nonempty column names.');
  return rows.map((cells, index) => {
    if (cells.length !== headers.length) throw new Error(`CSV row ${index + 2} has ${cells.length} cells; expected ${headers.length}.`);
    return Object.fromEntries(headers.map((header, cell) => [header, cells[cell]]));
  });
}

export function parseJson(input: string): RawRow[] {
  const data: unknown = JSON.parse(input);
  if (!Array.isArray(data) || !data.length) throw new Error('JSON must be a nonempty array of objects.');
  return data.map((row, index) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error(`JSON row ${index + 1} must be an object.`);
    const entries = Object.entries(row);
    if (entries.some(([key, value]) => !key || !(value === null || ['string', 'number', 'boolean'].includes(typeof value)))) {
      throw new Error(`JSON row ${index + 1} must contain scalar fields only.`);
    }
    return row as RawRow;
  });
}

const isoDate = /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?$/;
function dateParts(value: unknown): { year: number; month: number } | null {
  if (typeof value !== 'string') return null;
  const match = isoDate.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day ? { year, month } : null;
}

export function inferFields(rows: RawRow[]): FieldSetting[] {
  const names = [...new Set(rows.flatMap(row => Object.keys(row)))];
  return names.map(name => {
    const values = rows.map(row => row[name]).filter(value => value !== null && value !== undefined && value !== '');
    const type: FieldType = values.length && values.every(value => typeof value === 'number' || (typeof value === 'string' && Number.isFinite(Number(value)))) ? 'number'
      : values.length && values.every(value => typeof value === 'boolean' || value === 'true' || value === 'false') ? 'boolean'
      : values.length && values.every(value => dateParts(value)) ? 'date' : 'text';
    return { name, type, dateGroup: 'none', binSize: null };
  });
}

export function prepareRows(rows: RawRow[], fields: FieldSetting[]): { rows: RawRow[]; columns: string[]; countField: string; invalid: number } {
  const columns = fields.map(field => field.name);
  const taken = new Set(columns);
  const derived = new Map<string, string>();
  for (const field of fields) {
    const suffix = field.type === 'date' && field.dateGroup !== 'none' ? field.dateGroup : field.type === 'number' && field.binSize ? `bin_${field.binSize}` : '';
    if (!suffix) continue;
    let name = `${field.name} (${suffix})`;
    for (let i = 2; taken.has(name); i++) name = `${field.name} (${suffix} ${i})`;
    taken.add(name); columns.push(name); derived.set(field.name, name);
  }
  let countField = 'Record count';
  for (let i = 2; taken.has(countField); i++) countField = `Record count (${i})`;
  columns.push(countField);
  let invalid = 0;
  const prepared = rows.map(row => {
    const output: RawRow = {};
    for (const field of fields) {
      const raw = row[field.name];
      let value: string | number | boolean | null = raw ?? null;
      if (raw === '' || raw === undefined) value = null;
      else if (field.type === 'number') {
        const parsed = Number(raw);
        value = Number.isFinite(parsed) ? parsed : null;
        if (value === null) invalid++;
      } else if (field.type === 'boolean') {
        value = raw === true || raw === 'true' ? true : raw === false || raw === 'false' ? false : null;
        if (value === null) invalid++;
      } else if (field.type === 'date' && !dateParts(raw)) { value = null; invalid++; }
      else if (field.type === 'text') value = String(raw);
      output[field.name] = value;
      const derivedName = derived.get(field.name);
      if (derivedName) {
        if (field.type === 'date') {
          const parts = dateParts(raw);
          output[derivedName] = parts ? field.dateGroup === 'year' ? parts.year : field.dateGroup === 'quarter' ? `${parts.year} Q${Math.ceil(parts.month / 3)}` : `${parts.year}-${String(parts.month).padStart(2, '0')}` : null;
        } else if (field.type === 'number' && typeof value === 'number' && field.binSize) {
          const start = Math.floor(value / field.binSize) * field.binSize;
          output[derivedName] = `${start}–<${start + field.binSize}`;
        } else output[derivedName] = null;
      }
    }
    output[countField] = 1;
    return output;
  });
  return { rows: prepared, columns, countField, invalid };
}
