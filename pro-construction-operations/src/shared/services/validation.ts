type ConstructionDropRow = { id?: unknown; parentId?: unknown; projectRef?: unknown };
type ConstructionTaskRow = { id: string; parentId?: string | null; projectRef?: string };

export interface ConstructionProjectDropContext {
  dropPosition: 'before' | 'inside' | 'after';
  movedRows: readonly ConstructionDropRow[];
  targetExpanded: boolean;
  targetRow?: ConstructionDropRow;
}

export type ConstructionProjectDropValidation =
  | { valid: true }
  | { valid: false; reason: string };

export type ConstructionHierarchyAction = 'indent' | 'outdent';

function validateConstructionParent(task: ConstructionDropRow, parent: ConstructionDropRow | null): ConstructionProjectDropValidation {
  const taskIsProject = String(task.id ?? '').startsWith('project:');
  if (taskIsProject && parent) return { valid: false, reason: 'Projects must remain at Company Master level.' };
  if (!taskIsProject && (!parent || !parent.projectRef || parent.projectRef !== task.projectRef)) {
    return { valid: false, reason: 'Tasks must remain inside their project.' };
  }
  return { valid: true };
}

export function validateConstructionProjectDrop({
  dropPosition,
  movedRows,
  targetExpanded,
  targetRow,
}: ConstructionProjectDropContext): ConstructionProjectDropValidation {
  const parent = !targetRow
    ? null
    : dropPosition === 'inside' || (dropPosition === 'after' && targetExpanded)
      ? targetRow
      : targetRow.parentId == null
        ? null
        : movedRows.find((row) => row.id === targetRow.parentId) ?? { id: targetRow.parentId, projectRef: targetRow.projectRef };
  return movedRows.reduce<ConstructionProjectDropValidation>((result, task) => result.valid
    ? validateConstructionParent(task, parent)
    : result, { valid: true });
}

export function validateConstructionHierarchyAction(
  action: ConstructionHierarchyAction,
  taskIds: readonly string[],
  tasks: readonly ConstructionTaskRow[],
): ConstructionProjectDropValidation {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  return taskIds.reduce<ConstructionProjectDropValidation>((result, taskId) => {
    if (!result.valid) return result;
    const task = byId.get(taskId);
    if (!task) return { valid: false, reason: 'Task was not found.' };
    const parent = action === 'indent'
      ? { id: 'proposed-parent', projectRef: task.projectRef }
      : task.parentId ? byId.get(task.parentId) ?? null : null;
    const nextParent = action === 'outdent' && parent ? (parent.parentId ? byId.get(parent.parentId) ?? null : null) : parent;
    return validateConstructionParent(task, nextParent);
  }, { valid: true });
}

export function allowsConstructionTaskChange(
  detail: { action?: unknown; taskId?: unknown },
  tasks: readonly ConstructionTaskRow[],
  blockHierarchy = false,
): boolean {
  if (blockHierarchy && (detail.action === 'indent' || detail.action === 'outdent')) return false;
  if (detail.action !== 'indent' && detail.action !== 'outdent') return true;
  return validateConstructionHierarchyAction(detail.action, [String(detail.taskId)], tasks).valid;
}
