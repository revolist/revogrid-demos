import { defineCustomElements } from '@revolist/revogrid/loader';
import { getHRColumnsCount, getHRData, getHRVisibleColumnsCount, HR_COMPANY_OPTIONS, HR_OPTIONS } from './sys-data/hr.data';
import type { HRGenerationProgress } from './sys-data/hr.data.generator';
import { getBaseHRColumns, getExtraHRColumns, withHRShortDate } from './sys-data/hr.columns';
import { renderHrColorPill } from './hr-color-select';
import { renderHrCompanyCell } from './hr-company-avatar';
import { renderHrAgeCell } from './hr-age-indicator';
import { getHRLoadingOverlayHtml } from './hr-loading';
import { getInitialHRTheme, HR_THEME_DEFINITIONS, HR_THEME_OPTIONS } from './hr-themes';
import {
  createHRPerformanceMonitor,
  formatDuration,
  formatFrameRate,
  formatMemory,
  getHRMetricTooltipId,
  HR_PERFORMANCE_METRICS,
  type HRPerformanceMetricKey,
} from './hr-performance';
import {
  applyHRWorkspaceToColumns,
  createHRWorkspaceController,
  getHRWorkspaceRowCount,
  HR_DEFAULT_ROW_COUNT,
  loadHRWorkspace,
  type HRWorkspaceState,
} from './hr-workspace';
import './hr.css';

defineCustomElements();

function metricLabel(metric: HRPerformanceMetricKey) {
  const definition = HR_PERFORMANCE_METRICS[metric];
  const tooltipId = getHRMetricTooltipId(metric);
  return `<div class="hr-performance-label">
    <span>${definition.label}</span>
    <span class="hr-metric-help">
      <button type="button" class="hr-metric-help-trigger" aria-label="About ${definition.label}" aria-describedby="${tooltipId}">?</button>
      <span class="hr-metric-tooltip" id="${tooltipId}" role="tooltip">${definition.description}</span>
    </span>
  </div>`;
}

