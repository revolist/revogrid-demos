import plusIcon from '@fortawesome/fontawesome-free/svgs/solid/plus.svg?raw';
import { TooltipController } from '@revolist/ui/core/popover-controller';
import { createSearchActionBar } from '@revolist/ui/native';
import '@revolist/ui/search-action-bar.scss';
import { createToaster, mountToaster, type ToastController } from '@revolist/ui/toaster';
import { personPortrait } from '../../composables/demo-portraits';
import './campaign-rich-options.css';
import { demoColors } from '../../composables/demo-colors';
import { createDotHistogramElement, releaseSummaryChartElement, type DotHistogramOptions } from '@revolist/revogrid-pro';
import '@revolist/revogrid-pro/styles.css';
import { configureDemoAddButton, createDemoBody, createDemoHeading } from '../../composables/demo-shell';
import { createButtonElement, createTextControl, createDropdownControl } from '@revolist/ui/native';
import type { ColumnData, ColumnRegular, DataType } from '@revolist/revogrid';
import {
  renderCellAction,
  CellMergePlugin,
  AdvanceFilterPlugin,
  ColumnHeaderMenuPlugin,
  KeyedRowSelectionPlugin,
  RowChartHoverPlugin,
  GridStatePlugin,
  GridStatusLinePlugin,
  GridPopoverPlugin,
  ColumnStretchPlugin,
  DateRangeColumnsPlugin,
  GridAppearanceConfiguratorPlugin,
  GridConfiguratorPlugin,
  TooltipPlugin,
  ColumnDialogPlugin,
  ExportExcelPlugin,
  PAGE_CHANGE_EVENT,
  PaginationPlugin,
  type PaginationFullConfig,
  RowSelectPlugin,
  type ColumnDialogConfig,
  type MergeData,
} from '@revolist/revogrid-pro';
import '@revolist/revogrid-pro/styles.css';
import '@fortawesome/fontawesome-free/css/fontawesome.css';
import '@fortawesome/fontawesome-free/css/brands.css';
import './workbench.css';
import { arrangeToolbar, layouts } from './workbench-layout';
import { productPage } from './product-paging';
import { visitPage } from './visit-paging';

