import { createRecordNavigation } from '@revolist/ui/native';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Legend, RadioGroup, SegmentedSwitch } from '@revolist/ui/react';
import { createMetricProgressRow, mountTabs } from '@revolist/ui/native';
import { createDetailPanel } from '../../../../composables/detail-panel';
import { ROW_ACTION_COLUMN_WIDTH } from '../../../../composables/row-action';
import { demoColors } from '../../../../composables/demo-colors';
import { createMetricTileHistoryTooltip, METRIC_TILE_HISTORY_TOOLTIP } from '@revolist/revogrid-pro';
import '@revolist/revogrid-pro/styles.css';
import { createSegmentedSummaryElement } from '@revolist/revogrid-pro';
import { renderExpandIcon } from '@revolist/revogrid-pro';
import { renderColumnHeader, renderIconStack, GridStatePlugin, metricDetailRenderer, splitValueRenderer, choiceStatusRenderer, cellActionRenderer, rankingRenderer, entityCellRenderer, type EntityCellPresentation } from '@revolist/revogrid-pro';
import { summarizeScreening } from './scale-up-screening';
import { provincePaths, provincePathIndex } from './scale-up-map';
import { indexScore, scoreComponents, averageScore, percentChange, quarterDirections, aggregateQuarterDirections, quarterDirectionLabel } from './scale-up-financials';
import type { MergeData } from '@revolist/revogrid-pro';
import type { ColumnData, ColumnRegular, DataType } from '@revolist/revogrid';
import {
  button,
  field,
  groupedMetrics,
  input,
  make,
  matches,
  number,
  pct,
  removeRecord,
  select,
  total,
  type Example,
} from '../../shared/workbench-ui';

import { provinces, flags, answers, euros, capital, createCompanies, type Flag, type Company } from './scale-up-data';

