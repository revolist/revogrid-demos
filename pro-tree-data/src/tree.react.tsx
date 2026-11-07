import '@revolist/ui/styles.css';
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
import { mountTreeToolbar } from './tree.toolbar';
import './tree.scss';

export default function TreeData({ rows }: { rows?: TreeDataRow[] }) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLRevoGridElement>(null);
  const source = useMemo(() => rows?.length ? rows : createTreeRows(), [rows]);
  const [stickyParents, setStickyParents] = useState(true);
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string> | undefined>();
  const columns = useMemo(() => createTreeColumns(source, stickyParents), [source, stickyParents]);
  const filterConfig = useMemo(() => createTreeFilterConfig(source), [source]);
  const dataGridFormatting = useMemo(() => TREE_DATA_GRID_FORMATTING, []);
  const dataGridContextMenu = useMemo(() => TREE_DATA_GRID_CONTEXT_MENU, []);
  const plugins = useMemo(() => [...TREE_PLUGINS], []);
  const columnTypes = useMemo(() => ({ ...TREE_COLUMN_TYPES }), []);
  const rowOrder = useMemo(() => TREE_ROW_ORDER_CONFIG, []);
  const rowSelect = useMemo(() => TREE_ROW_SELECT_CONFIG, []);
  const [darkTheme, setDarkTheme] = useState(() => currentTheme().isDark());
  const tree = useMemo(() => createTreeConfig(source, {
    expandedRowIds,
    stickyParents,
  }), [expandedRowIds, source, stickyParents]);
  const pluginProps = useMemo(() => ({
    rowOrder,
    rowSelect,
    stickyCells: TREE_STICKY_CELLS_CONFIG,
    tree,
    'onTree-state-changed': (event: CustomEvent<{ expandedRowIds: Set<string> }>) => {
      setExpandedRowIds(new Set(event.detail.expandedRowIds));
    },
  }) as any, [rowOrder, rowSelect, tree]);
  useEffect(() => {
    const disconnectTheme = observeCurrentTheme(setDarkTheme);
    const unmountToolbar = toolbarRef.current && mountTreeToolbar(toolbarRef.current, {
      expandAll: () => gridRef.current?.dispatchEvent(new CustomEvent(TREE_EXPAND_ALL_EVENT)),
      collapseAll: () => gridRef.current?.dispatchEvent(new CustomEvent(TREE_COLLAPSE_ALL_EVENT)),
      setStickyParents,
      async exportToExcel() {
        if (!gridRef.current) return;
        const gridPlugins = await gridRef.current.getPlugins();
        const exportPlugin = gridPlugins.find((plugin) => plugin instanceof ExportExcelPlugin) as ExportExcelPlugin | undefined;
        await exportPlugin?.export(TREE_EXPORT_CONFIG);
      },
    });
    return () => {
      unmountToolbar?.();
      disconnectTheme();
    };
  }, []);


  return (
    <section className="tree-showcase" aria-label="Tree Data organization explorer">
      <div ref={toolbarRef} />
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
