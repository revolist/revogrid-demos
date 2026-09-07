import React, { useEffect, useMemo, useState } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
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
import { AdvanceFilterPlugin, FilterHeaderPlugin, RowSelectPlugin } from '@revolist/revogrid-pro';
import {
  currentTheme,
  observeCurrentTheme,
} from '../../composables/useRandomData';
import {
  calendarConfig,
  createTasks,
  defaultPlanningFilters,
  filterPlanningTasks,
  ganttColumns,
  ganttConfig,
  ganttResources,
  gridColumnTypes,
  gridColumns,
  kanbanConfig,
  planningProjects,
  planningFilterConfig,
  schedulerConfig,
  schedulerResources,
  toGanttAssignments,
  toSchedulerEvents,
  updateFromGantt,
  updateFromGanttAssignment,
  updateFromGrid,
  updateFromKanban,
  updateFromKanbanDelete,
  updateFromKanbanUpdate,
  updateFromScheduler,
  views,
  type PlanningView,
  type PlanningTask,
  type PlanningFilters,
} from './data';
import './planning.scss';

type PlanningGridProps = React.ComponentProps<typeof RevoGrid> & {
  gantt?: typeof ganttConfig;
  ganttResources?: typeof ganttResources;
  ganttAssignments?: ReturnType<typeof toGanttAssignments>;
  eventScheduler?: typeof schedulerConfig;
  eventSchedulerResources?: typeof schedulerResources;
  eventSchedulerEvents?: ReturnType<typeof toSchedulerEvents>;
  kanban?: typeof kanbanConfig;
  rowSelect?: { rowOrder: boolean };
  filter?: typeof planningFilterConfig;
  onRowselected?: (event: CustomEvent<HTMLRevoGridElementEventMap['rowselected']>) => void;
  'onGantt-before-task-change'?: (
    event: CustomEvent<GanttBeforeTaskChangeDetail>,
  ) => void;
  'onGantt-before-assignment-change'?: (
    event: CustomEvent<GanttBeforeAssignmentChangeDetail>,
  ) => void;
  'onEvent-scheduler-event-changed'?: (
    event: CustomEvent<EventSchedulerEventChangedDetail>,
  ) => void;
  onKanbancardmove?: (
    event: CustomEvent<KanbanCardMoveDetail<PlanningTask>>,
  ) => void;
  onKanbancardcreate?: (
    event: CustomEvent<KanbanCardCreateDetail<PlanningTask>>,
  ) => void;
  onKanbancardupdate?: (
    event: CustomEvent<KanbanCardUpdateDetail<PlanningTask>>,
  ) => void;
  onKanbancarddelete?: (
    event: CustomEvent<KanbanCardDeleteDetail<PlanningTask>>,
  ) => void;
};

const PlanningGrid = RevoGrid as React.ComponentType<PlanningGridProps>;

