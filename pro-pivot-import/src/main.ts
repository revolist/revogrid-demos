import { defineCustomElements } from '@revolist/revogrid/loader';
import { PivotPlugin, type PivotConfig } from '@revolist/pivot';
import { inferFields, parseCsv, parseJson, prepareRows, type FieldSetting, type RawRow } from './import-data';
import '@revolist/revogrid-pro/styles.css';
import '@revolist/pivot/styles.css';
import './style.css';

defineCustomElements();
const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing import demo root');
app.innerHTML = `<section class="import-demo">
  <header><p class="eyebrow">RevoGrid Pivot · your data</p><h1>Turn a local file into a Pivot report</h1><p>Select CSV or JSON, inspect the first rows, choose field types and groups, then build a Pivot report. The file stays in this browser.</p></header>
  <div class="controls"><label class="file-label">Choose CSV or JSON <input id="file" type="file" accept=".csv,.json,text/csv,application/json"></label><button id="sample" type="button">Load sample</button><a href="./sample.csv" download>Download sample CSV</a><a href="https://pro.rv-grid.com/guides/pivot/" target="_blank" rel="noreferrer">Pivot guide ↗</a></div>
  <p id="status" role="status">Choose a file or load the sample to begin.</p>
  <section id="setup" hidden><div class="section-head"><h2>1. Check fields and preview</h2><span id="file-meta"></span></div>
    <div id="fields" class="fields"></div><div class="table-scroll"><table id="preview"></table></div>
    <div class="pivot-options"><label>Rows <select id="row-field"></select></label><label>Columns <select id="column-field"></select></label><label>Measure <select id="measure-field"></select></label><button id="create" type="button">Create Pivot</button></div>
  </section><section id="report" hidden><div class="section-head"><h2>2. Explore the report</h2><span id="report-meta"></span></div><div id="grid-host"></div></section>
  <p class="privacy">Files are parsed in browser memory and are never uploaded. Clear or reload this page to remove the imported data.</p>
</section>`;

const get = <T extends HTMLElement>(selector: string) => app.querySelector<T>(selector)!;
const status = get<HTMLElement>('#status');
const setup = get<HTMLElement>('#setup');
const report = get<HTMLElement>('#report');
const fieldsHost = get<HTMLElement>('#fields');
let rawRows: RawRow[] = [];
let fields: FieldSetting[] = [];
let grid: HTMLRevoGridElement | undefined;

function option(select: HTMLSelectElement, value: string, label = value) {
  const item = document.createElement('option'); item.value = value; item.textContent = label; select.append(item);
}

function updateOptions() {
  const row = get<HTMLSelectElement>('#row-field');
  const column = get<HTMLSelectElement>('#column-field');
  const measure = get<HTMLSelectElement>('#measure-field');
  const previous = [row.value, column.value, measure.value];
  for (const select of [row, column, measure]) select.replaceChildren();
  option(column, '', 'No column grouping');
  const prepared = prepareRows(rawRows, fields);
  for (const name of prepared.columns) {
    if (name !== prepared.countField) { option(row, name); option(column, name); }
    if (name === prepared.countField || fields.some(field => field.name === name && field.type === 'number')) option(measure, name);
  }
  const firstText = fields.find(field => field.type !== 'number')?.name;
  if (firstText) row.value = previous[0] && [...row.options].some(item => item.value === previous[0]) ? previous[0] : firstText;
  const firstNumeric = fields.find(field => field.type === 'number')?.name;
  column.value = previous[1] && [...column.options].some(item => item.value === previous[1]) ? previous[1] : '';
  measure.value = previous[2] && [...measure.options].some(item => item.value === previous[2]) ? previous[2] : firstNumeric ?? prepared.countField;
}

