import { CONSTRUCTION_MODEL } from './data/model';
import { companyMasterSource, DEFAULT_LOOK_AHEAD, DEFAULT_LOOK_AHEAD_FILTERS, lookAheadSource, projectSource } from './data/projections';
import type {
  ConstructionScale,
  ConstructionTask,
  ConstructionView,
  LookAheadFilters,
  LookAheadPeriod,
  ProjectDepartmentFilter,
} from './types';

export const FEATURED_PROJECT = '2801';
export const DEPARTMENT_FILTERS = ['all', 'fabrication', 'installation'] as const;

export interface ConstructionWorkspaceState {
  view: ConstructionView;
  selectedProject: string;
  period: LookAheadPeriod;
  filters: LookAheadFilters;
  projectDepartment: ProjectDepartmentFilter;
  scale: ConstructionScale;
  tasks: ConstructionTask[];
  expandedRowIds: Set<string>;
  resourcesOpen: boolean;
}

export function createConstructionWorkspaceState(): ConstructionWorkspaceState {
  return {
    view: 'master',
    selectedProject: FEATURED_PROJECT,
    period: { ...DEFAULT_LOOK_AHEAD },
    filters: { ...DEFAULT_LOOK_AHEAD_FILTERS },
    projectDepartment: 'all',
    scale: 'day-week',
    tasks: [...CONSTRUCTION_MODEL.tasks],
    expandedRowIds: new Set(),
    resourcesOpen: false,
  };
}

export function constructionProjectName(projectRef: string): string {
  return CONSTRUCTION_MODEL.projects.find((project) => project.projectRef === projectRef)?.name
    || 'Project Schedule';
}

export function constructionSource(state: ConstructionWorkspaceState): ConstructionTask[] {
  if (state.view === 'master') return companyMasterSource(CONSTRUCTION_MODEL, state.tasks);
  if (state.view === 'lookahead') {
    return lookAheadSource(
      CONSTRUCTION_MODEL,
      state.selectedProject,
      state.period,
      state.filters,
      state.tasks,
    );
  }
  return projectSource(CONSTRUCTION_MODEL, state.selectedProject, state.tasks);
}

export function constructionWorkAreas(state: ConstructionWorkspaceState): string[] {
  const source = lookAheadSource(
    CONSTRUCTION_MODEL,
    state.selectedProject,
    state.period,
    { department: 'all', workArea: 'all' },
    state.tasks,
  );
  return [...new Set(source.map((task) => task.workArea).filter(Boolean))] as string[];
}

export function defaultExpandedRows(
  view: ConstructionView,
  selectedProject: string,
  source: ConstructionTask[],
): Set<string> {
  if (view === 'master') return new Set();
  if (view === 'lookahead') {
    const parentIds = new Set(source.map((task) => task.parentId).filter(Boolean));
    return new Set(source.filter((task) => parentIds.has(task.id)).map((task) => task.id));
  }

  const projectId = `project:${selectedProject}`;
  const installation = source.find((task) => (
    task.parentId === projectId
    && task.type === 'summary'
    && task.department === 'installation'
  ));
  return new Set([projectId, ...(installation ? [installation.id] : [])]);
}

export function departmentFilterLabel(value: typeof DEPARTMENT_FILTERS[number]): string {
  if (value === 'all') return 'All';
  return value[0].toUpperCase() + value.slice(1);
}
