<template>
  <div class="hr-demo">
    <div class="hr-toolbar">
      <span class="text-sm font-medium">Data Source</span>
      <select
        class="hr-select"
        v-model="currentSize"
        @change="onSizeChange"
        :disabled="loading"
      >
        <option v-for="opt in options" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <span class="text-sm font-medium">Theme</span>
      <select class="hr-select" v-model="selectedTheme" @change="workspaceStatus = 'Unsaved changes'">
        <option v-for="opt in themeOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <button type="button" class="hr-button" @click="saveView">Save view</button>
      <button type="button" class="hr-button hr-button-secondary" @click="resetView">Reset view</button>
      <span class="hr-workspace-status">{{ workspaceStatus }}</span>
      <div v-if="loading" class="text-sm opacity-50 animate-pulse ml-2">{{ loadingLabel }}</div>
    </div>

    <div class="hr-grid-wrapper">
      <VGrid
        ref="gridRef"
        class="hr-scale-grid grow h-full w-full"
        style="height: 100%; width: 100%"
        :theme="gridTheme"
        :theme-definitions="themeDefinitions"
        :source="rows"
        :columns="columns"
        :column-types="columnTypes"
        :filter="workspaceState.filter ?? true"
        :sorting="workspaceState.sorting"
        :plugins="plugins"
        range
        resize
        row-headers
        hide-attribution
        can-move-columns
        :row-size="36"
      />
      <div v-if="loading" class="hr-loading-overlay" aria-live="polite">
        <div class="hr-loading-counter" :aria-label="`${progressPercent} percent complete`">
          <div class="hr-loading-counter-line">
            <span
              v-for="(digit, index) in loadingDigits"
              :key="`${digit}-${index}-${progressPercent}`"
              class="hr-loading-counter-digit"
            >
              {{ digit }}
            </span>
            <span class="hr-loading-counter-symbol">%</span>
          </div>
        </div>
        <div class="hr-loading-label">{{ loadingLabel }}</div>
      </div>
    </div>

    <section class="hr-performance" aria-label="Browser performance metrics">
      <div class="hr-performance-heading">
        <strong>Performance</strong>
        <span>Measured live in this browser</span>
      </div>
      <div class="hr-performance-metric">
        <div class="hr-performance-label">
          <span>{{ metricDefinitions.preparation.label }}</span>
          <span class="hr-metric-help">
            <button type="button" class="hr-metric-help-trigger" :aria-label="`About ${metricDefinitions.preparation.label}`" :aria-describedby="getHRMetricTooltipId('preparation')">?</button>
            <span class="hr-metric-tooltip" :id="getHRMetricTooltipId('preparation')" role="tooltip">{{ metricDefinitions.preparation.description }}</span>
          </span>
        </div>
        <strong>{{ formatDuration(performanceState.preparationTime) }}</strong>
      </div>
      <div class="hr-performance-metric">
        <div class="hr-performance-label">
          <span>{{ metricDefinitions.grid.label }}</span>
          <span class="hr-metric-help">
            <button type="button" class="hr-metric-help-trigger" :aria-label="`About ${metricDefinitions.grid.label}`" :aria-describedby="getHRMetricTooltipId('grid')">?</button>
            <span class="hr-metric-tooltip" :id="getHRMetricTooltipId('grid')" role="tooltip">{{ metricDefinitions.grid.description }}</span>
          </span>
        </div>
        <strong>{{ formatDuration(performanceState.gridRenderTime) }}</strong>
      </div>
      <div class="hr-performance-metric">
        <div class="hr-performance-label">
          <span>{{ metricDefinitions.scroll.label }}</span>
          <span class="hr-metric-help">
            <button type="button" class="hr-metric-help-trigger" :aria-label="`About ${metricDefinitions.scroll.label}`" :aria-describedby="getHRMetricTooltipId('scroll')">?</button>
            <span class="hr-metric-tooltip" :id="getHRMetricTooltipId('scroll')" role="tooltip">{{ metricDefinitions.scroll.description }}</span>
          </span>
        </div>
        <strong>{{ formatFrameRate(performanceState.scrollFps) }}</strong>
      </div>
      <div class="hr-performance-metric">
        <div class="hr-performance-label">
          <span>{{ metricDefinitions.memory.label }}</span>
          <span class="hr-metric-help">
            <button type="button" class="hr-metric-help-trigger" :aria-label="`About ${metricDefinitions.memory.label}`" :aria-describedby="getHRMetricTooltipId('memory')">?</button>
            <span class="hr-metric-tooltip" :id="getHRMetricTooltipId('memory')" role="tooltip">{{ metricDefinitions.memory.description }}</span>
          </span>
        </div>
        <strong>{{ formatMemory(performanceState.memoryUsage?.usedJSHeapSize) }}</strong>
      </div>
      <div class="hr-performance-metric">
        <div class="hr-performance-label">
          <span>{{ metricDefinitions.dataset.label }}</span>
          <span class="hr-metric-help">
            <button type="button" class="hr-metric-help-trigger" :aria-label="`About ${metricDefinitions.dataset.label}`" :aria-describedby="getHRMetricTooltipId('dataset')">?</button>
            <span class="hr-metric-tooltip" :id="getHRMetricTooltipId('dataset')" role="tooltip">{{ metricDefinitions.dataset.description }}</span>
          </span>
        </div>
        <strong>{{ performanceState.rowCount.toLocaleString() }} × {{ performanceState.columnCount }}</strong>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onBeforeUnmount, nextTick } from 'vue';
