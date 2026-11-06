import { createChartsRenderer } from '@revolist/charts';
import '@revolist/pivot/styles.css';
import {
  PivotPlugin,
  PivotChartsPlugin,
  PivotChartsUiPlugin,
  createPivotViews,
} from '@revolist/pivot';
import { attachResizeHandle } from '@revolist/ui';
import { ExportFilePlugin, type ColumnFilterConfig } from '@revolist/revogrid';
import {
  ViewSwitcherPlugin,
  createViewSwitcherAiAdapter,
  type ViewSwitcherConfig,
  AdvanceFilterPlugin,
  AiAssistantPlugin,
  ColumnHidePlugin,
  ColumnStretchPlugin,
  ColumnNumber,
  EventManagerPlugin,
  CellValidatePlugin,
  DataGridFormattingPlugin,
  ColumnDropdown,
  HistoryPlugin,
  FormulaPlugin,
  AutoSizeColumnPlugin,
  CellFlashPlugin,
  RowSelectPlugin,
  createRemoteAiViewExecutor,
  type AiViewSnapshot,
  type AiAssistantConfig,
} from '@revolist/revogrid-pro';
import { createLocalAiDemoActions } from './AiAssistant.actions';
import {
  aiViewColumns,
  aiViewFields,
  aiViewSuggestions,
  aiViewFieldHints,
  aiDemoStages,
  createAiDemoInterpreter,
  type AiDemoRows,
} from './AiAssistant.data';
export * from './AiAssistant.data';
export const aiDemoFormulaNames = { rowIdProp: 'id' };
export const aiDemoColumnTypes = {
  number: ColumnNumber,
  dropdown: ColumnDropdown,
};
export const aiDemoFilter: ColumnFilterConfig = {
  slider: { showRangeInputs: true },
  selection: { excelMode: 'windows', sortDirection: 'asc' },
};
export const aiViewPlugins = [
  EventManagerPlugin,
  CellValidatePlugin,
  DataGridFormattingPlugin,
  ColumnStretchPlugin,
  AdvanceFilterPlugin,
  ColumnHidePlugin,
  HistoryPlugin,
  FormulaPlugin,
  AutoSizeColumnPlugin,
  ExportFilePlugin,
  CellFlashPlugin,
  RowSelectPlugin,
  PivotPlugin,
  PivotChartsPlugin,
  PivotChartsUiPlugin,
  ViewSwitcherPlugin,
  AiAssistantPlugin,
];
interface RemoteDemoOptions {
  rowsEndpoint: string;
  onRows(rows: AiDemoRows): void;
}
function createRemoteDemoExecutor(remote: RemoteDemoOptions) {
  let view: AiViewSnapshot = { sort: [] };
  return createRemoteAiViewExecutor<AiDemoRows>({
    read: () => view,
    async load(next, { signal }) {
      const response = await fetch(remote.rowsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view: next, offset: 0, limit: 20 }),
        signal,
      });
      if (!response.ok)
        throw Object.assign(
          new Error(`Remote view failed (${response.status}).`),
          { status: response.status },
        );
      const result = await response.json();
      if (!Array.isArray(result.rows))
        throw new Error('The backend returned invalid rows.');
      return result;
    },
    commit(next, result) {
      view = next;
      remote.onRows(result.rows);
    },
  });
}
export function createAiAssistantDemoConfig(
  endpoint?: string,
  remote?: RemoteDemoOptions,
  getGrid?: () => HTMLRevoGridElement | undefined,
  mountTo?: HTMLElement,
  controlsMountTo?: HTMLElement,
): AiAssistantConfig {
  return {
    mountTo,
    ...(!remote ? { adapter: createViewSwitcherAiAdapter() } : {}),
    ...(remote
      ? { fields: aiViewFields, executor: createRemoteDemoExecutor(remote) }
      : {}),
    overrides: aiViewFieldHints,
    conversation: { maxMessages: 8, maxBytes: 8192 },
    // Public demo aggregates only; raw records and mutation previews are never disclosed.
    ...(!remote && getGrid
      ? {
          answerFromAction: {
            select: (action, result) =>
              action.name === 'grid.aggregate' ? result.data : undefined,
          } satisfies NonNullable<AiAssistantConfig['answerFromAction']>,
        }
      : {}),
    ...(!remote && getGrid ? createLocalAiDemoActions(getGrid) : {}),
    interpret: createAiDemoInterpreter(endpoint),
    ui: {
      mode: 'chat',
      controlsMountTo,
      showNewConversation: true,
      emptyState: {
        title: 'What would you like to do?',
        description:
          'Ask me to filter orders, summarize amounts, or update the grid.',
      },
      activityDurationMs: 8000,
      promptHistory: {},
      maxVisibleSuggestions: 2,
      suggestions:
        remote || !getGrid ? aiViewSuggestions : aiDemoStages[0].suggestions,
    },
  };
}

