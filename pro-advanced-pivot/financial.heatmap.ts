import type { ColumnType, PropertiesFunc } from '@revolist/revogrid';
import { mergeCellProperties } from '@revolist/revogrid-pro';

export type FinancialHeatmapField =
  | 'Units Sold'
  | 'Sales'
  | 'Profit'
  | 'Gross Sales'
  | 'Discounts'
  | 'COGS';

interface FinancialHeatmapScale {
  sum: number;
  point: number;
  positive: readonly [number, number, number];
}

const FINANCIAL_HEATMAP_SCALES: Record<FinancialHeatmapField, FinancialHeatmapScale> = {
  'Units Sold': { sum: 50_000, point: 5_000, positive: [37, 99, 235] },
  Sales: { sum: 5_000_000, point: 350_000, positive: [15, 255, 55] },
  Profit: { sum: 2_000_000, point: 150_000, positive: [22, 163, 74] },
  'Gross Sales': { sum: 16_000_000, point: 500_000, positive: [5, 150, 105] },
  Discounts: { sum: 1_000_000, point: 40_000, positive: [217, 119, 6] },
  COGS: { sum: 10_000_000, point: 350_000, positive: [124, 58, 237] },
};

const NEGATIVE_RGB = [220, 38, 38] as const;

export function createFinancialHeatmapCellProperties(
  field: FinancialHeatmapField,
): PropertiesFunc {
  const scale = FINANCIAL_HEATMAP_SCALES[field];

  return ({ value, column }) => {
    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numeric)) {
      return undefined;
    }

    const isSum = column?.aggregator === 'sum'
      || /\(sum\)\s*$/i.test(String(column?.name ?? ''));
    const maximum = isSum ? scale.sum : scale.point;
    const intensity = Math.min(1, Math.sqrt(Math.abs(numeric) / maximum));
    const alpha = 0.045 + intensity * 0.205;
    const [red, green, blue] = numeric < 0 ? NEGATIVE_RGB : scale.positive;

    return {
      class: 'financial-pivot-heatmap',
      style: {
        backgroundColor: `rgba(${red}, ${green}, ${blue}, ${alpha.toFixed(3)})`,
      },
      title: `${field} heatmap intensity: ${Math.round(intensity * 100)}%`,
    };
  };
}

const financialCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const financialNumber = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function createFinancialHeatmapColumnType(
  field: FinancialHeatmapField,
  format: 'currency' | 'number',
): ColumnType {
  const cellProperties = createFinancialHeatmapCellProperties(field);
  const formatter = format === 'currency' ? financialCurrency : financialNumber;

  return {
    cellProperties: mergeCellProperties(
      () => ({ class: { 'align-right': true } }),
      cellProperties,
    ),
    cellTemplate: (_h, params) => {
      return typeof params.value === 'number' && Number.isFinite(params.value)
        ? formatter.format(params.value)
        : String(params.value ?? '');
    },
  };
}
