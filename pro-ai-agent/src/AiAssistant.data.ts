import { createAiViewFields, createAiViewHttpInterpreter } from '@revolist/revogrid-pro';
import type { ColumnRegular } from '@revolist/revogrid';
import type {
  AiAssistantConfig,
  AiSchemaActionOptions,
  AiViewInterpreter,
  AiViewResponse,
} from '@revolist/revogrid-pro';

/** Typed requests use the same-origin backend without URL flags. */
export function resolveAiDemoEndpoint(endpoint?: string): string {
  return endpoint ?? '/api/ai-view/interpret';
}

export const aiViewColumns: ColumnRegular[] = [
  { prop: 'id', name: 'Order', size: 110, readonly: true, filter: 'string', sortable: true },
  {
    prop: 'region',
    name: 'Region',
    filter: 'string',
    sortable: true,
    size: 160,
  },
  {
    prop: 'amount',
    name: 'Amount',
    filter: 'number',
    sortable: true,
    size: 160,
    validate: (value: unknown) =>
      typeof value === 'number' && Number.isFinite(value) && value >= 0,
  },
  {
    prop: 'status',
    name: 'Status',
    filter: 'string',
    sortable: true,
    size: 160,
  },
];
export const aiViewFieldHints: AiAssistantConfig['overrides'] = {
  id: { description: 'Stable order identifier. Read-only; cannot be changed or removed.' },
  amount: { description: 'Non-negative numeric order amount.' },
  region: {
    description: 'Order region.',
    allowedValues: ['Europe', 'Americas', 'Asia'],
  },
  status: {
    description: 'Order fulfillment status.',
    allowedValues: ['Open', 'Shipped', 'Cancelled', 'Pending'],
  },
};
export const aiDemoColumnPresets: NonNullable<
  AiSchemaActionOptions['presets']
