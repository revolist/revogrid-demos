import type { PlanningFilters, PlanningProjectId, PlanningTask } from './types';
import { getOwnerAvatar } from './fixtures';

export const planningProjects: ReadonlyArray<{ id: PlanningProjectId; label: string }> = [
  { id: 'customer-portal', label: 'Customer portal' },
  { id: 'billing-platform', label: 'Billing platform' },
  { id: 'internal-tools', label: 'Internal tools' },
];

export const defaultPlanningFilters = (): PlanningFilters => ({
  query: '', projectId: 'all', statuses: [], priorities: [],
});

export function filterPlanningTasks(tasks: readonly PlanningTask[], filters: PlanningFilters): PlanningTask[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return tasks.filter((task) => (
    (!query || task.name.toLocaleLowerCase().includes(query) || task.owner.toLocaleLowerCase().includes(query))
    && (filters.projectId === 'all' || task.projectId === filters.projectId)
    && (!filters.statuses.length || filters.statuses.includes(String(task.workflowStatus)))
    && (!filters.priorities.length || filters.priorities.includes(Number(task.priority)))
  ));
}

export function mergeVisibleTasks(canonical: readonly PlanningTask[], visible: readonly PlanningTask[]): PlanningTask[] {
  const updates = new Map(visible.map((task) => [task.id, task]));
  return canonical.map((task) => updates.get(task.id) ?? task);
}

export function selectedPlanningTaskIds(
  visible: readonly PlanningTask[],
  selectedIndexes: { forEach(callback: (indexes: Iterable<number>) => void): void },
): Set<string> {
  const ids = new Set<string>();
  selectedIndexes.forEach((indexes) => {
    for (const index of indexes) {
      const task = visible[index];
      if (task) ids.add(task.id);
    }
  });
  return ids;
}

export async function toggleVisiblePlanningRows(
  event: MouseEvent,
  selectedCount: number,
  visibleCount: number,
): Promise<boolean> {
  const path = event.composedPath();
  if (!path.some(node => node instanceof Element && node.matches('.rgHeaderCell.cell-checkbox'))) return false;
  const grid = path.find(node => node instanceof HTMLElement && node.tagName === 'REVO-GRID') as HTMLRevoGridElement | undefined;
  if (!grid) return false;

  event.preventDefault();
  event.stopPropagation();
  const plugins = await grid.getPlugins();
  const rowSelection = plugins.find(plugin => 'setSelectedIndexes' in plugin) as {
    setSelectedIndexes(type: 'rgRow', indexes: Iterable<number>): void;
  } | undefined;
  if (!rowSelection) return false;

  rowSelection.setSelectedIndexes(
    'rgRow',
    selectedCount < visibleCount ? Array.from({ length: visibleCount }, (_, index) => index) : [],
  );
  return true;
}

export function applyPlanningGridEdit(
  tasks: PlanningTask[],
  detail: { model?: { id?: unknown }; prop?: unknown; val?: unknown },
): PlanningTask[] {
  const prop = String(detail.prop ?? '');
  if (!['name', 'owner', 'workflowStatus', 'percentDone'].includes(prop)) return tasks;
  const taskId = detail.model?.id;
  if (taskId === undefined || taskId === null) return tasks;
  return tasks.map((task) => {
    if (task.id !== String(taskId)) return task;
    const value = prop === 'percentDone'
      ? Math.max(0, Math.min(100, Number(detail.val ?? 0)))
      : String(detail.val ?? '');
    return {
      ...task,
      [prop]: value,
      ...(prop === 'owner' ? {
        ownerAvatar: getOwnerAvatar(String(value)),
        owners: [String(value)],
        ownerAvatars: [getOwnerAvatar(String(value))],
      } : {}),
    };
  });
}
