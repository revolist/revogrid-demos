import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  createAuditColumns,
  createAuditHistoryConfig,
  createCellFlashConfig,
  createInvoiceRows,
  createPanelOptions,
  createSeedAuditRecords,
} from './audit-history.shared.ts';

const root = dirname(fileURLToPath(import.meta.url));
const readSource = file => readFile(join(root, file), 'utf8');

test('invoice records have stable identities and editable operational fields', () => {
  const rows = createInvoiceRows();
  const columns = createAuditColumns();

  assert.equal(rows.length, 8);
  assert.equal(new Set(rows.map(row => row.id)).size, rows.length);
  assert.equal(columns.length, 7);
  assert.equal(columns[0].readonly, true);
  assert.notStrictEqual(createInvoiceRows()[0], rows[0]);
});

test('audit configuration ships attributed seed history and restore-ready UI', () => {
  const records = createSeedAuditRecords();
  const config = createAuditHistoryConfig();
  const panel = createPanelOptions();
  const flash = createCellFlashConfig();

  assert.equal(records.length, 4);
  assert.ok(records.every(record => record.changedBy.id && record.transactionId));
  assert.ok(records.some(record => record.type === 'bulk-paste' && record.changes.length === 2));
  assert.equal(config.rowIdProp, 'id');
  assert.equal(config.storage, 'memory');
  assert.equal(config.records?.length, 4);
  assert.deepEqual(panel.restoreActions, ['cell', 'row', 'transaction']);
  assert.equal(panel.allowExport, true);
  assert.equal(flash.mode, 'cell-and-row');
});

test('all framework variants use direct audit bindings and panel cleanup', async () => {
  const [typescript, react, vue, angular] = await Promise.all([
    readSource('audit-history.ts'),
    readSource('audit-history.react.tsx'),
    readSource('audit-history.vue'),
    readSource('audit-history.angular.ts'),
  ]);

  for (const source of [typescript, react, vue, angular]) {
    assert.match(source, /AuditHistoryPlugin/);
    assert.match(source, /EventManagerPlugin/);
    assert.match(source, /CellFlashPlugin/);
    assert.match(source, /defineAuditHistoryPanel/);
    assert.match(source, /auditHistory/);
    assert.match(source, /Invoice review ledger/);
  }

  assert.ok(typescript.indexOf('parent.appendChild(showcase)') < typescript.indexOf('grid.source = source'));
  assert.match(typescript, /panelHandle\.destroy/);
  assert.match(react, /const plugins = useMemo/);
  assert.match(react, /const auditHistory = useMemo/);
  assert.match(vue, /const rows = ref/);
  assert.match(vue, /const plugins = \[/);
  assert.match(vue, /onUnmounted/);
  assert.match(angular, /standalone: true/);
  assert.match(angular, /encapsulation: ViewEncapsulation.None/);
  assert.match(angular, /ngOnDestroy/);
});
