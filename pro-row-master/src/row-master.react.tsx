import { useMemo } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import {
  CellColumnFocusVerifyPlugin,
  ColumnStretchPlugin,
  MasterRowPlugin,
  TreeDataPlugin,
} from '@revolist/revogrid-pro';
import {
  createMasterColumns,
  createMasterRowConfig,
  createMasterRows,
  createMasterTreeConfig,
  prefersDarkTheme,
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

  return (
    <section className="row-master-showcase" aria-label="Row Master portfolio explorer">
      <div className="row-master-toolbar">
        <div>
          <strong>Portfolio explorer</strong>
          <span>Expand a leaf initiative to open its virtualized master-detail workspace.</span>
        </div>
        <div className="row-master-toolbar__badge">Tree + master detail</div>
      </div>
      <RevoGrid
        className="row-master-grid"
        theme={prefersDarkTheme() ? 'darkMaterial' : 'material'}
        source={source}
        columns={columns}
        plugins={plugins}
        masterRow={masterRow}
        tree={tree}
        stretch="last"
        hideAttribution={true}
      />
    </section>
  );
}
