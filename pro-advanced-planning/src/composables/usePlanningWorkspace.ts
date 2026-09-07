import { computed, onBeforeUnmount, ref } from 'vue';
import {
  AdvanceFilterPlugin,
  DataGridFormattingPlugin,
  FilterHeaderPlugin,
  RowSelectPlugin,
  type AdvancedFilterBadgesOptions,
  type RowSelectConfig,
} from '@revolist/revogrid-pro';
import {
  GanttPlugin,
  type GanttBeforeAssignmentChangeDetail,
  type GanttBeforeTaskChangeDetail,
} from '@revolist/gantt';
import {
  KanbanPlugin,
  type KanbanCardCreateDetail,
  type KanbanCardDeleteDetail,
  type KanbanCardMoveDetail,
  type KanbanCardUpdateDetail,
} from '@revolist/kanban';
import {
  EventSchedulerPlugin,
  type EventSchedulerEventChangedDetail,
} from '@revolist/scheduler';
import { currentTheme, observeCurrentTheme } from '../../../composables/useRandomData';
import {
  calendarConfig,
  createTasks,
  ganttColumns,
  ganttConfig,
  ganttResources,
  planningDataGridFormatting,
  gridColumnTypes,
  gridColumns,
  kanbanConfig,
  mergeVisibleTasks,
  planningFilterConfig,
  schedulerConfig,
  schedulerResources,
  toGanttAssignments,
  toSchedulerEvents,
  updateFromGantt,
  updateFromGanttAssignment,
  updateFromGrid,
  updateFromKanban,
  updateFromKanbanCreate,
  updateFromKanbanUpdate,
  updateFromScheduler,
  views,
  type PlanningTask,
  type PlanningView,
} from '../data';

