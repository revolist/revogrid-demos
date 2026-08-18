import type { ColumnRegular } from '@revolist/revogrid';
import type { ExcelExportColumnOptions } from '@revolist/revogrid-pro';
import type { TreeDataRow } from './tree.shared';

const TREE_EXCEL_HEADER_STYLE = {
  fontWeight: 'bold' as const,
  textColor: '#FFFFFF',
  backgroundColor: '#1E3A5F',
  borderColor: '#CBD5E1',
  borderStyle: 'thin',
  alignVertical: 'center' as const,
  height: 24,
};

const TREE_EXCEL_CELL_STYLE = {
  borderColor: '#E2E8F0',
  borderStyle: 'thin',
  alignVertical: 'center' as const,
};

const TREE_STATUS_EXCEL_STYLES = {
  'On track': { backgroundColor: '#DCFCE7', textColor: '#166534' },
  'At risk': { backgroundColor: '#FEF3C7', textColor: '#92400E' },
  Blocked: { backgroundColor: '#FEE2E2', textColor: '#991B1B' },
  Planned: { backgroundColor: '#E0F2FE', textColor: '#075985' },
} as const;

export function createTreeExcelExportOptions(rows: TreeDataRow[]): Record<
  'teamMember' | 'text' | 'status' | 'salary',
  ExcelExportColumnOptions
> {
  const rowsById = new Map(rows.map(row => [row.id, row]));
  const treeDepth = (row: TreeDataRow) => {
    let depth = 0;
    let parentId = row.parentId;
    while (parentId) {
      depth += 1;
      parentId = rowsById.get(parentId)?.parentId ?? null;
    }
    return depth;
  };
  const treeExcelRowStyle = (row: TreeDataRow) => row.parentId === null
    ? { backgroundColor: '#EFF6FF', fontWeight: 'bold' as const }
    : {};
  const treeExcelHeader = (value: string) => ({
    value,
    ...TREE_EXCEL_HEADER_STYLE,
  });
  const textCellProperties = (value: unknown, model: TreeDataRow) => ({
    value: String(value ?? ''),
    ...TREE_EXCEL_CELL_STYLE,
    ...treeExcelRowStyle(model),
  });
  const textColumnProperties: NonNullable<ExcelExportColumnOptions['cellProperties']> = ({ value, model }) =>
    textCellProperties(value, model as TreeDataRow);
  const columnProperties: NonNullable<ExcelExportColumnOptions['columnProperties']> = ({ value }) => treeExcelHeader(value);

  return {
    teamMember: {
      columnProperties,
      cellProperties: ({ value, model }) => ({
        ...textCellProperties(value, model as TreeDataRow),
        indent: treeDepth(model as TreeDataRow),
      }),
    },
    text: { columnProperties, cellProperties: textColumnProperties },
    status: {
      columnProperties,
      cellProperties: ({ value, model }) => ({
        ...textCellProperties(value, model as TreeDataRow),
        ...TREE_STATUS_EXCEL_STYLES[value as TreeDataRow['status']],
        align: 'center',
        fontWeight: 'bold',
      }),
    },
    salary: {
      columnProperties,
      cellProperties: ({ value, model }) => ({
        value: Number(value ?? 0),
        type: Number,
        format: '$#,##0',
        ...TREE_EXCEL_CELL_STYLE,
        ...treeExcelRowStyle(model as TreeDataRow),
        align: 'right',
      }),
    },
  };
}