> = [
  {
    id: 'total',
    description: 'Approved calculated total column',
    column: { prop: 'total', name: 'Total', filter: 'string', size: 170 },
  },
  {
    id: 'order-status',
    description: 'Rename Status to Order status',
    column: {
      ...aiViewColumns.find((column) => column.prop === 'status')!,
      name: 'Order status',
    },
  },
];
export const aiViewFields = createAiViewFields(aiViewColumns, {
  overrides: aiViewFieldHints,
});
export function createAiViewRows(count = 60) {
  return Array.from({ length: count }, (_, index) => ({
    id: `ORD-${String(index + 1).padStart(4, '0')}`,
    region: ['Europe', 'Americas', 'Asia'][index % 3],
    amount: 100 + ((index * 137) % 5000),
    status: ['Open', 'Shipped', 'Cancelled', 'Pending'][index % 4],
  }));
}
export type AiDemoRows = ReturnType<typeof createAiViewRows>;
interface DemoExample {
  prompt: string;
  response: AiViewResponse;
}
const example = (prompt: string, response: AiViewResponse): DemoExample => ({
  prompt,
  response,
});
const action = (name: string, input: unknown): AiViewResponse => ({
  kind: 'action',
  name,
  input,
});
const viewExamples = [
  example('Show orders above 1000', {
    kind: 'command',
    filter: {
      mode: 'and',
      ast: {
        type: 'condition',
        field: 'amount',
        operator: 'greaterThan',
        valueType: 'number',
        value: 1000,
      },
    },
  }),
  example('Sort highest amount first', {
    kind: 'command',
    sort: {
      mode: 'replace',
      items: [{ field: 'amount', direction: 'desc' }],
    },
  }),
  example('Only Europe', {
    kind: 'command',
    filter: {
      mode: 'and',
      ast: {
        type: 'condition',
        field: 'region',
        operator: 'equal',
        valueType: 'string',
        value: 'Europe',
      },
    },
  }),
  example('Exclude cancelled orders', {
    kind: 'command',
    filter: {
      mode: 'and',
      ast: {
        type: 'condition',
        field: 'status',
        operator: 'notEqual',
        valueType: 'string',
        value: 'Cancelled',
      },
    },
  }),
];
export const aiViewSuggestions = viewExamples.map((item) => item.prompt);
function stage(
  label: string,
  description: string,
  examples: readonly DemoExample[],
) {
  return {
    label,
    description,
    examples,
    suggestions: examples.map((item) => item.prompt),
  };
}
export const aiDemoStages = [
  stage(
    '1 · Explore & layout',
    'Filter, sort, inspect and group the local orders. Actions use the existing grid APIs.',
    [
      ...viewExamples,
      example('Which columns can I use?', {
        kind: 'answer',
        message:
          'You can inspect Order, Region, Amount and Status, and filter or sort supported fields. Order IDs identify rows and are protected from edits and removal.',
      }),
      example(
        'Summarize amount by Region',
        action('grid.aggregate', {
          groupBy: ['region'],
          measures: [{ field: 'amount', operation: 'sum' }],
          limit: 10,
        }),
      ),
      example(
        'Pin Amount to the start',
        action('columns.pin', { field: 'amount', pin: 'start' }),
      ),
      example(
        'Unpin Amount',
        action('columns.pin', { field: 'amount', pin: 'none' }),
      ),
      example(
        'Fit Amount to content',
        action('columns.autosize', { field: 'amount' }),
      ),
      example('Highlight the first Amount cell', action('grid.highlight', {
        cells: [{ row: 0, field: 'amount' }],
      })),
      example('Select order ORD-0001', action('grid.selectRecords', { ids: ['ORD-0001'] })),
      example('Clear selected orders', action('grid.selectRecords', { ids: [] })),
      example('Help me choose a filter', {
        kind: 'clarification',
        message: 'Which orders would you like to see?',
        choices: [
          { label: 'Europe', prompt: 'Only Europe' },
          { label: 'Large orders', prompt: 'Show orders above 1000' },
        ],
      }),
      example('Inspect columns', action('grid.inspect', {})),
      example(
        'Read three orders',
        action('grid.read', {
          start: 0,
          limit: 3,
          fields: ['region', 'amount', 'status'],
        }),
      ),
      example(
        'Widen Amount',
        action('columns.resize', { field: 'amount', size: 240 }),
      ),
      example(
        'Hide Status',
        action('columns.visibility', {
          fields: ['status'],
          hidden: true,
        }),
      ),
      example(
        'Show Status',
        action('columns.visibility', {
          fields: ['status'],
          hidden: false,
        }),
      ),
      example(
        'Group by Region',
        action('grouping.set', { fields: ['region'] }),
      ),
      example('Ungroup', action('grouping.set', { fields: [] })),
    ],
  ),
  stage(
    '2 · Edit data',
    'Preview each change, then Apply or Cancel. Undo and Redo use grid History. Examples identify their target order explicitly.',
    [
      example(
        'Update ORD-0001',
        action('cells.update', {
          rows: ['ORD-0001'],
          values: { amount: 1250 },
        }),
      ),
      example(
        'Set Europe orders to 1500',
        action('cells.update', {
          filter: {
            type: 'condition',
            field: 'region',
            operator: 'equal',
            valueType: 'string',
            value: 'Europe',
          },
          values: { amount: 1500 },
        }),
      ),
      example(
        'Add an order',
        action('rows.add', {
          rows: [{ region: 'Europe', amount: 750, status: 'Open' }],
        }),
      ),
      example(
        'Duplicate ORD-0001',
        action('rows.duplicate', { rows: ['ORD-0001'] }),
      ),
      example('Delete ORD-0002', action('rows.delete', { rows: ['ORD-0002'] })),
    ],
  ),
  stage(
    '3 · Schema & integrations',
    'Add the Total column, then calculate ORD-0001’s total (Amount × 1.2). Try column changes, sample import and CSV export.',
    [
      example('Add Total column', action('columns.add', { preset: 'total' })),
      example(
        'Calculate ORD-0001 total',
        action('formulas.apply', {
          recipe: 'first-total',
        }),
      ),
      example(
        'Rename Status to Order status',
        action('columns.change', {
          preset: 'order-status',
        }),
      ),
      example(
        'Remove Total column',
        action('columns.remove', { field: 'total' }),
      ),
      example(
        'Import two sample orders',
        action('data.import', {
          recipe: 'sample-orders',
        }),
      ),
      example(
        'Export orders CSV',
        action('data.export', { recipe: 'orders-csv' }),
      ),
    ],
  ),
];
const responses = new Map(
  [
    ...aiDemoStages.flatMap((item) => item.examples),
    example('Reset view', { kind: 'command', reset: true }),
    example('Remove the amount filter', {
      kind: 'command',
      filter: { mode: 'removeFields', fields: ['amount'] },
    }),
    example('Clear sorting', { kind: 'command', sort: { mode: 'clear' } }),
  ].map((item) => [item.prompt.toLowerCase(), item.response]),
);
/** Exact fixtures, deliberately not presented as natural-language model inference. */
export const scriptedAiViewInterpreter: AiViewInterpreter = async (
  { prompt, actions, answerOnly, evidence },
  { signal },
) => {
  signal.throwIfAborted();
  if (answerOnly && evidence?.action === 'grid.aggregate') {
    const data = evidence.data as { scope?: string; rowCount?: number; groups?: { key: Record<string, unknown>; values: unknown[] }[] };
    if (data.scope === 'visible' && Number.isSafeInteger(data.rowCount) && Array.isArray(data.groups)) {
      const groups = data.groups.map(group => `${Object.values(group.key).join(', ') || 'All'}: ${group.values.join(', ')}`).join('; ');
      return { kind: 'answer', message: `Across ${data.rowCount} visible records: ${groups}. This describes the current visible view.` };
    }
    return { kind: 'unsupported', message: 'This example only summarizes visible local aggregates.' };
  }
  const response = responses.get(prompt.trim().toLowerCase());
  if (
    response?.kind === 'action' &&
    !actions?.some((item) => item.name === response.name)
  )
    return {
      kind: 'unsupported',
      message:
        'This operation is available in the local example. Remote data uses its own action owner.',
    };
  return structuredClone(
    response ?? {
      kind: 'unsupported',
      message:
        'This backend runs scripted examples. Use a suggested request, or configure a model for free-form requests.',
      suggestions: actions?.length ? [] : aiViewSuggestions,
    },
  );
};


/** Keep exact demo suggestions usable when the optional AI backend is unavailable. */
export function createAiDemoInterpreter(
  endpoint?: string,
  options: { fetch?: typeof globalThis.fetch } = {},
): AiViewInterpreter {
  const remote = createAiViewHttpInterpreter(resolveAiDemoEndpoint(endpoint), options);
  return async (request, context) => {
    context.signal.throwIfAborted();
    try {
      return await remote(request, context);
    } catch (error) {
      if (context.signal.aborted) throw error;
      if (request.answerOnly || responses.has(request.prompt.trim().toLowerCase()))
        return scriptedAiViewInterpreter(request, context);
      return {
        kind: 'unsupported',
        message: 'AI backend is unavailable. You can still use the suggested requests or the grid’s column filters and sorting.',
        suggestions: [...aiViewSuggestions],
      };
    }
  };
}
