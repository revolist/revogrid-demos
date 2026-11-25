import bulkDeleteIcon from '@fortawesome/fontawesome-free/svgs/solid/trash.svg?raw';
import bulkExportIcon from '@fortawesome/fontawesome-free/svgs/solid/download.svg?raw';
import { mountActionBar } from '@revolist/ui/action-bar';
import { KeyedRowSelectionPlugin } from '@revolist/revogrid-pro';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Legend, Menu, MenuItem, SegmentedSwitch } from '@revolist/ui/react';
import { createControl, createNumberStepperElement, createProgressElement, mountTabs } from '@revolist/ui/native';
import { createDetailPanel } from '../../composables/detail-panel';
import { createDropdownControl } from '@revolist/ui/dropdown/control';
import targetIcon from '@fortawesome/fontawesome-free/svgs/solid/bullseye.svg?raw';
import marginIcon from '@fortawesome/fontawesome-free/svgs/solid/chart-line.svg?raw';
import discountIcon from '@fortawesome/fontawesome-free/svgs/solid/tags.svg?raw';
import infoIcon from '@fortawesome/fontawesome-free/svgs/solid/circle-info.svg?raw';
import snowflakeIcon from '@fortawesome/fontawesome-free/svgs/solid/snowflake.svg?raw';
import stoveIcon from '@fortawesome/fontawesome-free/svgs/solid/fire-burner.svg?raw';
import bedIcon from '@fortawesome/fontawesome-free/svgs/solid/bed.svg?raw';
import mountainIcon from '@fortawesome/fontawesome-free/svgs/solid/mountain.svg?raw';
import bottleIcon from '@fortawesome/fontawesome-free/svgs/solid/bottle-water.svg?raw';
import gloveIcon from '@fortawesome/fontawesome-free/svgs/solid/mitten.svg?raw';
import sockIcon from '@fortawesome/fontawesome-free/svgs/solid/socks.svg?raw';
import lampIcon from '@fortawesome/fontawesome-free/svgs/solid/lightbulb.svg?raw';
import helmetIcon from '@fortawesome/fontawesome-free/svgs/solid/helmet-safety.svg?raw';
import bagIcon from '@fortawesome/fontawesome-free/svgs/solid/bag-shopping.svg?raw';

import { ROW_ACTION_COLUMN_WIDTH } from '../../composables/row-action';
import { demoColors } from '../../composables/demo-colors';
import '@revolist/ui/styles/calendar.css';
import { AdvanceFilterPlugin, GridPopoverPlugin, FIlTER_SELECTION, FIlTER_SLIDER, compileFilterAst, type FilterAst, type FilterAstEditorHandle } from '@revolist/revogrid-pro';
import { productDetailFixtures } from './product-detail-fixtures';
import { promotionNames, promotionReport, weeklyContribution } from './product-promotion-model';
import { productPeriodHealth, type ProductWeek } from './product-guardrails';
import { productFixtures } from './product-fixtures';
import { RowSelectPlugin, createTimeRangeColumnType, createTimeRangeDates, comparisonSparklineRenderer, metricStackRenderer, identityCellRenderer, statusSegmentsRenderer, cellActionRenderer } from '@revolist/revogrid-pro';
import {
  button,
  compactMoney,
  field,
  input,
  make,
  matches,
  money,
  number,
  pct,
  removeRecord,
  select,
  personSelect,
  total,
  type Example,
} from './workbench-ui';
import type { ColumnData, ColumnRegular } from '@revolist/revogrid';

const productMoney = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', notation: 'compact',
    minimumFractionDigits: Math.abs(value) >= 1000 && Math.abs(value) < 1_000_000 ? 1 : 0,
    maximumFractionDigits: 1,
  }).format(value);

const catalogPositions = ['0% 0%', '0% 0%', '100% 0%', '50% 0%', '0% 0%', '50% 0%', '0% 50%', '50% 50%', '100% 50%', '0% 100%', '100% 50%', '50% 50%', '50% 100%', '50% 100%', '50% 100%', '50% 100%', '100% 100%'];
function productIcon(label: string) {
  if (/cooler/i.test(label)) return snowflakeIcon;
  if (/stove/i.test(label)) return stoveIcon;
  if (/sleeping|hammock/i.test(label)) return bedIcon;
  if (/helmet/i.test(label)) return helmetIcon;
  if (/rope|harness|climb/i.test(label)) return mountainIcon;
  if (/bottle/i.test(label)) return bottleIcon;
  if (/gloves/i.test(label)) return gloveIcon;
  if (/socks/i.test(label)) return sockIcon;
  if (/lamp/i.test(label)) return lampIcon;
  return bagIcon;
}

interface Product {
  label: string;
  sku: string;
  region: string;
  data: number[];
  margin?: number;
  discount?: number;
  markdown: number;
  weeks: ProductWeek[];
  promo: number[];
  photo?: string;
  photoPosition?: string;
  disposition?: string;
  id: string; ownerId: string; listPrice: number; landed: number; serve: number; onHand: number;
  decision: string | null; cap: number | null; note: string;
  promotionRules: { key: string; depth: number; lift: number }[];
  activity: { text: string; by: string; when: string }[];
}

