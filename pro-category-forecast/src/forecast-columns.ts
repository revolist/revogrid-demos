import { ROW_ACTION_COLUMN_WIDTH } from '../../composables/row-action';
import { personPortrait } from '../../composables/demo-portraits';
import { renderExpandIcon } from '@revolist/revogrid-pro';
import type { ColumnData, ColumnRegular } from '@revolist/revogrid';
import {
  departments,
  months,
  type Department,
  type Line,
  type Reading,
} from './forecast-data';
import { renderColumnHeader, renderGroupCell, renderIdentityCell, renderCellAction, visualCellRenderer, bulletChartRenderer, cellActionRenderer, groupRailRenderer } from '@revolist/revogrid-pro';
import { renderControl, renderScalarSlider } from '@revolist/ui/native';

export interface ForecastRow {
  kind: 'department' | 'line' | 'total';
  label: string;
  department?: Department;
  color?: string;
  count?: number;
  growth?: number;
  collapsed?: boolean;
  line?: Line;
  reading: Reading;
  attainment: number | null;
  actualRatio: number | null;
  share?: number[];
  [key: string]: unknown;
}

export const forecastText = {
  title: 'Retail Demand Forecast',
  subtitle: 'FY26 retail planning · Nov 2025–Oct 2026',
  actual: 'Booked sales',
  projections: 'Projected sales',
  outlook: 'FY26 outlook',
  actualPeriod: 'Actuals through',
  heat: 'Heat scale',
  globalHeat: 'All Lines',
  departmentHeat: 'Within Department',
  find: 'Search lines',
  allDepartments: 'All departments',
  allStatuses: 'All statuses',
  active: 'Core',
  new: 'New',
  columns: 'Columns',
  export: 'Export XLSX',
  add: 'Add Line',
  edit: 'Edit line',
  growth: 'Growth assumption',
  expand: 'Expand department',
  collapse: 'Collapse department',
  expandAll: 'Expand all',
  collapseAll: 'Collapse all',
  editAction: 'Edit',
  planDelta: 'vs plan',
  planBar: 'Plan attainment',
  line: 'Line',
  actions: 'Actions',
  total: 'Total',
  noPlan: 'No plan',
  heatHint:
    'Darker cells sold more. One scale spans every line and month in view.',
  filter: 'Filter',
  exit: 'Exit',
  actualTo: (month: string) => `FY26, actuals to ${month}`,
  noResults: 'No lines match these filters.',
  name: 'Line name',
  department: 'Department',
  planner: 'Planner',
  status: 'Status',
  lastMonth: 'Last Month',
  plan: 'FY26 sales plan',
  cancel: 'Cancel',
  save: 'Save',
  revert: 'Revert',
  newLine: 'New Line',
  remove: 'Delete line',
  undo: 'Undo',
  deletePrompt: 'Delete this product line?',
  deleted: (name: string) => `${name} deleted.`,
  created: (name: string) => `${name} added.`,
  updated: (name: string) => `${name} updated.`,
  reportError: 'The workbook could not be exported.',
  pointOutlook: 'Outlook',
  pointPlan: 'Plan',
  pointAttainment: 'Attainment',
  lineCount: (count: number) => `${count} ${count === 1 ? 'line' : 'lines'}`,
  planLabel: (result: string) => `${result} of annual plan`,
  priorYear: 'Prior year',
  market: 'Sales planning',
};
export type ForecastText = typeof forecastText;

export const money = {
  format(value: number) {
    if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `$${Math.round(value / 1000)}k`;
    return `$${Math.round(value)}`;
  },
};
export const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
export const signedPrecise = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});
export const signed = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});

