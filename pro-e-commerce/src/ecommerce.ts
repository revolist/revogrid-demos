// src/components/showcase/ECommerce.ts

import './ecommerce.scss';
import { defineCustomElements } from '@revolist/revogrid/loader';
import type { ColumnProp } from '@revolist/revogrid';
import {
  ExportExcelPlugin,
} from '@revolist/revogrid-pro';
import { currentTheme } from '../../composables/useRandomData';
import {
  createEcommerceAnalyticsColumns,
  createEcommerceContextMenus,
  createEcommerceExcelExportConfig,
  clearEcommerceSelection,
  ecommerceColumnTypes,
  ecommercePlugins,
  filterEcommerceRows,
  formatEcommerceTotalSpend,
  getSelectedEcommerceIndexes,
  getVisibleEcommerceColumns,
  normalizeEcommerceRows,
} from './ecommerce.shared';

defineCustomElements();

const { isDark } = currentTheme();

function formatRowsCount(selectedCount: number, totalCount: number) {
  return selectedCount === totalCount ? String(totalCount) : `${selectedCount}/${totalCount}`;
}

export function load(parentSelector: string, data: any[] = []) {
  let source = normalizeEcommerceRows(data);
  let columns = createEcommerceAnalyticsColumns();
  let hiddenColumns: ColumnProp[] = [];
  let filterExpression = '';
  let selectedRowsCount = 0;
  let selectedIndexes = new Set<number>();
  let allRowsCount = source.length;

  const container = document.createElement('div');
  container.className = 'ecommerce-grid-host';
  container.innerHTML = `
    <div class="ecommerce-shell grow">
        <div class="ecommerce-toolbar">
          <div class="ecommerce-toolbar__main">
          <span class="ecommerce-chip">
            <span>Rows</span>
            <strong id="rowsCount">${formatRowsCount(selectedRowsCount, allRowsCount)}</strong>
          </span>
          <label class="ecommerce-filter">
            <span aria-hidden="true">⌕</span>
          <textarea
            id="filterExpression"
            rows="1"
            placeholder='Gender eq "Female" and City eq "Chicago"'
          ></textarea>
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
    </div>
  `;

  const parent = document.querySelector(parentSelector);
  if (parent) {
    parent.appendChild(container);
  }

  const grid = container.querySelector<HTMLRevoGridElement>('#grid');
  const textarea = container.querySelector<HTMLTextAreaElement>('#filterExpression');
  const exportButton = container.querySelector<HTMLButtonElement>('#exportButton');
  const rowsCount = container.querySelector<HTMLElement>('#rowsCount');
  const totalSpend = container.querySelector<HTMLElement>('#totalSpend');

  const updateRows = () => {
    if (!grid) return;
    const visibleRows = filterEcommerceRows(source, filterExpression);
    grid.source = visibleRows;
    if (totalSpend) totalSpend.textContent = formatEcommerceTotalSpend(visibleRows);
  };

  const updateRowsCount = () => {
    if (rowsCount) rowsCount.textContent = formatRowsCount(selectedRowsCount, allRowsCount);
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

  if (grid && textarea && exportButton) {
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
        allRowsCount = source.length;
        updateRows();
        updateRowsCount();
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
    grid.filter = true;
    grid.stretch = 'last';
    grid.rowContextMenu = rowContextMenu;
    grid.columnContextMenu = columnContextMenu;
    updateColumns();
    updateRows();
    updateRowsCount();

    textarea.addEventListener('input', () => {
      filterExpression = textarea.value;
      updateRows();
    });

    grid.addEventListener('rowselected', (event: CustomEvent<HTMLRevoGridElementEventMap['rowselected']>) => {
      selectedIndexes = getSelectedEcommerceIndexes(event, source);
      selectedRowsCount = event.detail.count;
      allRowsCount = event.detail.allRowsCount || source.length;
      updateRowsCount();
    });

    exportButton.addEventListener('click', exportToExcel);

    return () => {
      container.remove();
    };
  }
}
