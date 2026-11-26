import { createControl, createRecordNavigation } from '@revolist/ui/native';
import plusIcon from '@fortawesome/fontawesome-free/svgs/solid/plus.svg?raw';
import { TooltipController } from '@revolist/ui/core/popover-controller';
import { ROW_ACTION_COLUMN_WIDTH } from '../../composables/row-action';
import { createSearchActionBar } from '@revolist/ui/native';
import '@revolist/ui/search-action-bar.scss';
import { createToaster, mountToaster } from '@revolist/ui/toaster';
import { mountTabs } from '@revolist/ui/native';
import { CONFIGURATOR_AREA_ICONS } from '@revolist/ui/configurator-actions';
import { createDetailPanel } from '../../composables/detail-panel';
import { personPortrait } from '../../composables/demo-portraits';
import '../../pro-advanced-grids/src/campaign-rich-options.css';
import '@revolist/ui/styles/base.scss';
import { configureDemoAddButton, createDemoBody, createDemoHeading } from '../../composables/demo-shell';
import { createDropdownControl } from '@revolist/ui/native';
import { createMetricTileHistoryTooltip, METRIC_TILE_HISTORY_TOOLTIP } from '@revolist/revogrid-pro';
import '@revolist/revogrid-pro/styles.css';
import { defineCustomElements } from '@revolist/revogrid/loader';
import {
  ColumnStretchPlugin,
  ColumnNumber,
  ColumnCurrency,
  ColumnPercentage,
  CellMergePlugin,
  DateRangeColumnsPlugin,
  HeatmapPlugin,
  TooltipPlugin,
  ColumnDialogPlugin,
  ColumnHeaderMenuPlugin,
  ExportExcelPlugin,
  type ColumnDialogConfig,
  type MergeData,
} from '@revolist/revogrid-pro';
import '@revolist/revogrid-pro/styles.css';
import {
  attainment,
  departments,
  initialLines,
  months,
  newLine,
  readLine,
  rollup,
  sum,
  type Department,
  type Line,
  type Status,
} from './forecast-data';
import {
  createColumns,
  forecastText,
  signed,
  type ForecastRow,
  type ForecastText,
} from './forecast-columns';
import { renderSummary, releaseSummary } from './forecast-summary';
import './forecast.css';
import '../../composables/clickup-theme.css';

function element<K extends keyof HTMLElementTagNameMap>(
  document: Document,
  tag: K,
  className = '',
  value = '',
) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = value;
  return node;
}

