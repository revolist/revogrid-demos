import { useEffect, useMemo, useRef, useState } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import {
  AuditHistoryPlugin,
  CellFlashPlugin,
  EventManagerPlugin,
  defineAuditHistoryPanel,
} from '@revolist/revogrid-pro';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  createAuditColumns,
  createAuditHistoryConfig,
  createCellFlashConfig,
  createInvoiceRows,
  createPanelOptions,
  type InvoiceRow,
} from './audit-history.shared';
import './audit-history.scss';

export default function AuditHistory({ rows }: { rows?: InvoiceRow[] }) {
  const gridRef = useRef<HTMLRevoGridElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const source = useMemo(() => rows?.length ? rows : createInvoiceRows(), [rows]);
  const columns = useMemo(() => createAuditColumns(), []);
  const plugins = useMemo(() => [EventManagerPlugin, AuditHistoryPlugin, CellFlashPlugin], []);
  const auditHistory = useMemo(() => createAuditHistoryConfig(), []);
  const cellFlash = useMemo(() => createCellFlashConfig(), []);
  const [darkTheme, setDarkTheme] = useState(() => currentTheme().isDark());

  useEffect(() => observeCurrentTheme(setDarkTheme), []);

  useEffect(() => {
    const grid = gridRef.current;
    const panel = panelRef.current;
    if (!grid || !panel) return;
    const handle = defineAuditHistoryPanel(panel, grid, createPanelOptions());
    return () => handle.destroy();
  }, []);

  return (
    <section className="audit-showcase" aria-label="Invoice audit history workspace">
      <div className="audit-workspace">
        <RevoGrid
          ref={gridRef}
          className="audit-grid"
          theme={darkTheme ? 'darkMaterial' : 'material'}
          source={source}
          columns={columns}
          plugins={plugins}
          auditHistory={auditHistory}
          cellFlash={cellFlash}
          range={true}
          stretch="last"
          hideAttribution={true}
        />
        <aside ref={panelRef} className="audit-panel-host" />
      </div>
    </section>
  );
}
