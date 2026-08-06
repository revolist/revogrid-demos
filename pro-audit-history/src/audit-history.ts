import { defineCustomElements } from '@revolist/revogrid/loader';
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

defineCustomElements();

const plugins = [EventManagerPlugin, AuditHistoryPlugin, CellFlashPlugin];

export function load(parentSelector: string, rows?: InvoiceRow[]) {
  const parent = document.querySelector(parentSelector);
  if (!parent) return () => undefined;

  const source = rows?.length ? rows : createInvoiceRows();
  const showcase = document.createElement('section');
  showcase.className = 'audit-showcase';
  showcase.setAttribute('aria-label', 'Invoice audit history workspace');

  const workspace = document.createElement('div');
  workspace.className = 'audit-workspace';
  const grid = document.createElement('revo-grid');
  grid.className = 'audit-grid';
  grid.theme = currentTheme().isDark() ? 'darkMaterial' : 'material';
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
  const disconnectTheme = observeCurrentTheme((isDark) => {
    grid.theme = isDark ? 'darkMaterial' : 'material';
  });

  return () => {
    disconnectTheme();
    panelHandle.destroy();
    grid.remove();
    panel.remove();
    showcase.remove();
  };
}
