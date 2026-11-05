// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';
import {
  DataGridFormattingPlugin,
  DATA_GRID_SOURCE_COLUMNS,
} from '@revolist/revogrid-pro';
import { PivotPlugin, type PivotConfig } from '@revolist/pivot';
import { createAiDemoFormattingActions } from './AiAssistant.formatting';

function harness(inPivot = false) {
  let column: any = {
    prop: 'amount',
    validate: (value: unknown) =>
      typeof value === 'number' && Number.isFinite(value) && value >= 0,
  };
  const source = [
    { id: 'A', amount: 50 },
    { id: 'B', amount: 150 },
    { id: 'C', amount: -10 },
  ];
  const formatting = Object.assign(
    Object.create(DataGridFormattingPlugin.prototype),
    { applyValueFormat: vi.fn() },
  );
  let report: PivotConfig = {
    dimensions: [{ ...column, allowedRoles: ['values'] }],
    rows: ['status'],
    values: [{ prop: 'amount', aggregator: 'sum', label: 'Amount' }],
  };
  const pivot = Object.assign(Object.create(PivotPlugin.prototype), {
    getRuntimeSnapshot: () => (inPivot ? { config: report } : null),
    getPivotOriginalSource: () => source,
    updatePivotConfig: vi.fn(async (config: PivotConfig) => {
      report = config;
      return true;
    }),
  });
  Object.defineProperty(pivot, DATA_GRID_SOURCE_COLUMNS, {
    get: () => [column],
  });
  const grid = {
    source: inPivot ? [{ amount: 190 }] : source,
    getColumns: async () => [column],
    updateColumns: async (columns: any[]) => {
      column = columns[0];
    },
    getPlugins: async () => [formatting, pivot],
    getProviders: async () => ({
      data: { stores: { rgRow: { store: { get: () => source } } } },
      column: { stores: { rgCol: { store: { get: () => [column] } } } },
    }),
  } as unknown as HTMLRevoGridElement;
  const actions = createAiDemoFormattingActions(() => grid, {
    'Amount highlighting updated.': 'Surlignage actualisé.',
    '{count} invalid Amounts found.': '{count} montants invalides.',
    'Amount format updated.': 'Format actualisé.',
    'Pivot formatting was not committed.': 'Format refusé.',
  });
  const run = (name: string, input: unknown) =>
    actions
      .find((action) => action.name === name)!
      .execute(input, { signal: new AbortController().signal });
  return {
    run,
    source,
    formatting,
    pivot,
    report: () => report,
    column: () => column,
  };
}

it('uses reactive native formatting for thresholds and the authored validator for invalid data', async () => {
  const h = harness();
  expect(
    await h.run('cells.highlight', {
      field: 'amount',
      condition: 'above',
      threshold: 100,
    }),
  ).toMatchObject({ message: 'Surlignage actualisé.' });
  const render = (value: number) =>
    h.column().dataGridFormat({ value, model: { amount: value } });
  expect(render(150).appearance.fillColor).toBe('#fef3c7');
  expect(render(50).appearance.fillColor).toBeUndefined();
  expect(render(200).appearance.fillColor).toBe('#fef3c7');
  await h.run('cells.highlight', { field: 'amount', condition: 'invalid' });
  expect(render(-10).appearance.fillColor).toBe('#fee2e2');
  expect(render(50).appearance.fillColor).toBeUndefined();
  expect(await h.run('grid.validate', { field: 'amount' })).toMatchObject({
    message: '1 montants invalides.',
    data: { ids: ['C'] },
  });
});

it('formats native column or explicit order cells without changing numeric source values', async () => {
  const h = harness();
  const before = structuredClone(h.source);
  await h.run('cells.format', {
    field: 'amount',
    preset: 'currency',
    rows: ['B'],
  });
  expect(
    h.column().dataGridFormat({ value: 150, model: h.source[1] })?.value,
  ).toMatchObject({ preset: 'currency' });
  expect(
    h.column().dataGridFormat({ value: 50, model: h.source[0] })?.value,
  ).toBeUndefined();
  await h.run('cells.format', { field: 'amount', preset: 'number' });
  for (const model of h.source) {
    expect(
      h.column().dataGridFormat({ value: model.amount, model }).value,
    ).toMatchObject({ preset: 'number' });
  }
  await expect(
    h.run('cells.format', {
      field: 'amount',
      preset: 'number',
      rows: ['missing'],
    }),
  ).rejects.toThrow('unavailable');
  await expect(
    h.run('cells.highlight', {
      field: 'amount',
      condition: 'above',
      threshold: '100',
    }),
  ).rejects.toThrow('condition');
  expect(h.source).toEqual(before);
  expect(h.source.every((row) => typeof row.amount === 'number')).toBe(true);
});

