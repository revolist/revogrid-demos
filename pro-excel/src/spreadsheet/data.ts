/** Scenario rows, named ranges, totals, and merge metadata. */
import type { DataType } from '@revolist/revogrid';
import type { FormulaNamesConfig, MergeData } from '@revolist/revogrid-pro';
import {
  SPREADSHEET_SHEETS,
  type SpreadsheetBaseRow,
  type SpreadsheetRow,
  type SpreadsheetSheetKey,
} from './models';

export const STATUS_VALUES = ['Committed', 'Forecast', 'Watch', 'Blocked'];
export const DEPARTMENT_VALUES = [
  'Marketing',
  'Sales',
  'Support',
  'Research',
  'Operations',
  'Finance',
  'Platform',
  'Services',
];

const BASE_ROWS: SpreadsheetBaseRow[] = [
  { department: 'Marketing', owner: 'Avery Stone', jan: 128000, feb: 135000, mar: 149000, target: 395000, status: 'Forecast' },
  { department: 'Marketing', owner: 'Noah Reed', jan: 91000, feb: 98000, mar: 108000, target: 285000, status: 'Committed' },
  { department: 'Sales', owner: 'Riley Chen', jan: 188000, feb: 203000, mar: 226000, target: 610000, status: 'Committed' },
  { department: 'Sales', owner: 'Quinn Hart', jan: 155000, feb: 168000, mar: 181000, target: 525000, status: 'Watch' },
  { department: 'Platform', owner: 'Drew Wilson', jan: 146000, feb: 155000, mar: 166000, target: 452000, status: 'Forecast' },
  { department: 'Platform', owner: 'Kai Bell', jan: 132000, feb: 141000, mar: 153000, target: 405000, status: 'Committed' },
  { department: 'Support', owner: 'Morgan Lee', jan: 78000, feb: 84000, mar: 91000, target: 240000, status: 'Watch' },
  { department: 'Support', owner: 'Jamie Fox', jan: 69000, feb: 73000, mar: 76000, target: 215000, status: 'Forecast' },
  { department: 'Research', owner: 'Jordan Miles', jan: 96000, feb: 103000, mar: 114000, target: 330000, status: 'Forecast' },
  { department: 'Services', owner: 'Sam Rivera', jan: 83000, feb: 92000, mar: 99000, target: 282000, status: 'Blocked' },
  { department: 'Operations', owner: 'Taylor Brooks', jan: 64000, feb: 68000, mar: 73000, target: 198000, status: 'Committed' },
  { department: 'Finance', owner: 'Casey Patel', jan: 52000, feb: 57000, mar: 62000, target: 180000, status: 'Watch' },
  { department: 'Marketing', owner: 'Blake Turner', jan: 104000, feb: 111000, mar: 122000, target: 345000, status: 'Forecast' },
  { department: 'Sales', owner: 'Alex Morgan', jan: 172000, feb: 185000, mar: 197000, target: 570000, status: 'Committed' },
  { department: 'Platform', owner: 'Dana Kim', jan: 119000, feb: 127000, mar: 138000, target: 380000, status: 'Watch' },
  { department: 'Support', owner: 'Jesse Park', jan: 61000, feb: 66000, mar: 71000, target: 195000, status: 'Committed' },
  { department: 'Research', owner: 'Rowan Ellis', jan: 88000, feb: 94000, mar: 103000, target: 295000, status: 'Forecast' },
  { department: 'Finance', owner: 'Skyler Webb', jan: 47000, feb: 51000, mar: 56000, target: 162000, status: 'Committed' },
  { department: 'Services', owner: 'Cameron Ross', jan: 76000, feb: 82000, mar: 89000, target: 255000, status: 'Watch' },
  { department: 'Operations', owner: 'Reese Grant', jan: 58000, feb: 63000, mar: 68000, target: 185000, status: 'Forecast' },
  { department: 'Sales', owner: 'Avery Quinn', jan: 161000, feb: 174000, mar: 188000, target: 535000, status: 'Forecast' },
  { department: 'Marketing', owner: 'Phoenix Hall', jan: 97000, feb: 105000, mar: 114000, target: 320000, status: 'Watch' },
  { department: 'Platform', owner: 'River Nash', jan: 125000, feb: 134000, mar: 145000, target: 415000, status: 'Committed' },
  { department: 'Research', owner: 'Hayden Cruz', jan: 79000, feb: 86000, mar: 94000, target: 268000, status: 'Blocked' },
  { department: 'Support', owner: 'Finley Shaw', jan: 53000, feb: 57000, mar: 62000, target: 172000, status: 'Watch' },
  { department: 'Finance', owner: 'Emery Cole', jan: 44000, feb: 48000, mar: 52000, target: 152000, status: 'Forecast' },
  { department: 'Services', owner: 'Sage Burton', jan: 71000, feb: 78000, mar: 85000, target: 240000, status: 'Committed' },
  { department: 'Operations', owner: 'Harley Wade', jan: 67000, feb: 72000, mar: 78000, target: 210000, status: 'Watch' },
  { department: 'Marketing', owner: 'Kendall Price', jan: 115000, feb: 123000, mar: 134000, target: 370000, status: 'Committed' },
  { department: 'Sales', owner: 'Marlowe Cross', jan: 144000, feb: 157000, mar: 169000, target: 490000, status: 'Watch' },
  { department: 'Platform', owner: 'Elliot Hayes', jan: 138000, feb: 147000, mar: 158000, target: 440000, status: 'Forecast' },
  { department: 'Research', owner: 'Peyton Ford', jan: 92000, feb: 99000, mar: 108000, target: 310000, status: 'Committed' },
  { department: 'Support', owner: 'Lennon Ward', jan: 57000, feb: 61000, mar: 66000, target: 182000, status: 'Forecast' },
  { department: 'Finance', owner: 'Indigo Ray', jan: 49000, feb: 54000, mar: 59000, target: 170000, status: 'Watch' },
  { department: 'Services', owner: 'Zephyr Hunt', jan: 80000, feb: 87000, mar: 94000, target: 268000, status: 'Blocked' },
  { department: 'Operations', owner: 'Briar Stone', jan: 72000, feb: 77000, mar: 83000, target: 225000, status: 'Committed' },
  { department: 'Sales', owner: 'Cleo Marsh', jan: 133000, feb: 145000, mar: 158000, target: 450000, status: 'Committed' },
  { department: 'Marketing', owner: 'Remy Walsh', jan: 87000, feb: 93000, mar: 101000, target: 285000, status: 'Forecast' },
  { department: 'Research', owner: 'Wren Summers', jan: 74000, feb: 80000, mar: 88000, target: 255000, status: 'Watch' },
  { department: 'Operations', owner: 'Luca Vance', jan: 60000, feb: 65000, mar: 70000, target: 192000, status: 'Blocked' },
];

