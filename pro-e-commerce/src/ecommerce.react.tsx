import '@revolist/ui/styles.css';
import { ButtonControl as UiButton } from '@revolist/ui/react-control';
import { Dropdown as UiDropdown, SearchInput as UiSearchInput } from '@revolist/ui/react';
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
  getEcommerceViewColumns,
  type EcommerceColumnView,
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
  type EcommerceVisibleSourceSync,
  type EcommerceFilterPresetId,
} from './ecommerce.filtering';

interface ECommerceProps {
  rows?: DataType[];
  fields?: string[];
}

const EMPTY_ROWS: DataType[] = [];
const SEGMENT_OPTIONS = [
  { value: '', label: 'Saved segments' },
  ...Object.entries(ECOMMERCE_FILTER_PRESETS).map(([value, preset]) => ({
    value,
    label: preset.label,
  })),
];
const COLUMN_VIEW_OPTIONS = [
  { value: 'overview', label: 'Customer overview' },
  { value: 'all', label: 'All fields' },
];
const SEGMENT_CONFIG = { ariaLabel: 'Saved segments', nativeTabNavigation: true };
const COLUMN_VIEW_CONFIG = { ariaLabel: 'Column view', nativeTabNavigation: true };

function ECommerce({ rows = EMPTY_ROWS }: ECommerceProps) {
  const gridRef = useRef<HTMLRevoGridElement>(null);
  const [quickSearch, setQuickSearch] = useState('');
  const [activePreset, setActivePreset] = useState('');
  const [columnView, setColumnView] = useState<EcommerceColumnView>('overview');
  const syncVisibleSourceRef = useRef<EcommerceVisibleSourceSync | undefined>(undefined);
  const rowsInputRef = useRef(rows);
  const [hiddenColumns, setHiddenColumns] = useState<ColumnProp[]>([]);
  const [, setSelectedRowsCount] = useState(0);
  const selectedIndexesRef = useRef<Set<number>>(new Set());

  const { isDark } = currentEcommerceTheme();

  const theme = isDark() ? 'darkMaterial' : 'material';

  const [columns, setColumns] = useState(createEcommerceAnalyticsColumns);
  const [source, setSource] = useState(() => normalizeEcommerceRows(rows));
  const [, setVisibleRows] = useState(() => normalizeEcommerceRows(rows));
  const [empty, setEmpty] = useState(rows.length === 0);

  const columnTypes = useMemo(() => ecommerceColumnTypes, []);
  const plugins = useMemo(() => ecommercePlugins, []);
  const visibleColumns = useMemo(
    () => getVisibleEcommerceColumns(getEcommerceViewColumns(columns, columnView), hiddenColumns),
    [columns, hiddenColumns, columnView],
  );

  useEffect(() => {
    if (rowsInputRef.current === rows) return;
    rowsInputRef.current = rows;
    const normalized = normalizeEcommerceRows(rows);
    setSource(normalized);
    setVisibleRows(normalized);
    setEmpty(normalized.length === 0);
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
      setEmpty(state.empty);
      setSelectedRowsCount(state.visibleSelectedIds.size);
    }, () => new Set([...selectedIndexesRef.current].map(index => getEcommerceRowId(source[index]))));
    syncVisibleSourceRef.current = syncVisibleSource;
    grid.addEventListener('afterfilterapply', syncVisibleSource);
    grid.addEventListener('aftertrimmed', syncVisibleSource);
    grid.addEventListener('aftersourceset', syncVisibleSource);
    void syncVisibleSource();
    return () => {
      grid.removeEventListener('afterfilterapply', syncVisibleSource);
      grid.removeEventListener('aftertrimmed', syncVisibleSource);
      grid.removeEventListener('aftersourceset', syncVisibleSource);
      syncVisibleSource.cancel();
      if (syncVisibleSourceRef.current === syncVisibleSource) syncVisibleSourceRef.current = undefined;
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
      setEmpty(nextRows.length === 0);
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
    void syncVisibleSourceRef.current?.();
  };

  const applyQuickSearch = (text: string) => {
    setQuickSearch(text);
    if (gridRef.current) setEcommerceQuickFilter(gridRef.current, text);
  };


  return (
    <div className="ecommerce-shell grow" data-view={columnView}>
      <header className="ecommerce-heading">
        <div><h1>Customer analytics</h1><p>Explore spending, loyalty, and purchase behavior.</p></div>
      </header>
      <div className="ecommerce-toolbar" aria-label="Customer controls">
        <UiSearchInput rootClassName="ecommerce-search" aria-label="Search customers"
          placeholder="Search customers, cities, products…"
          value={quickSearch} onValueChange={applyQuickSearch} />
        <UiDropdown className="rv-select ecommerce-preset" source={SEGMENT_OPTIONS} value={activePreset} config={SEGMENT_CONFIG}
          placeholder="Saved segments" onChange={async (nextValue) => {
            const value = String(nextValue ?? '');
            setActivePreset(value);
            const grid = gridRef.current;
            if (grid) await applyEcommerceFilterPreset(grid, (value || undefined) as EcommerceFilterPresetId | undefined);
          }} />
        <UiDropdown className="rv-select ecommerce-view" source={COLUMN_VIEW_OPTIONS} value={columnView} config={COLUMN_VIEW_CONFIG}
          onChange={(value) => setColumnView(value as EcommerceColumnView)} />
        <UiButton type="button" className="ecommerce-export rv-btn-primary" onClick={exportToExcel}>Export</UiButton>
      </div>
      <div className="ecommerce-table">
      <RevoGrid
        className="ecommerce-grid skip-style cell-border"
        range
        rowSize={48}
        canMoveColumns={true}
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
      {empty && (
        <div className="ecommerce-empty" role="status" aria-live="polite">
          <strong>No customers found</strong><span>Try another search or choose a different segment.</span>
        </div>
      )}
      </div>
    </div>
  );
}

export default ECommerce;
