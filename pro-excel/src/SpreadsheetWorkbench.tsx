import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { readSheet as readXlsxSheet } from 'read-excel-file/browser';
import { RevoGrid } from '@revolist/react-datagrid';
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
  createSpreadsheetWorkbookFromGridSource,
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
  preventReadonlySpreadsheetEdit,
  readSpreadsheetWorkbookFromXlsx,
  summarizeClipboardMatrix,
  summarizeSpreadsheetRowHeaderFocus,
  summarizeSelection,
  type SpreadsheetFlashPlugin,
  type SpreadsheetSheetKey,
  type SpreadsheetWorkbook,
} from './spreadsheet.shared';
import {
  getSpreadsheetGridRowsForSimulation,
  hasSpreadsheetSimulationDataChange,
  shouldDeferSpreadsheetSimulationDataUpdate,
  syncSpreadsheetSimulationResultToGrid,
} from './spreadsheet.simulation';
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

function ActionIcon({ icon }: { icon: string }) {
  return (
    <span
      className="spreadsheet-action-icon"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: icon }}
    />
  );
}

export default function SpreadsheetWorkbench({ isDark = false }: { isDark?: boolean }) {
  const gridRef = useRef<HTMLRevoGridElement>(null);
  const shellRef = useRef<HTMLElement | null>(null);
  const formulaInputRef = useRef<HTMLInputElement>(null);
  const formulaBadgeRef = useRef<HTMLSpanElement>(null);
  const formulaHighlightRef = useRef<HTMLSpanElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const feedTimerRef = useRef<number | undefined>(undefined);
  const feedStepRef = useRef(0);
  const presenceStepRef = useRef(0);
  const [formulaReady, setFormulaReady] = useState(false);
  const [workbook, setWorkbook] = useState<SpreadsheetWorkbook>(() => createSpreadsheetWorkbook());
  const workbookRef = useRef(workbook);
  const [presenceStep, setPresenceStep] = useState(0);
  const [feedFlashActive, setFeedFlashActive] = useState(true);
  const [presenceUsers, setPresenceUsers] = useState(() => createSpreadsheetPresenceUsers(0));
  const [selectionStatus, setSelectionStatus] = useState('No ranges selected');
  const [clipboardStatus, setClipboardStatus] = useState('Copy ranges or paste structured data.');
  const [historyState, setHistoryState] = useState<HistoryState>({
    undoStackSize: 0,
    redoStackSize: 0,
    canUndo: false,
    canRedo: false,
    disabled: false,
  });

  const columnTypes = useMemo(() => ({ statusDropdown: ColumnDropdown, departmentDropdown: ColumnDropdown }), []);
  const additionalData = useMemo(() => ({ formulaNames: workbook.formulaNames }), [workbook.formulaNames]);
  const filterConfig = useMemo(() => ({}), []);
  const eventManager = useMemo(() => createSpreadsheetEventManagerConfig(), []);
  const history = useMemo(() => createSpreadsheetHistoryConfig(), []);
  const cellFlash = useMemo(() => createSpreadsheetCellFlashConfig(), []);
  const collaborativePresence = useMemo(() => createSpreadsheetCollaborativePresence(presenceUsers), [presenceUsers]);
  const formulaDependencyHighlight = useMemo(() => createSpreadsheetFormulaDependencyHighlightConfig(), []);
  const exportExcel = useMemo(() => createSpreadsheetExportExcelConfig(), []);
  const rowOrder = useMemo(() => SPREADSHEET_ROW_ORDER_CONFIG, []);
  const gridTheme = useMemo(() => getSpreadsheetGridTheme(isDark), [isDark]);
  const pluginStack = useMemo(() => getSpreadsheetPluginLabels().join(','), []);
  const displayColumns = useMemo(() => createSpreadsheetDisplayColumns(workbook), [workbook]);
  const formulaBar = useMemo(() => ({
    el: formulaInputRef.current ?? undefined,
    badgeEl: formulaBadgeRef.current ?? undefined,
    showCellBadge: true,
  }), [formulaReady]);
  const rowHeaderConfig = useMemo(() => createSpreadsheetRowHeaders(), []);
  const plugins = useMemo(() => [
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
  ], []);

  useEffect(() => {
    setFormulaReady(true);
  }, []);

  useEffect(() => {
    workbookRef.current = workbook;
  }, [workbook]);

  useEffect(() => {
    presenceStepRef.current = presenceStep;
  }, [presenceStep]);

  useEffect(() => {
    if (!shellRef.current) {
      return;
    }
    return installSpreadsheetContextSelectionGuard(shellRef.current, () => gridRef.current);
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      void installSpreadsheetAutofillStrategy(gridRef.current);
    });
  }, []);

  useEffect(() => {
    if (!gridRef.current) {
      return;
    }
    return installSpreadsheetReadonlyEditGuard(
      gridRef.current,
      () => workbook.columns,
      setClipboardStatus,
    );
  }, [workbook.columns]);

  useEffect(() => {
    if (!formulaInputRef.current || !formulaHighlightRef.current || !gridRef.current) {
      return;
    }
    return installSpreadsheetFormulaEditorHighlight(
      formulaInputRef.current,
      formulaHighlightRef.current,
      gridRef.current,
    );
  }, [formulaReady]);

  const getPlugin = useCallback(async <T,>(pluginClass: new (...args: any[]) => T): Promise<T | undefined> => {
    const plugins = await gridRef.current?.getPlugins?.();
    return plugins?.find(plugin => plugin instanceof pluginClass) as T | undefined;
  }, []);

  const getGridRowsForSimulation = useCallback((grid: HTMLRevoGridElement | null, fallbackRows: unknown[] = []) => {
    if (typeof getSpreadsheetGridRowsForSimulation === 'function') {
      return getSpreadsheetGridRowsForSimulation(grid, fallbackRows);
    }
    const sourceRows = grid?.source;
    return Array.isArray(sourceRows) ? [...sourceRows] : [...fallbackRows];
  }, []);

  const runPresenceSimulation = useCallback(async () => {
    const nextStep = presenceStepRef.current + 1;
    presenceStepRef.current = nextStep;
    setPresenceStep(nextStep);
    const sourceWorkbook = createSpreadsheetWorkbookFromGridSource(
      workbookRef.current,
      getGridRowsForSimulation(gridRef.current, workbookRef.current.rows),
    );
    const result = applySpreadsheetPresenceSimulationStep(sourceWorkbook, nextStep);
    setPresenceUsers(result.users);
    setClipboardStatus(result.message);
    if (!hasSpreadsheetSimulationDataChange(result)) {
      return;
    }
    if (shouldDeferSpreadsheetSimulationDataUpdate(gridRef.current, shellRef.current)) {
      setClipboardStatus(`${result.message} Local edit in progress; remote write paused.`);
      return;
    }
    const syncedWorkbook = await syncSpreadsheetSimulationResultToGrid(
      gridRef.current,
      sourceWorkbook,
      result.workbook,
      { rowType: 'rgRow' },
    );
    setWorkbook(syncedWorkbook);
    const plugin = await getPlugin(CellFlashPlugin);
    flashSpreadsheetPresenceEdit(plugin as SpreadsheetFlashPlugin | undefined, result);
  }, [getPlugin]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void runPresenceSimulation();
    }, 1800);
    return () => window.clearInterval(timer);
  }, [runPresenceSimulation]);

  const runHistory = useCallback(async (action: 'undo' | 'redo') => {
    const plugin = await getPlugin(HistoryPlugin);
    plugin?.[action]();
  }, [getPlugin]);

  const exportWorkbook = useCallback(async () => {
    const plugin = await getPlugin(ExportExcelPlugin);
    await plugin?.export(SPREADSHEET_EXPORT_CONFIG);
  }, [getPlugin]);

  const stopFeedFlash = useCallback((message?: string) => {
    if (feedTimerRef.current) {
      window.clearInterval(feedTimerRef.current);
      feedTimerRef.current = undefined;
    }
    setFeedFlashActive(false);
    if (message) {
      setClipboardStatus(message);
    }
  }, []);

  useEffect(() => () => {
    stopFeedFlash();
  }, [stopFeedFlash]);

  const runFeedFlashStep = useCallback(async () => {
    feedStepRef.current += 1;
    const sourceWorkbook = createSpreadsheetWorkbookFromGridSource(
      workbookRef.current,
      getGridRowsForSimulation(gridRef.current, workbookRef.current.rows),
    );
    const result = applySpreadsheetFeedFlashStep(sourceWorkbook, feedStepRef.current);
    if (shouldDeferSpreadsheetSimulationDataUpdate(gridRef.current, shellRef.current)) {
      setClipboardStatus(`${result.message} Local edit in progress; feed write paused.`);
      return;
    }
    const syncedWorkbook = await syncSpreadsheetSimulationResultToGrid(
      gridRef.current,
      sourceWorkbook,
      result.workbook,
      { rowType: 'rgRow' },
    );
    setWorkbook(syncedWorkbook);
    setClipboardStatus(result.message);
    const plugin = await getPlugin(CellFlashPlugin);
    flashSpreadsheetFeedEdit(plugin as SpreadsheetFlashPlugin | undefined, result);
  }, [getPlugin]);

  const toggleFeedFlash = useCallback(() => {
    if (feedTimerRef.current) {
      stopFeedFlash('Feed flash stopped.');
      return;
    }
    feedStepRef.current = 0;
    setFeedFlashActive(true);
    setClipboardStatus('Feed flash started.');
    runFeedFlashStep();
    feedTimerRef.current = window.setInterval(runFeedFlashStep, 1400);
  }, [runFeedFlashStep, stopFeedFlash]);

  useEffect(() => {
    feedStepRef.current = 0;
    void runFeedFlashStep();
    feedTimerRef.current = window.setInterval(runFeedFlashStep, 1400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const importXlsxFile = useCallback(async (file: File) => {
    stopFeedFlash();
    feedStepRef.current = 0;
    const nextWorkbook = await readSpreadsheetWorkbookFromXlsx(file, readXlsxSheet);
    setWorkbook(nextWorkbook);
    setPresenceUsers(createSpreadsheetPresenceUsers(presenceStep, true));
    setClipboardStatus(`Imported values from ${file.name}.`);
  }, [presenceStep, stopFeedFlash]);

  const getActiveSheetKey = useCallback((): SpreadsheetSheetKey => (
    workbook.sheetKey === 'imported' || workbook.sheetKey === 'empty' ? 'budget' : workbook.sheetKey
  ), [workbook.sheetKey]);

  const resetWorkbook = useCallback(() => {
    stopFeedFlash();
    feedStepRef.current = 0;
    setWorkbook(createSpreadsheetWorkbook(getActiveSheetKey()));
    setPresenceStep(0);
    setPresenceUsers(createSpreadsheetPresenceUsers(0));
    setSelectionStatus('No ranges selected');
    setClipboardStatus('Workbook reset. CSV files can be dropped on the grid.');
  }, [getActiveSheetKey, stopFeedFlash]);

  const onXlsxChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void importXlsxFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [importXlsxFile]);

  const onDrop = useCallback((event: React.DragEvent<HTMLElement>) => {
    const file = event.dataTransfer.files?.[0];
    if (file?.name.toLowerCase().endsWith('.xlsx')) {
      event.preventDefault();
      void importXlsxFile(file);
    }
  }, [importXlsxFile]);

  const onHistoryChanged = useCallback((event: CustomEvent<HistoryState>) => {
    setHistoryState(event.detail);
  }, []);

  const onSelectionChange = useCallback((event: CustomEvent<{ ranges?: Array<{ x: number; y: number; x1: number; y1: number }> }>) => {
    setSelectionStatus(summarizeSelection(event.detail?.ranges ?? []));
  }, []);

  const onRowHeaderFocus = useCallback((event: Event) => {
    const summary = summarizeSpreadsheetRowHeaderFocus(event, displayColumns);
    if (summary) {
      setSelectionStatus(summary);
    }
  }, [displayColumns]);

  const onClipboardCopy = useCallback((event: CustomEvent<{ data?: unknown[][] }>) => {
    setClipboardStatus(`Copied ${summarizeClipboardMatrix(event.detail?.data)}.`);
  }, []);

  const onClipboardPaste = useCallback((event: CustomEvent<{ parsed?: unknown[][] }>) => {
    setClipboardStatus(`Pasted ${summarizeClipboardMatrix(event.detail?.parsed)}.`);
  }, []);

  const onReadonlyEdit = useCallback((event: Event) => {
    preventReadonlySpreadsheetEdit(event, workbook.columns, setClipboardStatus);
  }, [workbook.columns]);

  const onBeforeEdit = useCallback((event: Event) => {
    if (insertSpreadsheetRowFromPinnedDropdown(event, {
      getGrid: () => gridRef.current,
      getWorkbook: () => workbook,
      setWorkbook,
      setClipboardStatus,
    })) {
      return;
    }
    preventReadonlySpreadsheetEdit(event, workbook.columns, setClipboardStatus);
  }, [workbook, setWorkbook]);

  const contextMenus = useMemo(() => createSpreadsheetContextMenus({
    getGrid: () => gridRef.current,
    getWorkbook: () => workbook,
    setWorkbook,
    setClipboardStatus,
    resetWorkbook,
    exportWorkbook,
  }), [exportWorkbook, resetWorkbook, workbook]);

  const gridElement = useMemo(() => (
    <RevoGrid
      ref={gridRef}
      className="spreadsheet-grid cell-border"
      theme={gridTheme}
      plugins={plugins}
      columns={displayColumns}
      pinnedBottomSource={workbook.pinnedBottomSource}
      columnTypes={columnTypes}
      filter={filterConfig}
      cellMerge={workbook.cellMerge}
      eventManager={eventManager}
      history={history}
      cellFlash={cellFlash}
      collaborativePresence={collaborativePresence}
      formulaNames={workbook.formulaNames}
      formulaBar={formulaBar}
      formulaDependencyHighlight={formulaDependencyHighlight}
      exportExcel={exportExcel}
      rowOrder={rowOrder}
      additionalData={additionalData}
      rowContextMenu={contextMenus.rowContextMenu}
      columnContextMenu={contextMenus.columnContextMenu}
      source={workbook.rows}
      stretch="all"
      range
      rowHeaders={rowHeaderConfig}
      resize
      hideAttribution
      onHistorychanged={onHistoryChanged as any}
      onMultirangeselectionchange={onSelectionChange as any}
      onBeforecopyapply={onClipboardCopy as any}
      onBeforepasteapply={onClipboardPaste as any}
      onRowfocus={onRowHeaderFocus as any}
      onBeforeeditstart={onReadonlyEdit as any}
      onBeforeedit={onBeforeEdit as any}
    />
  ), [
    additionalData,
    cellFlash,
    collaborativePresence,
    columnTypes,
    contextMenus,
    displayColumns,
    eventManager,
    exportExcel,
    filterConfig,
    formulaBar,
    formulaDependencyHighlight,
    gridTheme,
    history,
    onClipboardCopy,
    onClipboardPaste,
    onHistoryChanged,
    onBeforeEdit,
    onReadonlyEdit,
    onRowHeaderFocus,
    onSelectionChange,
    plugins,
    rowOrder,
    rowHeaderConfig,
    workbook,
  ]);

  return (
    <section
      ref={shellRef}
      className={`spreadsheet-workbench ${isDark ? 'is-dark' : ''}`}
      data-testid="spreadsheet-workbench"
      data-plugin-stack={pluginStack}
      onDrop={onDrop}
      onDragOver={(event) => event.preventDefault()}
    >
      <div className="spreadsheet-ribbon">
        <span className="spreadsheet-ribbon-group">
          <label className="spreadsheet-file-label">
            <ActionIcon icon={SPREADSHEET_ACTION_ICONS.import} />
            Import XLSX
            <input
              ref={fileInputRef}
              className="spreadsheet-file-input"
              data-testid="spreadsheet-xlsx-input"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={onXlsxChange}
            />
          </label>
          <button className="spreadsheet-btn" type="button" data-testid="spreadsheet-export" onClick={exportWorkbook}>
            <ActionIcon icon={SPREADSHEET_ACTION_ICONS.export} />
            Export XLSX
          </button>
        </span>
        <span className="spreadsheet-ribbon-group">
          <button className="spreadsheet-btn" type="button" disabled={!historyState.canUndo} onClick={() => void runHistory('undo')}>
            <ActionIcon icon={SPREADSHEET_ACTION_ICONS.undo} />
            Undo {historyState.undoStackSize}
          </button>
          <button className="spreadsheet-btn" type="button" disabled={!historyState.canRedo} onClick={() => void runHistory('redo')}>
            <ActionIcon icon={SPREADSHEET_ACTION_ICONS.redo} />
            Redo {historyState.redoStackSize}
          </button>
        </span>
      </div>

      <div className="spreadsheet-sheet-tabs" data-testid="spreadsheet-sheet-tabs">
        <button className="spreadsheet-sheet-tab is-active" type="button" data-testid="spreadsheet-sheet-budget">
          Budget
        </button>
        <span className="spreadsheet-tab-spacer" aria-hidden="true" />
        <span className="spreadsheet-collab" aria-label="Live collaborators">
          <span className="spreadsheet-live-dot" title="Live data" />
          {presenceUsers.map(user => (
            <span
              key={user.id}
              className="spreadsheet-avatar spreadsheet-avatar-presence"
              style={{ '--spreadsheet-avatar-color': user.color } as React.CSSProperties}
              title={`${user.name} - ${user.activity ?? 'viewing'}`}
            >
              {user.initials}
            </span>
          ))}
        </span>
      </div>

      <div className="spreadsheet-formula-row">
        <span ref={formulaBadgeRef} className="spreadsheet-cell-badge">A1</span>
        <span className="spreadsheet-formula-editor">
          <span
            ref={formulaHighlightRef}
            className="spreadsheet-formula-highlight"
            data-testid="spreadsheet-formula-highlight"
          />
          <input
            ref={formulaInputRef}
            className="spreadsheet-formula-input"
            data-testid="spreadsheet-formula-input"
            aria-label="Formula bar"
            placeholder="Select a cell to inspect or edit its raw value"
          />
        </span>
      </div>

      <div className="spreadsheet-main">
        <div className="spreadsheet-grid-wrap">
          {gridElement}
        </div>
      </div>

      <div className="spreadsheet-status-row">
        <span className="spreadsheet-status-pill" data-testid="spreadsheet-workbook-status">{formatWorkbookStatus(workbook)}</span>
        <span>{selectionStatus}</span>
        <span>{clipboardStatus}</span>
        <span>Drag the fill handle for inferred sequences.</span>
      </div>
    </section>
  );
}
