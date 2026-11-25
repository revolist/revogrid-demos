import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Switch } from '@revolist/ui/react';
import { stretchedColumnWidth } from '../../composables/column-stretch';
import { mountTabs, type ElementFactory } from '@revolist/ui/native';
import { renderSortMenuHeader, entityCellRenderer, visualCellRenderer, heatActionRenderer } from '@revolist/revogrid-pro';
import { createBenchmarkCardContent } from '@revolist/ui/benchmark-card';
import '@revolist/ui/benchmark-card.scss';
import type { ColumnData, ColumnRegular, DataType } from '@revolist/revogrid';
import { compareCohorts, type CohortSortKey, type CohortSortable } from './cohort-sort';
import { cohortHeatTier } from './cohort-heat';
import {
  button,
  make,
  matches,
  number,
  select,
  total,
  type Example,
} from './workbench-ui';

type Outcome = 'verified' | 'booked' | 'arrived' | 'started' | 'hold';
interface Signal {
  id: string;
  label: string;
  note: string;
  area: string;
  answers: number;
  verified: number;
  booked: number;
  arrived: number;
  started: number;
  hold: number;
}
const signals: Signal[] = [
  {
    id: 'Q1',
    label: 'Appointment needed this week',
    note: 'Acute pain and mobility limits',
    area: 'Clinical Fit',
    answers: 711,
    verified: 611,
    booked: 438,
    arrived: 367,
    started: 321,
    hold: 45,
  },
  {
    id: 'Q2',
    label: 'Imaging results available',
    note: 'X-ray or MRI attached',
    area: 'Clinical Fit',
    answers: 694,
    verified: 563,
    booked: 402,
    arrived: 333,
    started: 287,
    hold: 62,
  },
  {
    id: 'Q4',
    label: 'Coverage is in network',
    note: 'Payer accepted at main campus',
    area: 'Coverage Fit',
    answers: 683,
    verified: 521,
    booked: 381,
    arrived: 305,
    started: 264,
    hold: 74,
  },
  {
    id: 'Q3',
    label: 'Authorization confirmed',
    note: 'Authorization known at intake',
    area: 'Coverage Fit',
    answers: 676,
    verified: 506,
    booked: 351,
    arrived: 268,
    started: 229,
    hold: 98,
  },
  {
    id: 'Q6',
    label: 'Morning availability',
    note: 'Preferred window before noon',
    area: 'Visit Fit',
    answers: 659,
    verified: 482,
    booked: 364,
    arrived: 297,
    started: 251,
    hold: 57,
  },
  {
    id: 'Q5',
    label: 'Travel within 40 miles',
    note: 'Patient can reach first slot',
    area: 'Visit Fit',
    answers: 648,
    verified: 447,
    booked: 307,
    arrived: 253,
    started: 217,
    hold: 81,
  },
  {
    id: 'Q7',
    label: 'Care partner available',
    note: 'Ride and recovery support confirmed',
    area: 'Visit Fit',
    answers: 626,
    verified: 419,
    booked: 296,
    arrived: 242,
    started: 205,
    hold: 87,
  },
  {
    id: 'Q8',
    label: 'Interpreter need recorded',
    note: 'Interpreter requirement captured',
    area: 'Visit Fit',
    answers: 612,
    verified: 457,
    booked: 322,
    arrived: 269,
    started: 229,
    hold: 48,
  },
];
const cardiology: Signal[] = [
  {
    id: 'Q1',
    label: 'Symptoms under review',
    note: 'Chest pain or rhythm concern',
    area: 'Clinical Fit',
    answers: 581,
    verified: 503,
    booked: 373,
    arrived: 315,
    started: 269,
    hold: 36,
  },
  {
    id: 'Q2',
    label: 'Referral order exists',
    note: 'Provider order received',
    area: 'Clinical Fit',
    answers: 568,
    verified: 476,
    booked: 347,
    arrived: 291,
    started: 247,
    hold: 52,
  },
  {
    id: 'Q3',
    label: 'Benefits verified',
    note: 'Eligibility matched before booking',
    area: 'Coverage Fit',
    answers: 557,
    verified: 458,
    booked: 329,
    arrived: 275,
    started: 234,
    hold: 68,
  },
  {
    id: 'Q4',
    label: 'Cost share accepted',
    note: 'Copay estimate acknowledged',
    area: 'Coverage Fit',
    answers: 546,
    verified: 405,
    booked: 278,
    arrived: 222,
    started: 187,
    hold: 88,
  },
  {
    id: 'Q5',
    label: 'Device data ready',
    note: 'Wearable or monitor export shared',
    area: 'Visit Fit',
    answers: 534,
    verified: 412,
    booked: 298,
    arrived: 247,
    started: 207,
    hold: 64,
  },
  {
    id: 'Q6',
    label: '48-hour slot fit',
    note: 'Fast-track appointment accepted',
    area: 'Visit Fit',
    answers: 523,
    verified: 379,
    booked: 309,
    arrived: 258,
    started: 216,
    hold: 49,
  },
  {
    id: 'Q7',
    label: 'Transport confirmed',
    note: 'Ride option recorded',
    area: 'Visit Fit',
    answers: 508,
    verified: 337,
    booked: 229,
    arrived: 188,
    started: 151,
    hold: 79,
  },
];
const outcomeDescriptions: Record<Outcome, string> = {
  verified: 'Coverage cleared',
  booked: 'First slot held',
  arrived: 'Visit completed',
  started: 'Care plan opened',
  hold: 'Manual review',
};
const outcomes: Outcome[] = [
  'verified',
  'booked',
  'arrived',
  'started',
  'hold',
];
const notes: Record<string, string> = {
  'Clinical Fit': 'Need, referral, and record readiness',
  'Coverage Fit': 'Plan match and prior authorization',
  'Visit Fit': 'Slot, travel, caregiver, and language fit',
  'Strong booking': '55%+ booked',
  'Moderate booking': '35 to 54% booked',
  'High hold risk': '14%+ held',
  'Watch list': '10 to 13% held',
  'Low hold risk': 'Under 10% held',
};
const rate = (value: number, count: number) =>
  count ? Math.round((value / count) * 100) : 0;
