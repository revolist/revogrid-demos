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
} from '../src/audit-history.shared.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../src');
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
    assert.match(source, /audit-workspace/);
    assert.doesNotMatch(source, /audit-hero|audit-metrics|audit-hint|Invoice review ledger/);
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

test('all framework variants reactively apply the native RevoGrid theme', async () => {
  const files = [
    'audit-history.ts',
    'audit-history.react.tsx',
    'audit-history.vue',
    'audit-history.angular.ts',
  ];
  const sources = await Promise.all(files.map(readSource));
  const styles = await readSource('audit-history.scss');

  for (const source of sources) {
    assert.match(source, /currentTheme/);
    assert.match(source, /observeCurrentTheme/);
    assert.match(source, /darkMaterial/);
  }
  assert.doesNotMatch(styles, /@media \(prefers-color-scheme: dark\)/);
  assert.doesNotMatch(styles, /\.audit-showcase\.is-dark/);
});

test('showcase surfaces stay transparent and inherit the host theme', async () => {
  const styles = await readSource('audit-history.scss');

  assert.match(styles, /\.audit-showcase\s*\{[^}]*background:\s*transparent/);
  assert.match(styles, /\.audit-workspace\s*\{[^}]*background:\s*transparent/);
  assert.doesNotMatch(styles, /background:\s*#eef1f7/);
  assert.doesNotMatch(styles, /background:\s*rgba\(255,\s*255,\s*255/);
  assert.doesNotMatch(styles, /(?:^|\n)\s*(?::root|body|#app)\s*\{/);
});

test('showcase presents only the borderless grid workspace', async () => {
  const styles = await readSource('audit-history.scss');

  assert.doesNotMatch(styles, /\.audit-(?:hero|eyebrow|metrics|hint)\b/);
  assert.match(styles, /\.audit-showcase\s*\{[^}]*padding:\s*0/);
  assert.match(styles, /\.audit-workspace\s*\{[^}]*border:\s*0/);
  assert.match(styles, /\.audit-workspace\s*\{[^}]*border-radius:\s*0/);
  assert.match(styles, /\.audit-workspace\s*\{[^}]*box-shadow:\s*none/);
});

test('risk indicators keep their dot beside longer labels', async () => {
  const styles = await readSource('audit-history.scss');
  const dotBlock = styles.match(/\.risk-dot::before\s*\{([^}]*)\}/)?.[1] ?? '';

  assert.match(dotBlock, /flex:\s*0\s+0\s+7px/);
});

test('compact layouts keep the audit panel docked beside the grid', async () => {
  const styles = await readSource('audit-history.scss');
  const compactStyles = styles.match(/@media \(max-width:\s*960px\)\s*\{([\s\S]*)\}\s*$/)?.[1] ?? '';

  assert.doesNotMatch(compactStyles, /flex-direction:\s*column/);
  assert.match(styles, /\.audit-workspace\.rv-audit-history-dock\.rv-audit-history-dock--right\s*\{[^}]*flex-direction:\s*row/);
  assert.match(compactStyles, /flex-basis:\s*320px/);
  assert.match(compactStyles, /width:\s*320px/);
});
