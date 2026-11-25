import { createSegmentedBarElement } from './segmented-bar';
import { createProgressElement } from '@revolist/ui/native';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { SegmentedSwitch } from '@revolist/ui/react';
import { createRecordNavigation } from '@revolist/ui/native';
import { mountTabs } from '@revolist/ui/native';
import { createDetailPanel } from '../../composables/detail-panel';
import { ROW_ACTION_COLUMN_WIDTH } from '../../composables/row-action';
import { renderExpandIcon } from '@revolist/revogrid-pro';
import { referenceStores } from './sales-reference-fixtures';
import { attainment, periods } from './sales-periods';
import { renderCellAction, renderColumnHeader, divergingBarsRenderer, entityCellRenderer, visualCellRenderer, cellActionRenderer, type MergeData } from '@revolist/revogrid-pro';
import type { ColumnData, ColumnRegular, DataType } from '@revolist/revogrid';
import {
  button,
  compactMoney,
  field,
  groupedMetrics,
  input,
  make,
  matches,
  money,
  pct,
  removeRecord,
  select,
  personSelect,
  total,
  type Example,
} from './workbench-ui';

const months = [
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
  'Oct',
];
const season = [
  0.095, 0.12, 0.065, 0.06, 0.075, 0.08, 0.085, 0.085, 0.09, 0.085, 0.075,
  0.085,
];
type Region = 'Americas' | 'EMEA' | 'APAC';
type StoreFixture = readonly [Region, string, string, string, string?];
// Fictional store locations and their region and operating context.
const fixtures: StoreFixture[] = [
  ['Americas', 'Portland Riverfront', 'United States', '🇺🇸'],
  ['Americas', 'Seattle Fremont', 'United States', '🇺🇸'],
  ['Americas', 'Miami Design District', 'United States', '🇺🇸', 'Refit'],
  ['Americas', 'Austin South Congress', 'United States', '🇺🇸'],
  ['Americas', 'Columbia Outlet', 'United States', '🇺🇸'],
  ['Americas', 'Vancouver Kitsilano', 'Canada', '🇨🇦'],
  ['Americas', 'Calgary Beltline', 'Canada', '🇨🇦'],
  ['Americas', 'Toronto Distillery', 'Canada', '🇨🇦'],
  ['Americas', 'Mexico City Condesa', 'Mexico', '🇲🇽'],
  ['Americas', 'Monterrey San Pedro', 'Mexico', '🇲🇽'],
  ['Americas', 'São Paulo Jardins', 'Brazil', '🇧🇷'],
  ['EMEA', 'London Spitalfields', 'United Kingdom', '🇬🇧'],
  ['EMEA', 'Manchester Northern Quarter', 'United Kingdom', '🇬🇧'],
  ['EMEA', 'Edinburgh Leith', 'United Kingdom', '🇬🇧'],
  ['EMEA', 'Bath Outlet', 'United Kingdom', '🇬🇧'],
  ['EMEA', 'Munich Schwabing', 'Germany', '🇩🇪'],
  ['EMEA', 'Hamburg Altona', 'Germany', '🇩🇪', 'Refit'],
  ['EMEA', 'Paris Canal Saint-Martin', 'France', '🇫🇷'],
  ['EMEA', 'Lyon Croix-Rousse', 'France', '🇫🇷'],
  ['EMEA', 'Annecy Lakeside', 'France', '🇫🇷'],
  ['EMEA', 'Madrid Chamberí', 'Spain', '🇪🇸'],
  ['EMEA', 'Barcelona Poblenou', 'Spain', '🇪🇸', 'Pre-opening'],
  ['APAC', 'Tokyo Kichijoji', 'Japan', '🇯🇵'],
  ['APAC', 'Osaka Namba', 'Japan', '🇯🇵'],
  ['APAC', 'Hakone Outlet', 'Japan', '🇯🇵'],
  ['APAC', 'Melbourne Carlton', 'Australia', '🇦🇺'],
  ['APAC', 'Sydney Newtown', 'Australia', '🇦🇺'],
  ['APAC', 'Hobart Battery Point', 'Australia', '🇦🇺'],
];
const regions: Region[] = ['Americas', 'EMEA', 'APAC'];
const compactStoreCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumSignificantDigits: 3,
});
const storeMoney = (value: number) =>
  compactStoreCurrency.format(value).replace('K', 'k');