export const make = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text = '',
  className = '',
) => {
  const node = document.createElement(tag);
  node.textContent = text;
  node.className = className;
  return node;
};
export const money = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
export const number = (value: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
export const pct = (value: number) => `${number(value)}%`;
export const total = <T>(rows: readonly T[], get: (row: T) => number) =>
  rows.reduce((sum, row) => sum + get(row), 0);
export const matches = (query: string, ...values: string[]) =>
  values.some((value) => value.toLowerCase().includes(query));
export const fixedDate = (offset: number) => {
  const date = new Date(Date.UTC(2026, 9, 12 + offset));
  return date;
};

export function button(text: string, click: () => void, primary = false) {
  const control = createButtonElement(document, { label: text, className: primary ? 'rv-btn rv-btn-primary primary' : 'rv-btn', onClick: click });
  // The visible text may change later; let it remain the accessible name.
  control.removeAttribute('aria-label');
  return control;
}

const dropdownOwners = new WeakMap<HTMLElement, ReturnType<typeof createDropdownControl<string>>>();
function disposeDropdowns(root: ParentNode) {
  const elements = [...root.querySelectorAll<HTMLElement>('[data-demo-dropdown]')];
  if (root instanceof HTMLElement && root.matches('[data-demo-dropdown]')) elements.unshift(root);
  elements.forEach(element => { dropdownOwners.get(element)?.destroy(); dropdownOwners.delete(element); });
}
/** Shared select control; the workbench releases it with its containing surface. */
export function dropdown(label: string, values: readonly string[], initial: string) {
  const control = createDropdownControl(document, {
    source: values.map(value => ({ value, label: value })),
    value: initial,
    config: { ariaLabel: label, topLayer: true, nativeTabNavigation: true },
  });
  control.element.dataset.demoDropdown = '';
  dropdownOwners.set(control.element, control);
  return control;
}
export type SharedSelectElement = HTMLDivElement & {
  value: string;
  disabled: boolean;
  required: boolean;
  setOptionLabel: (index: number, label: string) => void;
  setOptions: (options: readonly { value: string; label: string }[]) => void;
};
/** DOM-facing adapter for existing workbench form and toolbar handlers. */
export function select(label: string, values: readonly string[], initial: string, change?: (value: string) => void): SharedSelectElement {
  const control = dropdown(label, values, initial);
  const element = control.element as SharedSelectElement;
  let required = false;
  Object.defineProperties(element, {
    value: { get: () => control.value, set: value => { control.value = value; } },
    disabled: { get: () => control.disabled, set: value => { control.disabled = value; } },
    required: { get: () => required, set: value => { required = !!value; control.update({ triggerAttributes: { 'aria-required': required ? 'true' : undefined } }); } },
  });
  element.setOptionLabel = (index, nextLabel) => { control.source = control.source.map((item, i) => i === index ? { ...item, label: nextLabel } : item); };
  element.setOptions = options => { control.source = options.map(option => ({ ...option })); };
  if (change) element.onchange = () => change(element.value);
  control.onChange = () => element.dispatchEvent(new Event('change', { bubbles: true }));
  return element;
}

/** Render a person's portrait in both the selected value and the menu. */
export function personSelect(label: string, values: readonly string[], initial: string): SharedSelectElement {
  const element = select(label, values, initial);
  const owner = dropdownOwners.get(element)!;
  const render = (h: (...args: any[]) => any, option: { label: string; value: string }) => h('span', { class: 'campaign-rich-option' }, [
    ...(option.value ? [h('img', { class: 'campaign-owner-photo', src: personPortrait(option.label), alt: '' })] : []),
    h('span', {}, option.label),
  ]);
  owner.update({ renderOption: (h, option) => render(h, option), renderValue: (h, option) => render(h, option) });
  return element;
}

export function selectOptions(label: string, options: readonly { value: string; label: string }[], initial: string): SharedSelectElement {
  const control = select(label, options.map(option => option.value), initial);
  control.setOptions(options);
  return control;
}

export function input(label: string, value = '', type = 'text') {
  const control = createTextControl(document, '');
  control.removeAttribute('placeholder');
  control.setAttribute('aria-label', label);
  control.type = type;
  control.value = value;
  return control;
}

export function field(label: string, control: HTMLElement) {
  const wrapper = make(control.hasAttribute('data-demo-dropdown') ? 'div' : 'label', '', 'workbench-field');
  wrapper.append(make('span', label), control);
  return wrapper;
}

type Template = NonNullable<ColumnRegular['cellTemplate']>;
export function cellAction(
  h: Parameters<Template>[0],
  title: string,
  label: string | ReturnType<Parameters<Template>[0]>,
  callback: () => void,
) {
  return renderCellAction(h, {
    label: title,
    className: 'cell-action',
    ...(typeof label === 'string' ? { text: label } : { content: () => label }),
    onActivate: callback,
  });
}
export const compactMoney = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

export function groupedMetrics(columns: ColumnData): ColumnData {
  return columns.map((column) =>
    'children' in column
      ? { ...column, children: groupedMetrics(column.children) }
      : { ...column, sortable: false },
  );
}

export interface Workbench {
  heading: HTMLElement;
  toolbar: HTMLElement;
  summary: HTMLElement;
  mergeCells: (ranges: MergeData[]) => void;
  onCompactChange: (listener: () => void) => void;
  setSubtitle: (text: string) => void;
  setGridEmpty: (empty: boolean) => void;
  grid: HTMLRevoGridElement;
  currentQuery: () => string;
  getSearch: () => string;
  setSearch: (value: string) => void;
  setColumnMovement: (enabled: boolean) => void;
  render: (columns: ColumnData, rows: DataType[], pinned?: DataType[], pinnedBottom?: DataType[]) => void;
  stats: (
    values: readonly (readonly [string, string, string?, number[]?, ((value: number) => string)?, DotHistogramOptions['tooltip']?])[],
  ) => void;
  form: (
    title: string,
    fields: HTMLElement[],
    save: () => void | boolean,
    extra?: HTMLElement,
    saveLabel?: string,
    cleanup?: () => void,
  ) => void;
  report: (message: string, undo?: () => void) => void;
  toaster: ToastController;
  details: (title: string, content: HTMLElement[], cleanup?: () => void) => void;
  onSearch: (listener: () => void) => void;
  resetPage: () => void;
  getPage: () => number;
  setPage: (value: number) => void;
  resetColumns: () => void;
  exportExcel: () => void;
  onDispose: (callback: () => void) => void;
}
export interface Example {
  id: string;
  title: string;
  description: string;
  setup: (bench: Workbench) => void;
}

export function mountScreen(host: HTMLElement, example: Example) {
  const layout = layouts[example.id];
  const section = make('section', '', `demo-shell workbench workbench--${example.id}`);
  const { heading, subtitle } = createDemoHeading(host.ownerDocument, example.title, 'workbench-heading', example.description);
  const stats = make('div', '', 'workbench-stats');
  stats.hidden = true;
  const toolbar = make('div', '', 'workbench-toolbar');
  const searchBar = createSearchActionBar(host.ownerDocument, {
    label: layout.search,
    shortcut: example.id === 'brand-scorecard' ? '/' : undefined,
    className: 'workbench-search-tools',
  });
  const search = searchBar.input;
  searchBar.element.querySelector('.rv-search-input')?.classList.add('workbench-search');
  const toaster = createToaster();
  const toastHost = make('div', '', 'workbench-toast-host');
  const toastView = mountToaster(toastHost, { toaster, position: 'top-center', visibleCount: example.id === 'project-budget' ? 1 : 3 });
  const empty = make(
    'p',
    'No records match the current view.',
    'workbench-empty',
  );
  empty.hidden = true;
  const overlay = make('dialog', '', 'workbench-dialog');
  overlay.setAttribute('aria-labelledby', 'workbench-dialog-title');
  const syncToastHost = () => {
    const target = overlay.open ? overlay : section;
    if (toastHost.parentElement !== target) target.append(toastHost);
  };
  const unsubscribeToasts = toaster.subscribe(() => queueMicrotask(syncToastHost));
  overlay.addEventListener('close', syncToastHost);
  const dropdownObserver = new MutationObserver(records => {
    if (overlay.open && toastHost.parentElement !== overlay && toaster.getSnapshot().length) queueMicrotask(syncToastHost);
    for (const record of records) for (const node of record.removedNodes) {
      if (node instanceof HTMLElement && !node.isConnected) disposeDropdowns(node);
    }
  });
  dropdownObserver.observe(overlay, { childList: true, subtree: true });
  let formCleanup: (() => void) | undefined;
  const cleanupForm = () => { const cleanup = formCleanup; formCleanup = undefined; cleanup?.(); disposeDropdowns(overlay); };
  overlay.addEventListener('close', () => {
    if (!overlay.open) { cleanupForm(); overlay.replaceChildren(); }
  });
  const grid = make('revo-grid', '', 'workbench-grid cell-border');
  const hasAppearance = example.id === 'campaign-performance';
  let columnMovementEnabled = false;
  if (hasAppearance) {
    // Core installs its movement plugin only at initialization; gate its drag event thereafter.
    grid.canMoveColumns = true;
    grid.addEventListener('columndragstart', (event) => {
      if (!columnMovementEnabled) event.preventDefault();
    });
  }
  const options = grid as HTMLRevoGridElement & {
    columnDialog: ColumnDialogConfig;
    cellMerge: MergeData[];
    pagination?: Partial<PaginationFullConfig>;
  };
  grid.readonly = true;
  grid.theme = 'compact';
  grid.rowSize = layout.row;
  grid.style.setProperty('--revo-grid-header-height', `${layout.header}px`);
  grid.frameSize = 2;
  grid.hideAttribution = true;
  if (['service-visits', 'campaign-performance', 'job-schedule', 'product-kpis'].includes(example.id)) grid.keyedRowSelection = { key: 'id' };
  if (example.id === 'project-budget') grid.keyedRowSelection = { key: row => row.group ? `group:${String(row.label)}` : row.id };
  if (['job-schedule', 'service-visits', 'campaign-performance', 'product-kpis'].includes(example.id)) Reflect.set(grid, 'stretch', 1);
  if (example.id === 'supplier-quality') Reflect.set(grid, 'stretch', 0);
  if (example.id === 'scale-up-index') Reflect.set(grid, 'stretch', window.matchMedia('(max-width: 650px)').matches ? 0 : 1);
  grid.tooltip = { showDelayMs: 200, animation: true };
  grid.plugins = [
    ColumnDialogPlugin,
    ExportExcelPlugin,
    ColumnHeaderMenuPlugin,
    ...(['patient-cohorts', 'product-kpis', 'scale-up-index', 'brand-scorecard', 'supplier-quality', 'job-schedule'].includes(example.id) ? [TooltipPlugin] : []),
    ...(example.id === 'reliability-index' ? [RowChartHoverPlugin] : []),
    ...(['job-schedule', 'service-visits', 'campaign-performance', 'product-kpis', 'supplier-quality', 'scale-up-index'].includes(example.id) ? [ColumnStretchPlugin] : []),
    ...(['service-visits', 'job-schedule', 'product-kpis'].includes(example.id) ? [GridPopoverPlugin] : []),
    ...(['service-visits', 'job-schedule'].includes(example.id) ? [DateRangeColumnsPlugin] : []),
    ...(['campaign-performance', 'product-kpis'].includes(example.id) ? [AdvanceFilterPlugin] : []),
    ...(example.id === 'campaign-performance' ? [GridConfiguratorPlugin] : []),
    ...(layout.checks ? [RowSelectPlugin] : []),
    ...(['service-visits', 'campaign-performance', 'job-schedule', 'product-kpis', 'project-budget'].includes(example.id) ? [KeyedRowSelectionPlugin] : []),
    ...(layout.merges ? [CellMergePlugin] : []),
    ...(example.id === 'product-kpis' ? [GridStatusLinePlugin] : example.id === 'scale-up-index' ? [GridStatePlugin] : []),
    ...(layout.page ? [PaginationPlugin] : []),
  ];
  if (example.id === 'campaign-performance') grid.filter = { columnFilterButton: false, predefinedFilters: true, groupedFilter: {}, slider: { showRangeInputs: true } };
  if (example.id === 'product-kpis') {
    const names: Record<string, string> = { label: 'Product', revenue: 'Revenue', profit: 'Profit', status: 'KPI Status' };
    grid.gridStatusLine = {
      sortLabel: sort => { const entry = Object.entries(sort)[0]; return entry ? `Sorted by ${names[entry[0]] ?? entry[0]}${entry[1] === 'desc' ? ', descending' : ''}` : 'Catalog order'; },
      legends: [
        { label: 'Promo Calendar legend', items: [{ id: 'promo', label: 'Promo week', color: demoColors.purpleLight }, { id: 'loss', label: 'Promo at a loss', color: demoColors.pink }, { id: 'met', label: 'At target, full price', color: demoColors.teal }] },
        { label: 'Revenue Trend legend', items: [{ id: 'current', label: 'This period', color: demoColors.purple, marker: 'line' }, { id: 'prior', label: 'Period before', color: demoColors.purpleLight, marker: 'line' }] },
      ],
    };
  }
  if (layout.merges) options.cellMerge = [];
  let currentRows: DataType[] = [];
  const localPage = example.id === 'campaign-performance';
  const remotePage = ['product-kpis', 'service-visits'].includes(example.id);
  let page = 0;
  let itemCount = 10;
  const productPageInfo = make('div', '', 'product-page-info');
  const updateProductPageInfo = () => {
    const start = currentRows.length ? page * itemCount + 1 : 0;
    const end = Math.min((page + 1) * itemCount, currentRows.length);
    productPageInfo.textContent = `${start} - ${end} of ${currentRows.length} ${example.id === 'service-visits' ? 'kitchens' : 'products'}`;
  };
  if (layout.page) {
    options.pagination = {
      itemsPerPage: itemCount,
      initialPage: 0,
      total: 0,
      buttonCount: 3,
      pageSizes: false,
      info: true,
      totalInfo: true,
      ...(example.id === 'service-visits' ? { locales: { items: 'kitchens' } } : example.id === 'job-schedule' ? { locales: { items: 'jobs' } } : {}),
      ...(localPage ? { local: true } : {}),
      ...(remotePage ? {
        // These loaders read mutable demo state.
        query: false,
        loadData: async (skip, take, order) => ({
          data: example.id === 'service-visits' ? visitPage(currentRows as (DataType & { label: string; coverage: { rank: number } })[], skip, take, order) : productPage(currentRows, skip, take, order),
          count: currentRows.length,
        }),
      } : {}),
    };
    grid.addEventListener(PAGE_CHANGE_EVENT, ({ detail }) => {
      page = detail.skip;
      updateProductPageInfo();
      if (!remotePage && !localPage) grid.source = currentRows.slice(page * itemCount, (page + 1) * itemCount);
    });
  }
  const viewport = window.matchMedia('(max-width: 650px)');
  const viewportListeners: (() => void)[] = [];
  const resize = () => viewportListeners.forEach((listener) => listener());
  viewport.addEventListener('change', resize);
  options.columnDialog = {
    title: 'Visible columns',
    disableDrag: true,
    hideAttribution: true,
  };
  const report = (message: string, undo?: () => void) => {
    toaster.show({
      title: message,
      tone: message.includes('could not') ? 'error' : 'success',
      ...(undo ? { action: { label: 'Undo', onClick: undo } } : {}),
    });
  };
  const exportControl = button('Export XLSX', () => {
    exportControl.disabled = true;
    void grid
      .getPlugins()
      .then((plugins) =>
        plugins
          .find((plugin) => plugin instanceof ExportExcelPlugin)
          ?.export({ workbookName: example.id }),
      )
      .catch(() => report('The workbook could not be exported.'))
      .finally(() => {
        exportControl.disabled = false;
      });
  });
  const columnControl = button('Columns', () => {
    void grid
      .getPlugins()
      .then((plugins) =>
        plugins.find((plugin) => plugin instanceof ColumnDialogPlugin)?.toggle(columnControl),
      );
  });
  if (example.id === 'reliability-index') {
    const shell = make('div', '', 'reliability-grid-shell');
    shell.append(grid);
    section.append(heading, createDemoBody(host.ownerDocument, stats, toolbar, toastHost, shell, empty, overlay));
  } else if (example.id === 'campaign-performance') {
    const shell = make('div', '', 'campaign-grid-shell');
    const configurator = make('aside', '', 'campaign-configurator-host');
    grid.gridConfigurator = {
      mountTo: configurator,
      miniMode: true,
      fields: [{ prop: 'spend', defaultAggregator: 'sum' }],
    };
    shell.append(grid, configurator);
    section.append(heading, createDemoBody(host.ownerDocument, stats, toolbar, toastHost, shell, empty, overlay));
  } else {
    section.append(heading, createDemoBody(host.ownerDocument, stats, toolbar, toastHost, grid, empty, overlay));
  }
  if (example.id === 'product-kpis') {
    const pageSize = select('Rows per page', ['10', '25', '50'], '10', (value) => {
      itemCount = Number(value);
      page = 0;
      options.pagination = {
        ...options.pagination,
        itemsPerPage: itemCount,
        initialPage: 0,
      };
      if (!remotePage) grid.source = currentRows.slice(0, itemCount);
      updateProductPageInfo();
    });
    const sizeField = field('Rows per page', pageSize);
    sizeField.classList.add('product-page-size');
    grid.insertAdjacentElement('afterend', sizeField);
    grid.insertAdjacentElement('afterend', productPageInfo);
  }
  host.replaceChildren(section);

  const setGridEmpty = (isEmpty: boolean) => {
    grid.hidden = isEmpty;
    empty.hidden = !isEmpty;
    exportControl.disabled = isEmpty;
  };
  let suppliedColumns: ColumnData | undefined;
  if (hasAppearance) {
    void customElements.whenDefined('revo-grid').then(() => grid.componentOnReady()).then(() => {
      grid.canMoveColumns = columnMovementEnabled;
    });
  }
  const disposalCallbacks: (() => void)[] = [];
  example.setup({
    heading,
    toolbar,
    summary: stats,
    mergeCells: (ranges) => {
      options.cellMerge = ranges;
    },
    onCompactChange: (listener) => viewportListeners.push(listener),
    setSubtitle: (value) => {
      subtitle.textContent = value;
    },
    grid,
    setGridEmpty,
    currentQuery: () => search.value.trim().toLowerCase(),
    getSearch: () => search.value,
    setSearch: (value) => { search.value = value; },
    setColumnMovement: (enabled) => {
      columnMovementEnabled = enabled;
      grid.canMoveColumns = enabled;
    },
    onSearch: (listener) => search.addEventListener('input', listener),
    resetPage: () => {
      page = 0;
      if (localPage && options.pagination) {
        options.pagination = { ...options.pagination, initialPage: 0 };
      }
    },
    getPage: () => page,
    setPage: (value) => { page = value; },
    resetColumns: () => {
      suppliedColumns = undefined;
      (grid as HTMLRevoGridElement & { hideColumns?: (string | number)[] }).hideColumns = [];
    },
    exportExcel: () => exportControl.click(),
    onDispose: callback => disposalCallbacks.push(callback),
    render(columns, rows, pinned = [], pinnedBottom = []) {
      if (suppliedColumns !== columns) {
        suppliedColumns = columns;
        grid.columns = layout.checks
          ? [
              {
                prop: 'selected',
                columnChooser: false,
                name: '',
                filter: false,
                size: 49,
                rowSelect: ({ model }: { model: DataType }) => !model.total && !model.footer,
                ...(['service-visits', 'job-schedule', 'product-kpis', 'project-budget'].includes(example.id) ? { rowSelectLabel: ({ model }: { model: DataType }) => `Select ${model.label}`, rowSelectAllLabel: `Select all ${example.id === 'job-schedule' ? 'jobs' : example.id === 'service-visits' ? 'kitchens' : example.id === 'product-kpis' ? 'products' : 'lines'}` } : {}),
                pin: 'colPinStart',
              },
              ...columns,
            ]
          : columns;
      }
      if (
        example.id === 'project-budget' ||
        example.id === 'scale-up-index' ||
        example.id === 'patient-cohorts'
      )
        grid.pinnedBottomSource = pinned;
      else {
        grid.pinnedTopSource = pinned;
        grid.pinnedBottomSource = pinnedBottom;
      }
      if (layout.page && options.pagination && !localPage) {
        currentRows = rows;
        page = Math.min(
          page,
          Math.max(0, Math.ceil(rows.length / itemCount) - 1),
        );
        updateProductPageInfo();
        options.pagination = {
          ...options.pagination,
          total: rows.length,
          initialPage: page,
        };
        if (!remotePage) grid.source = currentRows.slice(
          page * itemCount,
          (page + 1) * itemCount,
        );
      } else grid.source = rows;
      setGridEmpty(!rows.length && !pinned.length);
    },
    stats(values) {
      stats.hidden = !values.length;
      stats.querySelectorAll('.rv-dot-histogram, .rv-segmented-summary').forEach(releaseSummaryChartElement);
      stats.replaceChildren(
        ...values.map(([name, value, detail, samples, formatValue, tooltip]) => {
          const card = make('div', '', 'workbench-stat');
          card.append(make('span', name), make('strong', value));
          if (detail) card.append(make('small', detail));
          if (samples?.length) {
            card.append(createDotHistogramElement(document, {
              values: samples, label: `${name} distribution`, formatValue, tooltip,
              isHighlighted: (_value, _index, level) => level === 3,
            }));
          }
          return card;
        }),
      );
    },
    form(title, fields, save, extra, saveLabel = 'Save', cleanup) {
      cleanupForm();
      formCleanup = cleanup;
      const form = make('form');
      const heading = make('h2', title);
      heading.id = 'workbench-dialog-title';
      const actions = make('div', '', 'workbench-actions');
      const submit = createButtonElement(document, { label: saveLabel, className: 'rv-btn rv-btn-primary primary' });
      submit.removeAttribute('aria-label');
      submit.type = 'submit';
      if (extra) actions.append(extra);
      actions.append(
        button('Cancel', () => overlay.close()),
        submit,
      );
      form.append(heading, ...fields, actions);
      form.onsubmit = (event) => {
        event.preventDefault();
        if (save() !== false) overlay.close();
      };
      overlay.replaceChildren(form);
      if (!overlay.open) overlay.showModal();
    },
    report,
    toaster,
    details(title, content, cleanup) {
      cleanupForm();
      formCleanup = cleanup;
      const heading = make('h2', title);
      heading.id = 'workbench-dialog-title';
      const close = button('Close', () => overlay.close());
      const actions = make('div', '', 'workbench-actions');
      actions.append(close);
      overlay.replaceChildren(heading, ...content, actions);
      if (!overlay.open) overlay.showModal();
    },
  });
  arrangeToolbar({
    id: example.id,
    section,
    heading,
    toolbar,
    searchBar,
    columns: columnControl,
    download: exportControl,
    controls: [...toolbar.children],
    onDispose: callback => disposalCallbacks.push(callback),
    closeColumns: async () => {
      const plugins = await grid.getPlugins();
      plugins.find(plugin => plugin instanceof ColumnDialogPlugin)?.close(false);
    },
  });
  for (const action of heading.querySelectorAll<HTMLButtonElement>('button')) {
    const label = action.textContent?.trim() ?? '';
    if (/^(Add|New)\s/.test(label)) {
      configureDemoAddButton(action, label, plusIcon);
      const tooltip = new TooltipController();
      tooltip.bind(action, label, { delay: 200 });
      disposalCallbacks.push(() => tooltip.destroy());
    }
  }
  return () => {
    disposalCallbacks.forEach(callback => callback());
    unsubscribeToasts();
    toastView.destroy();
    searchBar.destroy();
    stats.querySelectorAll('.rv-dot-histogram, .rv-segmented-summary').forEach(releaseSummaryChartElement);
    cleanupForm();
    dropdownObserver.disconnect();
    viewport.removeEventListener('change', resize);
    disposeDropdowns(section);
    section.remove();
  };
}

export function removeRecord<T>(
  bench: Workbench,
  rows: T[],
  row: T,
  label: string,
  refresh: () => void,
) {
  bench.form('Delete record?', [make('p', label)], () => {
    const index = rows.indexOf(row);
    if (index < 0) return;
    rows.splice(index, 1);
    refresh();
    bench.report(`${label} deleted.`, () => {
      rows.splice(Math.min(index, rows.length), 0, row);
      refresh();
    });
  });
}