export default function PlanningViews() {
  const [activeView, setActiveView] = useState<PlanningView>('grid');
  const [tasks, setTasks] = useState(createTasks);
  const [filters, setFilters] = useState<PlanningFilters>(defaultPlanningFilters);
  const [selectedCount, setSelectedCount] = useState(0);
  const [isDark, setIsDark] = useState(() => currentTheme().isDark());
  const ganttPlugins = useMemo(() => [GanttPlugin], []);
  const kanbanPlugins = useMemo(() => [KanbanPlugin], []);
  const schedulerPlugins = useMemo(() => [EventSchedulerPlugin], []);
  const gridPlugins = useMemo(() => [RowSelectPlugin, AdvanceFilterPlugin, FilterHeaderPlugin], []);
  const visibleTasks = useMemo(() => filterPlanningTasks(tasks, filters), [tasks, filters]);
  const visibleIds = useMemo(() => new Set(visibleTasks.map(({ id }) => id)), [visibleTasks]);
  const ganttAssignments = useMemo(() => toGanttAssignments(tasks).filter(({ taskId }) => visibleIds.has(String(taskId))), [tasks, visibleIds]);
  const schedulerEvents = useMemo(() => toSchedulerEvents(visibleTasks), [visibleTasks]);

  useEffect(() => observeCurrentTheme(setIsDark), []);

  return (
    <section className="planning-demo">
      <nav className="planning-demo__switch rv-segmented-switch" role="tablist" aria-label="Planning view">
        {views.map((view) => (
          <button
            key={view}
            type="button"
            className={`rv-segmented-switch-item${activeView === view ? ' on' : ''}`}
            role="tab"
            aria-selected={activeView === view}
            onClick={() => setActiveView(view)}
          >
            {view}<span className="planning-demo__pro">Pro</span>
          </button>
        ))}
      </nav>

      <div className="planning-demo__toolbar">
        <label className="planning-demo__search"><span aria-hidden="true">⌕</span><input aria-label="Search tasks" type="search" placeholder="Search tasks…" value={filters.query} onChange={(event) => setFilters(current => ({ ...current, query: event.target.value }))} /></label>
        <label className="planning-demo__select"><select aria-label="Project" value={filters.projectId} onChange={(event) => setFilters(current => ({ ...current, projectId: event.target.value as PlanningFilters['projectId'] }))}><option value="all">All projects</option>{planningProjects.map(project => <option key={project.id} value={project.id}>{project.label}</option>)}</select></label>
        <details className="planning-demo__filter-wrap"><summary>Filter · {filters.statuses.length + filters.priorities.length}</summary><div className="planning-demo__filter-popover">
          <fieldset><legend>Status</legend>{([['not-started','Planned'],['in-progress','In progress'],['blocked','Blocked'],['done','Done']] as const).map(([value,label]) => <label key={value}><input type="checkbox" checked={filters.statuses.includes(value)} onChange={() => setFilters(current => ({ ...current, statuses: current.statuses.includes(value) ? current.statuses.filter(item => item !== value) : [...current.statuses, value] }))}/>{label}</label>)}</fieldset>
          <fieldset><legend>Priority</legend>{[[500,'Normal'],[700,'High'],[900,'Critical']].map(([value,label]) => <label key={value}><input type="checkbox" checked={filters.priorities.includes(Number(value))} onChange={() => setFilters(current => ({ ...current, priorities: current.priorities.includes(Number(value)) ? current.priorities.filter(item => item !== Number(value)) : [...current.priorities, Number(value)] }))}/>{label}</label>)}</fieldset>
          <button type="button" className="planning-demo__clear" onClick={() => setFilters(defaultPlanningFilters())}>Clear filters</button>
        </div></details>
        <button type="button" onClick={() => { setTasks(createTasks()); setFilters(defaultPlanningFilters()); setSelectedCount(0); }}>Reset</button>
        <span className="planning-demo__count">{visibleTasks.length} of {tasks.length} tasks · {selectedCount} selected</span>
      </div>

      {!visibleTasks.length && <div className="planning-demo__empty"><strong>No tasks match your filters</strong><button type="button" onClick={() => setFilters(defaultPlanningFilters())}>Clear filters</button></div>}
      {!!visibleTasks.length && activeView === 'grid' && (
        <PlanningGrid
          key="grid"
          className="planning-demo__grid"
          theme={isDark ? 'darkCompact' : 'compact'}
          hideAttribution
          plugins={gridPlugins}
          source={visibleTasks}
          columns={gridColumns}
          columnTypes={gridColumnTypes}
          range
          resize
          canMoveColumns
          rowSize={40}
          rowSelect={{ rowOrder: false }}
          filter={planningFilterConfig}
          onRowselected={(event: CustomEvent<{ count: number }>) => setSelectedCount(event.detail.count)}
          onAfteredit={(event) =>
            setTasks((current) =>
              updateFromGrid(
                current,
                event.detail as Parameters<typeof updateFromGrid>[1],
              ),
            )
          }
        />
      )}
      {!!visibleTasks.length && activeView === 'gantt' && (
        <PlanningGrid
          key="gantt"
          className="planning-demo__grid"
          theme={isDark ? 'darkCompact' : 'compact'}
          hideAttribution
          plugins={ganttPlugins}
          source={visibleTasks}
          columns={ganttColumns}
          gantt={ganttConfig}
          ganttResources={ganttResources}
          ganttAssignments={ganttAssignments}
          onGantt-before-task-change={(
            event: CustomEvent<GanttBeforeTaskChangeDetail>,
          ) => setTasks((current) => updateFromGantt(current, event.detail))}
          onGantt-before-assignment-change={(
            event: CustomEvent<GanttBeforeAssignmentChangeDetail>,
          ) =>
            setTasks((current) =>
              updateFromGanttAssignment(current, event.detail),
            )
          }
        />
      )}
      {!!visibleTasks.length && activeView === 'kanban' && (
        <PlanningGrid
          key="kanban"
          className="planning-demo__grid"
          theme={isDark ? 'darkCompact' : 'compact'}
          hideAttribution
          plugins={kanbanPlugins}
          source={visibleTasks}
          columns={gridColumns}
          kanban={kanbanConfig}
          onKanbancardmove={(event) =>
            setTasks((current) => updateFromKanban(current, event.detail))
          }
          onKanbancardcreate={(event) =>
            setTasks((current) => [...current, event.detail.card])
          }
          onKanbancardupdate={(event) =>
            setTasks((current) => updateFromKanbanUpdate(current, event.detail))
          }
          onKanbancarddelete={(event) =>
            setTasks((current) => updateFromKanbanDelete(current, event.detail))
          }
        />
      )}
      {!!visibleTasks.length && (activeView === 'scheduler' || activeView === 'calendar') && (
        <PlanningGrid
          key={activeView}
          className="planning-demo__grid"
          theme={isDark ? 'darkCompact' : 'compact'}
          hideAttribution
          plugins={schedulerPlugins}
          source={[]}
          columns={[]}
          resize
          eventScheduler={activeView === 'calendar' ? calendarConfig : schedulerConfig}
          eventSchedulerResources={schedulerResources}
          eventSchedulerEvents={schedulerEvents}
          onEvent-scheduler-event-changed={(
            event: CustomEvent<EventSchedulerEventChangedDetail>,
          ) =>
            setTasks((current) => updateFromScheduler(current, event.detail))
          }
        />
      )}
    </section>
  );
}