const varianceMoney = (value: number) => value >= 1000 && value < 100000
  ? `$${(value / 1000).toFixed(1)}k` : storeMoney(value);
interface Store {
  label: string;
  region: Region;
  target: number;
  sales: number[];
  country?: string;
  flag?: string;
  monthlyTargets?: number[];
  note?: string;
  id: string;
  format: string;
  status: string;
  managerId: string;
  opened: string;
  priorTarget: number | null;
  missingSales: boolean[];
}
export const salesTargets: Example = {
  id: 'sales-to-target',
  title: 'Store Sales vs. Targets',
  description:
    'Monthly results, rolling quarter, and fiscal year sales by region',
  setup(bench) {
    let month = 10;
    const rows: Store[] = fixtures.map(([region, label, country, flag, note]) => {
      const reference = referenceStores.find(store => store.name === label);
      if (!reference) throw new Error(`Missing reference store: ${label}`);
      return {
        id: reference.id, label, region, country, flag, note,
        format: reference.format, status: reference.status, managerId: reference.managerId,
        opened: reference.opened ?? '', priorTarget: reference.priorTarget,
        target: reference.target ?? 0,
        sales: reference.actuals.map(value => value ?? 0),
        missingSales: reference.actuals.map(value => value == null),
        monthlyTargets: reference.targets.map(value => value ?? 0),
      };
    });
    const folded = new Set<Store['region']>();
    const monthLabels = months.map(
      (label, index) => `${label} ${index < 2 ? 2025 : 2026}`,
    );
    const monthPick = select(
      'Reporting month',
      monthLabels,
      monthLabels[month],
      (value) => {
        month = monthLabels.indexOf(value);
        refresh();
      },
    );
    const status = select(
      'Attainment filter',
      ['All stores', 'Behind', 'Close', 'On target'],
      'All stores',
      refresh,
    );
    const sort = select(
      'Sort stores',
      ['Region order', 'Store name', 'Monthly sales', 'Monthly attainment'],
      'Region order',
      refresh,
    );
    const fold = button('Collapse regions', () => {
      if (folded.size === regions.length) folded.clear();
      else regions.forEach((region) => folded.add(region));
      refresh();
    });
    bench.heading.append(
      monthPick,
      button('Add Store', () => edit(), true),
    );
    const statusBar = make('div', '', 'sales-status-tools');
    statusBar.dataset.toolbar = 'main';
    const asOf = make('span');
    const statusGroup = make('div');
    const statusRoot = createRoot(statusGroup);
    bench.onDispose(() => statusRoot.unmount());
    statusGroup.addEventListener('click', event => {
      const target = (event.target as Element).closest<HTMLButtonElement>('button[data-status]');
      if (target?.dataset.status === status.value) {
        event.stopPropagation();
        status.value = 'All stores';
        refresh();
      }
    }, true);
    const key = make('div', '', 'sales-legend');
    key.append(make('span', '% to target'), make('span', 'Behind'));
    const scale = createSegmentedBarElement(document, { label: 'Target attainment from behind to ahead', total: 5, parts: ['#fda4af', '#ffe4e6', '#f3f3f3', '#d1fae5', '#6ee7b7'].map(color => ({ value: 1, color })) });
    scale.classList.add('sales-legend__scale'); key.append(scale);
    key.append(make('span', 'Ahead'));
    statusBar.append(asOf, statusGroup, key);
    bench.toolbar.append(statusBar, status, sort, fold);
    bench.onSearch(refresh);
    bench.onCompactChange(refresh);
    const ratioColumn = (index: number): ColumnRegular => ({
      prop: `ratio${index}`, name: '% Target', size: 80, sortable: true, cellTemplate: visualCellRenderer,
      visualCell: { format: (value) => {
        const ratio = value as number | null, rounded = ratio === null ? null : Math.round(ratio);
        const tone = rounded === null ? 'neutral' : rounded >= 108 ? 'very-positive' : rounded >= 100 ? 'positive' : rounded < 85 ? 'very-negative' : rounded < 95 ? 'negative' : 'warning';
        const state = tone === 'very-positive' ? 'ahead' : tone === 'positive' ? 'good' : tone === 'very-negative' ? 'far-behind' : tone === 'negative' ? 'bad' : tone === 'warning' ? 'warn' : '';
        return { kind: 'heat-value', text: rounded === null ? '–' : `${rounded}%`, tone, className: `sales-tile ${state}` };
      } },
    });
    const history: ColumnRegular = {
      prop: 'history',
      name: 'By Month',
      size: 112,
      cellTemplate: divergingBarsRenderer,
      divergingBars: {
        label: 'Monthly variance across the fiscal year',
        maxAbs: (model) => Math.max(1, ...model.history.map(Math.abs)),
        highlightIndex: (model) => model.history.length - 1,
      },
    };
    const variance = (index: number): ColumnRegular => ({
      prop: `variance${index}`, name: 'Variance', size: 80, sortable: true, cellTemplate: visualCellRenderer,
      visualCell: { format: (raw, model) => {
        if (model[`ratio${index}`] === null) return { kind: 'text', className: 'metric-number', text: '–' };
        const value = Number(raw);
        return { kind: 'text', className: `sales-variance ${value < 0 ? 'bad' : 'good'}`, tone: value < 0 ? 'negative' : 'positive', text: `${value < 0 ? '▾' : '▴'} ${varianceMoney(Math.abs(value))}` };
      } },
    });
    const columns: ColumnData = groupedMetrics([
      {
        name: 'Stores', children: [
          {
            prop: 'regionLabel', name: '', size: 28, pin: 'colPinStart',
            columnTemplate: h => renderCellAction(h, { label: 'Toggle all regions', className: 'cell-action', content: h => renderExpandIcon(h, folded.size !== regions.length), onActivate: () => fold.click() }),
            cellTemplate: visualCellRenderer,
            visualCell: {
              format: (_value, model) => model.total || (model.group && model.expanded) ? undefined : ({ kind: 'rail', className: `sales-region-rail region-${String(model.regionLabel).toLowerCase()} ${model.regionHead || model.group ? 'rail-start' : ''}`, parts: { action: 'cell-action' }, ...(model.regionHead || model.group ? { text: model.group ? '' : model.regionLabel, actionLabel: `${model.group ? 'Expand' : 'Collapse'} ${model.regionLabel}`, expanded: !model.group } : {}) }),
              onActivate: model => { if (model.group) folded.delete(model.regionLabel); else folded.add(model.regionLabel); refresh(); },
            },
          },
          {
            prop: 'country', name: 'Country', size: 136, pin: 'colPinStart', cellTemplate: entityCellRenderer,
            entityCell: {
              format: (_value, model) => {
                if (model.total) return { kind: 'identity', label: 'Grand Total', interactive: false };
                if (model.group) return { kind: 'group', variant: 'inline', label: model.label, actionClassName: 'cell-action', actionLabel: `${model.expanded ? 'Collapse' : 'Expand'} ${model.regionLabel}`, expanded: !!model.expanded };
                if (!model.countryHead) return;
                return { kind: 'identity', className: 'sales-country', label: `${model.flag ?? ''} ${model.country}`, detail: `${model.countryCount} stores`, interactive: false };
              },
              onActivate: model => { if (folded.has(model.regionLabel)) folded.delete(model.regionLabel); else folded.add(model.regionLabel); refresh(); },
            },
          },
          {
            prop: 'label', name: 'Store', size: 275, pin: 'colPinStart', cellTemplate: entityCellRenderer,
            entityCell: {
              format: (_value, model) => {
                const compact = window.matchMedia('(max-width: 650px)').matches;
                if (model.total || model.group) return compact
                  ? { kind: 'group', variant: 'inline', className: 'sales-total-compact', label: model.label, detail: model.subtitle, interactive: false }
                  : { kind: 'identity', className: 'sales-total-detail', label: model.subtitle, labelElement: 'span', interactive: false };
                return { kind: 'identity', className: 'sales-store', label: model.label, actionLabel: `Open ${model.label}`, actionClassName: 'cell-action', detailPosition: 'inline', ...(!compact && model.note ? { detail: `• ${model.note}` } : {}), ...(compact && model.flag ? { leading: h => h('span', { class: 'sales-store__flag', 'aria-hidden': 'true' }, model.flag) } : {}) };
              },
              onActivate: model => showStore(model.store),
            },
          },
        ],
      },
      ...['Month', 'Last 3 Months', 'Year to Date'].map((name, index) => ({
        name, children: [
          {
            prop: `actual${index}`, name: 'Actual', size: 74, sortable: true, cellTemplate: visualCellRenderer,
            visualCell: { format: (value: unknown, model: DataType) => ({ kind: 'text' as const, className: 'metric-number', text: model[`ratio${index}`] === null && !value ? '–' : storeMoney(Number(value)) }) },
          },
          ...(index < 2 ? [variance(index)] : []), ratioColumn(index), ...(index === 2 ? [history] : []),
        ],
      })),
      { prop: 'actions', columnChooser: false, name: '', size: ROW_ACTION_COLUMN_WIDTH, cellTemplate: cellActionRenderer, cellAction: { label: row => `Actions for ${row.label}`, visible: row => !row.total && !row.group, onActivate: row => edit(row.store) } },
    ]);
    const lead = columns[0];
    const compactColumns: ColumnData =
      'children' in lead
        ? [
            { ...lead, children: [{ ...lead.children[2], size: 149 }] },
            ...columns.slice(1),
          ]
        : columns;
    // Group-header render hooks let the label follow the selected reporting period.
    bench.grid.addEventListener('beforegroupheaderrender', ({ detail }) => {
      const name = String(detail.group.name);
      const periodName = (index: number) =>
        `${months[index]} ${index < 2 ? 2025 : 2026}`;
      const subtitle =
        name === 'Stores'
          ? 'By region and country'
          : name === 'Month'
            ? periodName(month)
            : name === 'Last 3 Months'
              ? `${months[Math.max(0, month - 2)]} to ${periodName(month)}`
              : name === 'Year to Date'
                ? `Nov 2025 to ${periodName(month)}`
                : '';
      if (subtitle)
        detail.group.columnTemplate = h => renderColumnHeader(h, { className: 'sales-group-heading', label: name, subtitle });
    });
    refresh();

    function read(stores: Store[]) {
      const scores = months.map((_, index) =>
        total(stores, (row) => row.sales[index]),
      );
      const targets = season.map((fraction, index) =>
        total(
          stores,
          (row) => row.monthlyTargets?.[index] ?? row.target * fraction,
        ),
      );
      const result = periods(scores, targets, month);
      // A future or not-yet-trading period has no reading, rather than zero sales.
      for (const [index, from] of [[0, month], [1, Math.max(0, month - 2)], [2, 0]] as const) {
        const hasReading = stores.some(store => store.missingSales.slice(from, month + 1).some(missing => !missing));
        if (!hasReading) result[`ratio${index}`] = null;
      }
      return {
        ...result,
        history: scores
          .slice(0, month + 1)
          .map((value, index) => value - targets[index]),
      };
    }

    function standing(row: Store) {
      const ratio = row.missingSales[month] ? null : attainment(
        row.sales[month],
        row.monthlyTargets?.[month] ?? row.target * season[month],
      );
      return ratio === null
        ? 'No target'
        : ratio >= 100
          ? 'On target'
          : Math.round(ratio) >= 95
            ? 'Close'
            : 'Behind';
    }

    function refresh() {
      const matching = rows.filter((row) =>
        matches(bench.currentQuery(), row.label, row.region, row.country ?? ''),
      );
      const list = matching.filter(
        (row) =>
          status.value === 'All stores' || status.value === standing(row),
      );
      asOf.textContent = `Stores in ${months[month]} ${month < 2 ? 2025 : 2026}`;
      statusRoot.render(createElement(SegmentedSwitch, {
        role: 'group', ariaLabel: 'Store attainment', value: status.value,
        options: ['Behind', 'Close', 'On target'].map(value => ({ value, label: `${value === 'On target' ? 'On Target' : value}  ${matching.filter(row => standing(row) === value).length}`, buttonAttributes: { 'data-status': value } })),
        onChange: (value: string | number) => { if (typeof value === 'string') { status.value = value; refresh(); } },
      }));
      const regionCount = new Set(list.map((row) => row.region)).size;
      bench.setSubtitle(
        `${months[month]} ${month < 2 ? 2025 : 2026} closed • ${list.length} stores${window.matchMedia('(max-width: 650px)').matches ? '' : ` • ${regionCount} regions`}`,
      );
      const grand = {
        label: 'Grand Total',
        total: true,
        subtitle: `${list.length} stores in ${regionCount} regions`,
        ...read(list),
      };
      const ranges: MergeData[] = [];
      let start = 0;
      const data = regions.flatMap((region) => {
        const group = list.filter((row) => row.region === region);
        if (!group.length) return [];
        const expanded = !folded.has(region);
        const subtotal: DataType = {
          label: region + ' Total',
          regionLabel: region,
          group: true,
          expanded,
          subtitle: `${group.length} stores`,
          ...read(group),
        };
        if (!expanded) {
          start++;
          return [subtotal];
        }

        const countryKeys = [
          ...new Set(group.map((row) => row.country ?? row.region)),
        ];
        const stores: DataType[] = countryKeys.flatMap((country) => {
          const byCountry = group.filter(
            (row) => (row.country ?? row.region) === country,
          );
          byCountry.sort((left, right) => {
            if (sort.value === 'Store name')
              return left.label.localeCompare(right.label);
            if (sort.value === 'Monthly sales')
              return right.sales[month] - left.sales[month];
            if (sort.value === 'Monthly attainment')
              return Number(read([right]).ratio0) - Number(read([left]).ratio0);
            return 0;
          });
          if (byCountry.length > 1)
            ranges.push({
              row: start,
              rowSpan: byCountry.length,
              column: 1,
              colType: 'colPinStart',
            });
          const first = country === countryKeys[0];
          start += byCountry.length;
          return byCountry.map((store, index) => ({
            label: store.label,
            country,
            flag: store.flag,
            countryCount: byCountry.length,
            countryHead: index === 0,
            regionHead: first && index === 0,
            regionLabel: region,
            store,
            note: store.note,
            ...read([store]),
          }));
        });
        start++;
        return [...stores, subtotal];
      });
      fold.textContent =
        folded.size === regions.length ? 'Expand regions' : 'Collapse regions';
      const compact = window.matchMedia('(max-width: 650px)').matches;
      bench.mergeCells(compact ? [] : ranges);
      bench.render(
        compact ? [...compactColumns] : [...columns],
        data,
        list.length ? [grand] : [],
      );
    }

    const managers: Record<string, string> = {
      mgr_ms: 'Mira Stone', mgr_aj: 'Alex Johnson', mgr_tp: 'Theo Park', mgr_ns: 'Nina Santos',
      mgr_ew: 'Emma Wilson', mgr_lg: 'Leo Grant', mgr_nv: 'Nora Vale', mgr_lo: 'Lucia Ortega',
      mgr_dk: 'David Kim', mgr_sc: 'Sarah Chen',
    };
    const countryOptions = [...new Map(fixtures.map(([region, , country, flag]) => [country, { region, country, flag }])).values()];
    let nextStore = 1;
    type StoreTab = 'Overview' | 'Months' | 'Details';
    const dollar = (value: number) => `$${Math.round(value).toLocaleString('en-US')}`;
    const signedVariance = (value: number) => `${value < 0 ? '−' : '+'}${varianceMoney(Math.abs(value))}`;
    const periodLabel = (index: number) => `${months[index]} ${index < 2 ? 2025 : 2026}`;
    function drawerClose(dialog: HTMLDialogElement) {
      const close = button('×', () => dialog.close());
      close.className = 'scale-drawer-close'; close.setAttribute('aria-label', 'Close');
      dialog.querySelector('form')?.append(close);
    }
    function showStore(store: Store, active: StoreTab = 'Overview') {
      const peers = rows.filter(row => matches(bench.currentQuery(), row.label, row.region, row.country ?? '') && (status.value === 'All stores' || status.value === standing(row)));
      if (!peers.includes(store)) peers.push(store);
      const position = peers.indexOf(store);
      const body = make('div', '', 'scale-profile sales-profile');
      const head = make('div', '', 'scale-profile__heading');
      const meta = make('div', '', 'scale-profile__meta'); meta.append(make('span', store.id, 'scale-profile__id'));
      const navigation = createRecordNavigation(document, {
        index: position, count: peers.length, label: `${position + 1} of ${peers.length}`,
        previousLabel: 'Previous store', nextLabel: 'Next store', className: 'scale-profile__navigation',
        onPrevious: () => showStore(peers[position - 1], active),
        onNext: () => showStore(peers[position + 1], active),
      });
      meta.append(navigation);
      const heading = make('div', '', 'scale-profile__name');
      heading.append(make('strong', store.label), make('span', store.status, `scale-profile__stage ${store.status === 'Trading' ? 'active' : ''}`));
      head.append(meta, heading, make('p', `${store.flag ?? ''} ${store.country ?? ''}  •  ${store.format}  •  ${managers[store.managerId] ?? ''}`, 'scale-profile__location'));
      const tabs = make('div');
      const panel = make('div', '', 'scale-profile__content'); panel.setAttribute('role', 'tabpanel'); panel.id = `store-panel-${store.id}`;
      const names: StoreTab[] = ['Overview', 'Months', 'Details'];
      const tabOptions = names.map(name => ({ value: name, label: name, id: `store-${store.id}-${name}`, ariaControls: panel.id }));
      const tabProps = (value: StoreTab) => ({ value, options: tabOptions, onChange: showTab, ariaLabel: 'Store details', className: 'scale-profile__tabs rv-tabs--underline' });
      const tabControl = mountTabs(tabs, tabProps(active));
      const controls = [...tabs.querySelectorAll<HTMLButtonElement>('[role=tab]')];
      body.append(head, tabs, panel);
      const section = (title: string, subtitle: string) => { const { card, body } = createDetailPanel(title, subtitle, { card: 'scale-profile__section', heading: 'scale-profile__section-heading', body: 'scale-profile__section-content' }); panel.append(card); return body; };
      function showTab(tab: StoreTab) {
        active = tab; tabControl.update(tabProps(tab)); panel.replaceChildren(); panel.setAttribute('aria-labelledby', controls[names.indexOf(tab)].id);
        controls.forEach((control, index) => { const selected = names[index] === tab; control.setAttribute('aria-selected', String(selected)); control.tabIndex = selected ? 0 : -1; });
        const targets = store.monthlyTargets ?? season.map(fraction => store.target * fraction);
        if (tab === 'Overview') {
          const result = read([store]);
          const content = section('Against Target', `Three periods to ${periodLabel(month)}`);
          const periodsInfo = [
            ['Month', periodLabel(month), result.actual0, result.variance0, result.ratio0],
            ['Last 3 Months', `${months[Math.max(0, month - 2)]} to ${periodLabel(month)}`, result.actual1, result.variance1, result.ratio1],
            ['Year to Date', `Nov 2025 to ${periodLabel(month)}`, result.actual2, result.variance2, result.ratio2],
          ] as const;
          for (const [title, label, actual, variance, ratio] of periodsInfo) {
            const item = make('div', '', 'sales-profile__period');
            const line = make('div', '', 'sales-profile__period-heading');
            const titleText = make('span'); titleText.append(make('strong', title), make('small', label));
            const state = ratio == null ? 'No target' : ratio >= 100 ? 'On Target' : Math.round(ratio) >= 95 ? 'Close' : 'Behind';
            line.append(titleText, make('span', state, `sales-profile__standing ${state.toLowerCase().replace(' ', '-')}`));
            const track = createProgressElement(document, { label: `${title} attainment`, value: ratio, max: 100 });
            const summary = make('div', '', 'sales-profile__period-summary');
            const detail = make('span'); detail.append(make('strong', ratio == null ? '—' : `${Math.round(ratio)}%`), make('small', ratio == null ? 'No target' : `${storeMoney(actual)} of ${storeMoney(actual - variance)}`));
            summary.append(detail, make('span', ratio == null ? '' : `${variance < 0 ? '▾' : '▴'} ${signedVariance(variance)}`, variance < 0 ? 'negative' : 'positive'));
            item.append(line, track, summary); content.append(item);
          }
          const chart = section('By Month', "FY26 sales, a tick at each month's target");
          const bars = make('div', '', 'sales-profile__chart');
          const max = Math.max(1, ...store.sales, ...targets) * 1.04;
          months.forEach((name, index) => {
            const col = make('div', '', 'sales-profile__chart-column');
            const plot = make('div', '', 'sales-profile__plot');
            const bar = make('span', '', `sales-profile__bar ${index === month ? 'current' : ''} ${store.missingSales[index] ? 'empty' : ''}`);
            bar.style.height = `${Math.max(0, (store.missingSales[index] ? targets[index] : store.sales[index]) / max * 100)}%`;
            const tick = make('i'); tick.style.bottom = `${targets[index] / max * 100}%`; plot.append(bar); if (!store.missingSales[index]) plot.append(tick);
            col.append(plot, make('small', name)); bars.append(col);
          });
          bars.setAttribute('aria-label', `${store.label}, FY26 sales against target by month`); chart.append(bars);
        } else if (tab === 'Months') {
          const content = section('Every Month', 'FY26, November to October');
          const table = make('table', '', 'sales-profile__table'); table.setAttribute('aria-label', `${store.label}, FY26 sales against target by month`);
          const thead = make('thead'); const header = make('tr'); for (const label of ['Month', 'Actual', 'Target', 'Variance', '%']) header.append(make('th', label)); thead.append(header);
          const tbody = make('tbody'); months.forEach((name, index) => {
            const tr = make('tr'); const actual = store.sales[index], target = targets[index], missing = store.missingSales[index], ratio = missing ? null : attainment(actual, target);
            const date = make('td', `${name} ${index < 2 ? 2025 : 2026}`); if (index > month) date.append(make('small', ' Open'));
            const variance = make('td', missing || !target ? 'No variance' : `${actual < target ? '▾' : '▴'} ${signedVariance(actual - target)}`, missing || !target ? 'muted' : actual < target ? 'negative' : 'positive');
            const rate = make('td'); rate.append(make('span', ratio == null ? '—' : `${Math.round(ratio)}%`, `sales-profile__rate ${ratio == null ? '' : ratio >= 108 ? 'ahead' : ratio >= 100 ? 'good' : ratio < 95 ? 'bad' : 'warn'}`));
            tr.append(date, make('td', missing ? 'None' : storeMoney(actual)), make('td', target ? storeMoney(target) : 'None'), variance, rate); tbody.append(tr);
          }); table.append(thead, tbody); content.append(table);
        } else {
          const details = section('Details', 'Where it trades and who runs it'); const list = make('dl', '', 'scale-profile__details');
          const opened = store.opened ? new Date(`${store.opened}T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' }) : 'Not opened';
          for (const [label, value] of [['Store code', store.id], ['Region', store.region], ['Country', `${store.flag ?? ''} ${store.country ?? ''}`], ['Format', store.format], ['Status', store.status], ['Manager', managers[store.managerId] ?? ''], ['Opened', opened]]) list.append(make('dt', label), make('dd', value)); details.append(list);
          const targetContent = section('Targets', 'Net sales per fiscal year'); const targetList = make('dl', '', 'scale-profile__details');
          for (const [label, value] of [['FY26 target', store.target ? dollar(store.target) : 'None'], ['FY25 target', store.priorTarget ? dollar(store.priorTarget) : 'None'], ['Refit closure', store.status === 'Refit' && store.missingSales[10] ? 'Sep 2026' : 'None']]) targetList.append(make('dt', label), make('dd', value)); targetContent.append(targetList);
        }
      }

      showTab(active);
      const extra = make('div', '', 'scale-profile__footer-extra');
      const remove = button('Delete', () => removeRecord(bench, rows, store, store.label, refresh)); remove.className = 'scale-profile__delete'; remove.dataset.icon = 'trash';
      const exportButton = button('Export CSV', () => {
        const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const records = [['Month', 'Actual', 'Target'], ...months.map((name, index) => [periodLabel(index), store.missingSales[index] ? '' : store.sales[index], store.monthlyTargets?.[index] ?? ''])];
        const url = URL.createObjectURL(new Blob([records.map(record => record.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })); const link = make('a'); link.href = url; link.download = `${store.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-sales.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
      }); exportButton.dataset.icon = 'download'; extra.append(remove, exportButton);
      bench.form(store.label, [body], () => { edit(store, true); return false; }, extra, 'Edit', () => tabControl.destroy());
      const dialog = bench.heading.parentElement?.querySelector<HTMLDialogElement>('dialog.workbench-dialog');
      if (dialog) { const actions = dialog.querySelector('.workbench-actions'); Array.from(actions?.children ?? []).find(child => child instanceof HTMLButtonElement && child.type === 'button' && child.textContent === 'Cancel')?.remove(); const submit = actions?.querySelector<HTMLButtonElement>('button[type=submit]'); if (submit) submit.dataset.icon = 'edit'; drawerClose(dialog); }
    }

    function edit(store?: Store, fromView = false) {
      const name = input('Store name', store?.label); name.required = true; name.placeholder = 'Lisbon Chiado';
      const country = select('Country', countryOptions.map(item => item.country), store?.country ?? 'United States');
      const format = select('Format', ['Standard', 'Flagship', 'Outlet'], store?.format ?? 'Standard');
      const statusControl = select('Status', ['Pre-opening', 'Trading', 'Refit'], store?.status ?? 'Pre-opening');
      const manager = personSelect('Manager', Object.values(managers), managers[store?.managerId ?? 'mgr_ms']);
      const target = input('FY26 Sales Target', store?.target ? String(store.target) : '', 'number'); target.min = '0'; target.step = '1'; target.placeholder = '3200000';
      const body = make('div', '', 'scale-edit sales-edit'); body.append(make('p', store?.id ?? 'No sales until its first closed month.', 'scale-edit__subtitle'));
      const pair = (first: HTMLElement, second: HTMLElement) => { const row = make('div', '', 'scale-edit__pair'); row.append(first, second); return row; };
      const countryField = field('Country', country); const countryHint = make('small');
      const updateCountryHint = () => { const selected = countryOptions.find(item => item.country === country.value); countryHint.textContent = `Sits under ${selected?.region ?? ''}.`; }; country.addEventListener('change', updateCountryHint); updateCountryHint(); countryField.append(countryHint);
      const moneyField = field('FY26 Sales Target', target); const box = make('div', '', 'scale-edit__money'); box.append(make('span', '$'), target); moneyField.append(box, make('small', 'Net sales for Nov to Oct, phased by the season curve over the months the store trades.'));
      const error = make('p', '', 'scale-profile__error'); error.setAttribute('role', 'alert'); error.hidden = true;
      body.append(field('Name', name), pair(countryField, field('Format', format)), pair(field('Status', statusControl), field('Manager', manager)), moneyField, error);
      const back = fromView && store ? button('Back', () => showStore(store)) : undefined;
      bench.form(store ? 'Edit Store' : 'New Store', [body], () => {
        const key = (value: string) => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        if (!name.value.trim()) { error.textContent = 'Enter a store name.'; error.hidden = false; return false; }
        if (rows.some(row => row !== store && key(row.label) === key(name.value))) { error.textContent = 'Another store has this name.'; error.hidden = false; return false; }
        const location = countryOptions.find(item => item.country === country.value)!; const targetValue = target.value ? Number(target.value) : 0;
        const monthlyTargets = store?.monthlyTargets && store.target ? store.monthlyTargets.map(value => value * targetValue / store.target) : season.map(value => value * targetValue);
        const draft = { label: name.value.trim(), country: location.country, flag: location.flag, region: location.region, format: format.value, status: statusControl.value, managerId: Object.keys(managers).find(id => managers[id] === manager.value) ?? 'mgr_ms', target: targetValue, monthlyTargets, note: statusControl.value === 'Trading' ? undefined : statusControl.value };
        if (store) { const previous = structuredClone(store); Object.assign(store, draft); folded.delete(store.region); refresh(); bench.report('Store saved.', () => { Object.assign(store, previous); refresh(); }); if (fromView) { showStore(store); return false; } }
        else { const created: Store = { ...draft, id: `store-new-${nextStore++}`, sales: months.map(() => 0), missingSales: months.map(() => true), priorTarget: null, opened: '' }; rows.push(created); folded.delete(created.region); refresh(); bench.report('Store created.', () => { const index = rows.indexOf(created); if (index >= 0) rows.splice(index, 1); refresh(); }); showStore(created); return false; }
        return true;
      }, back, store ? 'Save Changes' : 'Create Store');
      const dialog = bench.heading.parentElement?.querySelector<HTMLDialogElement>('dialog.workbench-dialog'); if (dialog) drawerClose(dialog);
    }

  },
};