export const productKpis: Example = {
  id: 'product-kpis',
  title: 'Product Sales & Profitability',
  description:
    'Revenue, margin, and promotion performance against product targets',
  setup(bench) {
    let window = 13;
    let weeklySalesTarget = 20000;
    let minimumMargin = 25;
    let maxDiscount = 20;
    let preview: { sku: string; index: number } | undefined;
    const previewWeek = (row: Record<string, any>) => preview && preview.sku === row.sku ? (row.product as Product).weeks[(row.product as Product).weeks.length - 26 + preview.index] : undefined;

    const rows: Product[] = productFixtures.map((fixture, index) => ({
      id: productDetailFixtures[fixture.sku as keyof typeof productDetailFixtures].id,
      ownerId: productDetailFixtures[fixture.sku as keyof typeof productDetailFixtures].ownerId,
      listPrice: productDetailFixtures[fixture.sku as keyof typeof productDetailFixtures].list,
      landed: fixture.landed, serve: fixture.serve,
      onHand: productDetailFixtures[fixture.sku as keyof typeof productDetailFixtures].onHand,
      decision: productDetailFixtures[fixture.sku as keyof typeof productDetailFixtures].decision,
      cap: productDetailFixtures[fixture.sku as keyof typeof productDetailFixtures].cap,
      note: productDetailFixtures[fixture.sku as keyof typeof productDetailFixtures].note,
      promotionRules: [...productDetailFixtures[fixture.sku as keyof typeof productDetailFixtures].promotions],
      activity: [...productDetailFixtures[fixture.sku as keyof typeof productDetailFixtures].activity],
      label: fixture.label,
      sku: fixture.sku,
      region: fixture.department,
      photo: index < catalogPositions.length ? `${import.meta.env.BASE_URL}product-photos/catalog.png` : undefined,
      photoPosition: catalogPositions[index],
      disposition: fixture.returned ? 'Returned' : undefined,
      weeks: fixture.weeks.map((week) => [...week]),
      data: fixture.weeks.map((week) => week[0]),
      markdown: fixture.markdown,
      promo: fixture.weeks.map((week) => week[5] ? (week[3] < 0 ? -1 : 1) : 0),
    }));
    let activeFilter: FilterAst | undefined;
    let filterPlugin: AdvanceFilterPlugin | undefined;
    let filterEditor: FilterAstEditorHandle | undefined;
    let filterRefreshVersion = 0;
    let filterRows: Record<string, unknown>[] = [];
    let filterPopover: GridPopoverPlugin | undefined;
    bench.grid.filter = {
      columnFilterButton: false,
      predefinedFilters: true,
      groupedFilter: {},
      slider: {
        showRangeInputs: true,
        getBounds: ({ columnProp }) => {
          const values = filterRows.map(row => row[String(columnProp)]).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
          return values.length ? { min: Math.min(...values), max: Math.max(...values) } : undefined;
        },
      },
      selection: {
        getItems: {
          label: () => [...new Set(rows.map(row => row.label))].map(value => ({ value, label: value })),
          status: () => [...new Set(filterRows.map(row => String(row.status)))].map(value => ({ value, label: value })),
        },
      },
    };
    const periods = make('div');
    const periodProps = () => ({
      value: window,
      ariaLabel: 'Reporting period',
      options: [4, 13, 26].map(weeks => ({ value: weeks, label: `${weeks}W`, ariaLabel: `${weeks}W, last ${weeks} weeks` })),
      onChange: (weeks: string | number) => { if (typeof weeks === 'number') { window = weeks; refresh(); } },
    });
    const periodRoot = createRoot(periods);
    const renderPeriods = () => periodRoot.render(createElement(SegmentedSwitch, { ...periodProps(), role: 'group' }));
    renderPeriods();
    bench.onDispose(() => periodRoot.unmount());
    bench.heading.append(
      periods,
      button('Add Product', () => editProduct(), true),
    );
    const filter = button('Filter', openFilters);
    filter.dataset.icon = 'filter';
    const targetsButton = button('Performance targets', openPerformanceTargets);
    targetsButton.dataset.icon = 'sliders';
    bench.grid.resize = true;
    bench.grid.classList.add('product-column-lines');
    bench.toolbar.append(filter, targetsButton);
    const bulkHost = make('div', '', 'campaign-bulk-host');
    bulkHost.hidden = true;
    bench.toolbar.insertAdjacentElement('afterend', bulkHost);
    let selectedIds = new Set<string>();
    const selectedProducts = () => rows.filter(row => selectedIds.has(row.id));
    const clearSelection = () => { void bench.grid.getPlugins().then(plugins => plugins.find(plugin => plugin instanceof KeyedRowSelectionPlugin)?.clear()); };
    const bulkBar = mountActionBar(bulkHost, { label: 'Selected products', count: 0, selectionLabel: '', positioning: { mode: 'inline' } });
    function renderBulk() {
      const selected = selectedProducts();
      bulkHost.hidden = selected.length === 0;
      bench.toolbar.hidden = selected.length > 0;
      bulkBar.update({
        label: 'Selected products', count: selected.length,
        selectionLabel: `${selected.length} ${selected.length === 1 ? 'product' : 'products'} selected`, positioning: { mode: 'inline' },
        actions: [
          { id: 'promos', label: 'Stop promos', disabled: !selected.some(row => row.decision !== 'stopPromos') },
          { id: 'export', label: 'Export', icon: bulkExportIcon },
          { id: 'delete', label: 'Delete', icon: bulkDeleteIcon, variant: 'danger-outline' },
          { id: 'clear', label: 'Clear' },
        ],
        onAction: action => {
          if (action === 'clear') { clearSelection(); return; }
          if (action === 'export') {
            const lines = [['Product', 'SKU', 'Department', 'Decision'], ...selected.map(row => [row.label, row.sku, row.region, row.decision ?? ''])];
            const csv = lines.map(line => line.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
            const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
            const link = document.createElement('a'); link.href = url; link.download = 'selected-products.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0); return;
          }
          if (action === 'promos') {
            const changed = selected.filter(row => row.decision !== 'stopPromos').map(row => ({ row, decision: row.decision, cap: row.cap, activity: [...row.activity] }));
            changed.forEach(({ row }) => { row.decision = 'stopPromos'; row.cap = null; row.activity.unshift({ text: 'Decision set to Stop Promos', by: 'You', when: 'Today' }); });
            clearSelection(); refresh(); bench.report(`${changed.length} ${changed.length === 1 ? 'product' : 'products'} updated.`, () => { changed.forEach(({ row, decision, cap, activity }) => { row.decision = decision; row.cap = cap; row.activity = activity; }); refresh(); });
          }
          if (action === 'delete') {
            const ids = new Set(selected.map(row => row.id));
            const removed = rows.flatMap((row, index) => ids.has(row.id) ? [{ row, index }] : []);
            for (const { index } of [...removed].reverse()) rows.splice(index, 1);
            clearSelection(); refresh(); bench.report(`${removed.length} ${removed.length === 1 ? 'product' : 'products'} deleted.`, () => { removed.forEach(({ row, index }) => rows.splice(Math.min(index, rows.length), 0, row)); refresh(); });
          }
        },
      });
    }
    bench.grid.addEventListener('keyedrowselectionchange', event => { selectedIds = new Set(event.detail.keys.filter((key): key is string => typeof key === 'string')); renderBulk(); });
    bench.onDispose(() => bulkBar.destroy());
    bench.onSearch(() => { bench.resetPage(); refresh(); });
    const calendarRange = { start: '2026-04-19', end: '2026-10-11', unit: 'week' as const, locale: 'en-US' };
    const calendarDates = createTimeRangeDates(calendarRange);
    bench.grid.columnTypes = { ...bench.grid.columnTypes, promotionCalendar: createTimeRangeColumnType({
      ...calendarRange,
      label: row => `Promotion calendar for ${row.label}`,
      monthDividers: true,
      onPreview: (row, slot, { rowIndex }) => {
        if (preview && preview.sku === row.sku && preview.index === slot?.index) return;
        if (!slot && preview?.sku !== row.sku) return;
        preview = slot ? { sku: row.sku, index: slot.index } : undefined;
        void bench.grid.getProviders().then(providers => {
          if (!providers) return;
          for (const prop of ['revenue', 'profit']) {
            for (const colType of ['rgCol', 'colPinStart', 'colPinEnd'] as const) {
              const col = providers.column.getColumnIndexByProp(prop, colType);
              if (col >= 0) void bench.grid.setDataAt({ row: rowIndex, col, colType, rowType: 'rgRow', skipDataUpdate: true });
            }
          }
        });
      },
      item: (row, slot) => {
        const product = row.product as Product;
        const index = slot.index, week = product.promo.length - 26 + index;
        const value = product.promo[week] ?? 0, sales = product.data[week] ?? 0;
        const label = `Week ending ${slot.label}`;
        const state = !sales ? 'No sales' : value < 0 ? 'Promotion at a loss' : value ? 'Promotion' : sales >= weeklySalesTarget ? 'Full price at target' : 'Full price';
        return { label: `${product.label} · ${label} · ${state}`, className: `${!sales ? 'no-data' : value < 0 ? 'loss' : value ? 'promo' : sales >= weeklySalesTarget ? 'regular' : 'under-target'} ${index < 26 - window ? 'outside-period' : ''}` };
      },
      onActivate: (row, slot) => {
        const product = row.product as Product;
        openWeek(product, product.promo.length - 26 + slot.index, `Week ending ${slot.label}`);
      },
    }) };
    let columns: ColumnData = [
      {
        prop: 'label', name: 'Product', filter: [FIlTER_SELECTION], size: 210, pin: 'colPinStart', sortable: true,
        cellTemplate: identityCellRenderer,
        identityCell: {
          format: (value, row) => ({ label: String(value ?? ''), detail: row.subtitle, leading: (h: any) => row.photo ? h('span', { class: 'rv-identity-cell__image product-photo', style: { backgroundImage: `url(${row.photo})`, backgroundPosition: row.photoPosition }, 'aria-hidden': 'true' }) : h('span', { class: 'rv-identity-cell__image product-fallback', innerHTML: productIcon(row.label), 'aria-hidden': 'true' }), actionLabel: `Open ${row.label}` }),
          onActivate: (row) => showProduct(row.product),
        },
      },
      {
        prop: 'revenue', name: 'Revenue', filter: ['number', FIlTER_SLIDER], filterAstValueEditor: { kind: 'slider', min: 0, max: Math.max(1, ...rows.map(row => total(row.data, value => value))), step: 'any' }, size: 140, sortable: true,
        columnProperties: () => ({ class: 'product-number-header' }),
        cellTemplate: metricStackRenderer,
        metricStack: { format: (value, row) => previewWeek(row) ? { value: productMoney(previewWeek(row)![0]), layout: 'inline' } : !row.revenue
          ? { value: row.disposition ?? 'No sales', valueTone: 'muted', layout: 'inline' }
          : { value: productMoney(Number(value)), layout: 'inline', ...(row.change === null ? {} : {
            detail: `${Math.abs(row.change).toFixed(1)}%`,
            detailLabel: `${row.change < 0 ? 'Down' : 'Up'} ${Math.abs(row.change).toFixed(1)}% on the prior ${window} weeks`,
            tone: row.change < 0 ? 'negative' : 'positive', trend: row.change < 0 ? 'down' : 'up',
          }) } },
      },
      {
        prop: 'trend', name: 'Revenue Trend', filter: false, size: 239,
        cellTemplate: comparisonSparklineRenderer,
        comparisonSparkline: {
          label: 'Revenue trend compared with the prior period', minValue: 0,
          tooltip: (_row, index, values) => {
            const date = new Date(Date.UTC(2026, 9, 11 - (window - 1 - index) * 7));
            const dateLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
            const format = (value: number | null) => value === null ? '–' : productMoney(value);
            return `Week ending ${dateLabel}\nThis period  ${format(values[1])}\nPeriod before  ${format(values[0])}`;
          },
          maxValue: row => Math.max(1, ...row.trend, ...row.priorTrend),
          emptyText: row => [...row.trend, ...row.priorTrend].some((value: number) => value > 0) ? undefined : row.disposition ?? 'No sales',
          series: [
            { prop: 'priorTrend', color: demoColors.purpleLight, fill: 'gradient', fillOpacity: .1, segmentLines: true, belowThreshold: { value: 0, color: demoColors.purpleLight } },
            { color: demoColors.purple, fill: 'gradient', fillOpacity: .16, segmentLines: true, belowThreshold: { value: 0, color: demoColors.purple } },
          ],
        },
      },
      {
        prop: 'profit', name: 'Profit', filter: ['number', FIlTER_SLIDER], size: 124, sortable: true,
        columnProperties: () => ({ class: 'product-number-header' }),
        cellTemplate: metricStackRenderer,
        metricStack: { format: (value, row) => ({
          value: previewWeek(row) ? productMoney(previewWeek(row)![3]) : row.revenue ? productMoney(Number(value)) : row.disposition ?? 'No sales',
          valueTone: previewWeek(row) ? previewWeek(row)![3] < 0 ? 'negative' : 'neutral' : !row.revenue ? 'muted' : Number(value) < 0 ? 'negative' : 'neutral',
          layout: 'inline',
        }) },
      },
      { prop: 'promo', name: 'Promo Calendar', filter: false, size: 240, columnType: 'promotionCalendar' },
      {
        prop: 'status', name: 'KPI Status', filter: [FIlTER_SELECTION], size: 152, sortable: true,
        cellTemplate: statusSegmentsRenderer,
        statusSegments: { format: (value, row) => ({
          label: String(value ?? ''),
          detail: row.revenue ? `${row.score}/3 met` : undefined,
          segments: (row.revenue ? row.marks : [null, null, null]).map((mark: string | null, index: number) => ({
            tone: mark === 'met' ? 'positive' : mark === 'near' ? 'warning' : mark === 'miss' ? 'negative' : 'neutral',
            ...(mark ? { label: `${['Revenue', 'Margin', 'Discount'][index]}: ${mark === 'met' ? 'met' : mark === 'near' ? 'near target' : 'missed'}` } : {}),
          })),
        }) },
      },
      {
        prop: 'actions', columnChooser: false, name: '', filter: false, size: ROW_ACTION_COLUMN_WIDTH, cellTemplate: cellActionRenderer,
        cellAction: { label: row => `Actions for ${row.label}`, onActivate: row => editProduct(row.product) },
      },
    ];
    refresh();

    function refresh() {
      bench.setSubtitle(`${window} weeks to Oct 11, vs prior ${window} weeks`);
      renderPeriods();
      const activeMonths = new Set(calendarDates.slots.slice(-window).map(slot => slot.date.slice(0, 7)));
      for (const date of calendarDates.labelDates) {
        const month = date.slice(0, 7);
        bench.grid.style.setProperty(`--rv-time-range-month-${month}`, activeMonths.has(month) ? 'var(--rv-ui-text, #171717)' : 'var(--rv-ui-text-muted, #737373)');
      }

      const candidates = rows
        .filter((row) =>
          matches(bench.currentQuery(), row.label, row.sku, row.region),
        )
        .map((row) => {
          const trend = row.data.slice(-window);
          const priorTrend = row.data.slice(-window * 2, -window);
          const prior = total(priorTrend, (value) => value);
          const health = productPeriodHealth(row.weeks.slice(-window), row.markdown, {
            weeklySalesTarget,
            marginFloor: minimumMargin,
            discountCeiling: maxDiscount,
          }, { margin: row.margin, discount: row.discount });
          return {
            ...row,
            product: row,
            subtitle: `ID: ${row.sku}`,
            trend,
            priorTrend,
            revenue: health.revenue,
            change: prior ? (health.revenue / prior - 1) * 100 : null,
            profit: health.profit,
            promo: row.promo.slice(-26),
            score: health.passes.filter(Boolean).length,
            healthScore: health.score,
            marks: health.marks,
            status: row.disposition ?? health.status,
          };
        });
      filterRows = candidates;
      const compiled = activeFilter && filterPlugin
        ? compileFilterAst(activeFilter, { columns: columns as ColumnRegular[], operators: filterPlugin.filterFunctionsIndexedByType })
        : undefined;
      const visible = compiled ? candidates.filter(row => compiled.matches(row)) : candidates;
      filter.textContent = activeFilter ? 'Filter (active)' : 'Filter';
      filter.setAttribute('aria-label', filter.textContent);
      bench.stats([
        ['Revenue', compactMoney(total(visible, (row) => row.revenue))],
        ['Gross profit', compactMoney(total(visible, (row) => row.profit))],
        [
          'Products on track',
          String(visible.filter((row) => row.status === 'On Track').length),
          `of ${visible.length} visible`,
        ],
      ]);
      bench.render(columns, visible);
    }

    async function openFilters() {
      if (filterPopover?.isOpen) { filterPopover.close(); return; }
      const plugins = await bench.grid.getPlugins();
      filterPlugin = plugins.find(plugin => plugin instanceof AdvanceFilterPlugin);
      filterPopover = plugins.find(plugin => plugin instanceof GridPopoverPlugin);
      if (!filterPlugin || !filterPopover) return;
      const host = make('div');
      if (!filterPopover.open(filter, { label: 'Product filters', content: host, className: 'product-ast-filter', align: 'start', cleanup: () => { filterEditor?.destroy(); filterEditor = undefined; } })) return;
      filterEditor = filterPlugin.mountFilterAstEditor(host, { currentProp: 'status', onCancel: () => filterPopover?.close() });
    }
    bench.grid.addEventListener('filterastchange', event => {
      activeFilter = event.detail.filterAst;
      if (event.detail.origin === 'ui') queueMicrotask(() => filterPopover?.close());
      bench.resetPage();
      const version = ++filterRefreshVersion;
      if (filterPlugin) refresh();
      else void bench.grid.getPlugins().then(plugins => {
        if (version !== filterRefreshVersion) return;
        filterPlugin = plugins.find(plugin => plugin instanceof AdvanceFilterPlugin);
        refresh();
      });
    });

    function openWeek(product: Product, week: number, label: string) {
      const revenue = product.data[week] ?? 0;
      const previous = product.data[week - window];
      const promotion = product.promo[week] ?? 0;
      const sample = product.weeks[week];
      const profit = product.margin === undefined ? (sample?.[3] ?? 0) : revenue * product.margin / 100;
      const discount = product.discount === undefined ? (sample?.[1] ? sample[2] / sample[1] * 100 : 0) : product.discount;
      const details = make('dl', '', 'product-week-details');
      const values = [
        ['Revenue', revenue ? money(revenue) : 'No sales'],
        ['Profit', revenue ? money(profit) : '–'],
        ['Margin', revenue ? pct(profit / revenue * 100) : '–'],
        [
          'Promotion',
          !revenue
            ? 'No sales'
            : promotion < 0
              ? 'Promotion at a loss'
              : promotion
                ? `${pct(discount)} off`
                : 'Full price',
        ],
        [
          `${window} weeks before`,
          previous === undefined ? '–' : money(previous),
        ],
        [
          'Change',
          previous ? `${((revenue / previous - 1) * 100).toFixed(1)}%` : '–',
        ],
      ];
      for (const [name, value] of values) {
        details.append(make('dt', name), make('dd', value));
      }
      bench.details(label, [
        make('p', product.label, 'product-week-name'),
        details,
      ]);
    }

    async function openPerformanceTargets() {
      if (targetsButton.getAttribute('aria-expanded') === 'true') { filterPopover?.close(); return; }
      const plugins = await bench.grid.getPlugins();
      filterPopover = plugins.find(plugin => plugin instanceof GridPopoverPlugin);
      if (!filterPopover) return;

      const host = make('div', '', 'product-targets');
      const head = make('div', '', 'product-targets__header');
      head.append(make('strong', 'Performance targets'), make('p', `${window}-week reporting window · All ${rows.length} products`));
      host.append(head);
      const draft = { weeklySalesTarget, marginFloor: minimumMargin, discountCeiling: maxDiscount };
      const defaults = { weeklySalesTarget: 20000, marginFloor: 25, discountCeiling: 20 };
      const entries = [
        { key: 'weeklySalesTarget' as const, label: 'Weekly sales target', description: 'Revenue target before promotions', icon: targetIcon, start: 5000, end: 40000, step: 1000, format: (n: number) => `$${n / 1000}K / wk` },
        { key: 'marginFloor' as const, label: 'Minimum profit margin', description: 'Minimum contribution as a share of sales', icon: marginIcon, start: 0, end: 40, step: 1, format: (n: number) => `${n}%` },
        { key: 'discountCeiling' as const, label: 'Maximum discount', description: 'Keep average discounts below this level', icon: discountIcon, start: 5, end: 40, step: 1, format: (n: number) => `${n}%` },
      ];
      const metrics = make('div', '', 'product-targets__metrics');
      const summaries: HTMLElement[] = [];
      const controls = entries.map((entry, index) => {
        const card = make('section', '', 'product-targets__metric');
        const icon = make('span', '', `product-targets__icon product-targets__icon--${index}`); icon.setAttribute('aria-hidden', 'true'); icon.innerHTML = entry.icon;
        const copy = make('div', '', 'product-targets__copy'); copy.append(make('strong', entry.label), make('small', entry.description));
        const header = make('div', '', 'product-targets__metric-heading'); header.append(icon, copy);
        const control = createDropdownControl<number>(document, {
          source: Array.from({ length: (entry.end - entry.start) / entry.step + 1 }, (_, i) => { const value = entry.start + i * entry.step; return { value, label: entry.format(value) }; }),
          value: draft[entry.key],
          config: { ariaLabel: entry.label, topLayer: true, portalTarget: host, nativeTabNavigation: true, maxHeight: 240 },
        });
        control.onChange = value => { draft[entry.key] = value; updatePreview(); };
        header.append(control.element); const summary = make('p', '', 'product-targets__metric-summary'); summaries.push(summary); card.append(header, summary); metrics.append(card);
        return { entry, control };
      });
      host.append(metrics);
      const legend = make('div');
      const legendRoot = createRoot(legend);
      host.append(legend);
      const note = make('p', '', 'product-targets__note'); const noteIcon = make('span'); noteIcon.setAttribute('aria-hidden', 'true'); noteIcon.innerHTML = infoIcon; note.append(noteIcon, document.createTextNode('Targets recalculate product status when applied.')); host.append(note);
      function updatePreview() {
        const results = rows.map(row => ({ row, health: productPeriodHealth(row.weeks.slice(-window), row.markdown, draft, { margin: row.margin, discount: row.discount }) }));
        summaries.forEach((summary, index) => { const met = results.filter(({ health }) => health.revenue > 0 && health.passes[index]).length; summary.textContent = `${met} of ${rows.length} products meet this target`; });
        const statuses = [ ['On Track', 'on-track'], ['At Risk', 'at-risk'], ['Off Track', 'off-track'], ['No Sales', 'no-sales'], ['Returned', 'returned'] ] as const;
        const items = statuses.flatMap(([label, tone]) => { const count = results.filter(({ row, health }) => (row.disposition ?? health.status) === label).length; if (!count && (label === 'Returned' || label === 'No Sales')) return []; return [{ id: tone, label: `${label} ${count}`, className: `product-targets__legend-item is-${tone}` }]; });
        legendRoot.render(createElement(Legend, { label: 'Product status preview', className: 'product-targets__legend', items }));
      }
      updatePreview();
      const footer = make('div', '', 'product-targets__footer');
      const reset = button('Restore defaults', () => { Object.assign(draft, defaults); controls.forEach(({ entry, control }) => { control.value = draft[entry.key]; }); updatePreview(); });
      const cancel = button('Cancel', () => filterPopover?.close(true));
      const apply = button('Apply targets', () => { weeklySalesTarget = draft.weeklySalesTarget; minimumMargin = draft.marginFloor; maxDiscount = draft.discountCeiling; filterPopover?.close(true); refresh(); }, true);
      footer.append(reset, cancel, apply); host.append(footer);
      filterPopover.open(targetsButton, { label: 'Performance targets', content: host, className: 'product-targets-popover', align: 'start', cleanup: () => { legendRoot.unmount(); controls.forEach(({ control }) => control.destroy()); } });
    }

    type ProductTab = 'Overview' | 'Promotions' | 'Activity';
    const owners: Record<string, { name: string; role: string }> = { own_ao: { name: 'Amara Okafor', role: 'Senior footwear planner' }, own_lm: { name: 'Lucas Moreau', role: 'Apparel planner' }, own_is: { name: 'Ingrid Solberg', role: 'Camp planner' }, own_da: { name: 'Diego Alvarez', role: 'Packs and accessories planner' }, own_hm: { name: 'Hana Mori', role: 'Associate climb planner' } };
    const decisionLabels: Record<string, string> = { noChange: 'No Change', stopPromos: 'Stop Promos', raisePrice: 'Raise Price', clearance: 'Clearance', cap: 'Cap Discount' };
    const formatDecision = (row: Product) => row.decision === 'cap' && row.cap != null ? `Cap at ${Math.round(row.cap * 100)}%` : row.decision ? decisionLabels[row.decision] ?? row.decision : 'No decision';
    const weekLabel = (index: number) => new Date(Date.UTC(2026, 9, 11 - (51 - index) * 7)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    const signedMoney = (value: number) => `${value < 0 ? '−' : '+'}${Math.abs(value) < 1000 ? money(Math.abs(value)) : productMoney(Math.abs(value))}`;
    const dialog = () => bench.heading.parentElement?.querySelector<HTMLDialogElement>('dialog.workbench-dialog');
    const addClose = (node: HTMLDialogElement) => { const close = button('×', () => node.close()); close.className = 'scale-drawer-close'; close.setAttribute('aria-label', 'Close'); node.querySelector('form')?.append(close); };
    function showProduct(row: Product, active: ProductTab = 'Overview') {
      row = rows.find(item => item.id === row.id) ?? row;
      const health = productPeriodHealth(row.weeks.slice(-window), row.markdown, { weeklySalesTarget, marginFloor: minimumMargin, discountCeiling: maxDiscount }, { margin: row.margin, discount: row.discount });
      const productStatus = row.disposition === 'Returned' ? 'Returned' : health.status;
      const body = make('div', '', 'scale-profile product-profile'); const header = make('div', '', 'product-profile__heading');
      { const photo = make('span', '', `product-profile__photo ${row.photo ? 'product-photo' : 'product-fallback'}`); if (row.photo) { photo.style.backgroundImage = `url(${row.photo})`; photo.style.backgroundPosition = row.photoPosition ?? '0% 0%'; } else photo.innerHTML = productIcon(row.label); photo.setAttribute('aria-hidden', 'true'); header.append(photo); }
      const identity = make('div', '', 'product-profile__identity'); identity.append(make('span', row.sku, 'scale-profile__id')); const title = make('div', '', 'product-profile__title'); title.append(make('strong', row.label), make('span', productStatus, `product-profile__status ${productStatus.toLowerCase().replaceAll(' ', '-')}`)); identity.append(title, make('p', `${row.region[0]?.toUpperCase() ?? ''}${row.region.slice(1)}  •  ${money(row.listPrice)}  •  ${owners[row.ownerId]?.name ?? 'Unassigned'}`)); header.append(identity);
      const productActions = make('details', '', 'product-profile__menu');
      const more = make('summary', '⋯'); more.setAttribute('aria-label', 'Product actions'); more.setAttribute('aria-haspopup', 'menu');
      const actionHost = make('div'); const actionRoot = createRoot(actionHost);
      actionRoot.render(createElement(Menu, { label: 'Product actions', onClose: () => { productActions.open = false; more.focus(); } }, createElement(MenuItem, { onClick: () => { productActions.open = false; removeRecord(bench, rows, row, row.label, refresh); } }, 'Delete product')));
      productActions.append(more, actionHost); header.append(productActions);
      const tabs = make('div'); const panel = make('div', '', 'scale-profile__content'); panel.setAttribute('role', 'tabpanel'); panel.id = `product-panel-${row.id}`;
      const names: ProductTab[] = ['Overview', 'Promotions', 'Activity']; const tabOptions = names.map(name => ({ value: name, label: name, id: `product-${row.id}-${name}`, ariaControls: panel.id }));
      const tabProps = (value: ProductTab) => ({ value, options: tabOptions, onChange: renderTab, ariaLabel: 'Product details', className: 'scale-profile__tabs rv-tabs--underline' });
      const tabControl = mountTabs(tabs, tabProps(active));
      const controls = [...tabs.querySelectorAll<HTMLButtonElement>('[role=tab]')];
      body.append(header, tabs, panel);
      const section = (title: string, subtitle: string) => { const { card, body } = createDetailPanel(title, subtitle, { card: 'scale-profile__section', heading: 'scale-profile__section-heading', body: 'scale-profile__section-content' }); panel.append(card); return body; };
      function renderTab(tab: ProductTab) {
        active = tab; tabControl.update(tabProps(tab)); panel.replaceChildren(); panel.setAttribute('aria-labelledby', controls[names.indexOf(tab)].id); controls.forEach((control, index) => { const selected = names[index] === tab; control.setAttribute('aria-selected', String(selected)); control.tabIndex = selected ? 0 : -1; });
        const weeks = row.weeks.slice(-window), promo = weeks.filter(week => week[5]), promoNet = total(promo, week => week[0]);
        if (tab === 'Overview') {
          const performance = section('Performance', `${window} weeks to Oct 11`), stats = make('div', '', 'product-profile__stats'); const revenueTarget = weeklySalesTarget * window;
          const data = [ ['Revenue', health.revenue ? productMoney(health.revenue) : 'No sales', revenueTarget ? `${Math.round(health.revenue / revenueTarget * 100)}% of the ${compactMoney(revenueTarget)} target` : 'No target'], ['Profit', health.revenue ? productMoney(health.profit) : '–', health.revenue ? `${(health.margin * 100).toFixed(1)}% margin` : 'No sales'], ['Discount Rate', health.revenue ? `${(health.discount * 100).toFixed(1)}%` : '–', health.revenue ? `${health.discount * 100 >= maxDiscount ? 'Over' : 'Under'} the ${maxDiscount}% ceiling` : 'No sales'], ['Sold on Promo', health.revenue ? `${(promoNet / health.revenue * 100).toFixed(1)}%` : '–', `${promo.length} of ${window} weeks`] ];
          for (const [label, value, detail] of data) { const tile = make('div'); tile.append(make('small', label), make('strong', value), make('small', detail)); stats.append(tile); } performance.append(stats);
          const kpis = section('KPI Status', `${productStatus}${health.revenue ? `, ${health.passes.filter(Boolean).length} of 3 met, score ${health.score}` : ''}`);
          if (!health.revenue) kpis.append(make('p', 'No sales in the period.', 'product-profile__muted'));
          else { const metrics = [ ['Revenue', productMoney(health.revenue), `target ${compactMoney(revenueTarget)}`, health.revenue / Math.max(1, revenueTarget)], ['Margin', `${(health.margin * 100).toFixed(1)}%`, `floor ${minimumMargin}%`, health.margin * 100 / Math.max(1, minimumMargin)], ['Discount', `${(health.discount * 100).toFixed(1)}%`, `ceiling ${maxDiscount}%`, maxDiscount / Math.max(1, health.discount * 100)] ] as const;
            metrics.forEach(([label, value, note, fraction], index) => { const item = make('div', '', 'product-profile__kpi'); const line = make('div'); line.append(make('span', label), make('span', `${value}, ${note}`)); const progress = createProgressElement(document, { max: 1, value: (health.scores[index] ?? fraction * 100) / 100, className: health.marks[index] ?? '', label: `${label}, ${health.marks[index] === 'met' ? 'met' : health.marks[index] === 'near' ? 'just short' : 'missed'}` }); item.append(line, progress); kpis.append(item); }); }
          const details = make('section', '', 'product-profile__details'); details.setAttribute('aria-label', 'Details'); details.append(make('small', 'Details')); const list = make('dl', '', 'scale-profile__details'); const recentUnits = total(row.weeks.slice(-4), week => row.listPrice ? week[1] / row.listPrice : 0), cover = recentUnits ? row.onHand / (recentUnits / 4) : null;
          for (const [label, value] of [['Owner', `${owners[row.ownerId]?.name ?? 'Unassigned'}  ${owners[row.ownerId]?.role ?? ''}`], ['Weeks of Cover', cover == null ? '–' : `${cover.toFixed(1)} weeks  ${number(row.onHand)} on hand`], ['Decision', formatDecision(row)], ['Note', row.note || '–']]) list.append(make('dt', label), make('dd', value)); details.append(list); panel.append(details);
        } else if (tab === 'Promotions') {
          const events = promotionReport(row.weeks, window, row.markdown, row.landed, row.serve, row.promotionRules), content = section('Promotions', `${events.length} events, ${promo.length} weeks on promo`);
          const table = make('table', '', 'product-profile__table'); table.setAttribute('aria-label', `${row.label} promotions`); const thead = make('thead'), headings = make('tr'); for (const label of ['Event', 'Depth', 'Net', 'Profit', 'Payback']) headings.append(make('th', label)); thead.append(headings); const tbody = make('tbody');
          for (const event of events) { const tr = make('tr'); const name = make('td'); name.append(make('span', promotionNames[event.key] ?? event.key), make('small', `${weekLabel(event.start)}${event.end !== event.start ? ` to ${weekLabel(event.end)}` : ''}, ${event.weeks} ${event.weeks === 1 ? 'week' : 'weeks'}`)); tr.append(name, make('td', event.gross ? `${Math.round(event.discount / event.gross * 100)}%` : '–'), make('td', productMoney(event.net)), make('td', signedMoney(event.profit)), make('td', signedMoney(event.payback), event.payback < 0 ? 'negative' : '')); tbody.append(tr); }
          const summaryRow = (name: string, subset: ProductWeek[], payback: number | null) => { const tr = make('tr', '', 'product-profile__summary-row'), first = make('td'); const sales = total(subset, week => week[0]), gross = total(subset, week => week[1]), discount = total(subset, week => week[2]), profit = total(subset, week => week[3]); first.append(make('span', name), make('small', `${subset.length} weeks${subset.length ? `, ${productMoney(sales / subset.length)} a week` : ''}`)); if (name === 'Promo Weeks' && events.length) first.append(make('small', `Lift margin ${signedMoney(total(events, event => event.lift))}, subsidy ${signedMoney(total(events, event => event.subsidy))}`)); tr.append(first, make('td', gross ? `${(discount / gross * 100).toFixed(1)}%` : '–'), make('td', productMoney(sales)), make('td', signedMoney(profit)), make('td', payback == null ? '' : signedMoney(payback), payback != null && payback < 0 ? 'negative' : '')); return tr; };
          tbody.append(summaryRow('Promo Weeks', promo, total(events, event => event.payback)), summaryRow('Other Weeks', weeks.filter(week => !week[5]), null)); table.append(thead, tbody); content.append(table);
        } else {
          const content = section('Activity', 'Every change, newest first');
          for (const item of row.activity) { const entry = make('div', '', 'product-profile__activity'); entry.append(make('strong', item.text), make('small', `${owners[item.by]?.name ?? item.by}  •  ${item.when}`)); content.append(entry); }
        }
      }
      const selectDecision = (value: string | null, cap: number | null = null) => { const previous = { decision: row.decision, cap: row.cap, activity: [...row.activity] }; row.decision = value; row.cap = cap; row.activity.unshift({ text: value ? `Decision set to ${formatDecision(row)}` : 'Decision cleared', by: 'You', when: 'Today' }); refresh(); showProduct(row, active); bench.report('Decision updated.', () => { row.decision = previous.decision; row.cap = previous.cap; row.activity = previous.activity; refresh(); }); };
      const extra = make('div', '', 'product-profile__footer'); const edit = button('Edit Product', () => editProduct(row, true)); edit.dataset.icon = 'edit';
      const decisions = make('details', '', 'product-profile__decision'); const trigger = make('summary', 'Set Decision'); trigger.setAttribute('aria-haspopup', 'menu');
      const menuHost = make('div', '', 'product-profile__decision-menu'); const decisionRoot = createRoot(menuHost);
      const closeDecisions = () => { decisions.open = false; trigger.focus(); };
      decisionRoot.render(createElement(Menu, { label: 'Product decision', onClose: closeDecisions },
        ...([['noChange', 'No Change'], ['stopPromos', 'Stop Promos'], ['raisePrice', 'Raise Price'], ['clearance', 'Clearance']] as const).map(([value, label]) => createElement(MenuItem, { key: value, 'aria-pressed': row.decision === value, onClick: () => selectDecision(value) }, label)),
        createElement('details', { key: 'caps' },
          createElement('summary', { 'aria-haspopup': 'menu' }, 'Cap Discount'),
          createElement('div', { className: 'product-profile__caps' }, createElement(Menu, { label: 'Discount cap', onClose: () => { const caps = menuHost.querySelector('details'); if (caps) { caps.open = false; caps.querySelector('summary')?.focus(); } } },
            ...[10, 15, 20, 25, 30, 35].map(value => createElement(MenuItem, { key: value, onClick: () => selectDecision('cap', value / 100) }, `${value}%`))))),
        createElement(MenuItem, { key: 'clear', onClick: () => selectDecision(null) }, 'Clear Decision')));
      decisions.append(trigger, menuHost); extra.append(edit, decisions);
      renderTab(active);
      bench.form(row.label, [body], () => false, extra, undefined, () => { tabControl.destroy(); actionRoot.unmount(); decisionRoot.unmount(); }); const node = dialog(); if (node) { const actions = node.querySelector('.workbench-actions'); Array.from(actions?.children ?? []).filter(child => child instanceof HTMLButtonElement).forEach(child => child.remove()); addClose(node); }
    }

    function editProduct(row?: Product, fromView = false) {
      if (row) row = rows.find(item => item.id === row!.id) ?? row;
      const name = input('Product name', row?.label); name.required = true; name.placeholder = 'Product name';
      const departments = ['footwear', 'apparel', 'packs', 'camp', 'climb', 'accessories']; const region = select('Department', departments, row?.region ?? 'footwear'); const owner = personSelect('Owner', Object.values(owners).map(item => item.name), owners[row?.ownerId ?? 'own_ao'].name);
      const price = input('List Price', row ? String(row.listPrice) : '', 'number'); price.min = '1'; price.max = '5000'; price.step = '1'; price.required = true;
      const landed = input('Landed Cost', String(Math.round((row?.landed ?? .4) * 100)), 'number'); landed.min = '1'; landed.max = '95'; landed.step = '1'; landed.required = true;
      const serve = input('Cost to Serve', String(Math.round((row?.serve ?? .15) * 100)), 'number'); serve.min = '0'; serve.max = '60'; serve.step = '1'; serve.required = true;
      const note = createControl(document, 'textarea'); note.value = row?.note ?? ''; note.maxLength = 140; note.placeholder = 'Anything the team should know'; note.setAttribute('aria-label', 'Note');
      const body = make('div', '', 'scale-edit product-edit'); body.append(make('p', row?.label ?? 'A new product starts with no sales.', 'product-edit__subtitle'));
      const pair = (a: HTMLElement, b: HTMLElement) => { const line = make('div', '', 'scale-edit__pair'); line.append(a,b); return line; };
      const priceField = field('List Price', price), box = make('div', '', 'scale-edit__money'); box.append(make('span', '$'), price); priceField.append(box, make('small', 'Per unit, before discounts.'));
      const stepper = (label: string, control: HTMLInputElement, hint: string) => { const wrapper = field(label, control); const stepper = createNumberStepperElement({ input: control, decreaseLabel: `Decrease ${label}`, increaseLabel: `Increase ${label}`, className: 'product-edit__stepper' }); wrapper.append(stepper.element, make('small', hint)); return wrapper; };
      const landedField = stepper('Landed Cost', landed, 'Percent of list.'); const serveField = stepper('Cost to Serve', serve, 'Percent of net.');
      const breakEven = make('small', '', 'product-edit__break-even'); const update = () => { const rate = Number(serve.value) / 100, cost = Number(landed.value) / 100; breakEven.textContent = `Break-even at ${Math.round(Math.max(0, 1 - cost / Math.max(.001, 1 - rate)) * 100)}% off list.`; }; landed.oninput = serve.oninput = update; update();
      const noteField = field('Note', note); noteField.append(make('small', 'Optional, up to 140 characters.')); const error = make('p', '', 'scale-profile__error'); error.setAttribute('role', 'alert'); error.hidden = true;
      const costs = make('div', '', 'product-edit__costs'); costs.append(priceField, landedField, serveField);
      body.append(field('Name', name), pair(field('Department', region), field('Owner', owner)), costs, breakEven, noteField, error);
      const back = row && fromView ? button('Back', () => showProduct(row)) : undefined;
      bench.form(row ? 'Edit Product' : 'New Product', [body], () => {
        const key = (value: string) => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); if (!name.value.trim()) { error.hidden = false; error.textContent = 'Enter a product name.'; return false; }
        if (rows.some(item => item !== row && key(item.label) === key(name.value))) { error.hidden = false; error.textContent = 'Another product has this name.'; return false; }
        const ownerId = Object.keys(owners).find(id => owners[id].name === owner.value) ?? 'own_ao'; const draft = { label: name.value.trim(), region: region.value, ownerId, listPrice: Number(price.value), landed: Number(landed.value) / 100, serve: Number(serve.value) / 100, note: note.value.trim() };
        if (row) { const previous = structuredClone(row); Object.assign(row, draft); row.weeks = row.weeks.map(week => weeklyContribution(week, row.landed, row.serve)); row.promo = row.weeks.map(week => week[5] ? (week[3] < 0 ? -1 : 1) : 0); row.margin = undefined; const updates: string[] = []; if (row.landed !== previous.landed) updates.push(`Landed cost set to ${Math.round(row.landed * 100)}% of list`); if (row.serve !== previous.serve) updates.push(`Cost to serve set to ${Math.round(row.serve * 100)}% of net`); if (row.listPrice !== previous.listPrice) updates.push(`List price set to ${money(row.listPrice)}`); if (!updates.length) updates.push('Product updated'); row.activity.unshift(...updates.map(text => ({ text, by: 'You', when: 'Today' }))); refresh(); bench.report('Product saved.', () => { Object.assign(row, previous); refresh(); }); if (fromView) { showProduct(row); return false; } }
        else { let sequence = 1; let sku = ''; do { sku = `${region.value.slice(0, 2).toUpperCase()}-NEW${sequence++}`; } while (rows.some(item => item.sku === sku)); const created: Product = { ...draft, id: `product-${sku}`, sku, onHand: 0, decision: null, cap: null, promotionRules: [], activity: [{ text: 'Product added', by: ownerId, when: 'Today' }], data: Array(52).fill(0), weeks: Array.from({ length: 52 }, (): ProductWeek => [0,0,0,0,0,null]), markdown: 0, promo: Array(52).fill(0) }; rows.push(created); bench.resetPage(); refresh(); bench.report('Product added.', () => { const index = rows.indexOf(created); if (index >= 0) rows.splice(index, 1); refresh(); }); showProduct(created); return false; }
        return true;
      }, back, row ? 'Save Changes' : 'Add Product'); const node = dialog(); if (node) addClose(node);
    }

  },
};
