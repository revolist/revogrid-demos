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
  type MasterProjectRow,
} from './row-master.shared';
import './row-master.scss';

export default function RowMaster({ rows }: { rows?: MasterProjectRow[] }) {
  const source = useMemo(() => rows?.length ? rows : createMasterRows(), [rows]);
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

  return (
    <section className="row-master-showcase" aria-label="Row Master portfolio explorer">
      <RevoGrid
        className="row-master-grid"
        theme={darkTheme ? 'darkMaterial' : 'material'}
        source={source}
        columns={columns}
        plugins={plugins}
        masterRow={masterRow}
        tree={tree}
        readonly={true}
        stretch="last"
        hideAttribution={true}
      />
    </section>
  );
}
