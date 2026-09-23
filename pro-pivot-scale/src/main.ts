import { defineCustomElements } from '@revolist/revogrid/loader';
import {
  HttpPivotRemoteStore,
  PIVOT_MODEL_CHANGED_EVENT,
  PivotPlugin,
  type PivotConfig,
  type PivotModelChangedEventDetail,
} from '@revolist/pivot';
import { generateScaleRowsAsync } from './data';
import { createScalePivotConfig, FIELDS_VERSION, VIEW_ID } from './pivot-config';
import '@revolist/revogrid-pro/styles.css';
import '@revolist/pivot/styles.css';
import './style.css';

defineCustomElements();

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing demo root');

app.innerHTML = `
  <section class="scale-demo" aria-label="Pivot at scale">
    <header class="scale-header">
      <p class="eyebrow">Pivot at scale · synthetic USD transactions</p>
      <h1>Explore how workload size affects a Pivot report</h1>
      <p>Choose a workload, inspect measured stages, then change the row hierarchy. Results describe this browser and device only.</p>
    </header>
    <div class="scale-controls" role="group" aria-label="Workload">
      <button type="button" data-count="10000">10K rows</button>
      <button type="button" data-count="100000">100K rows</button>
      <button type="button" data-count="1000000" title="Opt in: generation and Pivot processing may use substantial memory">1M rows · opt in</button>
      <button type="button" data-action="interaction">Switch row hierarchy</button>
      <button type="button" data-action="remote">Remote adapter</button>
    </div>
    <div class="scale-meta" aria-live="polite">
      <p id="status">Preparing 10K rows…</p>
      <dl>
        <div><dt>Workload</dt><dd id="workload">—</dd></div>
        <div><dt>Generation</dt><dd id="generation">—</dd></div>
        <div><dt>Pivot apply</dt><dd id="aggregation">—</dd></div>
        <div><dt>Paint estimate</dt><dd id="render">—</dd></div>
        <div><dt>Layout interaction</dt><dd id="interaction">—</dd></div>
      </dl>
      <p id="environment"></p>
      <p class="scale-note">Pivot apply measures source/config assignment to the public model-change event; it includes any queueing and is not a pure aggregation benchmark. Paint estimate is the next two animation frames, not a browser render profiler.</p>
    </div>
    <div id="grid-host" class="grid-host"></div>
    <p class="scale-footer">Remote mode connects to the Node reference backend at <code>/api/pivot/load</code>. It processes 100K rows in server memory and sends only analytical windows to this grid. It is an integration example, not a database-scale claim.</p>
  </section>`;

const status = app.querySelector<HTMLElement>('#status')!;
const gridHost = app.querySelector<HTMLElement>('#grid-host')!;
const output = (id: string, value: string) => { app.querySelector<HTMLElement>(`#${id}`)!.textContent = value; };
const formatMs = (value: number) => `${value.toFixed(1)} ms`;
const formatCount = (value: number) => new Intl.NumberFormat('en-US').format(value);
const platform = navigator.platform || 'Unknown platform';
const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
output('environment', `${navigator.userAgent} · ${platform} · ${navigator.hardwareConcurrency || 'unknown'} logical cores · ${deviceMemory ? `${deviceMemory} GB memory hint` : 'memory hint unavailable'}`);

let grid: HTMLRevoGridElement | undefined;
let currentCount = 0;
let generation = 0;
let remote = false;
let layout = false;
let runToken = 0;

const nextPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

function makeGrid(config: PivotConfig): HTMLRevoGridElement {
  grid?.remove();
  const next = document.createElement('revo-grid');
  next.className = 'scale-grid';
  next.plugins = [PivotPlugin];
  next.pivot = config;
  next.readonly = true;
  next.resize = true;
  next.hideAttribution = true;
  gridHost.append(next);
  grid = next;
  return next;
}

function waitForModel(next: HTMLRevoGridElement, engine: 'client' | 'server'): Promise<number> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      next.removeEventListener(PIVOT_MODEL_CHANGED_EVENT, onModel);
      reject(new Error('Pivot model event timed out after 60 seconds'));
    }, 60_000);
    function onModel(event: Event) {
      if ((event as CustomEvent<PivotModelChangedEventDetail>).detail?.engine !== engine) return;
      window.clearTimeout(timeout);
      next.removeEventListener(PIVOT_MODEL_CHANGED_EVENT, onModel);
      resolve(performance.now());
    }
    next.addEventListener(PIVOT_MODEL_CHANGED_EVENT, onModel);
  });
}