function renderFields() {
  fieldsHost.replaceChildren();
  for (const field of fields) {
    const card = document.createElement('div'); card.className = 'field-card';
    const name = document.createElement('strong'); name.textContent = field.name;
    const type = document.createElement('select'); type.setAttribute('aria-label', `${field.name} type`);
    for (const item of ['text', 'number', 'date', 'boolean']) option(type, item);
    type.value = field.type;
    const group = document.createElement('select'); group.setAttribute('aria-label', `${field.name} date group`);
    for (const item of ['none', 'year', 'quarter', 'month']) option(group, item, item === 'none' ? 'No date group' : `Group by ${item}`);
    group.value = field.dateGroup;
    const bin = document.createElement('input'); bin.type = 'number'; bin.min = '0.000001'; bin.step = 'any'; bin.placeholder = 'Bin size'; bin.setAttribute('aria-label', `${field.name} numeric bin size`);
    bin.value = field.binSize?.toString() ?? '';
    const sync = () => { group.hidden = field.type !== 'date'; bin.hidden = field.type !== 'number'; };
    type.addEventListener('change', () => { field.type = type.value as FieldSetting['type']; field.dateGroup = 'none'; field.binSize = null; group.value = 'none'; bin.value = ''; sync(); updateOptions(); });
    group.addEventListener('change', () => { field.dateGroup = group.value as FieldSetting['dateGroup']; updateOptions(); });
    bin.addEventListener('change', () => { const value = Number(bin.value); field.binSize = bin.value && Number.isFinite(value) && value > 0 ? value : null; if (bin.value && field.binSize === null) { bin.value = ''; status.textContent = 'Bin size must be greater than zero.'; } updateOptions(); });
    sync(); card.append(name, type, group, bin); fieldsHost.append(card);
  }
}

function renderPreview() {
  const table = get<HTMLTableElement>('#preview'); table.replaceChildren();
  const thead = table.createTHead(); const head = thead.insertRow();
  for (const field of fields) { const th = document.createElement('th'); th.textContent = field.name; head.append(th); }
  const body = table.createTBody();
  for (const row of rawRows.slice(0, 8)) { const tr = body.insertRow(); for (const field of fields) tr.insertCell().textContent = String(row[field.name] ?? ''); }
}

function load(rows: RawRow[], filename: string) {
  if (!rows.length) throw new Error('The file has no data rows.');
  if (rows.length > 100_000) throw new Error('This local demo accepts up to 100,000 rows.');
  rawRows = rows; fields = inferFields(rows);
  if (!fields.length) throw new Error('The file has no fields.');
  grid?.remove(); grid = undefined; report.hidden = true; setup.hidden = false;
  get<HTMLElement>('#file-meta').textContent = `${filename} · ${rows.length.toLocaleString()} rows · previewing 8`;
  renderFields(); renderPreview(); updateOptions();
  status.textContent = 'Review the inferred types and choose report fields.';
}

get<HTMLInputElement>('#file').addEventListener('change', async event => {
  const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
  try {
    if (file.size > 20_000_000) throw new Error('Choose a file under 20 MB.');
    const content = await file.text();
    load(file.name.toLowerCase().endsWith('.json') ? parseJson(content) : parseCsv(content), file.name);
  } catch (error) { status.textContent = error instanceof Error ? error.message : String(error); }
});

get<HTMLButtonElement>('#sample').addEventListener('click', () => load(parseCsv('Date,Region,Category,Sales\n2025-01-03,North,Software,1200\n2025-02-12,South,Services,850\n2025-04-19,North,Services,1430\n2025-07-05,West,Software,990\n2025-10-18,South,Software,1710'), 'sample.csv'));

get<HTMLButtonElement>('#create').addEventListener('click', () => {
  const row = get<HTMLSelectElement>('#row-field').value;
  const column = get<HTMLSelectElement>('#column-field').value;
  const measure = get<HTMLSelectElement>('#measure-field').value;
  if (!row || !measure || row === column || row === measure || column === measure) { status.textContent = 'Choose distinct row, column, and measure fields.'; return; }
  const prepared = prepareRows(rawRows, fields);
  if (measure !== prepared.countField && !fields.some(field => field.name === measure && field.type === 'number')) { status.textContent = 'Choose a numeric measure or record count.'; return; }
  const config: PivotConfig = {
    dimensions: prepared.columns.map(prop => ({ prop, name: prop })),
    rows: [row], columns: column ? [column] : [], values: [{ prop: measure, aggregator: 'sum', label: measure }],
    hasConfigurator: true, totals: { grandTotal: true, subtotals: true },
  };
  grid?.remove();
  grid = document.createElement('revo-grid');
  grid.plugins = [PivotPlugin]; grid.pivot = config; grid.readonly = true; grid.resize = true; grid.hideAttribution = true;
  get<HTMLElement>('#grid-host').append(grid);
  grid.source = prepared.rows;
  report.hidden = false;
  get<HTMLElement>('#report-meta').textContent = `${prepared.rows.length.toLocaleString()} records · ${prepared.invalid} invalid values treated as blank`;
  status.textContent = 'Pivot report created from browser-local data.';
  report.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
