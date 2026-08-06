import type { ColumnRegular, DataType } from '@revolist/revogrid';
import type {
  AuditChange,
  AuditHistoryConfig,
  AuditHistoryPanelOptions,
  AuditRecord,
  CellFlashConfig,
} from '@revolist/revogrid-pro';

export type InvoiceRow = DataType & {
  id: string;
  customer: string;
  status: 'Draft' | 'In review' | 'Approved' | 'Blocked';
  owner: string;
  dueDate: string;
  amount: number;
  risk: 'Low' | 'Medium' | 'High';
};

const INVOICES: InvoiceRow[] = [
  { id: 'INV-2048', customer: 'Northwind', status: 'In review', owner: 'Avery Stone', dueDate: '2026-08-12', amount: 12800, risk: 'Medium' },
  { id: 'INV-2051', customer: 'Acme Finance', status: 'Approved', owner: 'Morgan Lee', dueDate: '2026-08-14', amount: 24600, risk: 'Low' },
  { id: 'INV-2057', customer: 'Globex', status: 'Blocked', owner: 'Riley Chen', dueDate: '2026-08-16', amount: 9800, risk: 'High' },
  { id: 'INV-2060', customer: 'Initech', status: 'Draft', owner: 'Jordan Kim', dueDate: '2026-08-18', amount: 17500, risk: 'Medium' },
  { id: 'INV-2064', customer: 'Soylent Systems', status: 'Approved', owner: 'Priya Shah', dueDate: '2026-08-20', amount: 31200, risk: 'Low' },
  { id: 'INV-2072', customer: 'Stark Industries', status: 'In review', owner: 'Sam Carter', dueDate: '2026-08-22', amount: 8700, risk: 'Medium' },
  { id: 'INV-2078', customer: 'Wayne Enterprises', status: 'Draft', owner: 'Tessa Brooks', dueDate: '2026-08-24', amount: 42900, risk: 'High' },
  { id: 'INV-2083', customer: 'Umbrella Retail', status: 'In review', owner: 'Nora Ellis', dueDate: '2026-08-27', amount: 15400, risk: 'Low' },
];

export function createInvoiceRows(): InvoiceRow[] {
  return INVOICES.map(row => ({ ...row }));
}

function money(value: unknown) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function token(value: unknown) {
  return String(value ?? '').toLowerCase().replace(/\s+/g, '-');
}

export function createAuditColumns(): ColumnRegular[] {
  return [
    { name: 'Invoice', prop: 'id', size: 112, readonly: true },
    { name: 'Customer', prop: 'customer', size: 180 },
    {
      name: 'Status',
      prop: 'status',
      size: 126,
      cellTemplate: (h, { value }) => h('span', { class: `audit-pill audit-pill--${token(value)}` }, String(value ?? '')),
    },
    { name: 'Owner', prop: 'owner', size: 145 },
    { name: 'Due date', prop: 'dueDate', size: 120 },
    {
      name: 'Amount',
      prop: 'amount',
      size: 118,
      cellTemplate: (h, { value }) => h('span', { class: 'audit-money' }, money(value)),
    },
    {
      name: 'Risk',
      prop: 'risk',
      size: 96,
      cellTemplate: (h, { value }) => h('span', { class: `risk-dot risk-dot--${token(value)}` }, String(value ?? '')),
    },
  ];
}

function snapshot(rowId: string, patch: Partial<InvoiceRow>): InvoiceRow {
  const row = INVOICES.find(item => item.id === rowId);
  if (!row) throw new Error(`Unknown invoice ${rowId}`);
  return { ...row, ...patch };
}

function change(
  id: string,
  rowId: string,
  column: keyof InvoiceRow,
  oldValue: unknown,
  newValue: unknown,
): AuditChange {
  const rowIndex = INVOICES.findIndex(row => row.id === rowId);
  return {
    id,
    rowId,
    rowIndex,
    rowType: 'rgRow',
    column,
    oldValue,
    newValue,
    oldRow: snapshot(rowId, { [column]: oldValue }),
    newRow: snapshot(rowId, { [column]: newValue }),
  };
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export function createSeedAuditRecords(): AuditRecord[] {
  return [
    {
      id: 'audit-seed-001',
      transactionId: 'tx-review-2048',
      type: 'cell-change',
      changedAt: hoursAgo(1),
      changedBy: { id: 'avery-stone', name: 'Avery Stone', email: 'avery@company.test' },
      changes: [change('change-seed-001', 'INV-2048', 'status', 'Draft', 'In review')],
      metadata: { source: 'manual', ticket: 'FIN-482' },
      presentation: { source: 'manual', targetLabel: 'INV-2048 · Status', detailLabel: 'Submitted for finance review', accent: true },
    },
    {
      id: 'audit-seed-002',
      transactionId: 'tx-approval-2051',
      type: 'cell-change',
      changedAt: hoursAgo(3),
      changedBy: { id: 'morgan-lee', name: 'Morgan Lee', email: 'morgan@company.test' },
      changes: [change('change-seed-002', 'INV-2051', 'status', 'In review', 'Approved')],
      metadata: { source: 'manual', policy: 'two-step-approval' },
      presentation: { source: 'manual', targetLabel: 'INV-2051 · Status', detailLabel: 'Approval policy completed' },
    },
    {
      id: 'audit-seed-003',
      transactionId: 'tx-batch-august',
      type: 'bulk-paste',
      changedAt: hoursAgo(7),
      changedBy: { id: 'riley-chen', name: 'Riley Chen', email: 'riley@company.test' },
      changes: [
        change('change-seed-003', 'INV-2057', 'dueDate', '2026-08-13', '2026-08-16'),
        change('change-seed-004', 'INV-2060', 'amount', 16400, 17500),
      ],
      metadata: { source: 'paste', batch: 'august-adjustments' },
      presentation: { source: 'paste', targetLabel: 'August adjustments', detailLabel: '2 cells updated from review sheet' },
    },
    {
      id: 'audit-seed-004',
      transactionId: 'tx-owner-2072',
      type: 'cell-change',
      changedAt: hoursAgo(25),
      changedBy: { id: 'priya-shah', name: 'Priya Shah', email: 'priya@company.test' },
      changes: [change('change-seed-005', 'INV-2072', 'owner', 'Avery Stone', 'Sam Carter')],
      metadata: { source: 'manual', reason: 'portfolio-reassignment' },
      presentation: { source: 'manual', targetLabel: 'INV-2072 · Owner', detailLabel: 'Portfolio ownership transferred' },
    },
  ];
}

export function createAuditHistoryConfig(): AuditHistoryConfig {
  return {
    getCurrentUser: () => ({
      id: 'avery-stone',
      name: 'Avery Stone',
      email: 'avery@company.test',
    }),
    rowIdProp: 'id',
    storage: 'memory',
    records: createSeedAuditRecords(),
    maxRecords: 250,
    getMetadata: ({ type }) => ({ source: type === 'bulk-paste' ? 'paste' : 'manual', workspace: 'invoice-review' }),
  };
}

export function createCellFlashConfig(): CellFlashConfig {
  return {
    mode: 'cell-and-row',
    queue: 'merge',
    duration: 1100,
    rowDuration: 1350,
    aria: { enabled: true },
  };
}

export function createPanelOptions(): AuditHistoryPanelOptions {
  return {
    placement: 'right',
    pageSize: 12,
    allowExport: true,
    allowCompare: true,
    restoreActions: ['cell', 'row', 'transaction'],
    labels: { title: 'Change ledger' },
  };
}

export function prefersDarkTheme() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
