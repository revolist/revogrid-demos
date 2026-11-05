import { ExportFilePlugin } from '@revolist/revogrid';
import * as pro from '@revolist/revogrid-pro';
import {
  createAiViewFields,
  formatCellAddress,
  type AiAssistantConfig,
  type AiDataActionOptions,
  type AiDataActionName,
  type AiAction,
  type AiActionContext,
} from '@revolist/revogrid-pro';
import { aiDemoColumnPresets } from './AiAssistant.data';

type LocalDemoActions = Pick<
  AiAssistantConfig,
  'gridActions' | 'dataActions' | 'schemaActions' | 'integrations'
>;
/** Approved local examples; the product adapters own validation, previews and history. */
export function createLocalAiDemoActions(
  getGrid: () => HTMLRevoGridElement | undefined,
): LocalDemoActions {
  const grid = () => {
    const value = getGrid();
    if (!value) throw new Error('The demo grid is not ready.');
    return value;
  };
  const dataActions: AiDataActionOptions = {
    rowKey: 'id',
    createRow: ({ source, values }) => ({
      ...source,
      ...values,
      id: `DEMO-${crypto.randomUUID()}`,
    }),
  };
  // The published Agent runtime supports built-in data actions. Custom adapters
  // can also reuse their preparation API when that export is available.
  const createAiDataActions = Reflect.get(pro, 'createAiDataActions') as
    | ((
        grid: HTMLRevoGridElement,
        providers: NonNullable<Awaited<ReturnType<HTMLRevoGridElement['getProviders']>>>,
        options: AiDataActionOptions & {
          allowedColumns: () => Awaited<ReturnType<HTMLRevoGridElement['getColumns']>>;
          fields: () => ReturnType<typeof createAiViewFields>;
        },
      ) => AiAction[])
    | undefined;
  const prepareData = async (
    name: AiDataActionName,
    input: unknown,
    context: AiActionContext,
  ) => {
    if (!createAiDataActions) throw new Error('Custom data actions are unavailable.');
    const owner = grid();
    const providers = await owner.getProviders();
    if (!providers) throw new Error('The demo grid is not ready.');
    const actions = createAiDataActions(owner, providers, {
      ...dataActions,
      allowedColumns: () =>
        providers.column.getColumns().filter((column) => column.prop !== 'id'),
      fields: () =>
        createAiViewFields(providers.column.getColumns()),
    });
    const action = actions.find((action) => action.name === name);
    if (!action?.prepare)
      throw new Error('The demo mutation action is unavailable.');
    return action.prepare(input, context);
  };
  return {
    gridActions: { readRows: true, rowKey: 'id' },
    dataActions,
    schemaActions: {
      presets: aiDemoColumnPresets,
    },
    integrations: {
      ...(createAiDataActions ? {
        'formulas.apply': [
          {
            id: 'first-total',
            description: 'Calculate ORD-0001 total as Amount × 1.2',
            revision: () => [grid().source, grid().columns],
            prepare(context) {
              if (
                !grid().columns.some(
                  (column) => 'prop' in column && column.prop === 'total',
                )
              )
                throw new Error('Add the Total column first.');
              const amount = grid().columns.findIndex(
                (column) => 'prop' in column && column.prop === 'amount',
              );
              const row = grid().source.findIndex(
                (record) => record.id === 'ORD-0001',
              );
              if (row < 0 || amount < 0)
                throw new Error(
                  'The sample order or Amount column is unavailable.',
                );
              return prepareData(
                'cells.update',
                {
                  rows: ['ORD-0001'],
                  values: { total: `=${formatCellAddress(amount, row)}*1.2` },
                },
                context,
              );
            },
          },
        ],
        'data.import': [
          {
            id: 'sample-orders',
            description: 'Append two predefined sample orders with new IDs',
            revision: () => [grid().source, grid().columns],
            prepare: (context) =>
              prepareData(
                'rows.add',
                {
                  rows: [
                    { region: 'Europe', amount: 450, status: 'Open' },
                    { region: 'Asia', amount: 900, status: 'Pending' },
                  ],
                },
                context,
              ),
          },
        ],
      } satisfies NonNullable<AiAssistantConfig['integrations']> : {}),
      'data.export': [
        {
          id: 'orders-csv',
          description: 'Download these public demo orders as CSV',
          revision: () => [grid().source, grid().columns],
          prepare: () => ({
            preview: {
              summary: 'Download the current demo orders as CSV?',
            },
            async apply({ signal }) {
              const plugins = await grid().getPlugins();
              signal.throwIfAborted();
              const exporter = plugins.find(
                (plugin) => plugin instanceof ExportFilePlugin,
              );
              if (!exporter)
                throw new Error('The demo exporter is unavailable.');
              await exporter.exportFile({ filename: 'ai-demo-orders' });
              return { message: 'Demo orders exported.' };
            },
          }),
        },
      ],
    },
  };
}
