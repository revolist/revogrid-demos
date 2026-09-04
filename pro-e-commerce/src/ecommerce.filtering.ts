import type { AdvanceFilterPlugin, FilterAst } from '@revolist/revogrid-pro';

export type EcommerceFilterAst = FilterAst;

export type EcommerceFilterPresetId =
  | 'highValueGold'
  | 'discountedChicago'
  | 'ratingAndGrowth';

export interface EcommerceFilterPreset {
  label: string;
  ast: EcommerceFilterAst;
}

export const ECOMMERCE_QUICK_FILTER_COLUMNS = Object.freeze([
  'Customer ID',
  'Customer',
  'City',
  'Membership Type',
  'SKU',
  'Product',
  'Product Category',
  'Order Status',
  'Country',
  'Tags',
]);

export const ECOMMERCE_FILTER_PRESETS: Readonly<Record<
  EcommerceFilterPresetId,
  EcommerceFilterPreset
>> = Object.freeze({
  highValueGold: {
    label: 'High-value Gold customers',
    ast: {
      type: 'group',
      operator: 'and',
      children: [
        {
          type: 'condition',
          field: 'Membership Type',
          operator: 'equal',
          valueType: 'string',
          value: 'Gold',
        },
        {
          type: 'condition',
          field: 'Lifetime Value',
          operator: 'greaterThanOrEqual',
          valueType: 'number',
          value: 10000,
        },
      ],
    },
  },
  discountedChicago: {
    label: 'Discounted customers in Chicago',
    ast: {
      type: 'group',
      operator: 'and',
      children: [
        {
          type: 'condition',
          field: 'Discount Applied',
          operator: 'isTrue',
          valueType: 'boolean',
        },
        {
          type: 'condition',
          field: 'City',
          operator: 'equal',
          valueType: 'string',
          value: 'Chicago',
        },
      ],
    },
  },
  ratingAndGrowth: {
    label: 'Rating ≥ 4 and spend increasing',
    ast: {
      type: 'group',
      operator: 'and',
      children: [
        {
          type: 'condition',
          field: 'Average Rating',
          operator: 'greaterThanOrEqual',
          valueType: 'number',
          value: 4,
        },
        {
          type: 'condition',
          field: 'Spend Change (%)',
          operator: 'greaterThan',
          valueType: 'number',
          value: 0,
        },
      ],
    },
  },
});

export interface EcommerceDerivedState<Row = Record<string, unknown>> {
  visibleRows: Row[];
  visibleCount: number;
  totalSpend: number;
  selectedIds: Set<string>;
  visibleSelectedIds: Set<string>;
  empty: boolean;
}

export type EcommerceVisibleSourceSync = (() => Promise<void>) & {
  cancel(): void;
};

export function getEcommerceRowId(row: Record<string, unknown>) {
  return String(row['Customer ID'] ?? row.id ?? '');
}

export function ecommerceSpendNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return 0;
  const number = typeof value === 'number'
    ? value
    : Number.parseFloat(String(value).replace(/[$,\s]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

export function createEcommerceDerivedState<Row extends Record<string, unknown>>(
  visibleRows: readonly Row[],
  selectedIds: ReadonlySet<string> = new Set(),
): EcommerceDerivedState<Row> {
  const customerRows = visibleRows.filter(row => getEcommerceRowId(row) !== '');
  const visibleIds = new Set(customerRows.map(getEcommerceRowId));
  return {
    visibleRows: [...customerRows],
    visibleCount: customerRows.length,
    totalSpend: customerRows.reduce(
      (sum, row) => sum + ecommerceSpendNumber(row['Total Spend']),
      0,
    ),
    selectedIds: new Set(selectedIds),
    visibleSelectedIds: new Set([...selectedIds].filter(id => visibleIds.has(id))),
    empty: customerRows.length === 0,
  };
}

export function setEcommerceQuickFilter(
  grid: HTMLRevoGridElement,
  text: string,
) {
  (grid as HTMLRevoGridElement & { quickFilter?: unknown }).quickFilter = text.trim()
    ? { text, columns: [...ECOMMERCE_QUICK_FILTER_COLUMNS] }
    : undefined;
}

export async function applyEcommerceFilterPreset(
  grid: HTMLRevoGridElement,
  preset?: EcommerceFilterPresetId,
) {
  const plugins = await grid.getPlugins();
  const filterPlugin = plugins.find((plugin) =>
    typeof (plugin as { setFilterAst?: unknown }).setFilterAst === 'function',
  ) as Pick<AdvanceFilterPlugin, 'setFilterAst'> | undefined;
  if (!filterPlugin) {
    throw new Error('AdvanceFilterPlugin is required for e-commerce presets.');
  }
  await filterPlugin.setFilterAst(
    preset ? ECOMMERCE_FILTER_PRESETS[preset].ast : undefined,
    { preserveQuickFilter: true },
  );
}

export function createEcommerceVisibleSourceSync<Row extends Record<string, unknown>>(
  grid: HTMLRevoGridElement,
  apply: (state: EcommerceDerivedState<Row>) => void,
  getSelectedIds: () => ReadonlySet<string> = () => new Set(),
) {
  let revision = 0;
  let active = true;
  const sync = async () => {
    const currentRevision = ++revision;
    const visibleRows = await grid.getVisibleSource() as Row[];
    if (!active || currentRevision !== revision) return;
    apply(createEcommerceDerivedState(visibleRows, getSelectedIds()));
  };
  sync.cancel = () => {
    active = false;
    revision += 1;
  };
  return sync as EcommerceVisibleSourceSync;
}