export const scaleUpIndex: Example = {
  id: 'scale-up-index',
  title: 'Company Growth Explorer',
  description: 'Dutch provincial rankings and company screening for FY25',
  setup(bench) {
    bench.grid.tooltip = {
      showDelayMs: 200, animation: true, anchorToTarget: true, anchorAlignment: 'center',
      renderContent: ({ content, type, document }) => type === METRIC_TILE_HISTORY_TOOLTIP ? createMetricTileHistoryTooltip(document, content) : undefined,
    };
    const companies = createCompanies();
    let nextCompanyId = 1;
    let provinceRanks = new Map<string, number>();
    const expanded = new Set([provinces[0]]);
    const rankBy = select(
      'Rank provinces by',
      ['Index Score', 'Revenue', 'Growth'],
      'Index Score',
      refresh,
    );
    const provinceFilter = select(
      'Province',
      ['All provinces', ...provinces],
      'All provinces',
      refresh,
    );
    const fold = button('Expand all', () => {
      if (expanded.size === provinces.length) expanded.clear();
      else provinces.forEach((province) => expanded.add(province));
      refresh();
    });
    bench.heading.append(button('Add Company', () => edit(), true));
    bench.toolbar.append(provinceFilter, fold);
    bench.onSearch(refresh);
    bench.onCompactChange(() => { Reflect.set(bench.grid, 'stretch', window.matchMedia('(max-width: 650px)').matches ? 0 : 1); refresh(); });
    let summaryFrame = 0;
    let summaryScroll = 0;
    let disposed = false;
    const gridReady = customElements.whenDefined('revo-grid').then(() => bench.grid.componentOnReady()).then(() => bench.grid.getPlugins());
    const alignSummary = () => {
      cancelAnimationFrame(summaryFrame);
      summaryFrame = requestAnimationFrame(() => {
        void gridReady.then(plugins => {
          if (disposed) return;
          const state = plugins.find(plugin => plugin instanceof GridStatePlugin)?.getState();
          if (!state) return;
          const headers = new Map([...bench.grid.querySelectorAll<HTMLElement>('.rgHeaderCell[aria-colindex]')].map(header => [Number(header.getAttribute('aria-colindex')), header.getBoundingClientRect().width]));
          const width = (props: string[]) => state.columns.reduce((sum, column, index) => !column.hidden && props.includes(String(column.prop)) ? sum + (headers.get(index + 1) ?? column.width ?? 0) : sum, 0);
          const groups = [['rank', 'province', 'label'], ['Founder', 'Exports', 'Raising'], ['revenue'], ['margin'], ['staff'], ['score']];
          bench.summary.style.gridTemplateColumns = `${groups.map(group => `${width(group)}px`).join(' ')} minmax(0, 1fr)`;
          const firstPinned = state.columns.some(column => !column.hidden && groups[0].includes(String(column.prop)) && column.pin === 'colPinStart');
          Array.from(bench.summary.children).forEach((card, index) => {
            const element = card as HTMLElement;
            element.style.transform = index === 0 && firstPinned ? '' : `translateX(${-summaryScroll}px)`;
            element.style.zIndex = index === 0 && firstPinned ? '2' : '';
          });
        });
      });
    };
    const onScroll = (event: CustomEvent<HTMLRevoGridElementEventMap['viewportscroll']>) => {
      if (event.detail.dimension === 'rgCol') { summaryScroll = event.detail.coordinate; alignSummary(); }
    };
    bench.grid.addEventListener('viewportscroll', onScroll);
    bench.grid.addEventListener('aftercolumnresize', alignSummary);
    bench.grid.addEventListener('aftercolumnsset', alignSummary);
    const onVisibility = () => requestAnimationFrame(() => { if (!disposed) { bench.grid.querySelectorAll('.rgHeaderCell').forEach(header => summaryObserver.observe(header)); alignSummary(); } });
    bench.grid.addEventListener('hiddencolumnsupdated', onVisibility);
    const summaryObserver = new ResizeObserver(alignSummary);
    summaryObserver.observe(bench.grid);
    void gridReady.then(() => {
      if (!disposed) bench.grid.querySelectorAll('revogr-header, .rgHeaderCell').forEach(header => summaryObserver.observe(header));
    });
    bench.onDispose(() => { disposed = true; cancelAnimationFrame(summaryFrame); summaryObserver.disconnect(); bench.grid.removeEventListener('viewportscroll', onScroll); bench.grid.removeEventListener('aftercolumnresize', alignSummary); bench.grid.removeEventListener('aftercolumnsset', alignSummary); bench.grid.removeEventListener('hiddencolumnsupdated', onVisibility); });
    const screeningColumns: ColumnRegular[] = flags.map((flag) => ({
      prop: flag, name: flag, size: 68, cellTemplate: choiceStatusRenderer,
      choiceStatus: {
        format: (value, model) => {
          const answer = String(value);
          if (!model.company) {
            const ratio = answer.split('/').map(Number);
            const breakdown = model.screenCounts?.[flag] ?? { yes: ratio[0], no: ratio[1] - ratio[0], missing: 0 };
            return { kind: 'summary', text: `${ratio[0]} of ${ratio[1]}`, segments: { parts: [
              { value: breakdown.yes, className: 'screen-yes' }, { value: breakdown.missing, className: 'screen-missing' }, { value: breakdown.no, className: 'screen-no' },
            ], total: ratio[1], label: `${flag}: ${breakdown.yes} yes, ${breakdown.no} no, ${breakdown.missing} not applicable` } };
          }
          return { kind: 'choice', text: answer, label: `${flag} for ${model.label}: ${answer}`, tone: answer === 'Yes' ? 'positive' : answer === 'No' ? 'negative' : 'neutral' };
        },
        onActivate: (model) => {
          const company = model.company as Company;
          const next = select(flag, answers, model[flag]);
          bench.form(`${flag} · ${company.label}`, [field(flag, next)], () => { setScreen(company, flag, next.value); });
        },
      },
    }));
    const companyLogo = (h: Parameters<NonNullable<ColumnRegular['cellTemplate']>>[0], model: DataType) => {
      const company = model.company as Company;
      const index = companies.indexOf(company);
      const colors = ['green', 'orange', 'blue', 'black', 'violet'];
      const mark = company.markKind;
      const logo =
        mark === undefined
          ? h(
              'span',
              {
                class: `scale-company__mark ${colors[Math.max(0, index) % colors.length]}`,
                'aria-hidden': 'true',
              },
              model.mark,
            )
          : h(
              'svg',
              {
                class: `scale-company__logo logo-${mark}`,
                viewBox: '0 0 24 24',
                'aria-hidden': 'true',
              },
              [
                mark === 0 || mark === 3
                  ? h('rect', {
                      width: 24,
                      height: 24,
                      rx: 6.5,
                      fill: 'currentColor',
                    })
                  : mark === 1 || mark === 4
                    ? h('circle', {
                        cx: 12,
                        cy: 12,
                        r: 12,
                        fill: 'currentColor',
                        opacity: mark === 1 ? '.14' : '1',
                      })
                    : null,
                mark === 0
                  ? h(
                      'text',
                      {
                        x: 12,
                        y: 16,
                        'text-anchor': 'middle',
                        'font-size': 13,
                        'font-weight': 500,
                        fill: '#fff',
                      },
                      'K',
                    )
                  : null,
                mark === 1
                  ? h('path', {
                      d: 'M13.5 2 5 13.5h6L9.5 22 19 9.5h-6.2Z',
                      transform: 'translate(5.4 5.4) scale(.55)',
                      fill: 'currentColor',
                    })
                  : null,
                mark === 2
                  ? h('path', {
                      d: 'M19.5 12A7.5 7.5 0 1 1 12 4.5',
                      fill: 'none',
                      stroke: 'currentColor',
                      'stroke-width': 3.4,
                      'stroke-linecap': 'round',
                    })
                  : null,
                mark === 2
                  ? h('circle', { cx: 19, cy: 5, r: 2.4, fill: 'currentColor' })
                  : null,
                mark === 3
                  ? h('path', {
                      d: 'M5 19A14 14 0 0 1 19 5M10 19a9 9 0 0 1 9-9M15 19a4 4 0 0 1 4-4',
                      transform: 'translate(5.4 5.4) scale(.55)',
                      fill: 'none',
                      stroke: '#fff',
                      'stroke-width': 2.6,
                      'stroke-linecap': 'round',
                    })
                  : null,
                mark === 4
                  ? h('path', {
                      d: 'M4 17h16v3H4Zm3-6h13v3H7Zm3-6h10v3H10Z',
                      transform: 'translate(5.4 5.4) scale(.55)',
                      fill: '#fff',
                    })
                  : null,
              ],
            );
      return logo;
    };
    const flagIcon = (model: DataType) => (h: Parameters<NonNullable<ColumnRegular['cellTemplate']>>[0]) =>
      h('span', { class: `province-flag ${String(model.province).toLowerCase().replaceAll(' ', '-')}`, 'aria-hidden': 'true' });
    const rankTone = (rank: number) => rank === 1 ? 'gold' as const : rank === 2 ? 'silver' as const : rank === 3 ? 'bronze' as const : 'neutral' as const;
    const companyPresentation = (model: DataType, compact: boolean): EntityCellPresentation => {
      if (compact && model.total) return { kind: 'group', variant: 'inline', label: 'Netherlands', detail: model.label, interactive: false, leading: h => h('span', { 'aria-hidden': 'true' }, '🇳🇱') };
      if (compact && model.provinceHead) return { kind: 'group', variant: 'inline', label: model.province, expanded: !!model.expanded, actionLabel: `${model.expanded ? 'Collapse' : 'Expand'} ${model.province}`, leading: flagIcon(model), rank: { label: `#${model.rank}`, tone: rankTone(model.rank) } };
      if (!model.company) return { kind: 'group', variant: 'inline', className: 'scale-company--summary', label: model.label, interactive: false, leading: h => renderIconStack(h, { items: [{ content: '◒', color: '#171717' }, { content: '✦', color: '#7960db' }, { content: '●', color: '#ed9a00' }] }) };
      const company = model.company as Company;
      return { kind: 'identity', label: model.label, detail: model.subtitle, actionLabel: `Open ${model.label}`, leading: h => companyLogo(h, model), ...(company.stage && company.stage !== 'Tracked' ? { badge: { text: company.stage, tone: company.stage === 'In Talks' ? 'positive' : 'neutral' } } : {}) };
    };
    const activateCompany = (model: DataType) => model.company ? showCompany(model.company) : toggle(model.province);
    let columns: ColumnData = groupedMetrics([
      {
        prop: 'rank',
        columnType: 'number',
        name: 'Rank',
        size: 72,
        cellTemplate: rankingRenderer,
        ranking: { format: (_value, model) => model.provinceHead ? ({
          label: `#${model.rank}`,
          tone: model.rank === 1 ? 'gold' : model.rank === 2 ? 'silver' : model.rank === 3 ? 'bronze' : 'neutral',
        }) : undefined },
      },
      {
        prop: 'province',
        name: 'Province',
        size: 172,
        columnTemplate: h => renderColumnHeader(h, { className: 'province-header', label: 'Province', action: { label: 'Fold every province', className: 'cell-action', content: h => renderExpandIcon(h, expanded.size === provinces.length), onActivate: () => fold.click() } }),
        cellTemplate: entityCellRenderer,
        entityCell: {
          format: (_value, model) => !model.provinceHead ? undefined : ({
            kind: 'group', label: model.province, expanded: !!model.expanded, className: `province-cell ${model.expanded ? 'is-expanded' : ''}`,
            actionLabel: `${model.expanded ? 'Collapse' : 'Expand'} ${model.province}`, leading: flagIcon(model),
            summary: { label: 'Index score', value: model.provinceScore == null ? 'Not scored' : Number(model.provinceScore).toFixed(1), change: model.provinceScoreChange == null ? 'New' : `${model.provinceScoreChange >= 0 ? '↗ +' : '↘ '}${Number(model.provinceScoreChange).toFixed(1)}`, map: { paths: provincePaths, activeIndex: provincePathIndex[model.province] } },
            fields: [ { label: 'Capital', value: capital[model.province] ?? '—' }, { label: 'Companies', value: String(model.provinceCount) }, { label: 'Revenue', value: euros(Number(model.provinceRevenue)) }, { label: 'Staff', value: number(model.provinceStaff) } ],
          }),
          onActivate: model => toggle(model.province),
        },
      },
      {
        prop: 'label', name: 'Company', size: 274, cellTemplate: entityCellRenderer,
        entityCell: { format: (_value, model) => companyPresentation(model, false), onActivate: activateCompany },
      },
      ...screeningColumns,
      {
        prop: 'revenue', name: 'Revenue', size: 136, columnType: 'currency', cellTemplate: metricDetailRenderer,
        metricDetail: { format: (value, model) => ({
          value: euros(Number(value)), detail: model.growth == null ? '—' : `${model.growth >= 0 ? '↗ +' : '↘ '}${Number(model.growth).toFixed(1)}%`,
          track: { kind: 'meter', value: Number(value), max: Number(model.revenueMaximum) || 1, label: 'Revenue scale', ...(model.company && model.revenueBenchmark != null ? { reference: Number(model.revenueBenchmark) } : {}) },
        }) },
      },
      {
        prop: 'margin', name: 'EBITDA', size: 112, columnType: 'number', cellTemplate: metricDetailRenderer,
        metricDetail: { format: (value, model) => {
          const margin = Number(value ?? 0), benchmark = Number(model.marginBenchmark ?? 0);
          return { value: value == null ? '—' : pct(Number(value)), valueTone: margin < 0 ? 'negative' : 'neutral', alignValue: 'positive-negative', track: { kind: 'variance', value: margin, min: -25, max: 25, reference: benchmark, label: `EBITDA ${pct(margin)}, benchmark ${pct(benchmark)}` } };
        } },
      },
      {
        prop: 'staff', name: 'Staff', size: 112, columnType: 'number', cellTemplate: metricDetailRenderer,
        metricDetail: { format: (value, model) => ({
          value: value == null ? 'None' : number(Number(value)),
          detail: model.staffGrowth == null ? '—' : `${Number(model.staffGrowth) >= 0 ? '↗ +' : '↘ '}${Number(model.staffGrowth).toFixed(1)}%`,
          detailTone: Number(model.staffGrowth ?? 0) < 0 ? 'negative' : 'positive',
          track: { kind: 'tiles', label: `${model.company?.label ?? model.province} headcount by quarter`,
            items: Array.from({ length: 8 }, (_, index) => model.staffHistory
              ? model.staffHistory[index] == null ? 'unknown' : model.staffHistory[index] > 0 ? 'positive' : model.staffHistory[index] < 0 ? 'negative' : 'neutral'
              : Number(model.staffGrowth ?? 0) >= 10 || (Number(model.staffGrowth ?? 0) > 0 && index < 7) || (index === 0 && Number(model.staffGrowth ?? 0) < 0) ? 'positive' : 'neutral'),
            history: {
              title: `${model.company?.label ?? model.province}, headcount`, subtitle: 'Q4 2024 to Q3 2026',
              rows: ['Q4 2024', 'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026'].map((label, index) => {
                const current = model.staffSeries?.[index + 1] as number | null | undefined;
                const direction = quarterDirectionLabel(model.staffHistory?.[index]);
                return { label, value: current == null ? '—' : `${number(current)}${direction || ', no comparison'}` };
              }),
            },
          },
        }) },
      },
      {
        prop: 'score', name: 'Score', size: 100, columnType: 'number', cellTemplate: splitValueRenderer,
        splitValue: { format: (value, model) => ({
          value: value == null ? 'Not scored' : Number(value).toFixed(1), badge: value != null,
          detail: model.scoreChange == null ? 'New' : `${Number(model.scoreChange) > 0 ? '+' : ''}${Number(model.scoreChange).toFixed(1)}`,
          detailTone: Number(model.scoreChange) < 0 ? 'negative' : 'positive',
        }) },
      },
      {
        prop: 'actions', columnChooser: false, name: '', size: ROW_ACTION_COLUMN_WIDTH, cellTemplate: cellActionRenderer,
        cellAction: { label: row => `Actions for ${row.label}`, visible: row => !!row.company, onActivate: row => edit(row.company) },
      },
    ]);

    const compactColumns: ColumnData = [
      {
        prop: 'label', name: 'Company', size: 273, pin: 'colPinStart', cellTemplate: entityCellRenderer,
        entityCell: { format: (_value, model) => companyPresentation(model, true), onActivate: activateCompany },
      },
      ...columns.slice(3),
    ];

    function toggle(name: string) {
      if (expanded.has(name)) expanded.delete(name);
      else expanded.add(name);
      refresh();
    }
    refresh();

    function score(company: Company) {
      return indexScore(company.growth, company.margin, company.revenue);
    }
    function previousScore(company: Company) {
      return indexScore(percentChange(company.previousRevenue, company.priorRevenue), company.previousRevenue && company.previousEbitda != null ? company.previousEbitda / company.previousRevenue * 100 : null, company.previousRevenue);
    }
    function refresh() {
      const visible = companies.filter(
        (row) =>
          (provinceFilter.value === 'All provinces' ||
            row.province === provinceFilter.value) &&
          matches(bench.currentQuery(), row.label, row.province, row.sector, row.sectorName),
      );
      const rankings = provinces.flatMap((label) => {
        const items = visible.filter((row) => row.province === label);
        if (!items.length) return [];
        const revenue = total(items, (row) => row.revenue);
        const comparableRevenue = items.filter(row => row.previousRevenue != null);
        const previousRevenue = total(comparableRevenue, row => row.previousRevenue ?? 0);
        const currentComparableRevenue = total(comparableRevenue, row => row.revenue);
        const previousGrowthItems = items.filter(row => row.previousRevenue != null && row.priorRevenue != null);
        const priorRevenue = total(previousGrowthItems, row => row.priorRevenue ?? 0);
        const previousForGrowth = total(previousGrowthItems, row => row.previousRevenue ?? 0);
        const staff = total(items, (row) => row.staff ?? 0);
        const comparableStaff = items.filter(row => row.staffSeries.at(-5) != null && row.staffSeries.at(-5)! > 0 && row.staffSeries.at(-1) != null);
        const previousStaff = total(comparableStaff, row => row.staffSeries.at(-5) ?? 0);
        const currentComparableStaff = total(comparableStaff, row => row.staffSeries.at(-1) ?? 0);
        const currentScores = averageScore(items.map(score));
        const priorScores = averageScore(items.map(previousScore));
        return [
          {
            label,
            items,
            group: true,
            expanded: expanded.has(label),
            score: currentScores,
            previousScore: priorScores,
            scoreChange: currentScores != null && priorScores != null ? currentScores - priorScores : null,
            revenue,
            staff,
            margin: revenue
              ? total(items, (row) => (row.margin ?? 0) * row.revenue) / revenue
              : null,
            growth: percentChange(currentComparableRevenue, previousRevenue),
            previousGrowth: priorRevenue ? (previousForGrowth / priorRevenue - 1) * 100 : null,
            previousRevenue: comparableRevenue.length ? previousRevenue : null,
            staffGrowth: percentChange(currentComparableStaff, previousStaff),
            staffHistory: aggregateQuarterDirections(items.map(row => row.staffSeries)),
            staffSeries: Array.from({ length: 9 }, (_, index) => { const values = items.map(item => item.staffSeries[index]).filter((value): value is number => value != null); return values.length ? values.reduce((sum, value) => sum + value, 0) : null; }),
            screenCounts: Object.fromEntries(
              flags.map((flag) => [
                flag,
                summarizeScreening(items.map((item) => item.screening[flag])),
              ]),
            ),
            ...Object.fromEntries(
              flags.map((flag) => [
                flag,
                `${items.filter((item) => item.screening[flag] === 'Yes').length}/${items.length}`,
              ]),
            ),
          },
        ];
      });
      const sortBy =
        rankBy.value === 'Revenue'
          ? 'revenue'
          : rankBy.value === 'Growth'
            ? 'growth'
            : 'score';
      const companyRank = (company: Company) => sortBy === 'revenue' ? company.revenue : sortBy === 'growth' ? company.growth : score(company);
      rankings.sort((a, b) => Number(b[sortBy] ?? -Infinity) - Number(a[sortBy] ?? -Infinity) || a.label.localeCompare(b.label));
      provinceRanks = new Map(rankings.map((group, index) => [group.label, index + 1]));
      const ranges: MergeData[] = [];
      let start = 0;
      const compact = window.matchMedia('(max-width: 650px)').matches;
      const source: DataType[] = rankings.flatMap(
        ({ items, ...group }, index): DataType[] => {
          const open = group.expanded || !!bench.currentQuery();
          const province = {
            province: group.label,
            provinceHead: true,
            expanded: open,
            rank: index + 1,
            provinceScore: group.score,
            provinceScoreChange: group.scoreChange,
            scoreChange: group.scoreChange,
            provinceCount: items.length,
            provinceRevenue: group.revenue,
            provinceStaff: group.staff,
          };
          if (!open) {
            start++;
            return [
              {
                ...group,
                ...province,
                label: `${items.length} companies`,
                mark: '◉',
              },
            ];
          }
          if (compact) {
            return [
              { ...group, ...province, label: group.label },
              ...items
                .slice()
                .sort((a, b) => (companyRank(b) ?? -Infinity) - (companyRank(a) ?? -Infinity) || a.label.localeCompare(b.label))
                .map((company) => ({
                  ...company,
                  ...company.screening,
                  company,
                  score: score(company),
                  scoreChange:
                    score(company) != null && previousScore(company) != null ? score(company)! - previousScore(company)! : null,
                  subtitle: company.sector,
                  mark: company.label.charAt(0),
                })),
            ];
          }
          if (items.length > 1) {
            ranges.push(
              { row: start, rowSpan: items.length, column: 0 },
              { row: start, rowSpan: items.length, column: 1 },
            );
          }
          start += items.length;
          return items
            .slice()
            .sort((a, b) => (companyRank(b) ?? -Infinity) - (companyRank(a) ?? -Infinity) || a.label.localeCompare(b.label))
            .map((company, row) => ({
              ...company,
              ...company.screening,
              ...(row === 0 ? province : {}),
              company,
              score: score(company),
              scoreChange:
                score(company) != null && previousScore(company) != null ? score(company)! - previousScore(company)! : null,
              subtitle: company.sector,
              mark: company.label.charAt(0),
            }));
        },
      );
      const screening = visible.flatMap((row) =>
        flags.map((flag) => row.screening[flag]),
      );
      const revenue = total(visible, (row) => row.revenue);
      const comparableRevenue = visible.filter(row => row.previousRevenue != null);
      const previousRevenue = total(comparableRevenue, row => row.previousRevenue ?? 0);
      const comparableCurrentRevenue = total(comparableRevenue, row => row.revenue);
      const staff = total(visible, row => row.staff ?? 0);
      const comparableStaff = visible.filter(row => row.staffSeries.at(-5) != null && row.staffSeries.at(-5)! > 0 && row.staffSeries.at(-1) != null);
      const previousStaff = total(comparableStaff, row => row.staffSeries.at(-5) ?? 0);
      const currentComparableStaff = total(comparableStaff, row => row.staffSeries.at(-1) ?? 0);
      const revenueChange = percentChange(comparableCurrentRevenue, previousRevenue);
      const staffChange = percentChange(currentComparableStaff, previousStaff);
      const currentScore = averageScore(visible.map(score));
      const priorScore = averageScore(visible.map(previousScore));
      const scoreChange = currentScore != null && priorScore != null ? currentScore - priorScore : null;
      const marginComparable = visible.filter(row => row.previousRevenue != null && row.previousEbitda != null);
      const previousMarginRevenue = total(marginComparable, row => row.previousRevenue ?? 0);
      const previousMargin = previousMarginRevenue ? total(marginComparable, row => row.previousEbitda ?? 0) / previousMarginRevenue * 100 : null;
      const currentMargin = revenue ? total(visible, row => (row.margin ?? 0) * row.revenue) / revenue : null;
      const signed = (value: number | null, suffix = '%') =>
        value === null
          ? '–'
          : `${value >= 0 ? '+' : ''}${value.toFixed(1)}${suffix}`;

      fold.textContent =
        expanded.size === provinces.length ? 'Collapse all' : 'Expand all';
      const marginCompanies = visible.filter(row => row.margin != null);
      const hiringCompanies = visible.filter(row => row.staffGrowth != null);
      const scoredCompanies = visible.filter(row => score(row) != null);
      const pointTooltip = (companies: Company[], metricLabel: string, format: (value: number) => string) =>
        (value: number, index: number) => ({ title: companies[index].label, subtitle: `${companies[index].province}, ${companies[index].sector}`, metricLabel, metricValue: format(value) });
      bench.stats([
        [
          '2026 Index, FY25 vs FY24',
          `🇳🇱  ${visible.length} companies`,
          `in ${rankings.length} provinces`,
        ],
        [
          'Screen',
          screening.length
            ? `${Math.round((screening.filter((value) => value === 'Yes').length / screening.length) * 100)}% yes`
            : '–',
          `● Yes ${screening.filter((answer) => answer === 'Yes').length}  ● No ${screening.filter((answer) => answer === 'No').length}  ● N/A ${screening.filter((answer) => answer === 'N/A').length}`,
        ],
        [
          'Revenue FY25',
          euros(total(visible, row => row.revenue)),
          signed(revenueChange),
          visible.map((row) => row.revenue), euros, pointTooltip(visible, 'Revenue', euros),
        ],
        [
          'EBITDA Margin',
          currentMargin == null ? '–' : pct(currentMargin),
          currentMargin != null && previousMargin != null ? signed(currentMargin - previousMargin, ' pts') : '',
          marginCompanies.map(row => row.margin!), pct, pointTooltip(marginCompanies, 'EBITDA', pct),
        ],
        [
          'Hiring',
          number(staff),
          signed(staffChange),
          hiringCompanies.map(row => row.staffGrowth!), (value) => `${value > 0 ? '+' : ''}${Math.round(value)}%`, pointTooltip(hiringCompanies, 'Hiring', value => `${value > 0 ? '+' : ''}${Math.round(value)}%`),
        ],
        [
          'Index',
          currentScore != null ? currentScore.toFixed(1) : '–',
          signed(scoreChange, ''),
          scoredCompanies.map(row => score(row)!), number, pointTooltip(scoredCompanies, 'Index', value => value.toFixed(1)),
        ],
      ]);
      const screenCard = bench.summary.children[1] as HTMLElement | undefined;
      if (screenCard) {
        const yes = screening.filter(value => value === 'Yes').length;
        const no = screening.filter(value => value === 'No').length;
        const missing = screening.filter(value => value === 'N/A').length;
        const chart = createSegmentedSummaryElement(document, {
          label: `Screening: Yes ${yes}, No ${no}, N/A ${missing}`,
          parts: [
            { label: 'Yes', value: yes, color: demoColors.teal },
            { label: 'N/A', value: missing, color: '#d5d1d7' },
            { label: 'No', value: no, color: demoColors.pink },
          ],
          legendOrder: [0, 2, 1],
        });
        screenCard.querySelector('small')?.replaceWith(chart);
      }
      const rank = field('Rank provinces by', rankBy);
      rank.classList.add('province-rank-filter');
      bench.summary.firstElementChild?.append(rank);
      bench.mergeCells(ranges);
      const countryRow = {
        label: `${visible.length} companies`,
        total: true,
        province: 'Netherlands',
        score: currentScore,
        revenue: total(visible, (row) => row.revenue),
        staff: total(visible, (row) => row.staff ?? 0),
        growth: 0,
        screenCounts: Object.fromEntries(
          flags.map((flag) => [
            flag,
            summarizeScreening(visible.map((item) => item.screening[flag])),
          ]),
        ),
        ...Object.fromEntries(
          flags.map((flag) => [
            flag,
            `${visible.filter((row) => row.screening[flag] === 'Yes').length}/${visible.length}`,
          ]),
        ),
      };
      const revenueMaximum = Math.max(0, ...source.map((item) => Number(item.revenue) || 0));
      const revenueBenchmark = visible.length ? revenue / visible.length : null;
      const marginBenchmark = revenue ? total(visible, (item) => (item.margin ?? 0) * item.revenue) / revenue : 0;
      bench.render(
        compact ? compactColumns : columns,
        source.map((row) => ({
          ...row,
          revenueMaximum,
          revenueBenchmark,
          marginBenchmark,
        })),
        compact && visible.length ? [countryRow] : [],
      );
      alignSummary();
    }

    function setScreen(company: Company, key: Flag | 'Audited', value: string, after?: () => void) {
      const previousStage = company.stage;
      const previous = key === 'Audited' ? company.audited : company.screening[key];
      if (key === 'Audited') company.audited = value; else company.screening[key] = value;
      if (['Shortlisted', 'In Talks'].includes(company.stage ?? '') && (Object.values(company.screening).includes('No') || company.audited === 'No')) company.stage = 'Tracked';
      refresh(); after?.();
      bench.report(`${key} set to ${value}.${company.stage !== previousStage ? ' The company moved back to Tracked.' : ''}`, () => {
        if (key === 'Audited') company.audited = previous; else company.screening[key] = previous;
        company.stage = previousStage; refresh();
      });
    }

    function showCompany(company: Company, active: 'Overview' | 'Financials' | 'Hiring' = 'Overview') {
      const body = make('div', '', 'scale-profile');
      const companyHeading = make('div', '', 'scale-profile__heading');
      const meta = make('div', '', 'scale-profile__meta'); meta.append(make('span', company.id, 'scale-profile__id'));
      const peers = companies.filter(item => item.province === company.province && (provinceFilter.value === 'All provinces' || item.province === provinceFilter.value) && matches(bench.currentQuery(), item.label, item.province, item.sector));
      const measure = (item: Company) => rankBy.value === 'Revenue' ? item.revenue : rankBy.value === 'Growth' ? item.growth : score(item);
      peers.sort((a,b) => (measure(b) ?? -Infinity) - (measure(a) ?? -Infinity) || a.label.localeCompare(b.label));
      const position = Math.max(0, peers.indexOf(company));
      const navigation = createRecordNavigation(document, {
        index: position, count: peers.length, label: `${position + 1} of ${peers.length}`,
        previousLabel: 'Previous company', nextLabel: 'Next company', className: 'scale-profile__navigation',
        onPrevious: () => showCompany(peers[position - 1], active),
        onNext: () => showCompany(peers[position + 1], active),
      });
      meta.append(navigation);
      const heading = make('div', '', 'scale-profile__name');
      heading.append(make('span', company.label.slice(0, 1).toUpperCase(), 'scale-profile__logo'), make('strong', company.label));
      if (company.stage && company.stage !== 'Tracked') heading.append(make('span', company.stage, `scale-profile__stage ${company.stage === 'In Talks' ? 'active' : ''}`));
      const location = make('p', '', 'scale-profile__location');
      const provinceFlag = make('span', '', `province-flag ${company.province.toLowerCase().replaceAll(' ', '-')}`); provinceFlag.setAttribute('aria-hidden', 'true');
      location.append(provinceFlag, document.createTextNode(`${company.province}  •  ${company.city}  •  ${company.sectorName}`));
      companyHeading.append(meta, heading, location);
      const tabs = make('div');
      const panel = make('div', '', 'scale-profile__content'); panel.setAttribute('role', 'tabpanel');
      const names = ['Overview', 'Financials', 'Hiring'] as const;
      panel.id = `scale-profile-panel-${company.id}`;
      const tabOptions = names.map(name => ({ value: name, label: name, id: `scale-profile-${company.id}-${name}`, ariaControls: panel.id }));
      const tabProps = (value: typeof active) => ({ value, options: tabOptions, onChange: showTab, ariaLabel: 'Company details', className: 'scale-profile__tabs rv-tabs--underline' });
      const tabControl = mountTabs(tabs, tabProps(active));
      const controls = [...tabs.querySelectorAll<HTMLButtonElement>('[role=tab]')];
      body.append(companyHeading, tabs, panel);
      const section = (title: string, subtitle: string) => { const { card, body } = createDetailPanel(title, subtitle, { card: 'scale-profile__section', heading: 'scale-profile__section-heading', body: 'scale-profile__section-content' }); panel.append(card); return body; };
      const signed = (value: number | null, suffix = '%') => value == null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(1)}${suffix}`;
      let legendRoot: ReturnType<typeof createRoot> | undefined;
      const screeningRoots: ReturnType<typeof createRoot>[] = [];
      const releaseScreening = () => screeningRoots.splice(0).forEach(root => root.unmount());
      function showTab(tab: typeof active) {
        legendRoot?.unmount(); legendRoot = undefined;
        releaseScreening();
        active = tab; tabControl.update(tabProps(tab));
        controls.forEach((control, index) => { const selected = names[index] === tab; control.setAttribute('aria-selected', String(selected)); control.tabIndex = selected ? 0 : -1; });
        panel.setAttribute('aria-labelledby', controls[names.indexOf(tab)].id); panel.replaceChildren();
        if (tab === 'Overview') {
          const current = score(company), previous = previousScore(company), parts = scoreComponents(company.growth, company.margin, company.revenue);
          const content = section('Index Score', 'FY25 growth, margin and scale');
          const top = make('div', '', 'scale-profile__score-top');
          const scoreCopy = make('div');
          const change = make('small', '', 'scale-profile__score-change');
          if (current == null || previous == null) change.textContent = 'New';
          else { const difference = current - previous; change.append(make('span', `${difference >= 0 ? '↗' : '↘'} ${signed(difference, '')}`, difference >= 0 ? 'positive' : 'negative'), document.createTextNode(' vs FY24')); }
          scoreCopy.append(make('strong', current == null ? 'Not scored' : current.toFixed(1), 'scale-profile__score-value'), change);
          const rank = make('div', '', 'scale-profile__rank'); rank.append(make('small', `${position + 1} of ${peers.length} in ${company.province}`), make('span', `#${provinceRanks.get(company.province) ?? '–'}`));
          top.append(scoreCopy, rank); content.append(top);
          for (const [label, value, max] of [['Growth', parts?.growth, 50], ['Margin', parts?.margin, 30], ['Scale', parts?.scale, 20]] as const) {
            content.append(createMetricProgressRow(document, { label, meterLabel: `${label} score`, value: value ?? null, maximum: max, formattedValue: value == null ? '—' : value.toFixed(1), detail: `of ${max}`, className: 'scale-profile__bar-row' }));
          }
          const screening = section('Screen', 'What the first call confirmed');
          for (const [key, question] of [['Founder', 'Founder still leads it'], ['Exports', 'A quarter of sales abroad'], ['Raising', 'Open to a round in 12 months'], ['Audited', 'Audited FY25 accounts']] as const) {
            const row = make('div', '', 'scale-profile__screen-row'); const label = make('span', question); label.title = question; row.append(label);
            const group = make('div');
            const selected = key === 'Audited' ? company.audited : company.screening[key];
            const root = createRoot(group);
            screeningRoots.push(root);
            root.render(createElement(SegmentedSwitch, {
              role: 'group', ariaLabel: question, className: 'scale-profile__screen-options',
              itemClassName: 'scale-profile__answer', value: selected,
              options: answers.map(answer => ({ value: answer, label: answer, className: `answer-${answer === 'N/A' ? 'na' : answer.toLowerCase()}` })),
              onChange: (answer: string | number) => {
                if (typeof answer === 'string') setScreen(company, key, answer, () => showCompany(company, 'Overview'));
              },
            }));
            row.append(group); screening.append(row);
          }
          const details = section('Details', 'Where it runs and what it does');
          const list = make('dl', '', 'scale-profile__details');
          for (const [label, value] of [['Province', company.province], ['City', company.city], ['Sector', company.sectorName], ['Focus', company.focus], ['Founded', String(company.founded)]]) list.append(make('dt', label), make('dd', value));
          const stage = select('Stage', ['Tracked', 'Shortlisted', 'In Talks', 'Passed'], company.stage ?? 'Tracked');
          const stageError = make('small', '', 'scale-profile__error'); stageError.setAttribute('role', 'alert');
          stage.onchange = () => {
            if (['Shortlisted', 'In Talks'].includes(stage.value) && (Object.values(company.screening).includes('No') || company.audited === 'No')) { stage.value = company.stage ?? 'Tracked'; stageError.textContent = 'Clear every No in the screen first.'; return; }
            const previousStage = company.stage; company.stage = stage.value; refresh(); showCompany(company, 'Overview'); bench.report(`Moved to ${stage.value}.`, () => { company.stage = previousStage; refresh(); });
          };
          const stageValue = make('dd'); stageValue.append(stage, stageError); list.append(make('dt', 'Stage'), stageValue); details.append(list);
        } else if (tab === 'Financials') {
          const revenue = section('Revenue', 'Three reported years');
          const values: [string, number | null, number | null][] = [['FY23', company.priorRevenue, null], ['FY24', company.previousRevenue, company.priorRevenue], ['FY25', company.revenue, company.previousRevenue]];
          const maximum = Math.max(1, ...values.map(([,value]) => value ?? 0));
          for (const [label, value, previous] of values) {
            const delta = previous == null ? null : percentChange(value, previous);
            revenue.append(createMetricProgressRow(document, { label, meterLabel: `${label} revenue`, value, maximum, formattedValue: value == null ? '—' : euros(value), detail: delta == null ? '' : `${delta >= 0 ? '↗' : '↘'} ${signed(delta)}`, detailClassName: delta == null ? '' : delta >= 0 ? 'positive' : 'negative', className: 'scale-profile__financial-row' }));
          }
          const earnings = section('EBITDA', 'Earnings and margin');
          for (const [label, ebitda, rev] of [['FY24', company.previousEbitda, company.previousRevenue], ['FY25', company.margin == null ? null : company.revenue * company.margin / 100, company.revenue]] as const) {
            const row = make('div', '', 'scale-profile__earnings-row'); row.append(make('span', label), make('strong', ebitda == null ? '—' : euros(ebitda)), make('small', rev && ebitda != null ? `•  ${(ebitda / rev * 100).toFixed(1)}% margin` : '')); earnings.append(row);
          }
        } else {
          const hiring = section('Hiring', 'Q4 2024 to Q3 2026, one square a quarter');
          const heading = make('div', '', 'scale-profile__hiring-total'); heading.append(make('strong', company.staff == null ? 'None' : number(company.staff)), make('small', `${signed(company.staffGrowth)} in a year`)); hiring.append(heading);
          const track = make('div', '', 'scale-profile__quarters');
          for (const direction of quarterDirections(company.staffSeries)) track.append(make('span', '', direction == null ? 'unknown' : direction > 0 ? 'up' : direction < 0 ? 'down' : 'flat'));
          track.setAttribute('aria-label', 'Headcount trend by quarter');
          const legend = make('div');
          legendRoot = createRoot(legend);
          legendRoot.render(createElement(Legend, {
            label: 'Headcount changes',
            items: [
              { id: 'up', label: 'Hired', color: '#5eead4' },
              { id: 'flat', label: 'Held', color: '#d7d2da' },
              { id: 'down', label: 'Shrank', color: '#fda4af' },
            ],
          }));
          hiring.append(track, legend);
          const quarters = section('By Quarter', 'Headcount at quarter end');
          const labels = ['Q3 2024', 'Q4 2024', 'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026'];
          const maximum = Math.max(1, ...company.staffSeries.map(value => value ?? 0));
          for (let index = company.staffSeries.length - 1; index >= 0; index--) {
            const value = company.staffSeries[index]; const prior = index ? company.staffSeries[index - 1] : null;
            const delta = index ? percentChange(value, prior) : null;
            quarters.append(createMetricProgressRow(document, { label: labels[index], meterLabel: `${labels[index]} headcount`, value, maximum, formattedValue: value == null ? '—' : number(value), detail: delta == null ? '' : `${delta >= 0 ? '↗' : '↘'} ${signed(delta)}`, detailClassName: delta == null ? '' : delta >= 0 ? 'positive' : 'negative', className: 'scale-profile__financial-row' }));
          }
        }
      }

      showTab(active);
      const extra = make('div', '', 'scale-profile__footer-extra');
      const remove = button('Delete', () => removeRecord(bench, companies, company, company.label, refresh)); remove.className = 'scale-profile__delete'; remove.dataset.icon = 'trash';
      const exportButton = button('Export CSV', () => {
        const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const rows = [['Company', 'Province', 'City', 'Sector', 'Revenue FY23', 'Revenue FY24', 'Revenue FY25', 'EBITDA FY24', 'EBITDA FY25', 'Staff', 'Score'], [company.label, company.province, company.city, company.sectorName, company.priorRevenue, company.previousRevenue, company.revenue, company.previousEbitda, company.margin == null ? null : company.margin * company.revenue / 100, company.staff, score(company)]];
        const url = URL.createObjectURL(new Blob([rows.map(row => row.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })); const link = make('a'); link.href = url; link.download = `${company.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-index.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
      }); exportButton.dataset.icon = 'download'; extra.append(remove, exportButton);
      bench.form(company.label, [body], () => { edit(company, true); return false; }, extra, 'Edit',
        () => { releaseScreening(); legendRoot?.unmount(); tabControl.destroy(); },
        { cancel: false, submit: { icon: 'edit' }, close: { label: 'Close', className: 'scale-drawer-close' } });
    }

    function edit(company?: Company, fromView = false) {
      const name = input('Company name', company?.label); name.required = true;
      const city = input('City', company?.city); city.required = true;
      const focus = input('Focus', company?.focus);
      const founded = input('Founded', company ? String(company.founded) : '', 'number'); founded.required = true; founded.min = '1900'; founded.max = '2026'; founded.step = '1';
      const province = select('Province', provinces, company?.province ?? 'Utrecht');
      const sector = select('Sector', ['Energy', 'Food & Agri', 'Health', 'Industrial', 'Logistics', 'Mobility', 'Software', 'Water & Marine'], company?.sectorName ?? 'Software');
      const stage = select('Stage', ['Tracked', 'Shortlisted', 'In Talks', 'Passed'], company?.stage ?? 'Tracked');
      const revenue24 = input('Revenue FY24', company?.previousRevenue == null ? '' : String(company.previousRevenue / 1_000_000), 'number'); revenue24.min = '0.1'; revenue24.step = '0.1';
      const revenue25 = input('Revenue FY25', company ? String(company.revenue / 1_000_000) : '', 'number'); revenue25.min = '0.1'; revenue25.step = '0.1'; revenue25.required = true;
      const ebitda25 = input('EBITDA FY25', company?.margin == null ? '' : String(Math.round(company.revenue * company.margin / 100 / 1_000_000 * 10) / 10), 'number'); ebitda25.step = '0.1'; ebitda25.required = true;
      const staff = input('Staff', company?.staff == null ? '' : String(company.staff), 'number'); staff.min = '1'; staff.step = '1';
      const groups = new Map<Flag | 'Audited', string>();
      const choiceRoots: ReturnType<typeof createRoot>[] = [];
      const checks = make('div', '', 'scale-edit__checks');
      for (const [key, question] of [['Founder', 'Founder still leads it'], ['Exports', 'A quarter of sales abroad'], ['Raising', 'Open to a round in 12 months'], ['Audited', 'Audited FY25 accounts']] as const) {
        groups.set(key, key === 'Audited' ? company?.audited ?? 'N/A' : company?.screening[key] ?? 'N/A');
        const host = make('div');
        const root = createRoot(host);
        choiceRoots.push(root);
        const render = () => root.render(createElement(RadioGroup, {
          label: question, name: `company-check-${key}`, className: 'scale-edit__check',
          value: groups.get(key)!, options: answers.map(answer => ({ value: answer, label: answer })),
          onChange: (answer: string | number) => { if (typeof answer === 'string') { groups.set(key, answer); render(); } },
        }));
        render();
        checks.append(host);
      }
      const scorePreview = make('p', '', 'scale-score-preview');
      const updatePreview = () => {
        const revenue = revenue25.value === '' ? null : Number(revenue25.value) * 1_000_000;
        const previous = revenue24.value === '' ? null : Number(revenue24.value) * 1_000_000;
        const ebitda = ebitda25.value === '' ? null : Number(ebitda25.value) * 1_000_000;
        const value = indexScore(percentChange(revenue, previous), revenue && ebitda != null ? ebitda / revenue * 100 : null, revenue);
        scorePreview.textContent = value == null ? 'Not scored until FY24 and FY25' : `Index score ${value.toFixed(1)}`;
      };
      for (const control of [revenue24, revenue25, ebitda25]) control.addEventListener('input', updatePreview);
      updatePreview();
      const body = make('div', '', 'scale-edit'); body.append(make('p', company?.id ?? 'New company', 'scale-edit__subtitle'));
      const pair = (first: HTMLElement, second: HTMLElement) => { const row = make('div', '', 'scale-edit__pair'); row.append(first, second); return row; };
      const moneyField = (label: string, control: HTMLInputElement, hint = '') => {
        const wrapped = field(label, control); const box = make('div', '', 'scale-edit__money'); box.append(make('span', '€'), control, make('span', 'M')); wrapped.append(box); if (hint) wrapped.append(make('small', hint)); return wrapped;
      };
      const staffField = field('Staff', staff); staffField.append(make('small', 'Headcount at the end of Q3 2026.'));
      const error = make('p', '', 'scale-profile__error'); error.setAttribute('role', 'alert'); error.hidden = true;
      body.append(field('Name', name), pair(field('Province', province), field('City', city)), pair(field('Sector', sector), field('Focus', focus)), pair(field('Founded', founded), field('Stage', stage)), pair(moneyField('Revenue FY24', revenue24, 'Leave empty for a first year.'), moneyField('Revenue FY25', revenue25)), pair(moneyField('EBITDA FY25', ebitda25, 'A loss is negative.'), staffField), checks, scorePreview, error);
      const extra = fromView && company ? button('Back', () => showCompany(company)) : undefined;
      bench.form(company ? 'Edit Company' : 'Add Company', [body], () => {
        const key = (value: string) => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        if (!name.value.trim()) { error.textContent = 'Enter a company name.'; error.hidden = false; return false; }
        if (!city.value.trim()) { error.textContent = 'Enter a city.'; error.hidden = false; return false; }
        if (companies.some(item => item !== company && key(item.label) === key(name.value))) { error.textContent = 'Another company has this name.'; error.hidden = false; return false; }
        const answersByKey = Object.fromEntries(groups) as Record<Flag | 'Audited', string>;
        if (['Shortlisted', 'In Talks'].includes(stage.value) && Object.values(answersByKey).includes('No')) { error.textContent = 'Clear every No in the screen first.'; error.hidden = false; return false; }
        const revenue = Number(revenue25.value) * 1_000_000;
        const previousRevenue = revenue24.value === '' ? null : Number(revenue24.value) * 1_000_000;
        const ebitda = Number(ebitda25.value) * 1_000_000;
        const staffCount = staff.value === '' ? null : Number(staff.value);
        const series = company ? [...company.staffSeries] : [null, null, null, null, null, null, null, null, null];
        series[series.length - 1] = staffCount;
        const draft = {
          label: name.value.trim(), province: province.value, city: city.value.trim(), sectorName: sector.value,
          focus: focus.value.trim(), sector: `${focus.value.trim()}, ${city.value.trim()}`, founded: Number(founded.value), stage: stage.value,
          revenue, previousRevenue, margin: revenue ? ebitda / revenue * 100 : null, growth: percentChange(revenue, previousRevenue),
          staff: staffCount, staffSeries: series, staffGrowth: percentChange(staffCount, series.at(-5) ?? null),
          staffHistory: quarterDirections(series),
          screening: { Founder: answersByKey.Founder, Exports: answersByKey.Exports, Raising: answersByKey.Raising }, audited: answersByKey.Audited,
        };
        if (company) {
          const previous = structuredClone(company); Object.assign(company, draft); expanded.add(province.value); refresh();
          bench.report('Company saved.', () => { Object.assign(company, previous); refresh(); });
          if (fromView) { showCompany(company); return false; }
        } else {
          const created: Company = { ...draft, id: `co-new-${nextCompanyId++}`, priorRevenue: null, previousEbitda: null }; companies.push(created); expanded.add(province.value); refresh();
          bench.report('Company created.', () => { const index = companies.indexOf(created); if (index >= 0) companies.splice(index, 1); refresh(); });
          showCompany(created); return false;
        }
        return true;
      }, extra, company ? 'Save Changes' : 'Create Company',
        () => choiceRoots.forEach(root => root.unmount()),
        { close: { label: 'Close', className: 'scale-drawer-close' } });
    }

  },
};
