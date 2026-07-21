import {
  createSpreadsheetPinnedBottomSource,
  createSpreadsheetScenarioFormulaRow,
  type SpreadsheetFlashPlugin,
  type SpreadsheetRow,
  type SpreadsheetWorkbook,
} from './spreadsheet.shared';

type FeedProp = 'jan' | 'feb' | 'mar' | 'target';

export type SpreadsheetFeedFlashResult = {
  workbook: SpreadsheetWorkbook;
  message: string;
  flash?: {
    rowIndex: number;
    prop: FeedProp;
    data: Record<string, unknown>;
    previousData: Record<string, unknown>;
  };
};

const FEED_PROPS: FeedProp[] = ['jan', 'feb', 'mar', 'target'];
const FEED_DELTAS = [4000, -3000, 6000, -5000, 2000, 7000, -4000, 3000];

export function applySpreadsheetFeedFlashStep(
  workbook: SpreadsheetWorkbook,
  stepIndex: number,
): SpreadsheetFeedFlashResult {
  if (workbook.imported || workbook.sheetKey === 'empty') {
    return {
      workbook,
      message: workbook.imported
        ? 'Feed flash is paused for imported workbooks.'
        : 'Feed flash is paused for blank workbooks.',
    };
  }

  const rowIndex = stepIndex % workbook.rows.length;
  const prop = FEED_PROPS[stepIndex % FEED_PROPS.length];
  const row = workbook.rows[rowIndex] as SpreadsheetRow | undefined;
  if (!row) {
    return { workbook, message: 'Feed flash has no visible row to update.' };
  }

  const previousValue = Number(row[prop]);
  if (!Number.isFinite(previousValue)) {
    return { workbook, message: 'Feed flash skipped a non-numeric cell.' };
  }

  const delta = FEED_DELTAS[stepIndex % FEED_DELTAS.length];
  const nextValue = Math.max(0, previousValue + delta);
  const nextRows = workbook.rows.map((candidate, index) => {
    if (index !== rowIndex) {
      return candidate;
    }
    return createSpreadsheetScenarioFormulaRow({
      ...(candidate as SpreadsheetRow),
      [prop]: nextValue,
    }, index);
  });
  const nextWorkbook: SpreadsheetWorkbook = {
    ...workbook,
    rows: nextRows,
    // Keep the same column schema during feed updates to avoid resetting
    // UX state like collapse and grouping in unchanged data shapes.
    formulaNames: workbook.formulaNames,
    columns: workbook.columns,
    pinnedBottomSource: createSpreadsheetPinnedBottomSource(nextRows),
    cellMerge: workbook.cellMerge,
  };
  const direction = nextValue >= previousValue ? 'up' : 'down';
  const owner = String(row.owner || `Row ${rowIndex + 1}`);

  return {
    workbook: nextWorkbook,
    message: `Feed ${direction}: ${owner} ${prop.toUpperCase()} ${formatFeedDelta(nextValue - previousValue)}.`,
    flash: {
      rowIndex,
      prop,
      data: { [prop]: nextValue },
      previousData: { [prop]: previousValue },
    },
  };
}

export function flashSpreadsheetFeedEdit(
  plugin: SpreadsheetFlashPlugin | undefined,
  result: SpreadsheetFeedFlashResult,
) {
  if (!plugin?.flashCells || !result.flash) {
    return;
  }
  plugin.flashCells({
    type: 'rgRow',
    data: { [result.flash.rowIndex]: result.flash.data },
    previousData: { [result.flash.rowIndex]: result.flash.previousData },
    eventTypes: ['spreadsheet-feed-flash'],
  }, {
    mode: 'cell-and-row',
    duration: 1100,
    rowDuration: 1300,
  });
}

function formatFeedDelta(delta: number) {
  const sign = delta >= 0 ? '+' : '-';
  return `${sign}$${Math.abs(delta).toLocaleString('en-US')}`;
}