it('composes currency with reactive highlights in the restorable column definition', async () => {
  const h = harness();
  await h.run('cells.highlight', {
    field: 'amount',
    condition: 'above',
    threshold: 100,
  });
  await h.run('cells.format', { field: 'amount', preset: 'currency' });
  const format = h.column().dataGridFormat({ value: 150, model: h.source[1] });
  expect(format.value).toMatchObject({ preset: 'currency', currency: 'USD' });
  expect(format.appearance.fillColor).toBe('#fef3c7');
  expect(
    h.column().dataGridFormat({ value: 50, model: h.source[0] }).appearance
      .fillColor,
  ).toBeUndefined();
});

it('keeps currency when highlights change or clear, and retains independent captured definitions', async () => {
  const h = harness();
  await h.run('cells.format', { field: 'amount', preset: 'currency' });
  await h.run('cells.highlight', {
    field: 'amount',
    condition: 'above',
    threshold: 100,
  });
  const saved = h.column().dataGridFormat;
  await h.run('cells.highlight', { field: 'amount', condition: 'clear' });
  const context = { value: 150, model: h.source[1] };
  expect(h.column().dataGridFormat(context)).toMatchObject({
    value: { preset: 'currency' },
    appearance: { horizontal: 'right' },
  });
  expect(
    h.column().dataGridFormat(context).appearance.fillColor,
  ).toBeUndefined();
  expect(saved(context)).toMatchObject({
    value: { preset: 'currency' },
    appearance: { fillColor: '#fef3c7' },
  });
});

it('uses native Pivot measure presentation, composes formats and thresholds, and preserves immutable settings', async () => {
  const h = harness(true);
  const before = structuredClone(h.source);
  const original = h.report();
  await h.run('cells.highlight', {
    field: 'amount',
    condition: 'above',
    threshold: 100,
  });
  const highlighted = h.report();
  expect(highlighted.values[0].conditionalFormatting?.rules).toEqual([
    {
      operator: 'gt',
      value: 100,
      style: { backgroundColor: '#fef3c7', color: '#111827' },
    },
  ]);
  expect(
    await h.run('cells.format', { field: 'amount', preset: 'currency' }),
  ).toMatchObject({ message: 'Format actualisé.' });
  expect(h.report().values[0]).toMatchObject({
    label: 'Amount',
    format: { preset: 'currency', currency: 'USD' },
    conditionalFormatting: highlighted.values[0].conditionalFormatting,
  });
  expect(original.values[0].format).toBeUndefined();
  expect(highlighted.values[0].format).toBeUndefined();
  await h.run('cells.highlight', { field: 'amount', condition: 'clear' });
  expect(h.report().values[0].format?.preset).toBe('currency');
  expect(h.report().values[0].conditionalFormatting).toBeUndefined();
  expect(h.source).toEqual(before);
});

it('checks native displayed totals for invalid highlighting, and original records for source validation', async () => {
  const h = harness(true);
  const result = await h.run('cells.highlight', {
    field: 'amount',
    condition: 'invalid',
  });
  expect(result.message).toContain('displayed totals');
  const definition = h
    .report()
    .dimensions?.find((d) => d.prop === 'amount')?.dataGridFormat;
  expect(typeof definition).toBe('function');
  const format = definition as (context: any) => any;
  expect(format({ value: -1, model: {} }).appearance.fillColor).toBe('#fee2e2');
  expect(
    format({ value: 190, model: {} }).appearance.fillColor,
  ).toBeUndefined();
  expect(await h.run('grid.validate', { field: 'amount' })).toMatchObject({
    message: '1 montants invalides.',
    data: { ids: ['C'] },
  });
  await h.run('cells.highlight', {
    field: 'amount',
    condition: 'above',
    threshold: 100,
  });
  const cleared = h.report().dimensions?.find((d) => d.prop === 'amount')
    ?.dataGridFormat as (context: any) => any;
  expect(
    cleared({ value: -1, model: {} }).appearance.fillColor,
  ).toBeUndefined();
});

it('rejects uncommitted Pivot formatting and order-specific requests without altering the report', async () => {
  const h = harness(true);
  const before = h.report();
  h.pivot.updatePivotConfig.mockResolvedValueOnce(false);
  await expect(
    h.run('cells.format', { field: 'amount', preset: 'currency' }),
  ).rejects.toThrow('Format refusé.');
  expect(h.report()).toBe(before);
  await expect(
    h.run('cells.format', { field: 'amount', preset: 'currency', rows: ['A'] }),
  ).rejects.toThrow('Individual order');
  expect(h.report()).toBe(before);
});
