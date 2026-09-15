import { useEffect, useMemo, useState } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import {
  CellColumnFocusVerifyPlugin,
  ColumnStretchPlugin,
  MasterRowPlugin,
  TreeDataPlugin,
} from '@revolist/revogrid-pro';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  createMasterColumns,
  createMasterRowConfig,
  createMasterRows,
  createMasterTreeConfig,
  cloneMasterRows,
  preserveExpandedMastersOnSource,
  type MasterProjectRow,
} from './row-master.shared';
import './row-master.scss';

export default function RowMaster({ rows }: { rows?: MasterProjectRow[] }) {
  const initialSource = useMemo(() => rows?.length ? rows : createMasterRows(), [rows]);
  const [source, setSource] = useState(initialSource);
  const columns = useMemo(() => createMasterColumns(source), [source]);
  const plugins = useMemo(() => [
    TreeDataPlugin,
    MasterRowPlugin,
    CellColumnFocusVerifyPlugin,
    ColumnStretchPlugin,
  ], []);
  const masterRow = useMemo(() => createMasterRowConfig(), []);
  const tree = useMemo(() => createMasterTreeConfig(), []);
  const [darkTheme, setDarkTheme] = useState(() => currentTheme().isDark());

  useEffect(() => observeCurrentTheme(setDarkTheme), []);
  useEffect(() => setSource(initialSource), [initialSource]);

  return (
    <section className="row-master-showcase" aria-label="Row Master portfolio explorer">
      <div className="row-master-source-update">
        <button
          className="row-master-source-update__button"
          type="button"
          onClick={() => setSource(current => cloneMasterRows(current))}
        >
          Refresh source and preserve details
        </button>
      </div>
      <RevoGrid
        className="row-master-grid"
        theme={darkTheme ? 'darkMaterial' : 'material'}
        source={source}
        columns={columns}
        plugins={plugins}
        masterRow={masterRow}
        tree={tree}
        onBeforerowmastercollapse={preserveExpandedMastersOnSource}
        readonly={true}
        stretch="last"
        hideAttribution={true}
      />
    </section>
  );
}
