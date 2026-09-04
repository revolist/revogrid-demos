// src/components/showcase/ECommerce.tsx

import './ecommerce.scss';
import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import {
  RevoGrid,
  type DataType,
} from '@revolist/react-datagrid';
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
  type EcommerceFilterPresetId,
} from './ecommerce.filtering';

interface ECommerceProps {
  rows?: DataType[];
  fields?: string[];
}

function ECommerce({ rows = [], fields = [] }: ECommerceProps) {
  const gridRef = useRef<HTMLRevoGridElement>(null);
  const [quickSearch, setQuickSearch] = useState('');
  const rowsInputRef = useRef(rows);
  const [hiddenColumns, setHiddenColumns] = useState<ColumnProp[]>([]);
  const [selectedRowsCount, setSelectedRowsCount] = useState(0);
  const selectedIndexesRef = useRef<Set<number>>(new Set());

  const { isDark } = currentEcommerceTheme();

  const theme = isDark() ? 'darkMaterial' : 'material';

  const [columns, setColumns] = useState(createEcommerceAnalyticsColumns);
  const [source, setSource] = useState(() => normalizeEcommerceRows(rows));
  const [visibleRows, setVisibleRows] = useState(() => normalizeEcommerceRows(rows));

  const columnTypes = useMemo(() => ecommerceColumnTypes, []);
  const plugins = useMemo(() => ecommercePlugins, []);
  const visibleColumns = useMemo(
    () => getVisibleEcommerceColumns(columns, hiddenColumns),
    [columns, hiddenColumns],
  );
  const totalSpend = useMemo(
    () => formatEcommerceTotalSpend(visibleRows),
    [visibleRows],
  );
  const totalRowsCount = visibleRows.length;
  const rowsCountLabel = selectedRowsCount === totalRowsCount
    ? String(totalRowsCount)
    : `${selectedRowsCount}/${totalRowsCount}`;

  useEffect(() => {
    if (rowsInputRef.current === rows) return;
    rowsInputRef.current = rows;
    const normalized = normalizeEcommerceRows(rows);
    setSource(normalized);
    setVisibleRows(normalized);
  }, [rows]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    let active = true;
    void grid.componentOnReady().then(() => {
      if (active) grid.plugins = plugins;
    });
    return () => {
      active = false;
    };
  }, [plugins]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const syncVisibleSource = createEcommerceVisibleSourceSync(grid, (state) => {
      setVisibleRows(state.visibleRows);
      setSelectedRowsCount(state.visibleSelectedIds.size);
    }, () => new Set([...selectedIndexesRef.current].map(index => getEcommerceRowId(source[index]))));
    grid.addEventListener('afterfilterapply', syncVisibleSource);
    grid.addEventListener('aftertrimmed', syncVisibleSource);
    grid.addEventListener('aftersourceset', syncVisibleSource);
    void syncVisibleSource();
    return () => {
      grid.removeEventListener('afterfilterapply', syncVisibleSource);
      grid.removeEventListener('aftertrimmed', syncVisibleSource);
      grid.removeEventListener('aftersourceset', syncVisibleSource);
      syncVisibleSource.cancel();
    };
  }, [source]);

  const exportToExcel = async () => {
    const grid = gridRef.current;
    if (grid) {
      const plugins = await grid.getPlugins();
      const exportPlugin = plugins.find(
        (plugin) => plugin instanceof ExportExcelPlugin,
      ) as ExportExcelPlugin;
      exportPlugin?.export(createEcommerceExcelExportConfig());
    }
  };

  const resetSelection = useCallback(() => {
    selectedIndexesRef.current = new Set();
    setSelectedRowsCount(0);
    clearEcommerceSelection(gridRef.current);
  }, []);

  const contextMenus = useMemo(() => createEcommerceContextMenus({
    getRows: () => source,
    setRows: (nextRows) => {
      setSource(nextRows);
      setVisibleRows(nextRows);
    },
    getColumns: () => columns,
    setColumns: (nextColumns) => setColumns(nextColumns),
    getHiddenColumns: () => hiddenColumns,
    setHiddenColumns,
    getGrid: () => gridRef.current,
    getSelectedIndexes: () => selectedIndexesRef.current,
    clearSelection: resetSelection,
    exportExcel: exportToExcel,
  }), [columns, hiddenColumns, resetSelection, source]);

  const handleRowSelected = (
    event: CustomEvent<HTMLRevoGridElementEventMap['rowselected']>,
  ) => {
    selectedIndexesRef.current = getSelectedEcommerceIndexes(event, source);
    setSelectedRowsCount(event.detail.count);
  };

  const applyQuickSearch = (text: string) => {
    setQuickSearch(text);
    if (gridRef.current) setEcommerceQuickFilter(gridRef.current, text);
  };

  return (
    <div className="ecommerce-shell grow">
      <div className="ecommerce-toolbar">
        <div className="ecommerce-toolbar__main">
          <span className="ecommerce-chip">
            <span>Rows</span>
            <strong>{rowsCountLabel}</strong>
          </span>
          <label className="ecommerce-filter">
            <span aria-hidden="true">⌕</span>
            <input
              id="customerSearch"
              type="search"
              aria-label="Search customers"
              placeholder="Search customers"
              value={quickSearch}
              onChange={(event) => applyQuickSearch(event.target.value)}
            />
          </label>
          <label className="ecommerce-preset">
            <span className="sr-only">Advanced filter example</span>
            <select
              aria-label="Advanced filter example"
              defaultValue=""
              onChange={async (event) => {
                const grid = gridRef.current;
                if (grid) {
                  const select = event.currentTarget;
                  await applyEcommerceFilterPreset(
                    grid,
                    (select.value || undefined) as EcommerceFilterPresetId | undefined,
                  );
                  select.value = '';
                }
              }}
            >
              <option value="">Advanced examples</option>
              {Object.entries(ECOMMERCE_FILTER_PRESETS).map(([id, preset]) => (
                <option key={id} value={id}>{preset.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="ecommerce-toolbar__aside">
          <span className="ecommerce-chip">
            <span>Spend</span>
            <strong>{totalSpend}</strong>
          </span>
          <button
            type="button"
            className="ecommerce-button ecommerce-button--export"
            onClick={exportToExcel}
          >
            Export
          </button>
        </div>
      </div>
      <RevoGrid
        className="ecommerce-grid skip-style cell-border"
        range
        ref={gridRef}
        columns={visibleColumns}
        source={source}
        columnTypes={columnTypes}
        rowContextMenu={contextMenus.rowContextMenu}
        columnContextMenu={contextMenus.columnContextMenu}
        filter={ecommerceFilterConfig}
        hideColumns={hiddenColumns}
        stretch="last"
        resize
        hide-attribution
        theme={theme}
        onRowselected={handleRowSelected}
      />
      {visibleRows.length === 0 && (
        <div className="ecommerce-empty" role="status" aria-live="polite">No customers match these filters.</div>
      )}
    </div>
  );
}

export default ECommerce;
