import { createServer } from 'node:http';
import { ClientPivotEngineAdapter } from '@revolist/pivot';
import { generateScaleRows } from '../src/data.ts';

const PORT = Number(process.env.PIVOT_SCALE_PORT || 4174);
const VIEW_ID = 'scale-sales-v1';
const FIELDS_VERSION = 'scale-sales-fields-v1';
const FIELDS = new Set(['region', 'segment', 'category', 'year', 'quarter', 'sales', 'profit']);
const MEASURES = new Set(['sales', 'profit']);
const rows = generateScaleRows(100_000);
const baseConfig = {
  dimensions: [...FIELDS].map((prop) => ({ prop })),
  rows: ['region', 'segment'],
  columns: ['year', 'quarter'],
  values: [{ prop: 'sales', aggregator: 'sum' }],
  totals: { grandTotal: true, subtotals: true },
  collapsed: true,
  columnCollapse: { collapsed: true },
};

function send(response, code, body) {
  response.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(body));
}

function validate(request) {
  if (request.viewId !== VIEW_ID || request.fieldsVersion !== FIELDS_VERSION) throw new Error('Unknown view or field version');
  const options = request.loadOptions || {};
  for (const axis of ['rows', 'columns']) {
    for (const field of options[axis] || []) {
      if (!FIELDS.has(field.selector)) throw new Error(`Unknown ${axis} field`);
      if (field.groupInterval) throw new Error('Grouping intervals are not enabled in this reference');
    }
  }
  for (const summary of options.totalSummary || []) {
    if (!MEASURES.has(summary.selector) || summary.summaryType !== 'sum') throw new Error('Only sum(sales) and sum(profit) are enabled');
    if (summary.calculation) throw new Error('Calculated measures are not enabled');
  }
  if (options.filter || options.having || options.sort) throw new Error('Filters, result filters, and sorting are not enabled in this reference');
  if (!request.viewport?.rowAxis || !request.viewport?.columnAxis) throw new Error('Missing axis viewport');
  for (const axis of [request.viewport.rowAxis, request.viewport.columnAxis]) {
    if (!Number.isSafeInteger(axis.offset) || axis.offset < 0 || !Number.isSafeInteger(axis.limit) || axis.limit < 1 || axis.limit > 100) {
      throw new Error('Axis offset or limit is outside the supported range');
    }
  }
  return {
    ...baseConfig,
    rows: options.rows?.map((field) => field.selector) || baseConfig.rows,
    columns: options.columns?.map((field) => field.selector) || baseConfig.columns,
    values: options.totalSummary?.map((summary) => ({ prop: summary.selector, aggregator: summary.summaryType })) || baseConfig.values,
    collapsed: request.uiState?.collapsedByDefault ?? baseConfig.collapsed,
  };
}

const server = createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/api/health') {
    send(response, 200, { status: 'ok', rows: rows.length, engine: 'Node in-memory Pivot adapter' });
    return;
  }
  if (request.method !== 'POST' || request.url !== '/api/pivot/load') {
    send(response, 404, { error: 'Endpoint not found' });
    return;
  }
  try {
    let text = '';
    for await (const chunk of request) {
      text += chunk;
      if (text.length > 64_000) throw new Error('Request too large');
    }
    const payload = JSON.parse(text);
    const config = validate(payload);
    const adapter = new ClientPivotEngineAdapter(config, rows);
    const result = await adapter.load(payload);
    send(response, 200, result);
  } catch (error) {
    send(response, 400, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Pivot scale reference backend: http://127.0.0.1:${PORT} (100,000 server-owned rows)`);
});
