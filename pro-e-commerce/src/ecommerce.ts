// src/components/showcase/ECommerce.ts

import './ecommerce.scss';
import { defineCustomElements } from '@revolist/revogrid/loader';
import type { ColumnProp } from '@revolist/revogrid';
import {
  ExportExcelPlugin,
} from '@revolist/revogrid-pro';
import { currentEcommerceTheme } from './ecommerce.theme';
import {
  createEcommerceAnalyticsColumns,
  createEcommerceContextMenus,
  createEcommerceExcelExportConfig,
  clearEcommerceSelection,
  ecommerceColumnTypes,
  ecommerceFilterConfig,
  ecommercePlugins,
  formatEcommerceTotalSpend,
  getSelectedEcommerceIndexes,
  getVisibleEcommerceColumns,
  normalizeEcommerceRows,
} from './ecommerce.shared';
import {
  ECOMMERCE_FILTER_PRESETS,
  applyEcommerceFilterPreset,
  createEcommerceVisibleSourceSync,
  getEcommerceRowId,
  setEcommerceQuickFilter,
} from './ecommerce.filtering';

defineCustomElements();

  const { isDark } = currentEcommerceTheme();

function formatRowsCount(selectedCount: number, totalCount: number) {
  return selectedCount === totalCount ? String(totalCount) : `${selectedCount}/${totalCount}`;
}

