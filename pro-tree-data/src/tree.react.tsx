import { useMemo, useRef, useState } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import {
  ExportExcelPlugin,
  TREE_COLLAPSE_ALL_EVENT,
  TREE_EXPAND_ALL_EVENT,
} from '@revolist/revogrid-pro';
import {
  createTreeColumns,
  createTreeConfig,
  createTreeRows,
  prefersDarkTheme,
  TREE_COLUMN_TYPES,
  TREE_EXPORT_CONFIG,
  TREE_PLUGINS,
  TREE_ROW_ORDER_CONFIG,
  TREE_ROW_SELECT_CONFIG,
  type TreeDataRow,
} from './tree.shared';
import './tree.scss';

export default function TreeData({ rows }: { rows?: TreeDataRow[] }) {
  const gridRef = useRef<HTMLRevoGridElement>(null);
  const source = useMemo(() => rows?.length ? rows : createTreeRows(), [rows]);
  const columns = useMemo(() => createTreeColumns(), []);
  const plugins = useMemo(() => [...TREE_PLUGINS], []);
  const columnTypes = useMemo(() => ({ ...TREE_COLUMN_TYPES }), []);
  const rowOrder = useMemo(() => TREE_ROW_ORDER_CONFIG, []);
  const rowSelect = useMemo(() => TREE_ROW_SELECT_CONFIG, []);
  const [stickyParents, setStickyParents] = useState(true);
  const [exporting, setExporting] = useState(false);
  const tree = useMemo(() => createTreeConfig(source, stickyParents), [source, stickyParents]);
  const pluginProps = useMemo(() => ({ rowOrder, rowSelect, tree }) as any, [rowOrder, rowSelect, tree]);

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
        <div className="tree-toolbar__intro">
          <span className="tree-eyebrow">Organization explorer</span>
          <strong>Interactive hierarchy</strong>
        </div>
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
        theme={prefersDarkTheme() ? 'darkMaterial' : 'material'}
        columns={columns}
        source={source}
        plugins={plugins}
        columnTypes={columnTypes}
        {...pluginProps}
        range={true}
        resize={true}
        filter={true}
        stretch={true}
        hideAttribution={true}
      />
    </section>
  );
}
