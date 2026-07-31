import React, { useEffect, useMemo, useState } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import {
  EventSchedulerPlugin,
  GanttPlugin,
  type EventSchedulerEventChangedDetail,
  type GanttBeforeAssignmentChangeDetail,
  type GanttBeforeTaskChangeDetail,
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
  schedulerConfig,
  schedulerResources,
  toGanttAssignments,
  toSchedulerEvents,
  updateFromGantt,
  updateFromGanttAssignment,
  updateFromGrid,
  updateFromScheduler,
  views,
  type PlanningView,
} from './data';
import './planning.scss';

type PlanningGridProps = React.ComponentProps<typeof RevoGrid> & {
  gantt?: typeof ganttConfig;
  ganttResources?: typeof ganttResources;
  ganttAssignments?: ReturnType<typeof toGanttAssignments>;
  eventScheduler?: typeof schedulerConfig;
  eventSchedulerResources?: typeof schedulerResources;
  eventSchedulerEvents?: ReturnType<typeof toSchedulerEvents>;
  'onGantt-before-task-change'?: (
    event: CustomEvent<GanttBeforeTaskChangeDetail>,
  ) => void;
  'onGantt-before-assignment-change'?: (
    event: CustomEvent<GanttBeforeAssignmentChangeDetail>,
  ) => void;
  'onEvent-scheduler-event-changed'?: (
    event: CustomEvent<EventSchedulerEventChangedDetail>,
  ) => void;
};

const PlanningGrid = RevoGrid as React.ComponentType<PlanningGridProps>;

export default function PlanningViews() {
  const [activeView, setActiveView] = useState<PlanningView>('grid');
  const [tasks, setTasks] = useState(createTasks);
  const [isDark, setIsDark] = useState(() => currentTheme().isDark());
  const ganttPlugins = useMemo(() => [GanttPlugin], []);
  const schedulerPlugins = useMemo(() => [EventSchedulerPlugin], []);
  const ganttAssignments = useMemo(() => toGanttAssignments(tasks), [tasks]);
  const schedulerEvents = useMemo(() => toSchedulerEvents(tasks), [tasks]);

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
            {view}
          </button>
        ))}
      </nav>

      {activeView === 'grid' && (
        <PlanningGrid
          key="grid"
          className="planning-demo__grid"
          theme={isDark ? 'darkCompact' : 'compact'}
          hideAttribution
          source={tasks}
          columns={gridColumns}
          range
          resize
          rowHeaders
          filter
          canMoveColumns
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
      {activeView === 'gantt' && (
        <PlanningGrid
          key="gantt"
          className="planning-demo__grid"
          theme={isDark ? 'darkCompact' : 'compact'}
          hideAttribution
          plugins={ganttPlugins}
          source={tasks}
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
      {(activeView === 'scheduler' || activeView === 'calendar') && (
        <PlanningGrid
          key={activeView}
          className="planning-demo__grid"
          theme={isDark ? 'darkCompact' : 'compact'}
          hideAttribution
          plugins={schedulerPlugins}
          source={[]}
          columns={[]}
          resize
          filter
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