export function mountForecast(
  host: HTMLElement,
  messages: Partial<ForecastText> = {},
) {
  const text = { ...forecastText, ...messages };
  const document = host.ownerDocument;
  const create = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className = '',
    value = '',
  ) => element(document, tag, className, value);
  const button = (label: string, action: () => void, primary = false) => {
    const control = createControl(document, 'button', {
      class: primary ? 'forecast-button primary rv-btn rv-btn-primary' : 'forecast-button',
    });
    control.textContent = label;
    control.type = 'button';
    control.addEventListener('click', action);
    return control;
  };
  const dropdownOwners = new WeakMap<HTMLElement, ReturnType<typeof createDropdownControl<string>>>();
  const disposeDropdowns = (root: ParentNode) => root.querySelectorAll<HTMLElement>('[data-forecast-dropdown]').forEach(element => {
    dropdownOwners.get(element)?.destroy(); dropdownOwners.delete(element);
  });
  const select = (values: readonly (readonly [string, string])[], value: string, label: string) => {
    const dropdown = createDropdownControl(document, {
      source: values.map(([value, label]) => ({ value, label })), value,
      config: { ariaLabel: label, topLayer: true, nativeTabNavigation: true },
    });
    const control = dropdown.element as HTMLDivElement & { value: string };
    control.dataset.forecastDropdown = '';
    Object.defineProperty(control, 'value', { get: () => dropdown.value, set: next => { dropdown.value = next; } });
    dropdown.onChange = () => control.dispatchEvent(new Event('change', { bubbles: true }));
    dropdownOwners.set(control, dropdown);
    return control;
  };
  const field = (label: string, control: HTMLElement) => {
    const wrapper = create(control.hasAttribute('data-forecast-dropdown') ? 'div' : 'label', 'forecast-field');
    wrapper.append(create('span', '', label), control);
    return wrapper;
  };
  const section = create('section', 'demo-shell forecast');
  section.setAttribute('aria-label', text.title);
  const grid = create(
    'revo-grid',
    'forecast-grid cell-border',
  ) as HTMLRevoGridElement & {
    columnDialog: ColumnDialogConfig;
    cellMerge: MergeData[];
  };
  const collapsed = new Set<Department>();
  const growth = new Map(
    departments.map((item) => [item.name, Number(item.growth)]),
  );
  const bands = new Map<Department | 'all', number>();
  const departmentOptions = departments.map(
    ({ name }) => [name, name] as const,
  );
  const statuses = [
    ['Active', text.active],
    ['New', text.new],
    ['Exit', text.exit],
  ] as const;
  let lines = initialLines.slice();
  let closeMonth = 7;
  let totals = rollup([]);
  let nextId = 0;
  let editingLineId: string | undefined;
  let focusLineId: string | undefined;
  const savedGrowth = new Map(growth);
  let compact = window.matchMedia('(max-width: 650px)').matches;

  const { heading, subtitle } = createDemoHeading(document, text.title, 'forecast-heading', '', 'forecast-muted');
  const period = select(
    months.map((month, index) => [
      String(index),
      `${month} ${index < 2 ? 2025 : 2026}`,
    ]),
    String(closeMonth),
    text.actualPeriod,
  );
  const add = button(text.add, () => addGridLine((department.value || departments[0].name) as Department), true);
  configureDemoAddButton(add, text.add, plusIcon);
  const addTooltip = new TooltipController();
  addTooltip.bind(add, text.add, { delay: 200 });
  const summary = create('div', 'forecast-summary');
  const legend = create('div', 'forecast-legend');
  const summaryScroll = create('div', 'forecast-summary-scroll');
  const summaryTrack = create('div', 'forecast-summary-track');
  summaryScroll.append(summaryTrack);
  summary.append(legend, summaryScroll);

  const toolbar = create('div', 'forecast-toolbar');
  const searchBar = createSearchActionBar(document, { label: text.find, shortcut: '/' });
  const search = searchBar.input;
  const department = select(
    [['', text.allDepartments], ...departmentOptions],
    '',
    text.department,
  );
  const status = select([['', text.allStatuses], ...statuses], '', text.status);
  const heat = select(
    [
      ['all', text.globalHeat],
      ['department', text.departmentHeat],
    ],
    'all',
    text.heat,
  );
  let allFolded = false;
  const fold = button(text.collapseAll, () => {
    allFolded = !allFolded;
    collapsed.clear();
    if (allFolded) departments.forEach(({ name }) => collapsed.add(name));
    update();
  });
  const toaster = createToaster();
  const toastHost = create('div', 'forecast-toast-host');
  const toastView = mountToaster(toastHost, { toaster, position: 'top-center' });
  let exportButton: HTMLButtonElement;
  exportButton = button(text.export, () => {
    exportButton.disabled = true;
    void grid
      .getPlugins()
      .then((plugins) =>
        plugins
          .find((plugin) => plugin instanceof ExportExcelPlugin)
          ?.export({ workbookName: 'category-forecast' }),
      )
      .catch(() => {
        toaster.show({ title: text.reportError, tone: 'error' });
      })
      .finally(() => {
        exportButton.disabled = false;
      });
  });
  const filter = create('details', 'forecast-filter');
  const filterButton = create('summary');
  filterButton.dataset.icon = 'filter';
  filterButton.setAttribute('aria-label', text.filter);
  filterButton.title = text.filter;
  const filterPanel = create('div', 'forecast-filter-panel');
  filterPanel.append(
    field(text.department, department),
    field(text.status, status),
    fold,
  );
  filter.append(filterButton, filterPanel);
  const columnButton = button(text.columns, () => {
    void grid
      .getPlugins()
      .then((plugins) =>
        plugins.find((plugin) => plugin instanceof ColumnDialogPlugin)?.toggle(columnButton),
      );
  });
  columnButton.style.setProperty('--glyph', `url("data:image/svg+xml,${encodeURIComponent(CONFIGURATOR_AREA_ICONS.columns)}")`);
  for (const [control, icon] of [
    [columnButton, 'columns'],
    [exportButton, 'download'],
  ] as const) {
    control.dataset.icon = icon;
    control.classList.add('forecast-icon');
    control.setAttribute('aria-label', control.textContent ?? '');
  }
  searchBar.setActions([filter, columnButton, exportButton]);
  toolbar.append(searchBar.element);
  heading.append(toolbar, period, add);
  legend.append(
    field('Heat by', heat),
    create('p', 'forecast-muted', text.heatHint),
  );
  const empty = create('p', 'forecast-empty', text.noResults);
  empty.hidden = true;
  const overlay = create('dialog', 'forecast-dialog');
  const syncToastHost = () => {
    const target = overlay.open ? overlay : section;
    if (toastHost.parentElement !== target) target.append(toastHost);
  };
  const unsubscribeToasts = toaster.subscribe(() => queueMicrotask(syncToastHost));
  const toastObserver = new MutationObserver(() => {
    if (overlay.open && toastHost.parentElement !== overlay && toaster.getSnapshot().length) queueMicrotask(syncToastHost);
  });
  toastObserver.observe(overlay, { childList: true, subtree: true });
  overlay.addEventListener('close', syncToastHost);
  overlay.setAttribute('aria-labelledby', 'forecast-dialog-title');
  let profileTabs: ReturnType<typeof mountTabs<string>> | undefined;
  overlay.addEventListener('close', () => {
    if (!overlay.open) { profileTabs?.destroy(); profileTabs = undefined; disposeDropdowns(overlay); overlay.classList.remove('is-profile'); overlay.replaceChildren(); }
  });
  section.append(heading, createDemoBody(document, summary, toastHost, grid, empty, overlay));
  host.append(section);

  grid.readonly = true;
  grid.columnTypes = { ...grid.columnTypes, number: ColumnNumber, currency: ColumnCurrency, percentage: ColumnPercentage };
  grid.rowSize = 36;
  grid.style.setProperty('--revo-grid-header-height', '32px');
  grid.frameSize = 2;
  grid.theme = 'compact';
  grid.hideAttribution = true;
  grid.canFocus = false;
  grid.disableVirtualX = true;
  grid.tooltip = { showDelayMs: 200, animation: true, anchorToTarget: true, anchorAlignment: 'center', renderContent: ({ content, type, document }) => type === METRIC_TILE_HISTORY_TOOLTIP ? createMetricTileHistoryTooltip(document, content) : undefined };
  Reflect.set(grid, 'stretch', compact ? 0 : 1);
  grid.plugins = [
    ColumnStretchPlugin,
    TooltipPlugin,
    DateRangeColumnsPlugin,
    CellMergePlugin,
    HeatmapPlugin,
    ColumnDialogPlugin,
    ColumnHeaderMenuPlugin,
    ExportExcelPlugin,
  ];
  grid.addEventListener('viewportscroll', (event) => {
    const { dimension, coordinate } = (
      event as CustomEvent<HTMLRevoGridElementEventMap['viewportscroll']>
    ).detail;
    if (dimension === 'rgCol')
      summaryTrack.style.transform = `translateX(${-coordinate}px)`;
  });
  grid.columnDialog = {
    title: text.columns,
    disableDrag: true,
    hideAttribution: true,
  };

  const sizeObserver = new ResizeObserver(() => {
    const pinned = grid.querySelector('revogr-header');
    if (pinned) section.style.setProperty('--pinned-width', `${pinned.getBoundingClientRect().width}px`);
  });
  function updateColumns() {
    Reflect.set(grid, 'stretch', compact ? 0 : 1);
    grid.columns = createColumns({
      text,
      closeMonth,
      bands,
      heatByDepartment: heat.value === 'department',
      compact,
      lineWidth: compact ? 183 : 156,
      toggleAll: () => fold.click(),
      allCollapsed: () => allFolded,
      toggleDepartment: (name) => {
        if (collapsed.has(name)) collapsed.delete(name);
        else collapsed.add(name);
        update();
      },
      adjust: openGrowth,
      setGrowth: (name, value) => { if (growth.get(name) !== value) { growth.set(name, value); update(); } },
      hasGrowthDraft: name => growth.get(name) !== savedGrowth.get(name),
      saveGrowth: name => { savedGrowth.set(name, growth.get(name)!); update(); },
      revertGrowth: name => { growth.set(name, savedGrowth.get(name)!); update(); },
      isEditingLine: id => editingLineId === id,
      focusNewLine: (id, element) => {
        if (!element || focusLineId !== id) return;
        requestAnimationFrame(() => { if (focusLineId === id && element.isConnected) { focusLineId = undefined; element.focus(); element.select(); } });
      },
      finishNewLine: (id, value, cancel) => {
        if (editingLineId !== id) return;
        editingLineId = undefined; focusLineId = undefined;
        if (cancel) lines = lines.filter(item => item.id !== id);
        else {
          const name = value.trim() || text.newLine;
          lines = lines.map(item => item.id === id ? { ...item, name } : item);
          toaster.show({ title: text.created(name), tone: 'success', action: { label: text.undo, onClick: () => {
            lines = lines.filter(item => item.id !== id); update();
          } } });
        }
        update();
      },
      edit: (line) => openLine(line),
      open: (line) => openProfile(line.id),
      addLine: addGridLine,
    });
  }

  function asRow(
    kind: ForecastRow['kind'],
    label: string,
    reading: ForecastRow['reading'],
    options: Partial<ForecastRow> = {},
  ): ForecastRow {
    const ratio = attainment(reading);
    return {
      kind,
      label,
      reading,
      attainment: ratio,
      delta: ratio === null ? null : ratio - 1,
      actualRatio: reading.plan > 0 ? reading.plannedActual / reading.plan : null,
      ...Object.fromEntries(
        months.map((month, index) => [month, reading.months[index]]),
      ),
      ...options,
    };
  }

  function update() {
    const query = search.value.trim().toLocaleLowerCase();
    const matching = lines.filter(
      (line) =>
        (!department.value || line.department === department.value) &&
        (!status.value || line.status === status.value) &&
        [line.name, line.department, line.planner].some((value) =>
          value.toLocaleLowerCase().includes(query),
        ),
    );
    const readings = matching.map((line) => ({
      line,
      reading: readLine(line, closeMonth, growth.get(line.department) ?? 0),
    }));
    totals = rollup(readings.map(({ reading }) => reading));
    bands.set(
      'all',
      Math.max(1, ...readings.flatMap(({ reading }) => reading.months)),
    );
    const merges: MergeData[] = [];
    let firstRow = 0;
    const source = departments.flatMap(({ name, color }) => {
      const group = readings.filter(({ line }) => line.department === name);
      bands.set(
        name,
        Math.max(1, ...group.flatMap(({ reading }) => reading.months)),
      );
      if (!group.length) return [];
      const isCollapsed = collapsed.has(name);
      const count = isCollapsed ? 1 : group.length + 1;
      if (!compact && count > 1)
        merges.push({
          row: firstRow,
          rowSpan: count,
          column: 0,
          colType: 'colPinStart',
        });
      firstRow += count;
      const subtotal = rollup(group.map(({ reading }) => reading));
      return [
        asRow('department', name, subtotal, {
          department: name,
          color,
          count: group.length,
          growth: growth.get(name),
          collapsed: isCollapsed,
          share: subtotal.months.map((value, month) =>
            totals.months[month] ? value / totals.months[month] : 0,
          ),
        }),
        ...(isCollapsed
          ? []
          : group.map(({ line, reading }) =>
              asRow('line', line.name, reading, { department: name, line }),
            )),
      ];
    });
    empty.hidden = !!matching.length;
    grid.hidden = !matching.length;
    const visibleDepartments = departments.filter(({ name }) =>
      matching.some((line) => line.department === name),
    );
    allFolded =
      !!visibleDepartments.length &&
      visibleDepartments.every(({ name }) => collapsed.has(name));
    fold.textContent = allFolded ? text.expandAll : text.collapseAll;
    fold.disabled = !visibleDepartments.length;
    const planned = readings.filter(({ reading }) => reading.plan > 0);
    subtitle.textContent = `${text.actualTo(months[closeMonth])} • ${text.lineCount(matching.length)} • ${visibleDepartments.length} departments`;
    renderSummary(
      summaryTrack,
      totals,
      closeMonth,
      planned,
      text,
    );
    grid.pinnedBottomSource = matching.length
      ? [asRow('total', text.total, totals, { count: matching.length })]
      : [];
    grid.cellMerge = merges;
    grid.source = source;
    void grid.refresh?.('all');
    return source;
  }

  function addGridLine(group: Department) {
    if (editingLineId) return;
    const departmentInfo = departments.find(item => item.name === group)!;
    const line = newLine(`added-${++nextId}`, { name: text.newLine, department: group, planner: departmentInfo.planner, status: 'New', plan: 0 });
    let insertAt = lines.length;
    for (let i = lines.length - 1; i >= 0; i--) if (lines[i].department === group) { insertAt = i + 1; break; }
    lines.splice(insertAt, 0, line);
    collapsed.delete(group);
    if (search.value) search.value = '';
    if (department.value && department.value !== group) department.value = '';
    if (status.value && status.value !== 'New') status.value = '';
    editingLineId = line.id; focusLineId = line.id;
    const source = update();
    const row = source.findIndex(item => item.line?.id === line.id);
    if (row >= 0) void grid.componentOnReady().then(() => grid.scrollToRow(row));
  }

  function openForm(
    title: string,
    inputs: HTMLElement[],
    save: () => void | false,
    extra?: HTMLElement,
    profileLine?: Line,
  ) {
    const form = create('form');
    const label = create('h2', '', title);
    label.id = 'forecast-dialog-title';
    const actions = create('div', 'forecast-form-actions');
    const submit = createControl(document, 'button', { class: 'forecast-button primary rv-btn rv-btn-primary' });
    submit.textContent = text.save;
    submit.type = 'submit';
    if (extra) actions.append(extra);
    actions.append(
      button(text.cancel, () => overlay.close()),
      submit,
    );
    if (profileLine) {
      form.classList.add('forecast-profile-editor');
      label.textContent = 'Edit Line';
      const header = create('header', 'forecast-editor-header');
      header.append(label, create('span', 'forecast-profile-id', displayLineId(profileLine.id)));
      const fields = create('div', 'forecast-editor-fields'); fields.append(...inputs);
      inputs[1].append(create('small', 'forecast-editor-hint', "Forecasts with its department's growth."));
      inputs[inputs.length - 1].append(create('small', 'forecast-editor-hint', 'Net sales for Nov to Oct; the outlook reads against it.'));
      const back = button('Back', () => openProfile(profileLine.id)); back.classList.add('forecast-editor-back');
      actions.prepend(back); submit.textContent = 'Save Changes';
      form.append(header, fields, actions); overlay.classList.add('is-profile');
    } else form.append(label, ...inputs, actions);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (save() !== false) overlay.close();
    });
    profileTabs?.destroy(); profileTabs = undefined;
    disposeDropdowns(overlay);
    overlay.replaceChildren(form);
    if (!overlay.open) overlay.showModal();
  }

  function matchingLines() {
    const query = search.value.trim().toLocaleLowerCase();
    return departments.flatMap(({ name }) => lines.filter((line) =>
      line.department === name && (!department.value || line.department === department.value) &&
      (!status.value || line.status === status.value) &&
      [line.name, line.department, line.planner].some((value) => value.toLocaleLowerCase().includes(query))));
  }

  function displayLineId(id: string) {
    const index = /^line-(\d+)$/.exec(id);
    return index ? `RDF-${String(Number(index[1]) + 1).padStart(4, '0')}` : id;
  }

  function openProfile(id: string, selectedTab = 'Overview') {
    const line = lines.find((item) => item.id === id);
    if (!line) return;
    const ordered = matchingLines();
    const index = ordered.findIndex((item) => item.id === id);
    const reading = readLine(line, closeMonth, growth.get(line.department) ?? 0);
    const ratio = attainment(reading);
    const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    const compactCurrency = { format(value: number) { return value >= 1e6 ? `$${(Math.floor(value / 10000) / 100).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}M` : `$${Math.round(value / 1000)}k`; } };
    const profile = create('div', 'forecast-profile');
    const header = create('header', 'forecast-profile-header');
    const top = create('div', 'forecast-profile-top');
    const identifier = create('span', 'forecast-profile-id', displayLineId(line.id));
    const navigation = createRecordNavigation(document, {
      index, count: ordered.length, label: `${index + 1} of ${ordered.length}`,
      previousLabel: 'Previous line', nextLabel: 'Next line', className: 'forecast-profile-navigation',
      onPrevious: () => openProfile(ordered[index - 1].id, selectedTab),
      onNext: () => openProfile(ordered[index + 1].id, selectedTab),
    });
    const close = button('×', () => overlay.close()); close.setAttribute('aria-label', 'Close');
    const navigationActions = create('div', 'forecast-profile-navigation-actions');
    navigationActions.append(navigation, close); top.append(identifier, navigationActions);
    const title = create('h2', '', line.name); title.id = 'forecast-dialog-title';
    title.append(create('span', `forecast-profile-status ${line.status.toLowerCase()}`, line.status === 'Active' ? text.active : line.status));
    const details = create('p', 'forecast-profile-meta');
    const dot = create('span', 'forecast-profile-dot');
    const person = create('img', 'forecast-profile-avatar');
    person.src = personPortrait(line.planner);
    person.alt = '';
    details.append(dot, document.createTextNode(`${line.department} · `), person, document.createTextNode(` ${line.planner}`));
    header.append(top, title, details);
    const tabs = create('div');
    const content = create('div', 'forecast-profile-content');
    const renderTab = (name: string) => {
      selectedTab = name;
      profileTabs?.update(tabProps(name));
      content.replaceChildren();
      if (name === 'By Month') {
        const card = cardSection('By Month', 'FY26 against FY25, forecast after the close');
        const table = create('table', 'forecast-profile-table');
        table.setAttribute('aria-label', `${line.name} sales by month, FY26 against FY25`);
        const head = document.createElement('thead'); const headRow = document.createElement('tr');
        for (const label of ['Month', 'FY25', 'FY26', 'Change']) headRow.append(create('th', '', label));
        head.append(headRow); table.append(head);
        const body = document.createElement('tbody');
        months.forEach((month, monthIndex) => {
          const row = document.createElement('tr');
          const label = create('td', '', `${month} ${monthIndex < 2 ? 2025 : 2026}`);
          if (monthIndex > closeMonth) label.append(create('small', '', ' Forecast'));
          const previousValue = line.prior[monthIndex]; const current = reading.months[monthIndex];
          row.append(label, create('td', '', compactCurrency.format(previousValue)), create('td', '', compactCurrency.format(current)), create('td', '', previousValue ? `${((current / previousValue - 1) * 100 >= 0 ? '+' : '')}${((current / previousValue - 1) * 100).toFixed(1)}%` : '—'));
          body.append(row);
        });
        table.append(body); card.body.append(table); content.append(card.card); return;
      }
      const outlook = cardSection('Outlook vs Plan', `Actual to ${months[closeMonth]}, then the forecast`);
      const score = create('div', 'forecast-profile-score', ratio === null ? 'No FY26 plan set yet.' : `${(ratio * 100).toFixed(1)}%`);
      if (ratio !== null) score.append(create('small', '', ratio >= 1 ? 'On plan' : 'Short of plan'));
      else { score.classList.add('forecast-profile-no-plan'); score.append(button('Set Plan', () => openLine(line, undefined, true))); }
      const bar = create('div', 'forecast-profile-bar');
      const fill = create('span', 'forecast-profile-bar-fill'); fill.style.width = `${Math.min(100, reading.plan ? reading.actual / reading.plan * 100 : 0)}%`; bar.append(fill);
      if (reading.plan > 0) {
        const priorMark = create('i', 'forecast-profile-bar-prior'); priorMark.style.left = `${Math.min(100, sum(line.prior) / reading.plan * 100)}%`;
        const planMark = create('i', 'forecast-profile-bar-plan');
        const outlookMark = create('i', 'forecast-profile-bar-outlook'); outlookMark.style.left = `${Math.min(110, reading.outlook / reading.plan * 100)}%`;
        bar.append(priorMark, planMark, outlookMark);
      }
      outlook.body.append(score);
      if (ratio !== null) outlook.body.append(bar);
      const difference = reading.outlook - reading.plan;
      const outlookList = detailList([['FY26 plan', currency.format(reading.plan)], ['Actual', currency.format(reading.actual)], ['Forecast', currency.format(reading.forecast)], ['Outlook', currency.format(reading.outlook)], ['FY25', line.prior.some(Boolean) ? currency.format(sum(line.prior)) : 'None'], [difference >= 0 ? 'Ahead by' : 'Short by', currency.format(Math.abs(difference))]]);
      outlookList.classList.add('forecast-profile-outlook-list'); if (ratio !== null) outlook.body.append(outlookList);
      const basis = cardSection('Forecast Basis', 'How the open months are built');
      const hasPrior = line.prior.some(Boolean);
      const basisEntries = [['Basis', hasPrior ? 'FY25 same month' : 'Average month to date'], ['Growth', hasPrior ? `${signed.format((growth.get(line.department) ?? 0) / 100)} on FY25` : 'None, no FY25 base'], ['Open months', closeMonth < 11 ? `${months[closeMonth + 1]} to Oct` : 'None']];
      if (line.status === 'Exit' && line.lastMonth !== undefined) basisEntries.push(['Last month', `${months[line.lastMonth]} ${line.lastMonth < 2 ? 2025 : 2026}`]);
      basis.body.append(detailList(basisEntries));
      const detail = cardSection('Details', 'Where it sits and who plans it');
      detail.body.append(detailList([['Department', line.department], ['Planner', line.planner], ['Status', line.status === 'Active' ? text.active : line.status]]));
      content.append(outlook.card, basis.card, detail.card);
    };
    function cardSection(titleText: string, subtitleText: string) {
      return createDetailPanel(titleText, subtitleText, { card: 'forecast-profile-card', heading: 'forecast-profile-card-heading', body: 'forecast-profile-card-body' });
    }

    function detailList(entries: string[][]) {
      const list = create('dl', 'forecast-profile-list');
      for (const [label, value] of entries) list.append(create('dt', '', label), create('dd', '', value));
      return list;
    }
    profileTabs?.destroy();
    const tabProps = (value: string) => ({ value, options: ['Overview', 'By Month'].map(label => ({ value: label, label })), onChange: renderTab, ariaLabel: 'Forecast details', className: 'forecast-profile-tabs rv-tabs--underline' });
    profileTabs = mountTabs(tabs, tabProps(selectedTab));
    renderTab(selectedTab);
    const footer = create('footer', 'forecast-profile-footer');
    const remove = button('Delete', () => {
      overlay.classList.remove('is-profile');
      openForm(text.deletePrompt, [create('p', '', line.name)], () => {
        const originalIndex = lines.findIndex((item) => item.id === line.id);
        if (originalIndex < 0) return;
        lines.splice(originalIndex, 1);
        toaster.show({ title: text.deleted(line.name), tone: 'success', action: { label: text.undo, onClick: () => { lines.splice(Math.min(originalIndex, lines.length), 0, line); update(); } } });
        update();
      });
    });
    remove.classList.add('forecast-profile-delete'); remove.dataset.icon = 'trash';
    const exportButton = button('Export CSV', () => {
      const rows = [['Month', 'FY25', 'FY26'], ...months.map((month, i) => [`${month} ${i < 2 ? 2025 : 2026}`, String(line.prior[i]), String(reading.months[i])])];
      const url = URL.createObjectURL(new Blob([rows.map((row) => row.join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = `${line.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    });
    exportButton.dataset.icon = 'download';
    const edit = button('Edit', () => openLine(line, undefined, true), true); edit.dataset.icon = 'edit';
    footer.append(remove, exportButton, edit);
    profile.append(header, tabs, content, footer); overlay.classList.add('is-profile'); disposeDropdowns(overlay); overlay.replaceChildren(profile);
    if (!overlay.open) overlay.showModal();
  }

  function openGrowth(name: Department) {
    const original = growth.get(name)!;
    let saved = false;
    const range = createControl(document, 'input', { type: 'range' });
    range.min = '-20';
    range.max = '20';
    range.value = String(original);
    const value = create('output', 'forecast-growth-value');
    const updateOutput = () => {
      const next = Number(range.value);
      value.textContent = signed.format(next / 100);
      if (growth.get(name) !== next) { growth.set(name, next); update(); }
    };
    range.addEventListener('input', updateOutput);
    updateOutput();
    overlay.addEventListener('close', () => {
      if (!saved && growth.get(name) !== original) { growth.set(name, original); update(); }
    }, { once: true });
    openForm(
      `${name} · ${text.growth}`,
      [field(text.growth, range), value],
      () => { saved = true; savedGrowth.set(name, Number(range.value)); update(); },
    );
  }

  function openLine(line?: Line, group?: Department, fromProfile = false) {
    const name = createControl(document, 'input');
    name.required = true;
    name.maxLength = 60;
    name.value = line?.name ?? '';
    name.addEventListener('input', () => {
      name.setCustomValidity('');
    });
    const defaultDepartment = line?.department ?? group ?? departments[0].name;
    const groupInput = select(departmentOptions, defaultDepartment, text.department);
    const planner = select(
      [...departments.map((item) => [item.planner, item.planner] as const), ['Hana Mori', 'Hana Mori']],
      line?.planner ??
        departments.find((item) => item.name === defaultDepartment)!.planner,
      text.planner,
    );
    const plannerDropdown = dropdownOwners.get(planner)!;
    const renderPlanner = (h: (...args: any[]) => any, option: { label: string; value: string }) => h('span', { class: 'campaign-rich-option' }, [h('img', { class: 'campaign-owner-photo', src: personPortrait(option.label), alt: '' }), h('span', {}, option.label)]);
    plannerDropdown.update({ renderOption: (h, option) => renderPlanner(h, option), renderValue: (h, option) => renderPlanner(h, option) });
    const statusInput = select(statuses, line?.status ?? 'New', text.status);
    const lastMonthInput = select(
      months.map((month, index) => [String(index), `${month} ${index < 2 ? 2025 : 2026}`] as const),
      String(line?.lastMonth ?? months.length - 1),
      text.lastMonth,
    );
    const lastMonthField = field(text.lastMonth, lastMonthInput);
    const updateLastMonth = () => { lastMonthField.hidden = statusInput.value !== 'Exit'; };
    statusInput.addEventListener('change', updateLastMonth);
    updateLastMonth();
    const plan = createControl(document, 'input', { type: 'number' });
    plan.min = '0';
    plan.max = '1000000000';
    plan.value = String(line?.plan ?? 0);
    const remove =
      !fromProfile && line &&
      button(text.remove, () => {
        openForm(text.deletePrompt, [create('p', '', line.name)], () => {
          const index = lines.findIndex(({ id }) => id === line.id);
          lines.splice(index, 1);
          toaster.show({ title: text.deleted(line.name), tone: 'success', action: { label: text.undo, onClick: () => {
            lines.splice(Math.min(index, lines.length), 0, line);
            update();
          } } });
          update();
        });
      });
    name.addEventListener('change', () => {
      if (!name.value.trim()) name.setCustomValidity(text.name);
    });
    openForm(
      line ? text.edit : text.add,
      [
        field(text.name, name),
        field(text.department, groupInput),
        field(text.planner, planner),
        field(text.status, statusInput),
        lastMonthField,
        field(text.plan, plan),
      ],
      () => {
        const draft = {
          name: name.value.trim(),
          department: groupInput.value as Department,
          planner: planner.value,
          status: statusInput.value as Status,
          plan: Number(plan.value),
          lastMonth: statusInput.value === 'Exit' ? Number(lastMonthInput.value) : undefined,
        };
        if (line) {
          const previous = line;
          lines = lines.map((item) => item.id === line.id ? { ...item, ...draft } : item);
          toaster.show({ title: text.updated(draft.name), tone: 'success', action: { label: text.undo, onClick: () => {
            lines = lines.map((item) => item.id === previous.id ? previous : item);
            update();
          } } });
        } else {
          const created = newLine(`added-${++nextId}`, draft);
          lines.push(created);
          toaster.show({ title: text.created(draft.name), tone: 'success', action: { label: text.undo, onClick: () => {
            lines = lines.filter((item) => item.id !== created.id);
            update();
          } } });
        }
        collapsed.delete(draft.department);
        update();
        if (fromProfile && line) { openProfile(line.id); return false; }
      },
      remove || undefined,
      fromProfile ? line : undefined,
    );
  }

  period.addEventListener('change', () => {
    closeMonth = Number(period.value);
    updateColumns();
    update();
  });
  heat.addEventListener('change', () => {
    updateColumns();
    update();
  });
  search.addEventListener('input', update);
  department.addEventListener('change', update);
  status.addEventListener('change', update);
  const viewport = window.matchMedia('(max-width: 650px)');
  const adjustLayout = () => {
    compact = viewport.matches;
    updateColumns();
    update();
  };
  viewport.addEventListener('change', adjustLayout);
  updateColumns();
  update();
  void defineCustomElements();
  void customElements.whenDefined('revo-grid').then(() => grid.componentOnReady()).then(() => {
    const pinned = grid.querySelector('revogr-header');
    if (pinned && grid.isConnected) sizeObserver.observe(pinned);
  });
  return () => {
    addTooltip.destroy();
    sizeObserver.disconnect();
    viewport.removeEventListener('change', adjustLayout);
    unsubscribeToasts();
    toastObserver.disconnect();
    toastView.destroy();
    searchBar.destroy();
    releaseSummary(summaryTrack);
    profileTabs?.destroy(); profileTabs = undefined;
    disposeDropdowns(section);
    section.remove();
  };
}

export function load(parentSelector: string) {
  const host = document.querySelector<HTMLElement>(parentSelector);
  return host ? mountForecast(host) : undefined;
}
