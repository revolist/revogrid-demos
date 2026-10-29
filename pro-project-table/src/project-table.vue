<template>
  <div class="project-grid-host">
    <div class="project-grid-shell">
      <project-tracker-toolbar
        ref="toolbarRef"
        @project-tracker-toolbar-action="handleToolbarAction"
      ></project-tracker-toolbar>

      <RevoGrid
        ref="gridRef"
        class="project-tracker-grid skip-style color-grid cell-border"
        :theme="isDark ? 'darkMaterial' : 'material'"
        :can-move-columns="true"
      :columns="columns"
      :column-types="columnTypes"
      :source="projectRows"
        :grouping="grouping"
      :plugins="plugins"
        :row-order.prop="projectRowOrder"
        :row-select.prop="projectRowSelect"
        stretch="last"
        :filter="projectFilterConfig"
        :hide-columns="hiddenColumns"
        :column-add-popup.prop="columnAddPopup"
        :additional-data="additionalData"
        :row-context-menu.prop="contextMenus.rowContextMenu"
        :column-context-menu.prop="contextMenus.columnContextMenu"
        :row-size="44"
        resize
        hide-attribution
        @toggle-hide-column="toggleHideColumn"
        @celleditapply="handleCellEditApply"
        @sortingconfigchanged="handleSortingConfigChanged"
        @rowselected="handleRowSelected"
        @groupexpandclick="handleGroupExpandClick"
      />

      <div v-if="isTaskModalOpen" class="project-modal-backdrop" @click.self="closeTaskModal">
        <form class="project-modal" @submit.prevent="addTask">
          <div class="project-modal__header">
            <div>
              <p>New project</p>
              <h2>Pipeline details</h2>
            </div>
            <button v-rv-control type="button" class="project-modal__close" aria-label="Close task dialog" @click="closeTaskModal">×</button>
          </div>

          <label class="project-modal__field project-modal__field--wide">
            <span>Project</span>
            <input v-rv-control v-model="taskDraft.task" required placeholder="Describe the project" />
          </label>
          <label class="project-modal__field project-modal__field--wide">
            <span>AI summary</span>
            <input v-rv-control v-model="taskDraft.summary" required placeholder="Short project summary" />
          </label>

          <div class="project-modal__grid">
            <DraftSelect kind="owner" label="Owner" v-model="taskDraft.owner" :options="options.owners" />
            <DraftChecks label="Skills" v-model="taskDraft.skills" :options="options.skills" />
            <DraftSelect label="Priority" v-model="taskDraft.priority" :options="options.priorities" />
            <DraftSelect label="Risk" v-model="taskDraft.risk" :options="options.risks" />
            <DraftSelect label="Status" v-model="taskDraft.status" :options="options.statuses" />
            <DraftSelect label="Department" v-model="taskDraft.department" :options="options.departments" />
            <label class="project-modal__field">
              <span>Progress</span>
              <input v-rv-control v-model.number="taskDraft.progress" type="number" min="0" max="100" />
            </label>
            <label class="project-modal__field">
              <span>Start</span>
              <input v-rv-control v-model="taskDraft.from" type="date" />
            </label>
            <label class="project-modal__field">
              <span>End</span>
              <input v-rv-control v-model="taskDraft.to" type="date" />
            </label>
            <label class="project-modal__field">
              <span>Budget</span>
              <input v-rv-control v-model.number="taskDraft.budget" type="number" min="0" step="1000" />
            </label>
            <label class="project-modal__field">
              <span>Rating</span>
              <input v-rv-control v-model.number="taskDraft.rating" type="number" min="0" max="5" step="1" />
            </label>
            <DraftSelect label="Section" v-model="taskDraft.section" :options="options.sections" />
          </div>

          <div class="project-modal__footer">
            <button v-rv-control type="button" @click="closeTaskModal">Cancel</button>
            <button v-rv-control type="submit" class="project-grid-primary">Create project</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { renderControl } from '@revolist/ui';
import { vRvControl } from '@revolist/ui/vue-control';
import '@revolist/ui/styles.css';
import './project-tracker.scss';
import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref, shallowRef, watchEffect } from 'vue';
import RevoGrid from '@revolist/vue3-datagrid';
import type { ColumnProp } from '@revolist/revogrid';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  createProjectColumns,
  createProjectColumnTypes,
  createProjectColumnAddPopupConfig,
  createProjectContextMenus,
  createProjectGrouping,
  createProjectRows,
  createProjectTaskDraft,
  createProjectTaskFromDraft,
  applyProjectBulkAction,
  applyProjectSort,
  clearProjectSelection,
  getProjectFilterOptions,
  getProjectHideableColumns,
  getSelectedProjectIndexes,
  projectFilterConfig,
  projectPlugins,
  projectRowOrder,
  projectRowSelect,
  openProjectStatusHeaderFilter,
  resolveProjectSortValueFromConfig,
  projectOwnerProfiles,
  syncProjectCellEdit,
  updateProjectCollapsedGroups,
  defineProjectTrackerToolbarElement,
  type ProjectGroupProp,
  type ProjectRow,
  type ProjectBulkAction,
  type ProjectSortValue,
  type ProjectTaskDraft,
  type ProjectTrackerToolbarActionEvent,
  type ProjectTrackerToolbarElement,
} from './project-tracker.shared';