/** Use the same shared controller as ResizeExample's ResizeHandle in every framework. */
export function attachAiAssistantResize(
  container: HTMLElement,
  handle: HTMLElement,
) {
  let width = 332.8;
  let maximum = 640;
  const minimum = 280;
  const update = (next: number) => {
    width = Math.max(minimum, Math.min(maximum, next));
    container.style.setProperty('--ai-assistant-width', `${width}px`);
    handle.setAttribute('aria-valuenow', String(width));
    handle.setAttribute('aria-valuemax', String(maximum));
  };
  const dispose = attachResizeHandle(handle, () => ({
    label: 'Chat sidebar width',
    value: width,
    min: minimum,
    max: maximum,
    // The chat is on the right: dragging left increases its width.
    direction: 'rtl',
    onChange: update,
  }));
  const measure = () => {
    if (
      container.ownerDocument.defaultView?.matchMedia('(max-width: 760px)')
        .matches
    )
      return;
    maximum = Math.max(minimum, Math.min(640, container.clientWidth - 372));
    update(width);
  };
  const observer = new ResizeObserver(measure);
  observer.observe(container);
  measure();
  return () => {
    observer.disconnect();
    dispose();
  };
}

/** Configure native view owners once; the application owns the visible surfaces. */
export function createAiDemoViewSwitcher(
  gridHost: HTMLElement,
  chartHost: HTMLElement,
): ViewSwitcherConfig {
  return {
    views: [
      createPivotViews({
        pivot: {
          dimensions: [
            { prop: 'id', allowedRoles: ['rows', 'columns'] },
            {
              prop: 'region',
              name: 'Region',
              allowedRoles: ['rows', 'columns'],
            },
            {
              prop: 'status',
              name: 'Status',
              allowedRoles: ['rows', 'columns'],
            },
            {
              prop: 'country',
              name: 'Country',
              allowedRoles: ['rows', 'columns'],
            },
            {
              ...aiViewColumns.find((column) => column.prop === 'amount')!,
              allowedRoles: ['values'],
            },
          ],
          rows: ['status'],
          columns: [],
          values: [{ prop: 'amount', aggregator: 'sum' }],
        },
        chart: {
          container: chartHost,
          chartType: 'groupedColumn',
          controls: 'standard',
        },
      }),
    ],
    onChange(state) {
      gridHost.hidden = false;
      chartHost.hidden = (state.pendingView ?? state.view) !== 'chart';
    },
  };
}

export const aiDemoCharts = { renderer: createChartsRenderer() };

/** Framework adapters call aftergridinit; all controls and cleanup belong to the plugin. */
export async function mountAiDemoViewControls(
  grid: HTMLRevoGridElement,
  host: HTMLElement,
) {
  grid.pivotChartsUi = {
    miniMode: true,
    resizable: true,
    settingsMode: 'replace',
    toolbarMode: 'overlay',
  };
  const plugins = await grid.getPlugins();
  const switcher = plugins.find(
    (plugin) => plugin instanceof ViewSwitcherPlugin,
  ) as ViewSwitcherPlugin | undefined;
  return switcher?.mount(host, { showViews: false, label: 'Grid view' });
}