export function getSpreadsheetSheetLabel(sheetKey: SpreadsheetSheetKey) {
  return SPREADSHEET_SHEETS.find(sheet => sheet.key === sheetKey)?.label ?? 'Budget';
}

function createSpreadsheetScenarioRow(
  row: SpreadsheetBaseRow,
  index: number,
  sheetKey: SpreadsheetSheetKey,
): SpreadsheetBaseRow {
  if (sheetKey === 'stretch') {
    const lift = 1.05 + (index % 3) * 0.015;
    return {
      ...row,
      jan: roundMoney(row.jan * lift),
      feb: roundMoney(row.feb * (lift + 0.015)),
      mar: roundMoney(row.mar * (lift + 0.03)),
      target: roundMoney(row.target * 1.08),
      status: row.status === 'Blocked' ? 'Watch' : 'Forecast',
    };
  }

  if (sheetKey === 'pipeline') {
    const risk = 0.88 + (index % 4) * 0.025;
    return {
      ...row,
      jan: roundMoney(row.jan * risk),
      feb: roundMoney(row.feb * (risk + 0.03)),
      mar: roundMoney(row.mar * (risk + 0.055)),
      target: roundMoney(row.target * 1.02),
      status: index % 5 === 0 ? 'Blocked' : index % 2 === 0 ? 'Watch' : 'Forecast',
    };
  }

  return { ...row };
}

