import { defineCustomElements } from '@revolist/revogrid/loader';
defineCustomElements();

import { readSheet as readXlsxSheet } from 'read-excel-file/browser';
import {
  AdvanceFilterPlugin,
  AutoFillPlugin,
  AutoFillPreviewPlugin,
  CellFlashPlugin,
  CellMergePlugin,
  CellValidatePlugin,
  ClipboardJsonPlugin,
  CollaborativePresencePlugin,
  ColumnCollapsePlugin,
  ColumnHidePlugin,
  ColumnDropdown,
  ColumnMoveAdvancedPlugin,
  ColumnStretchPlugin,
  ContextMenuPlugin,
  EventManagerPlugin,
  ExportExcelPlugin,
  FilterHeaderPlugin,
  FormulaBarPlugin,
  FormulaDependencyHighlightPlugin,
  FormulaPlugin,
  HistoryPlugin,
  MultiRangeSelectionPlugin,
  NamedRangesPlugin,
  RowHeaderPlugin,
  RowOrderPlugin,
  SameValueMergePlugin,
  TooltipPlugin,
  type HistoryState,
} from '@revolist/revogrid-pro';
import './spreadsheet.scss';
import type { DataType } from '@revolist/revogrid';
import {
  SPREADSHEET_ACTION_ICONS,
  SPREADSHEET_EXPORT_CONFIG,
  SPREADSHEET_ROW_ORDER_CONFIG,
  createSpreadsheetCellFlashConfig,
  createSpreadsheetContextMenus,
  createSpreadsheetDisplayColumns,
  createSpreadsheetEventManagerConfig,
  createSpreadsheetExportExcelConfig,
  createSpreadsheetFormulaDependencyHighlightConfig,
  createSpreadsheetHistoryConfig,
  createSpreadsheetRowHeaders,
  createSpreadsheetWorkbook,
  formatWorkbookStatus,
  getSpreadsheetGridTheme,
  getSpreadsheetPluginLabels,
  installSpreadsheetContextSelectionGuard,
  installSpreadsheetFormulaEditorHighlight,
  installSpreadsheetReadonlyEditGuard,
  installSpreadsheetAutofillStrategy,
  insertSpreadsheetRowFromPinnedDropdown,
  observeSpreadsheetTheme,
  readSpreadsheetWorkbookFromXlsx,
  createSpreadsheetWorkbookFromGridSource,
  summarizeClipboardMatrix,
  summarizeSpreadsheetRowHeaderFocus,
  summarizeSelection,
  type SpreadsheetContextMenuController,
  type SpreadsheetFlashPlugin,
  type SpreadsheetSheetKey,
  type SpreadsheetWorkbook,
} from './spreadsheet.shared';
import {
  applySpreadsheetPresenceSimulationStep,
  createSpreadsheetCollaborativePresence,
  createSpreadsheetPresenceUsers,
  flashSpreadsheetPresenceEdit,
} from './spreadsheet.presence';
import {
  applySpreadsheetFeedFlashStep,
  flashSpreadsheetFeedEdit,
} from './spreadsheet.feed';
import {
  getSpreadsheetGridRowsForSimulation,
  hasSpreadsheetSimulationDataChange,
  shouldDeferSpreadsheetSimulationDataUpdate,
  syncSpreadsheetSimulationResultToGrid,
} from './spreadsheet.simulation';

