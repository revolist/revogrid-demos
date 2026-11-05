import {
  actionInput,
  defineAiAction,
  translateAiText,
  DataGridFormattingPlugin,
  formatWithValuePresentation,
  getDataGridSourceColumns,
  type DataGridFormatContext,
  type DataGridFormatDefinition,
  type AiAction,
  type AiAssistantTranslations,
} from '@revolist/revogrid-pro';
import {
  PivotPlugin,
  type PivotConfig,
  type PivotConfigValue,
} from '@revolist/pivot';
import type { ColumnRegular } from '@revolist/revogrid';

function resolveFormat(
  definition: DataGridFormatDefinition | undefined,
  context: DataGridFormatContext,
) {
  return typeof definition === 'function' ? definition(context) : definition;
}

type HighlightCondition = 'above' | 'invalid' | 'clear';

/** Use the same native column validator and appearance definition in source and report grids. */
function amountHighlight(
  column: ColumnRegular,
  condition: HighlightCondition,
  threshold: number,
): DataGridFormatDefinition {
  const previous = column.dataGridFormat;
  return (context) => {
    const current = resolveFormat(previous, context);
    const {
      fillColor: _fill,
      textColor: _text,
      ...appearance
    } = current?.appearance ?? {};
    const highlighted =
      condition === 'invalid'
        ? column.validate?.(context.value, context.model) !== true
        : condition === 'above' &&
          typeof context.value === 'number' &&
          context.value > threshold;
    return {
      ...current,
      appearance: {
        ...appearance,
        horizontal: 'right',
        ...(highlighted
          ? {
              fillColor: condition === 'invalid' ? '#fee2e2' : '#fef3c7',
              textColor: '#111827',
            }
          : {}),
      },
    };
  };
}

