import { createSegmentedBarElement } from '../../shared/segmented-bar';
import bulkDeleteIcon from '@fortawesome/fontawesome-free/svgs/solid/trash.svg?raw';
import bulkExportIcon from '@fortawesome/fontawesome-free/svgs/solid/download.svg?raw';
import { mountActionBar } from '@revolist/ui/action-bar';
import { KeyedRowSelectionPlugin } from '@revolist/revogrid-pro';
import compassIcon from '@fortawesome/fontawesome-free/svgs/solid/compass.svg?raw';
import designIcon from '@fortawesome/fontawesome-free/svgs/solid/pen-ruler.svg?raw';
import codeIcon from '@fortawesome/fontawesome-free/svgs/solid/code.svg?raw';
import puzzleIcon from '@fortawesome/fontawesome-free/svgs/solid/puzzle-piece.svg?raw';
import hoursIcon from '@fortawesome/fontawesome-free/svgs/solid/clock.svg?raw';
import licenseIcon from '@fortawesome/fontawesome-free/svgs/solid/key.svg?raw';
import feeIcon from '@fortawesome/fontawesome-free/svgs/solid/file-invoice-dollar.svg?raw';
import walletIcon from '@fortawesome/fontawesome-free/svgs/solid/wallet.svg?raw';
import spendIcon from '@fortawesome/fontawesome-free/svgs/solid/credit-card.svg?raw';
import forecastIcon from '@fortawesome/fontawesome-free/svgs/solid/chart-line.svg?raw';
import riskIcon from '@fortawesome/fontawesome-free/svgs/solid/triangle-exclamation.svg?raw';
import compactRowsIcon from '@fortawesome/fontawesome-free/svgs/solid/bars.svg?raw';
import comfortableRowsIcon from '@fortawesome/fontawesome-free/svgs/solid/table-list.svg?raw';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { SegmentedSwitch } from '@revolist/ui/react';
import { createControl, createLegendElement, createNumberStepperElement } from '@revolist/ui/native';
import { createDetailPanel } from '../../../../composables/detail-panel';
import { ROW_ACTION_COLUMN_WIDTH } from '../../../../composables/row-action';
import { demoColors } from '../../../../composables/demo-colors';
import { demoPortrait } from '../../../../composables/demo-portraits';
import { createMetricTileElement, releaseMetricElement } from '@revolist/ui/native';
import '@revolist/ui/metric-panel.scss';
import { createChartHost } from '@revolist/charts/core';
import { createAreaLineChart } from '@revolist/charts/area-line';
import { createColumnLineChart } from '@revolist/charts/column-line';
import { createTimeRangeColumnType, entityCellRenderer, visualCellRenderer, cellActionRenderer, renderSortMenuHeader } from '@revolist/revogrid-pro';
import { calendarField } from '../../shared/ui-calendar-field';
import { planAmount, partsAmount, primaryBasis, type BudgetParts, type BudgetPlan } from './budget-components';
import { budgetActivityFixtures } from './budget-activity-fixtures';
import { availableDecisions, previewDecision, type BudgetDecision } from './budget-decisions';
import { budgetLineTotals, contingencyScale } from './budget-math';
import { budgetBurn, weeklyBudget } from './budget-weekly';
import { referenceSchedule } from './budget-reference-schedule';
import { budgetHealth, monthForDay, monthNames, monthStarts, projectedFinish, scheduleGeometry } from './budget-schedule';
import { compareBudget, type BudgetFigures, type BudgetSortKey } from './budget-sort';
import type { ColumnData } from '@revolist/revogrid';
import {
  button,
  field,
  groupedMetrics,
  input,
  make,
  matches,
  money,
  pct,
  removeRecord,
  select,
  total,
  type Example,
  type WorkbenchFormHandle,
} from '../../shared/workbench-ui';

const workstreams = [
  'Site planning',
  'Design',
  'Build',
  'Utilities',
  'Fit-out',
  'Launch',
];
// A fictional community studio buildout, grouped by delivery workstream.
const fixtures: ReadonlyArray<readonly [string, string]> = [
  ['Site planning', 'Community listening sessions'], ['Site planning', 'Building condition survey'], ['Site planning', 'Equipment inventory'],
  ['Design', 'Studio layout studies'], ['Design', 'Construction drawings'], ['Design', 'Accessibility consultation'],
  ['Build', 'Main studio construction'], ['Build', 'Workshop room fit-out'], ['Build', 'Equipment rental'], ['Build', 'Tool storage rental'], ['Build', 'Access inspection'],
  ['Utilities', 'Electrical installation'], ['Utilities', 'Lighting installation'], ['Utilities', 'Access control installation'],
  ['Fit-out', 'Acoustic treatment'], ['Fit-out', 'Salvage and preparation'], ['Fit-out', 'Furniture restoration'], ['Fit-out', 'Equipment installation'],
  ['Launch', 'Safety inspection'], ['Launch', 'Sound testing'], ['Launch', 'Volunteer training'], ['Launch', 'Opening support'],
];
const decisions = ['Open', 'Cover', 'Adjust', 'Hold'];
const units = ['Hours', 'Licenses', 'Fixed fee'];
interface ActivityEntry { id: string; day: string; title: string; detail: string; amount: number; }
interface LineChange { id: string; day: string; by: string; note: string; kind: string; detail?: string; }
interface Line {
  id: string;
  activity: ActivityEntry[];
  changes: LineChange[];
  plan: BudgetPlan;
  billedParts: BudgetParts;
  leftParts: BudgetParts;
  lineStatus: string;
  label: string;
  stream: string;
  vendor: string;
  unit: string;
  units: number;
  rate: number;
  baseFee: number;
  actual: number;
  remaining: number;
  start: number;
  plannedEnd: number;
  decision: string;
}
const plannedPeriods: readonly string[] = monthNames;
const vendors = [...new Set(Object.values(referenceSchedule).map((item) => item.vendor))];