import { VGrid, type ColumnGrouping, type ColumnRegular, BasePlugin, type PluginProviders } from '@revolist/vue3-datagrid';
import { getHRColumnsCount, getHRData, getHRVisibleColumnsCount, HR_COMPANY_OPTIONS, HR_OPTIONS } from './sys-data/hr.data';
import type { HRGenerationProgress } from './sys-data/hr.data.generator';
import { getBaseHRColumns, getExtraHRColumns, HR_COLOR_BY_AGE, withHRShortDate } from './sys-data/hr.columns';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import { renderHrColorPill } from './hr-color-select';
import { renderHrCompanyCell } from './hr-company-avatar';
import { getHRLoadingDigits, getHRProgressPercent } from './hr-loading';
import { getInitialHRTheme, HR_THEME_DEFINITIONS, HR_THEME_OPTIONS } from './hr-themes';
import {
  createHRPerformanceMonitor,
  createInitialHRPerformanceState,
  formatDuration,
  formatFrameRate,
  formatMemory,
  getHRMetricTooltipId,
  HR_PERFORMANCE_METRICS,
  type HRPerformanceMonitor,
} from './hr-performance';
import {
  applyHRWorkspaceToColumns,
  createHRWorkspaceController,
  getHRWorkspaceRowCount,
  HR_DEFAULT_ROW_COUNT,
  loadHRWorkspace,
  type HRWorkspaceController,
  type HRWorkspaceState,
} from './hr-workspace';
import './hr.css';

const props = defineProps<{
  isDark?: boolean;
}>();

const pageIsDark = ref(currentTheme().isDark());
const initialWorkspace = loadHRWorkspace();
const workspaceState = ref<HRWorkspaceState>(initialWorkspace);
const workspaceStatus = ref(Object.keys(initialWorkspace).length ? 'Saved locally' : 'View not saved');
const loading = ref(false);
const loadingLabel = ref('Preparing rows…');
const currentSize = ref(getHRWorkspaceRowCount(initialWorkspace, HR_OPTIONS.map(option => option.value)));
const options = HR_OPTIONS;
const themeOptions = HR_THEME_OPTIONS;
const themeDefinitions = HR_THEME_DEFINITIONS;
const rows = ref<any[]>([]);
const gridRef = ref<HTMLRevoGridElement | { $el: HTMLRevoGridElement } | null>(null);
const performanceState = ref(createInitialHRPerformanceState());
const metricDefinitions = HR_PERFORMANCE_METRICS;
const progress = ref<HRGenerationProgress>({ loaded: 0, total: currentSize.value });
const defaultTheme = () => getInitialHRTheme(props.isDark === true || pageIsDark.value);
const selectedTheme = ref(HR_THEME_OPTIONS.some(option => option.value === initialWorkspace.theme)
  ? initialWorkspace.theme!
  : defaultTheme());
const gridTheme = computed(() => selectedTheme.value);
const progressPercent = computed(() => getHRProgressPercent(progress.value));
const loadingDigits = computed(() => getHRLoadingDigits(progress.value));
let activeController: AbortController | undefined;
let disconnectTheme: (() => void) | undefined;
let performanceMonitor: HRPerformanceMonitor | undefined;
let workspaceController: HRWorkspaceController | undefined;

// column types
const columnTypes = ref<any>({});

