import type { ConstructionModel, ConstructionTask, LookAheadFilters, LookAheadPeriod, ProjectDepartmentFilter } from '../types';
import { CONSTRUCTION_MODEL, projectRow } from './model';

export const DEFAULT_LOOK_AHEAD: LookAheadPeriod = { start: '2026-08-17', end: '2026-08-30' };
export const DEFAULT_LOOK_AHEAD_FILTERS: LookAheadFilters = { department: 'all', workArea: 'all' };

export function projectSource(model: ConstructionModel, projectRef: string, tasks = model.tasks): ConstructionTask[] { const project = model.projects.find((item) => item.projectRef === projectRef)!; return [projectRow(project), ...tasks.filter((task) => task.projectRef === projectRef)]; }
export function companyMasterSource(model: ConstructionModel, tasks = model.tasks): ConstructionTask[] { return model.projects.flatMap((project) => [projectRow(project), ...tasks.filter((task) => task.projectRef === project.projectRef && task.entityKind === 'task')]); }
export function lookAheadSource(model: ConstructionModel, projectRef: string, period: LookAheadPeriod, filters: LookAheadFilters, tasks = model.tasks): ConstructionTask[] {
  const projectTasks = tasks.filter((task) => task.projectRef === projectRef);
  const detail = projectTasks.filter((task) => task.source === 'lookahead' && task.type !== 'summary' && String(task.startDate) <= period.end && String(task.endDate) >= period.start && (filters.department === 'all' || task.department === filters.department) && (filters.workArea === 'all' || task.workArea === filters.workArea));
  const detailIds = new Set(detail.map(({ id }) => id)); const parentIds = new Set(detail.map(({ parentId }) => String(parentId)));
  return projectTasks.filter((task) => detailIds.has(task.id) || parentIds.has(task.id)).map((task) => parentIds.has(task.id) ? { ...task, parentId: null } : task);
}
export function dependenciesFor(source: ConstructionTask[], dependencies = CONSTRUCTION_MODEL.dependencies) { const ids = new Set(source.map(({ id }) => id)); return dependencies.filter((dependency) => ids.has(String(dependency.predecessorTaskId)) && ids.has(String(dependency.successorTaskId))); }
export function trimmedProjectRows(source: ConstructionTask[], department: ProjectDepartmentFilter): Record<number, boolean> { if (department === 'all') return {}; const included = new Set<string>(); const byId = new Map(source.map((task) => [task.id, task])); for (const task of source) { if (task.department !== department || task.type === 'summary') continue; let current: ConstructionTask | undefined = task; while (current) { included.add(current.id); current = current.parentId ? byId.get(String(current.parentId)) : undefined; } } return Object.fromEntries(source.map((task, index) => [index, !included.has(task.id)])); }
