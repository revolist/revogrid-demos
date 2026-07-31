import { Component, NO_ERRORS_SCHEMA, ViewEncapsulation } from '@angular/core';
import { RevoGrid } from '@revolist/angular-datagrid';
import {
  EventSchedulerPlugin,
  GanttPlugin,
  type EventSchedulerEventChangedDetail,
  type GanttBeforeAssignmentChangeDetail,
  type GanttBeforeTaskChangeDetail,
} from '@revolist/revogrid-enterprise';
import { currentTheme } from '../../composables/useRandomData';
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
  type PlanningTask,
  type PlanningView,
} from './data';

@Component({
  selector: 'planning-views-grid',
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  imports: [RevoGrid],
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./planning.scss'],
  template: `
    <section class="planning-demo">
      <nav class="planning-demo__switch rv-segmented-switch" role="tablist" aria-label="Planning view">
        <button
          type="button"
          class="rv-segmented-switch-item"
          role="tab"
          [class.on]="activeView === 'grid'"
          [attr.aria-selected]="activeView === 'grid'"
          (click)="activeView = 'grid'"
        >
          Grid
        </button>
        <button
          type="button"
          class="rv-segmented-switch-item"
          role="tab"
          [class.on]="activeView === 'gantt'"
          [attr.aria-selected]="activeView === 'gantt'"
          (click)="activeView = 'gantt'"
        >
          Gantt
        </button>
        <button
          type="button"
          class="rv-segmented-switch-item"
          role="tab"
          [class.on]="activeView === 'scheduler'"
          [attr.aria-selected]="activeView === 'scheduler'"
          (click)="activeView = 'scheduler'"
        >
          Scheduler
        </button>
        <button
          type="button"
          class="rv-segmented-switch-item"
          role="tab"
          [class.on]="activeView === 'calendar'"
          [attr.aria-selected]="activeView === 'calendar'"
          (click)="activeView = 'calendar'"
        >
          Calendar
        </button>
      </nav>

      @switch (activeView) {
        @case ('grid') {
          <revo-grid
            class="planning-demo__grid"
            [hideAttribution]="true"
            [theme]="theme"
            [source]="tasks"
            [columns]="gridColumns"
            [range]="true"
            [resize]="true"
            [rowHeaders]="true"
            [filter]="true"
            [canMoveColumns]="true"
            (afteredit)="handleGridEdit($event)"
          ></revo-grid>
        }
        @case ('gantt') {
          <revo-grid
            class="planning-demo__grid"
            [hideAttribution]="true"
            [theme]="theme"
            [plugins]="ganttPlugins"
            [source]="tasks"
            [columns]="ganttColumns"
            [gantt]="ganttConfig"
            [ganttResources]="ganttResources"
            [ganttAssignments]="ganttAssignments"
            (gantt-before-task-change)="handleGanttEdit($event)"
            (gantt-before-assignment-change)="handleGanttAssignmentEdit($event)"
          ></revo-grid>
        }
        @case ('scheduler') {
          <revo-grid
            class="planning-demo__grid"
            [hideAttribution]="true"
            [theme]="theme"
            [plugins]="schedulerPlugins"
            [source]="empty"
            [columns]="empty"
            [resize]="true"
            [filter]="true"
            [eventScheduler]="schedulerConfig"
            [eventSchedulerResources]="schedulerResources"
            [eventSchedulerEvents]="schedulerEvents"
            (event-scheduler-event-changed)="handleSchedulerEdit($event)"
          ></revo-grid>
        }
        @case ('calendar') {
          <revo-grid
            class="planning-demo__grid"
            [hideAttribution]="true"
            [theme]="theme"
            [plugins]="schedulerPlugins"
            [source]="empty"
            [columns]="empty"
            [resize]="true"
            [filter]="true"
            [eventScheduler]="calendarConfig"
            [eventSchedulerResources]="schedulerResources"
            [eventSchedulerEvents]="schedulerEvents"
            (event-scheduler-event-changed)="handleSchedulerEdit($event)"
          ></revo-grid>
        }
      }
    </section>
  `,
})
export class PlanningViewsGridComponent {
  theme = currentTheme().isDark() ? 'darkCompact' : 'compact';
  activeView: PlanningView = 'grid';
  tasks = createTasks();
  ganttAssignments = toGanttAssignments(this.tasks);
  schedulerEvents = toSchedulerEvents(this.tasks);
  readonly gridColumns = gridColumns;
  readonly ganttColumns = ganttColumns;
  readonly ganttConfig = ganttConfig;
  readonly ganttResources = ganttResources;
  readonly schedulerConfig = schedulerConfig;
  readonly calendarConfig = calendarConfig;
  readonly schedulerResources = schedulerResources;
  readonly ganttPlugins = [GanttPlugin];
  readonly schedulerPlugins = [EventSchedulerPlugin];
  readonly empty: never[] = [];

  handleGridEdit(event: CustomEvent) {
    this.setTasks(updateFromGrid(this.tasks, event.detail));
  }

  handleGanttEdit(event: CustomEvent<GanttBeforeTaskChangeDetail>) {
    this.setTasks(updateFromGantt(this.tasks, event.detail));
  }

  handleGanttAssignmentEdit(
    event: CustomEvent<GanttBeforeAssignmentChangeDetail>,
  ) {
    this.setTasks(updateFromGanttAssignment(this.tasks, event.detail));
  }

  handleSchedulerEdit(event: CustomEvent<EventSchedulerEventChangedDetail>) {
    this.setTasks(updateFromScheduler(this.tasks, event.detail));
  }

  private setTasks(tasks: PlanningTask[]) {
    this.tasks = tasks;
    this.ganttAssignments = toGanttAssignments(tasks);
    this.schedulerEvents = toSchedulerEvents(tasks);
  }
}