defineProjectTrackerToolbarElement();

const isDark = ref(currentTheme().isDark());
let disconnectTheme: (() => void) | undefined;

onMounted(() => {
  disconnectTheme = observeCurrentTheme((darkTheme) => {
    isDark.value = darkTheme;
  });
});
onBeforeUnmount(() => disconnectTheme?.());

const hiddenColumns = shallowRef<ColumnProp[]>([]);
const projectRows = ref<ProjectRow[]>(createProjectRows());
const selectedIndexes = shallowRef<Set<number>>(new Set());
const selectedRowsCount = ref(0);
const groupBy = ref<ProjectGroupProp>('section');
const groupsExpanded = ref(true);
const collapsedGroups = shallowRef<Set<string>>(new Set());
const sortBy = ref<ProjectSortValue>('');
const gridRef = ref<{ $el?: HTMLRevoGridElement } | HTMLRevoGridElement | null>(null);
const toolbarRef = ref<ProjectTrackerToolbarElement | null>(null);
const isTaskModalOpen = ref(false);
const taskDraft = ref<ProjectTaskDraft>(createProjectTaskDraft());

const options = computed(() => getProjectFilterOptions(projectRows.value));
const columns = shallowRef(createProjectColumns());
const columnTypes = createProjectColumnTypes();
const plugins = projectPlugins;
const grouping = computed(() => createProjectGrouping(() => projectRows.value, groupBy.value, groupsExpanded.value, collapsedGroups.value));
const contextMenus = computed(() => createProjectContextMenus({
  getRows: () => projectRows.value,
  setRows: (rows) => {
    projectRows.value = rows;
  },
  getColumns: () => columns.value,
  setColumns: (nextColumns) => {
    columns.value = nextColumns as typeof columns.value;
  },
  getHiddenColumns: () => hiddenColumns.value,
  setHiddenColumns: (nextHiddenColumns) => {
    hiddenColumns.value = nextHiddenColumns;
  },
  getGrid: getGridElement,
  getSelectedIndexes: () => selectedIndexes.value,
  getGroupBy: () => groupBy.value,
  clearSelection: resetSelection,
  setSortBy: (value) => {
    sortBy.value = value;
  },
}));
const columnAddPopup = computed(() => createProjectColumnAddPopupConfig({
  getRows: () => projectRows.value,
  setRows: (rows) => {
    projectRows.value = rows;
  },
  getColumns: () => columns.value,
  setColumns: (nextColumns) => {
    columns.value = nextColumns as typeof columns.value;
  },
  getHiddenColumns: () => hiddenColumns.value,
  setHiddenColumns: (nextHiddenColumns) => {
    hiddenColumns.value = nextHiddenColumns;
  },
  getGrid: getGridElement,
  getSelectedIndexes: () => selectedIndexes.value,
  clearSelection: resetSelection,
  setSortBy: (value) => {
    sortBy.value = value;
  },
}));
const additionalData = computed(() => ({
  columnAddPopup: columnAddPopup.value,
}));

const DraftSelect = defineComponent({
  props: {
    kind: { type: String, default: 'plain' },
    label: { type: String, required: true },
    modelValue: { type: String, required: true },
    options: { type: Array<string>, required: true },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('label', { class: 'project-modal__field project-modal__field--select' }, [
      h('span', props.label),
      renderControl(h, 'select', {
        value: props.modelValue,
        onChange: (event: Event) => emit('update:modelValue', (event.target as HTMLSelectElement).value),
      }, props.options.map((option) => h('option', { value: option },
        props.kind === 'owner' ? projectOwnerProfiles.find(owner => owner.value === option)?.label ?? option : option))),
    ]);
  },
});