const rowSelect: RowSelectConfig = { rowOrder: false };
const gridPlugins = [RowSelectPlugin, AdvanceFilterPlugin, FilterHeaderPlugin, DataGridFormattingPlugin];
const ganttPlugins = [GanttPlugin];
const kanbanPlugins = [KanbanPlugin];
const schedulerPlugins = [EventSchedulerPlugin];
export function usePlanningWorkspace() {
  const rootRef = ref<HTMLElement>();
  const moreMenuRef = ref<HTMLDetailsElement>();
  const gridRef = ref<any>();
  const activeView = ref<PlanningView>('grid');
  const tasks = ref(createTasks());
  const quickSearch = ref('');
  const visibleTaskIds = ref<string[] | undefined>();
  const resetKey = ref(0);
  const selectedCount = ref(0);
  const filterBadgeOptions = {
    className: 'planning-demo__filter-badges',
    badgeClassName: 'planning-demo__filter-badge',
    emptyClassName: 'planning-demo__filter-badges--empty',
    renderEmpty: () => null,
    slots: {
      start: () => {
        const field = document.createElement('label');
        field.className = 'planning-demo__filter-search';
        field.ariaLabel = 'Quick search tasks';
        const input = document.createElement('input');
        input.type = 'search';
        input.placeholder = 'Quick search tasks…';
        input.ariaLabel = 'Quick search tasks';
        input.value = quickSearch.value;
        input.addEventListener('input', () => {
          quickSearch.value = input.value;
        });
        field.append(input);
        return field;
      },
    },
  } satisfies AdvancedFilterBadgesOptions;
  const isDark = ref(currentTheme().isDark());
  const theme = computed(() => isDark.value ? 'darkCompact' : 'compact');
  const quickFilter = computed(() => ({
    text: quickSearch.value,
    columns: ['name', 'owner'],
    debounceMs: 150,
  }));
  const visibleTasks = computed(() => {
    const ids = visibleTaskIds.value;
    if (!ids) return tasks.value;
    const byId = new Map(tasks.value.map(task => [task.id, task]));
    return ids.flatMap(id => {
      const task = byId.get(id);
      return task ? [task] : [];
    });
  });
  const visibleIds = computed(() => new Set(visibleTasks.value.map(({ id }) => id)));
  const ganttAssignments = computed(() =>
    toGanttAssignments(tasks.value).filter(({ taskId }) => visibleIds.value.has(String(taskId))),
  );
  const schedulerEvents = computed(() => toSchedulerEvents(visibleTasks.value));
  const disconnectTheme = observeCurrentTheme(value => {
    isDark.value = value;
  });

  function closePopovers() {
    if (moreMenuRef.value) moreMenuRef.value.open = false;
  }

  onBeforeUnmount(() => {
    disconnectTheme();
  });

  async function syncVisibleTasks() {
    const grid = gridRef.value?.$el ?? gridRef.value;
    if (!grid) return;
    visibleTaskIds.value = (await grid.getVisibleSource()).map((task: PlanningTask) => task.id);
  }

  function openSource(event: MouseEvent) {
    (event.currentTarget as HTMLElement).dispatchEvent(
      new CustomEvent('demo-open-source', { bubbles: true }),
    );
  }

  function resetWorkspace() {
    tasks.value = createTasks();
    quickSearch.value = '';
    visibleTaskIds.value = undefined;
    selectedCount.value = 0;
    resetKey.value += 1;
    closePopovers();
  }

  async function toggleFullscreen() {
    if (!rootRef.value) return;
    closePopovers();
    if (document.fullscreenElement) await document.exitFullscreen();
    else await rootRef.value.requestFullscreen();
  }

  function merge(next: PlanningTask[]) {
    tasks.value = mergeVisibleTasks(tasks.value, next);
  }

  function handleGridEdit(event: CustomEvent) {
    tasks.value = updateFromGrid(tasks.value, event.detail);
  }

  function handleRowSelected(event: CustomEvent<{ count: number }>) {
    selectedCount.value = event.detail.count;
  }

  function handleKanbanMove(event: CustomEvent<KanbanCardMoveDetail<PlanningTask>>) {
    merge(updateFromKanban(visibleTasks.value, event.detail));
  }

  function handleKanbanCreate(event: CustomEvent<KanbanCardCreateDetail<PlanningTask>>) {
    tasks.value = [...tasks.value, ...updateFromKanbanCreate([], event.detail)];
  }

  function handleKanbanUpdate(event: CustomEvent<KanbanCardUpdateDetail<PlanningTask>>) {
    merge(updateFromKanbanUpdate(visibleTasks.value, event.detail));
  }

  function handleKanbanDelete(event: CustomEvent<KanbanCardDeleteDetail<PlanningTask>>) {
    const deleted = new Set(event.detail.cardIds.map(String));
    tasks.value = tasks.value.filter(({ id }) => !deleted.has(id));
  }

  function handleGanttEdit(event: CustomEvent<GanttBeforeTaskChangeDetail>) {
    tasks.value = updateFromGantt(tasks.value, event.detail);
  }

  function handleGanttAssignmentEdit(event: CustomEvent<GanttBeforeAssignmentChangeDetail>) {
    tasks.value = updateFromGanttAssignment(tasks.value, event.detail);
  }

  function handleSchedulerEdit(event: CustomEvent<EventSchedulerEventChangedDetail>) {
    tasks.value = updateFromScheduler(tasks.value, event.detail);
  }

  return {
    activeView,
    calendarConfig,
    closePopovers,
    filterBadgeOptions,
    ganttAssignments,
    ganttColumns,
    ganttConfig,
    ganttPlugins,
    ganttResources,
    planningDataGridFormatting,
    gridColumnTypes,
    gridColumns,
    gridPlugins,
    gridRef,
    handleGanttAssignmentEdit,
    handleGanttEdit,
    handleGridEdit,
    handleKanbanCreate,
    handleKanbanDelete,
    handleKanbanMove,
    handleKanbanUpdate,
    handleRowSelected,
    handleSchedulerEdit,
    kanbanConfig,
    kanbanPlugins,
    moreMenuRef,
    openSource,
    planningFilterConfig,
    quickFilter,
    quickSearch,
    resetKey,
    resetWorkspace,
    rootRef,
    rowSelect,
    schedulerConfig,
    schedulerEvents,
    schedulerPlugins,
    schedulerResources,
    selectedCount,
    syncVisibleTasks,
    tasks,
    theme,
    toggleFullscreen,
    visibleTasks,
    views,
  };
}