interface ColumnOptions {
  text: ForecastText;
  closeMonth: number;
  bands: ReadonlyMap<Department | 'all', number>;
  heatByDepartment: boolean;
  compact: boolean;
  lineWidth: number;
  toggleDepartment: (department: Department) => void;
  toggleAll: () => void;
  allCollapsed: () => boolean;
  adjust: (department: Department) => void;
  setGrowth: (department: Department, value: number) => void;
  hasGrowthDraft: (department: Department) => boolean;
  saveGrowth: (department: Department) => void;
  revertGrowth: (department: Department) => void;
  isEditingLine: (id: string) => boolean;
  focusNewLine: (id: string, element: HTMLInputElement | null) => void;
  finishNewLine: (id: string, value: string, cancel: boolean) => void;
  edit: (line: Line) => void;
  open: (line: Line) => void;
  addLine: (department: Department) => void;
}

const keyboardSafe = {
  onMouseDown: (event: MouseEvent) => event.stopPropagation(),
};

export function createColumns(options: ColumnOptions): ColumnData {
  const { text, closeMonth, bands, heatByDepartment, compact } = options;
  const departmentColumn: ColumnRegular = {
    prop: 'department',
    name: text.department,
    size: 160,
    pin: 'colPinStart',
    columnTemplate: h => renderColumnHeader(h, {
      className: 'forecast-department-header', label: text.department,
      action: { label: options.allCollapsed() ? text.expandAll : text.collapseAll,
        className: 'forecast-icon-button', content: h => renderExpandIcon(h, !options.allCollapsed()), onActivate: options.toggleAll },
    }),
    cellTemplate(h, props) {
      const row = props.model as ForecastRow;
      if (row.kind === 'total')
        return h('span', { class: 'forecast-total-name' }, [
          h('strong', {}, text.total),
          h('small', {}, text.lineCount(row.count ?? 0)),
        ]);
      return groupRailRenderer!(h, props);
    },
    groupRail: {
      format: (_value, model) => {
        const row = model as ForecastRow;
        if (row.kind !== 'department' || !row.department) return;
        const department = departments.find(entry => entry.name === row.department)!;
        const growth = signed.format((row.growth ?? 0) / 100);
        const ratio = row.attainment;
        const face = personPortrait(department.planner);
        return {
          title: department.name,
          actionLabel: `${row.collapsed ? text.expand : text.collapse} ${department.name}`,
          expanded: !row.collapsed,
          showDetailsWhenCollapsed: true,
          className: `forecast-department-card${row.collapsed ? ' is-collapsed' : ''}${options.hasGrowthDraft(row.department) ? ' has-growth-draft' : ''}`,
          style: { '--tone': department.color, '--tint': department.tint, '--surface': department.surface },
          parts: { rail: 'forecast-rail', railContent: 'forecast-rail-content', icon: 'forecast-rail-icon', label: 'forecast-rail-label', details: 'forecast-department-details' },
          details: (h) => row.collapsed
              ? [h('strong', {}, department.name), h('span', {}, growth)]
              : [
                  h('span', {}, 'Growth on FY25'),
                  h('div', { class: 'forecast-growth' }, [
                    h('strong', {}, growth),
                    renderScalarSlider(h, {
                      min: -20, max: 20, step: 1, value: Number(row.growth ?? 0),
                      label: `${department.name} ${text.growth}`, hideValue: true,
                      displayValue: growth, formatValue: (value: number) => signed.format(value / 100),
                      onInput: (value: number) => options.setGrowth(department.name, value),
                      onChange: (value: number) => options.setGrowth(department.name, value),
                      onMouseDown: (event: MouseEvent) => event.stopPropagation(),
                    }),
                  ]),
                  h('dl', {}, [
                    h('dt', {}, 'Forecast'),
                    h(
                      'dd',
                      {},
                      new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        notation: 'compact',
                        maximumSignificantDigits: 3,
                      }).format(row.reading.forecast),
                    ),
                    h('dt', {}, 'Outlook'),
                    h('dd', {}, money.format(row.reading.outlook)),
                    h('dt', {}, 'Plan'),
                    h('dd', {}, money.format(row.reading.plan)),
                    h('dt', {}, text.planDelta),
                    h(
                      'dd',
                      {
                        class:
                          ratio !== null && ratio >= 1
                            ? 'forecast-positive'
                            : 'forecast-negative',
                      },
                      ratio === null
                        ? text.noPlan
                        : signedPrecise.format(ratio - 1),
                    ),
                  ]),
                  h('span', { class: 'forecast-planner' }, [
                    h('img', { src: face, alt: '' }),
                    h('span', {}, department.planner),
                  ]),
                  ...(options.hasGrowthDraft(department.name) ? [h('div', { class: 'forecast-growth-actions' }, [
                    renderControl(h, 'button', { ...keyboardSafe, type: 'button', class: 'rv-btn-solid', 'aria-label': `${text.save} ${department.name} ${text.growth}`, onClick: () => options.saveGrowth(department.name) }, text.save),
                    renderControl(h, 'button', { ...keyboardSafe, type: 'button', 'aria-label': `${text.revert} ${department.name} ${text.growth}`, onClick: () => options.revertGrowth(department.name) }, text.revert),
                  ])] : []),
                ],
        };
      },
      onToggle: model => { const row = model as ForecastRow; if (row.department) options.toggleDepartment(row.department); },
    },
  };
  const lineColumn: ColumnRegular = {
    prop: 'label',
    name: text.line,
    size: options.lineWidth,
    pin: 'colPinStart',
    cellTemplate(h, { model }) {
      const row = model as ForecastRow;
      if (row.kind === 'line') {
        if (row.line && options.isEditingLine(row.line.id)) {
          const id = row.line.id;
          return h('div', { class: 'forecast-name forecast-name--child' }, [renderControl(h, 'input', {
            class: 'forecast-line-input', type: 'text', value: row.label, maxLength: 60,
            'aria-label': text.name, ref: (element: HTMLInputElement | null) => options.focusNewLine(id, element),
            onMouseDown: (event: MouseEvent) => event.stopPropagation(),
            onKeyDown: (event: KeyboardEvent) => {
              event.stopPropagation();
              if (event.key === 'Enter') { event.preventDefault(); (event.currentTarget as HTMLInputElement).blur(); }
              if (event.key === 'Escape') { event.preventDefault(); options.finishNewLine(id, '', true); }
            },
            onBlur: (event: FocusEvent) => options.finishNewLine(id, (event.currentTarget as HTMLInputElement).value, false),
          })]);
        }
        const status = row.line?.status;
        return renderIdentityCell(h, {
          className: 'forecast-name forecast-name--child', label: row.label, actionClassName: 'forecast-line-link',
          onActivate: () => { if (row.line) options.open(row.line); },
          ...(status === 'New' || status === 'Exit' ? { badge: { text: status === 'Exit' ? text.exit : text.new, className: `forecast-new ${status === 'Exit' ? 'exit' : ''}` } } : {}),
        });
      }
      if (!row.department)
        return compact
          ? h('span', { class: 'forecast-total-name' }, [
              h('strong', {}, text.total),
              h('small', {}, text.lineCount(row.count ?? 0)),
            ])
          : undefined;
      const name = row.department;
      return renderGroupCell(h, {
        variant: 'inline', className: 'forecast-name forecast-name--group', label: name, detail: String(row.count ?? 0),
        trailing: h => [
          renderCellAction(h, { label: compact ? `${name} ${text.growth}` : `${text.add} · ${name}`,
            className: compact ? 'forecast-icon-button' : 'forecast-icon-button demo-cell-add',
            text: compact ? signed.format((row.growth ?? 0) / 100) : '+',
            onActivate: () => compact ? options.adjust(name) : options.addLine(name) }),
          renderCellAction(h, { label: compact ? `${row.collapsed ? text.expand : text.collapse} ${name}` : `Toggle ${name} lines`,
            className: 'forecast-icon-button forecast-fold', expanded: !row.collapsed, content: h => renderExpandIcon(h, !row.collapsed),
            onActivate: () => options.toggleDepartment(name) }),
        ],
      });
    },
  };

  const monthColumns: ColumnRegular = {
    prop: 'forecast-months', size: 54,
    dateRangeColumns: {
      start: '2025-11-01', end: '2026-10-01', unit: 'month',
      prop: slot => months[slot.index],
      column: slot => ({ name: months[slot.index] }),
    },
    heatmap: {
      color: '#6647f0', opacity: 0.9,
      max: ({ model }) => bands.get((heatByDepartment && (model as ForecastRow).department) || 'all') ?? 1,
      enabled: ({ model, value }) => (model as ForecastRow).kind === 'line' && Number(value) > 0,
    },
    columnTemplate: (h, column) => h('span', { class: 'forecast-month-header' }, months[column.dateSlot!.index]),
    cellTemplate: visualCellRenderer,
    visualCell: { format: (_value, model, column) => {
      const index = column.dateSlot!.index;
      const row = model as ForecastRow;
      const value = row.reading.months[index];
      if (row.kind === 'department') return { kind: 'text', className: 'forecast-share', text: `${Math.round((row.share?.[index] ?? 0) * 100)}%` };
      if (row.kind === 'total') return { kind: 'text', element: 'strong', className: 'forecast-subtotal', text: money.format(value) };
      if (!value) return { kind: 'text', className: 'forecast-missing', text: '', title: index > closeMonth ? 'No forecast' : 'No sales' };
      return { kind: 'text', className: 'forecast-heat', text: money.format(value), title: money.format(value) };
    } },
  };
  const exactMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const compactMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 });
  const compactOutlook = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
  const wholePercent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 });
  const bullet: ColumnRegular = {
    prop: 'attainment',
    name: text.planBar,
    size: 138,
    cellTemplate: bulletChartRenderer,
    bulletChart: {
      max: 1.25,
      target: () => 1,
      actual: 'actualRatio',
      label: (value) =>
        value === null ? text.noPlan : text.planLabel(percent.format(value)),
      tooltip: (model) => {
        const row = model as ForecastRow;
        const reading = row.reading;
        const prior = reading.prior.reduce((total, value) => total + value, 0);
        const share = (value: number, precision: number) => reading.plan > 0 ? `, ${(precision ? percent : wholePercent).format(value / reading.plan)}` : '';
        return { title: `${row.label}, FY26 outlook`, subtitle: `Actual to ${months[closeMonth]}, then the forecast`, rows: [
          { label: 'Plan', value: reading.plan > 0 ? exactMoney.format(reading.plan) : text.noPlan },
          { label: 'Actual', value: `${compactMoney.format(reading.actual)}${share(reading.actual, 0)}` },
          { label: 'Outlook', value: `${compactOutlook.format(reading.outlook)}${share(reading.outlook, 1)}` },
          { label: 'FY25', value: `${compactMoney.format(prior)}${share(prior, 0)}` },
        ] };
      },
    },
    columnTemplate: (h) =>
      h(
        'span',
        { class: 'forecast-plan-scale', 'aria-label': 'Share of plan' },
        ['0', '50%', '100%'].map((value) => h('span', {}, value)),
      ),
  };
  return [
    ...(compact ? [] : [departmentColumn]),
    lineColumn,
    monthColumns,
    {
      prop: 'delta',
      name: text.planDelta,
      size: 72,
      cellTemplate: (h, { model }) => {
        const value = (model as ForecastRow).attainment;
        return h(
          'span',
          { class: 'forecast-delta' },
          value === null
            ? [h('span', {}, text.noPlan)]
            : [
                h('span', {}, signedPrecise.format(value - 1)),
                h(
                  'small',
                  {
                    class:
                      value >= 1 ? 'forecast-positive' : 'forecast-negative',
                  },
                  value >= 1 ? '▴' : '▾',
                ),
              ],
        );
      },
    },
    bullet,
    {
      prop: 'actions',
      columnChooser: false,
      name: '',
      size: ROW_ACTION_COLUMN_WIDTH,
      cellTemplate: cellActionRenderer,
      cellAction: {
        visible: (model) => !!model.department,
        label: (model) => {
          const { department, line } = model as ForecastRow;
          return `${line ? text.edit : text.add} · ${line?.name ?? department}`;
        },
        onActivate: (model) => {
          const { department, line } = model as ForecastRow;
          if (line) options.edit(line);
          else if (department) options.addLine(department);
        },
      },
    },
  ];
}