/** Application policy: expose a small set of native formatting operations on order Amounts. */
export function createAiDemoFormattingActions(
  getGrid: () => HTMLRevoGridElement | undefined,
  translations: AiAssistantTranslations = {},
): AiAction[] {
  const t = (message: string, values?: Record<string, string | number>) =>
    translateAiText(message, translations, values);
  const amountColumn = async () => {
    const grid = getGrid();
    if (!grid) throw new Error(t('The demo grid is not ready.'));
    const plugins = await grid.getPlugins();
    const pivot = plugins.find((plugin) => plugin instanceof PivotPlugin);
    const snapshot = pivot?.getRuntimeSnapshot();
    const columns = snapshot
      ? getDataGridSourceColumns(plugins)
      : await grid.getColumns();
    const column = columns.find((column) => column.prop === 'amount');
    if (!column) throw new Error(t('The Amount source column is unavailable.'));
    return { grid, column, pivot, snapshot };
  };
  const updateMeasure = async (
    pivot: PivotPlugin,
    config: Readonly<PivotConfig>,
    patch: Partial<PivotConfigValue>,
    signal: AbortSignal,
  ) => {
    if (!config.values?.some((value) => value.prop === 'amount')) {
      throw new Error(t('Amount is not a Pivot measure.'));
    }
    const values = config.values.map((value) =>
      value.prop === 'amount' ? { ...value, ...patch } : value,
    );
    if (!(await pivot.updatePivotConfig({ ...config, values }, { signal }))) {
      throw new Error(t('Pivot formatting was not committed.'));
    }
  };
  const fieldSchema = { const: 'amount' };
  const fieldInput = (input: unknown, keys: string[]) => {
    const value = actionInput(input, ['field', ...keys]);
    if (value.field !== 'amount')
      throw new Error(t('Choose the Amount field.'));
    return value;
  };
  return [
    defineAiAction({
      name: 'cells.highlight',
      description:
        'Highlight numeric Amounts above a threshold, or values rejected by the column validator. In Pivot, conditions apply to displayed totals; use grid.validate to inspect underlying source records. Keeps working after data changes.',
      inputSchema: {
        type: 'object',
        properties: {
          field: fieldSchema,
          condition: { enum: ['above', 'invalid', 'clear'] },
          threshold: { type: 'number' },
        },
        required: ['field', 'condition'],
        additionalProperties: false,
      },
      parse(input) {
        const value = fieldInput(input, ['condition', 'threshold']);
        if (
          !['above', 'invalid', 'clear'].includes(String(value.condition)) ||
          (value.condition === 'above' &&
            (typeof value.threshold !== 'number' ||
              !Number.isFinite(value.threshold)))
        ) {
          throw new Error(t('Choose a valid highlight condition.'));
        }
        return {
          condition: value.condition as 'above' | 'invalid' | 'clear',
          threshold: value.threshold as number,
        };
      },
      async run({ condition, threshold }, { signal }) {
        const { grid, column, pivot, snapshot } = await amountColumn();
        if (pivot && snapshot) {
          // Pivot owns the generated columns. Keep presentation in its native config/checkpoint.
          const dimensions = snapshot.config.dimensions?.map((dimension) =>
            dimension.prop === 'amount'
              ? {
                  ...dimension,
                  dataGridFormat: amountHighlight(
                    { ...dimension, validate: column.validate },
                    condition === 'invalid' ? 'invalid' : 'clear',
                    threshold,
                  ),
                }
              : dimension,
          );
          await updateMeasure(
            pivot,
            { ...snapshot.config, dimensions },
            {
              conditionalFormatting:
                condition === 'above'
                  ? {
                      rules: [
                        {
                          operator: 'gt',
                          value: threshold,
                          style: {
                            backgroundColor: '#fef3c7',
                            color: '#111827',
                          },
                        },
                      ],
                    }
                  : undefined,
            },
            signal,
          );
          return {
            message: t(
              condition === 'invalid'
                ? 'Pivot highlighting checks displayed totals. Use Check Amounts to validate source records.'
                : 'Amount highlighting updated.',
            ),
          };
        }
        await grid.updateColumns([
          {
            ...column,
            dataGridFormat: amountHighlight(column, condition, threshold),
          },
        ]);
        return { message: t('Amount highlighting updated.') };
      },
    }),
    defineAiAction({
      name: 'cells.format',
      description:
        'Format Amount cells as numbers, currency or percentages without changing their numeric source values. Optional order IDs select specific cells; omit for the entire column. In Pivot, formats Amount measures; individual order IDs apply only in Data Grid.',
      inputSchema: {
        type: 'object',
        properties: {
          field: fieldSchema,
          preset: { enum: ['number', 'currency', 'percent'] },
          rows: {
            type: 'array',
            minItems: 1,
            maxItems: 100,
            items: { type: 'string' },
          },
        },
        required: ['field', 'preset'],
        additionalProperties: false,
      },
      parse(input) {
        const value = fieldInput(input, ['preset', 'rows']);
        if (
          !['number', 'currency', 'percent'].includes(String(value.preset)) ||
          (value.rows !== undefined &&
            (!Array.isArray(value.rows) ||
              !value.rows.length ||
              value.rows.length > 100 ||
              value.rows.some((row) => typeof row !== 'string')))
        ) {
          throw new Error(t('Choose a valid cell format.'));
        }
        return {
          preset: value.preset as 'number' | 'currency' | 'percent',
          rows: value.rows as string[] | undefined,
        };
      },
      async run({ preset, rows }, { signal }) {
        const { grid, column, pivot, snapshot } = await amountColumn();
        if (pivot && snapshot) {
          if (rows)
            throw new Error(
              t(
                'Individual order formatting applies in Data Grid. Omit order IDs to format Pivot totals.',
              ),
            );
          const options = {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            useGrouping: true,
          };
          await updateMeasure(
            pivot,
            snapshot.config,
            {
              format:
                preset === 'currency'
                  ? { preset, currency: 'USD', options }
                  : { preset, options },
            },
            signal,
          );
          return { message: t('Amount format updated.') };
        }
        const formatting = (await grid.getPlugins()).find(
          (plugin) => plugin instanceof DataGridFormattingPlugin,
        );
        if (!formatting)
          throw new Error(t('The formatting tool is unavailable.'));
        if (rows?.some((id) => !grid.source.some((row) => row.id === id))) {
          throw new Error(t('An order is unavailable.'));
        }
        const targets = rows ? new Set(rows) : undefined;
        const previous = column.dataGridFormat;
        const value = {
          kind: 'preset' as const,
          preset,
          decimalPlaces: 2,
          useGrouping: true,
          currency: 'USD',
        };
        // One native definition carries both value presentation and reactive highlights through views.
        await grid.updateColumns([
          {
            ...column,
            dataGridFormat: (context) => {
              const current = resolveFormat(previous, context);
              return !targets || targets.has(context.model.id)
                ? formatWithValuePresentation(current, value)
                : current;
            },
          },
        ]);
        return { message: t('Amount format updated.') };
      },
    }),
    defineAiAction({
      name: 'grid.validate',
      description:
        'Inspect original source Amounts with the existing numeric column validator, including while Pivot is active. Returns invalid order IDs; aggregate totals can hide invalid contributing records.',
      inputSchema: {
        type: 'object',
        properties: { field: fieldSchema },
        required: ['field'],
        additionalProperties: false,
      },
      parse: (input) => fieldInput(input, []),
      async run() {
        const { grid, column, pivot, snapshot } = await amountColumn();
        const source =
          pivot && snapshot ? pivot.getPivotOriginalSource() : grid.source;
        const invalid = source
          .filter((row) => column.validate?.(row.amount, row) !== true)
          .map((row) => row.id);
        return {
          message: t('{count} invalid Amounts found.', {
            count: invalid.length,
          }),
          data: { ids: invalid },
        };
      },
    }),
  ];
}
