import type {
  ColumnData,
  DataType,
  GroupingOptions,
} from '@revolist/revogrid';
import type { DataGridContextMenuConfig } from '@revolist/revogrid-pro';

export const DATA_GRID_CONTEXT_MENU_ROW_SIZE = 48;

export function getDataGridContextMenuTheme(isDark: boolean) {
  return isDark ? 'darkCompact' : 'compact';
}

export type TeamRow = DataType & {
  id: number;
  name: string;
  team: string;
  status: 'Active' | 'Review' | 'Archived';
  score: number;
  owner: string;
};

const TEAM_ROWS: TeamRow[] = [
  { id: 101, name: 'Ada Lovelace', team: 'Platform', status: 'Active', score: 98, owner: 'Avery Stone' },
  { id: 102, name: 'Grace Hopper', team: 'Platform', status: 'Active', score: 95, owner: 'Morgan Lee' },
  { id: 103, name: 'Margaret Hamilton', team: 'Platform', status: 'Review', score: 97, owner: 'Riley Chen' },
  { id: 104, name: 'Edsger Dijkstra', team: 'Research', status: 'Review', score: 91, owner: 'Jordan Kim' },
  { id: 105, name: 'Alan Turing', team: 'Research', status: 'Archived', score: 99, owner: 'Priya Shah' },
  { id: 106, name: 'Barbara Liskov', team: 'Research', status: 'Active', score: 94, owner: 'Sam Carter' },
  { id: 107, name: 'Katherine Johnson', team: 'Operations', status: 'Active', score: 96, owner: 'Tessa Brooks' },
  { id: 108, name: 'Radia Perlman', team: 'Operations', status: 'Review', score: 93, owner: 'Nora Ellis' },
  { id: 109, name: 'Donald Knuth', team: 'Operations', status: 'Archived', score: 97, owner: 'Avery Stone' },
];

export function createTeamRows(): TeamRow[] {
  return TEAM_ROWS.map(row => ({ ...row }));
}

export function createContextMenuColumns(): ColumnData {
  return [
    {
      name: 'Identity',
      collapsible: true,
      children: [
        { prop: 'id', name: 'ID', size: 90, readonly: true },
        { prop: 'name', name: 'Name', size: 190 },
      ],
    },
    { prop: 'team', name: 'Team', size: 145 },
    { prop: 'status', name: 'Status', size: 125 },
    {
      prop: 'score',
      name: 'Score',
      size: 110,
      filter: 'number',
      readonly: ({ model }) => model.status === 'Archived',
    },
    { prop: 'owner', name: 'Owner', size: 150 },
  ];
}

export function createTeamGrouping(): GroupingOptions {
  return {
    props: ['team'],
    expandedAll: true,
  };
}

export function createContextMenuRowAutoSize() {
  return {
    minHeight: DATA_GRID_CONTEXT_MENU_ROW_SIZE,
    maxHeight: 160,
  };
}

export function createDataGridContextMenuConfig(): DataGridContextMenuConfig {
  let nextRowId = Math.max(...TEAM_ROWS.map(row => row.id)) + 1;
  let nextColumnId = 1;

  return {
    // Hide one stable built-in ID while keeping every other preset command.
    hiddenItems: { 'row.delete': true },
    rowPinning: true,
    createRow: ({ action, sourceRow }) => {
      const original = sourceRow as TeamRow | undefined;
      return {
        id: nextRowId++,
        name: original?.name ?? `New ${action === 'insertAbove' ? 'upper' : 'lower'} row`,
        team: original?.team ?? 'Platform',
        status: original?.status ?? 'Review',
        score: original?.score ?? 0,
        owner: original?.owner ?? 'Unassigned',
      } satisfies TeamRow;
    },
    columnSchema: {
      createColumn: ({ action, sourceColumn }) => ({
        ...sourceColumn,
        prop: `${String(sourceColumn.prop)}-${action}-${nextColumnId++}`,
        name: `${sourceColumn.name ?? String(sourceColumn.prop)} copy`,
      }),
    },
    // Add an application action after the generated menu on every surface.
    items: context => [{
      id: 'demo.inspect',
      name: `Inspect ${context.surface}`,
      action: () => window.alert(`Custom action from ${context.surface}`),
    }],
    // Replace only the grouped-column-header surface; other defaults stay intact.
    getItems: (context, defaults) => context.surface === 'columnGroupHeader'
      ? [{
          id: 'demo.group-summary',
          name: `Summarize ${context.columnGroup?.name ?? 'column group'}`,
          action: () => window.alert(`${context.columns.length} child columns`),
        }]
      : defaults,
  };
}
