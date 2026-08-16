<template>
  <section
    class="spreadsheet-workbench"
    :class="{ 'is-dark': isDark }"
    data-testid="spreadsheet-workbench"
    :data-plugin-stack="pluginStack"
    ref="shellRef"
  >
    <div class="spreadsheet-ribbon">
      <span class="spreadsheet-ribbon-group">
        <button class="spreadsheet-btn" type="button" data-testid="spreadsheet-export" @click="exportWorkbook">
          <span class="spreadsheet-action-icon" aria-hidden="true" v-html="actionIcons.export"></span>
          Export XLSX
        </button>
      </span>
      <span class="spreadsheet-ribbon-group">
        <button class="spreadsheet-btn" type="button" :disabled="!historyState.canUndo" @click="runHistory('undo')">
          <span class="spreadsheet-action-icon" aria-hidden="true" v-html="actionIcons.undo"></span>
          Undo {{ historyState.undoStackSize }}
        </button>
        <button class="spreadsheet-btn" type="button" :disabled="!historyState.canRedo" @click="runHistory('redo')">
          <span class="spreadsheet-action-icon" aria-hidden="true" v-html="actionIcons.redo"></span>
          Redo {{ historyState.redoStackSize }}
        </button>
      </span>
    </div>

    <div class="spreadsheet-sheet-tabs" data-testid="spreadsheet-sheet-tabs">
      <button
        class="spreadsheet-sheet-tab is-active"
        type="button"
        data-testid="spreadsheet-sheet-budget"
      >
        Budget
      </button>
      <span class="spreadsheet-tab-spacer" aria-hidden="true"></span>
      <span class="spreadsheet-collab" aria-label="Live collaborators">
        <span class="spreadsheet-live-dot" title="Live data"></span>
        <span
          v-for="user in presenceUsers"
          :key="user.id"
          class="spreadsheet-avatar spreadsheet-avatar-presence"
          :style="{ '--spreadsheet-avatar-color': user.color }"
          :title="`${user.name} - ${user.activity ?? 'viewing'}`"
        >
          {{ user.initials }}
        </span>
      </span>
    </div>

    <div class="spreadsheet-formula-row">
      <span ref="formulaBadgeRef" class="spreadsheet-cell-badge">A1</span>
      <span ref="formulaHostRef" class="spreadsheet-formula-editor" data-testid="spreadsheet-formula-host"></span>
    </div>

    <div class="spreadsheet-main">
      <div class="spreadsheet-grid-wrap">
        <VGrid
          ref="gridRef"
          class="spreadsheet-grid cell-border"
          :theme="gridTheme"
          :plugins="plugins"
          :columns="displayColumns"
          :pinned-bottom-source="workbook.pinnedBottomSource"
          :column-types="columnTypes"
          :filter="filterConfig"
          :event-manager.prop="eventManager"
          :history.prop="history"
          :cell-flash.prop="cellFlash"
          :collaborative-presence.prop="collaborativePresence"
          :formula-names.prop="workbook.formulaNames"
          :formula-bar.prop="formulaBar"
          :formula-dependency-highlight.prop="formulaDependencyHighlight"
          :data-grid-context-menu.prop="dataGridContextMenu"
          :data-grid-formatting.prop="dataGridFormatting"
          :export-excel.prop="exportExcel"
          :row-order.prop="rowOrder"
          :row-select.prop="rowSelect"
          :source="workbook.rows"
          stretch="all"
          range
          :use-clipboard.prop="SPREADSHEET_CLIPBOARD_CONFIG"
          :row-headers="rowHeaderConfig"
          resize
          hide-attribution
          @historychanged="onHistoryChanged"
          @multirangeselectionchange="onSelectionChange"
          @beforecopyapply="onClipboardCopy"
          @beforepasteapply="onClipboardPaste"
          @rowfocus="onRowHeaderFocus"
          @beforeeditstart="onReadonlyEdit"
          @beforeedit="onBeforeEdit"
        />
      </div>
    </div>

    <div class="spreadsheet-status-row">
      <span class="spreadsheet-status-pill" data-testid="spreadsheet-workbook-status">{{ workbookStatus }}</span>
      <span>{{ selectionStatus }}</span>
      <span>{{ clipboardStatus }}</span>
      <span>Drag the fill handle for inferred sequences.</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { VGrid } from '@revolist/vue3-datagrid';