// custom plugin for row drag text
const plugins = [
  class HRPlugin extends BasePlugin {
    constructor(r: HTMLRevoGridElement, p: PluginProviders) {
      super(r, p);
      this.addEventListener('rowdragstart', (e) => {
        if (e.detail.model) {
          e.detail.text = e.detail.model['name'];
        }
      });
    }
  },
];

const columns = computed(() => {
  const baseCols = getBaseHRColumns(HR_COMPANY_OPTIONS);

  // Apply Vue-specific templates
  const companyCol = (baseCols[0] as ColumnGrouping).children[1] as ColumnRegular;
  companyCol.cellTemplate = renderHrCompanyCell;

  const personalGroup = baseCols[1] as ColumnGrouping;
  const ageCol = personalGroup.children[0] as ColumnRegular;
  ageCol.cellTemplate = (h, props) => [
    h('i', {
      class: 'hr-circle',
      style: { borderColor: HR_COLOR_BY_AGE(props.value) }
    }),
    props.value
  ];

  const eyesCol = personalGroup.children[2] as ColumnRegular;
  eyesCol.cellTemplate = (h, props) =>
    renderHrColorPill(h, props.value);

  return applyHRWorkspaceToColumns(
    [...baseCols, ...getExtraHRColumns(getHRColumnsCount(currentSize.value))],
    workspaceState.value,
  );
});

async function loadData() {
  activeController?.abort();
  const controller = new AbortController();
  activeController = controller;
  loading.value = true;
  loadingLabel.value = `Preparing ${currentSize.value.toLocaleString()} rows…`;
  progress.value = { loaded: 0, total: currentSize.value };
  const preparationStartedAt = performance.now();
  try {
    const data = await getHRData(currentSize.value, {
      signal: controller.signal,
      onProgress: nextProgress => {
        progress.value = nextProgress;
      },
    });
    performanceMonitor?.setPreparationResult(
      performance.now() - preparationStartedAt,
      currentSize.value,
      getHRVisibleColumnsCount(currentSize.value),
    );
    loadingLabel.value = 'Rendering RevoGrid…';
    if (performanceMonitor) {
      await performanceMonitor.measureGridUpdate(() => {
        rows.value = data;
      });
    } else {
      rows.value = data;
    }
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      throw error;
    }
  } finally {
    if (activeController === controller) {
      loading.value = false;
      activeController = undefined;
    }
  }
}

function onSizeChange() {
  workspaceStatus.value = 'Unsaved changes';
  loadData();
}

async function saveView() {
  if (!workspaceController) return;
  workspaceState.value = await workspaceController.save({
    rowCount: currentSize.value,
    theme: selectedTheme.value,
  });
  workspaceStatus.value = 'Saved locally';
}

function resetView() {
  workspaceController?.clear();
  workspaceState.value = { filter: { collection: {} } };
  currentSize.value = HR_DEFAULT_ROW_COUNT;
  selectedTheme.value = defaultTheme();
  workspaceStatus.value = 'View reset';
  loadData();
}

onMounted(async () => {
  disconnectTheme = observeCurrentTheme((isDark) => {
    pageIsDark.value = isDark;
    if (!workspaceState.value.theme) {
      selectedTheme.value = getInitialHRTheme(props.isDark === true || isDark);
    }
  });

  // Load column types in parallel with data to optimize initial load time
  const [DateCol, NumeralCol, SelectCol] = await Promise.all([
    import('@revolist/revogrid-column-date'),
    import('@revolist/revogrid-column-numeral'),
    import('@revolist/revogrid-column-select')
  ]);

  columnTypes.value = {
    date: withHRShortDate(new DateCol.default()),
    number: new NumeralCol.default(),
    select: new SelectCol.default(),
    colorSelect: new SelectCol.default()
  };

  await nextTick();
  const gridValue = gridRef.value;
  const grid = gridValue && ('$el' in gridValue ? gridValue.$el : gridValue);
  if (grid) {
    performanceMonitor = createHRPerformanceMonitor(grid, (state) => {
      performanceState.value = state;
    });
    workspaceController = createHRWorkspaceController(grid, initialWorkspace, () => {
      workspaceStatus.value = 'Unsaved changes';
    });
  }
  loadData();
});

onBeforeUnmount(() => {
  activeController?.abort();
  performanceMonitor?.destroy();
  workspaceController?.destroy();
  disconnectTheme?.();
});
</script>
