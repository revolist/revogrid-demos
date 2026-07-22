import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NO_ERRORS_SCHEMA,
  OnDestroy,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RevoGrid } from '@revolist/angular-datagrid';
import {
  AdvanceFilterPlugin,
  AutoFillPlugin,
  AutoFillPreviewPlugin,
  CellFlashPlugin,
  CellMergePlugin,
  CellValidatePlugin,
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
  isSpreadsheetDarkTheme,
  preventReadonlySpreadsheetEdit,
  summarizeClipboardMatrix,
  summarizeSpreadsheetRowHeaderFocus,
  summarizeSelection,
  type SpreadsheetContextMenuController,
  type SpreadsheetFlashPlugin,
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

type SpreadsheetGridElement = HTMLRevoGridElement & {
  formulaBar?: { el?: HTMLInputElement; badgeEl?: HTMLSpanElement; showCellBadge: boolean } | null;
};

@Component({
  selector: 'spreadsheet-workbench-grid',
  standalone: true,
  imports: [CommonModule, RevoGrid],
  template: `
    <section
      #workbenchShell
      class="spreadsheet-workbench"
      [class.is-dark]="isDark"
      data-testid="spreadsheet-workbench"
      [attr.data-plugin-stack]="pluginStack"
    >
      <div class="spreadsheet-ribbon">
        <span class="spreadsheet-ribbon-group">
          <button class="spreadsheet-btn" type="button" data-testid="spreadsheet-export" (click)="exportWorkbook()">
            <span class="spreadsheet-action-icon" aria-hidden="true" [innerHTML]="actionIcons.export"></span>
            Export XLSX
          </button>
        </span>
        <span class="spreadsheet-ribbon-group">
          <button class="spreadsheet-btn" type="button" [disabled]="!historyState.canUndo" (click)="runHistory('undo')">
            <span class="spreadsheet-action-icon" aria-hidden="true" [innerHTML]="actionIcons.undo"></span>
            Undo {{ historyState.undoStackSize }}
          </button>
          <button class="spreadsheet-btn" type="button" [disabled]="!historyState.canRedo" (click)="runHistory('redo')">
            <span class="spreadsheet-action-icon" aria-hidden="true" [innerHTML]="actionIcons.redo"></span>
            Redo {{ historyState.redoStackSize }}
          </button>
        </span>
      </div>

      <div class="spreadsheet-sheet-tabs" data-testid="spreadsheet-sheet-tabs">
        <button class="spreadsheet-sheet-tab is-active" type="button" data-testid="spreadsheet-sheet-budget">
          Budget
        </button>
        <span class="spreadsheet-tab-spacer" aria-hidden="true"></span>
        <span class="spreadsheet-collab" aria-label="Live collaborators">
          <span class="spreadsheet-live-dot" title="Live data"></span>
          <span
            *ngFor="let user of presenceUsers"
            class="spreadsheet-avatar spreadsheet-avatar-presence"
            [style.--spreadsheet-avatar-color]="user.color"
            [title]="user.name + ' - ' + (user.activity || 'viewing')"
          >
            {{ user.initials }}
          </span>
        </span>
      </div>

      <div class="spreadsheet-formula-row">
        <span #formulaBadge class="spreadsheet-cell-badge">A1</span>
        <span class="spreadsheet-formula-editor">
          <span
            #formulaHighlight
            class="spreadsheet-formula-highlight"
            data-testid="spreadsheet-formula-highlight"
          ></span>
          <input
            #formulaInput
            class="spreadsheet-formula-input"
            data-testid="spreadsheet-formula-input"
            aria-label="Formula bar"
            placeholder="Select a cell to inspect or edit its raw value"
          />
        </span>
      </div>

      <div class="spreadsheet-main">
        <div class="spreadsheet-grid-wrap">
          <revo-grid
            #grid
            class="spreadsheet-grid cell-border"
            [theme]="gridTheme"
            [plugins]="plugins"
            [columns]="displayColumns"
            [pinnedBottomSource]="workbook.pinnedBottomSource"
            [columnTypes]="columnTypes"
            [filter]="filterConfig"
            [cellMerge]="workbook.cellMerge"
            [eventManager]="eventManager"
            [history]="history"
            [cellFlash]="cellFlash"
            [collaborativePresence]="collaborativePresence"
            [formulaNames]="workbook.formulaNames"
            [formulaBar]="formulaBar"
            [formulaDependencyHighlight]="formulaDependencyHighlight"
            [exportExcel]="exportExcel"
            [rowOrder]="rowOrder"
            [additionalData]="additionalData"
            [rowContextMenu]="rowContextMenu"
            [columnContextMenu]="columnContextMenu"
            [source]="workbook.rows"
            stretch="all"
            [range]="true"
            [rowHeaders]="rowHeaders"
            [resize]="true"
            [hideAttribution]="true"
            (historychanged)="onHistoryChanged($event)"
            (multirangeselectionchange)="onSelectionChange($event)"
            (beforecopyapply)="onClipboardCopy($event)"
            (beforepasteapply)="onClipboardPaste($event)"
            (rowfocus)="onRowHeaderFocus($event)"
            (beforeeditstart)="onReadonlyEdit($event)"
            (beforeedit)="onBeforeEdit($event)"
          ></revo-grid>
        </div>
      </div>

      <div class="spreadsheet-status-row">
        <span class="spreadsheet-status-pill" data-testid="spreadsheet-workbook-status">{{ workbookStatus }}</span>
        <span>{{ selectionStatus }}</span>
        <span>{{ clipboardStatus }}</span>
        <span>Drag the fill handle for inferred sequences.</span>
      </div>
    </section>
  `,
  styleUrls: ['./spreadsheet.scss'],
  encapsulation: ViewEncapsulation.None,
  schemas: [NO_ERRORS_SCHEMA],
})
export class SpreadsheetWorkbenchGridComponent implements AfterViewInit, OnDestroy {
  readonly actionIcons = SPREADSHEET_ACTION_ICONS;
  @Input() theme: 'dark' | 'light' | string = isSpreadsheetDarkTheme() ? 'dark' : 'light';

  @ViewChild('grid', { read: ElementRef }) gridElement!: ElementRef<SpreadsheetGridElement>;
  @ViewChild('workbenchShell', { read: ElementRef }) shellElement!: ElementRef<HTMLElement>;
  @ViewChild('formulaInput', { read: ElementRef }) formulaInputElement!: ElementRef<HTMLInputElement>;
  @ViewChild('formulaBadge', { read: ElementRef }) formulaBadgeElement!: ElementRef<HTMLSpanElement>;
  @ViewChild('formulaHighlight', { read: ElementRef }) formulaHighlightElement!: ElementRef<HTMLSpanElement>;
  workbook: SpreadsheetWorkbook = createSpreadsheetWorkbook();
  private _simulationWorkbook: SpreadsheetWorkbook = this.workbook;
  presenceStep = 0;
  feedFlashActive = true;
  presenceUsers = createSpreadsheetPresenceUsers(0);
  collaborativePresence = createSpreadsheetCollaborativePresence(this.presenceUsers);
  displayColumns = createSpreadsheetDisplayColumns(this.workbook);
  selectionStatus = 'No ranges selected';
  clipboardStatus = 'Copy ranges or paste structured data.';
  historyState: HistoryState = {
    undoStackSize: 0,
    redoStackSize: 0,
    canUndo: false,
    canRedo: false,
    disabled: false,
  };

  columnTypes = { statusDropdown: ColumnDropdown, departmentDropdown: ColumnDropdown };
  filterConfig = {};
  eventManager = createSpreadsheetEventManagerConfig();
  history = createSpreadsheetHistoryConfig();
  cellFlash = createSpreadsheetCellFlashConfig();
  formulaDependencyHighlight = createSpreadsheetFormulaDependencyHighlightConfig();
  exportExcel = createSpreadsheetExportExcelConfig();
  rowHeaders = createSpreadsheetRowHeaders();
  rowOrder = SPREADSHEET_ROW_ORDER_CONFIG;
  private workbookController: SpreadsheetContextMenuController = {
    getGrid: () => this.gridElement?.nativeElement,
    getWorkbook: () => this.workbook,
    setWorkbook: (workbook) => {
      this.workbook = workbook;
      this._simulationWorkbook = workbook;
      this.syncWorkbookUi();
    },
    setClipboardStatus: (message) => {
      this.clipboardStatus = message;
    },
    exportWorkbook: () => this.exportWorkbook(),
  };
  private contextMenus = createSpreadsheetContextMenus(this.workbookController);
  rowContextMenu = this.contextMenus.rowContextMenu;
  columnContextMenu = this.contextMenus.columnContextMenu;
  formulaBar: { el?: HTMLInputElement; badgeEl?: HTMLSpanElement; showCellBadge: boolean } = {
    showCellBadge: true,
  };
  plugins = this.buildPlugins();
  private disconnectContextSelectionGuard?: () => void;
  private disconnectReadonlyEditGuard?: () => void;
  private disconnectFormulaHighlight?: () => void;
  private presenceTimer?: number;
  private feedTimer?: number;
  private feedStep = 0;

  get additionalData() {
    return { formulaNames: this.workbook.formulaNames };
  }

  get workbookStatus() {
    return formatWorkbookStatus(this.workbook);
  }

  get pluginStack() {
    return getSpreadsheetPluginLabels().join(',');
  }

  get isDark() {
    return this.theme === 'dark' || (this.theme !== 'light' && isSpreadsheetDarkTheme());
  }

  get gridTheme() {
    return getSpreadsheetGridTheme(this.isDark);
  }

  ngAfterViewInit() {
    this.formulaBar = {
      el: this.formulaInputElement.nativeElement,
      badgeEl: this.formulaBadgeElement.nativeElement,
      showCellBadge: true,
    };
    const grid = this.gridElement.nativeElement;
    grid.formulaBar = this.formulaBar;
    void installSpreadsheetAutofillStrategy(grid);
    this.disconnectContextSelectionGuard = installSpreadsheetContextSelectionGuard(
      this.shellElement.nativeElement,
      () => this.gridElement?.nativeElement,
    );
    this.disconnectReadonlyEditGuard = installSpreadsheetReadonlyEditGuard(
      grid,
      () => this.workbook.columns,
      (message) => {
        this.clipboardStatus = message;
      },
    );
    this.disconnectFormulaHighlight = installSpreadsheetFormulaEditorHighlight(
      this.formulaInputElement.nativeElement,
      this.formulaHighlightElement.nativeElement,
      grid,
    );
    this.presenceTimer = window.setInterval(() => {
      void this.runPresenceSimulation();
    }, 1800);
    this.feedStep = 0;
    void this.runFeedFlashStep();
    this.feedTimer = window.setInterval(() => {
      void this.runFeedFlashStep();
    }, 1400);
  }

  ngOnDestroy() {
    this.disconnectContextSelectionGuard?.();
    this.disconnectReadonlyEditGuard?.();
    this.disconnectFormulaHighlight?.();
    if (this.presenceTimer) {
      window.clearInterval(this.presenceTimer);
    }
    this.stopFeedFlash();
    const grid = this.gridElement?.nativeElement;
    if (grid) {
      grid.formulaBar = null;
    }
  }

  async runHistory(action: 'undo' | 'redo') {
    const plugin = await this.getPlugin(HistoryPlugin);
    plugin?.[action]();
  }

  private getRowsForSimulation(grid: HTMLRevoGridElement | null, fallbackRows: unknown[] = []) {
    if (typeof getSpreadsheetGridRowsForSimulation === 'function') {
      return getSpreadsheetGridRowsForSimulation(grid, fallbackRows);
    }
    const rows = grid?.source;
    return Array.isArray(rows) ? [...rows] : [...fallbackRows];
  }

  async exportWorkbook() {
    const plugin = await this.getPlugin(ExportExcelPlugin);
    await plugin?.export(SPREADSHEET_EXPORT_CONFIG);
  }

  toggleFeedFlash() {
    if (this.feedTimer) {
      this.stopFeedFlash('Feed flash stopped.');
      return;
    }
    this.feedStep = 0;
    this.feedFlashActive = true;
    this.clipboardStatus = 'Feed flash started.';
    void this.runFeedFlashStep();
    this.feedTimer = window.setInterval(() => {
      void this.runFeedFlashStep();
    }, 1400);
  }

  async runPresenceSimulation() {
    this.presenceStep += 1;
    const grid = this.gridElement?.nativeElement;
    const sourceWorkbook = createSpreadsheetWorkbookFromGridSource(
      this._simulationWorkbook,
      this.getRowsForSimulation(grid, this._simulationWorkbook.rows),
    );
    const result = applySpreadsheetPresenceSimulationStep(sourceWorkbook, this.presenceStep);
    this.presenceUsers = result.users;
    this.collaborativePresence = createSpreadsheetCollaborativePresence(this.presenceUsers);
    this.clipboardStatus = result.message;
    if (!hasSpreadsheetSimulationDataChange(result)) {
      return;
    }
    if (shouldDeferSpreadsheetSimulationDataUpdate(grid, this.shellElement?.nativeElement)) {
      this.clipboardStatus = `${result.message} Local edit in progress; remote write paused.`;
      return;
    }
    this._simulationWorkbook = await syncSpreadsheetSimulationResultToGrid(grid, sourceWorkbook, result.workbook, { rowType: 'rgRow' });
    const plugin = await this.getPlugin(CellFlashPlugin);
    flashSpreadsheetPresenceEdit(plugin as SpreadsheetFlashPlugin | undefined, result);
  }

  onHistoryChanged(event: Event) {
    this.historyState = (event as CustomEvent<HistoryState>).detail;
  }

  onSelectionChange(event: Event) {
    const detail = (event as CustomEvent<{ ranges?: Array<{ x: number; y: number; x1: number; y1: number }> }>).detail;
    this.selectionStatus = summarizeSelection(detail?.ranges ?? []);
  }

  onRowHeaderFocus(event: Event) {
    const summary = summarizeSpreadsheetRowHeaderFocus(event, this.displayColumns);
    if (summary) {
      this.selectionStatus = summary;
    }
  }

  onClipboardCopy(event: Event) {
    const detail = (event as CustomEvent<{ data?: unknown[][] }>).detail;
    this.clipboardStatus = `Copied ${summarizeClipboardMatrix(detail?.data)}.`;
  }

  onClipboardPaste(event: Event) {
    const detail = (event as CustomEvent<{ parsed?: unknown[][] }>).detail;
    this.clipboardStatus = `Pasted ${summarizeClipboardMatrix(detail?.parsed)}.`;
  }

  onBeforeEdit(event: Event) {
    if (insertSpreadsheetRowFromPinnedDropdown(event, this.workbookController)) {
      return;
    }
    this.onReadonlyEdit(event);
  }

  onReadonlyEdit(event: Event) {
    preventReadonlySpreadsheetEdit(event, this.workbook.columns, (message) => {
      this.clipboardStatus = message;
    });
  }

  private stopFeedFlash(message?: string) {
    if (this.feedTimer) {
      window.clearInterval(this.feedTimer);
      this.feedTimer = undefined;
    }
    this.feedFlashActive = false;
    if (message) {
      this.clipboardStatus = message;
    }
  }

  private async runFeedFlashStep() {
    this.feedStep += 1;
    const grid = this.gridElement?.nativeElement;
    const sourceWorkbook = createSpreadsheetWorkbookFromGridSource(
      this._simulationWorkbook,
      this.getRowsForSimulation(grid, this._simulationWorkbook.rows),
    );
    const result = applySpreadsheetFeedFlashStep(sourceWorkbook, this.feedStep);
    if (shouldDeferSpreadsheetSimulationDataUpdate(grid, this.shellElement?.nativeElement)) {
      this.clipboardStatus = `${result.message} Local edit in progress; feed write paused.`;
      return;
    }
    this._simulationWorkbook = await syncSpreadsheetSimulationResultToGrid(grid, sourceWorkbook, result.workbook, { rowType: 'rgRow' });
    this.clipboardStatus = result.message;
    const plugin = await this.getPlugin(CellFlashPlugin);
    flashSpreadsheetFeedEdit(plugin as SpreadsheetFlashPlugin | undefined, result);
  }

  private syncWorkbookUi() {
    this.displayColumns = createSpreadsheetDisplayColumns(this.workbook);
  }

  private async getPlugin<T>(pluginClass: new (...args: any[]) => T): Promise<T | undefined> {
    const plugins = await this.gridElement?.nativeElement?.getPlugins?.();
    return plugins?.find(plugin => plugin instanceof pluginClass) as T | undefined;
  }

  private buildPlugins() {
    return [
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
  }
}