const DraftChecks = defineComponent({
  props: {
    label: { type: String, required: true },
    modelValue: { type: Array<string>, required: true },
    options: { type: Array<string>, required: true },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const toggle = (option: string, checked: boolean) => {
      const next = checked
        ? Array.from(new Set([...props.modelValue, option]))
        : props.modelValue.filter((item) => item !== option);
      emit('update:modelValue', next.length ? next : props.modelValue);
    };
    return () => h('fieldset', { class: 'project-modal__field project-modal__field--wide project-modal__checks' }, [
      h('legend', props.label),
      h('div', props.options.map((option) => h('label', { key: option }, [
        renderControl(h, 'input', {
          type: 'checkbox',
          checked: props.modelValue.includes(option),
          onChange: (event: Event) => {
            const input = event.target as HTMLInputElement;
            if (!input.checked && props.modelValue.length === 1 && props.modelValue.includes(option)) {
              input.checked = true;
              return;
            }
            toggle(option, input.checked);
          },
        }),
        h('span', option),
      ]))),
    ]);
  },
});

function openTaskModal() {
  taskDraft.value = createProjectTaskDraft();
  isTaskModalOpen.value = true;
}

function closeTaskModal() {
  isTaskModalOpen.value = false;
}

function addTask() {
  projectRows.value = [createProjectTaskFromDraft(taskDraft.value), ...projectRows.value];
  closeTaskModal();
}

function getGridElement() {
  const grid = gridRef.value as any;
  return (grid?.$el ?? grid) as HTMLRevoGridElement | undefined;
}

function changeSort(value: string, additive = false) {
  sortBy.value = value as ProjectSortValue;
  void applyProjectSort(getGridElement(), columns.value, sortBy.value, additive);
}

function toggleGroups() {
  if (!groupBy.value) return;
  groupsExpanded.value = !groupsExpanded.value;
  collapsedGroups.value = new Set();
}

function openStatusFilter() {
  openProjectStatusHeaderFilter(getGridElement());
}

function toggleHiddenColumn(prop: ColumnProp, visible: boolean) {
  hiddenColumns.value = visible
    ? hiddenColumns.value.filter((column) => column !== prop)
    : Array.from(new Set([...hiddenColumns.value, prop]));
}

function resetSelection() {
  clearProjectSelection(getGridElement());
  selectedIndexes.value = new Set();
  selectedRowsCount.value = 0;
}

function runBulkAction(action: ProjectBulkAction) {
  if (!selectedIndexes.value.size) return;
  projectRows.value = applyProjectBulkAction(projectRows.value, selectedIndexes.value, action, groupBy.value);
  resetSelection();
}

function handleToolbarAction(event: ProjectTrackerToolbarActionEvent) {
  const detail = event.detail;
  if (detail.action === 'new') {
    openTaskModal();
    return;
  }
  if (detail.action === 'filter') {
    openStatusFilter();
    return;
  }
  if (detail.action === 'toggleGroups') {
    toggleGroups();
    return;
  }
  if (detail.action === 'group') {
    groupBy.value = detail.value;
    if (groupBy.value) groupsExpanded.value = true;
    collapsedGroups.value = new Set();
    return;
  }
  if (detail.action === 'sort') {
    changeSort(detail.value, detail.additive);
    return;
  }
  if (detail.action === 'bulk') {
    runBulkAction(detail.value);
    return;
  }
  if (detail.action === 'hideColumn') {
    toggleHiddenColumn(detail.prop, detail.visible);
  }
}

watchEffect(() => {
  if (!toolbarRef.value) {
    return;
  }
  toolbarRef.value.state = {
    totalRows: projectRows.value.length,
    selectedRowsCount: selectedRowsCount.value,
    groupBy: groupBy.value,
    groupsExpanded: groupsExpanded.value,
    sortBy: sortBy.value,
    hiddenColumns: hiddenColumns.value,
    hideableColumns: getProjectHideableColumns(columns.value),
  };
});

function handleRowSelected(event: CustomEvent<HTMLRevoGridElementEventMap['rowselected']>) {
  selectedIndexes.value = getSelectedProjectIndexes(event);
  selectedRowsCount.value = event.detail.count;
}

function handleCellEditApply(event: CustomEvent) {
  projectRows.value = syncProjectCellEdit(projectRows.value, event.detail);
}

function handleSortingConfigChanged(event: CustomEvent<unknown>) {
  sortBy.value = resolveProjectSortValueFromConfig(event.detail);
}

function handleGroupExpandClick(event: CustomEvent<{ model?: Record<string, unknown> }>) {
  queueMicrotask(() => {
    const next = new Set(updateProjectCollapsedGroups(event, collapsedGroups.value));
    collapsedGroups.value = next;
    groupsExpanded.value = next.size === 0;
  });
}

function toggleHideColumn({ detail: cols }: CustomEvent<ColumnProp[]>) {
  hiddenColumns.value = [...cols];
}
</script>