export const projectBudget: Example = {
  id: 'project-budget',
  title: 'Project Budget Tracker',
  description: 'Community studio buildout',
  setup(bench) {
    const compactMetrics = new URLSearchParams(window.location.search).get('compactMetrics') !== '0';
    bench.summary.classList.toggle('budget-compact-metrics', compactMetrics);
    let metricCards: HTMLElement[] = [];
    const releaseCards = () => { metricCards.forEach(releaseMetricElement); metricCards = []; };
    bench.onDispose(releaseCards);
    let reserve = 36000;
    let nextLine = 1;
    const rows: Line[] = fixtures.map(
      (
        [stream, label],
      ) => ({
        id: budgetActivityFixtures[label as keyof typeof budgetActivityFixtures].id,
        activity: [...budgetActivityFixtures[label as keyof typeof budgetActivityFixtures].entries],
        changes: [...budgetActivityFixtures[label as keyof typeof budgetActivityFixtures].changes],
        plan: { ...budgetActivityFixtures[label as keyof typeof budgetActivityFixtures].plan },
        billedParts: { ...budgetActivityFixtures[label as keyof typeof budgetActivityFixtures].actual },
        leftParts: { ...budgetActivityFixtures[label as keyof typeof budgetActivityFixtures].left },
        lineStatus: budgetActivityFixtures[label as keyof typeof budgetActivityFixtures].status,
        label,
        stream,
        ...primaryBasis(budgetActivityFixtures[label as keyof typeof budgetActivityFixtures].plan),
        actual: partsAmount(budgetActivityFixtures[label as keyof typeof budgetActivityFixtures].actual, budgetActivityFixtures[label as keyof typeof budgetActivityFixtures].plan),
        remaining: partsAmount(budgetActivityFixtures[label as keyof typeof budgetActivityFixtures].left, budgetActivityFixtures[label as keyof typeof budgetActivityFixtures].plan),
        start: referenceSchedule[label].start,
        plannedEnd: referenceSchedule[label].plannedEnd,
        vendor: referenceSchedule[label].vendor,
        decision: 'Open',
      }),
    );
    const expanded = new Set([
      'Design',
      'Build',
      'Utilities',
      'Fit-out',
    ]);
    const filteredCollapsed = new Set<string>();
    const filter = select(
      'Budget status',
      ['All lines', 'Over budget', 'Over-budget groups', 'Within budget', 'Late', 'Decision open'],
      'All lines',
      () => { filteredCollapsed.clear(); refresh(); },
    );
    const groupBy = select(
      'Group lines by',
      ['Workstream', 'Vendor'],
      'Workstream',
      () => { filteredCollapsed.clear(); refresh(); },
    );
    let sorting: { key: BudgetSortKey; direction: 1 | -1 } | null = null;
    const compactRows = button('Compact rows', () => { bench.grid.rowSize = 41; compactRows.setAttribute('aria-pressed', 'true'); comfortableRows.setAttribute('aria-pressed', 'false'); });
    const comfortableRows = button('Comfortable rows', () => { bench.grid.rowSize = 54; compactRows.setAttribute('aria-pressed', 'false'); comfortableRows.setAttribute('aria-pressed', 'true'); });
    compactRows.setAttribute('aria-pressed', 'true'); comfortableRows.setAttribute('aria-pressed', 'false');
    compactRows.classList.add('budget-density'); comfortableRows.classList.add('budget-density');
    compactRows.setAttribute('aria-label', 'Compact rows'); comfortableRows.setAttribute('aria-label', 'Comfortable rows');
    compactRows.innerHTML = compactRowsIcon; comfortableRows.innerHTML = comfortableRowsIcon;
    if (compactMetrics) bench.heading.append(bench.summary);
    bench.heading.append(button('Add Line', () => edit(), true));
    const filters = make('div', '', 'budget-filters');
    const statuses = [
      ['All', 'All lines'],
      ['Over Budget', 'Over budget'],
      ['Over-budget groups', 'Over-budget groups'],
      ['Under Budget', 'Within budget'],
      ['Late', 'Late'],
    ].map(([label, value]) => {
      const control = button(label, () => {
        filter.value = value;
        filteredCollapsed.clear();
        refresh();
      });
      control.dataset.budgetStatus = value;
      filters.append(control);
      return { control, value, label };
    });
    filter.classList.add('budget-filter-mobile');
    bench.toolbar.append(filters, groupBy, compactRows, comfortableRows, filter);
    const bulkHost = make('div', '', 'campaign-bulk-host');
    bulkHost.hidden = true;
    bench.toolbar.insertAdjacentElement('afterend', bulkHost);
    let selectedKeys = new Set<string>();
    let visibleLines: Line[] = [];
    const selectedLines = () => visibleLines.filter(row => selectedKeys.has(row.id) || selectedKeys.has(`group:${groupBy.value === 'Vendor' ? row.vendor : row.stream}`));
    const clearSelection = () => { void bench.grid.getPlugins().then(plugins => plugins.find(plugin => plugin instanceof KeyedRowSelectionPlugin)?.clear()); };
    const bulkBar = mountActionBar(bulkHost, { label: 'Selected budget lines', count: 0, selectionLabel: '', positioning: { mode: 'inline' } });
    function renderBulk() {
      const selected = selectedLines();
      bulkHost.hidden = selected.length === 0;
      bench.toolbar.hidden = selected.length > 0;
      bulkBar.update({
        label: 'Selected budget lines', count: selected.length,
        selectionLabel: `${selected.length} ${selected.length === 1 ? 'line' : 'lines'} selected  •  ${money(total(selected, row => budgetLineTotals(row).forecast))} forecast`,
        positioning: { mode: 'inline' },
        actions: [
          { id: 'done', label: 'Mark done', disabled: !selected.some(row => row.lineStatus !== 'done') },
          { id: 'export', label: 'Export', icon: bulkExportIcon },
          { id: 'delete', label: 'Delete', icon: bulkDeleteIcon, variant: 'danger' },
          { id: 'clear', label: 'Clear' },
        ],
        onAction: action => {
          if (action === 'clear') { clearSelection(); return; }
          if (action === 'export') {
            const lines = [['Line', 'Workstream', 'Vendor', 'Budget', 'Actual', 'Forecast'], ...selected.map(row => { const figures = budgetLineTotals(row); return [row.label, row.stream, row.vendor, figures.budget, figures.actual, figures.forecast]; })];
            const csv = lines.map(line => line.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
            const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
            const link = document.createElement('a'); link.href = url; link.download = 'selected-budget-lines.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0); return;
          }
          if (action === 'done') {
            const changed = selected.filter(row => row.lineStatus !== 'done').map(row => ({ row, status: row.lineStatus }));
            changed.forEach(({ row }) => { row.lineStatus = 'done'; });
            clearSelection(); refresh(); bench.report(`${changed.length} ${changed.length === 1 ? 'line' : 'lines'} marked done.`, () => { changed.forEach(({ row, status }) => { row.lineStatus = status; }); refresh(); });
          }
          if (action === 'delete') {
            const ids = new Set(selected.map(row => row.id));
            const removed = rows.flatMap((row, index) => ids.has(row.id) ? [{ row, index }] : []);
            for (const { index } of [...removed].reverse()) rows.splice(index, 1);
            clearSelection(); refresh(); bench.report(`${removed.length} ${removed.length === 1 ? 'line' : 'lines'} deleted.`, () => { removed.forEach(({ row, index }) => rows.splice(Math.min(index, rows.length), 0, row)); refresh(); });
          }
        },
      });
    }
    bench.grid.addEventListener('keyedrowselectionchange', event => { selectedKeys = new Set(event.detail.keys.filter((key): key is string => typeof key === 'string')); renderBulk(); });
    bench.onDispose(() => bulkBar.destroy());
    bench.onSearch(refresh);
    bench.onCompactChange(refresh);
    const applySort = (direction: 1 | -1 | null) => async (context: import('@revolist/revogrid-pro').DataGridContextMenuContext) => {
      const column = context.column;
      if (!column) return;
      if (['budget', 'actual', 'spent', 'forecast', 'delta'].includes(String(column.prop))) {
        sorting = direction === null ? null : { key: column.prop as BudgetSortKey, direction };
        refresh();
      } else {
        await bench.grid.updateColumnSorting(column, direction === 1 ? 'asc' : direction === -1 ? 'desc' : undefined, false);
      }
    };
    bench.grid.dataGridContextMenu = { ...bench.grid.dataGridContextMenu || {}, commandHandlers: {
      'column.sortAscending': applySort(1), 'column.sortDescending': applySort(-1), 'column.clearSort': applySort(null),
    } };
    const header = (key: BudgetSortKey, label: string) =>
      (h: Parameters<NonNullable<import('@revolist/revogrid').ColumnRegular['columnTemplate']>>[0]) => renderSortMenuHeader(h, {
        label, ariaLabel: `${label} column menu`, className: 'budget-sort-header',
        direction: sorting?.key === key ? (sorting.direction === 1 ? 'asc' : 'desc') : undefined,
      });
    bench.grid.columnTypes = { ...bench.grid.columnTypes, budgetSchedule: createTimeRangeColumnType({
      start: '2026-08-01', end: '2027-03-31', unit: 'month', headerStep: 2, headerYear: 'never', headerAlign: 'between', locale: 'en-US',
      mode: 'timeline', range: { start: 0, end: 100 },
      timeline: (model) => {
        const row = (model.line ?? model.schedule) as (Line & { finish?: number }) | undefined;
        if (!row) return;
        const finish = row.finish ?? projectedFinish(row);
        const completed = model.actual > 0 && model.actual >= model.forecast;
        const geometry = scheduleGeometry({ ...row, finish }, completed);
        const status = budgetHealth({ ...row, budget: model.budget, actual: model.actual, forecast: model.forecast });
        return {
          label: `${plannedPeriods[monthForDay(row.start)]}–${plannedPeriods[monthForDay(finish)]} · planned through ${plannedPeriods[monthForDay(row.plannedEnd)]}`,
          events: [
            { start: geometry.left, end: geometry.left + geometry.plannedWidth, className: 'budget-track__plan' },
            ...(geometry.elapsedWidth > 0 ? [{ start: geometry.left, end: geometry.left + geometry.elapsedWidth, className: `budget-track__elapsed ${status}` }] : []),
            ...(geometry.extensionWidth > 0 ? [{ start: geometry.extensionLeft, end: geometry.extensionLeft + geometry.extensionWidth, className: 'budget-track__extension' }] : []),
          ],
          markers: [{ value: geometry.today }],
        };
      },
    }) };
    const columns: ColumnData = groupedMetrics([
      {
        prop: 'label', name: 'Line', size: 280, pin: 'colPinStart', cellTemplate: entityCellRenderer,
        entityCell: {
          format: (value, model) => {
            const label = String(value ?? '');
            if (model.total) return { kind: 'identity', label, interactive: false };
            const leading = (h: Parameters<NonNullable<import('@revolist/revogrid').ColumnRegular['cellTemplate']>>[0]) => h('span', { class: 'budget-line__icon', 'aria-hidden': 'true', innerHTML: String(model.mark ?? '') });
            return model.group
              ? { kind: 'group', variant: 'tree', className: 'budget-line is-group', label, labelClassName: 'budget-line__name', actionClassName: 'cell-action', detail: String(model.count), expanded: !!model.expanded, actionLabel: `${model.expanded ? 'Collapse' : 'Expand'} ${label}`, leading }
              : { kind: 'identity', className: 'budget-line', label, actionLabel: `Open ${label}`, prefix: h => h('span', { class: 'budget-line__indent' }), leading };
          },
          onActivate: model => {
            if (model.line) showLine(model.line);
            else {
              if (filter.value !== 'All lines' || bench.currentQuery()) {
                if (model.expanded) filteredCollapsed.add(model.label); else filteredCollapsed.delete(model.label);
              } else if (expanded.has(model.label)) expanded.delete(model.label); else expanded.add(model.label);
              refresh();
            }
          },
        },
      },
      { prop: 'basis', name: 'Basis', size: 168, cellTemplate: visualCellRenderer, visualCell: { format: value => ({ kind: 'text', className: 'budget-basis', text: String(value ?? '') }) } },
      { prop: 'schedule', name: 'Schedule', size: 216, columnType: 'budgetSchedule' },
      ...(['budget', 'actual'] as const).map(key => ({
        prop: key, name: key === 'budget' ? 'Budget' : 'Actual', size: 96, columnType: 'currency', columnTemplate: header(key, key === 'budget' ? 'Budget' : 'Actual'), cellTemplate: visualCellRenderer,
        visualCell: { format: (value: unknown) => ({ kind: 'text' as const, className: 'metric-number', text: typeof value === 'number' ? money(value) : '–' }) },
      })),
      {
        prop: 'spent', name: 'Spent', size: 88, columnType: 'number', columnTemplate: header('spent', 'Spent'), cellTemplate: visualCellRenderer,
        visualCell: { format: (value, model) => {
          const schedule = model.line ?? model.schedule;
          const health = schedule ? budgetHealth({ ...schedule, budget: model.budget, actual: model.actual, forecast: model.forecast }) : 'ok';
          const tone = value === null ? 'neutral' : health === 'over' ? 'negative' : health === 'ahead' ? 'warning' : 'positive';
          return { kind: 'badge', tone, className: `pill ${value === null ? '' : tone === 'negative' ? 'bad' : tone === 'warning' ? 'warn' : 'good'}`, text: value === null ? 'n/a' : `${Math.round(Number(value))}%` };
        } },
      },
      {
        prop: 'forecast', name: 'Forecast', size: 104, columnType: 'currency', columnTemplate: header('forecast', 'Forecast'), cellTemplate: visualCellRenderer,
        visualCell: {
          format: (value, model) => {
            const line = model.line as Line | undefined, text = money(Number(value));
            if (!line) return { kind: 'text', className: 'metric-number', text };
            if (line.actual > 0 && line.remaining === 0) return { kind: 'value-action', className: 'budget-forecast-done', text, suffix: { text: '✓', label: 'Complete' } };
            return { kind: 'value-action', className: 'budget-forecast-cell', parts: { action: 'cell-action' }, text, actionLabel: `Update forecast for ${line.label}, now ${text}` };
          },
          onActivate: model => editForecast(model.line),
        },
      },
      {
        prop: 'delta', name: 'Over/Under', size: 128, columnType: 'currency', sortable: true, columnTemplate: header('delta', 'Over/Under'), cellTemplate: visualCellRenderer,
        visualCell: { format: (value, model) => {
          const line = model.line as Line | undefined, delta = Number(value);
          const quantityDelta = line && line.unit !== 'Fixed fee' && line.rate > 0 ? Math.round(((model.forecast - line.baseFee) / line.rate - line.units) * 10) / 10 : 0;
          return { kind: 'value-delta', className: `sales-tile ${delta < 0 ? 'bad' : delta > 0 ? 'good' : ''}`, tone: delta < 0 ? 'negative' : delta > 0 ? 'positive' : 'neutral', parts: { detail: 'budget-driver' }, ...(quantityDelta ? { detail: `${quantityDelta > 0 ? '+' : '−'}${Math.abs(quantityDelta)} ${line?.unit === 'Hours' ? 'h' : 'mo'}` } : {}), text: `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${money(Math.abs(delta))}` };
        } },
      },
      { prop: 'actions', columnChooser: false, name: '', size: ROW_ACTION_COLUMN_WIDTH, cellTemplate: cellActionRenderer, cellAction: { label: row => `Actions for ${row.label}`, visible: row => !!row.line, onActivate: row => edit(row.line) } },
    ]);
    refresh();

    function groupingKeys() {
      return [
        ...new Set(
          rows.map((row) =>
            groupBy.value === 'Vendor' ? row.vendor : row.stream,
          ),
        ),
      ];
    }

    function refresh() {
      const matching = rows.filter(row =>
        matches(bench.currentQuery(), row.label, row.stream, row.vendor),
      );
      const groupKey = (row: Line) => groupBy.value === 'Vendor' ? row.vendor : row.stream;
      const groupDeltas = new Map<string, number>();
      for (const row of matching) {
        const key = groupKey(row);
        groupDeltas.set(key, (groupDeltas.get(key) ?? 0) + budgetLineTotals(row).delta);
      }
      const overBudgetGroups = new Set([...groupDeltas].filter(([, delta]) => delta < 0).map(([key]) => key));
      const counts: Record<string, number> = {
        'All lines': matching.length,
        'Over budget': matching.filter(row => budgetLineTotals(row).delta < 0).length,
        'Over-budget groups': overBudgetGroups.size,
        'Within budget': matching.filter(row => budgetLineTotals(row).delta >= 0).length,
        'Late': matching.filter(row => projectedFinish(row) > row.plannedEnd).length,
      };
      statuses.forEach(({ control, value, label }) => {
        control.setAttribute('aria-pressed', String(filter.value === value));
        control.textContent = `${label} ${counts[value]}`;
        control.setAttribute('aria-label', `${label}, ${counts[value]} ${value === 'Over-budget groups' ? 'groups' : 'lines'}`);
      });

      const visible = matching.filter((row) => {
        const { delta } = budgetLineTotals(row);
        return (
          filter.value === 'All lines' ||
          (filter.value === 'Over budget' && delta < 0) ||
          (filter.value === 'Over-budget groups' && overBudgetGroups.has(groupKey(row))) ||
          (filter.value === 'Within budget' && delta >= 0) ||
          (filter.value === 'Late' &&
            projectedFinish(row) > row.plannedEnd) ||
          (filter.value === 'Decision open' && row.decision === 'Open')
        );
      });
      visibleLines = visible;
      renderBulk();
      const aggregate = (items: Line[]) => {
        const computed = items.map(budgetLineTotals);
        const budget = total(computed, (row) => row.budget);
        const actual = total(computed, (row) => row.actual);
        const forecast = total(computed, (row) => row.forecast);
        return {
          budget,
          actual,
          forecast,
          delta: budget - forecast,
          spent: budget && actual > 0 ? (actual / budget) * 100 : null,
        };
      };
      const summary = aggregate(visible);
      const view = visible.map((line) => ({
        ...line,
        ...budgetLineTotals(line),
        line,
        mark:
          line.unit === 'Fixed fee'
            ? feeIcon
            : line.unit === 'Licenses'
              ? licenseIcon
              : hoursIcon,
        basis:
          line.unit === 'Fixed fee'
            ? `${money(line.rate)} fixed`
            : `${line.units} ${line.unit === 'Hours' ? 'h' : line.plan.unit === 'seats' ? 'seats' : 'mo'} × ${money(line.rate)}${line.baseFee ? ` + ${money(line.baseFee)}` : ''}`,
      }));
      const groups = groupingKeys().map((label) => {
        const lines = view.filter((row) => (groupBy.value === 'Vendor' ? row.vendor : row.stream) === label);
        return { label, lines, figures: aggregate(lines) };
      }).filter(({ lines }) => lines.length);
      if (sorting) {
        const { key, direction } = sorting;
        groups.sort((a, b) => compareBudget(a.figures as BudgetFigures, b.figures as BudgetFigures, key, direction));
        groups.forEach(({ lines }) => lines.sort((a, b) => compareBudget(a, b, key, direction)));
      }
      const grouped = groups.flatMap(({ label, lines, figures }) => {
        const open = filter.value !== 'All lines' || !!bench.currentQuery()
          ? !filteredCollapsed.has(label)
          : expanded.has(label);
        return [{
          label, group: true, expanded: open, count: lines.length, ...figures,
          mark: label === 'Build' ? codeIcon : label === 'Design' ? designIcon : label === 'Integration' ? puzzleIcon : compassIcon,
          schedule: {
            start: Math.min(...lines.map((line) => line.start)),
            plannedEnd: Math.max(...lines.map((line) => line.plannedEnd)),
            finish: Math.max(...lines.map((line) => projectedFinish(line))),
          },
        }, ...(open ? lines : [])];
      });
      const risk = total(visible, (row) =>
        Math.max(0, -budgetLineTotals(row).delta),
      );
      const overCount = visible.filter(
        (row) => budgetLineTotals(row).delta < 0,
      ).length;
      const contingency = contingencyScale(summary.budget, summary.forecast, reserve);
      const cards = [
        {
          name: 'At Risk',
          value: money(risk),
          detailLead: `${overCount} of ${visible.length}`, detailRest: ' lines over',
          progress: contingency.progress,
          captionLead: money(contingency.overrun),
          captionRest: ` net overrun · ${money(Math.abs(contingency.remaining))} ${contingency.remaining < 0 ? 'beyond contingency' : 'remaining'}`,
        },
        {
          name: 'Total Budget',
          value: money(summary.budget),
          detailLead: money(reserve), detailRest: ' contingency',
          progress: summary.spent ?? 0,
          captionLead: `${Math.round(summary.spent ?? 0)}%`, captionRest: ' of budget spent',
        },
        {
          name: 'Actual Spend',
          value: money(summary.actual),
          detailLead: money(Math.max(0, summary.forecast - summary.actual)), detailRest: ' still projected',
          progress: summary.forecast
            ? (summary.actual / summary.forecast) * 100
            : 0,
          captionLead: `${summary.forecast ? Math.round((summary.actual / summary.forecast) * 100) : 0}%`, captionRest: ' of the forecast billed',
        },
        {
          name: 'Forecast',
          value: money(summary.forecast),
          detailLead: `${summary.budget && summary.forecast > summary.budget ? '+' : ''}${summary.budget ? pct((summary.forecast / summary.budget - 1) * 100) : '–'}`, detailRest: ' vs. budget',
          progress: summary.budget ? (summary.forecast / summary.budget) * 100 : 0,
          captionLead: summary.budget ? pct((summary.forecast / summary.budget) * 100) : '–', captionRest: ' of approved budget',
        },
      ];
      bench.summary.hidden = false;
      releaseCards();
      const accents = [demoColors.pink, demoColors.purple, demoColors.teal, demoColors.blue];
      const icons = [riskIcon, walletIcon, spendIcon, forecastIcon];
      metricCards = cards.map((card, index) => createMetricTileElement(document, {
        label: card.name,
        value: card.value,
        ...(compactMetrics ? { compact: { badge: `${Math.round(card.progress)}%` } } : {}),
        visual: {
          accent: accents[index], iconSvg: icons[index],
          detailLead: card.detailLead, detailRest: card.detailRest,
          ...(card.name === 'Forecast' ? { detailTone: summary.forecast > summary.budget ? 'negative' as const : 'positive' as const } : {}),
          progress: { value: card.progress, label: card.name === 'At Risk' ? `${card.captionLead}${card.captionRest}; ${money(reserve)} contingency` : `${card.captionLead}${card.captionRest}`, captionLead: card.captionLead, captionRest: card.captionRest },
        },
      }));
      bench.summary.replaceChildren(...metricCards);
      const compact = window.matchMedia('(max-width: 650px)').matches;
      const activeColumns = compact
        ? [{ ...columns[0], size: 160 }, ...columns.slice(1)]
        : columns;
      bench.render(
        activeColumns,
        grouped,
        grouped.length ? [{ label: 'Total', total: true, ...summary }] : [],
      );
    }

    type LineTab = 'Overview' | 'Decision' | 'Activity';
    const dateFromOffset = (days: number) => new Date(Date.UTC(2026, 7, 1 + days));
    const shortDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    const dateLabel = (iso: string) => shortDate(new Date(`${iso}T00:00:00Z`));
    const signed = (value: number) => `${value < 0 ? '−' : value > 0 ? '+' : ''}${money(Math.abs(value))}`;
    function showLine(row: Line, active: LineTab = 'Overview') {
      const body = make('div', '', 'scale-profile budget-profile');
      const head = make('div', '', 'budget-profile__heading'); const label = make('div', '', 'budget-profile__title');
      const totals = budgetLineTotals(row); const status = row.lineStatus === 'done' ? 'Done' : row.lineStatus === 'inProgress' ? 'In Progress' : 'Not Started';
      const lineIcon = make('span', '', 'budget-profile__icon'); lineIcon.setAttribute('aria-hidden', 'true'); lineIcon.innerHTML = row.unit === 'Hours' ? hoursIcon : row.unit === 'Licenses' ? licenseIcon : feeIcon;
      label.append(lineIcon, make('strong', row.label), make('span', status, 'budget-profile__status'));
      head.append(label, make('small', `${row.stream}, ${row.vendor}`));
      const tabs = make('div', '', 'budget-profile__switch');
      const panel = make('div', '', 'scale-profile__content'); panel.setAttribute('role', 'tabpanel'); panel.id = `budget-panel-${row.id}`;
      const names: LineTab[] = ['Overview', 'Decision', 'Activity'];
      const tabId = (name: LineTab) => `budget-${row.id}-${name}`;
      const tabOptions = names.map(name => ({ value: name, label: name, id: tabId(name), ariaControls: panel.id }));
      const tabControl = createRoot(tabs);
      const renderSwitch = (value: LineTab) => tabControl.render(createElement(SegmentedSwitch, {
        value,
        options: tabOptions,
        role: 'tablist',
        ariaLabel: 'Budget details',
        onChange: (next: string | number) => {
          const tab = names.find(name => name === next);
          if (tab) renderTab(tab);
        },
      }));
      body.append(head, tabs, panel);
      const availability = availableDecisions(row);
      let choice: BudgetDecision | null = availability.Adjust ? 'Adjust' : availability.Cover ? 'Cover' : null;
      const quantities = {
        hours: input('Hours Left', String(row.leftParts.hours), 'number'),
        qty: input(row.plan.unit === 'seats' ? 'Seats Left' : 'Months Left', String(row.leftParts.qty), 'number'),
        fixed: input('Fee Left', String(row.leftParts.fixed), 'number'),
      };
      for (const control of Object.values(quantities)) { control.min = '0'; control.step = 'any'; }
      const draftParts = (): BudgetParts => ({ hours: quantities.hours.value === '' ? NaN : Number(quantities.hours.value), qty: quantities.qty.value === '' ? NaN : Number(quantities.qty.value), fixed: quantities.fixed.value === '' ? NaN : Number(quantities.fixed.value) });
      const note = createControl(document, 'textarea'); note.setAttribute('aria-label', `Note to ${row.vendor}`); note.placeholder = 'What changed, if anything'; note.maxLength = 240;
      const error = make('p', '', 'scale-profile__error'); error.setAttribute('role', 'alert'); error.hidden = true;
      const section = (title: string, subtitle: string) => { const { card, body } = createDetailPanel(title, subtitle, { card: 'scale-profile__section', heading: 'scale-profile__section-heading', body: 'scale-profile__section-content' }); panel.append(card); return body; };
      let form: WorkbenchFormHandle | undefined;
      const changeAuthor = (id: string) => ({ noah: 'Noah Brennan', amara: 'Maya Bennett', sana: 'Sana Qureshi', mei: 'Mei Chen', rosa: 'Rosa Delgado', ines: 'Nia Bennett' } as Record<string, string>)[id] ?? id;
      const setFooter = () => form?.setSubmit({
        label: active === 'Overview' ? 'Decide' : active === 'Decision' ? 'Save Decision' : 'Edit Line',
        icon: active === 'Overview' ? 'trend' : active === 'Decision' ? 'check' : 'edit',
        disabled: active === 'Decision' && !choice,
      });
      const upcoming = row.activity.filter(entry => entry.id.includes('-u'));
      const billed = row.activity.filter(entry => !entry.id.includes('-u'));
      const finish = projectedFinish(row), daysLate = Math.max(0, finish - row.plannedEnd);
      function renderChart(container: HTMLElement, threeMonths = false) {
        const model = budgetBurn(row, threeMonths), data = model.visible;
        const wrapper = make('div', '', 'budget-profile__chart');
        const legend = createLegendElement(document, {
          label: 'Budget chart key', className: 'budget-profile__chart-legend',
          items: [
            { id: 'planned', label: 'Planned', color: demoColors.purple },
            ...(data.some(point => point.actual !== null) ? [{ id: 'actual', label: 'Actual', color: demoColors.teal }] : []),
            ...(data.some(point => point.forecast !== null) ? [{ id: 'forecast', label: 'Forecast', color: demoColors.pink, marker: 'dashed' as const }] : []),
            { id: 'limit', label: 'Budget limit', color: 'var(--rv-ui-text-muted)', marker: 'dashed' as const },
          ],
        });
        if (model.points.length > 13) {
          const range = make('div', '', 'budget-profile__chart-range'); range.setAttribute('role', 'group'); range.setAttribute('aria-label', 'Chart range');
          const all = button('All', () => { container.replaceChildren(); renderChart(container, false); }); const three = button('3M', () => { container.replaceChildren(); renderChart(container, true); });
          all.setAttribute('aria-pressed', String(!threeMonths)); three.setAttribute('aria-pressed', String(threeMonths)); range.append(all, three); legend.append(range);
        }
        wrapper.append(legend);
        const maximum = Math.max(1, model.budget, ...data.flatMap(point => [point.planned, point.actual ?? 0, point.forecast ?? 0]));
        const increments = [100, 200, 250, 1000, 2000, 3000, 4000, 5000, 10000, 15000, 20000];
        const tick = increments.find(value => value * 4 >= maximum) ?? Math.ceil(maximum / 80000) * 20000;
        const label = `${row.label}: planned, actual and forecast against a ${money(model.budget)} budget`;
        const chartData = data.map(point => ({ ...point, dateLabel: shortDate(dateFromOffset(point.day - 4)) }));
        const chart = createChartHost(document, {
          mount: (container, signal) => {
            const styles = getComputedStyle(container);
            const surface = styles.getPropertyValue('--rv-ui-surface').trim();
            const border = styles.getPropertyValue('--rv-ui-border').trim();
            const muted = styles.getPropertyValue('--rv-ui-text-muted').trim();
            const references: NonNullable<Parameters<typeof createAreaLineChart>[0]['annotations']>['references'] = [
              { id: 'budget', kind: 'line', axis: 'primary', value: model.budget, color: muted, lineDash: 'dash' },
              ...(data.some(point => point.day === model.current) ? [{ id: 'today', kind: 'line' as const, axis: 'category' as const, at: { scale: 'category' as const, path: [{ field: 'day', value: model.current }] }, color: demoColors.purpleLight, lineDash: 'dash' as const }] : []),
            ];
            return createAreaLineChart({
              container, signal,
              data: chartData,
              mapping: { category: { field: 'day', label: 'dateLabel' }, series: [
                { field: 'planned', label: 'Planned' }, { field: 'actual', label: 'Actual' }, { field: 'forecast', label: 'Forecast' },
              ] },
              presentation: { legendPosition: 'none' },
              axes: { x: { lineColor: surface }, y: { min: 0, max: tick * 4, tickValues: [0, tick, tick * 2, tick * 3, tick * 4], lineColor: surface } },
              annotations: { references },
              seriesOverrides: {
                planned: { type: 'area', color: demoColors.purple, fillOpacity: 0.12, lineWidth: 1.5, markerSize: 2 },
                actual: { type: 'area', color: demoColors.teal, fillOpacity: 0.12, lineWidth: 1.5, markerSize: 2 },
                forecast: { type: 'line', color: demoColors.pink, lineWidth: 1.5, lineDash: 'dash', markers: false },
              },
              rendererOptions: {
                minimumSize: { width: 1, height: 1 },
                theme: { grid: border, foreground: muted, muted },
                labels: { formatter: ({ kind, axis, value, defaultText }) => kind === 'axisTick' && axis === 'y' && typeof value === 'number' ? (value >= 1000 ? `$${Math.round(value / 1000)}k` : money(value)) : defaultText },
              },
            });
          },
          onError: (_error, container) => { container.textContent = 'Chart unavailable'; },
        });
        chart.className = 'budget-profile__shared-chart';
        chart.setAttribute('role', 'group');
        chart.setAttribute('aria-label', label);
        wrapper.append(chart); container.append(wrapper);
      }
      function renderDecisionChart() {
        const peers = rows.filter(item => item.stream === row.stream);
        const spend = weeklyBudget(peers, row.id, 'spend'), hours = weeklyBudget(peers, row.id, 'hours');
        const card = make('section', '', 'budget-profile__weekly'); card.setAttribute('aria-label', `${row.stream} weekly spend`);
        const header = make('div', '', 'budget-profile__weekly-head'); header.setAttribute('role', 'group'); header.setAttribute('aria-label', 'Chart measure');
        const chart = make('div', '', 'budget-profile__weekly-chart');
        let measure: 'spend' | 'hours' = 'spend';
        const hasHours = hours.points.some(point => point.billed + point.ahead > 0);
        const choices = (hasHours ? ['spend', 'hours'] : ['spend']) as ('spend' | 'hours')[];
        const controls = choices.map(key => {
          const data = key === 'spend' ? spend : hours;
          const control = button('', () => render(key));
          control.append(make('small', `${row.stream} ${key === 'spend' ? 'Spend' : 'Hours'}`));
          const value = make('strong', data.pace === null ? 'Not Started' : key === 'spend' ? money(data.pace) : `${Math.round(data.pace)} h`);
          if (data.pace !== null) value.append(make('small', ' per week'));
          control.append(value); header.append(control); return control;
        });
        const render = (key: 'spend' | 'hours') => {
          measure = key; controls.forEach((control, index) => control.setAttribute('aria-pressed', String(choices[index] === key)));
          chart.replaceChildren(); const data = (key === 'spend' ? spend : hours).visible;
          if (!data.length) { chart.append(make('p', 'No spending yet.', 'budget-profile__muted')); return; }
          const candidates = key === 'spend' ? [50, 100, 200, 250, 1000, 2000, 3000, 4000, 5000, 10000, 20000] : [1, 2, 5, 10, 15, 20, 25, 50, 100, 200];
          const maximum = Math.max(1, ...data.map(point => point.billed + point.ahead));
          const tick = candidates.find(value => value * 4 >= maximum) ?? Math.ceil(maximum / 4 / candidates[candidates.length - 1]) * candidates[candidates.length - 1];
          const points = data.map(point => ({ ...point, dateLabel: shortDate(dateFromOffset(point.day - 4)) }));
          const weekly = createChartHost(document, {
            mount: (container, signal) => {
              const styles = getComputedStyle(container);
              const surface = styles.getPropertyValue('--rv-ui-surface').trim();
              const border = styles.getPropertyValue('--rv-ui-border').trim();
              const muted = styles.getPropertyValue('--rv-ui-text-muted').trim();
              const text = styles.getPropertyValue('--rv-ui-text').trim();
              return createColumnLineChart({
                container, signal, data: points,
                mapping: { category: { field: 'day', label: 'dateLabel' }, series: [
                  { field: 'billed', label: 'Actual' }, { field: 'ahead', label: 'Forecast' }, { field: 'line', label: row.label },
                ] },
                presentation: { legendPosition: 'none' },
                axes: { x: { lineColor: surface }, y: { min: 0, max: tick * 4, tickValues: [0, tick, tick * 2, tick * 3, tick * 4], lineColor: surface } },
                annotations: { references: data.some(point => point.day === 90) ? [{ id: 'today', kind: 'line', axis: 'category', at: { scale: 'category', path: [{ field: 'day', value: 90 }] }, color: muted }] : [] },
                seriesOverrides: {
                  billed: { type: 'column', stackGroup: 'spend', color: demoColors.purple },
                  ahead: { type: 'column', stackGroup: 'spend', color: demoColors.purpleLight },
                  line: { type: 'line', color: text, lineDash: 'dash', lineWidth: 1.4, markers: false },
                },
                rendererOptions: {
                  minimumSize: { width: 1, height: 1 },
                  theme: { grid: border, foreground: muted, muted },
                  labels: { formatter: ({ kind, axis, value, defaultText }) => kind === 'axisTick' && axis === 'y' && typeof value === 'number' ? (key === 'spend' ? value >= 1000 ? `$${Math.round(value / 1000)}k` : money(value) : String(value)) : defaultText },
                  datumStyle: ({ series }) => series.id === 'billed' || series.id === 'ahead' ? { fill: { type: 'linearGradient', direction: 'vertical', stops: [{ offset: 0, color: demoColors.purple, opacity: series.id === 'billed' ? 0.24 : 0.1 }, { offset: 1, color: demoColors.purple, opacity: 0.02 }] } } : undefined,
                },
              });
            },
            onError: (_error, container) => { container.textContent = 'Chart unavailable'; },
          });
          weekly.className = 'budget-profile__weekly-host';
          weekly.setAttribute('role', 'group');
          weekly.setAttribute('aria-label', `${row.stream} ${key} by week, actual and forecast, ${row.label} dashed`);
          chart.append(weekly);
          const legend = createLegendElement(document, { label: 'Weekly chart key', className: 'budget-profile__weekly-legend', items: [
            { id: 'actual', label: 'Actual', color: demoColors.purple },
            { id: 'forecast', label: 'Forecast', color: demoColors.purpleLight },
            { id: 'line', label: 'This line', color: 'var(--rv-ui-text)', marker: 'dashed' },
            { id: 'today', label: 'Today', color: 'var(--rv-ui-text-muted)', marker: 'line' },
          ] });
          chart.append(legend);
        };
        card.append(header, chart); render(measure); return card;
      }
      function renderTab(tab: LineTab) {
        active = tab;
        renderSwitch(tab);
        panel.replaceChildren();
        panel.setAttribute('aria-labelledby', tabId(tab));
        setFooter();
        if (tab === 'Overview') {
          const spend = make('section', '', 'budget-profile__spend'); spend.setAttribute('aria-label', 'Spend');
          const top = make('div', '', 'budget-profile__spend-top'); top.append(make('span', 'Spend'), make('small', daysLate ? `Finish ${shortDate(dateFromOffset(finish))}, ${daysLate} days late` : `Finish ${shortDate(dateFromOffset(finish))}`, daysLate ? 'late' : ''));
          const main = make('div', '', 'budget-profile__spend-value'); main.append(make('strong', money(totals.actual)), make('span', `${totals.budget ? `${totals.forecast > totals.budget ? '+' : ''}${Math.round((totals.forecast / totals.budget - 1) * 100)}%` : '–'} vs. budget`, totals.delta < 0 ? 'over' : ''));
          const max = Math.max(1, totals.budget, totals.forecast);
          const bar = createSegmentedBarElement(document, { label: `Spend ${money(totals.actual)}, forecast ${money(totals.forecast)}, budget ${money(totals.budget)}`, total: max, parts: [
            { value: Math.max(0, Math.min(max, totals.actual)), color: demoColors.purple },
            { value: Math.max(0, Math.min(totals.forecast, totals.budget) - totals.actual), color: demoColors.purpleLight },
            { value: Math.max(0, totals.forecast - totals.budget), color: demoColors.pink },
          ] }); bar.classList.add('budget-profile__spend-bar');
          const summary = make('p', '', 'budget-profile__spend-summary'); summary.append(document.createTextNode(`${Math.round(totals.spent ?? 0)}% of ${money(totals.budget)} spent, forecast `), make('span', money(totals.forecast), totals.delta < 0 ? 'over' : ''));
          const keys = createLegendElement(document, { label: 'Spend breakdown', className: 'budget-profile__spend-legend', items: [
            { id: 'actual', label: 'Actual', color: demoColors.purple, visible: totals.actual > 0 },
            { id: 'forecast', label: 'Forecast', color: demoColors.purpleLight, visible: totals.forecast > totals.actual },
            { id: 'over', label: 'Over', color: demoColors.pink, visible: totals.delta < 0 },
            { id: 'budget', label: 'Budget', color: 'var(--rv-ui-surface-hover)', visible: totals.forecast !== totals.budget },
          ].filter(item => item.visible) });
          spend.append(top, main, summary, bar, keys); panel.append(spend);
          const chart = section('Budget vs Forecast', 'Planned, actual and forecast to date'); const graph = make('div'); renderChart(graph); chart.append(graph);
          if (totals.delta < 0) { const warning = make('div', '', 'budget-profile__warning'); const icon = make('span', '⚠', 'budget-profile__warning-icon'); icon.setAttribute('aria-hidden', 'true'); const copy = make('span'); copy.append(make('strong', `Forecast is ${money(-totals.delta)} over budget.`), document.createTextNode(' Cover it from contingency or adjust what is left.')); warning.append(icon, copy, button('Decide ›', () => renderTab('Decision'))); chart.append(warning); }
          const peers = rows.filter(item => item !== row && item.vendor === row.vendor); const same = section('Same Vendor', `${peers.length} other lines, forecast and balance`);
          if (!peers.length) same.append(make('p', 'No other lines for this vendor.', 'budget-profile__muted'));
          for (const peer of peers) { const values = budgetLineTotals(peer); const item = button(peer.label, () => showLine(peer)); item.className = 'budget-profile__peer'; item.append(make('small', peer.stream), make('strong', money(values.forecast)), make('small', signed(values.delta))); same.append(item); }
        } else if (tab === 'Decision') {
          const latest = row.changes.find(change => change.kind !== 'added');
          if (latest) { const notice = make('div', '', 'budget-profile__change'); const head = make('div', '', 'budget-profile__change-head');
            if (latest.by === 'noah' || latest.by === 'amara') { const avatar = make('img', '', 'budget-profile__change-avatar'); avatar.src = demoPortrait(latest.by === 'noah' ? 1 : 0); avatar.alt = ''; head.append(avatar); }
            const author = make('span', '', 'budget-profile__change-author'); author.append(make('strong', changeAuthor(latest.by)), make('small', `${dateLabel(latest.day)}${latest.detail ? ` • ${latest.detail}` : ''}`));
            head.append(author, make('span', latest.kind === 'forecast' ? '↗ Forecast' : latest.kind.charAt(0).toUpperCase() + latest.kind.slice(1), 'budget-profile__change-kind')); notice.append(head, make('p', latest.note)); panel.append(notice);
          }
          panel.append(renderDecisionChart());
          const form = make('section', '', 'budget-profile__decision'); form.append(make('strong', 'Decision')); const options = make('div', '', 'budget-profile__choices'); options.setAttribute('role', 'group'); options.setAttribute('aria-label', 'Decision');
          const preview = make('div', '', 'budget-profile__preview');
          const details = make('div');
          const updateSummary = () => {
            details.replaceChildren();
            if (!choice) { details.append(make('p', 'No decision needed.', 'budget-profile__muted')); return; }
            const result = previewDecision(row, choice, reserve, draftParts());
            if ('error' in result) { details.append(make('p', result.error, 'budget-profile__muted')); return; }
            const comparison = (label: string, before: string, after: string) => { const line = make('div', '', 'budget-decision-total'); const values = make('span', '', 'budget-decision-values'); values.append(make('del', before), make('strong', after)); line.append(make('span', label), values); details.append(line); };
            if (choice === 'Cover') {
              details.append(make('p', availability.difference > 0 ? `Moves ${money(availability.difference)} from contingency into the plan.` : `Releases ${money(-availability.difference)} from the plan to contingency.`));
              for (const key of ['hours', 'qty', 'fixed'] as const) if (row.plan[key] !== result.plan[key]) comparison(key === 'hours' ? 'Hours' : key === 'qty' ? (row.plan.unit === 'seats' ? 'Seats' : 'Months') : 'Fee', key === 'fixed' ? money(row.plan[key]) : String(row.plan[key]), key === 'fixed' ? money(result.plan[key]) : String(result.plan[key]));
              comparison('Line budget', money(totals.budget), money(result.totals.budget)); comparison('Contingency', money(reserve), money(result.reserve));
            }
            if (choice === 'Hold') {
              details.append(make('p', 'Holds the vendor to the plan: what is left shrinks to fit.'));
              for (const key of ['hours', 'qty', 'fixed'] as const) if (row.leftParts[key] !== result.left[key]) comparison(key === 'hours' ? 'Hours Left' : key === 'qty' ? (row.plan.unit === 'seats' ? 'Seats Left' : 'Months Left') : 'Fee Left', key === 'fixed' ? money(row.leftParts[key]) : String(row.leftParts[key]), key === 'fixed' ? money(result.left[key]) : String(result.left[key]));
              comparison('Forecast', money(totals.forecast), money(result.totals.forecast));
            }
            if (choice === 'Adjust') { for (const [label, value] of [['Forecast', money(result.totals.forecast)], ['Over/Under', signed(result.totals.delta)]]) { const line = make('div', '', 'budget-decision-total'); line.append(make('span', label), make('strong', value)); details.append(line); } }
          };
          const update = () => {
            preview.replaceChildren();
            note.placeholder = choice === 'Hold' ? 'What has to fit inside the plan' : choice === 'Cover' ? 'Why the plan needs to change' : 'What changed, if anything';
            if (choice === 'Adjust') {
              preview.append(make('p', 'Changes what is left. The plan stays.'));
              const fields = make('div', '', 'budget-decision-fields');
              for (const key of ['hours', 'qty', 'fixed'] as const) {
                if (!row.plan[key] && !row.billedParts[key] && !row.leftParts[key]) continue;
                const control = quantities[key]; const label = control.getAttribute('aria-label')!;
                const stepper = createNumberStepperElement({ input: control, decreaseLabel: `Decrease ${label}`, increaseLabel: `Increase ${label}`, className: 'budget-decision-stepper' });
                const group = field(label, stepper.element); const helper = key === 'hours' ? `At ${money(row.plan.rate)}/h, ${row.billedParts.hours} h billed` : key === 'qty' ? `At ${money(row.plan.price)}/${row.plan.unit === 'seats' ? 'seat' : 'month'}, ${row.billedParts.qty} billed` : `${money(row.billedParts.fixed)} billed`; group.append(make('small', helper, 'budget-decision-helper')); fields.append(group);
              }
              preview.append(fields);
            }
            preview.append(details); updateSummary();
          };
          for (const option of ['Cover', 'Adjust', 'Hold'] as const) {
            const control = button(option === 'Cover' && availability.difference < 0 ? 'Release' : option, () => { choice = option; error.hidden = true; [...options.children].forEach(child => child.setAttribute('aria-pressed', String(child === control))); update(); setFooter(); });
            const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); icon.setAttribute('viewBox', '0 0 24 24'); icon.setAttribute('aria-hidden', 'true'); icon.setAttribute('fill', 'none'); icon.setAttribute('stroke', 'currentColor'); icon.setAttribute('stroke-width', '1.7'); icon.setAttribute('stroke-linecap', 'round'); icon.setAttribute('stroke-linejoin', 'round');
            const paths = option === 'Cover' ? ['M20 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-3', 'M3 7h15', 'M22 9h-6a3 3 0 0 0 0 6h6z', 'M16 12h.01'] : option === 'Adjust' ? ['M3 17l6-6 4 4 7-8', 'M15 7h5v5'] : ['M6 4h4v16H6z', 'M14 4h4v16h-4z'];
            for (const d of paths) { const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', d); icon.append(path); } control.prepend(icon);
            control.disabled = !availability[option]; control.setAttribute('aria-pressed', String(choice === option)); options.append(control);
          }
          Object.values(quantities).forEach(control => { control.oninput = updateSummary; });
          update(); form.append(options, preview, field(`Note to ${row.vendor}`, note), error); panel.append(form);
        } else {
          const summary = make('div', '', 'budget-profile__activity-summary'); const awaiting = billed.filter(entry => entry.day >= '2026-10-22');
          for (const [label, value, detail] of [['Billed', money(totals.actual), `${billed.length} entries`], ['Awaiting', money(total(awaiting, entry => entry.amount)), `${awaiting.length} entries`], ['To Bill', money(row.remaining), upcoming[0] ? `Next ${dateLabel(upcoming[0].day)}` : 'None']]) { const card = make('div'); card.append(make('small', label), make('strong', value), make('small', detail)); summary.append(card); } panel.append(summary);
          const entries = section('Spend to Date', 'Newest first, with where each one stands');
          if (!billed.length) entries.append(make('p', 'No spend yet.', 'budget-profile__muted'));
          for (const entry of billed) { const item = make('div', '', 'budget-profile__activity-row'); item.append(make('span', entry.title), make('small', entry.detail), make('span', dateLabel(entry.day)), make('strong', money(entry.amount)), make('small', entry.day >= '2026-10-22' ? 'Submitted' : 'Approved')); entries.append(item); }
          const coming = section('Coming Up', `${money(row.remaining)} to bill`); if (!upcoming.length || !row.remaining) coming.append(make('p', 'No upcoming charges.', 'budget-profile__muted')); else { const entry = upcoming[0]; const item = make('div', '', 'budget-profile__activity-row'); item.append(make('span', entry.title), make('small', entry.detail), make('span', dateLabel(entry.day)), make('strong', money(row.remaining))); coming.append(item); }
          const changes = section('Change Log', 'Every change to the line, newest first'); if (!row.changes.length) changes.append(make('p', 'No changes yet.', 'budget-profile__muted')); for (const change of row.changes) { const item = make('div', '', 'budget-profile__change'); item.append(make('strong', change.note), make('small', `${dateLabel(change.day)} • ${changeAuthor(change.by)}${change.detail ? ` • ${change.detail}` : ''}`)); changes.append(item); }
        }
      }

      renderTab(active);
      form = bench.form(row.label, [body], () => {
        if (active === 'Overview') { renderTab('Decision'); return false; }
        if (active === 'Activity') { edit(row, true); return false; }
        if (!choice) return false;
        const draft = draftParts();
        const result = previewDecision(row, choice, reserve, draft);
        if ('error' in result) { error.hidden = false; error.textContent = result.error ?? 'Unable to save the decision.'; return false; }
        if (choice === 'Adjust' && (Object.keys(draft) as (keyof BudgetParts)[]).every(key => draft[key] === row.leftParts[key])) { error.hidden = false; error.textContent = 'Change what is left first.'; return false; }
        if (choice !== 'Adjust' && !note.value.trim()) { error.hidden = false; error.textContent = 'Say why, it goes in the change log.'; note.focus(); return false; }
        const previous = structuredClone(row), previousReserve = reserve; const oldForecast = totals.forecast;
        row.plan = result.plan; row.leftParts = result.left; Object.assign(row, primaryBasis(result.plan));
        row.actual = result.totals.actual; row.remaining = result.totals.remaining;
        row.decision = choice === 'Cover' && result.difference < 0 ? 'Release' : choice; reserve = result.reserve;
        const kind = choice === 'Adjust' ? 'forecast' : choice === 'Hold' ? 'held' : result.difference < 0 ? 'release' : 'cover';
        row.changes.unshift({ id: `local-${Date.now()}`, day: '2026-10-28', by: 'noah', kind, note: note.value.trim() || `${choice} decision`, detail: `${money(oldForecast)} to ${money(result.totals.forecast)}` });
        refresh(); bench.report(`${row.label} decision saved.`, () => { Object.assign(row, previous); reserve = previousReserve; refresh(); }); return true;
      }, undefined, active === 'Overview' ? 'Decide' : active === 'Decision' ? 'Save Decision' : 'Edit Line', () => tabControl.unmount(), {
        cancel: { label: 'Close' },
        close: { label: 'Close drawer', className: 'scale-drawer-close' },
      });
      setFooter();
    }

    function editForecast(row: Line) {
      const quantityBased = row.unit !== 'Fixed fee' && row.rate > 0;
      const quantity = input(!quantityBased ? 'Fee Left' : row.unit === 'Hours' ? 'Hours Left' : row.plan.unit === 'seats' ? 'Seats Left' : 'Months Left', String(row.unit === 'Hours' ? row.leftParts.hours : row.unit === 'Licenses' ? row.leftParts.qty : row.leftParts.fixed), 'number');
      quantity.min = '0'; quantity.step = 'any'; quantity.required = true;
      const reason = input('Reason', '');
      reason.placeholder = 'What changed';
      const preview = make('p', '', 'budget-forecast-preview');
      const update = () => {
        const other = row.unit === 'Hours' ? row.leftParts.qty * row.plan.price + row.leftParts.fixed : row.unit === 'Licenses' ? row.leftParts.hours * row.plan.rate + row.leftParts.fixed : 0;
        const remaining = Math.max(0, Number(quantity.value)) * (quantityBased ? row.rate : 1) + other;
        const forecast = row.actual + remaining;
        const delta = budgetLineTotals(row).budget - forecast;
        preview.textContent = `Forecast ${money(forecast)} · Over/Under ${delta < 0 ? '−' : delta > 0 ? '+' : ''}${money(Math.abs(delta))}`;
      };
      quantity.addEventListener('input', update);
      update();
      bench.form('Update Forecast', [make('p', row.label), field(quantity.getAttribute('aria-label')!, quantity), field('Reason', reason), preview], () => {
        const previous = row.remaining, previousParts = { ...row.leftParts }, previousChanges = [...row.changes], priorForecast = budgetLineTotals(row).forecast;
        if (row.unit === 'Hours') row.leftParts.hours = Math.max(0, Number(quantity.value)); else if (row.unit === 'Licenses') row.leftParts.qty = Math.max(0, Number(quantity.value)); else row.leftParts.fixed = Math.max(0, Number(quantity.value));
        row.remaining = partsAmount(row.leftParts, row.plan);
        row.changes.unshift({ id: `local-${Date.now()}`, day: '2026-10-28', by: 'noah', kind: 'forecast', note: reason.value.trim() || 'Forecast updated', detail: `${money(priorForecast)} to ${money(budgetLineTotals(row).forecast)}` });
        refresh();
        bench.report(`${row.label} forecast updated${reason.value.trim() ? `: ${reason.value.trim()}` : ''}`, () => { row.remaining = previous; row.leftParts = previousParts; row.changes = previousChanges; refresh(); });
      }, undefined, 'Apply');
    }

    function edit(row?: Line, fromView = false) {
      const name = input('Line name', row?.label); name.required = true; name.maxLength = 40; name.placeholder = 'What the money buys';
      const vendor = select('Vendor', vendors, row?.vendor ?? 'Harbor Works');
      const stream = select('Workstream', workstreams, row?.stream ?? 'Build');
      const statusValues = ['Not Started', 'In Progress', 'Done'];
      const status = select('Status', statusValues, row?.lineStatus === 'done' ? 'Done' : row?.lineStatus === 'inProgress' ? 'In Progress' : 'Not Started');
      const isoDate = (offset: number) => dateFromOffset(offset).toISOString().slice(0, 10);
      const start = calendarField('Starts', isoDate(row?.start ?? 88)); const end = calendarField('Ends', isoDate(row?.plannedEnd ?? 115)); start.required = true; end.required = true;
      const source = row?.plan ?? { hours: 0, rate: 0, qty: 0, unit: 'mo', price: 0, fixed: 0 };
      const hours = input('Hours', source.hours ? String(source.hours) : '', 'number');
      const rate = input('Rate', source.rate ? String(source.rate) : '', 'number');
      const licenses = input('Licenses', source.qty ? String(source.qty) : '', 'number');
      const price = input('Price', source.price ? String(source.price) : '', 'number');
      const fee = input('Fixed Fee', source.fixed ? String(source.fixed) : '', 'number');
      const licenseUnit = select('Unit', ['Months', 'Seats'], source.unit === 'seats' ? 'Seats' : 'Months');
      const numbers = [hours, rate, licenses, price, fee]; numbers.forEach(control => { control.min = '0'; control.step = '1'; });
      const body = make('div', '', 'scale-edit budget-edit'); body.append(make('p', row ? `${row.label}. Spend to date stays as billed.` : 'Budget is built from hours, licenses and a fee.', 'budget-edit__subtitle'));
      const pair = (first: HTMLElement, second: HTMLElement) => { const line = make('div', '', 'scale-edit__pair'); line.append(first, second); return line; };
      const stepper = (title: string, control: HTMLInputElement, hint?: string) => {
        const wrapper = field(title, control);
        const { element, decrease: decrement, increase: increment } = createNumberStepperElement({ input: control, decreaseLabel: `Decrease ${title}`, increaseLabel: `Increase ${title}`, className: 'budget-edit__stepper' });
        wrapper.append(element); if (hint) wrapper.append(make('small', hint)); return { wrapper, decrement, increment };
      };
      const hoursControl = stepper('Hours', hours); const rateControl = stepper('Rate', rate, row?.billedParts.hours ? 'Locked, hours are billed at it' : '');
      const licensesControl = stepper('Licenses', licenses); const priceControl = stepper('Price', price, row?.billedParts.qty ? 'Locked, licenses are billed at it' : ''); const feeControl = stepper('Fixed Fee', fee);
      const startField = field('Starts', start); if (row?.actual) startField.append(make('small', 'Spend to date fixes the start'));
      const statusField = field('Status', status), statusHint = make('small'); statusField.append(statusHint);
      const lower = make('div', '', 'budget-edit__four'); lower.append(licensesControl.wrapper, field('Unit', licenseUnit), priceControl.wrapper, feeControl.wrapper);
      const budget = make('div', '', 'budget-edit__total'); budget.append(make('span', 'Budget'), make('strong', ''));
      const error = make('p', '', 'scale-profile__error'); error.hidden = true; error.setAttribute('role', 'alert');
      body.append(pair(field('Name', name), field('Vendor', vendor)), pair(field('Workstream', stream), statusField), pair(startField, field('Ends', end)), pair(hoursControl.wrapper, rateControl.wrapper), lower, budget, error);
      const readPlan = (): BudgetPlan => ({ hours: Number(hours.value || 0), rate: Number(rate.value || 0), qty: Number(licenses.value || 0), unit: licenseUnit.value === 'Seats' ? 'seats' : 'mo', price: Number(price.value || 0), fixed: Number(fee.value || 0) });
      const update = () => {
        const hasHours = Number(hours.value) > 0 || !!row?.billedParts.hours, hasLicenses = Number(licenses.value) > 0 || !!row?.billedParts.qty;
        rate.disabled = !hasHours || !!row?.billedParts.hours; price.disabled = !hasLicenses || !!row?.billedParts.qty; licenseUnit.disabled = !!row?.billedParts.qty; start.disabled = !!row?.actual;
        for (const [control, component] of [[rate, rateControl], [price, priceControl]] as const) component.decrement.disabled = component.increment.disabled = control.disabled;
        const amount = planAmount(readPlan()); budget.querySelector('strong')!.textContent = money(amount);
        statusHint.textContent = row?.actual ? 'Spend to date means it has started' : status.value === 'Not Started' ? 'A line not started forecasts its plan' : status.value === 'Done' ? 'A completed line has no work left' : 'The line is in progress';
      };
      numbers.forEach(control => control.addEventListener('input', update)); status.addEventListener('change', update); update();
      const back = row && fromView ? button('Back', () => showLine(row, 'Activity')) : undefined;
      bench.form(row ? 'Edit Line' : 'Add Line', [body], () => {
        const fail = (message: string) => { error.hidden = false; error.textContent = message; return false; };
        const value = name.value.trim(); if (!value) return fail('Enter a line name.');
        const normalize = (text: string) => text.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        if (rows.some(item => item !== row && normalize(item.label) === normalize(value))) return fail('Another line has this name.');
        if (!start.value || !end.value || end.value < start.value) return fail('The end date must be on or after the start date.');
        const plan = readPlan(); if (planAmount(plan) <= 0 || (plan.hours > 0 && !plan.rate) || (plan.qty > 0 && !plan.price)) return fail('Add hours with a rate, licenses with a price, or a fixed fee.');
        if (row && (plan.hours < row.billedParts.hours || plan.qty < row.billedParts.qty || plan.fixed < row.billedParts.fixed)) return fail('The plan cannot be less than the amount already billed.');
        if (row?.actual && status.value === 'Not Started') return fail('A line with spend to date has started.');
        const dateOffset = (date: string) => Math.round((new Date(`${date}T00:00:00Z`).getTime() - Date.UTC(2026, 7, 1)) / 86400000);
        const basis = primaryBasis(plan), lineStatus = status.value === 'Done' ? 'done' : status.value === 'In Progress' ? 'inProgress' : 'notStarted';
        const leftParts: BudgetParts = lineStatus === 'done' ? { hours: 0, qty: 0, fixed: 0 } : row?.actual ? { ...row.leftParts } : { hours: plan.hours, qty: plan.qty, fixed: plan.fixed };
        const draft = { label: value, vendor: vendor.value, stream: stream.value, lineStatus, plan, leftParts, ...basis, actual: row?.actual ?? 0, remaining: partsAmount(leftParts, plan), start: dateOffset(start.value), plannedEnd: dateOffset(end.value), decision: row?.decision ?? 'Open' };
        if (row) {
          const previous = structuredClone(row); Object.assign(row, draft);
          row.changes.unshift({ id: `local-${Date.now()}`, day: '2026-10-28', by: 'noah', kind: 'edit', note: 'Line updated', detail: `${money(budgetLineTotals(previous).budget)} to ${money(budgetLineTotals(row).budget)}` });
          expanded.add(groupBy.value === 'Vendor' ? draft.vendor : draft.stream); refresh(); bench.report(`${value} updated.`, () => { Object.assign(row, previous); refresh(); });
          if (fromView) { showLine(row, 'Activity'); return false; }
        } else {
          const created: Line = { ...draft, id: `L-new-${nextLine++}`, activity: [], changes: [{ id: `local-${Date.now()}`, day: '2026-10-28', by: 'noah', kind: 'added', note: 'Line added' }], billedParts: { hours: 0, qty: 0, fixed: 0 } };
          rows.push(created); expanded.add(groupBy.value === 'Vendor' ? draft.vendor : draft.stream); refresh(); bench.report(`${value} added.`, () => { const index = rows.indexOf(created); if (index >= 0) rows.splice(index, 1); refresh(); });
        }
        return true;
      }, back, row ? 'Save Changes' : 'Add Line', undefined, { close: { label: 'Close drawer', className: 'scale-drawer-close' } });
    }

  },
};
