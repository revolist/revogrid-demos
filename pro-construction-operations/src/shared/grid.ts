import { createGanttBindings } from './gantt/bindings';
import { applyConstructionTaskPatch } from './data/updates';
import { dependenciesFor, trimmedProjectRows } from './data/projections';
import { createSchedulerBindings } from './scheduler/bindings';
import { applySchedulerTaskChanges } from './scheduler/updates';
import { allowsConstructionTaskChange } from './services/validation';
import type { ConstructionScale, ConstructionTask, ConstructionView, LookAheadPeriod, ProjectDepartmentFilter } from './types';

export interface ConstructionGridOptions {
  view: ConstructionView;
  resourcesOpen: boolean;
  selectedProject: string;
  projectName: string;
  period: LookAheadPeriod;
  scale: ConstructionScale;
  projectDepartment: ProjectDepartmentFilter;
  tasks: ConstructionTask[];
  expandedRowIds: ReadonlySet<string>;
  sourceForView: () => ConstructionTask[];
  openProject: (projectRef: string) => void;
  setTasks: (tasks: ConstructionTask[]) => void;
  setExpandedRowIds: (ids: Set<string>) => void;
}

export type ConstructionGridMount = (container: HTMLElement, options: ConstructionGridOptions) => void | (() => void);
export interface ConstructionGridBindings { source: ConstructionTask[]; [property: string]: any; }

export function createConstructionGridBindings(options: ConstructionGridOptions): ConstructionGridBindings {
  return options.resourcesOpen && options.view !== 'master'
    ? createSchedulerBindings(options.sourceForView(), options)
    : createGanttBindings(options);
}

export function configureConstructionGrid(grid: HTMLRevoGridElement, options: ConstructionGridOptions): () => void {
  let active = true;
  grid.className = 'construction-fabrication__grid skip-style cell-border';
  const { source, ...properties } = createConstructionGridBindings(options);
  Object.assign(grid, properties);

  if (options.resourcesOpen && options.view !== 'master') {
    const handleSchedulerChange = (event: Event) => {
      const nextTasks = applySchedulerTaskChanges(options.tasks, (event as CustomEvent).detail);
      options.tasks = nextTasks;
      options.setTasks(nextTasks);
    };
    grid.addEventListener('event-scheduler-event-changed', handleSchedulerChange);
    grid.source = source;
    return () => grid.removeEventListener('event-scheduler-event-changed', handleSchedulerChange);
  }

  const handleTreeStateChange = (event: Event) => {
    const nextIds = (event as CustomEvent<{ expandedRowIds: Set<string> }>).detail.expandedRowIds;
    const controlledIds = options.expandedRowIds as Set<string>;
    controlledIds.clear();
    nextIds.forEach((id) => controlledIds.add(id));
    options.setExpandedRowIds(controlledIds);
  };
  const handleTaskChange = (event: Event) => {
    const change = (event as CustomEvent).detail;
    if (!allowsConstructionTaskChange(change, options.tasks, options.view === 'master')) {
      event.preventDefault();
      return;
    }
    const nextTasks = applyConstructionTaskPatch(options.tasks, change);
    if (nextTasks === options.tasks) return;
    options.tasks = nextTasks;
    options.setTasks(nextTasks);
    queueMicrotask(() => {
      if (!active) return;
      const nextSource = options.sourceForView();
      grid.ganttDependencies = dependenciesFor(nextSource);
      if (options.view === 'project') grid.trimmedRows = trimmedProjectRows(nextSource, options.projectDepartment);
      grid.source = nextSource;
    });
  };
  grid.addEventListener('tree-state-changed', handleTreeStateChange);
  grid.addEventListener('gantt-before-task-change', handleTaskChange);
  grid.source = source;
  return () => {
    active = false;
    grid.removeEventListener('tree-state-changed', handleTreeStateChange);
    grid.removeEventListener('gantt-before-task-change', handleTaskChange);
  };
}

export const mountConstructionGrid: ConstructionGridMount = (container, options) => {
  const grid = document.createElement('revo-grid') as HTMLRevoGridElement;
  container.appendChild(grid);
  return configureConstructionGrid(grid, options);
};
