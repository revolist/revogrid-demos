import type {
  ColumnData,
  DataType,
  GroupingOptions,
  RowHeaders,
} from '@revolist/revogrid';
import { badgeRenderer } from '@revolist/revogrid-pro';

export const DATA_GRID_CONTEXT_MENU_ROW_SIZE = 48;
export const STATUS_BADGE_STYLES = {
  Active: { backgroundColor: '#dcfce7', color: '#166534' },
  Review: { backgroundColor: '#fef3c7', color: '#92400e' },
  Archived: { backgroundColor: '#fee2e2', color: '#991b1b' },
} as const;

export type TeamRow = DataType & {
  id: number;
  name: string;
  team: string;
  status: 'Active' | 'Review' | 'Archived' | null;
  score: number | null;
  owner: string;
  approved: boolean | null;
  schedule: { start: number; end: number; label?: string }[];
  joinedAt: string;
};

export type TeamRowCreationAction = 'insertAbove' | 'insertBelow' | 'duplicate';

const TEAM_ROWS: TeamRow[] = [
  { id: 101, name: 'Ada Lovelace', team: 'Platform', status: 'Active', score: 98, owner: 'Avery Stone', approved: true, schedule: [{ start: 8, end: 12, label: 'Build' }, { start: 14, end: 18, label: 'Review' }], joinedAt: '2024-01-15' },
  { id: 102, name: 'Grace Hopper', team: 'Platform', status: 'Active', score: 95, owner: 'Morgan Lee', approved: true, schedule: [{ start: 9, end: 15, label: 'Implementation' }], joinedAt: '2023-11-02' },
  { id: 103, name: 'Margaret Hamilton', team: 'Platform', status: 'Review', score: 67, owner: 'Riley Chen', approved: false, schedule: [{ start: 10, end: 13, label: 'QA' }, { start: 15, end: 19, label: 'Fixes' }], joinedAt: '2025-02-20' },
  { id: 104, name: 'Edsger Dijkstra', team: 'Research', status: 'Review', score: 91, owner: 'Jordan Kim', approved: null, schedule: [{ start: 7, end: 11, label: 'Research' }], joinedAt: '2024-06-10' },
  { id: 105, name: 'Alan Turing', team: 'Research', status: 'Archived', score: 99, owner: 'Priya Shah', approved: true, schedule: [{ start: 8, end: 17, label: 'Complete' }], joinedAt: '2022-09-01' },
  { id: 106, name: 'Barbara Liskov', team: 'Research', status: 'Active', score: 94, owner: 'Sam Carter', approved: true, schedule: [{ start: 11, end: 16, label: 'Design' }], joinedAt: '2023-03-27' },
  { id: 107, name: 'Katherine Johnson', team: 'Operations', status: 'Active', score: 96, owner: 'Tessa Brooks', approved: true, schedule: [{ start: 6, end: 12, label: 'Operations' }], joinedAt: '2024-08-05' },
  { id: 108, name: 'Radia Perlman', team: 'Operations', status: 'Review', score: 73, owner: 'Nora Ellis', approved: false, schedule: [{ start: 12, end: 18, label: 'Network review' }], joinedAt: '2025-01-13' },
  { id: 109, name: 'Donald Knuth', team: 'Operations', status: 'Archived', score: 97, owner: 'Avery Stone', approved: true, schedule: [{ start: 9, end: 17, label: 'Documentation' }], joinedAt: '2021-12-06' },
];

export function getDataGridContextMenuTheme(isDark: boolean) {
  return isDark ? 'darkCompact' : 'compact';
}

export function createTeamRows(): TeamRow[] {
  return TEAM_ROWS.map(row => ({
    ...row,
    schedule: row.schedule.map(event => ({ ...event })),
  }));
}

export function createTeamRowForAction(
  id: number,
  action: TeamRowCreationAction,
  sourceRow?: TeamRow,
): TeamRow {
  if (action === 'duplicate' && sourceRow) {
    return {
      ...sourceRow,
      id,
      schedule: sourceRow.schedule.map(event => ({ ...event })),
    };
  }

  return {
    id,
    name: '',
    team: '',
    status: null,
    score: null,
    owner: '',
    approved: null,
    schedule: [],
    joinedAt: '',
  };
}

