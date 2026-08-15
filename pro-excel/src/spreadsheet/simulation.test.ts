import assert from 'node:assert/strict';
import test from 'node:test';
import { syncSpreadsheetSimulationResultToGrid } from '../spreadsheet.simulation';
import { createSpreadsheetWorkbook } from './workbook';

test('patches physical feed rows without replacing source while FilterHeader trims rows', async () => {
  const sourceWorkbook = createSpreadsheetWorkbook();
  const sourceRows = sourceWorkbook.rows.map(row => ({ ...row }));
  const targetRows = sourceRows.map(row => ({ ...row }));
  targetRows[0].jan = Number(targetRows[0].jan) + 1;

  const items = [1];
  const storeSource = sourceRows.map(row => ({ ...row }));
  let sourceSetCount = 0;
  const refreshCalls: string[] = [];
  const dataStore = {
    store: {
      get(key: string) {
        if (key === 'source') return storeSource;
        if (key === 'items') return items;
        return undefined;
      },
      set(key: string) {
        if (key === 'source') sourceSetCount += 1;
      },
    },
    setSourceData(updates: Record<number, Record<string, unknown>>, mutate = true) {
      Object.entries(updates).forEach(([virtualIndex, row]) => {
        storeSource[items[Number(virtualIndex)]] = row as typeof storeSource[number];
      });
      if (mutate) sourceSetCount += 1;
    },
  };
  const providers = {
    data: {
      stores: { rgRow: dataStore },
      refresh(rowType: string) {
        refreshCalls.push(rowType);
      },
    },
  };
  const grid = {
    source: sourceRows,
    getProviders: async () => providers,
  };

  const result = await syncSpreadsheetSimulationResultToGrid(
    grid as never,
    { ...sourceWorkbook, rows: sourceRows },
    { ...sourceWorkbook, rows: targetRows },
    { rowType: 'rgRow' },
  );

  assert.equal(storeSource[0].jan, targetRows[0].jan, 'the physical feed row is updated');
  assert.equal(storeSource[1].jan, sourceRows[1].jan, 'the first filtered-visible row is not mistaken for row zero');
  assert.equal(sourceSetCount, 0, 'the filtered source array is not replaced');
  assert.deepEqual(refreshCalls, ['rgRow']);
  assert.equal(result.rows[0].jan, targetRows[0].jan, 'simulation state follows the provider source');
});