export function load(parentSelector: string, data: any[] = []) {
  let source = normalizeEcommerceRows(data);
  let columns = createEcommerceAnalyticsColumns();
  let hiddenColumns: ColumnProp[] = [];
  let selectedRowsCount = 0;
  let selectedIndexes = new Set<number>();
  let visibleRows = source;
  let visibleRowsCount = source.length;

  const container = document.createElement('div');
  container.className = 'ecommerce-grid-host';
  container.innerHTML = `
    <div class="ecommerce-shell grow">
        <div class="ecommerce-toolbar">
          <div class="ecommerce-toolbar__main">
          <span class="ecommerce-chip">
            <span>Rows</span>
            <strong id="rowsCount">${formatRowsCount(selectedRowsCount, visibleRowsCount)}</strong>
          </span>
          <label class="ecommerce-filter" for="customerSearch">
            <span aria-hidden="true">⌕</span>
            <input
              id="customerSearch"
              type="search"
              aria-label="Search customers"
              placeholder="Search customers"
            />
          </label>
          <label class="ecommerce-preset">
            <span class="sr-only">Advanced filter example</span>
            <select id="filterPreset" aria-label="Advanced filter example">
              <option value="">Advanced examples</option>
              ${Object.entries(ECOMMERCE_FILTER_PRESETS).map(([id, preset]) =>
                `<option value="${id}">${preset.label}</option>`).join('')}
            </select>
          </label>
        </div>
        <div class="ecommerce-toolbar__aside">
          <span class="ecommerce-chip">
            <span>Spend</span>
            <strong id="totalSpend">${formatEcommerceTotalSpend(source)}</strong>
          </span>
          <button id="exportButton" type="button" class="ecommerce-button ecommerce-button--export">
            Export
          </button>
        </div>
      </div>
      <revo-grid
        class="ecommerce-grid skip-style cell-border"
        range
        id="grid"
        resize
        hide-attribution
      ></revo-grid>
      <div id="emptyState" class="ecommerce-empty" role="status" aria-live="polite" hidden>No customers match these filters.</div>
    </div>
  `;

  const parent = document.querySelector(parentSelector);
  if (parent) {
    parent.appendChild(container);
  }

  const grid = container.querySelector<HTMLRevoGridElement>('#grid');
  const searchInput = container.querySelector<HTMLInputElement>('#customerSearch');
  const presetSelect = container.querySelector<HTMLSelectElement>('#filterPreset');
  const exportButton = container.querySelector<HTMLButtonElement>('#exportButton');
  const rowsCount = container.querySelector<HTMLElement>('#rowsCount');
  const totalSpend = container.querySelector<HTMLElement>('#totalSpend');
  const emptyState = container.querySelector<HTMLElement>('#emptyState');

  const updateRowsCount = () => {
    if (rowsCount) rowsCount.textContent = formatRowsCount(selectedRowsCount, visibleRowsCount);
  };

  const resetSelection = () => {
    selectedIndexes = new Set();
    selectedRowsCount = 0;
    clearEcommerceSelection(grid);
    updateRowsCount();
  };

  const updateColumns = () => {
    if (!grid) return;
    grid.columns = getVisibleEcommerceColumns(columns, hiddenColumns);
    grid.hideColumns = hiddenColumns;
  };

  if (grid && searchInput && presetSelect && exportButton) {
    const syncVisibleSource = createEcommerceVisibleSourceSync(grid, (state) => {
      visibleRows = state.visibleRows;
      visibleRowsCount = state.visibleCount;
      selectedRowsCount = state.visibleSelectedIds.size;
      if (totalSpend) totalSpend.textContent = formatEcommerceTotalSpend(visibleRows);
      if (emptyState) emptyState.hidden = !state.empty;
      updateRowsCount();
    }, () => new Set([...selectedIndexes].map(index => getEcommerceRowId(source[index]))));
    const exportToExcel = async () => {
      const plugins = await grid.getPlugins();
      const exportPlugin = plugins.find(
        (plugin) => plugin instanceof ExportExcelPlugin
      ) as ExportExcelPlugin;
      await exportPlugin?.export(createEcommerceExcelExportConfig());
    };
    const { rowContextMenu, columnContextMenu } = createEcommerceContextMenus({
      getRows: () => source,
      setRows: (rows) => {
        source = rows;
        grid.source = source;
        void syncVisibleSource();
      },
      getColumns: () => columns,
      setColumns: (nextColumns) => {
        columns = nextColumns;
        updateColumns();
      },
      getHiddenColumns: () => hiddenColumns,
      setHiddenColumns: (nextHiddenColumns) => {
        hiddenColumns = nextHiddenColumns;
        updateColumns();
      },
      getGrid: () => grid,
      getSelectedIndexes: () => selectedIndexes,
      clearSelection: resetSelection,
      exportExcel: exportToExcel,
    });

    grid.range = true;
    grid.theme = isDark() ? 'darkMaterial' : 'material';
    grid.hideAttribution = true;
    grid.resize = true;

    grid.columnTypes = ecommerceColumnTypes;
    grid.plugins = ecommercePlugins;
    grid.filter = ecommerceFilterConfig;
    grid.stretch = 'last';
    grid.rowContextMenu = rowContextMenu;
    grid.columnContextMenu = columnContextMenu;
    updateColumns();
    grid.source = source;
    updateRowsCount();

    searchInput.addEventListener('input', () => {
      setEcommerceQuickFilter(grid, searchInput.value);
    });
    presetSelect.addEventListener('change', async () => {
      await applyEcommerceFilterPreset(
        grid,
        (presetSelect.value || undefined) as keyof typeof ECOMMERCE_FILTER_PRESETS | undefined,
      );
      presetSelect.value = '';
    });
    grid.addEventListener('afterfilterapply', syncVisibleSource);
    grid.addEventListener('aftertrimmed', syncVisibleSource);
    grid.addEventListener('aftersourceset', syncVisibleSource);

    grid.addEventListener('rowselected', (event: CustomEvent<HTMLRevoGridElementEventMap['rowselected']>) => {
      selectedIndexes = getSelectedEcommerceIndexes(event, source);
      selectedRowsCount = event.detail.count;
      updateRowsCount();
    });

    exportButton.addEventListener('click', exportToExcel);

    return () => {
      grid.removeEventListener('afterfilterapply', syncVisibleSource);
      grid.removeEventListener('aftertrimmed', syncVisibleSource);
      grid.removeEventListener('aftersourceset', syncVisibleSource);
      syncVisibleSource.cancel();
      container.remove();
    };
  }
}
