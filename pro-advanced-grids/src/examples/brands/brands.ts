import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { SegmentedSwitch } from '@revolist/ui/react';
import { badgeClassName, createRecordNavigation } from '@revolist/ui/native';
import sortIcon from '@fortawesome/fontawesome-free/svgs/solid/arrow-down-wide-short.svg?raw';
import boxIcon from '@fortawesome/fontawesome-free/svgs/solid/box.svg?raw';
import cubeIcon from '@fortawesome/fontawesome-free/svgs/solid/cube.svg?raw';
import chartIcon from '@fortawesome/fontawesome-free/svgs/solid/chart-simple.svg?raw';
import leafIcon from '@fortawesome/fontawesome-free/svgs/solid/leaf.svg?raw';
import mountainIcon from '@fortawesome/fontawesome-free/svgs/solid/mountain-sun.svg?raw';
import sunIcon from '@fortawesome/fontawesome-free/svgs/solid/sun.svg?raw';
import bookIcon from '@fortawesome/fontawesome-free/svgs/solid/book-open.svg?raw';
import starIcon from '@fortawesome/fontawesome-free/svgs/solid/star.svg?raw';
import { mountTabs } from '@revolist/ui/native';
import { createDetailPanel } from '../../../../composables/detail-panel';
import { demoColors } from '../../../../composables/demo-colors';
import { createMetricTileHistoryTooltip, METRIC_TILE_HISTORY_TOOLTIP } from '@revolist/revogrid-pro';
import '@revolist/revogrid-pro/styles.css';
import { renderColumnHeader, visualCellRenderer, type VisualCellPresentation } from '@revolist/revogrid-pro';
import { calendarField } from '../../shared/ui-calendar-field';
import { brandSpread } from './brand-spread';
import { brandRangeScale } from './brand-range';
import { brandStyleFixtures } from './brand-style-fixtures';
import { profitAxisMaximum, styleProfit, type BrandStyle } from './brand-style-model';
import { comparableGrowth } from './brand-growth';
import { initialBrands } from './brand-fixtures';
import { brandMonthFixtures } from './brand-month-fixtures';
import { monthlyMetric, type BrandMonth } from './brand-month-model';
import { scoreSection } from './brand-score';
import type { MergeData } from '@revolist/revogrid-pro';
import type { ColumnData, ColumnRegular, DataType } from '@revolist/revogrid';
import {
  button,
  cellAction,
  field,
  input,
  make,
  matches,
  money,
  number,
  removeRecord,
  select,
  personSelect,
  total,
  type Example,
} from '../../shared/workbench-ui';

const decisions = ['Grow', 'Hold', 'Trim', 'Exit'];
const ordinal = (value: number) => `${value}${value % 100 >= 11 && value % 100 <= 13 ? 'th' : value % 10 === 1 ? 'st' : value % 10 === 2 ? 'nd' : value % 10 === 3 ? 'rd' : 'th'}`;
const colors = [
  demoColors.purple, demoColors.fuchsia, demoColors.blue, demoColors.teal,
  demoColors.violet, demoColors.orange, demoColors.indigo, demoColors.pink,
];
// Use the same Font Awesome SVG geometry in headers, section leaders and details.
const brandMarks = [boxIcon, cubeIcon, chartIcon, leafIcon, mountainIcon, sunIcon, bookIcon, starIcon].map(svg => {
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1];
  const path = svg.match(/<path\b[^>]*\sd="([^"]+)"/)?.[1];
  if (!viewBox || !path) throw new Error('Invalid brand icon');
  return { viewBox, path };
});
const brandPct = (value: number) => `${value.toFixed(1)}%`;
const brandCurrency = (value: number) =>
  value >= 1e6
    ? `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2, roundingMode: 'halfEven' } as Intl.NumberFormatOptions).format(value / 1e6)}M`
    : value >= 1000
      ? `$${value < 100000 ? (value / 1000).toFixed(1) : Math.round(value / 1000)}k`
      : money(value);
const brandCount = (value: number) =>
  value >= 10000 ? `${(value / 1000).toFixed(1)}k` : number(Math.round(value));
const monthLabels = [
  'Oct',
  'Nov',
  'Dec',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
];
const metrics = [
  { group: 'Sales', key: 'sales', label: 'Net Sales', format: brandCurrency },
  { group: 'Sales', key: 'change', label: 'Growth on LY', format: brandPct },
  { group: 'Sales', key: 'orders', label: 'Orders', format: brandCount },
  { group: 'Sales', key: 'average', label: 'Average Order', format: money },
  { group: 'Margin', key: 'margin', label: 'Gross Margin', format: brandPct },
  {
    group: 'Margin',
    key: 'markdown',
    label: 'Markdown',
    format: brandPct,
    lower: true,
  },
  {
    group: 'Margin',
    key: 'returns',
    label: 'Return Rate',
    format: brandPct,
    lower: true,
  },
  {
    group: 'Margin',
    key: 'profitPerStyle',
    label: 'Profit per Style',
    format: brandCurrency,
  },
  {
    group: 'Customers',
    key: 'newCustomers',
    label: 'New Customers',
    format: brandCount,
  },
  { group: 'Customers', key: 'repeat', label: 'Repeat Orders', format: brandPct },
  { group: 'Customers', key: 'rating', label: 'Review Rating', format: number },
  { group: 'Stock', key: 'sellThrough', label: 'Sell-through', format: brandPct },
  { group: 'Stock', key: 'agedStock', label: 'Aged Stock', format: brandPct, lower: true },
  { group: 'Stock', key: 'stockCost', label: 'Stock at Cost', format: brandCurrency },
] as const;
type Metric = (typeof metrics)[number];
type Brand = {
  id: string;
  label: string;
  decision: string;
  color: string;
  months: number[];
  monthData: BrandMonth[];
  styleRecords: BrandStyle[];
  referenceId: string;
  tier: string;
  status: string;
  buyerId: string;
  hue: string;
  since: number;
  firstDrop: string | null;
  orders: number;
  margin: number;
  markdown: number;
  returns: number;
  repeat: number;
  styles: number;
  change: number;
  newCustomers: number;
  rating: number;
  sellThrough: number;
  units: number;
  stockUnits: number;
  stockCost: number;
  agedStock: number;
  isNew: boolean;
};

