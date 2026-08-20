import type { ConstructionTask } from '../types';

export type ConstructionHierarchyRole = 'project' | 'summary' | 'task' | 'subtask' | 'milestone';

type HierarchyRow = Pick<ConstructionTask, 'id' | 'parentId' | 'type' | 'department'> & {
  taskKind?: ConstructionTask['type'];
};

export function resolveConstructionHierarchyRole(
  row: HierarchyRow,
  rowsById: ReadonlyMap<string, HierarchyRow>,
): ConstructionHierarchyRole {
  if (row.id.startsWith('project:')) return 'project';
  if (row.taskKind === 'summary' || row.type === 'summary') return 'summary';
  if (row.taskKind === 'milestone' || row.type === 'milestone') return 'milestone';

  const parent = row.parentId ? rowsById.get(row.parentId) : undefined;
  if (parent && parent.type !== 'summary' && !parent.id.startsWith('project:')) return 'subtask';
  return 'task';
}

export function constructionTaskBarVisual(
  row: HierarchyRow,
  rowsById: ReadonlyMap<string, HierarchyRow>,
) {
  const role = resolveConstructionHierarchyRole(row, rowsById);
  if (role === 'project') return { className: 'construction-gantt-bar--project', barColor: '#2563eb', progressColor: '#1d4ed8', borderColor: '#1d4ed8', textColor: '#fff' };
  if (role === 'summary') return { className: 'construction-gantt-bar--summary', barColor: '#3b82f6', progressColor: '#2563eb', borderColor: '#2563eb', textColor: '#fff' };

  const installation = row.department === 'installation';
  if (role === 'subtask') return installation
    ? { className: 'construction-gantt-bar--subtask', barColor: '#94a3b8', progressColor: '#64748b', borderColor: '#64748b', textColor: '#0f172a' }
    : { className: 'construction-gantt-bar--subtask', barColor: '#5eead4', progressColor: '#0f766e', borderColor: '#14b8a6', textColor: '#134e4a' };
  if (role === 'milestone') return installation
    ? { className: 'construction-gantt-bar--milestone', barColor: '#64748b', progressColor: '#475569', borderColor: '#475569', textColor: '#fff' }
    : { className: 'construction-gantt-bar--milestone', barColor: '#14b8a6', progressColor: '#0f766e', borderColor: '#0f766e', textColor: '#fff' };
  return installation
    ? { className: 'construction-gantt-bar--task', barColor: '#78909c', progressColor: '#526b78', borderColor: '#526b78', textColor: '#fff' }
    : { className: 'construction-gantt-bar--task', barColor: '#14b8a6', progressColor: '#0f766e', borderColor: '#0f766e', textColor: '#134e4a' };
}