export async function load(parentSelector: string, options: { isDark?: boolean } = {}) {
  const { isDark } = options;
  const parent = document.querySelector(parentSelector);
  if (!parent) return;

  let workspaceState: HRWorkspaceState = loadHRWorkspace();
  let currentSize = getHRWorkspaceRowCount(workspaceState, HR_OPTIONS.map(option => option.value));
  let rows: any[] = [];
  let loading = false;
  let loadingLabel = 'Preparing rows…';
  const defaultTheme = getInitialHRTheme(isDark);
  let currentTheme = HR_THEME_OPTIONS.some(option => option.value === workspaceState.theme)
    ? workspaceState.theme!
    : defaultTheme;
  let activeController: AbortController | undefined;
  let progress: HRGenerationProgress = { loaded: 0, total: currentSize };

  const container = document.createElement('div');
  container.className = 'hr-demo grow h-full flex flex-col';
  container.innerHTML = `
    <div class="hr-toolbar">
      <span class="text-sm font-medium">Data Source</span>
      <select class="hr-select" id="size-select">
        ${HR_OPTIONS.map(opt => `<option value="${opt.value}"${opt.value === currentSize ? ' selected' : ''}>${opt.label}</option>`).join('')}
      </select>
      <span class="text-sm font-medium">Theme</span>
      <select class="hr-select" id="theme-select">
        ${HR_THEME_OPTIONS.map(opt => `<option value="${opt.value}"${opt.value === currentTheme ? ' selected' : ''}>${opt.label}</option>`).join('')}
      </select>
      <button type="button" class="hr-button" id="save-view">Save view</button>
      <button type="button" class="hr-button hr-button-secondary" id="reset-view">Reset view</button>
      <span class="hr-workspace-status" id="workspace-status">${Object.keys(workspaceState).length ? 'Saved locally' : 'View not saved'}</span>
      <div id="loading-indicator" class="text-sm opacity-50 animate-pulse ml-2" style="display: none;"></div>
    </div>
    <div class="hr-grid-wrapper flex-1 min-h-0" id="grid-container"></div>
    <section class="hr-performance" aria-label="Browser performance metrics">
      <div class="hr-performance-heading"><strong>Performance</strong><span>Measured live in this browser</span></div>
      <div class="hr-performance-metric">${metricLabel('preparation')}<strong data-metric="preparation">N/A</strong></div>
      <div class="hr-performance-metric">${metricLabel('grid')}<strong data-metric="grid">N/A</strong></div>
      <div class="hr-performance-metric">${metricLabel('scroll')}<strong data-metric="scroll">Scroll to measure</strong></div>
      <div class="hr-performance-metric">${metricLabel('memory')}<strong data-metric="memory">N/A</strong></div>
      <div class="hr-performance-metric">${metricLabel('dataset')}<strong data-metric="dataset">0 × 0</strong></div>
    </section>
  `;
  parent.appendChild(container);

  const gridContainer = container.querySelector('#grid-container')!;
  const select = container.querySelector('#size-select') as HTMLSelectElement;
  const themeSelect = container.querySelector('#theme-select') as HTMLSelectElement;
  const loadingIndicator = container.querySelector('#loading-indicator') as HTMLElement;
  const saveButton = container.querySelector('#save-view') as HTMLButtonElement;
  const resetButton = container.querySelector('#reset-view') as HTMLButtonElement;
  const workspaceStatus = container.querySelector('#workspace-status') as HTMLElement;
  let overlayElement: HTMLElement | undefined;

  const grid = document.createElement('revo-grid') as HTMLRevoGridElement;
  grid.className = 'hr-scale-grid grow h-full w-full';
  grid.style.height = '100%';
  grid.style.width = '100%';
  grid.themeDefinitions = HR_THEME_DEFINITIONS;
  grid.theme = currentTheme;
  grid.hideAttribution = true;
  grid.canMoveColumns = true;
  grid.rowSize = 36;
  grid.filter = workspaceState.filter ?? true;
  grid.sorting = workspaceState.sorting;

  const { BasePlugin } = await import('@revolist/revogrid');
  grid.plugins = [
    class HRPlugin extends BasePlugin {
      constructor(r: any, p: any) {
        super(r, p);
        this.addEventListener('rowdragstart', (e: any) => {
          if (e.detail.model) {
            e.detail.text = e.detail.model['name'];
          }
        });
      }
    }
  ];
  gridContainer.appendChild(grid);

  const workspaceController = createHRWorkspaceController(grid, workspaceState, () => {
    workspaceStatus.textContent = 'Unsaved changes';
  });

  const performanceMonitor = createHRPerformanceMonitor(grid, (state) => {
    (container.querySelector('[data-metric="preparation"]') as HTMLElement).textContent = formatDuration(state.preparationTime);
    (container.querySelector('[data-metric="grid"]') as HTMLElement).textContent = formatDuration(state.gridRenderTime);
    (container.querySelector('[data-metric="scroll"]') as HTMLElement).textContent = formatFrameRate(state.scrollFps);
    (container.querySelector('[data-metric="memory"]') as HTMLElement).textContent = formatMemory(state.memoryUsage?.usedJSHeapSize);
    (container.querySelector('[data-metric="dataset"]') as HTMLElement).textContent = `${state.rowCount.toLocaleString()} × ${state.columnCount}`;
  });

  // Column types
  const [DateCol, NumeralCol, SelectCol] = await Promise.all([
    import('@revolist/revogrid-column-date'),
    import('@revolist/revogrid-column-numeral'),
    import('@revolist/revogrid-column-select')
  ]);

  grid.columnTypes = {
    date: withHRShortDate(new DateCol.default()),
    number: new NumeralCol.default(),
    select: new SelectCol.default(),
    colorSelect: new SelectCol.default()
  };

  const updateColumns = () => {
    const baseCols = getBaseHRColumns(HR_COMPANY_OPTIONS);

    // Apply TS-style templates (h function)
    const companyCol = (baseCols[0] as any).children[1];
    companyCol.cellTemplate = renderHrCompanyCell;

    const personalGroup = baseCols[1] as any;
    const ageCol = personalGroup.children[0];
    ageCol.cellTemplate = renderHrAgeCell;

    const eyesCol = personalGroup.children[2];
    eyesCol.cellTemplate = (h: any, props: any) => renderHrColorPill(h, props.value);

    grid.columns = applyHRWorkspaceToColumns(
      [...baseCols, ...getExtraHRColumns(getHRColumnsCount(currentSize))],
      workspaceState,
    );
  };

  const loadRows = async (size: number) => {
    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;
    loading = true;
    loadingLabel = `Preparing ${size.toLocaleString()} rows…`;
    progress = { loaded: 0, total: size };
    const preparationStartedAt = performance.now();
    loadingIndicator.textContent = loadingLabel;
    loadingIndicator.style.display = 'inline-block';
    select.disabled = true;
    renderLoadingOverlay();
    try {
      const data = await getHRData(size, {
        signal: controller.signal,
        onProgress: nextProgress => {
          progress = nextProgress;
          renderLoadingOverlay();
        },
      });
      performanceMonitor.setPreparationResult(
        performance.now() - preparationStartedAt,
        size,
        getHRVisibleColumnsCount(size),
      );
      loadingLabel = 'Rendering RevoGrid…';
      loadingIndicator.textContent = loadingLabel;
      renderLoadingOverlay();
      await performanceMonitor.measureGridUpdate(() => {
        rows = data;
        grid.source = rows;
        updateColumns();
      });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        throw error;
      }
    } finally {
      if (activeController === controller) {
        loading = false;
        activeController = undefined;
        loadingIndicator.style.display = 'none';
        select.disabled = false;
        renderLoadingOverlay();
      }
    }
  };

  const renderLoadingOverlay = () => {
    if (!loading) {
      overlayElement?.remove();
      overlayElement = undefined;
      return;
    }

    if (!overlayElement) {
      overlayElement = document.createElement('div');
      gridContainer.appendChild(overlayElement);
    }
    overlayElement.outerHTML = getHRLoadingOverlayHtml(progress, loadingLabel);
    overlayElement = gridContainer.querySelector('.hr-loading-overlay') as HTMLElement | undefined;
  };

  select.addEventListener('change', (e) => {
    currentSize = parseInt((e.target as HTMLSelectElement).value, 10);
    workspaceStatus.textContent = 'Unsaved changes';
    loadRows(currentSize);
  });

  themeSelect.addEventListener('change', (event) => {
    currentTheme = (event.target as HTMLSelectElement).value;
    grid.theme = currentTheme;
    workspaceStatus.textContent = 'Unsaved changes';
  });

  saveButton.addEventListener('click', async () => {
    workspaceState = await workspaceController.save({ rowCount: currentSize, theme: currentTheme });
    workspaceStatus.textContent = 'Saved locally';
  });

  resetButton.addEventListener('click', () => {
    workspaceController.clear();
    workspaceState = {};
    currentSize = HR_DEFAULT_ROW_COUNT;
    currentTheme = defaultTheme;
    select.value = String(currentSize);
    themeSelect.value = currentTheme;
    grid.theme = currentTheme;
    grid.filter = { collection: {} };
    grid.sorting = undefined;
    workspaceStatus.textContent = 'View reset';
    loadRows(currentSize);
  });

  // Initial load
  loadRows(currentSize);

  return () => {
    activeController?.abort();
    workspaceController.destroy();
    performanceMonitor.destroy();
    container.remove();
  };
}
