import { defineCustomElements } from '@revolist/revogrid/loader';
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

defineCustomElements();

const plugins = [EventManagerPlugin, AuditHistoryPlugin, CellFlashPlugin];

export function load(parentSelector: string, rows?: InvoiceRow[]) {
  const parent = document.querySelector(parentSelector);
  if (!parent) return () => undefined;

  const source = rows?.length ? rows : createInvoiceRows();
  const showcase = document.createElement('section');
  showcase.className = 'audit-showcase';
  showcase.setAttribute('aria-label', 'Invoice audit history workspace');
  showcase.innerHTML = `
    <header class="audit-hero">
      <div>
        <span class="audit-eyebrow"><i></i> Live control log</span>
        <h1>Invoice review ledger</h1>
        <p>Edit any business field. Every change is attributed, reviewable, exportable, and reversible.</p>
      </div>
      <div class="audit-metrics" aria-label="Workspace metrics">
        <span><strong>8</strong> open invoices</span>
        <span><strong>4</strong> recorded actions</span>
        <span><strong>100%</strong> attributable</span>
      </div>
    </header>
    <div class="audit-hint"><span>Try it</span> Double-click a Customer, Status, Owner, Date, Amount, or Risk cell, then inspect the new record.</div>`;

  const workspace = document.createElement('div');
  workspace.className = 'audit-workspace';
  const grid = document.createElement('revo-grid');
  grid.className = 'audit-grid';
  grid.theme = prefersDarkTheme() ? 'darkMaterial' : 'material';
  grid.columns = createAuditColumns();
  grid.plugins = plugins;
  grid.auditHistory = createAuditHistoryConfig();
  grid.cellFlash = createCellFlashConfig();
  grid.range = true;
  grid.stretch = 'last';
  grid.hideAttribution = true;

  const panel = document.createElement('aside');
  panel.className = 'audit-panel-host';
  workspace.append(grid, panel);
  showcase.appendChild(workspace);
  parent.appendChild(showcase);
  const panelHandle = defineAuditHistoryPanel(panel, grid, createPanelOptions());
  grid.source = source;

  return () => {
    panelHandle.destroy();
    grid.remove();
    panel.remove();
    showcase.remove();
  };
}