export function createDataGridFormattingPresets() {
  return {
    rowKeyProp: 'id',
    columns: [
      {
        prop: 'score',
        format: {
          presentation: {
            id: 'progress-line',
            options: { minValue: 0, maxValue: 100 },
          },
          appearance: { horizontal: 'right' },
        },
      },
      { prop: 'status', format: { presentation: { id: 'badge' } } },
      { prop: 'approved', format: { presentation: { id: 'thumbs' } } },
      {
        prop: 'schedule',
        format: {
          presentation: {
            id: 'timeline',
            options: { timelineRange: { start: 0, end: 24 } },
          },
        },
      },
      {
        prop: 'joinedAt',
        format: { value: { preset: 'date', dateStyle: 'medium' } },
      },
    ],
    cells: [
      {
        rowKey: 101,
        prop: 'score',
        format: {
          presentation: {
            id: 'circular-progress',
            options: { minValue: 0, maxValue: 100, showValue: true },
          },
          appearance: {
            bold: true,
            textColor: '#166534',
            fillColor: '#dcfce7',
            horizontal: 'right',
          },
        },
      },
      {
        rowKey: 102,
        prop: 'name',
        format: {
          presentation: {
            id: 'avatar-with-text',
            options: { avatarSize: 24, rectangular: false },
          },
        },
      },
      {
        rowKey: 103,
        prop: 'score',
        format: {
          presentation: {
            id: 'heatmap',
            options: { minValue: 0, maxValue: 100, colorMap: 'heatmap' },
          },
          appearance: {
            bold: true,
            textColor: '#92400e',
            fillColor: '#fef3c7',
            horizontal: 'center',
          },
        },
      },
      {
        rowKey: 105,
        prop: 'score',
        format: {
          presentation: { id: 'rating', options: { maxStars: 5 } },
          appearance: {
            strike: true,
            textColor: '#991b1b',
            fillColor: '#fee2e2',
            horizontal: 'center',
          },
        },
      },
      {
        rowKey: 108,
        prop: 'owner',
        format: {
          appearance: {
            italic: true,
            textColor: '#1e40af',
            fillColor: '#dbeafe',
          },
        },
      },
    ],
  } as const;
}

export function createContextMenuColumns(): ColumnData {
  return [
    {
      name: 'Identity',
      collapsible: true,
      children: [
        { prop: 'id', name: 'ID', size: 90, readonly: true, sortable: true },
        { prop: 'name', name: 'Name', size: 190, sortable: true },
      ],
    },
    { prop: 'team', name: 'Team', size: 145, sortable: true },
    {
      prop: 'status',
      name: 'Status',
      size: 135,
      sortable: true,
      columnType: 'dropdown',
      cellTemplate: badgeRenderer,
      badgeStyles: STATUS_BADGE_STYLES,
      dropdown: {
        syncCellTemplate: true,
        source: [
          ...['Active', 'Review', 'Archived'].map(value => ({ value, label: value })),
          { value: null, label: 'Not set' },
        ],
        placeholder: 'Select status',
      },
    },
    {
      prop: 'score',
      name: 'Score',
      size: 110,
      sortable: true,
      filter: 'number',
      readonly: ({ model }) => model.status === 'Archived',
    },
    { prop: 'owner', name: 'Owner', size: 150, sortable: true },
    {
      prop: 'approved',
      name: 'Approved',
      size: 110,
      sortable: true,
      columnType: 'boolean',
      dropdown: { syncCellTemplate: true },
    },
    { prop: 'schedule', name: 'Schedule', size: 180, sortable: true },
    {
      prop: 'joinedAt',
      name: 'Joined',
      size: 145,
      sortable: true,
    },
  ];
}

export function createTeamGrouping(): GroupingOptions {
  return {
    props: ['team'],
    expandedAll: true,
  };
}

export function createContextMenuRowHeaders(): RowHeaders {
  return {
    prop: '_revo_row_header',
    cellProperties: () => ({
      class: 'data-grid-context-menu-row-header-cell',
      style: {
        fontSize: '14px',
        lineHeight: '21px',
        textAlign: 'center',
      },
    }),
  };
}
