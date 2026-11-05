import { defineCustomElements } from '@revolist/revogrid/loader';
import {
  attachAiAssistantResize,
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
  controlsHost.className = 'ai-view-demo__toolbar';
  controlsHost.setAttribute('role', 'toolbar');
  controlsHost.setAttribute('aria-label', 'Grid controls');
  const grid = document.createElement('revo-grid');
  grid.columns = options.rowsEndpoint
    ? aiViewColumns.map((column) => ({
        ...column,
        filter: false,
        sortable: false,
      }))
    : aiViewColumns;
  grid.plugins = aiViewPlugins;
  grid.filter = true;
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
  gridHost.append(controlsHost, grid);
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
