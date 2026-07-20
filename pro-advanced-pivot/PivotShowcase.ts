import { defineCustomElements } from '@revolist/revogrid/loader';
import { filterPivotSource, type PivotConfig } from '@revolist/revogrid-enterprise';
import './financial-pivot-header.scss';
import { currentTheme } from '../composables/useRandomData';
import {
  FINANCIAL_COLUMNS,
  FINANCIAL_COLUMN_TYPES,
  FINANCIAL_MULTI_ROW_HEADER,
  FINANCIAL_SHOWCASE_PLUGINS,
  applyFinancialPivotOptions,
  createFinancialPreset,
  getFinancialKpis,
  resolveFinancialRows,
  type FinancialPresetId,
} from './financial.pivot';
import {
  FINANCIAL_PIVOT_CONFIGURATOR_EVENT,
  FINANCIAL_PIVOT_EXPANDED_EVENT,
  FINANCIAL_PIVOT_PRESET_EVENT,
  FINANCIAL_PIVOT_RESET_EVENT,
  createFinancialPivotHeader,
} from './financial-pivot-header';
import {
  createFinancialPivotGuidance,
} from './financial-pivot-guidance';

defineCustomElements();

const isSmallScreen = () => window.matchMedia('(max-width: 767px)').matches;

export function load(parentSelector: string, rows: any[] | { isDark?: boolean } = []) {
  const parent = document.querySelector(parentSelector);
  if (!parent) return;

  const { isDark } = currentTheme();
  const data = resolveFinancialRows(Array.isArray(rows) ? rows : undefined);
  let pivotConfig: PivotConfig = createFinancialPreset();
  let activePreset: FinancialPresetId = 'sales';
  let configuratorVisible = !isSmallScreen();
  let expanded = false;

  const container = document.createElement('div');
  container.className = 'financial-pivot-showcase grow flex flex-col gap-2 h-full p-2 box-border';

  const header = createFinancialPivotHeader({
    activePreset,
    configuratorVisible,
    expanded,
    kpis: getFinancialKpis(
      filterPivotSource(data, pivotConfig),
      activePreset,
    ),
  });

  const guidance = createFinancialPivotGuidance(pivotConfig);

  const scrollContainer = document.createElement('div');
  scrollContainer.className = 'grow min-h-0 overflow-auto';
  const gridContainer = document.createElement('div');
  gridContainer.className = 'pivot-grid-container h-full overflow-hidden';
  let grid: any;
  const getFilteredData = () => filterPivotSource(data, pivotConfig);

  function applyPivotOptions() {
    grid.pivot = applyFinancialPivotOptions(
      pivotConfig,
      data,
      configuratorVisible,
    );
  }

  function refreshLayout() {
    header.state = {
      activePreset,
      configuratorVisible,
      expanded,
      kpis: getFinancialKpis(
        getFilteredData(),
        activePreset,
      ),
    };
    guidance.config = pivotConfig;
    gridContainer.style.minWidth = configuratorVisible ? '920px' : '680px';
    Object.assign(container.style, expanded
      ? { position: 'fixed', inset: '8px', zIndex: '1000', background: 'var(--financial-pivot-expanded-background)' }
      : { position: '', inset: '', zIndex: '', background: '' });
  }

  const resetDemo = () => {
    pivotConfig = createFinancialPreset();
    activePreset = 'sales';
    configuratorVisible = !isSmallScreen();
    expanded = false;
    guidance.visible = true;
    refreshLayout();
    replacePivotOptions();
  };

  const onPivotConfigUpdate = (event: CustomEvent<PivotConfig>) => {
    pivotConfig = event.detail || createFinancialPreset();
    refreshLayout();
  };
  function initializeGrid() {
    grid = document.createElement('revo-grid') as any;
    grid.className = 'overflow-hidden skip-style h-full min-h-0 cell-border';
    Object.assign(grid, {
      hideAttribution: true,
      range: true,
      resize: true,
      filter: true,
      multiRowHeader: FINANCIAL_MULTI_ROW_HEADER,
      colSize: 180,
      readonly: true,
      theme: isDark() ? 'darkCompact' : 'compact',
      columns: FINANCIAL_COLUMNS,
      columnTypes: FINANCIAL_COLUMN_TYPES,
      plugins: FINANCIAL_SHOWCASE_PLUGINS,
      pivot: applyFinancialPivotOptions(
        pivotConfig,
        data,
        configuratorVisible,
      ),
    });
    grid.addEventListener('pivot-config-update', onPivotConfigUpdate as EventListener);
    gridContainer.appendChild(grid);
    grid.source = data;
  }

  function replacePivotOptions() {
    grid.pivot = undefined;
    window.setTimeout(applyPivotOptions);
  }

  header.addEventListener(FINANCIAL_PIVOT_PRESET_EVENT, (event) => {
    const id = (event as CustomEvent<FinancialPresetId>).detail;
    pivotConfig = createFinancialPreset(id);
    activePreset = id;
    refreshLayout();
    replacePivotOptions();
  });
  header.addEventListener(FINANCIAL_PIVOT_CONFIGURATOR_EVENT, () => {
    configuratorVisible = !configuratorVisible;
    applyPivotOptions();
    refreshLayout();
  });
  header.addEventListener(FINANCIAL_PIVOT_EXPANDED_EVENT, () => {
    expanded = !expanded;
    refreshLayout();
  });
  header.addEventListener(FINANCIAL_PIVOT_RESET_EVENT, resetDemo);
  scrollContainer.appendChild(gridContainer);
  container.append(header, guidance, scrollContainer);
  parent.appendChild(container);
  refreshLayout();
  initializeGrid();

  return () => {
    grid.removeEventListener('pivot-config-update', onPivotConfigUpdate as EventListener);
    grid.remove();
    container.remove();
  };
}
