import { defineCustomElements } from '@revolist/revogrid/loader';
import {
  EventSchedulerPlugin,
  GanttPlugin,
  KanbanPlugin,
  type EventSchedulerEventChangedDetail,
  type GanttBeforeAssignmentChangeDetail,
  type GanttBeforeTaskChangeDetail,
  type KanbanCardMoveDetail,
} from '@revolist/revogrid-enterprise';
import {
  currentTheme,
  observeCurrentTheme,
} from '../../composables/useRandomData';
import {
  calendarConfig,
  createTasks,
  ganttColumns,
  ganttConfig,
  ganttResources,
  gridColumns,
  kanbanConfig,
  schedulerConfig,
  schedulerResources,
  toGanttAssignments,
  toSchedulerEvents,
  updateFromGantt,
  updateFromGanttAssignment,
  updateFromGrid,
  updateFromKanban,
  updateFromScheduler,
  views,
  type PlanningTask,
  type PlanningView,
} from './data';
import './planning.scss';

defineCustomElements();

type PlanningGridElement = HTMLRevoGridElement & {
  gantt?: typeof ganttConfig;
  ganttResources?: typeof ganttResources;
  ganttAssignments?: ReturnType<typeof toGanttAssignments>;
  eventScheduler?: typeof schedulerConfig;
  eventSchedulerResources?: typeof schedulerResources;
  eventSchedulerEvents?: ReturnType<typeof toSchedulerEvents>;
  kanban?: typeof kanbanConfig;
};

export function load(parentSelector: string): (() => void) | undefined {
  const parent = document.querySelector(parentSelector);
  if (!parent) return;

  let tasks = createTasks();
  let activeView: PlanningView = 'grid';
  const root = document.createElement('section');
  const switcher = document.createElement('nav');
  const panel = document.createElement('article');

  root.className = 'planning-demo';
  switcher.className = 'planning-demo__switch rv-segmented-switch';
  switcher.setAttribute('role', 'tablist');
  switcher.ariaLabel = 'Planning view';
  panel.className = 'planning-demo__grid';
  root.append(switcher, panel);
  parent.appendChild(root);

  function render(view: PlanningView) {
    activeView = view;
    const grid = document.createElement('revo-grid') as PlanningGridElement;
    grid.hideAttribution = true;
    grid.theme = currentTheme().isDark() ? 'darkCompact' : 'compact';

    if (view === 'grid') {
      grid.columns = gridColumns;
      grid.range = true;
      grid.resize = true;
      grid.rowHeaders = true;
      grid.filter = true;
      grid.canMoveColumns = true;
      grid.addEventListener('afteredit', (event) => {
        tasks = updateFromGrid(
          tasks,
          event.detail as Parameters<typeof updateFromGrid>[1],
        );
      });
    } else if (view === 'kanban') {
      grid.plugins = [KanbanPlugin];
      grid.columns = gridColumns;
      grid.kanban = kanbanConfig;
      grid.addEventListener('kanbancardmove', (event) => {
        tasks = updateFromKanban(
          tasks,
          (event as CustomEvent<KanbanCardMoveDetail<PlanningTask>>).detail,
        );
      });
    } else if (view === 'gantt') {
      grid.plugins = [GanttPlugin];
      grid.columns = ganttColumns;
      grid.gantt = ganttConfig;
      grid.ganttResources = ganttResources;
      grid.ganttAssignments = toGanttAssignments(tasks);
      grid.addEventListener('gantt-before-task-change', (event) => {
        tasks = updateFromGantt(
          tasks,
          (event as CustomEvent<GanttBeforeTaskChangeDetail>).detail,
        );
      });
      grid.addEventListener('gantt-before-assignment-change', (event) => {
        tasks = updateFromGanttAssignment(
          tasks,
          (event as CustomEvent<GanttBeforeAssignmentChangeDetail>).detail,
        );
      });
    } else {
      grid.plugins = [EventSchedulerPlugin];
      grid.columns = [];
      grid.resize = true;
      grid.filter = true;
      grid.eventScheduler = view === 'calendar' ? calendarConfig : schedulerConfig;
      grid.eventSchedulerResources = schedulerResources;
      grid.eventSchedulerEvents = toSchedulerEvents(tasks);
      grid.addEventListener('event-scheduler-event-changed', (event) => {
        tasks = updateFromScheduler(
          tasks,
          (event as CustomEvent<EventSchedulerEventChangedDetail>).detail,
        );
      });
    }

    panel.replaceChildren(grid);
    grid.source = view === 'scheduler' || view === 'calendar' ? [] : (tasks as PlanningTask[]);
    switcher.querySelectorAll('button').forEach((button) => {
      const selected = button.dataset.view === activeView;
      button.classList.toggle('on', selected);
      button.ariaSelected = String(selected);
    });
  }

  for (const view of views) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'rv-segmented-switch-item';
    button.setAttribute('role', 'tab');
    button.dataset.view = view;
    button.textContent = view;
    button.addEventListener('click', () => render(view));
    switcher.appendChild(button);
  }

  const disconnectTheme = observeCurrentTheme((isDark) => {
    const grid = panel.querySelector('revo-grid') as PlanningGridElement | null;
    if (grid) grid.theme = isDark ? 'darkCompact' : 'compact';
  });
  render(activeView);

  return () => {
    disconnectTheme();
    root.remove();
  };
}
