import type { ColumnRegular, ColumnType } from '@revolist/revogrid';
import {
  AdvanceFilterPlugin,
  avatarWithTextRenderer,
  ColumnStretchPlugin,
  DimensionAnimationPlugin,
  ExportExcelPlugin,
  type ExportExcelEvent,
  RowOddPlugin,
  RowOrderPlugin,
  RowSelectPlugin,
  StickyCellsPlugin,
  TreeDataPlugin,
} from '@revolist/revogrid-pro';

export type TreeDataRow = {
  id: string;
  parentId: string | null;
  avatar: string;
  fullName: string;
  team: string;
  role: string;
  status: 'On track' | 'At risk' | 'Blocked' | 'Planned';
  salary: number;
};

export const TREE_PLUGINS = [
  TreeDataPlugin,
  DimensionAnimationPlugin,
  RowOrderPlugin,
  AdvanceFilterPlugin,
  ExportExcelPlugin,
  RowSelectPlugin,
  RowOddPlugin,
  ColumnStretchPlugin,
  StickyCellsPlugin,
];

export const TREE_ROW_ORDER_CONFIG = {
  prop: 'fullName',
  preview: 'compact',
} as const;

export const TREE_ROW_SELECT_CONFIG = {
  rowOrder: true,
};

export const TREE_EXPORT_CONFIG: ExportExcelEvent = {
  sheetName: 'Tree Data',
  workbookName: 'tree-data.xlsx',
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export const TREE_COLUMN_TYPES: Record<string, ColumnType> = {
  currency: {
    cellTemplate: (_h, { value }) => currencyFormatter.format(Number(value ?? 0)),
  },
};

export function createTreeRows(): TreeDataRow[] {
  return [
    { id: 'product', parentId: null, avatar: 'MC', fullName: 'Maya Chen', team: 'Product', role: 'VP Product', status: 'On track', salary: 198000 },
    { id: 'platform', parentId: 'product', avatar: 'NS', fullName: 'Noah Smith', team: 'Platform', role: 'Engineering lead', status: 'On track', salary: 176000 },
    { id: 'platform-api', parentId: 'platform', avatar: 'EG', fullName: 'Eva Green', team: 'Platform', role: 'API engineer', status: 'At risk', salary: 154000 },
    { id: 'platform-grid', parentId: 'platform', avatar: 'LB', fullName: 'Liam Brown', team: 'Platform', role: 'Grid engineer', status: 'On track', salary: 158000 },
    { id: 'experience', parentId: 'product', avatar: 'OL', fullName: 'Olivia Lee', team: 'Experience', role: 'Design lead', status: 'Planned', salary: 165000 },
    { id: 'experience-design', parentId: 'experience', avatar: 'MW', fullName: 'Mia Wilson', team: 'Experience', role: 'Product designer', status: 'On track', salary: 142000 },
    { id: 'experience-research', parentId: 'experience', avatar: 'ED', fullName: 'Ethan Davis', team: 'Experience', role: 'UX researcher', status: 'Blocked', salary: 137000 },
    { id: 'data', parentId: null, avatar: 'AM', fullName: 'Ava Martin', team: 'Data', role: 'VP Data', status: 'On track', salary: 202000 },
    { id: 'analytics', parentId: 'data', avatar: 'JC', fullName: 'James Clark', team: 'Analytics', role: 'Analytics lead', status: 'At risk', salary: 171000 },
    { id: 'analytics-bi', parentId: 'analytics', avatar: 'SH', fullName: 'Sofia Hall', team: 'Analytics', role: 'BI engineer', status: 'On track', salary: 149000 },
    { id: 'analytics-science', parentId: 'analytics', avatar: 'AP', fullName: 'Amelia Parker', team: 'Analytics', role: 'Data scientist', status: 'Planned', salary: 162000 },
    { id: 'operations', parentId: 'data', avatar: 'JL', fullName: 'Jack Lewis', team: 'Operations', role: 'Operations lead', status: 'On track', salary: 151000 },
    { id: 'operations-quality', parentId: 'operations', avatar: 'CH', fullName: 'Charlotte Harris', team: 'Operations', role: 'Quality analyst', status: 'On track', salary: 126000 },
    { id: 'operations-enablement', parentId: 'operations', avatar: 'HM', fullName: 'Henry Moore', team: 'Operations', role: 'Enablement manager', status: 'At risk', salary: 133000 },
  ];
}

function statusTemplate(h: Parameters<NonNullable<ColumnRegular['cellTemplate']>>[0], value: unknown) {
  const label = String(value ?? '');
  const tone = label.toLowerCase().replaceAll(' ', '-');
  return h('span', { class: `tree-status tree-status--${tone}` }, label);
}

export function createTreeColumns(): ColumnRegular[] {
  const childCell = ({ model }: { model: Record<string, unknown> }) => ({
    subRow: Boolean(model.parentId),
  });

  return [
    {
      name: 'Team member',
      prop: 'fullName',
      size: 300,
      tree: true,
      rowSelect: true,
      rowDrag: true,
      sortable: true,
      filter: ['selection'],
      avatarProp: 'avatar',
      avatarLabelProp: 'fullName',
      avatarIndexProp: 'id',
      avatarSize: 22,
      cellTemplate: avatarWithTextRenderer,
      cellProperties: childCell,
    },
    {
      name: 'Team',
      prop: 'team',
      size: 150,
      sortable: true,
      filter: ['selection'],
      cellProperties: childCell,
    },
    {
      name: 'Role',
      prop: 'role',
      size: 180,
      sortable: true,
      filter: ['selection'],
      cellProperties: childCell,
    },
    {
      name: 'Status',
      prop: 'status',
      size: 130,
      filter: ['selection'],
      cellTemplate: (h, { value }) => statusTemplate(h, value),
      cellProperties: childCell,
    },
    {
      name: 'Salary',
      prop: 'salary',
      size: 130,
      columnType: 'currency',
      sortable: true,
      cellProperties: ({ model }) => ({
        ...childCell({ model }),
        class: { 'tree-salary': true },
      }),
    },
  ];
}

export function createTreeConfig(rows: TreeDataRow[], stickyParents = true) {
  return {
    expandedRowIds: new Set(rows.filter((row) => row.parentId === null).map((row) => row.id)),
    stickyParents,
    animation: true,
  };
}

export function prefersDarkTheme() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