function roundMoney(value: number) {
  return Math.round(value / 1000) * 1000;
}

/** Adds row-relative formulas and trend data to a base scenario row. */
export function createSpreadsheetScenarioFormulaRow(row: SpreadsheetBaseRow & { id: number }, index: number): SpreadsheetRow {
  const n = index + 1;
  return {
    ...row,
    total: `=SUM(C${n}:E${n})`,
    variance: `=F${n}-G${n}`,
    margin: `=IF(G${n}=0,0,F${n}/G${n})`,
    trend: row.jan ? (row.mar - row.jan) / row.jan : 0,
  };
}

export function createSpreadsheetRows(sheetKey: SpreadsheetSheetKey = 'budget'): SpreadsheetRow[] {
  return BASE_ROWS.map((row, index) => createSpreadsheetScenarioFormulaRow({
    id: index + 1,
    ...createSpreadsheetScenarioRow(row, index, sheetKey),
  }, index));
}

/** Builds workbook named ranges using the current physical row count. */
export function createSpreadsheetFormulaNames(rows: DataType[]): FormulaNamesConfig {
  const lastRow = Math.max(rows.length, 1);
  return {
    rowIdProp: 'id',
    names: [
      { name: 'Actuals', scope: 'workbook', kind: 'range', ref: `C1:E${lastRow}` },
      { name: 'QuarterTotals', scope: 'workbook', kind: 'range', ref: `F1:F${lastRow}` },
      { name: 'Targets', scope: 'workbook', kind: 'range', ref: `G1:G${lastRow}` },
      { name: 'StatusList', scope: 'workbook', kind: 'range', ref: `K1:K${Math.min(lastRow, 4)}` },
      { name: 'DepartmentList', scope: 'workbook', kind: 'range', ref: `A1:A${Math.min(lastRow, 8)}` },
      { name: 'StretchTarget', scope: 'workbook', kind: 'constant', value: 1.08 },
      { name: 'PortfolioTotal', scope: 'workbook', kind: 'formula', value: '=SUM(QuarterTotals)' },
    ],
  };
}

export function createEmptySpreadsheetFormulaNames(): FormulaNamesConfig {
  return {
    rowIdProp: 'id',
    names: [],
  };
}

/** Creates the pinned summary row whose formulas follow the current source size. */
export function createSpreadsheetPinnedBottomSource(rows: DataType[]): DataType[] {
  if (!rows.length) {
    return [];
  }
  const lastRow = rows.length;
  return [{
    department: `Total - ${lastRow} row${lastRow > 1 ? 's' : ''}`,
    owner: '',
    jan: `=SUM(C1:C${lastRow})`,
    feb: `=SUM(D1:D${lastRow})`,
    mar: `=SUM(E1:E${lastRow})`,
    total: `=SUM(F1:F${lastRow})`,
    target: `=SUM(G1:G${lastRow})`,
    variance: '=PortfolioTotal-SUM(Targets)',
    margin: '=IF(SUM(Targets)=0,0,PortfolioTotal/SUM(Targets))',
    trend: 0,
    status: '',
  }];
}

export function createSpreadsheetCellMerge(rows: DataType[], imported = false): MergeData[] {
  if (imported || !rows.length) {
    return [];
  }

  const departmentMerges: MergeData[] = [];
  let runStart = 0;
  while (runStart < rows.length) {
    const department = rows[runStart]?.department;
    let runEnd = runStart + 1;
    while (runEnd < rows.length && rows[runEnd]?.department === department) {
      runEnd += 1;
    }
    if (department !== '' && department !== null && typeof department !== 'undefined' && runEnd - runStart > 1) {
      departmentMerges.push({
        row: runStart,
        column: 0,
        rowType: 'rgRow',
        colType: 'colPinStart',
        rowSpan: runEnd - runStart,
      });
    }
    runStart = runEnd;
  }

  return [
    ...departmentMerges,
    {
      row: 0,
      column: 0,
      rowType: 'rowPinEnd',
      colType: 'colPinStart',
      colSpan: 2,
    },
  ];
}
