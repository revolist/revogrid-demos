export type CsvRow = Record<string, string>;

/** Small RFC4180-style adapter; surplus cells stay in the final notes field. */
export function parseCsv(input: string): CsvRow[] {
  const lines = input.trim().split(/\r?\n/);
  const headers = lines.shift()!.split(',');
  return lines.map((line) => {
    const values: string[] = [];
    let value = '';
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"') {
        if (quoted && line[index + 1] === '"') {
          value += char;
          index += 1;
        } else quoted = !quoted;
      } else if (char === ',' && !quoted) {
        values.push(value);
        value = '';
      } else value += char;
    }
    values.push(value);
    if (values.length > headers.length) {
      values.splice(headers.length - 1, values.length - headers.length + 1, values.slice(headers.length - 1).join(','));
    }
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}
