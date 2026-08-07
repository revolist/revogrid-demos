import type {
  ColumnData,
  DataType,
  GroupingOptions,
  RowHeaders,
} from '@revolist/revogrid';

export const DATA_GRID_CONTEXT_MENU_ROW_SIZE = 48;

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

export function getDataGridContextMenuTheme(isDark: boolean) {
  return isDark ? 'darkCompact' : 'compact';
}

export function createTeamRows(): TeamRow[] {
  return TEAM_ROWS.map(row => ({ ...row }));
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
    { prop: 'status', name: 'Status', size: 125, sortable: true },
    {
      prop: 'score',
      name: 'Score',
      size: 110,
      sortable: true,
      filter: 'number',
      readonly: ({ model }) => model.status === 'Archived',
    },
    { prop: 'owner', name: 'Owner', size: 150, sortable: true },
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
