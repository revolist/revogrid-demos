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

test('preserves newer local values when a remote simulation patches the same row', async () => {
  const sourceWorkbook = createSpreadsheetWorkbook();
  const snapshotRows = sourceWorkbook.rows.map(row => ({ ...row }));
  const targetRows = snapshotRows.map(row => ({ ...row }));
  targetRows[0].jan = Number(targetRows[0].jan) + 1;

  const liveRows = snapshotRows.map(row => ({ ...row }));
  liveRows[0].owner = 'Locally updated owner';
  const providers = {
    data: {
      stores: {
        rgRow: {
          store: {
            get(key: string) {
              return key === 'source' ? liveRows : undefined;
            },
          },
        },
      },
      refresh() {},
    },
  };
  const grid = {
    source: snapshotRows,
    getProviders: async () => providers,
  };

  const result = await syncSpreadsheetSimulationResultToGrid(
    grid as never,
    { ...sourceWorkbook, rows: snapshotRows },
    { ...sourceWorkbook, rows: targetRows },
  );

  assert.equal(liveRows[0].jan, targetRows[0].jan, 'the remote cell value is applied');
  assert.equal(liveRows[0].owner, 'Locally updated owner', 'the newer local cell value survives');
  assert.equal(result.rows[0].owner, 'Locally updated owner', 'workbook state follows the merged provider row');
});

test('restores a non-empty workbook when the provider store is transiently empty', async () => {
  const sourceWorkbook = createSpreadsheetWorkbook();
  const targetRows = sourceWorkbook.rows.map(row => ({ ...row }));
  targetRows[0].mar = Number(targetRows[0].mar) + 1;
  const providerRows: typeof targetRows = [];
  const grid = {
    source: sourceWorkbook.rows,
    getProviders: async () => ({
      data: {
        stores: {
          rgRow: {
            store: {
              get(key: string) {
                return key === 'source' ? providerRows : undefined;
              },
            },
          },
        },
        refresh() {},
      },
    }),
  };

  const result = await syncSpreadsheetSimulationResultToGrid(
    grid as never,
    sourceWorkbook,
    { ...sourceWorkbook, rows: targetRows },
  );

  assert.equal(result.rows.length, 40, 'the transient store does not replace the workbook');
  assert.equal(grid.source.length, 40, 'the public source is restored for the next render');
  assert.equal(grid.source[0].mar, targetRows[0].mar, 'the pending simulation update is retained');
});
