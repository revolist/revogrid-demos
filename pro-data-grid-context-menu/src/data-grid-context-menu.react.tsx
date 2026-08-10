import { useEffect, useMemo, useState } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import {
  AdvanceFilterPlugin,
  AutoSizeColumnPlugin,
  ColumnCollapsePlugin,
  DataGridContextMenuPlugin,
  DialogPlugin,
  ExportExcelPlugin,
  MultiRangeSelectionPlugin,
  RowSelectPlugin,
} from '@revolist/revogrid-pro';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  DATA_GRID_CONTEXT_MENU_ROW_SIZE,
  createContextMenuColumns,
  createContextMenuRowHeaders,
  createDataGridFormattingPresets,
  createDataGridContextMenuConfig,
  createTeamGrouping,
  createTeamRows,
  getDataGridContextMenuTheme,
  type TeamRow,
} from './data-grid-context-menu.shared';
import './data-grid-context-menu.scss';

export default function DataGridContextMenu({ rows }: { rows?: TeamRow[] }) {
  const source = useMemo(() => rows?.length ? rows : createTeamRows(), [rows]);
  const columns = useMemo(() => createContextMenuColumns(), []);
  const grouping = useMemo(() => createTeamGrouping(), []);
  const rowHeaders = useMemo(() => createContextMenuRowHeaders(), []);
  const dataGridFormatting = useMemo(() => createDataGridFormattingPresets(), []);
  const plugins = useMemo(() => [
    DataGridContextMenuPlugin,
    DialogPlugin,
    AdvanceFilterPlugin,
    AutoSizeColumnPlugin,
    RowSelectPlugin,
    ColumnCollapsePlugin,
    MultiRangeSelectionPlugin,
    ExportExcelPlugin,
  ], []);
  const additionalData = useMemo(() => ({
    dataGridContextMenu: createDataGridContextMenuConfig(),
  }), []);
  const [darkTheme, setDarkTheme] = useState(() => currentTheme().isDark());

  useEffect(() => observeCurrentTheme(setDarkTheme), []);

  return (
    <section className="data-grid-context-menu-showcase" aria-label="Data Grid Context Menu & Formatting workspace">
      <RevoGrid
        className="data-grid-context-menu-grid"
        theme={getDataGridContextMenuTheme(darkTheme)}
        source={source}
        columns={columns}
        grouping={grouping}
        rowSize={DATA_GRID_CONTEXT_MENU_ROW_SIZE}
        plugins={plugins}
        dataGridFormatting={dataGridFormatting}
        additionalData={additionalData}
        rowHeaders={rowHeaders}
        range
        resize
        hideAttribution
      />
    </section>
  );
}
