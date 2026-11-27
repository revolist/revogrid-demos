import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Switch } from '@revolist/ui/react';
import { stretchedColumnWidth } from '../../../../composables/column-stretch';
import { badgeClassName, mountTabs, type ElementFactory } from '@revolist/ui/native';
import { renderSortMenuHeader, entityCellRenderer, visualCellRenderer, heatActionRenderer } from '@revolist/revogrid-pro';
import { createBenchmarkCardContent } from '@revolist/ui/benchmark-card';
import '@revolist/ui/benchmark-card.scss';
import type { ColumnData, ColumnRegular, DataType } from '@revolist/revogrid';
import { compareCohorts, type CohortSortKey, type CohortSortable } from './cohort-sort';
import { cohortHeatTier } from './cohort-heat';
import { cohortTransition } from './cohort-transition';
import {
  button,
  make,
  matches,
  number,
  select,
  total,
  type Example,
} from '../../shared/workbench-ui';

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
  { id: 'Q1', label: 'Referral priority recorded', note: 'Referral urgency confirmed by the clinic', area: 'Clinical Fit', answers: 812, verified: 720, booked: 520, arrived: 450, started: 385, hold: 61 },
  { id: 'Q2', label: 'Rehabilitation goals documented', note: 'Care goals shared before triage', area: 'Clinical Fit', answers: 638, verified: 525, booked: 385, arrived: 315, started: 264, hold: 82 },
  { id: 'Q3', label: 'Primary care referral received', note: 'Referral information available for review', area: 'Coverage Fit', answers: 745, verified: 604, booked: 442, arrived: 359, started: 310, hold: 66 },
  { id: 'Q4', label: 'Benefits estimate reviewed', note: 'Coverage and expected costs discussed', area: 'Coverage Fit', answers: 590, verified: 452, booked: 317, arrived: 249, started: 205, hold: 92 },
  { id: 'Q5', label: 'Evening appointment requested', note: 'Availability after the working day', area: 'Visit Fit', answers: 702, verified: 548, booked: 420, arrived: 357, started: 296, hold: 58 },
  { id: 'Q6', label: 'Accessible transport arranged', note: 'A suitable journey to the clinic is available', area: 'Visit Fit', answers: 561, verified: 423, booked: 290, arrived: 232, started: 196, hold: 78 },
  { id: 'Q7', label: 'Remote consultation considered', note: 'Patient preference for an initial video visit', area: 'Visit Fit', answers: 487, verified: 390, booked: 312, arrived: 261, started: 231, hold: 37 },
  { id: 'Q8', label: 'Communication preferences recorded', note: 'Preferred contact and language documented', area: 'Visit Fit', answers: 679, verified: 529, booked: 391, arrived: 322, started: 278, hold: 51 },
];
const cardiology: Signal[] = [
  { id: 'Q1', label: 'Screening results received', note: 'Recent screening results added to the referral', area: 'Clinical Fit', answers: 674, verified: 581, booked: 431, arrived: 363, started: 314, hold: 42 },
  { id: 'Q2', label: 'Medication list reconciled', note: 'Current medicines available to the care team', area: 'Clinical Fit', answers: 594, verified: 480, booked: 351, arrived: 291, started: 248, hold: 65 },
  { id: 'Q3', label: 'Coverage confirmation requested', note: 'Eligibility check started before scheduling', area: 'Coverage Fit', answers: 713, verified: 555, booked: 401, arrived: 320, started: 274, hold: 84 },
  { id: 'Q4', label: 'Financial assistance discussed', note: 'Support options reviewed with the patient', area: 'Coverage Fit', answers: 478, verified: 350, booked: 245, arrived: 187, started: 154, hold: 76 },
  { id: 'Q5', label: 'Preferred clinic selected', note: 'Location preference recorded', area: 'Visit Fit', answers: 629, verified: 502, booked: 381, arrived: 326, started: 281, hold: 53 },
  { id: 'Q6', label: 'Telephone follow-up accepted', note: 'A phone appointment is suitable', area: 'Visit Fit', answers: 532, verified: 411, booked: 319, arrived: 265, started: 222, hold: 47 },
  { id: 'Q7', label: 'Caregiver contact identified', note: 'Support person included in coordination', area: 'Visit Fit', answers: 456, verified: 330, booked: 222, arrived: 177, started: 145, hold: 72 },
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
const stageNames = ['Verification', 'Booking', 'Arrival', 'Care start'] as const;
function stageDrops(row: Pick<Signal, 'answers' | 'verified' | 'booked' | 'arrived' | 'started'>) {
  return [row.answers - row.verified, row.verified - row.booked, row.booked - row.arrived, row.arrived - row.started];
}
function matchesStage(row: Signal, stage: string) {
  if (stage === 'All stages') return true;
  const drops = stageDrops(row);
  const selected = drops[stageNames.indexOf(stage as typeof stageNames[number])];
  return selected > 0 && selected === Math.max(...drops);
}
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
    const summary = make('div', '', 'cohort-stage-summary');
    bench.summary.append(tabs);
    bench.toolbar.before(summary);
    const cohort = select(
      'Cohort',
      ['Community Rehabilitation', 'Preventive Care Access'],
      'Community Rehabilitation',
      () => {
        expanded = new Set();
        refresh();
      },
    );
    const cohortSignals = () =>
      cohort.value === 'Preventive Care Access' ? cardiology : signals;
    const riskFilter = select(
      'Filter by hold risk',
      ['All hold risk', 'High hold risk', 'Watch list', 'Low hold risk'],
      'All hold risk',
      refresh,
    );
    const stageFilter = select(
      'Filter by largest stage drop',
      ['All stages', ...stageNames],
      'All stages',
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
    bench.toolbar.append(cohort, riskFilter, stageFilter, notesLabel, expand);
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
    bench.grid.dataGridContextMenu = { ...bench.grid.dataGridContextMenu || {}, commandHandlers: {
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
              h('span', { class: badgeClassName({ variant: 'neutral', shape: 'rounded' }) }, String(model.count)),
            ]);
          return entityCellRenderer!(h, { model, value: model.label, column: {
            prop: 'label', entityCell: {
              format: () => model.group ? {
                kind: 'group', variant: 'tree', className: 'cohort-group', label: String(model.label),
                expanded: !!model.open, actionClassName: 'cell-action', actionLabel: `${model.open ? 'Collapse' : 'Expand'} ${model.label}`,
                leading: (h: ElementFactory) => h('svg', { class: 'cohort-wave', 'aria-hidden': 'true', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('path', { d: 'M22 12h-4l-3 9L9 3l-3 9H2' })]),
                detail: showNotes ? String(model.note ?? '') : undefined,
                trailing: (h: ElementFactory) => h('span', { class: `${badgeClassName({ variant: 'neutral', shape: 'rounded' })} cohort-count` }, String(model.count)),
              } : {
                kind: 'identity', interactive: false, className: 'cohort-signal', label: String(model.label),
                detail: showNotes ? String(model.note ?? '') : undefined,
                prefix: (h: ElementFactory) => h('span', { class: `${badgeClassName({ variant: 'neutral', shape: 'rounded' })} cohort-id` }, String(model.id)),
              },
              onActivate: () => { if (expanded.has(model.label)) expanded.delete(model.label); else expanded.add(model.label); refresh(); },
            },
          } } as any);

        },
      },
      {
        prop: 'answers',
        columnType: 'number',
        name: 'Answers',
        columnTemplate: sortableHeader('answers', 'Answers'),
        size: 127,
        cellTemplate: visualCellRenderer,
        visualCell: { format: (_value, model) => ({ kind: 'text', className: `cohort-answers${model.group ? ' is-group' : ''}`, text: number(model.answers) }) },
      },
      ...outcomes.map((key) => ({
        prop: key,
        columnType: 'number',
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
          onActivate: (model: DataType) => {
            const answers = Number(model.answers);
            const count = Number(model[key]);
            const percent = rate(count, answers);
            const average = rate(total(cohortSignals(), row => row[key]), total(cohortSignals(), row => row.answers));
            const delta = percent - average;
            const favorable = key === 'hold' ? delta < 0 : delta > 0;
            const content = createBenchmarkCardContent(document, {
              title: String(model.label), badge: key[0].toUpperCase() + key.slice(1), description: outcomeDescriptions[key],
              value: answers ? `${percent}%` : '—', detail: `${number(count)} of ${number(answers)} answers`,
              ...(answers ? { change: `${delta > 0 ? '+' : ''}${delta} pts`, changeTone: delta === 0 ? 'neutral' as const : favorable ? 'positive' as const : 'negative' as const, progress: { value: percent, label: `${percent}%` } } : {}),
              benchmark: `Cohort average ${average}%`,
            });
            content.classList.add('cohort-checkpoint');
            const transition = cohortTransition(key, model);
            if (transition && key !== 'verified') {
              const detail = make('div', '', 'cohort-transition');
              detail.append(
                make('strong', transition.percent == null ? '—' : `${transition.percent}%`),
                make('span', `${number(transition.count)} of ${number(transition.denominator)} ${transition.label} progressed to ${key}`),
              );
              content.append(detail);
            }
            bench.details('Checkpoint details', [content]);
          },
        },
      })),
    ];
    function refresh() {
      bench.setSubtitle(
        cohort.value === 'Preventive Care Access'
          ? 'Referral triage for high-intent heart care'
          : 'Care navigation signals for referral and appointment planning',
      );
      const filtered = cohortSignals().filter(
        (row) =>
          (riskFilter.value === 'All hold risk' ||
            risk(row) === riskFilter.value) &&
          matchesStage(row, stageFilter.value) &&
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
      const hold = make('span', 'Hold Risk', 'cohort-stage-summary__hold');
      hold.append(make('b', number(Number(stats.hold))));
      const stages = [
        ['Verification', totalAnswers, Number(stats.verified)],
        ['Booking', Number(stats.verified), Number(stats.booked)],
        ['Arrival', Number(stats.booked), Number(stats.arrived)],
        ['Care start', Number(stats.arrived), Number(stats.started)],
      ] as const;
      const biggestDrop = stages.reduce((largest, stage) => stage[1] - stage[2] > largest[1] - largest[2] ? stage : largest);
      const [stage, before, after] = biggestDrop;
      const started = make('span', 'Started care');
      started.append(make('b', `${number(Number(stats.started))} / ${number(totalAnswers)}`));
      summary.append(answers, started, hold);
      if (before > after) {
        const drop = make('span', 'Largest drop');
        drop.append(make('b', `${stage} −${number(before - after)}`));
        summary.append(drop);
      }
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
