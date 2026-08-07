import {
  getGroupingName,
  isGrouping,
  rowTypes,
  type DataType,
} from '@revolist/revogrid';
import {
  DialogPlugin,
  createDialogButton,
  type ContextMenuItem,
  type DataGridContextMenuContext,
} from '@revolist/revogrid-pro';
import type { TeamRow } from './data-grid-context-menu.data';

type DetailEntry = {
  readonly label: string;
  readonly value: string;
};

export type ContextMenuDetailsSpec = {
  readonly actionLabel: string;
  readonly title: string;
  readonly kicker: string;
  readonly description: string;
  readonly entries: readonly DetailEntry[];
};

const DETAILS_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 2v12h16V6H4Zm4 2.25a2.75 2.75 0 1 1 0 5.5 2.75 2.75 0 0 1 0-5.5Zm6 .75h4v1.5h-4V9Zm0 3h4v1.5h-4V12Zm-10 4c.45-1.55 1.94-2.5 4-2.5s3.55.95 4 2.5H4Z"/>
  </svg>
`;

const DETAILS_POPUP_OWNER = {};

export function createContextMenuDetailsItems(
  context: DataGridContextMenuContext<TeamRow>,
): ContextMenuItem[] {
  const spec = createContextMenuDetailsSpec(context);
  if (!spec) return [];

  return [{
    id: `demo.${context.surface}.summary`,
    name: spec.actionLabel,
    icon: DETAILS_ICON,
    action: () => openContextMenuDetailsDialog(context, spec),
  }];
}

export function createContextMenuDetailsSpec(
  context: DataGridContextMenuContext<TeamRow>,
): ContextMenuDetailsSpec | undefined {
  switch (context.surface) {
    case 'cell':
      return createEmployeeProfileSpec(context);
    case 'rowHeader':
      return createRowDetailsSpec(context);
    case 'rowGroup':
      return createTeamSummarySpec(context);
    case 'columnHeader':
      return createColumnSummarySpec(context);
    case 'columnGroupHeader':
      return createColumnGroupSummarySpec(context);
  }
}

function createEmployeeProfileSpec(
  context: DataGridContextMenuContext<TeamRow>,
): ContextMenuDetailsSpec | undefined {
  const row = getInvokedRow(context);
  if (!row) return;
  const selectedColumn = context.column?.name ?? context.column?.prop;

  return {
    actionLabel: 'View employee profile',
    title: 'Employee profile',
    kicker: `Employee #${row.id}`,
    description: `${row.name} · ${row.team}`,
    entries: [
      detail('Status', row.status),
      detail('Score', `${row.score} / 100`),
      detail('Owner', row.owner),
      detail('Selected field', selectedColumn ?? '—'),
      detail('Current value', context.menu.target === 'row'
        ? formatValue(context.menu.cell?.value)
        : '—'),
    ],
  };
}

function createRowDetailsSpec(
  context: DataGridContextMenuContext<TeamRow>,
): ContextMenuDetailsSpec | undefined {
  const rows = getResolvedRows(context);
  if (!rows.length) return;
  if (rows.length === 1) {
    const row = rows[0].model;
    return {
      actionLabel: 'View row details',
      title: 'Row details',
      kicker: `Source row ${rows[0].sourceIndex + 1}`,
      description: row.name,
      entries: [
        detail('Employee ID', row.id),
        detail('Team', row.team),
        detail('Status', row.status),
        detail('Score', `${row.score} / 100`),
        detail('Owner', row.owner),
      ],
    };
  }

  const models = rows.map(row => row.model);
  return {
    actionLabel: 'View row details',
    title: 'Selected row details',
    kicker: `${rows.length} selected rows`,
    description: models.map(row => row.name).join(', '),
    entries: [
      detail('Teams', unique(models.map(row => row.team)).join(', ')),
      detail('Active', countStatus(models, 'Active')),
      detail('In review', countStatus(models, 'Review')),
      detail('Archived', countStatus(models, 'Archived')),
      detail('Average score', average(models.map(row => row.score))),
    ],
  };
}

function createTeamSummarySpec(
  context: DataGridContextMenuContext<TeamRow>,
): ContextMenuDetailsSpec | undefined {
  const rows = getResolvedRows(context).map(row => row.model);
  const groupModel = context.menu.target === 'row'
    ? context.menu.cell?.model
    : undefined;
  const team = formatValue(getGroupingName(groupModel) ?? rows[0]?.team);
  if (!rows.length && team === '—') return;

  return {
    actionLabel: 'View team summary',
    title: 'Team summary',
    kicker: team,
    description: `${rows.length} ${rows.length === 1 ? 'team member' : 'team members'}`,
    entries: [
      detail('Active', countStatus(rows, 'Active')),
      detail('In review', countStatus(rows, 'Review')),
      detail('Archived', countStatus(rows, 'Archived')),
      detail('Average score', average(rows.map(row => row.score))),
      detail('Owners', unique(rows.map(row => row.owner)).join(', ') || '—'),
    ],
  };
}

function createColumnSummarySpec(
  context: DataGridContextMenuContext<TeamRow>,
): ContextMenuDetailsSpec | undefined {
  const column = context.column;
  if (!column) return;
  const rows = getVisibleRows(context);
  const values = rows.map(row => row[column.prop]);
  const populated = values.filter(value => value !== null && value !== undefined && value !== '');
  const numeric = populated.filter((value): value is number => (
    typeof value === 'number' && Number.isFinite(value)
  ));
  const entries: DetailEntry[] = [
    detail('Property', column.prop),
    detail('Visible rows', rows.length),
    detail('Populated values', populated.length),
    detail('Unique values', unique(populated.map(formatValue)).length),
  ];
  if (numeric.length === populated.length && numeric.length) {
    entries.push(
      detail('Minimum', Math.min(...numeric)),
      detail('Maximum', Math.max(...numeric)),
      detail('Average', average(numeric)),
    );
  } else {
    entries.push(detail('Sample', unique(populated.map(formatValue)).slice(0, 3).join(', ') || '—'));
  }

  return {
    actionLabel: 'View column summary',
    title: 'Column summary',
    kicker: formatValue(column.name ?? column.prop),
    description: 'Business summary of currently visible row values.',
    entries,
  };
}

