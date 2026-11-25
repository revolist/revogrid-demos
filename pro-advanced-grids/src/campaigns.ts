import { mountTabs } from '@revolist/ui/native';
import { SegmentedSwitch } from '@revolist/ui/react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createDetailPanel } from '../../composables/detail-panel';
import { personPortrait } from '../../composables/demo-portraits';
import './campaign-rich-options.css';
import { ROW_ACTION_COLUMN_WIDTH } from '../../composables/row-action';
import { demoColors } from '../../composables/demo-colors';
import { mountActionBar } from '@revolist/ui/action-bar';
import { campaignWeeks, changePercent, safeRatio } from './campaign-detail-model';
import { campaignTrendChart } from './campaign-trend-chart';
import { createCampaigns, type Campaign } from './campaign-fixtures';
import { summarizeCampaigns } from './campaign-summary';
import { PopoverController } from '@revolist/ui/core/popover-controller';
import type { ColumnData, ColumnRegular, DataType } from '@revolist/revogrid';
import { bulletChartRenderer, comparisonSparklineRenderer, metricStackRenderer, progressLineRenderer, identityCellRenderer, cellActionRenderer, visualCellRenderer, KeyedRowSelectionPlugin, FIlTER_SELECTION, FIlTER_SLIDER, AdvanceFilterPlugin, compileFilterAst, type FilterAst, type FilterAstEditorHandle } from '@revolist/revogrid-pro';
import '@fortawesome/fontawesome-free/css/brands.css';
import {
  button,
  compactMoney,
  dropdown,
  field,
  input,
  make,
  matches,
  number,
  pct,
  type Example,
} from './workbench-ui';

const formatFilterNumber = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format;

