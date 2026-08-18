import { useEffect, useMemo, useRef, useState } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import {
  ExportExcelPlugin,
  TREE_COLLAPSE_ALL_EVENT,
  TREE_EXPAND_ALL_EVENT,
} from '@revolist/revogrid-pro';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  createTreeColumns,
  createTreeConfig,
  createTreeFilterConfig,
  createTreeRows,
  TREE_COLUMN_TYPES,
  TREE_DATA_GRID_CONTEXT_MENU,
  TREE_DATA_GRID_FORMATTING,
  TREE_EXPORT_CONFIG,
  TREE_PLUGINS,
  TREE_ROW_ORDER_CONFIG,
  TREE_ROW_SELECT_CONFIG,
  TREE_STICKY_CELLS_CONFIG,
  type TreeDataRow,
} from './tree.shared';
import './tree.scss';

export default function TreeData({ rows }: { rows?: TreeDataRow[] }) {
  const gridRef = useRef<HTMLRevoGridElement>(null);
  const source = useMemo(() => rows?.length ? rows : createTreeRows(), [rows]);
  const [stickyParents, setStickyParents] = useState(true);
  const columns = useMemo(() => createTreeColumns(source, stickyParents), [source, stickyParents]);
  const filterConfig = useMemo(() => createTreeFilterConfig(source), [source]);
  const dataGridFormatting = useMemo(() => TREE_DATA_GRID_FORMATTING, []);
  const dataGridContextMenu = useMemo(() => TREE_DATA_GRID_CONTEXT_MENU, []);
  const plugins = useMemo(() => [...TREE_PLUGINS], []);
  const columnTypes = useMemo(() => ({ ...TREE_COLUMN_TYPES }), []);
  const rowOrder = useMemo(() => TREE_ROW_ORDER_CONFIG, []);
  const rowSelect = useMemo(() => TREE_ROW_SELECT_CONFIG, []);
  const [exporting, setExporting] = useState(false);
  const [darkTheme, setDarkTheme] = useState(() => currentTheme().isDark());
  const tree = useMemo(() => createTreeConfig(source, {
    stickyParents,
  }), [source, stickyParents]);
  const pluginProps = useMemo(() => ({
    rowOrder,
    rowSelect,
    stickyCells: TREE_STICKY_CELLS_CONFIG,
    tree,
  }) as any, [rowOrder, rowSelect, tree]);
  useEffect(() => {
    const disconnectTheme = observeCurrentTheme(setDarkTheme);
    return () => {
      disconnectTheme();
    };
  }, []);

  const expandAll = () => gridRef.current?.dispatchEvent(new CustomEvent(TREE_EXPAND_ALL_EVENT));
  const collapseAll = () => gridRef.current?.dispatchEvent(new CustomEvent(TREE_COLLAPSE_ALL_EVENT));
  const exportToExcel = async () => {
    if (!gridRef.current) return;
    setExporting(true);
    try {
      const gridPlugins = await gridRef.current.getPlugins();
      const exportPlugin = gridPlugins.find((plugin) => plugin instanceof ExportExcelPlugin) as ExportExcelPlugin | undefined;
      await exportPlugin?.export(TREE_EXPORT_CONFIG);
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="tree-showcase" aria-label="Tree Data organization explorer">
      <div className="tree-toolbar">
        <div className="tree-toolbar__actions">
          <button className="tree-button" type="button" onClick={expandAll}>Expand all</button>
          <button className="tree-button" type="button" onClick={collapseAll}>Collapse all</button>
          <button className="tree-button" type="button" disabled={exporting} onClick={exportToExcel}>
            {exporting ? 'Exporting…' : 'Export to Excel'}
          </button>
          <label className="tree-sticky">
            <input type="checkbox" checked={stickyParents} onChange={(event) => setStickyParents(event.currentTarget.checked)} />
            Sticky parents
          </label>
        </div>
      </div>
      <RevoGrid
        ref={gridRef}
        className="tree-grid"
        theme={darkTheme ? 'darkMaterial' : 'material'}
        plugins={plugins}
        columns={columns}
        source={source}
        columnTypes={columnTypes}
        {...pluginProps}
        range={true}
        readonly={true}
        resize={true}
        filter={filterConfig}
        dataGridFormatting={dataGridFormatting}
        dataGridContextMenu={dataGridContextMenu}
        stretch={true}
        hideAttribution={true}
      />
    </section>
  );
}
