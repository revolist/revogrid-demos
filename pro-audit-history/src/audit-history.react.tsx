import { useEffect, useMemo, useRef } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import {
  AuditHistoryPlugin,
  CellFlashPlugin,
  EventManagerPlugin,
  defineAuditHistoryPanel,
} from '@revolist/revogrid-pro';
import {
  createAuditColumns,
  createAuditHistoryConfig,
  createCellFlashConfig,
  createInvoiceRows,
  createPanelOptions,
  prefersDarkTheme,
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

  useEffect(() => {
    const grid = gridRef.current;
    const panel = panelRef.current;
    if (!grid || !panel) return;
    const handle = defineAuditHistoryPanel(panel, grid, createPanelOptions());
    return () => handle.destroy();
  }, []);

  return (
    <section className="audit-showcase" aria-label="Invoice audit history workspace">
      <header className="audit-hero">
        <div>
          <span className="audit-eyebrow"><i /> Live control log</span>
          <h1>Invoice review ledger</h1>
          <p>Edit any business field. Every change is attributed, reviewable, exportable, and reversible.</p>
        </div>
        <div className="audit-metrics" aria-label="Workspace metrics">
          <span><strong>8</strong> open invoices</span>
          <span><strong>4</strong> recorded actions</span>
          <span><strong>100%</strong> attributable</span>
        </div>
      </header>
      <div className="audit-hint"><span>Try it</span> Double-click a Customer, Status, Owner, Date, Amount, or Risk cell, then inspect the new record.</div>
      <div className="audit-workspace">
        <RevoGrid
          ref={gridRef}
          className="audit-grid"
          theme={prefersDarkTheme() ? 'darkMaterial' : 'material'}
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