function createColumnGroupSummarySpec(
  context: DataGridContextMenuContext<TeamRow>,
): ContextMenuDetailsSpec | undefined {
  const columns = context.columns;
  if (!columns.length) return;
  const rows = getVisibleRows(context);
  const names = columns.map(column => formatValue(column.name ?? column.prop));

  return {
    actionLabel: 'View column-group summary',
    title: 'Column-group summary',
    kicker: formatValue(context.columnGroup?.name ?? 'Column group'),
    description: names.join(', '),
    entries: [
      detail('Child columns', columns.length),
      detail('Properties', columns.map(column => String(column.prop)).join(', ')),
      detail('Visible rows', rows.length),
      detail('Readonly fields', columns.filter(column => column.readonly === true).length),
    ],
  };
}

function openContextMenuDetailsDialog(
  context: DataGridContextMenuContext<TeamRow>,
  spec: ContextMenuDetailsSpec,
): void {
  const dialog = context.menu.providers.plugins.getByClass(DialogPlugin);
  if (!dialog) return;
  const document = context.menu.revogrid.ownerDocument;
  const handle = dialog.open({
    title: spec.title,
    closeLabel: `Close ${spec.title.toLowerCase()}`,
    popupOwner: DETAILS_POPUP_OWNER,
    surfaceClass: 'data-grid-context-menu-details-dialog',
    returnFocus: context.menu.triggerElement,
  });
  handle.body.append(createDetailsView(document, spec));
  handle.actions.append(createDialogButton(
    document,
    'Done',
    () => handle.close(),
    'primary',
  ));
}

function createDetailsView(
  document: Document,
  spec: ContextMenuDetailsSpec,
): HTMLElement {
  const content = document.createElement('div');
  content.className = 'data-grid-context-menu-details';

  const summary = document.createElement('header');
  summary.className = 'data-grid-context-menu-details__summary';
  const kicker = document.createElement('span');
  kicker.className = 'data-grid-context-menu-details__kicker';
  kicker.textContent = spec.kicker;
  const description = document.createElement('p');
  description.textContent = spec.description;
  summary.append(kicker, description);

  const details = document.createElement('dl');
  details.className = 'data-grid-context-menu-details__list';
  spec.entries.forEach(entry => {
    const term = document.createElement('dt');
    term.textContent = entry.label;
    const value = document.createElement('dd');
    value.dataset.detail = entry.label;
    value.textContent = entry.value;
    details.append(term, value);
  });
  content.append(summary, details);
  return content;
}

function getInvokedRow(
  context: DataGridContextMenuContext<TeamRow>,
): TeamRow | undefined {
  const model = context.menu.target === 'row'
    ? context.menu.cell?.model
    : undefined;
  if (isTeamRow(model)) return model;
  const resolved = context.rows.find(row => isTeamRow(row.model))?.model;
  if (resolved) return resolved;
  return getInvokedStoreRow(context)?.model;
}

function getResolvedRows(
  context: DataGridContextMenuContext<TeamRow>,
): Array<{ readonly model: TeamRow; readonly sourceIndex: number }> {
  const rows = context.rows.flatMap(row => isTeamRow(row.model) ? [row] : []);
  if (rows.length) return rows;
  const fallback = getInvokedStoreRow(context);
  return fallback ? [fallback] : [];
}

function getInvokedStoreRow(
  context: DataGridContextMenuContext<TeamRow>,
): { readonly model: TeamRow; readonly sourceIndex: number } | undefined {
  if (context.menu.target !== 'row' || !context.menu.cell) return;
  const { cell } = context.menu;
  if (isTeamRow(cell.model)) {
    return { model: cell.model, sourceIndex: cell.rowIndex };
  }
  const { providers } = context.menu;
  if (!providers) return;
  const store = providers.data.stores[cell.type]?.store;
  if (!store) return;
  const physicalIndex = store.get('items')[cell.rowIndex];
  if (physicalIndex === undefined) return;
  const model = store.get('source')[physicalIndex];
  return isTeamRow(model) ? { model, sourceIndex: physicalIndex } : undefined;
}

function getVisibleRows(context: DataGridContextMenuContext<TeamRow>): TeamRow[] {
  if (context.rows.length) {
    return context.rows.map(row => row.model).filter(isTeamRow);
  }
  const providers = context.menu.providers;
  if (!providers) return [];
  return rowTypes.flatMap(type => {
    const store = providers.data.stores[type]?.store;
    if (!store) return [];
    const source = store.get('source');
    return store.get('items')
      .map(index => source[index])
      .filter(isTeamRow);
  });
}

function isTeamRow(model: DataType | undefined): model is TeamRow {
  return !!model
    && !isGrouping(model)
    && typeof model.id === 'number'
    && typeof model.name === 'string';
}

function detail(label: string, value: unknown): DetailEntry {
  return { label, value: formatValue(value) };
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function countStatus(rows: readonly TeamRow[], status: TeamRow['status']): number {
  return rows.filter(row => row.status === status).length;
}

function average(values: readonly number[]): string {
  if (!values.length) return '—';
  return (values.reduce((sum, value) => sum + value, 0) / values.length)
    .toFixed(1);
}