export function load(parentSelector: string) {
  const parent = document.querySelector(parentSelector);
  if (!parent) return;

  let workbook: SpreadsheetWorkbook = createSpreadsheetWorkbook();
  let presenceStep = 0;
  let feedStep = 0;
  let feedTimer: number | undefined;
  let presenceUsers = createSpreadsheetPresenceUsers(0);
  let historyState: HistoryState = {
    undoStackSize: 0,
    redoStackSize: 0,
    canUndo: false,
    canRedo: false,
    disabled: false,
  };

  const shell = document.createElement('section');
  shell.className = 'spreadsheet-workbench';
  shell.dataset.testid = 'spreadsheet-workbench';

  const ribbon = document.createElement('div');
  ribbon.className = 'spreadsheet-ribbon';
  const sheetTabs = document.createElement('div');
  sheetTabs.className = 'spreadsheet-sheet-tabs';
  sheetTabs.dataset.testid = 'spreadsheet-sheet-tabs';
  const formulaRow = document.createElement('div');
  formulaRow.className = 'spreadsheet-formula-row';
  const main = document.createElement('div');
  main.className = 'spreadsheet-main';
  const gridWrap = document.createElement('div');
  gridWrap.className = 'spreadsheet-grid-wrap';
  const statusRow = document.createElement('div');
  statusRow.className = 'spreadsheet-status-row';

  const grid = document.createElement('revo-grid');
  grid.className = 'spreadsheet-grid cell-border';
  grid.theme = getSpreadsheetGridTheme();
  grid.stretch = 'all';
  grid.range = true;
  grid.rowHeaders = createSpreadsheetRowHeaders();
  grid.rowOrder = SPREADSHEET_ROW_ORDER_CONFIG;
  grid.resize = true;
  grid.hideAttribution = true;
  grid.columnTypes = { statusDropdown: ColumnDropdown, departmentDropdown: ColumnDropdown };
  grid.filter = {};

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  fileInput.className = 'spreadsheet-file-input';
  fileInput.dataset.testid = 'spreadsheet-xlsx-input';

  const importLabel = document.createElement('label');
  importLabel.className = 'spreadsheet-file-label';
  appendActionIcon(importLabel, SPREADSHEET_ACTION_ICONS.import);
  importLabel.append('Import XLSX', fileInput);
  const exportButton = button('Export XLSX', exportWorkbook, SPREADSHEET_ACTION_ICONS.export);
  exportButton.dataset.testid = 'spreadsheet-export';
  const undoButton = button('Undo 0', () => runHistory('undo'), SPREADSHEET_ACTION_ICONS.undo);
  const redoButton = button('Redo 0', () => runHistory('redo'), SPREADSHEET_ACTION_ICONS.redo);
  ribbon.append(
    group(importLabel, exportButton),
    group(undoButton, redoButton),
  );

  const budgetSheetTab = button('Budget', () => {});
  budgetSheetTab.className = 'spreadsheet-sheet-tab is-active';
  budgetSheetTab.dataset.testid = 'spreadsheet-sheet-budget';
  sheetTabs.append(budgetSheetTab);
  const tabSpacer = document.createElement('span');
  tabSpacer.className = 'spreadsheet-tab-spacer';
  tabSpacer.setAttribute('aria-hidden', 'true');
  const collab = document.createElement('span');
  collab.className = 'spreadsheet-collab';
  collab.setAttribute('aria-label', 'Live collaborators');
  const liveDot = document.createElement('span');
  liveDot.className = 'spreadsheet-live-dot';
  liveDot.title = 'Live data';
  collab.append(liveDot);
  sheetTabs.append(tabSpacer, collab);

  const formulaBadge = document.createElement('span');
  formulaBadge.className = 'spreadsheet-cell-badge';
  formulaBadge.textContent = 'A1';
  const formulaEditor = document.createElement('span');
  formulaEditor.className = 'spreadsheet-formula-editor';
  const formulaHighlight = document.createElement('span');
  formulaHighlight.className = 'spreadsheet-formula-highlight';
  formulaHighlight.dataset.testid = 'spreadsheet-formula-highlight';
  const formulaInput = document.createElement('input');
  formulaInput.className = 'spreadsheet-formula-input';
  formulaInput.dataset.testid = 'spreadsheet-formula-input';
  formulaInput.placeholder = 'Select a cell to inspect or edit its raw value';
  formulaInput.setAttribute('aria-label', 'Formula bar');
  formulaEditor.append(formulaHighlight, formulaInput);
  formulaRow.append(formulaBadge, formulaEditor);

  const workbookStatus = document.createElement('span');
  workbookStatus.className = 'spreadsheet-status-pill';
  workbookStatus.dataset.testid = 'spreadsheet-workbook-status';
  const selectionStatus = document.createElement('span');
  const clipboardStatus = document.createElement('span');
  const previewStatus = document.createElement('span');
  statusRow.append(workbookStatus, selectionStatus, clipboardStatus, previewStatus);

  const workbookController: SpreadsheetContextMenuController = {
    getGrid: () => grid,
    getWorkbook: () => workbook,
    setWorkbook: (nextWorkbook) => {
      workbook = nextWorkbook;
      void syncWorkbookSource(nextWorkbook);
    },
    setClipboardStatus: (message) => {
      clipboardStatus.textContent = message;
    },
    resetWorkbook,
    exportWorkbook,
  };
  const contextMenus = createSpreadsheetContextMenus(workbookController);

  gridWrap.append(grid);
  main.append(gridWrap);
  shell.append(ribbon, sheetTabs, formulaRow, main, statusRow);
  parent.appendChild(shell);

  grid.addEventListener('historychanged', onHistoryChanged as EventListener);
  grid.addEventListener('multirangeselectionchange', onSelectionChange as EventListener);
  grid.addEventListener('beforecopyapply', onClipboardCopy as EventListener);
  grid.addEventListener('beforepasteapply', onClipboardPaste as EventListener);
  grid.addEventListener('rowfocus', onRowHeaderFocus as EventListener);
  grid.addEventListener('beforeedit', onBeforeEdit as EventListener);
  fileInput.addEventListener('change', onXlsxChange);
  shell.addEventListener('dragover', (event) => event.preventDefault());
  shell.addEventListener('drop', onDrop);
  const disconnectThemeObserver = observeSpreadsheetTheme((isDark) => {
    shell.classList.toggle('is-dark', isDark);
    grid.theme = getSpreadsheetGridTheme(isDark);
  });
  const disconnectContextSelectionGuard = installSpreadsheetContextSelectionGuard(shell, () => grid);
  const disconnectReadonlyEditGuard = installSpreadsheetReadonlyEditGuard(
    grid,
    () => workbook.columns,
    (message) => {
      clipboardStatus.textContent = message;
    },
  );
  const disconnectFormulaHighlight = installSpreadsheetFormulaEditorHighlight(
    formulaInput,
    formulaHighlight,
    grid,
  );
  const presenceTimer = window.setInterval(() => {
    void runPresenceSimulation();
  }, 1800);

  void syncWorkbookSource(workbook);
  syncToolbar();
  toggleFeedFlash();

  return () => {
    disconnectThemeObserver();
    disconnectContextSelectionGuard();
    disconnectReadonlyEditGuard();
    disconnectFormulaHighlight();
    window.clearInterval(presenceTimer);
    stopFeedFlash();
    grid.removeEventListener('rowfocus', onRowHeaderFocus as EventListener);
    grid.removeEventListener('beforeedit', onBeforeEdit as EventListener);
    shell.remove();
  };

  function button(label: string, onClick: () => void | Promise<void>, icon?: string) {
    const item = document.createElement('button');
    item.className = 'spreadsheet-btn';
    item.type = 'button';
    setButtonContent(item, label, icon);
    item.addEventListener('click', () => {
      void onClick();
    });
    return item;
  }

  function appendActionIcon(parent: HTMLElement, icon: string) {
    const iconElement = document.createElement('span');
    iconElement.className = 'spreadsheet-action-icon';
    iconElement.setAttribute('aria-hidden', 'true');
    iconElement.innerHTML = icon;
    parent.append(iconElement);
  }

  function setButtonContent(item: HTMLButtonElement, label: string, icon?: string) {
    item.replaceChildren();
    if (icon) {
      appendActionIcon(item, icon);
    }
    item.append(document.createTextNode(label));
  }

  function group(...children: Array<HTMLElement>) {
    const item = document.createElement('span');
    item.className = 'spreadsheet-ribbon-group';
    item.append(...children);
    return item;
  }

  function syncToolbar() {
    setButtonContent(undoButton, `Undo ${historyState.undoStackSize}`, SPREADSHEET_ACTION_ICONS.undo);
    undoButton.disabled = !historyState.canUndo;
    setButtonContent(redoButton, `Redo ${historyState.redoStackSize}`, SPREADSHEET_ACTION_ICONS.redo);
    redoButton.disabled = !historyState.canRedo;
    shell.dataset.pluginStack = getSpreadsheetPluginLabels().join(',');
    workbookStatus.textContent = formatWorkbookStatus(workbook);
    selectionStatus.textContent ||= 'No ranges selected';
    clipboardStatus.textContent ||= 'Copy ranges or paste structured data.';
    previewStatus.textContent = 'Drag the fill handle for inferred sequences.';
    renderCollaborators();
  }

  function getRowsForSimulation(gridInstance: HTMLRevoGridElement | null, fallbackRows: DataType[] = []): DataType[] {
    if (typeof getSpreadsheetGridRowsForSimulation === 'function') {
      return getSpreadsheetGridRowsForSimulation(gridInstance, fallbackRows);
    }
    const rows = gridInstance?.source;
    return Array.isArray(rows) ? [...rows] : [...fallbackRows];
  }

  function getGridSourceWorkbook(targetWorkbook = workbook): SpreadsheetWorkbook {
    return createSpreadsheetWorkbookFromGridSource(targetWorkbook, getRowsForSimulation(grid, targetWorkbook.rows));
  }

  async function syncWorkbookSource(targetWorkbook: SpreadsheetWorkbook) {
    const sourceWorkbook = getGridSourceWorkbook(targetWorkbook);
    if (sourceWorkbook.rows.length !== targetWorkbook.rows.length) {
      workbook = targetWorkbook;
      grid.source = targetWorkbook.rows;
      applyWorkbook();
      return;
    }
    workbook = await syncSpreadsheetSimulationResultToGrid(grid, sourceWorkbook, targetWorkbook, { rowType: 'rgRow' });
    applyWorkbook();
  }

  function applyWorkbook() {
    grid.plugins = [
      EventManagerPlugin,
      HistoryPlugin,
      CellFlashPlugin,
      CollaborativePresencePlugin,
      FormulaBarPlugin,
      FormulaDependencyHighlightPlugin,
      NamedRangesPlugin,
      FormulaPlugin,
      AutoFillPlugin,
      AutoFillPreviewPlugin,
      MultiRangeSelectionPlugin,
      RowHeaderPlugin,
      RowOrderPlugin,
      ColumnMoveAdvancedPlugin,
      ColumnCollapsePlugin,
      ClipboardJsonPlugin,
      ContextMenuPlugin,
      ExportExcelPlugin,
      AdvanceFilterPlugin,
      FilterHeaderPlugin,
      CellValidatePlugin,
      CellMergePlugin,
      SameValueMergePlugin,
      TooltipPlugin,
      ColumnHidePlugin,
      ColumnStretchPlugin,
    ];
    grid.formulaNames = workbook.formulaNames;
    grid.source = workbook.rows;
    grid.pinnedBottomSource = workbook.pinnedBottomSource;
    grid.columns = createSpreadsheetDisplayColumns(workbook);
    grid.cellMerge = workbook.cellMerge;
    grid.eventManager = createSpreadsheetEventManagerConfig();
    grid.history = createSpreadsheetHistoryConfig();
    grid.cellFlash = createSpreadsheetCellFlashConfig();
    grid.collaborativePresence = createSpreadsheetCollaborativePresence(presenceUsers);
    grid.formulaBar = { el: formulaInput, badgeEl: formulaBadge, showCellBadge: true };
    grid.formulaDependencyHighlight = createSpreadsheetFormulaDependencyHighlightConfig();
    grid.exportExcel = createSpreadsheetExportExcelConfig();
    grid.rowContextMenu = contextMenus.rowContextMenu;
    grid.columnContextMenu = contextMenus.columnContextMenu;
    void installSpreadsheetAutofillStrategy(grid);
    syncToolbar();
  }

  async function getPlugin<T>(pluginClass: new (...args: any[]) => T): Promise<T | undefined> {
    const plugins = await grid.getPlugins?.();
    return plugins?.find(plugin => plugin instanceof pluginClass) as T | undefined;
  }

  async function runHistory(action: 'undo' | 'redo') {
    const plugin = await getPlugin(HistoryPlugin);
    plugin?.[action]();
  }

  async function exportWorkbook() {
    const plugin = await getPlugin(ExportExcelPlugin);
    await plugin?.export(SPREADSHEET_EXPORT_CONFIG);
  }

  function stopFeedFlash() {
    if (feedTimer) {
      window.clearInterval(feedTimer);
      feedTimer = undefined;
    }
  }

  async function runFeedFlashStep() {
    feedStep += 1;
    const sourceWorkbook = getGridSourceWorkbook(workbook);
    const result = applySpreadsheetFeedFlashStep(sourceWorkbook, feedStep);
    if (shouldDeferSpreadsheetSimulationDataUpdate(grid, shell)) {
      clipboardStatus.textContent = `${result.message} Local edit in progress; feed write paused.`;
      return;
    }
    const syncedWorkbook = await syncSpreadsheetSimulationResultToGrid(
      grid,
      sourceWorkbook,
      result.workbook,
      { rowType: 'rgRow' },
    );
    workbook = syncedWorkbook;
    clipboardStatus.textContent = result.message;
    syncToolbar();
    const plugin = await getPlugin(CellFlashPlugin);
    flashSpreadsheetFeedEdit(plugin as SpreadsheetFlashPlugin | undefined, result);
  }

  function toggleFeedFlash() {
    if (feedTimer) {
      stopFeedFlash();
      clipboardStatus.textContent = 'Feed flash stopped.';
      syncToolbar();
      return;
    }
    feedStep = 0;
    clipboardStatus.textContent = 'Feed flash started.';
    void runFeedFlashStep();
    feedTimer = window.setInterval(() => {
      void runFeedFlashStep();
    }, 1400);
    syncToolbar();
  }

  async function runPresenceSimulation() {
    presenceStep += 1;
    const sourceWorkbook = getGridSourceWorkbook(workbook);
    const result = applySpreadsheetPresenceSimulationStep(sourceWorkbook, presenceStep);
    presenceUsers = result.users;
    grid.collaborativePresence = createSpreadsheetCollaborativePresence(presenceUsers);
    renderCollaborators();
    if (!hasSpreadsheetSimulationDataChange(result)) {
      clipboardStatus.textContent = result.message;
      return;
    }
    if (shouldDeferSpreadsheetSimulationDataUpdate(grid, shell)) {
      clipboardStatus.textContent = `${result.message} Local edit in progress; remote write paused.`;
      return;
    }
    workbook = await syncSpreadsheetSimulationResultToGrid(
      grid,
      sourceWorkbook,
      result.workbook,
      { rowType: 'rgRow' },
    );
    clipboardStatus.textContent = result.message;
    syncToolbar();
    const plugin = await getPlugin(CellFlashPlugin);
    flashSpreadsheetPresenceEdit(plugin as SpreadsheetFlashPlugin | undefined, result);
  }

  function resetWorkbook() {
    stopFeedFlash();
    feedStep = 0;
    workbook = createSpreadsheetWorkbook(getActiveSheetKey());
    presenceStep = 0;
    presenceUsers = createSpreadsheetPresenceUsers(0);
    selectionStatus.textContent = 'No ranges selected';
    clipboardStatus.textContent = 'Workbook reset. CSV files can be dropped on the grid.';
    void syncWorkbookSource(workbook);
  }

  function getActiveSheetKey(): SpreadsheetSheetKey {
    return workbook.sheetKey === 'imported' || workbook.sheetKey === 'empty' ? 'budget' : workbook.sheetKey;
  }

  async function importXlsxFile(file: File) {
    stopFeedFlash();
    feedStep = 0;
    workbook = await readSpreadsheetWorkbookFromXlsx(file, readXlsxSheet);
    presenceUsers = createSpreadsheetPresenceUsers(presenceStep, true);
    clipboardStatus.textContent = `Imported values from ${file.name}.`;
    void syncWorkbookSource(workbook);
  }

  async function onXlsxChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      await importXlsxFile(file);
    }
    fileInput.value = '';
  }

  function onDrop(event: DragEvent) {
    const file = event.dataTransfer?.files?.[0];
    if (file?.name.toLowerCase().endsWith('.xlsx')) {
      event.preventDefault();
      void importXlsxFile(file);
    }
  }

  function onHistoryChanged(event: CustomEvent<HistoryState>) {
    historyState = event.detail;
    syncToolbar();
  }

  function onSelectionChange(event: CustomEvent<{ ranges?: Array<{ x: number; y: number; x1: number; y1: number }> }>) {
    selectionStatus.textContent = summarizeSelection(event.detail?.ranges ?? []);
  }

  function onRowHeaderFocus(event: Event) {
    const summary = summarizeSpreadsheetRowHeaderFocus(event, grid.columns ?? []);
    if (summary) {
      selectionStatus.textContent = summary;
    }
  }

  function onClipboardCopy(event: CustomEvent<{ data?: unknown[][] }>) {
    clipboardStatus.textContent = `Copied ${summarizeClipboardMatrix(event.detail?.data)}.`;
  }

  function onClipboardPaste(event: CustomEvent<{ parsed?: unknown[][] }>) {
    clipboardStatus.textContent = `Pasted ${summarizeClipboardMatrix(event.detail?.parsed)}.`;
  }

  function renderCollaborators() {
    const avatars = presenceUsers.map((user) => {
      const avatar = document.createElement('span');
      avatar.className = 'spreadsheet-avatar spreadsheet-avatar-presence';
      avatar.style.setProperty('--spreadsheet-avatar-color', user.color ?? '#2563eb');
      avatar.title = `${user.name} - ${user.activity ?? 'viewing'}`;
      avatar.textContent = user.initials ?? user.name.slice(0, 2).toUpperCase();
      return avatar;
    });
    collab.replaceChildren(liveDot, ...avatars);
  }

  function onBeforeEdit(event: Event) {
    insertSpreadsheetRowFromPinnedDropdown(event, workbookController);
  }

}