async function runClient(count: number) {
  const token = ++runToken;
  remote = false;
  layout = false;
  status.textContent = `Generating ${formatCount(count)} rows…`;
  output('workload', `${formatCount(count)} client rows`);
  output('generation', '…');
  output('aggregation', '…');
  output('render', '…');
  output('interaction', '—');
  for (const button of app!.querySelectorAll<HTMLButtonElement>('button')) button.disabled = true;
  try {
    const generationStart = performance.now();
    const rows = await generateScaleRowsAsync(count);
    if (token !== runToken) return;
    generation = performance.now() - generationStart;
    output('generation', formatMs(generation));
    status.textContent = 'Applying Pivot configuration…';
    await nextPaint();
    const next = makeGrid(createScalePivotConfig());
    const changed = waitForModel(next, 'client');
    const applyStart = performance.now();
    next.source = rows;
    const modelTime = await changed;
    output('aggregation', formatMs(modelTime - applyStart));
    await nextPaint();
    output('render', formatMs(performance.now() - modelTime));
    currentCount = count;
    status.textContent = `${formatCount(count)} rows ready. Change the row hierarchy to measure a subsequent interaction.`;
  } catch (error) {
    status.textContent = `Could not finish workload: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    for (const button of app!.querySelectorAll<HTMLButtonElement>('button')) button.disabled = false;
  }
}

async function switchLayout() {
  if (!grid || !currentCount || remote) {
    status.textContent = 'Load a client workload before measuring a layout interaction.';
    return;
  }
  const config = createScalePivotConfig();
  layout = !layout;
  config.rows = layout ? ['category', 'region'] : ['region', 'segment'];
  output('interaction', '…');
  try {
    const changed = waitForModel(grid, 'client');
    const start = performance.now();
    grid.pivot = config;
    const modelTime = await changed;
    await nextPaint();
    output('interaction', `${formatMs(modelTime - start)} apply + ${formatMs(performance.now() - modelTime)} paint estimate`);
    status.textContent = `Rows: ${config.rows.join(' → ')}.`;
  } catch (error) {
    status.textContent = `Layout change failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function runRemote() {
  ++runToken;
  remote = true;
  currentCount = 0;
  status.textContent = 'Checking the Node backend…';
  output('workload', '100K server-owned rows');
  output('generation', 'Server startup (not measured here)');
  output('aggregation', '…');
  output('render', '…');
  output('interaction', '—');
  try {
    const health = await fetch('/api/health');
    if (!health.ok) throw new Error(`Backend health returned ${health.status}`);
    status.textContent = 'Loading a 100K-row analytical window from the backend…';
    const config = createScalePivotConfig();
    config.hasConfigurator = false;
    config.engine = {
      mode: 'server',
      remoteStore: new HttpPivotRemoteStore({ baseUrl: '', fetchImpl: (input, init) => fetch(input, init) }),
      viewId: VIEW_ID,
      fieldsVersion: FIELDS_VERSION,
      rowAxis: { offset: 0, limit: 30 },
      columnAxis: { offset: 0, limit: 8 },
    };
    const next = makeGrid(config);
    const changed = waitForModel(next, 'server');
    const start = performance.now();
    next.source = [];
    const modelTime = await changed;
    output('aggregation', `${formatMs(modelTime - start)} network + server + apply`);
    await nextPaint();
    output('render', formatMs(performance.now() - modelTime));
    status.textContent = 'Remote analytical window loaded from the Node backend.';
  } catch (error) {
    status.textContent = `Remote backend unavailable: ${error instanceof Error ? error.message : String(error)}. Run pnpm backend in a second terminal.`;
  }
}

app.querySelectorAll<HTMLButtonElement>('[data-count]').forEach((button) => {
  button.addEventListener('click', () => void runClient(Number(button.dataset.count)));
});
app.querySelector<HTMLButtonElement>('[data-action="interaction"]')!.addEventListener('click', () => void switchLayout());
app.querySelector<HTMLButtonElement>('[data-action="remote"]')!.addEventListener('click', () => void runRemote());

void runClient(10_000);