export const brandScorecard: Example = {
  id: 'brand-scorecard',
  title: 'Brand Portfolio Scorecard',
  description:
    'Compare brand performance, monthly ranges, and next-season decisions',
  setup(bench) {
    bench.grid.tooltip = {
      showDelayMs: 200, animation: true, anchorToTarget: true, anchorAlignment: 'center',
      renderContent: ({ content, type, document }) => type === METRIC_TILE_HISTORY_TOOLTIP ? createMetricTileHistoryTooltip(document, content) : undefined,
    };
    let nextId = 8;
    let reverse = false;
    const brands: Brand[] = initialBrands.map((fixture, index) => {
      const weights = monthLabels.map((_, month) => 18 + Math.sin(month + index * 0.2) * 7 + (month % 4));
      const sum = total(weights, (value) => value);
      return {
        ...fixture,
        id: `brand${index}`,
        color: colors[index],
        styleRecords: [...brandStyleFixtures[fixture.label as keyof typeof brandStyleFixtures].styles],
        referenceId: brandStyleFixtures[fixture.label as keyof typeof brandStyleFixtures].id,
        tier: brandStyleFixtures[fixture.label as keyof typeof brandStyleFixtures].tier,
        status: brandStyleFixtures[fixture.label as keyof typeof brandStyleFixtures].status,
        buyerId: brandStyleFixtures[fixture.label as keyof typeof brandStyleFixtures].buyerId,
        hue: brandStyleFixtures[fixture.label as keyof typeof brandStyleFixtures].hue,
        since: brandStyleFixtures[fixture.label as keyof typeof brandStyleFixtures].since,
        firstDrop: brandStyleFixtures[fixture.label as keyof typeof brandStyleFixtures].firstDrop,
        monthData: [...brandMonthFixtures[fixture.label]],
        rating: monthlyMetric(brandMonthFixtures[fixture.label], 'rating', fixture.styles) ?? fixture.rating,
        months: brandMonthFixtures[fixture.label].length ? brandMonthFixtures[fixture.label].map((month) => month.net) : weights.map((value) => fixture.sales * value / sum),
        sellThrough: fixture.units + fixture.stockUnits ? fixture.units / (fixture.units + fixture.stockUnits) * 100 : 0,
      };
    });
    const collapsed = new Set<string>();
    let view = 'Months';
    const chart = select(
      'Charted metric',
      metrics.map((metric) => metric.label),
      'Net Sales',
      (value) => { view = value === 'Profit per Style' ? 'Styles' : 'Months'; refresh(); },
    );
    const decision = select(
      'Season decision',
      ['All decisions', ...decisions],
      'All decisions',
      refresh,
    );
    let reviewOnly = false;
    const reviewQueue = button('Review trim & exit', () => { reviewOnly = !reviewOnly; refresh(); });
    reviewQueue.dataset.toolbar = 'search';
    const modes = make('div');
    const modesRoot = createRoot(modes);
    const renderModes = () => modesRoot.render(createElement(SegmentedSwitch, {
      value: view, role: 'group', ariaLabel: 'Scorecard view',
      options: ['Months', 'Styles'].map(mode => ({ value: mode, label: mode, buttonAttributes: { 'data-icon': mode === 'Months' ? 'bar-chart' : 'cube' } })),
      onChange: (mode: string | number) => {
        if (mode !== 'Months' && mode !== 'Styles') return;
        view = mode;
        chart.value = mode === 'Styles' ? 'Profit per Style' : 'Net Sales';
        refresh();
      },
    }));
    bench.onDispose(() => modesRoot.unmount());
    bench.heading.append(
      modes,
      button('Add Brand', () => edit(), true),
    );
    bench.toolbar.append(decision, reviewQueue);
    bench.grid.rowDefinitions = [{ type: 'rowPinStart', index: 0, size: 140 }];
    bench.onSearch(refresh);
    bench.onCompactChange(refresh);
    refresh();

    function read(brand: Brand, key: Metric['key']): number {
      if (key === 'sales') return total(brand.months, (value) => value);
      if (key === 'profitPerStyle')
        return brand.styles
          ? (read(brand, 'sales') * brand.margin / 100 - brand.orders * 9.4 - brand.units * brand.returns / 100 * 6.8) / brand.styles
          : 0;
      if (key === 'average')
        return brand.orders ? read(brand, 'sales') / brand.orders : 0;
      return brand[key];
    }

    function aggregate(items: Brand[], metric: Metric) {
      if (metric.key === 'average') {
        const orders = total(items, (brand) => brand.orders);
        return orders
          ? total(items, (brand) => read(brand, 'sales')) / orders
          : 0;
      }
      const active = items.filter((brand) => read(brand, 'sales') > 0);
      if (metric.key === 'change') {
        return comparableGrowth(
          active.map((brand) => ({
            sales: read(brand, 'sales'),
            change: brand.change,
            isNew: brand.isNew,
          })),
        );
      }
      if (metric.key === 'profitPerStyle') {
        const styles = total(active, (brand) => brand.styles);
        return styles ? total(active, (brand) => read(brand, metric.key) * brand.styles) / styles : 0;
      }
      if (metric.key === 'sellThrough') {
        const units = total(active, (brand) => brand.units);
        const stock = total(active, (brand) => brand.stockUnits);
        return units + stock ? units / (units + stock) * 100 : 0;
      }
      if (['margin', 'markdown', 'returns', 'repeat', 'rating', 'agedStock'].includes(metric.key)) {
        const weight = (brand: Brand) => metric.key === 'margin' ? read(brand, 'sales')
          : metric.key === 'markdown' ? read(brand, 'sales') / (1 - brand.markdown / 100)
          : metric.key === 'returns' ? brand.units
          : metric.key === 'agedStock' ? brand.stockUnits
          : metric.key === 'rating' ? total(brand.monthData, (month) => month.reviews) : brand.orders;
        const denominator = total(active, weight);
        return denominator ? total(active, (brand) => read(brand, metric.key) * weight(brand)) / denominator : 0;
      }
      return total(active, (brand) => read(brand, metric.key));
    }

    function matchesDecision(brand: Brand) {
      return matches(bench.currentQuery(), brand.label, brand.decision) &&
        (decision.value === 'All decisions' || brand.decision === decision.value);
    }
    function inReviewQueue(brand: Brand) { return brand.decision === 'Trim' || brand.decision === 'Exit'; }

    function refresh() {
      const selected =
        metrics.find((metric) => metric.label === chart.value) ?? metrics[0];
      renderModes();
      const matching = brands.filter(matchesDecision);
      const reviewCount = matching.filter(inReviewQueue).length;
      const count = make('span', String(reviewCount));
      count.className = badgeClassName({ variant: 'neutral', shape: 'rounded' });
      reviewQueue.replaceChildren(document.createTextNode('Review trim & exit '), count);
      reviewQueue.setAttribute('aria-label', `Review trim and exit calls, ${reviewCount} ${reviewCount === 1 ? 'brand' : 'brands'}`);
      reviewQueue.setAttribute('aria-pressed', String(reviewOnly));
      const visible = matching.filter(brand => !reviewOnly || inReviewQueue(brand));
      if (reverse)
        visible.sort((a, b) => read(b, selected.key) - read(a, selected.key));
      const active = visible.filter((brand) => read(brand, 'sales') > 0);
      const allStyles = active.flatMap(brand => brand.styleRecords);
      const profitMaximum = profitAxisMaximum(allStyles);
      const monthlyPoints = (brand: Brand) => brand.monthData.length
        ? brand.monthData.flatMap((month, index) => { const value = monthlyMetric([month], selected.key, brand.styles); return value === null ? [] : [{ value, index }]; })
        : brand.months.map((value, index) => ({ value: selected.key === 'sales' ? value : (read(brand, selected.key) * value) / (read(brand, 'sales') / 12), index }));
      const rangeScale = brandRangeScale(active.flatMap(brand => monthlyPoints(brand).map(point => point.value)), selected.key === 'markdown' ? 45 : undefined);
      const bestProfit = Math.max(0, ...allStyles.map(styleProfit));
      const maxOrders = Math.max(1, ...allStyles.map(style => style.orders));
      const monthlyPortfolio = monthLabels.flatMap((month, index) => {
        const data = active.flatMap((brand) => brand.monthData[index] ? [brand.monthData[index]] : []);
        const value = monthlyMetric(data, selected.key, total(active, (brand) => brand.styles));
        return value === null ? [] : [{ month, value }];
      });
      const orderedMonths = monthlyPortfolio.slice().sort((a, b) => a.value - b.value);
      const mid = Math.floor(orderedMonths.length / 2);
      const monthlyMedian = orderedMonths.length % 2 ? orderedMonths[mid]?.value
        : orderedMonths.length ? (orderedMonths[mid - 1].value + orderedMonths[mid].value) / 2 : null;
      const compact = window.matchMedia('(max-width: 650px)').matches;
      const ranges: MergeData[] = [];
      const sections = [...new Set(metrics.map(({ group }) => group))];
      const steps: Partial<Record<Metric['key'], number>> = {
        change: 5, average: 8, margin: 3, markdown: 3, returns: 2,
        profitPerStyle: 40000, repeat: 4, rating: 0.15, sellThrough: 5, agedStock: 4,
      };
      const sectionRanks = new Map(sections.map((group) => {
        const comparable = metrics.filter((metric) => metric.group === group && steps[metric.key]);
        const ranked = active.map((brand) => ({
          brand,
          score: scoreSection(comparable.map((metric) => ({
            value: metric.key === 'change' && brand.isNew ? null : read(brand, metric.key),
            portfolio: aggregate(active, metric),
            step: steps[metric.key]!,
            lower: 'lower' in metric && metric.lower,
          }))),
        })).filter((entry) => entry.score !== null).sort((a, b) => b.score! - a.score!);
        return [group, ranked] as const;
      }));
      const overallRanks = active.map((brand) => ({
        brand,
        score: scoreSection(metrics.filter((metric) => steps[metric.key]).map((metric) => ({
          value: metric.key === 'change' && brand.isNew ? null : read(brand, metric.key),
          portfolio: aggregate(active, metric),
          step: steps[metric.key]!,
          lower: 'lower' in metric && metric.lower,
        }))),
      })).filter((entry) => entry.score !== null).sort((a, b) => b.score! - a.score!);
      if (!reverse) {
        const rankOf = (brand: Brand) => { const index = overallRanks.findIndex((entry) => entry.brand === brand); return index < 0 ? Number.POSITIVE_INFINITY : index; };
        visible.sort((a, b) => rankOf(a) - rankOf(b));
      }
      let start = 0;
      const rows = sections.flatMap((group) => {
        const metricsInGroup = metrics.filter(
          (metric) => metric.group === group,
        );
        const open = !collapsed.has(group);
        if (open && !compact) ranges.push({ row: start, rowSpan: metricsInGroup.length + 1, column: 0, colType: 'colPinStart' });
        start += open ? metricsInGroup.length + 1 : 1;
        return [
          { label: `${group} rank`, group, expanded: open, ranking: true },
          ...(open
            ? metricsInGroup.map((metric) => ({
                label: metric.label,
                metric,
                portfolio: aggregate(visible, metric),
                ...Object.fromEntries(
                  visible.map((brand) => [brand.id, read(brand, metric.key)]),
                ),
              }))
            : []),
        ];
      });
      if (!compact) ranges.push({ row: 0, column: 0, colSpan: 2, rowType: 'rowPinStart', colType: 'colPinStart' });
      const toggle = (section: string) => {
        if (collapsed.has(section)) collapsed.delete(section);
        else collapsed.add(section);
        refresh();
      };
      const portfolioSummary = (): VisualCellPresentation => ({
        kind: 'summary', className: 'brand-portfolio', label: compact ? undefined : 'Portfolio',
        value: brandCurrency(total(active, brand => read(brand, 'sales'))),
        parts: { label: 'brand-portfolio-name', value: 'brand-portfolio-amount', axis: 'brand-axis' },
        items: [
          { label: 'On LY', value: `${aggregate(active, metrics[1]) > 0 ? '+' : ''}${brandPct(aggregate(active, metrics[1]))}` },
          { label: 'Margin', value: brandPct(aggregate(active, metrics[4])) },
          { label: 'Returns', value: brandPct(aggregate(active, metrics[6])) },
          { label: 'Sell-through', value: active.length ? brandPct(aggregate(active, metrics.find(metric => metric.key === 'sellThrough')!)) : '–' },
        ],
        axis: view === 'Styles' ? [profitMaximum, profitMaximum * 2 / 3, profitMaximum / 3, 0].map(brandCurrency) : rangeScale.ticks.map(selected.format),
      });
      const sectionPresentation = (model: DataType): VisualCellPresentation | undefined => {
        if (model.band) return portfolioSummary();
        if (model.call) return { kind: 'text', text: 'Section' };
        if (model.overall) return { kind: 'empty', className: 'brand-overall-rail' };
        if (!model.group) return;
        const ordered = sectionRanks.get(model.group) ?? [];
        const leading = ordered[0]?.brand, trailing = ordered[ordered.length - 1]?.brand;
        const ahead = ordered.filter(({ score }) => score! >= 1).length;
        return { kind: 'section', className: `${model.expanded ? 'brand-section' : 'brand-section-compact'} ${String(model.group).toLowerCase()}`, ...(model.expanded ? {} : { layout: 'compact' as const }), parts: { action: 'cell-action', leaders: 'brand-leaders', symbol: 'brand-leader-symbol' },
          title: model.expanded ? String(model.group).toUpperCase() : String(model.group), label: 'Beat the portfolio', value: `${ahead} of ${ordered.length}`, expanded: !!model.expanded, actionLabel: `${model.expanded ? 'Collapse' : 'Expand'} ${model.group}`,
          ...(leading && trailing ? { leaders: [ { rank: '1st', label: leading.label, color: leading.color, ...brandMarks[brands.indexOf(leading) % brandMarks.length], filled: true }, { rank: ordinal(active.length), label: trailing.label, color: trailing.color, ...brandMarks[brands.indexOf(trailing) % brandMarks.length], filled: true } ] } : {}),
        };
      };
      const labelPresentation = (model: DataType): VisualCellPresentation | undefined => {
        if (model.band) return compact ? portfolioSummary() : undefined;
        if (model.call) return { kind: 'text', text: 'Next season call' };
        if (model.overall) return { kind: 'text', className: 'brand-overall-label', text: 'Overall rank', ...(compact ? {} : { detail: 'All rates' }) };
        if (model.group && compact) return { kind: 'text', text: model.label, expanded: !!model.expanded, actionLabel: `${model.expanded ? 'Collapse' : 'Expand'} ${model.group}`, parts: { action: 'cell-action' } };
        return { kind: 'text', text: model.label, element: model.ranking ? 'strong' : 'span' };
      };
      const brandPresentation = (brand: Brand, model: DataType): VisualCellPresentation | undefined => {
        const sold = read(brand, 'sales');
        if (model.band) {
          if (view === 'Styles') {
            if (!brand.styleRecords.length) return { kind: 'text', className: 'brand-no-sales', text: 'No sales' };
            return { kind: 'bubbles', className: 'brand-style-chart', label: `${brand.label} profit by style`, points: brand.styleRecords.map((style, index) => {
              const profit = styleProfit(style);
              return { tone: profit < 0 ? 'negative' : 'positive', title: `${style.name}: ${profit < 0 ? '−' : ''}${brandCurrency(Math.abs(profit))} profit; ${number(Math.round(style.orders))} orders`, tooltip: { title: style.name, subtitle: brand.label, rows: [{ label: 'Profit', value: `${profit < 0 ? '−' : ''}${brandCurrency(Math.abs(profit))}` }, { label: 'Orders', value: number(Math.round(style.orders)) }] }, x: [50, 43, 58, 50, 63, 45, 56, 50][index % 8], y: Math.max(4, Math.min(95, 20 + profit / profitMaximum * 60)), size: 7 + Math.sqrt(style.orders / maxOrders) * 7 };
            }) };
          }
          if (!sold) return { kind: 'text', className: 'brand-no-sales', text: 'No sales' };
          const points = monthlyPoints(brand);
          if (!points.length) return { kind: 'text', className: 'brand-no-sales', text: 'No data' };
          const sorted = points.slice().sort((a, b) => a.value - b.value), middle = Math.floor(sorted.length / 2);
          const median = sorted.length % 2 ? sorted[middle].value : (sorted[middle - 1].value + sorted[middle].value) / 2;
          const low = sorted[0], high = sorted[sorted.length - 1];
          const month = (index: number) => `${monthLabels[index]} ${index < 3 ? 2025 : 2026}`;
          const positions = [low.value, median, high.value].map(rangeScale.position) as [number, number, number];
          return { kind: 'range', className: 'brand-range', color: brand.color, label: `${brand.label} monthly range for ${selected.label}`, values: positions,
            tooltip: { title: brand.label, subtitle: `${selected.label} by month`, rows: [
              { label: `Highest, ${month(high.index)}`, value: selected.format(high.value), color: brand.color },
              { label: 'Median month', value: selected.format(median), color: brand.color, filled: true },
              { label: `Lowest, ${month(low.index)}`, value: selected.format(low.value), color: brand.color },
            ] },
          };
        }
        if (model.call) return { kind: 'decision', className: 'brand-call', parts: { action: 'cell-action' }, text: brand.decision, badgeClassName: `call-${brand.decision.toLowerCase()}`, tone: brand.decision === 'Grow' ? 'positive' : brand.decision === 'Trim' ? 'warning' : brand.decision === 'Exit' ? 'negative' : 'neutral', actionLabel: `${brand.label} actions` };
        if (!sold) return { kind: 'text', className: 'brand-no-sales', text: '–' };
        if (model.overall) {
          const index = overallRanks.findIndex(entry => entry.brand === brand);
          if (index < 0) return;
          const rank = index + 1, suffix = rank % 100 >= 11 && rank % 100 <= 13 ? 'th' : rank % 10 === 1 ? 'st' : rank % 10 === 2 ? 'nd' : rank % 10 === 3 ? 'rd' : 'th';
          return { kind: 'text', className: `brand-overall-rank rank-${Math.min(rank, 4)}`, text: `${rank}${suffix}` };
        }
        const metric = model.metric as Metric | undefined;
        if (!metric) {
          const rank = (sectionRanks.get(String(model.group) as Metric['group']) ?? []).findIndex(entry => entry.brand === brand) + 1;
          const suffix = rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th';
          return { kind: 'text', className: `metric-number brand-section-rank ${rank === 1 ? 'brand-rank-best' : rank === active.length ? 'brand-rank-worst' : ''}`, text: `${rank}${suffix}` };
        }
        const value = model[brand.id] as number;
        if (metric.key === 'change') return { kind: 'text', className: `brand-value ${brand.isNew ? 'brand-new' : value > 0 ? 'brand-change-up' : value < 0 ? 'brand-change-down' : ''}`, text: brand.isNew ? 'New' : `${value > 0 ? '+' : ''}${brandPct(value)}` };
        const benchmark = ['sales', 'orders', 'newCustomers'].includes(metric.key) ? model.portfolio / Math.max(1, active.length) : model.portfolio;
        const difference = steps[metric.key] ? (value - benchmark) / steps[metric.key]! * ('lower' in metric ? -1 : 1) : 0;
        const highlighted = ['average', 'margin', 'markdown', 'returns', 'profitPerStyle', 'repeat', 'rating', 'sellThrough', 'agedStock'].includes(metric.key);
        return { kind: 'text', className: `brand-value ${highlighted && Math.abs(difference) >= 1 ? (difference > 0 ? 'good' : 'bad') : ''} ${highlighted && Math.abs(difference) >= 2 ? 'strong' : ''}`, text: metric.format(value) };
      };
      const columns: ColumnData = [
        ...(!compact ? [{ prop: 'group', name: 'Section', size: 148, pin: 'colPinStart', columnTemplate: () => undefined, cellTemplate: visualCellRenderer, visualCell: { format: (_value: unknown, model: DataType) => sectionPresentation(model), onActivate: (model: DataType) => toggle(model.group) } } as ColumnRegular] : []),
        { prop: 'label', name: 'Next season call', size: compact ? 107 : 234, pin: 'colPinStart', columnTemplate: h => h('span', { class: 'brand-metric-label' }, selected.label), cellTemplate: visualCellRenderer, visualCell: { format: (_value, model) => labelPresentation(model), onActivate: model => toggle(model.group) } },
        {
          prop: 'portfolio', name: 'Portfolio', size: 84, pin: 'colPinStart', columnType: 'number',
          columnTemplate: h => renderColumnHeader(h, { className: 'brand-column-summary', label: 'Portfolio', subtitle: `${visible.length} brands` }),
          cellTemplate: visualCellRenderer,
          visualCell: { format: (_value, model) => {
            if (model.ranking) return { kind: 'empty', className: 'brand-empty-rank' };
            if (model.overall) return { kind: 'empty', className: 'brand-empty-hatch', hatch: true };
            if (model.band && view === 'Styles') return { kind: 'stat-list', className: 'brand-month-summary', items: [{ label: 'Styles', value: String(allStyles.length) }, { label: 'At a loss', value: String(allStyles.filter(style => styleProfit(style) < 0).length) }, { label: 'Best style', value: allStyles.length ? brandCurrency(bestProfit) : '–' }] };
            if (model.band) return orderedMonths.length && monthlyMedian !== null ? { kind: 'stat-list', className: 'brand-month-summary', items: [{ label: `Highest, ${orderedMonths[orderedMonths.length - 1].month}`, value: selected.format(orderedMonths[orderedMonths.length - 1].value) }, { label: 'Median', value: selected.format(monthlyMedian) }, { label: `Lowest, ${orderedMonths[0].month}`, value: selected.format(orderedMonths[0].value) }] } : { kind: 'text', element: 'small', text: 'No data' };
            return model.metric ? { kind: 'text', element: 'strong', className: 'metric-number', text: `${model.metric.key === 'change' && model.portfolio > 0 ? '+' : ''}${model.metric.format(model.portfolio)}` } : undefined;
          } },
        },
        ...visible.map((brand): ColumnRegular => ({
          prop: brand.id, name: brand.label, size: 78, columnType: 'number',
            columnTemplate(h) {
              return h(
                'div',
                { class: 'brand-heading', style: { '--brand': brand.color } },
                [
                  h(
                    'svg',
                    {
                      class: 'brand-symbol',
                      viewBox: brandMarks[brands.indexOf(brand) % brandMarks.length].viewBox,
                      fill: 'currentColor',
                      'aria-hidden': 'true',
                    },
                    [
                      h('path', {
                        d: brandMarks[
                          brands.indexOf(brand) % brandMarks.length
                        ].path,
                      }),
                    ],
                  ),
                  cellAction(h, `Open ${brand.label}`, brand.label.split(' ')[0], () =>
                    showBrand(brand),
                  ),
                ],
              );
            },
            cellTemplate: visualCellRenderer,
            visualCell: { format: (_value, model) => brandPresentation(brand, model), onActivate: () => edit(brand) },
        })),
        {
          prop: 'spread', name: 'Spread', size: 124,
          columnTemplate: h => renderColumnHeader(h, { className: 'brand-column-summary', label: 'Spread', subtitle: 'Right is best' }),
          cellTemplate: visualCellRenderer,
          visualCell: { format: (_value, model) => {
            if (model.call) return { kind: 'text', element: 'small', text: 'Weaker        Stronger' };
            if (model.ranking || model.overall || model.band) return { kind: 'empty', className: 'brand-empty-hatch', hatch: true };
            if (!model.metric || !active.length) return;
            const metric = model.metric as Metric;
            const sizeMetric = ['sales', 'orders', 'newCustomers', 'stockCost'].includes(metric.key);
            const result = brandSpread(active.map(brand => ({ value: metric.key === 'change' && brand.isNew ? null : Number(model[brand.id]), sales: read(brand, 'sales') })), sizeMetric ? null : Number(model.portfolio), 'lower' in metric && metric.lower, ['change', 'profitPerStyle'].includes(metric.key));
            if (!result) return;
            return { kind: 'strip', options: { label: 'Relative position of each brand', domain: { min: 0, max: 1 }, reference: result.portfolio ?? undefined, zero: result.zero ?? undefined, points: result.points.map(point => { const brand = active[point.index]; return { value: point.position, size: point.size, color: `color-mix(in srgb, ${brand.color} 40%, var(--rv-ui-surface))`, borderColor: brand.color, title: `${brand.label} · ${metric.format(Number(model[brand.id]))}` }; }) } };
          } },
        },
      ];
      bench.setSubtitle(
        `Oct 2025 to Sep 2026 • ${visible.length} ${visible.length === 1 ? 'brand' : 'brands'} • ${total(visible, (brand) => brand.styles)} styles`,
      );
      bench.stats([]);
      bench.summary.hidden = false;
      bench.summary.classList.add('brand-chart-controls');
      const sort = button('Rank brands', () => {
        reverse = !reverse;
        refresh();
      });
      sort.innerHTML = sortIcon;
      sort.querySelector('svg')?.setAttribute('aria-hidden', 'true');
      sort.setAttribute('aria-label', 'Rank brands by ' + selected.label);
      bench.summary.append(chart, sort);
      bench.mergeCells(ranges);
      bench.render(
        columns,
        visible.length ? (compact ? [...rows, { overall: true }] : rows) : [],
        visible.length ? [{ band: true }, { call: true }] : [],
        visible.length && !compact ? [{ overall: true }] : [],
      );
    }

    const buyers: Record<string, string> = { lucas: 'Rafael Costa', ingrid: 'Freya Lindholm', amara: 'Maya Bennett', hana: 'Keira Voss', diego: 'Mateo Rivas' };
    const hueColors: Record<string, string> = { blue: colors[0], fuchsia: colors[1], teal: colors[2], lime: colors[3], violet: colors[4], orange: colors[5], slate: colors[6], amber: colors[7] };
    const callNotes: Record<string, string> = { Grow: 'Buy deeper next season.', Hold: 'Buy as this season.', Trim: 'Buy less next season.', Exit: 'Sell through with no new buy.' };
    type BrandTab = 'Overview' | 'Styles' | 'Months' | 'Details';
    const metricSteps: Partial<Record<Metric['key'], number>> = { change: 5, average: 8, margin: 3, markdown: 3, returns: 2, profitPerStyle: 40000, repeat: 4, rating: 0.15, sellThrough: 5, agedStock: 4 };
    const metricValue = (metric: Metric, value: number) => `${metric.key === 'change' && value > 0 ? '+' : ''}${metric.format(value)}`;
    function showBrand(brand: Brand, active: BrandTab = 'Overview') {
      const visible = brands.filter(item => matchesDecision(item) && (!reviewOnly || inReviewQueue(item)));
      if (reverse) visible.sort((a, b) => read(b, (metrics.find(metric => metric.label === chart.value) ?? metrics[0]).key) - read(a, (metrics.find(metric => metric.label === chart.value) ?? metrics[0]).key));
      if (!visible.includes(brand)) visible.push(brand);
      const position = visible.indexOf(brand);
      const body = make('div', '', 'scale-profile brand-profile');
      const head = make('div', '', 'scale-profile__heading');
      const meta = make('div', '', 'scale-profile__meta'); meta.append(make('span', brand.referenceId, 'scale-profile__id'));
      const navigation = createRecordNavigation(document, {
        index: position, count: visible.length, label: `${position + 1} of ${visible.length}`,
        previousLabel: 'Previous brand', nextLabel: 'Next brand', className: 'scale-profile__navigation', previousText: '‹', nextText: '›',
        onPrevious: () => showBrand(visible[position - 1], active),
        onNext: () => showBrand(visible[position + 1], active),
      });
      meta.append(navigation);
      const heading = make('div', '', 'scale-profile__name');
      const mark = brandMarks[Math.max(0, brands.indexOf(brand)) % brandMarks.length];
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', mark.viewBox); svg.setAttribute('aria-hidden', 'true'); svg.classList.add('brand-profile__mark'); svg.style.color = brand.color;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', mark.path); svg.append(path);
      heading.append(svg, make('strong', brand.label), make('span', brand.status, 'scale-profile__stage'), make('span', brand.decision, `scale-profile__stage ${brand.decision === 'Grow' ? 'active' : ''}`));
      head.append(meta, heading, make('p', `${brand.tier}  •  ${buyers[brand.buyerId] ?? ''}  •  Since ${brand.since}`, 'scale-profile__location'));
      const tabs = make('div');
      const panel = make('div', '', 'scale-profile__content'); panel.setAttribute('role', 'tabpanel'); panel.id = `brand-panel-${brand.id}`;
      const names: BrandTab[] = ['Overview', 'Styles', 'Months', 'Details'];
      const tabOptions = names.map(name => ({ value: name, label: name, id: `brand-${brand.id}-${name}`, ariaControls: panel.id }));
      const tabProps = (value: BrandTab) => ({ value, options: tabOptions, onChange: showTab, ariaLabel: 'Brand details', className: 'scale-profile__tabs rv-tabs--underline' });
      const tabControl = mountTabs(tabs, tabProps(active));
      const controls = [...tabs.querySelectorAll<HTMLButtonElement>('[role=tab]')];
      body.append(head, tabs, panel);
      let callRoot: ReturnType<typeof createRoot> | undefined;
      const disposeCall = () => { callRoot?.unmount(); callRoot = undefined; };
      const section = (title: string, subtitle: string) => { const { card, body } = createDetailPanel(title, subtitle, { card: 'scale-profile__section', heading: 'scale-profile__section-heading', body: 'scale-profile__section-content' }); panel.append(card); return body; };
      const table = (label: string, headings: string[]) => { const result = make('table', '', 'brand-profile__table'); result.setAttribute('aria-label', label); const thead = make('thead'), tr = make('tr'); headings.forEach(name => tr.append(make('th', name))); thead.append(tr); result.append(thead); return result; };
      function showTab(tab: BrandTab) {
        active = tab; tabControl.update(tabProps(tab)); disposeCall(); panel.replaceChildren(); panel.setAttribute('aria-labelledby', controls[names.indexOf(tab)].id);
        controls.forEach((control, index) => { const selected = names[index] === tab; control.setAttribute('aria-selected', String(selected)); control.tabIndex = selected ? 0 : -1; });
        if (tab === 'Overview') {
          const call = section('Buy Call', "Next season's buy");
          const group = make('div');
          callRoot = createRoot(group);
          callRoot.render(createElement(SegmentedSwitch, {
            role: 'group', ariaLabel: 'Next season call', className: 'brand-profile__calls',
            value: brand.decision, options: decisions.map(value => ({ value, label: value })),
            onChange: (choice: string | number) => {
              if (typeof choice !== 'string' || brand.decision === choice) return;
              const previous = brand.decision;
              brand.decision = choice;
              refresh();
              showBrand(brand, 'Overview');
              bench.report(`Buy call set to ${choice}.`, () => { brand.decision = previous; refresh(); });
            },
          }));
          call.append(group, make('small', callNotes[brand.decision], 'brand-profile__call-note'));
          const content = section('Against the Portfolio', 'Oct 2025 to Sep 2026, brands in view'); const grid = table(`${brand.label} against the portfolio on every line`, ['Line', 'Brand', 'Portfolio', 'Standing']); const tbody = make('tbody');
          for (const groupName of [...new Set(metrics.map(metric => metric.group))]) {
            const groupRow = make('tr', '', 'brand-profile__group-row'); const title = make('td', groupName); title.colSpan = 4; groupRow.append(title); tbody.append(groupRow);
            for (const metric of metrics.filter(item => item.group === groupName)) {
              const row = make('tr'); const value = read(brand, metric.key), portfolio = aggregate(visible, metric), step = metricSteps[metric.key];
              const hasData = read(brand, 'sales') > 0 && !(metric.key === 'change' && brand.isNew);
              let label = 'Size line', klass = 'muted';
              if (!hasData) label = metric.key === 'change' && brand.isNew && read(brand, 'sales') ? 'New' : 'No sales';
              else if (step) { const difference = (value - portfolio) * ('lower' in metric && metric.lower ? -1 : 1); label = difference >= step ? 'Ahead' : difference <= -step ? 'Behind' : 'Close'; klass = label.toLowerCase(); }
              row.append(make('td', metric.label), make('td', hasData ? metricValue(metric, value) : '–'), make('td', metricValue(metric, portfolio)), make('td', label, klass)); tbody.append(row);
            }
          }
          grid.append(tbody); content.append(grid);
        } else if (tab === 'Styles') {
          const records = brand.styleRecords; const losses = records.filter(style => styleProfit(style) < 0).length;
          const chart = section('Profit by Style', `${records.length} styles, ${losses} at a loss, sized by orders`);
          if (!records.length) chart.append(make('p', 'No styles yet.', 'brand-profile__empty'));
          else {
            const orderedCategories = ['Footwear', 'Jackets', 'Base Layers', 'Packs', 'Accessories', 'Camp', 'Climb'];
            const categories = [...new Set(records.map(style => style.category))].sort((a, b) => { const ai = orderedCategories.indexOf(a), bi = orderedCategories.indexOf(b); return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a.localeCompare(b); });
            const minimum = Math.min(0, ...records.map(styleProfit)) * 1.2; const maximum = Math.max(1, ...records.map(styleProfit)) * 1.1; const extent = maximum - minimum; const zero = -minimum / extent * 100; const maxOrders = Math.max(1, ...records.map(style => style.orders));
            const signedProfit = (value: number) => `${value < 0 ? '−' : ''}${brandCurrency(Math.abs(value))}`;
            for (const category of categories) { const items = records.filter(style => style.category === category).sort((a,b) => styleProfit(a) - styleProfit(b)); const row = make('div', '', 'brand-profile__category'); const track = make('div', '', 'brand-profile__category-track'); track.style.setProperty('--zero', `${zero}%`);
              for (const style of items) { const point = make('i', '', styleProfit(style) < 0 ? 'loss' : 'profit'); point.style.left = `${Math.max(0, Math.min(100, (styleProfit(style) - minimum) / extent * 100))}%`; const size = 7 + Math.sqrt(style.orders / maxOrders) * 8; point.style.width = point.style.height = `${size}px`; point.title = `${style.name}: ${signedProfit(styleProfit(style))}`; track.append(point); }
              row.append(make('span', category), make('small', signedProfit(styleProfit(items[0]))), track, make('strong', signedProfit(styleProfit(items[items.length - 1])))); chart.append(row); }
            chart.append(make('div', 'Loses money                         Makes money', 'brand-profile__legend'));
          }
          const content = section('Every Style', 'Contribution, best first'); const grid = table(`${brand.label} styles`, ['Style', 'Net Sales', 'Orders', 'Profit']); const tbody = make('tbody');
          for (const style of records.slice().sort((a,b) => styleProfit(b) - styleProfit(a))) { const tr = make('tr'); const cell = make('td'); cell.append(make('span', style.name), make('small', style.category)); const profit = styleProfit(style); tr.append(cell, make('td', brandCurrency(style.net)), make('td', number(Math.round(style.orders))), make('td', `${profit < 0 ? '−' : ''}${brandCurrency(Math.abs(profit))}`, profit < 0 ? 'behind' : '')); tbody.append(tr); } grid.append(tbody); content.append(grid);
        } else if (tab === 'Months') {
          const content = section('Every Month', 'Oct 2025 to Sep 2026');
          if (!brand.monthData.length || !read(brand, 'sales')) content.append(make('p', 'No sales yet.', 'brand-profile__empty'));
          else { const grid = table(`${brand.label} by month`, ['Month', 'Net Sales', 'Growth on LY', 'Gross Margin', 'Markdown']); const tbody = make('tbody');
            brand.monthData.forEach((data, index) => { const row = make('tr'); row.append(make('td', `${monthLabels[index]} ${index < 3 ? 2025 : 2026}`)); for (const key of ['sales', 'change', 'margin', 'markdown'] as const) { const value = monthlyMetric([data], key, brand.styles); const metric = metrics.find(item => item.key === key)!; row.append(make('td', value == null ? '–' : metricValue(metric, value))); } tbody.append(row); }); grid.append(tbody); content.append(grid); }
        } else {
          const content = section('Details', 'Who buys it and what it sells'); const list = make('dl', '', 'scale-profile__details');
          const categories = [...new Set(brand.styleRecords.map(style => style.category))];
          for (const [label, value] of [['Brand code', brand.referenceId], ['Tier', brand.tier], ['Status', brand.status], ['Buy call', brand.decision], ['Buyer', buyers[brand.buyerId] ?? ''], ['Stocked since', String(brand.since)], ['Styles', `${brand.styleRecords.length} styles`], ['Categories', categories.join(', ') || 'None'], ['Last year', brand.isNew ? 'New' : `${brand.change > 0 ? '+' : ''}${brandPct(brand.change)} on net sales`]]) list.append(make('dt', label), make('dd', value)); content.append(list);
        }
      }
      showTab(active);
      const extra = make('div', '', 'scale-profile__footer-extra'); const remove = button('Remove', () => removeRecord(bench, brands, brand, brand.label, refresh)); remove.classList.add('rv-btn-danger', 'scale-profile__delete'); remove.dataset.icon = 'trash';
      const exportButton = button('Export CSV', () => { const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`; const rows = [['Metric', 'Brand', 'Portfolio'], ...metrics.map(metric => [metric.label, read(brand, metric.key), aggregate(visible, metric)])]; const url = URL.createObjectURL(new Blob([rows.map(row => row.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })); const link = make('a'); link.href = url; link.download = `${brand.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-scorecard.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0); }); exportButton.dataset.icon = 'download'; extra.append(remove, exportButton);
      bench.form(brand.label, [body], () => { edit(brand, true); return false; }, extra, 'Edit',
        () => { disposeCall(); tabControl.destroy(); },
        { cancel: false, submit: { icon: 'edit' }, close: { label: 'Close', className: 'scale-drawer-close' } });
    }

    function edit(brand?: Brand, fromView = false) {
      const name = input('Brand name', brand?.label); name.required = true;
      const tier = select('Tier', ['Own Label', 'Partner', 'Exclusive'], brand?.tier ?? 'Partner');
      const buyer = personSelect('Buyer', Object.values(buyers), buyers[brand?.buyerId ?? 'lucas']);
      const status = select('Status', ['Onboarding', 'Active', 'Exiting'], brand?.status ?? 'Onboarding');
      const call = select('Next Season Call', decisions, brand?.decision ?? 'Hold');
      const hues = Object.keys(hueColors); const color = select('Mark Color', hues.map(value => value[0].toUpperCase() + value.slice(1)), (brand?.hue ?? 'teal').replace(/^./, char => char.toUpperCase()));
      const firstDrop = calendarField('First Delivery', brand?.firstDrop ?? '');
      const body = make('div', '', 'scale-edit brand-edit'); body.append(make('p', brand?.referenceId ?? 'Onboards with no sales until its first delivery sells.', 'scale-edit__subtitle'));
      const pair = (first: HTMLElement, second: HTMLElement) => { const row = make('div', '', 'scale-edit__pair'); row.append(first, second); return row; };
      const statusField = field('Status', status);
      const statusHint = make('small');
      const statusHints: Record<string, string> = {
        Onboarding: 'Active once its first delivery sells.',
        Active: 'Active brands can be bought and sold.',
        Exiting: 'Exiting sells through with no new buy.',
      };
      const refreshStatus = () => { statusHint.textContent = statusHints[status.value] ?? ''; };
      status.addEventListener('change', refreshStatus);
      refreshStatus();
      statusField.append(statusHint);
      const callField = field('Next Season Call', call), callHint = make('small'); const refreshCall = () => { callHint.textContent = callNotes[call.value]; }; call.addEventListener('change', refreshCall); refreshCall(); callField.append(callHint);
      const colorField = field('Mark Color', color); colorField.append(make('small', 'Colors its mark, bars and dots.'));
      const error = make('p', '', 'scale-profile__error'); error.hidden = true; error.setAttribute('role', 'alert');
      body.append(field('Name', name), pair(field('Tier', tier), field('Buyer', buyer)), pair(statusField, callField), colorField); if (!brand || brand.status === 'Onboarding') body.append(field('First Delivery', firstDrop)); body.append(error);
      const back = brand && fromView ? button('Back', () => showBrand(brand)) : undefined;
      bench.form(brand ? 'Edit Brand' : 'New Brand', [body], () => {
        const key = (value: string) => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        if (!name.value.trim()) { error.hidden = false; error.textContent = 'Enter a brand name.'; return false; }
        if (brands.some(item => item !== brand && key(item.label) === key(name.value))) { error.hidden = false; error.textContent = 'Another brand has this name.'; return false; }
        const hue = color.value.toLowerCase(); const draft = { label: name.value.trim(), tier: tier.value, buyerId: Object.keys(buyers).find(id => buyers[id] === buyer.value) ?? 'lucas', status: status.value, decision: call.value, hue, color: hueColors[hue], firstDrop: firstDrop.value || null };
        if (brand) { const previous = structuredClone(brand); Object.assign(brand, draft); refresh(); bench.report('Brand saved.', () => { Object.assign(brand, previous); refresh(); }); if (fromView) { showBrand(brand); return false; } }
        else { const created: Brand = { ...draft, id: `brand${nextId}`, referenceId: `brd-new-${nextId++}`, since: 2026, styles: 0, months: [], monthData: [], styleRecords: [], orders: 0, margin: 0, markdown: 0, returns: 0, repeat: 0, change: 0, newCustomers: 0, rating: 0, sellThrough: 0, units: 0, stockUnits: 0, stockCost: 0, agedStock: 0, isNew: true }; brands.push(created); refresh(); bench.report('Brand created.', () => { const index = brands.indexOf(created); if (index >= 0) brands.splice(index, 1); refresh(); }); showBrand(created); return false; }
        return true;
      }, back, brand ? 'Save Changes' : 'Create Brand', undefined, { close: { label: 'Close', className: 'scale-drawer-close' } });
    }

  },
};