const channels = ['LinkedIn Ads', 'Microsoft Ads', 'Twitch', 'TikTok', 'Pinterest', 'Meta Ads'];
const states = ['Live', 'Learning', 'Limited', 'Paused', 'Ended'];
const statusBadgeClass = (status: string) => `pill ${status === 'Live' ? 'good' : status === 'Limited' ? 'warn' : status === 'Learning' ? 'info' : ''}`;
const markets = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'ES', 'JP', 'BR', 'MX'];
const flags: Record<string, string> = {
  BR: '🇧🇷',
  MX: '🇲🇽',
  FR: '🇫🇷',
  US: '🇺🇸',
  GB: '🇬🇧',
  DE: '🇩🇪',
  CA: '🇨🇦',
  AU: '🇦🇺',
  ES: '🇪🇸',
  JP: '🇯🇵',
};
const marks: Record<string, string> = {
  'LinkedIn Ads': 'fa-linkedin',
  'Microsoft Ads': 'fa-microsoft',
  Twitch: 'fa-twitch',
  TikTok: 'fa-tiktok',
  Pinterest: 'fa-pinterest',
  'Meta Ads': 'fa-meta',
};
const ownerPortrait = personPortrait;
const signedPct = (value: number) => `${value > 0 ? '+' : ''}${pct(value)}`;
const cpaText = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});
export const campaigns: Example = {
  id: 'campaign-performance',
  title: 'Marketing Campaign Analytics',
  description: 'Paid media conversion and efficiency over the last 30 days',
  setup(bench) {
    const rows = createCampaigns().sort((a, b) => b.spend - a.spend);
    bench.grid.filter = {
      columnFilterButton: false,
      predefinedFilters: true,
      groupedFilter: {},
      slider: {
        showRangeInputs: true,
        getBounds: ({ columnProp }) => {
          const values = rows.map(row => (toGridRow(row) as Record<string, unknown>)[String(columnProp)]).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
          return values.length ? { min: Math.min(...values), max: Math.max(...values) } : undefined;
        },
      },
      selection: {
        getItems: {
          label: () => [...new Set(rows.map(row => row.label))].map(value => ({ value, label: value })),
          status: () => [...new Set(rows.map(row => row.status))].map(value => ({ value, label: value })),
        },
      },
    };

    const toaster = bench.toaster;

    let nextId = 1;
    let activeFilter: FilterAst | undefined;
    let filterPlugin: AdvanceFilterPlugin | undefined;
    let filterRefreshVersion = 0;
    const filterPopover = new PopoverController();
    let filterEditor: FilterAstEditorHandle | undefined;
    const filter = button('Filter', openFilters);
    filter.dataset.icon = 'filter';
    const bullet: ColumnRegular = {
      prop: 'roas',
      name: 'ROAS',
      filter: ['number', FIlTER_SLIDER],
      filterAstValueEditor: { kind: 'slider', min: 0, max: Math.max(1, ...rows.map(row => Number(toGridRow(row).roas) || 0)), step: 'any', formatValue: formatFilterNumber },
      size: 128,
      sortable: true,
      columnProperties: () => ({ class: 'campaign-number-header' }),
      cellTemplate: bulletChartRenderer,
      bulletChart: {
        actual: 'roas',
        target: 'target',
        display: (model) =>
          typeof model.roas === 'number' ? `${model.roas.toFixed(1)}x` : '–',
        max: 10,
        label: (value, model) => value === null ? 'No spend' : `${value.toFixed(1)}x ROAS against ${Number(model.target).toFixed(1)}x target`,
      },
    };
    const columns: ColumnData = [
      {
        prop: 'label', name: 'Campaign', size: 285, pin: 'colPinStart', sortable: true, filter: [FIlTER_SELECTION],
        cellTemplate: identityCellRenderer,
        identityCell: {
          format: (_value, model) => ({
            label: String(model.label), className: 'cell-label cell-label--has-photo', actionClassName: 'cell-action',
            actionLabel: `Open ${model.label}`, detail: `${model.subtitleFlag || ''} ${model.subtitle || ''}`.trim(),
            leading: (h) => h('span', { class: 'cell-mark cell-mark--platform', 'aria-hidden': 'true' }, [h('i', { class: `fa-brands ${model.brandIcon}` })]),
          }),
          onActivate: model => showCampaign(model.campaign),
        },
      },
      {
        prop: 'status',
        name: 'Status',
        filter: [FIlTER_SELECTION],
        size: 88,
        sortable: true,
        cellTemplate: visualCellRenderer,
        visualCell: { format: (_value, model) => ({ kind: 'text', text: String(model.status), className: statusBadgeClass(String(model.status)) }) },
      },
      ...(
        [
          [
            'spend',
            'Spend',
            116,
            compactMoney,
            (row: Record<string, any>) =>
              row.budget
                ? `${Math.round((row.spend / row.budget) * 100)}% of ${compactMoney(row.budget)}`
                : '',
          ],
          [
            'conversions',
            'Conversions',
            128,
            number,
            (row: Record<string, any>) =>
              row.change !== undefined ? signedPct(row.change) : 'New',
          ],
          [
            'cpa',
            'CPA',
            112,
            (value: number) => cpaText.format(value),
            (row: Record<string, any>) =>
              row.cpaChange !== undefined ? signedPct(row.cpaChange) : 'New',
          ],
        ] as const
      ).flatMap(([prop, name, size, format, detail]) => {
        const column: ColumnRegular = { prop, name, size, sortable: true };
        column.filter = ['number', FIlTER_SLIDER];
        column.filterAstValueEditor = { kind: 'slider', min: 0, max: Math.max(1, ...rows.map(row => Number(toGridRow(row)[prop]) || 0)), step: 'any', formatValue: formatFilterNumber };
        column.columnProperties = () => ({ class: 'campaign-number-header' });
        if (prop === 'spend') column.order = 'desc';
        column.cellTemplate = metricStackRenderer;
        column.metricStack = {
          format: (value, model) => ({
            value: typeof value === 'number' ? format(value) : '–',
            detail: detail(model),
            tone: prop === 'spend' || (prop === 'cpa' ? model.cpaChange === undefined : model.change === undefined)
              ? 'neutral'
              : (prop === 'cpa' ? model.cpaChange < 0 : model.change > 0) ? 'positive' : 'negative',
          }),
        };
        return prop === 'cpa'
          ? [
              {
                prop: 'trend',
                name: 'Trend',
                filter: false,
                size: 120,
                sortable: true,
                minValue: 0,
                sparklineAriaLabel: 'Daily conversions over 30 days',
                cellTemplate: comparisonSparklineRenderer,
                comparisonSparkline: {
                  label: 'Daily conversions over 30 days', minValue: 0,
                  maxValue: (model: DataType) => Math.max(1, ...model.trend), preserveAspectRatio: 'xMidYMid meet' as const,
                  series: [{ color: demoColors.purple, fill: 'solid' as const, fillOpacity: 0.12, endpoint: true, segmentLines: true }],
                },
              },
              column,
            ]
          : [column];
      }),
      bullet,
      {
        prop: 'buyers',
        name: 'New Buyers',
        filter: ['number', FIlTER_SLIDER],
        filterAstValueEditor: { kind: 'slider', min: 0, max: 100, step: 1, formatValue: formatFilterNumber },
        size: 128,
        sortable: true,
        columnProperties: () => ({ class: 'campaign-number-header' }),
        cellTemplate: progressLineRenderer,
        minValue: 0,
        maxValue: 100,
        formatValue: (value) => `${Math.round(value)}%`,
        progressLineAriaLabel: 'Share of new buyers',
      },
      { prop: 'actions', columnChooser: false, name: '', filter: false, size: ROW_ACTION_COLUMN_WIDTH, cellTemplate: cellActionRenderer, cellAction: { label: row => `Actions for ${row.label}`, visible: row => !row.total && !row.group, onActivate: row => showCampaign(row.campaign) } },
    ];
    bench.grid.resize = true;
    bench.toolbar.append(filter);
    const actionHost = make('div', '', 'campaign-bulk-host');
    actionHost.hidden = true;
    bench.toolbar.insertAdjacentElement('afterend', actionHost);
    let selectedIds = new Set<string>();
    const selectedRows = () => rows.filter(row => selectedIds.has(row.id));
    const clearSelection = () => {
      void bench.grid.getPlugins().then(plugins => plugins.find(plugin => plugin instanceof KeyedRowSelectionPlugin)?.clear());
    };
    const exportSelected = () => {
      const selected = selectedRows();
      const csv = [['Campaign', 'Channel', 'Market', 'Status', 'Spend', 'Conversions', 'ROAS'], ...selected.map(row => [row.label, row.channel, row.market, row.status, row.spend, row.conversions, row.spend ? row.revenue / row.spend : ''])];
      const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
      const url = URL.createObjectURL(new Blob([csv.map(line => line.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = 'selected-campaigns.csv'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    };
    const icon = (paths: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
    const actionIcons = {
      pause: icon('<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>'),
      export: icon('<path d="M12 3v12m-4-4 4 4 4-4M4 17v3h16v-3"/>'),
      delete: icon('<path d="M4 7h16M10 4h4M6 7l1 13h10l1-13M10 11v5m4-5v5"/>'),
    };
    const actionBar = mountActionBar(actionHost, { label: 'Selected campaigns', count: 0, selectionLabel: '', positioning: { mode: 'inline' } });
    function renderSelection() {
      const selected = selectedRows();
      const active = selected.length > 0;
      actionHost.hidden = !active;
      bench.toolbar.hidden = active;
      actionBar.update({
        label: 'Selected campaigns', count: selected.length,
        selectionLabel: `${selected.length} selected  •  ${compactMoney(selected.reduce((total, row) => total + row.spend, 0))} spend`,
        positioning: { mode: 'inline' },
        actions: [
          { id: 'pause', label: 'Pause', icon: actionIcons.pause, disabled: !selected.some(row => row.status !== 'Paused' && row.status !== 'Ended') },
          { id: 'export', label: 'Export', icon: actionIcons.export },
          { id: 'delete', label: 'Delete', icon: actionIcons.delete, variant: 'danger-outline' },
          { id: 'clear', label: 'Clear' },
        ],
        onAction: action => {
          if (action === 'clear') { clearSelection(); return; }
          if (action === 'export') { exportSelected(); return; }
          if (action === 'pause') {
            const changed = selected.filter(row => row.status !== 'Paused' && row.status !== 'Ended').map(row => ({ row, status: row.status }));
            changed.forEach(({ row }) => { row.status = 'Paused'; });
            clearSelection(); refresh();
            bench.report(`${changed.length} campaigns paused.`, () => { changed.forEach(({ row, status }) => { row.status = status; }); refresh(); });
          }
          if (action === 'delete') {
            const removed = rows.map((row, index) => ({ row, index })).filter(({ row }) => selectedIds.has(row.id));
            for (let index = rows.length - 1; index >= 0; index--) if (selectedIds.has(rows[index].id)) rows.splice(index, 1);
            clearSelection(); refresh();
            toaster.show({ title: removed.length === 1 ? 'Campaign deleted' : 'Campaigns deleted', description: removed.length === 1 ? removed[0].row.label : `${removed.length} campaigns removed.`, tone: 'success', action: { label: 'Undo', onClick: () => { removed.forEach(({ row, index }) => rows.splice(Math.min(index, rows.length), 0, row)); refresh(); } } });
          }
        },
      });
    }
    bench.grid.addEventListener('keyedrowselectionchange', event => {
      selectedIds = new Set(event.detail.keys.filter((key): key is string => typeof key === 'string'));
      renderSelection();
    });
    bench.onDispose(() => actionBar.destroy());
    bench.heading.append(button('New Campaign', () => edit(), true));
    bench.onSearch(() => { bench.resetPage(); refresh(); });
    refresh();

    function toGridRow(row: Campaign) {
      return {
        ...row,
        campaign: row,
        brandIcon: marks[row.channel],
        subtitleFlag: flags[row.market] ?? '',
        subtitle: `${row.market} · ${row.audience ?? row.channel}`,
        roas: row.spend ? row.revenue / row.spend : null,
        cpa: row.conversions ? row.spend / row.conversions : null,
        change: row.previousConversions ? (row.conversions / row.previousConversions - 1) * 100 : undefined,
        cpaChange: row.previousConversions && row.previousSpend && row.conversions ? ((row.spend / row.conversions) / (row.previousSpend / row.previousConversions) - 1) * 100 : undefined,
      };
    }

    function refresh() {
      const compiled = activeFilter && filterPlugin
        ? compileFilterAst(activeFilter, { columns: columns as ColumnRegular[], operators: filterPlugin.filterFunctionsIndexedByType })
        : undefined;
      const filtered = rows.filter((row) => matches(bench.currentQuery(), row.label, row.channel, row.market, row.id, row.owner, row.audience) &&
        (!compiled || compiled.matches(toGridRow(row))));
      const summary = summarizeCampaigns(filtered);
      const { spend, budget, impressions, clicks, conversions, revenue } = summary;
      filter.textContent = activeFilter ? 'Filter (active)' : 'Filter';
      filter.setAttribute('aria-label', filter.textContent);
      bench.setSubtitle(`${filtered.length} campaigns • ${summary.live} live in view • Sep 6 to Oct 5`);
      const compactNumber = (value: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
      const changeText = (value: number | null) => value === null ? 'New' : signedPct(value);
      bench.stats([
        ['Spend', compactMoney(spend), `${budget ? Math.round(spend / budget * 100) : 0}% of ${compactMoney(budget)} budget`],
        ['Impressions', compactNumber(impressions), `${impressions ? pct(clicks / impressions * 100) : '0%'} CTR`],
        ['Conversions', compactNumber(conversions), changeText(summary.conversionChange)],
        ['Blended CPA', conversions ? cpaText.format(spend / conversions) : '–', conversions ? changeText(summary.cpaChange) : '–'],
        ['Blended ROAS', spend ? `${(revenue / spend).toFixed(1)}x` : '–', `Target ${summary.target.toFixed(1)}x`],
        ['Below Target', number(summary.below), `of ${filtered.length} ${filtered.length === 1 ? 'campaign' : 'campaigns'}`],
      ]);
      const tone = (index: number, value: number | null, lowerIsBetter = false) => {
        const detail = bench.summary.children[index]?.querySelector('small');
        if (detail && value !== null) detail.classList.add((lowerIsBetter ? value <= 0 : value >= 0) ? 'campaign-change-good' : 'campaign-change-bad');
      };
      tone(2, summary.conversionChange);
      tone(3, summary.cpaChange, true);
      bench.render(
        window.matchMedia('(max-width: 650px)').matches ? [{ ...columns[0], size: 160 }, ...columns.slice(1)] : columns,
        filtered.map(toGridRow),
      );
    }

    bench.onCompactChange(refresh);

    async function openFilters() {
      if (filterPopover.isOpen) { filterPopover.close(); return; }
      const plugins = await bench.grid.getPlugins();
      filterPlugin = plugins.find((plugin) => plugin instanceof AdvanceFilterPlugin);
      if (!filterPlugin) return;
      const host = make('div', '', 'campaign-ast-filter');
      host.setAttribute('role', 'dialog');
      host.setAttribute('aria-label', 'Campaign filters');
      document.body.append(host);
      filterPopover.open({ anchor: filter, content: host, onClose: () => { filterEditor?.destroy(); filterEditor = undefined; host.remove(); } });
      filterEditor = filterPlugin.mountFilterAstEditor(host, { currentProp: 'status', config: { presentation: { status: { preview: false } } }, onCancel: () => filterPopover.close() });
    }
    bench.grid.addEventListener('filterastchange', (event) => {
      activeFilter = event.detail.filterAst;
      if (event.detail.origin === 'ui') queueMicrotask(() => filterPopover.close());
      bench.resetPage();
      const version = ++filterRefreshVersion;
      if (filterPlugin) {
        refresh();
      } else {
        void bench.grid.getPlugins().then(plugins => {
          if (version !== filterRefreshVersion) return;
          filterPlugin = plugins.find(plugin => plugin instanceof AdvanceFilterPlugin);
          refresh();
        });
      }
    });

    type CampaignTab = 'Overview' | 'Performance' | 'Audience';
    const owners = ['Sana Qureshi', 'Kenji Tan', 'Priya Patel', 'Omar Haddad', 'Sofia Romero', 'Elijah Morgan'];
    const audiences = ['Prospecting', 'Retargeting', 'Brand Search', 'Lookalike', 'Winback'];
    const marketNames: Record<string, string> = { US: 'United States', GB: 'United Kingdom', CA: 'Canada', AU: 'Australia', DE: 'Germany', FR: 'France', ES: 'Spain', JP: 'Japan', BR: 'Brazil', MX: 'Mexico' };
    const dollars = (value: number) => `$${Math.round(value).toLocaleString('en-US')}`;
    const compactCount = (value: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
    const date = (offset: number) => new Date(Date.UTC(2026, 8, 6 + offset)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    const percentage = (value: number | null) => value === null ? 'New' : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
    const dialog = () => bench.heading.parentElement?.querySelector<HTMLDialogElement>('dialog.workbench-dialog');
    const addClose = (node: HTMLDialogElement) => { const close = button('×', () => node.close()); close.className = 'scale-drawer-close'; close.setAttribute('aria-label', 'Close'); node.querySelector('form')?.append(close); };
    function showCampaign(row: Campaign, active: CampaignTab = 'Overview') {
      row = rows.find(item => item.id === row.id) ?? row;
      const body = make('div', '', 'scale-profile campaign-profile');
      const header = make('div', '', 'campaign-profile__heading'); header.append(make('span', row.id, 'scale-profile__id'));
      const identity = make('div', '', 'campaign-profile__identity'); const icon = make('span', '', `campaign-profile__icon fa-brands ${marks[row.channel] ?? ''}`); icon.setAttribute('aria-hidden', 'true');
      const identityText = make('div'); const title = make('div', '', 'campaign-profile__title'); title.append(make('strong', row.label), make('span', row.status, statusBadgeClass(row.status))); identityText.append(title, make('p', `${row.channel}  •  ${row.audience}  •  ${flags[row.market] ?? ''} ${row.market}`)); identity.append(icon, identityText); header.append(identity);
      const actions = make('div', '', 'campaign-profile__header-actions'); const editButton = button('Edit', () => edit(row, true)); editButton.dataset.icon = 'edit';
      const pause = button(row.status === 'Paused' ? 'Resume' : 'Pause', () => { const previous = row.status; row.status = row.status === 'Paused' ? 'Live' : 'Paused'; refresh(); showCampaign(row, active); bench.report(`${row.label} ${row.status === 'Paused' ? 'paused' : 'resumed'}.`, () => { row.status = previous; refresh(); }); });
      const remove = button('Delete campaign', () => bench.form('Delete record?', [make('p', row.label)], () => {
        const index = rows.indexOf(row);
        if (index < 0) return;
        rows.splice(index, 1);
        refresh();
        toaster.show({ title: 'Campaign deleted', description: row.label, tone: 'success', action: { label: 'Undo', onClick: () => { rows.splice(Math.min(index, rows.length), 0, row); refresh(); } } });
      })); actions.append(editButton, pause, remove); header.append(actions);
      const tabs = make('div'); const panel = make('div', '', 'scale-profile__content'); panel.setAttribute('role', 'tabpanel'); panel.id = `campaign-panel-${row.id}`;
      const names: CampaignTab[] = ['Overview', 'Performance', 'Audience'];
      const tabOptions = names.map(name => ({ value: name, label: name, id: `campaign-${row.id}-${name}`, ariaControls: panel.id }));
      const tabProps = (value: CampaignTab) => ({ value, options: tabOptions, onChange: renderTab, ariaLabel: 'Campaign details', className: 'scale-profile__tabs rv-tabs--underline' });
      const tabControl = mountTabs(tabs, tabProps(active));
      const controls = [...tabs.querySelectorAll<HTMLButtonElement>('[role=tab]')];
      body.append(header, tabs, panel);
      const section = (title: string, subtitle: string) => { const { card, body } = createDetailPanel(title, subtitle, { card: 'scale-profile__section', heading: 'scale-profile__section-heading', body: 'scale-profile__section-content' }); panel.append(card); return body; };
      const definitions = (title: string, items: [string, string][]) => { const container = make('section', '', 'campaign-profile__definitions'); container.setAttribute('aria-label', title); container.append(make('small', title)); const list = make('dl', '', 'scale-profile__details'); for (const [name, value] of items) { const detail = make('dd'); if (name === 'Owner' && value && value !== 'Unassigned') { const avatar = make('img', '', 'campaign-owner-photo'); avatar.src = ownerPortrait(value); avatar.alt = ''; detail.append(avatar); } detail.append(document.createTextNode(value)); list.append(make('dt', name), detail); } container.append(list); panel.append(container); };
      const cpa = safeRatio(row.spend, row.conversions), priorCpa = safeRatio(row.previousSpend, row.previousConversions), roas = safeRatio(row.revenue, row.spend);
      let trendSwitch: Root | undefined;
      let trendChart: ReturnType<typeof campaignTrendChart> | undefined;
      function renderTab(tab: CampaignTab) {
        trendSwitch?.unmount(); trendSwitch = undefined; trendChart?.destroy(); trendChart = undefined;
        active = tab; tabControl.update(tabProps(tab)); panel.replaceChildren(); panel.setAttribute('aria-labelledby', controls[names.indexOf(tab)].id); controls.forEach((control, index) => { const selected = names[index] === tab; control.setAttribute('aria-selected', String(selected)); control.tabIndex = selected ? 0 : -1; });
        if (tab === 'Overview') {
          const stats = section('Last 30 Days', 'Sep 6 to Oct 5'); const tiles = make('div', '', 'campaign-profile__stats');
          const values = [ ['Spend', compactMoney(row.spend), row.budget ? `${Math.round(row.spend / row.budget * 100)}% of ${compactMoney(row.budget)}` : 'No budget'], ['Conversions', number(row.conversions), percentage(changePercent(row.conversions, row.previousConversions))], ['CPA', cpa == null ? '–' : cpaText.format(cpa), percentage(cpa == null || priorCpa == null ? null : changePercent(cpa, priorCpa))], ['ROAS', roas == null ? '–' : `${roas.toFixed(1)}x`, `Target ${row.target.toFixed(1)}x`] ];
          for (const [label, value, detail] of values) { const tile = make('div'); const comparison = make('small', detail); if ((label === 'Conversions' && detail.startsWith('-')) || (label === 'CPA' && detail.startsWith('+'))) comparison.className = 'campaign-change-bad'; else if ((label === 'Conversions' && detail.startsWith('+')) || (label === 'CPA' && detail.startsWith('-'))) comparison.className = 'campaign-change-good'; tile.append(make('small', label), make('strong', value), comparison); tiles.append(tile); } stats.append(tiles);
          const delivery = row.activeFrom > row.activeTo ? 'No delivery yet' : `Serving since ${date(row.activeFrom)}`;
          definitions('Campaign', [['Owner', row.owner || 'Unassigned'], ['Market', `${flags[row.market] ?? ''} ${marketNames[row.market] ?? row.market}`], ['Type', row.audience], ['Delivery', delivery]]);
          definitions('Budget', [['30-day budget', dollars(row.budget)], ['Spent', `${dollars(row.spend)}${row.budget ? `  ${Math.round(row.spend / row.budget * 100)}% paced` : ''}`], ['Revenue', dollars(row.revenue)], ['Target ROAS', `${row.target.toFixed(1)}x`]]);
        } else if (tab === 'Performance') {
          const chart = section('Daily Trend', 'Sep 6 to Oct 5'); const controls = make('div', '', 'campaign-profile__trend-controls'); const plot = make('div');
          const heading = chart.previousElementSibling as HTMLElement; heading.classList.add('campaign-profile__trend-heading'); heading.append(controls);
          type Metric = 'Conversions' | 'Spend';
          const options = [{ value: 'Conversions' as Metric, label: 'Conversions' }, { value: 'Spend' as Metric, label: 'Spend' }];
          const render = (metric: Metric) => {
            trendChart?.destroy();
            trendChart = campaignTrendChart(metric === 'Spend' ? row.dailySpend : row.trend, `${row.label} daily ${metric.toLowerCase()}`, metric === 'Spend' ? dollars : number);
            plot.replaceChildren(trendChart.element);
            trendSwitch?.render(createElement(SegmentedSwitch, { value: metric, options, ariaLabel: 'Daily trend metric', role: 'group', onChange: (value: string | number) => { if (value === 'Spend' || value === 'Conversions') render(value); } }));
          };
          trendSwitch = createRoot(controls);
          chart.append(plot); render('Conversions');
          const content = section('Weekly Breakdown', 'Weeks sum to the totals'); const table = make('table', '', 'campaign-profile__table'); table.setAttribute('aria-label', `${row.label} weekly performance`);
          const thead = make('thead'), header = make('tr'); for (const name of ['Week', 'Spend', 'Conv.', 'CPA']) header.append(make('th', name)); thead.append(header); const tbody = make('tbody');
          for (const week of campaignWeeks(row.dailySpend, row.trend)) { const tr = make('tr'), cost = safeRatio(week.spend, week.conversions); tr.append(make('td', `${date(week.start)} to ${date(week.end)}`), make('td', dollars(week.spend)), make('td', number(week.conversions)), make('td', cost === null ? '–' : cpaText.format(cost))); tbody.append(tr); }
          const totalRow = make('tr', '', 'campaign-profile__total'); totalRow.append(make('td', '30 days'), make('td', dollars(row.spend)), make('td', number(row.conversions)), make('td', cpa == null ? '–' : cpaText.format(cpa))); tbody.append(totalRow); table.append(thead, tbody); content.append(table);
        } else {
          const buyers = Math.round(row.conversions * row.buyers / 100), returning = Math.max(0, row.conversions - buyers); const mix = section('Buyer Mix', `${number(row.conversions)} conversions, last 30 days`);
          const bar = make('div', '', 'campaign-profile__buyer-bar'); const fill = make('i'); fill.style.width = `${Math.max(0, Math.min(100, row.buyers))}%`; bar.append(fill); mix.append(bar);
          for (const [label, value, rate] of [['New buyers', buyers, row.buyers], ['Returning', returning, 100 - row.buyers]] as const) { const line = make('div', '', 'campaign-profile__buyer-row'); line.append(make('span', label), make('strong', number(value)), make('small', row.conversions ? `${Math.round(rate)}%` : '–')); mix.append(line); }
          const ctr = safeRatio(row.clicks, row.impressions), conversionRate = safeRatio(row.conversions, row.clicks);
          definitions('Funnel', [['Impressions', compactCount(row.impressions)], ['Clicks', `${compactCount(row.clicks)}${ctr === null ? '' : `  ${(ctr * 100).toFixed(1)}% CTR`}`], ['Conversions', `${number(row.conversions)}${conversionRate === null ? '' : `  ${(conversionRate * 100).toFixed(1)}% of clicks`}`]]);
          const cpm = safeRatio(row.spend * 1000, row.impressions), cpc = safeRatio(row.spend, row.clicks), value = safeRatio(row.revenue, row.conversions);
          definitions('Unit Costs', [['CPM', cpm == null ? '–' : cpaText.format(cpm)], ['CPC', cpc == null ? '–' : cpaText.format(cpc)], ['Order value', value == null ? '–' : cpaText.format(value)]]);
        }
      }
      renderTab(active);
      bench.form(row.label, [body], () => false, undefined, undefined, () => { trendSwitch?.unmount(); trendChart?.destroy(); tabControl.destroy(); }); const node = dialog(); if (node) addClose(node);
    }

    function edit(row?: Campaign, fromView = false) {
      if (row) row = rows.find(item => item.id === row!.id) ?? row;
      const name = input('Campaign name', row?.label); name.required = true;
      const channel = dropdown('Channel', channels, row?.channel ?? 'Microsoft Ads'); const audience = dropdown('Type', audiences, row?.audience ?? 'Prospecting');
      const market = dropdown('Market', markets.map(code => marketNames[code]), marketNames[row?.market ?? 'US']); const owner = dropdown('Owner', owners, row?.owner ?? owners[0]);
      const decorate = (control: ReturnType<typeof dropdown>, kind: 'channel' | 'market' | 'owner' | 'status') => {
        const render = (h: (...args: any[]) => any, option: { label: string; value: string }) => {
          const value = String(option.value);
          const content = kind === 'owner' ? h('img', { class: 'campaign-owner-photo', src: ownerPortrait(value), alt: '' })
            : kind === 'channel' ? h('i', { class: `fa-brands ${marks[value] ?? ''}`, 'aria-hidden': 'true' })
            : kind === 'market' ? h('span', { 'aria-hidden': 'true' }, flags[markets.find(code => marketNames[code] === value) ?? ''] ?? '')
            : h('span', { class: `campaign-choice-status is-${value.toLowerCase()}`, 'aria-hidden': 'true' });
          return h('span', { class: `campaign-rich-option campaign-rich-option--${kind}` }, [content, h('span', {}, option.label)]);
        };
        control.update({ renderOption: (h, option) => render(h, option), renderValue: (h, option) => render(h, option) });
      };
      decorate(channel, 'channel'); decorate(market, 'market'); decorate(owner, 'owner');
      const status = dropdown('Status', states, row?.status ?? 'Learning'); const budget = input('30-Day Budget', row ? String(row.budget) : '', 'number'); budget.min = '0'; budget.step = '1'; budget.required = true;
      decorate(status, 'status'); const target = input('Target ROAS', row ? String(row.target) : '2.5', 'number'); target.min = '0.1'; target.step = '0.1'; target.required = true;
      const body = make('div', '', 'scale-edit campaign-edit'); body.append(make('p', row?.id ?? 'Starts with no delivery; metrics fill in as it serves.', 'scale-edit__subtitle'));
      const pair = (a: HTMLElement, b: HTMLElement) => { const pair = make('div', '', 'scale-edit__pair'); pair.append(a,b); return pair; };
      const statusField = field('Status', status.element); statusField.append(make('small', 'Learning campaigns ramp for about five days before they pace.'));
      const decorated = (label: string, control: HTMLInputElement, prefix: string, suffix: string) => { const wrapper = field(label, control), box = make('div', '', 'scale-edit__money'); if (prefix) box.append(make('span', prefix)); box.append(control); if (suffix) box.append(make('span', suffix)); wrapper.append(box); return wrapper; };
      const error = make('p', '', 'scale-profile__error'); error.hidden = true; error.setAttribute('role', 'alert');
      body.append(field('Name', name), pair(field('Channel', channel.element), field('Type', audience.element)), pair(field('Market', market.element), field('Owner', owner.element)), statusField, pair(decorated('30-Day Budget', budget, '$', 'USD'), decorated('Target ROAS', target, '', 'x')), error);
      const back = row && fromView ? button('Back', () => showCampaign(row)) : undefined;
      bench.form(row ? 'Edit Campaign' : 'New Campaign', [body], () => {
        const key = (value: string) => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); if (!name.value.trim()) { error.hidden = false; error.textContent = 'Enter a campaign name.'; return false; }
        if (rows.some(item => item !== row && key(item.label) === key(name.value))) { error.hidden = false; error.textContent = 'Another campaign has this name.'; return false; }
        const marketCode = markets.find(code => marketNames[code] === market.value) ?? 'US'; const draft = { label: name.value.trim(), channel: channel.value, audience: audience.value, market: marketCode, owner: owner.value, status: status.value, budget: Number(budget.value), target: Number(target.value) };
        if (row) { const previous = structuredClone(row); Object.assign(row, draft); refresh(); bench.report('Campaign saved.', () => { Object.assign(row, previous); refresh(); }); if (fromView) { showCampaign(row); return false; } }
        else { const created: Campaign = { ...draft, id: `cmp_new_${nextId++}`, spend: 0, impressions: 0, clicks: 0, conversions: 0, previousSpend: 0, previousConversions: 0, revenue: 0, buyers: 0, trend: Array(30).fill(0), dailySpend: Array(30).fill(0), activeFrom: 30, activeTo: 29 }; rows.push(created); bench.resetPage(); refresh(); bench.report('Campaign created.', () => { const index = rows.indexOf(created); if (index >= 0) rows.splice(index, 1); refresh(); }); showCampaign(created); return false; }
        return true;
      }, back, row ? 'Save Changes' : 'Create Campaign', () => [channel, audience, market, owner, status].forEach(control => control.destroy())); const node = dialog(); if (node) addClose(node);
    }

  },
};