import {
  AdvanceFilterPlugin,
  AutoFillPlugin,
  AutoFillPreviewPlugin,
  CellFlashPlugin,
  CellValidatePlugin,
  CollaborativePresencePlugin,
  ColumnCollapsePlugin,
  ColumnDropdown,
  ColumnMoveAdvancedPlugin,
  ColumnStretchPlugin,
  DataGridFormattingPlugin,
  EventManagerPlugin,
  ExportExcelPlugin,
  FilterHeaderPlugin,
  FormulaBarPlugin,
  FormulaDependencyHighlightPlugin,
  FormulaPlugin,
  HistoryPlugin,
  NamedRangesPlugin,
  RowOrderPlugin,
  SelectionPlugin,
  type HistoryState,
} from '@revolist/revogrid-pro';
import './spreadsheet.scss';
import {
  SPREADSHEET_ACTION_ICONS,
  SPREADSHEET_CLIPBOARD_CONFIG,
  SPREADSHEET_DATA_GRID_CONTEXT_MENU,
  SPREADSHEET_DATA_GRID_FORMATTING,
  SPREADSHEET_EXPORT_CONFIG,
  SPREADSHEET_FILTER_CONFIG,
  SPREADSHEET_ROW_ORDER_CONFIG,
  SPREADSHEET_ROW_SELECT_CONFIG,
  createSpreadsheetCellFlashConfig,
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
  installSpreadsheetReadonlyEditGuard,
  installSpreadsheetAutofillStrategy,
  observeSpreadsheetTheme,
  preventReadonlySpreadsheetEdit,
  createSpreadsheetWorkbookFromGridSource,
  summarizeClipboardMatrix,
  summarizeSpreadsheetRowHeaderFocus,
  summarizeSelection,
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

const actionIcons = SPREADSHEET_ACTION_ICONS;

const props = defineProps<{ isDark?: boolean }>();

const workbook = shallowRef<SpreadsheetWorkbook>(createSpreadsheetWorkbook());
let simulationWorkbook: SpreadsheetWorkbook = workbook.value;
const detectedIsDark = ref(false);
const presenceStep = ref(0);
const feedFlashActive = ref(true);
const presenceUsers = ref(createSpreadsheetPresenceUsers(0));
const gridRef = ref<{ $el?: HTMLRevoGridElement } | HTMLRevoGridElement | null>(null);
const shellRef = ref<HTMLElement | null>(null);
const formulaHostRef = ref<HTMLElement | null>(null);
const formulaBadgeRef = ref<HTMLSpanElement | null>(null);
const selectionStatus = ref('No ranges selected');
const clipboardStatus = ref('Copy ranges or paste structured data.');
const historyState = ref<HistoryState>({
  undoStackSize: 0,
  redoStackSize: 0,
  canUndo: false,
  canRedo: false,
  disabled: false,
});

const columnTypes = { statusDropdown: ColumnDropdown, departmentDropdown: ColumnDropdown };
const filterConfig = SPREADSHEET_FILTER_CONFIG;
const eventManager = createSpreadsheetEventManagerConfig();
const history = createSpreadsheetHistoryConfig();
const cellFlash = createSpreadsheetCellFlashConfig();
const formulaDependencyHighlight = createSpreadsheetFormulaDependencyHighlightConfig();
const dataGridContextMenu = SPREADSHEET_DATA_GRID_CONTEXT_MENU;
const dataGridFormatting = SPREADSHEET_DATA_GRID_FORMATTING;
const exportExcel = createSpreadsheetExportExcelConfig();
const isDark = computed(() => props.isDark ?? detectedIsDark.value);
const gridTheme = computed(() => getSpreadsheetGridTheme(isDark.value));
const displayColumns = computed(() => createSpreadsheetDisplayColumns(workbook.value));
const formulaBar = computed(() => ({
  host: formulaHostRef.value ?? undefined,
  badgeEl: formulaBadgeRef.value ?? undefined,
  showCellBadge: true,
}));
const collaborativePresence = computed(() => createSpreadsheetCollaborativePresence(presenceUsers.value));
const workbookStatus = computed(() => formatWorkbookStatus(workbook.value));
const pluginStack = computed(() => getSpreadsheetPluginLabels().join(','));
const rowHeaderConfig = createSpreadsheetRowHeaders();
const rowOrder = SPREADSHEET_ROW_ORDER_CONFIG;
const rowSelect = SPREADSHEET_ROW_SELECT_CONFIG;
const plugins = [
  EventManagerPlugin,
  HistoryPlugin,
  CellFlashPlugin,
  CollaborativePresencePlugin,
  FormulaBarPlugin,
  FormulaDependencyHighlightPlugin,
  NamedRangesPlugin,
  FormulaPlugin,
  DataGridFormattingPlugin,
  AutoFillPlugin,
  AutoFillPreviewPlugin,
  SelectionPlugin,
  RowOrderPlugin,
  ColumnMoveAdvancedPlugin,
  ColumnCollapsePlugin,
  ExportExcelPlugin,
  AdvanceFilterPlugin,
  FilterHeaderPlugin,
  CellValidatePlugin,
  ColumnStretchPlugin,
];

let disconnectReadonlyEditGuard: (() => void) | undefined;
let disconnectThemeObserver: (() => void) | undefined;
let presenceTimer: ReturnType<typeof window.setInterval> | undefined;
let feedTimer: ReturnType<typeof window.setInterval> | undefined;
let feedStep = 0;

onMounted(() => {
  disconnectThemeObserver = observeSpreadsheetTheme((nextIsDark) => {
    detectedIsDark.value = nextIsDark;
  });
  const grid = getGrid();
  if (grid) {
    void installSpreadsheetAutofillStrategy(grid);
    disconnectReadonlyEditGuard = installSpreadsheetReadonlyEditGuard(
      grid,
      () => workbook.value.columns,
      (message) => {
        clipboardStatus.value = message;
      },
    );
  }
  presenceTimer = window.setInterval(() => {
    void runPresenceSimulation();
  }, 1800);
  feedStep = 0;
  void runFeedFlashStep();
  feedTimer = window.setInterval(() => {
    void runFeedFlashStep();
  }, 1400);
});

onBeforeUnmount(() => {
  disconnectThemeObserver?.();
  disconnectReadonlyEditGuard?.();
  if (presenceTimer) {
    window.clearInterval(presenceTimer);
  }
  stopFeedFlash();
});

function getGrid(): HTMLRevoGridElement | null {
  const value = gridRef.value;
  if (!value) {
    return null;
  }
  return ('$el' in value ? value.$el : value) as HTMLRevoGridElement | null;
}

async function getPlugin<T>(pluginClass: new (...args: any[]) => T): Promise<T | undefined> {
  const grid = getGrid();
  const plugins = await grid?.getPlugins?.();
  return plugins?.find(plugin => plugin instanceof pluginClass) as T | undefined;
}

async function runHistory(action: 'undo' | 'redo') {
  const plugin = await getPlugin(HistoryPlugin);
  plugin?.[action]();
}

function getRowsForSimulation(grid: HTMLRevoGridElement | null, fallbackRows: unknown[] = []) {
  if (typeof getSpreadsheetGridRowsForSimulation === 'function') {
    return getSpreadsheetGridRowsForSimulation(grid, fallbackRows);
  }
  const rows = grid?.source;
  return Array.isArray(rows) ? [...rows] : [...fallbackRows];
}

async function exportWorkbook() {
  const plugin = await getPlugin(ExportExcelPlugin);
  await plugin?.export(SPREADSHEET_EXPORT_CONFIG);
}

function stopFeedFlash(message?: string) {
  if (feedTimer) {
    window.clearInterval(feedTimer);
    feedTimer = undefined;
  }
  feedFlashActive.value = false;
  if (message) {
    clipboardStatus.value = message;
  }
}

async function runFeedFlashStep() {
  const grid = getGrid();
  if (shouldDeferSpreadsheetSimulationDataUpdate(grid, shellRef.value)) {
    clipboardStatus.value = 'Local row interaction in progress; feed simulation paused.';
    return;
  }
  feedStep += 1;
  const sourceWorkbook = createSpreadsheetWorkbookFromGridSource(
    simulationWorkbook,
    getRowsForSimulation(grid, simulationWorkbook.rows),
  );
  const result = applySpreadsheetFeedFlashStep(sourceWorkbook, feedStep);
  if (shouldDeferSpreadsheetSimulationDataUpdate(grid, shellRef.value)) {
    clipboardStatus.value = `${result.message} Local edit in progress; feed write paused.`;
    return;
  }
  simulationWorkbook = await syncSpreadsheetSimulationResultToGrid(grid, sourceWorkbook, result.workbook, { rowType: 'rgRow' });
  clipboardStatus.value = result.message;
  const plugin = await getPlugin(CellFlashPlugin);
  flashSpreadsheetFeedEdit(plugin as SpreadsheetFlashPlugin | undefined, result);
}

function toggleFeedFlash() {
  if (feedTimer) {
    stopFeedFlash('Feed flash stopped.');
    return;
  }
  feedStep = 0;
  feedFlashActive.value = true;
  clipboardStatus.value = 'Feed flash started.';
  void runFeedFlashStep();
  feedTimer = window.setInterval(() => {
    void runFeedFlashStep();
  }, 1400);
}

async function runPresenceSimulation() {
  const grid = getGrid();
  if (shouldDeferSpreadsheetSimulationDataUpdate(grid, shellRef.value)) {
    clipboardStatus.value = 'Local row interaction in progress; collaborator simulation paused.';
    return;
  }
  presenceStep.value += 1;
  const sourceWorkbook = createSpreadsheetWorkbookFromGridSource(
    simulationWorkbook,
    getRowsForSimulation(grid, simulationWorkbook.rows),
  );
  const result = applySpreadsheetPresenceSimulationStep(sourceWorkbook, presenceStep.value);
  presenceUsers.value = result.users;
  clipboardStatus.value = result.message;
  if (!hasSpreadsheetSimulationDataChange(result)) {
    return;
  }
  if (shouldDeferSpreadsheetSimulationDataUpdate(grid, shellRef.value)) {
    clipboardStatus.value = `${result.message} Local edit in progress; remote write paused.`;
    return;
  }
  simulationWorkbook = await syncSpreadsheetSimulationResultToGrid(grid, sourceWorkbook, result.workbook, { rowType: 'rgRow' });
  const plugin = await getPlugin(CellFlashPlugin);
  flashSpreadsheetPresenceEdit(plugin as SpreadsheetFlashPlugin | undefined, result);
}

function onHistoryChanged(event: CustomEvent<HistoryState>) {
  historyState.value = event.detail;
}

function onSelectionChange(event: CustomEvent<{ ranges?: Array<{ x: number; y: number; x1: number; y1: number }> }>) {
  selectionStatus.value = summarizeSelection(event.detail?.ranges ?? []);
}

function onRowHeaderFocus(event: Event) {
  const summary = summarizeSpreadsheetRowHeaderFocus(event, displayColumns.value);
  if (summary) {
    selectionStatus.value = summary;
  }
}

function onClipboardCopy(event: CustomEvent<{ data?: unknown[][] }>) {
  clipboardStatus.value = `Copied ${summarizeClipboardMatrix(event.detail?.data)}.`;
}

function onClipboardPaste(event: CustomEvent<{ parsed?: unknown[][] }>) {
  clipboardStatus.value = `Pasted ${summarizeClipboardMatrix(event.detail?.parsed)}.`;
}

function onBeforeEdit(event: Event) {
  onReadonlyEdit(event);
}

function onReadonlyEdit(event: Event) {
  preventReadonlySpreadsheetEdit(event, workbook.value.columns, (message) => {
    clipboardStatus.value = message;
  });
}
</script>
