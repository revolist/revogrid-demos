import {
  actionInput,
  defineAiAction,
  translateAiText,
  DataGridFormattingPlugin,
  formatWithValuePresentation,
  type DataGridFormatContext,
  type DataGridFormatDefinition,
  type AiAction,
  type AiAssistantTranslations,
} from '@revolist/revogrid-pro';

function resolveFormat(
  definition: DataGridFormatDefinition | undefined,
  context: DataGridFormatContext,
) {
  return typeof definition === 'function' ? definition(context) : definition;
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
    const column = (await grid.getColumns()).find(
      (column) => column.prop === 'amount',
    );
    if (!column)
      throw new Error(t('Return to Data Grid to format source cells.'));
    return { grid, column };
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
        'Highlight numeric Amounts above a threshold, or values rejected by the column validator. Keeps working after data changes.',
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
      async run({ condition, threshold }) {
        const { grid, column } = await amountColumn();
        const previous = column.dataGridFormat;
        await grid.updateColumns([
          {
            ...column,
            dataGridFormat: (context) => {
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
                        fillColor:
                          condition === 'invalid' ? '#fee2e2' : '#fef3c7',
                        textColor: '#111827',
                      }
                    : {}),
                },
              };
            },
          },
        ]);
        return { message: t('Amount highlighting updated.') };
      },
    }),
    defineAiAction({
      name: 'cells.format',
      description:
        'Format Amount cells as numbers, currency or percentages without changing their numeric source values. Optional order IDs select specific cells; omit for the entire column.',
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
      async run({ preset, rows }) {
        const { grid, column } = await amountColumn();
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
        'Inspect Amounts with the existing numeric column validator. Invalid cells already carry native validation feedback.',
      inputSchema: {
        type: 'object',
        properties: { field: fieldSchema },
        required: ['field'],
        additionalProperties: false,
      },
      parse: (input) => fieldInput(input, []),
      async run() {
        const { grid, column } = await amountColumn();
        const invalid = grid.source
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