function risk(row: Signal) {
  const value = rate(row.hold, row.answers);
  return value >= 14
    ? 'High hold risk'
    : value >= 10
      ? 'Watch list'
      : 'Low hold risk';
}
function aggregate(rows: Signal[]) {
  return Object.fromEntries(
    ['answers', ...outcomes].map((key) => [
      key,
      total(rows, (row) => row[key as keyof Pick<Signal, 'answers' | Outcome>]),
    ]),
  );
}

export const patientCohorts: Example = {
  id: 'patient-cohorts',
  title: 'Patient Access Cohorts',
  description: 'Care navigation signals for referral and appointment planning',
  setup(bench) {
    bench.grid.tooltip = {
      anchorToTarget: true, anchorAlignment: 'end', anchorGap: 4, showDelayMs: 200, animation: true, followCursor: false,
      renderContent: ({ target, document }) => {
        const anchor = target instanceof HTMLElement ? target.closest<HTMLElement>('[data-benchmark-label]') : null;
        if (!anchor) return undefined;
        const { benchmarkLabel: title = '', benchmarkOutcome: badge = '', benchmarkDescription: description = '', benchmarkCount: count = '', benchmarkAnswers: answers = '', benchmarkRate = '0', benchmarkAverage = '0' } = anchor.dataset;
        const rate = Number(benchmarkRate), average = Number(benchmarkAverage);
        if (!Number.isFinite(rate) || !Number.isFinite(average)) return undefined;
        const delta = rate - average;
        const favorable = badge === 'Hold' ? delta < 0 : delta > 0;
        const changeTone = delta === 0 ? 'neutral' : favorable ? 'positive' : 'negative';
        return createBenchmarkCardContent(document, { title, badge, description, value: `${rate}%`, detail: `${count} of ${answers} answers`, change: `${delta > 0 ? '+' : ''}${delta} pts`, changeTone, benchmark: `Cohort average ${average}%`, progress: { value: rate, label: `${rate}%` } });
      },
    };
    let mode = 'Intake area';
    let showNotes = true;
    let expanded = new Set(['Clinical Fit', 'Coverage Fit']);
    let sort: { key: CohortSortKey; direction: 1 | -1 } | null = null;
    const tabs = make('div');
    const tabOptions = ['Intake area', 'Booking strength', 'Hold risk'].map(name => ({ value: name, label: name }));
    const tabProps = (value: string) => ({ value, options: tabOptions, ariaLabel: 'Cohort grouping', className: 'cohort-tabs rv-tabs--underline', onChange: (next: string) => { mode = next; expanded = new Set(); refresh(); } });
    const tabControl = mountTabs(tabs, tabProps(mode));
    bench.onDispose(() => tabControl.destroy());
    bench.summary.hidden = false;
    bench.summary.classList.add('cohort-tab-bar');
    bench.summary.append(tabs);
    const summary = make('div', '', 'cohort-heading-summary');
    bench.heading.append(summary);
    const cohort = select(
      'Cohort',
      ['Mobility Referral', 'Heart Health Access'],
      'Mobility Referral',
      () => {
        expanded = new Set();
        refresh();
      },
    );
    const cohortSignals = () =>
      cohort.value === 'Heart Health Access' ? cardiology : signals;
    const riskFilter = select(
      'Filter by hold risk',
      ['All hold risk', 'High hold risk', 'Watch list', 'Low hold risk'],
      'All hold risk',
      refresh,
    );
    const notesLabel = make('div', '', 'cohort-notes');
    const notesRoot = createRoot(notesLabel);
    const renderNotes = () => notesRoot.render(createElement(Switch, {
      checked: showNotes, label: 'Notes', ariaLabel: 'Toggle signal notes',
      onChange: (checked: boolean) => { showNotes = checked; renderNotes(); refresh(); },
    }));
    renderNotes();
    bench.onDispose(() => notesRoot.unmount());
    const expand = button('Expand', () => {
      const names = groupNames();
      const all = names.every((name) => expanded.has(name));
      expanded = new Set(all ? [] : names);
      refresh();
    });
    bench.toolbar.append(cohort, riskFilter, notesLabel, expand);
    bench.onSearch(refresh);
    bench.onCompactChange(refresh);
    function group(row: Signal) {
      return mode === 'Intake area'
        ? row.area
        : mode === 'Booking strength'
          ? rate(row.booked, row.answers) >= 55
            ? 'Strong booking'
            : 'Moderate booking'
          : risk(row);
    }
    function groupNames() {
      return mode === 'Intake area'
        ? ['Clinical Fit', 'Coverage Fit', 'Visit Fit']
        : mode === 'Booking strength'
          ? ['Strong booking', 'Moderate booking']
          : ['High hold risk', 'Watch list', 'Low hold risk'];
    }
    const applySort = (direction: 1 | -1 | null) => async (context: import('@revolist/revogrid-pro').DataGridContextMenuContext) => {
      const column = context.column;
      if (!column) return;
      if (['label', 'answers', ...outcomes].includes(String(column.prop) as Outcome)) {
        sort = direction === null ? null : { key: column.prop as CohortSortKey, direction };
        refresh();
      } else {
        await bench.grid.updateColumnSorting(column, direction === 1 ? 'asc' : direction === -1 ? 'desc' : undefined, false);
      }
    };
    bench.grid.dataGridContextMenu = { commandHandlers: {
      'column.sortAscending': applySort(1), 'column.sortDescending': applySort(-1), 'column.clearSort': applySort(null),
    } };
    const sortableHeader = (key: CohortSortKey, label: string) =>
      (h: Parameters<NonNullable<import('@revolist/revogrid').ColumnRegular['columnTemplate']>>[0]) =>
        renderSortMenuHeader(h, {
          label, ariaLabel: `${label} column menu`, className: `cohort-sort-header ${key === 'label' ? '' : 'numeric'}`,
          direction: sort?.key === key ? (sort.direction === 1 ? 'asc' : 'desc') : undefined,
        });
    let signalWidth = 292;
    const columns: ColumnData = [
      {
        prop: 'label',
        name: 'Intake Signal',
        columnTemplate: sortableHeader('label', 'Intake Signal'),
        size: 292,
        pin: 'colPinStart',
        cellTemplate(h, { model }) {
          if (model.footer)
            return h('strong', { class: 'cohort-footer-label' }, [
              h('span', {}, `Visible Signals `),
              h('span', {}, String(model.count)),
            ]);
          return entityCellRenderer!(h, { model, value: model.label, column: {
            prop: 'label', entityCell: {
              format: () => model.group ? {
                kind: 'group', variant: 'tree', className: 'cohort-group', label: String(model.label),
                expanded: !!model.open, actionClassName: 'cell-action', actionLabel: `${model.open ? 'Collapse' : 'Expand'} ${model.label}`,
                leading: (h: ElementFactory) => h('svg', { class: 'cohort-wave', 'aria-hidden': 'true', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('path', { d: 'M22 12h-4l-3 9L9 3l-3 9H2' })]),
                detail: showNotes ? String(model.note ?? '') : undefined,
                trailing: (h: ElementFactory) => h('span', { class: 'cohort-count' }, String(model.count)),
              } : {
                kind: 'identity', interactive: false, className: 'cohort-signal', label: String(model.label),
                detail: showNotes ? String(model.note ?? '') : undefined,
                prefix: (h: ElementFactory) => h('span', { class: 'cohort-id' }, String(model.id)),
              },
              onActivate: () => { if (expanded.has(model.label)) expanded.delete(model.label); else expanded.add(model.label); refresh(); },
            },
          } } as any);

        },
      },
      {
        prop: 'answers',
        name: 'Answers',
        columnTemplate: sortableHeader('answers', 'Answers'),
        size: 127,
        cellTemplate: visualCellRenderer,
        visualCell: { format: (_value, model) => ({ kind: 'text', className: 'cohort-answers', text: number(model.answers) }) },
      },
      ...outcomes.map((key) => ({
        prop: key,
        name: key[0].toUpperCase() + key.slice(1),
        columnTemplate: sortableHeader(key, key[0].toUpperCase() + key.slice(1)),
        size: 145,
        cellTemplate(h: Parameters<NonNullable<ColumnRegular['cellTemplate']>>[0], props: Parameters<NonNullable<ColumnRegular['cellTemplate']>>[1]) {
          if (props.model.footer) {
            const n = Number(props.model[key]);
            return h('strong', { class: `cohort-total ${key === 'hold' ? 'risk' : ''}` }, `${number(n)} / ${rate(n, props.model.answers)}%`);
          }
          return heatActionRenderer!(h, props);
        },
        heatAction: {
          format: (_value: unknown, model: DataType) => {
            const n = Number(model[key]);
            const percent = rate(n, model.answers);
            const label = `${model.label}, ${key}: ${number(n)} of ${number(model.answers)} answers, ${percent}%`;
            return {
              label, tooltip: label, value: number(n), detail: `${percent}%`,
              className: `cohort-heat ${cohortHeatTier(key, percent)}`,
              data: {
                'benchmark-label': String(model.label),
                'benchmark-outcome': key[0].toUpperCase() + key.slice(1),
                'benchmark-description': outcomeDescriptions[key],
                'benchmark-count': number(n),
                'benchmark-answers': number(model.answers),
                'benchmark-rate': String(percent),
                'benchmark-average': String(rate(total(cohortSignals(), row => row[key]), total(cohortSignals(), row => row.answers))),
              },
            };
          },
          // The benchmark tooltip contains the full cell detail.
          onActivate: () => {},
        },
      })),
    ];
    function refresh() {
      bench.setSubtitle(
        cohort.value === 'Heart Health Access'
          ? 'Referral triage for high-intent heart care'
          : 'Care navigation signals for referral and appointment planning',
      );
      const filtered = cohortSignals().filter(
        (row) =>
          (riskFilter.value === 'All hold risk' ||
            risk(row) === riskFilter.value) &&
          matches(bench.currentQuery(), row.label, row.note, row.area, row.id),
      );
      tabControl.update(tabProps(mode));
      const rows: DataType[] = [];
      const groups = groupNames().map((name) => {
        const items = filtered.filter((row) => group(row) === name);
        return { name, items, stats: { ...aggregate(items), label: name } as CohortSortable };
      }).filter(({ items }) => items.length);
      if (sort) {
        const { key, direction } = sort;
        groups.sort((a, b) => compareCohorts(a.stats, b.stats, key, direction));
        groups.forEach(({ items }) => items.sort((a, b) => compareCohorts(a, b, key, direction)));
      }
      for (const { name, items } of groups) {
        rows.push({
          ...aggregate(items),
          label: name,
          note: notes[name],
          count: items.length,
          group: true,
          open: expanded.has(name),
        });
        if (expanded.has(name)) rows.push(...items);
      }
      const stats = aggregate(filtered);
      const totalAnswers = Number(stats.answers);
      summary.replaceChildren();
      const answers = make('span', 'Answers');
      answers.append(make('b', number(totalAnswers)));
      const hold = make('span', 'Hold Risk');
      hold.append(make('b', number(Number(stats.hold))));
      const date = make('span', 'Exported  24 Jun 2026');
      summary.append(answers, hold, date);
      const all = groupNames().filter((name) =>
        filtered.some((row) => group(row) === name),
      );
      expand.textContent =
        all.length && all.every((name) => expanded.has(name))
          ? 'Collapse'
          : 'Expand';
      bench.grid.rowDefinitions = [
        ...rows.map((row, index) => ({
          type: 'rgRow' as const,
          index,
          size: row.group ? 44 : 56,
        })),
        { type: 'rowPinEnd' as const, index: 0, size: 32 },
      ];
      bench.grid.style.height = `${32 + rows.reduce((sum, row) => sum + (row.group ? 44 : 56), 0) + (filtered.length ? 32 : 0)}px`;
      const activeColumns = [{ ...columns[0], size: signalWidth }, ...columns.slice(1)];
      bench.render(
        activeColumns,
        rows,
        filtered.length
          ? [
              {
                ...stats,
                label: 'Visible Signals',
                count: filtered.length,
                footer: true,
              },
            ]
          : [],
      );
    }
    const observer = new ResizeObserver(() => {
      const minimum = window.matchMedia('(max-width: 650px)').matches ? 260 : 292;
      const next = stretchedColumnWidth(bench.grid.clientWidth, 127 + outcomes.length * 145, minimum);
      if (next !== signalWidth) { signalWidth = next; refresh(); }
    });
    observer.observe(bench.grid);
    bench.onDispose(() => observer.disconnect());
    refresh();
  },
};
