import type { ColumnFilterConfig, ColumnRegular, ColumnType } from '@revolist/revogrid';
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
  type StickyCellsConfig,
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

export const TREE_STICKY_CELLS_CONFIG: StickyCellsConfig = {
  maxRows: 2,
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

type TreeSelectionItem = Pick<TreeDataRow, 'id' | 'avatar' | 'fullName'> & {
  value: string;
  label: string;
};
type TreeTemplateH = Parameters<NonNullable<ColumnRegular['cellTemplate']>>[0];

function renderTeamMemberFilterOption(
  h: TreeTemplateH,
  { item, value }: { item: TreeSelectionItem; value: string },
) {
  return avatarWithTextRenderer!(h, {
    value,
    model: item,
    column: {
      avatarProp: 'avatar',
      avatarLabelProp: 'fullName',
      avatarIndexProp: 'id',
      avatarSize: 22,
    },
  } as never);
}

function renderStatusFilterOption(h: TreeTemplateH, { value }: { value: string }) {
  return statusTemplate(h, value);
}

/** Keep selection-filter options visually aligned with their owning columns. */
export function createTreeFilterConfig(rows: TreeDataRow[]): ColumnFilterConfig {
  return {
    selection: {
      sortDirection: 'asc',
      getItems: {
        fullName: () => rows.map(({ id, avatar, fullName }) => ({
          value: fullName,
          label: fullName,
          id,
          avatar,
          fullName,
        })),
      },
      syncCellTemplate: {
        fullName: true,
        status: true,
      },
      // Keep explicit option renderers for the packaged demo runtime too.
      // They share the same cell templates, while `syncCellTemplate` remains
      // available to newer runtime versions.
      itemTemplate: {
        fullName: renderTeamMemberFilterOption,
        status: renderStatusFilterOption,
      },
    },
  } as unknown as ColumnFilterConfig;
}

export function createTreeRows(): TreeDataRow[] {
  return [
    { id: 'product', parentId: null, avatar: 'MC', fullName: 'Maya Chen', team: 'Product', role: 'VP Product', status: 'On track', salary: 198000 },
    { id: 'platform', parentId: 'product', avatar: 'NS', fullName: 'Noah Smith', team: 'Platform', role: 'Engineering lead', status: 'On track', salary: 176000 },
    { id: 'platform-api', parentId: 'platform', avatar: 'EG', fullName: 'Eva Green', team: 'Platform', role: 'API engineer', status: 'At risk', salary: 154000 },
    { id: 'platform-grid', parentId: 'platform', avatar: 'LB', fullName: 'Liam Brown', team: 'Platform', role: 'Grid engineer', status: 'On track', salary: 158000 },
    { id: 'platform-security', parentId: 'platform', avatar: 'GY', fullName: 'Grace Young', team: 'Platform', role: 'Security engineer', status: 'On track', salary: 157000 },
    { id: 'platform-infrastructure', parentId: 'platform', avatar: 'LK', fullName: 'Lucas King', team: 'Platform', role: 'Infrastructure engineer', status: 'Planned', salary: 156000 },
    { id: 'platform-reliability', parentId: 'platform', avatar: 'EW', fullName: 'Ella Wright', team: 'Platform', role: 'Reliability engineer', status: 'On track', salary: 159000 },
    { id: 'experience', parentId: 'product', avatar: 'OL', fullName: 'Olivia Lee', team: 'Experience', role: 'Design lead', status: 'Planned', salary: 165000 },
    { id: 'experience-design', parentId: 'experience', avatar: 'MW', fullName: 'Mia Wilson', team: 'Experience', role: 'Product designer', status: 'On track', salary: 142000 },
    { id: 'experience-research', parentId: 'experience', avatar: 'ED', fullName: 'Ethan Davis', team: 'Experience', role: 'UX researcher', status: 'Blocked', salary: 137000 },
    { id: 'experience-content', parentId: 'experience', avatar: 'LS', fullName: 'Leo Scott', team: 'Experience', role: 'Content designer', status: 'On track', salary: 139000 },
    { id: 'experience-systems', parentId: 'experience', avatar: 'ZA', fullName: 'Zoe Adams', team: 'Experience', role: 'Design systems engineer', status: 'At risk', salary: 147000 },
    { id: 'experience-accessibility', parentId: 'experience', avatar: 'AB', fullName: 'Aria Baker', team: 'Experience', role: 'Accessibility lead', status: 'On track', salary: 145000 },
    { id: 'data', parentId: null, avatar: 'AM', fullName: 'Ava Martin', team: 'Data', role: 'VP Data', status: 'On track', salary: 202000 },
    { id: 'analytics', parentId: 'data', avatar: 'JC', fullName: 'James Clark', team: 'Analytics', role: 'Analytics lead', status: 'At risk', salary: 171000 },
    { id: 'analytics-bi', parentId: 'analytics', avatar: 'SH', fullName: 'Sofia Hall', team: 'Analytics', role: 'BI engineer', status: 'On track', salary: 149000 },
    { id: 'analytics-science', parentId: 'analytics', avatar: 'AP', fullName: 'Amelia Parker', team: 'Analytics', role: 'Data scientist', status: 'Planned', salary: 162000 },
    { id: 'analytics-engineering', parentId: 'analytics', avatar: 'DE', fullName: 'Daniel Evans', team: 'Analytics', role: 'Data engineer', status: 'On track', salary: 153000 },
    { id: 'analytics-ml', parentId: 'analytics', avatar: 'CT', fullName: 'Chloe Turner', team: 'Analytics', role: 'ML engineer', status: 'At risk', salary: 164000 },
    { id: 'analytics-insights', parentId: 'analytics', avatar: 'OC', fullName: 'Oscar Collins', team: 'Analytics', role: 'Insights engineer', status: 'On track', salary: 150000 },
    { id: 'operations', parentId: 'data', avatar: 'JL', fullName: 'Jack Lewis', team: 'Operations', role: 'Operations lead', status: 'On track', salary: 151000 },
    { id: 'operations-quality', parentId: 'operations', avatar: 'CH', fullName: 'Charlotte Harris', team: 'Operations', role: 'Quality analyst', status: 'On track', salary: 126000 },
    { id: 'operations-enablement', parentId: 'operations', avatar: 'HM', fullName: 'Henry Moore', team: 'Operations', role: 'Enablement manager', status: 'At risk', salary: 133000 },
    { id: 'operations-programs', parentId: 'operations', avatar: 'LS', fullName: 'Lily Stewart', team: 'Operations', role: 'Program manager', status: 'Planned', salary: 138000 },
    { id: 'operations-release', parentId: 'operations', avatar: 'BM', fullName: 'Benjamin Morris', team: 'Operations', role: 'Release manager', status: 'On track', salary: 136000 },
    { id: 'operations-support', parentId: 'operations', avatar: 'ER', fullName: 'Emily Rogers', team: 'Operations', role: 'Support operations', status: 'On track', salary: 129000 },
  ];
}

function statusTemplate(h: Parameters<NonNullable<ColumnRegular['cellTemplate']>>[0], value: unknown) {
  const label = String(value ?? '');
  const tone = label.toLowerCase().replaceAll(' ', '-');
  return h('span', { class: `tree-status tree-status--${tone}` }, label);
}

export function createTreeColumns(
  rows: TreeDataRow[] = createTreeRows(),
  stickyParents = true,
): ColumnRegular[] {
  const parentIds = new Set(rows.flatMap(row => row.parentId === null ? [] : [row.parentId]));
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
      stickyCell: ({ model }) => stickyParents && parentIds.has(String(model.id)),
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

export async function initializeTreeStickyColumns(
  grid: HTMLRevoGridElement,
  rows: TreeDataRow[],
  getTree: () => ReturnType<typeof createTreeConfig>,
) {
  await grid.componentOnReady();
  if (!grid.isConnected) return;
  const tree = getTree();
  grid.tree = tree;
  grid.stickyCells = TREE_STICKY_CELLS_CONFIG;
  grid.columns = createTreeColumns(rows, tree.stickyParents);
}

type TreeConfigOptions = {
  stickyParents?: boolean;
  expandedRowIds?: Iterable<string>;
};

export function createTreeConfig(
  rows: TreeDataRow[],
  options: TreeConfigOptions = {},
) {
  const stickyParents = options.stickyParents ?? true;
  return {
    expandedRowIds: new Set(
      options.expandedRowIds ?? rows
        .filter((row) => row.parentId === null)
        .map((row) => row.id),
    ),
    stickyParents,
    animation: true,
  };
}
