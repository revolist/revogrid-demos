import assert from 'node:assert/strict';
import test from 'node:test';
import { SPREADSHEET_ADVANCED_FORMATS } from '../../../src/spreadsheet/workbook';

test('declares native percentage export semantics on Range and Trend presentations', () => {
  const exportFormats = Object.fromEntries(
    SPREADSHEET_ADVANCED_FORMATS.map(format => [format.id, format.excelNumberFormat]),
  );

  assert.deepEqual(exportFormats, {
    'spreadsheet-range': '0.0%',
    'spreadsheet-trend': '0.0%',
  });
});
