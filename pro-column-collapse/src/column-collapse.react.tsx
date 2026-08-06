import { useEffect, useMemo, useState } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import {
  AdvanceFilterPlugin,
  ColumnCollapsePlugin,
  FilterHeaderPlugin,
  RowOddPlugin,
  RowSelectPlugin,
} from '@revolist/revogrid-pro';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  createColumnCollapseColumns,
  createColumnCollapseRows,
  type ContactRow,
} from './column-collapse.shared';
import './column-collapse.scss';

export default function ColumnCollapse({ rows }: { rows?: ContactRow[] }) {
  const source = useMemo(() => rows?.length ? rows : createColumnCollapseRows(), [rows]);
  const columns = useMemo(() => createColumnCollapseColumns(), []);
  const plugins = useMemo(() => [
    ColumnCollapsePlugin,
    AdvanceFilterPlugin,
    FilterHeaderPlugin,
    RowSelectPlugin,
    RowOddPlugin,
  ], []);
  const [darkTheme, setDarkTheme] = useState(() => currentTheme().isDark());

  useEffect(() => observeCurrentTheme(setDarkTheme), []);

  return (
    <section className="column-collapse-showcase" aria-label="Column Collapse contact workspace">
      <div className="column-collapse-toolbar">
        <div>
          <strong>Contact workspace</strong>
          <span>Collapse a grouped header to keep only its sealed column visible.</span>
        </div>
        <div className="column-collapse-legend" aria-label="Column collapse legend">
          <span><i className="column-collapse-dot column-collapse-dot--sealed" />Sealed</span>
          <span><i className="column-collapse-dot column-collapse-dot--hidden" />Collapsible</span>
        </div>
      </div>
      <RevoGrid
        className="column-collapse-grid"
        theme={darkTheme ? 'darkMaterial' : 'material'}
        columns={columns}
        source={source}
        plugins={plugins}
        rowHeaders={true}
        resize={true}
        hideAttribution={true}
      />
    </section>
  );
}
