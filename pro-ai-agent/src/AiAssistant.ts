import { defineCustomElements } from '@revolist/revogrid/loader';
import {
  attachAiAssistantResize,
  createAiDemoViewSwitcher,
  mountAiDemoViewControls,
  aiDemoCharts,
  aiDemoColumnTypes,
  aiDemoFilter,
  aiViewColumns,
  aiViewPlugins,
  aiDemoFormulaNames,
  createAiViewRows,
  createAiAssistantDemoConfig,
} from './AiAssistant.shared';
import './ai-assistant.scss';

defineCustomElements();
export function load(
  parentSelector: string,
  rows?: ReturnType<typeof createAiViewRows>,
  options: { endpoint?: string; rowsEndpoint?: string } = {},
) {
  const container = document.createElement('div');
  container.className = 'ai-view-demo';
  const assistantHost = document.createElement('aside');
  assistantHost.className = 'ai-view-demo__assistant';
  assistantHost.setAttribute('aria-label', 'AI assistant');
  const controlsHost = document.createElement('div');
  const toolbar = document.createElement('div');
  toolbar.className = 'ai-view-demo__toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Grid controls');
  const grid = document.createElement('revo-grid');
  grid.columns = options.rowsEndpoint
    ? aiViewColumns.map((column) => ({
        ...column,
        filter: false,
        sortable: false,
      }))
    : aiViewColumns;
  grid.plugins = aiViewPlugins;
  grid.columnTypes = aiDemoColumnTypes;
  grid.stretch = 'all';
  grid.filter = options.rowsEndpoint ? true : aiDemoFilter;
  grid.formulaNames = aiDemoFormulaNames;
  grid.theme = 'compact';
  grid.hideAttribution = true;
  grid.aiAssistant = createAiAssistantDemoConfig(
    options.endpoint,
    options.rowsEndpoint
      ? {
          rowsEndpoint: options.rowsEndpoint,
          onRows: (next) => {
            grid.source = next;
          },
        }
      : undefined,
    () => grid,
    assistantHost,
    controlsHost,
  );
  const gridHost = document.createElement('div');
  gridHost.className = 'ai-view-demo__grid';
  const viewControls = document.createElement('div');
  toolbar.append(controlsHost, viewControls);
  const gridSurface = document.createElement('div');
  gridSurface.className = 'ai-view-demo__surface';
  gridSurface.append(grid);
  const chartSurface = document.createElement('div');
  chartSurface.className = 'ai-view-demo__chart'; chartSurface.hidden = true;
  grid.pivotCharts = aiDemoCharts;
  if (!options.rowsEndpoint) {
    grid.viewSwitcher = createAiDemoViewSwitcher(gridSurface, chartSurface);
    grid.addEventListener('aftergridinit', () => { void mountAiDemoViewControls(grid, viewControls); }, { once: true });
  }
  gridHost.append(toolbar, gridSurface, chartSurface);
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'rv-resize-handle ai-view-demo__resize';
  container.append(gridHost, resizeHandle, assistantHost);
  document.querySelector(parentSelector)!.append(container);
  const disposeResize = attachAiAssistantResize(container, resizeHandle);
  grid.source = options.rowsEndpoint
    ? []
    : rows?.length
      ? rows
      : createAiViewRows();
  return () => {
    disposeResize();
    grid.remove();
    container.remove();
  };
}
