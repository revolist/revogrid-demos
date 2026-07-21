// src/components/showcase/ECommerce.tsx

import './ecommerce.scss';
import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import {
  RevoGrid,
  type DataType,
} from '@revolist/react-datagrid';
import type { ColumnProp } from '@revolist/revogrid';
import { ExportExcelPlugin } from '@revolist/revogrid-pro';
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

interface ECommerceProps {
  rows?: DataType[];
  fields?: string[];
}

function ECommerce({ rows = [], fields = [] }: ECommerceProps) {
  const gridRef = useRef<HTMLRevoGridElement>(null);
  const [filterExpression, setFilterExpression] = useState('');
  const [hiddenColumns, setHiddenColumns] = useState<ColumnProp[]>([]);
  const [selectedRowsCount, setSelectedRowsCount] = useState(0);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(() => new Set());
  const [allRowsCount, setAllRowsCount] = useState(0);

  const { isDark } = currentTheme();

  const theme = isDark() ? 'darkMaterial' : 'material';

  const [columns, setColumns] = useState(createEcommerceAnalyticsColumns);
  const [source, setSource] = useState(() => normalizeEcommerceRows(rows));

  const columnTypes = useMemo(() => ecommerceColumnTypes, []);
  const plugins = useMemo(() => ecommercePlugins, []);
  const visibleColumns = useMemo(
    () => getVisibleEcommerceColumns(columns, hiddenColumns),
    [columns, hiddenColumns],
  );
  const visibleRows = useMemo(
    () => filterEcommerceRows(source, filterExpression),
    [source, filterExpression],
  );
  const totalSpend = useMemo(
    () => formatEcommerceTotalSpend(visibleRows),
    [visibleRows],
  );
  const totalRowsCount = allRowsCount || source.length;
  const rowsCountLabel = selectedRowsCount === totalRowsCount
    ? String(totalRowsCount)
    : `${selectedRowsCount}/${totalRowsCount}`;

  useEffect(() => {
    setSource(normalizeEcommerceRows(rows));
  }, [rows]);

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
    setSelectedIndexes(new Set());
    setSelectedRowsCount(0);
    clearEcommerceSelection(gridRef.current);
  }, []);

  const contextMenus = useMemo(() => createEcommerceContextMenus({
    getRows: () => source,
    setRows: (nextRows) => {
      setSource(nextRows);
      setAllRowsCount(nextRows.length);
    },
    getColumns: () => columns,
    setColumns: (nextColumns) => setColumns(nextColumns),
    getHiddenColumns: () => hiddenColumns,
    setHiddenColumns,
    getGrid: () => gridRef.current,
    getSelectedIndexes: () => selectedIndexes,
    clearSelection: resetSelection,
    exportExcel: exportToExcel,
  }), [columns, hiddenColumns, resetSelection, selectedIndexes, source]);

  const handleRowSelected = (
    event: CustomEvent<HTMLRevoGridElementEventMap['rowselected']>,
  ) => {
    setSelectedIndexes(getSelectedEcommerceIndexes(event, source));
    setSelectedRowsCount(event.detail.count);
    setAllRowsCount(event.detail.allRowsCount || source.length);
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
            <textarea
              id="filterExpression"
              rows={1}
              placeholder='Gender eq "Female" and City eq "Chicago"'
              value={filterExpression}
              onChange={(e) => setFilterExpression(e.target.value)}
            />
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
        source={visibleRows}
        plugins={plugins}
        columnTypes={columnTypes}
        rowContextMenu={contextMenus.rowContextMenu}
        columnContextMenu={contextMenus.columnContextMenu}
        filter={true}
        hideColumns={hiddenColumns}
        stretch="last"
        resize
        hide-attribution
        theme={theme}
        onRowselected={handleRowSelected}
      />
    </div>
  );
}

export default ECommerce;
