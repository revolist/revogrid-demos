import { applyControlPresentation } from '@revolist/ui';
import { createDropdownControl } from '@revolist/ui/dropdown/control';
import { SearchInput } from '@revolist/ui/search-input/index';
import { createPreactElement, releasePreactElement } from '@revolist/ui/preact-mount';
import { h } from 'preact';
import '@revolist/ui/styles.css';
import './ecommerce.scss';
import { defineCustomElements } from '@revolist/revogrid/loader';
import type { ColumnProp } from '@revolist/revogrid';
import { ExportExcelPlugin } from '@revolist/revogrid-pro';
import { currentEcommerceTheme } from './ecommerce.theme';
import {
  createEcommerceAnalyticsColumns,
  createEcommerceContextMenus,
  createEcommerceExcelExportConfig,
  clearEcommerceSelection,
  ecommerceColumnTypes,
  ecommerceFilterConfig,
  ecommercePlugins,
  getEcommerceViewColumns,
  getSelectedEcommerceIndexes,
  getVisibleEcommerceColumns,
  normalizeEcommerceRows,
  type EcommerceColumnView,
} from './ecommerce.shared';
import {
  ECOMMERCE_FILTER_PRESETS,
  applyEcommerceFilterPreset,
  createEcommerceVisibleSourceSync,
  getEcommerceRowId,
  setEcommerceQuickFilter,
  type EcommerceFilterPresetId,
} from './ecommerce.filtering';

defineCustomElements();

export function load(parentSelector: string, data: any[] = []) {
  const parent = document.querySelector(parentSelector);
  if (!parent) return () => {};
  let source = normalizeEcommerceRows(data);
  let columns = createEcommerceAnalyticsColumns();
  let hiddenColumns: ColumnProp[] = [];
  let columnView: EcommerceColumnView = 'overview';
  let selectedIndexes = new Set<number>();
  let empty = source.length === 0;
  const events = new AbortController();
  const container = document.createElement('div');
  container.className = 'ecommerce-grid-host';
  container.innerHTML = `
    <div class="ecommerce-shell grow" data-view="overview">
      <header class="ecommerce-heading">
        <div><h1>Customer analytics</h1><p>Explore spending, loyalty, and purchase behavior.</p></div>
      </header>
      <div class="ecommerce-toolbar" aria-label="Customer controls">
        <span data-control="search"></span>
        <span data-control="preset"></span>
        <span data-control="view"></span>
        <button type="button" class="ecommerce-export rv-btn-primary" data-action="export">Export</button>
      </div>
      <div class="ecommerce-table">
        <revo-grid class="ecommerce-grid skip-style cell-border" range resize hide-attribution></revo-grid>
        <div class="ecommerce-empty" role="status" aria-live="polite" hidden>
          <strong>No customers found</strong><span>Try another search or choose a different segment.</span>
        </div>
      </div>
    </div>
  `;
  applyControlPresentation(container);
  const grid = container.querySelector<HTMLRevoGridElement>('revo-grid')!;
  grid.canMoveColumns = true;
  parent.appendChild(container);
  const shell = container.querySelector<HTMLElement>('.ecommerce-shell')!;
  const search = createPreactElement<HTMLElement>(document, h(SearchInput, {
    rootClassName: 'ecommerce-search',
    'aria-label': 'Search customers',
    placeholder: 'Search customers, cities, products…',
    onValueChange: (value: string) => setEcommerceQuickFilter(grid, value),
  }));
  const presetControl = createDropdownControl<string>(document, {
    source: [
      { value: '', label: 'Saved segments' },
      ...Object.entries(ECOMMERCE_FILTER_PRESETS).map(([value, preset]) => ({ value, label: preset.label })),
    ],
    value: '',
    placeholder: 'Saved segments',
    config: { ariaLabel: 'Saved segments' },
    onChange: value => {
      void applyEcommerceFilterPreset(grid, (value || undefined) as EcommerceFilterPresetId | undefined);
    },
  });
  presetControl.element.classList.add('ecommerce-preset');
  const viewControl = createDropdownControl<EcommerceColumnView>(document, {
    source: [
      { value: 'overview', label: 'Customer overview' },
      { value: 'all', label: 'All fields' },
    ],
    value: columnView,
    config: { ariaLabel: 'Column view' },
    onChange: value => {
      columnView = value as EcommerceColumnView;
      updateColumns();
    },
  });
  viewControl.element.classList.add('ecommerce-view');
  container.querySelector('[data-control="search"]')!.replaceWith(search);
  container.querySelector('[data-control="preset"]')!.replaceWith(presetControl.element);
  container.querySelector('[data-control="view"]')!.replaceWith(viewControl.element);
  const emptyState = container.querySelector<HTMLElement>('.ecommerce-empty')!;
  const updateResults = () => {
    emptyState.hidden = !empty;
  };
  const resetSelection = () => {
    selectedIndexes = new Set();
    clearEcommerceSelection(grid);
    updateResults();
  };
  const updateColumns = () => {
    grid.columns = getVisibleEcommerceColumns(getEcommerceViewColumns(columns, columnView), hiddenColumns);
    grid.hideColumns = hiddenColumns;
    shell.dataset.view = columnView;
  };
  const syncVisibleSource = createEcommerceVisibleSourceSync(grid, (state) => {
    empty = state.empty;
    updateResults();
  }, () => new Set([...selectedIndexes].map(index => getEcommerceRowId(source[index]))));
  const exportToExcel = async () => {
    const plugins = await grid.getPlugins();
    const plugin = plugins.find(plugin => plugin instanceof ExportExcelPlugin) as ExportExcelPlugin | undefined;
    await plugin?.export(createEcommerceExcelExportConfig());
  };
  const contextMenus = createEcommerceContextMenus({
    getRows: () => source,
    setRows: rows => { source = rows; grid.source = source; void syncVisibleSource(); },
    getColumns: () => columns,
    setColumns: nextColumns => { columns = nextColumns; updateColumns(); },
    getHiddenColumns: () => hiddenColumns,
    setHiddenColumns: nextHiddenColumns => { hiddenColumns = nextHiddenColumns; updateColumns(); },
    getGrid: () => grid,
    getSelectedIndexes: () => selectedIndexes,
    clearSelection: resetSelection,
    exportExcel: exportToExcel,
  });

  grid.theme = currentEcommerceTheme().isDark() ? 'darkMaterial' : 'material';
  grid.rowSize = 48;
  grid.columnTypes = ecommerceColumnTypes;
  grid.plugins = ecommercePlugins;
  grid.filter = ecommerceFilterConfig;
  grid.stretch = 'last';
  grid.rowContextMenu = contextMenus.rowContextMenu;
  grid.columnContextMenu = contextMenus.columnContextMenu;
  updateColumns();
  for (const name of ['afterfilterapply', 'aftertrimmed', 'aftersourceset']) {
    grid.addEventListener(name, syncVisibleSource, { signal: events.signal });
  }
  grid.addEventListener('rowselected', (event: CustomEvent<HTMLRevoGridElementEventMap['rowselected']>) => {
    selectedIndexes = getSelectedEcommerceIndexes(event, source);
    updateResults();
    void syncVisibleSource();
  }, { signal: events.signal });
  container.querySelector('[data-action="export"]')!.addEventListener('click', () => { void exportToExcel(); }, { signal: events.signal });
  grid.source = source;
  updateResults();

  return () => {
    events.abort();
    syncVisibleSource.cancel();
    presetControl.destroy();
    viewControl.destroy();
    releasePreactElement(search);
    grid.remove();
    container.remove();
  };
}
