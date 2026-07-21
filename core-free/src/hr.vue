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
      <div v-if="loading" class="text-sm opacity-50 animate-pulse ml-2">Loading data...</div>
    </div>

    <div class="hr-grid-wrapper">
      <VGrid
        class="hr-scale-grid grow h-full w-full"
        style="height: 100%; width: 100%"
        :theme="gridTheme"
        :source="rows"
        :columns="columns"
        :column-types="columnTypes"
        :filter="true"
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onBeforeUnmount } from 'vue';
import { VGrid, type ColumnGrouping, type ColumnRegular, BasePlugin, type PluginProviders } from '@revolist/vue3-datagrid';
import { getHRColumnsCount, getHRData, HR_OPTIONS } from './sys-data/hr.data';
import type { HRGenerationProgress } from './sys-data/hr.data.generator';
import { getBaseHRColumns, getExtraHRColumns, HR_COLOR_BY_AGE, withHRShortDate } from './sys-data/hr.columns';
import { currentThemeVue } from '../../composables/useRandomData';
import { createHRColorSelectColumnType, renderHrColorPill } from './hr-color-select';
import { getHRLoadingDigits, getHRProgressPercent } from './hr-loading';
import './hr.css';

const props = defineProps<{
  isDark?: boolean;
}>();

const { isDark: pageIsDark } = currentThemeVue();
const loading = ref(false);
const currentSize = ref(100);
const options = HR_OPTIONS;
const rows = ref<any[]>([]);
const progress = ref<HRGenerationProgress>({ loaded: 0, total: currentSize.value });
const gridTheme = computed(() => (props.isDark === true || pageIsDark.value) ? 'darkCompact' : 'compact');
const progressPercent = computed(() => getHRProgressPercent(progress.value));
const loadingDigits = computed(() => getHRLoadingDigits(progress.value));
let activeController: AbortController | undefined;

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
  const dropdownSource: string[] = Array.from(new Set(rows.value.map(r => r.company))).filter(Boolean);
  const baseCols = getBaseHRColumns(dropdownSource);

  // Apply Vue-specific templates
  const nameCol = (baseCols[0] as ColumnGrouping).children[1] as ColumnRegular;
  nameCol.cellTemplate = (h, props) =>
    h('span', { class: 'flex items-center' }, [
      h('span', { class: 'hr-avatar' }, [
        h('img', { src: props.model.avatar, alt: props.value, class: 'w-full h-full object-cover' })
      ]),
      props.value
    ]);

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

  return [...baseCols, ...getExtraHRColumns(getHRColumnsCount(currentSize.value))];
});

async function loadData() {
  activeController?.abort();
  const controller = new AbortController();
  activeController = controller;
  loading.value = true;
  progress.value = { loaded: 0, total: currentSize.value };
  try {
    rows.value = await getHRData(currentSize.value, getHRColumnsCount(currentSize.value), {
      signal: controller.signal,
      onProgress: nextProgress => {
        progress.value = nextProgress;
      },
    });
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
  loadData();
}

onMounted(async () => {
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
    colorSelect: createHRColorSelectColumnType(SelectCol.default)
  };

  loadData();
});

onBeforeUnmount(() => {
  activeController?.abort();
});
</script>
