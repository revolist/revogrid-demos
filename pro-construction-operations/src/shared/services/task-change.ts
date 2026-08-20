import { applyConstructionTaskPatch } from '../data/updates';
import { allowsConstructionTaskChange } from './validation';
import type { ConstructionTask } from '../types';

export interface ConstructionTaskChangeResult {
  accepted: boolean;
  tasks: ConstructionTask[];
  refreshProjection: boolean;
}

const STRUCTURAL_TASK_ACTIONS = new Set([
  'create', 'delete', 'indent', 'outdent', 'convert-to-milestone',
]);

/**
 * Gantt applies ordinary task-store patches incrementally. A source refresh is
 * only required when the mutation changes the active hierarchy/projection.
 */
export function applyConstructionTaskChange(
  detail: any,
  tasks: ConstructionTask[],
  isMaster: boolean,
): ConstructionTaskChangeResult {
  if (!allowsConstructionTaskChange(detail, tasks, isMaster)) {
    return { accepted: false, tasks, refreshProjection: false };
  }
  const patch = detail?.sourcePatch ?? detail?.changes;
  const refreshProjection = STRUCTURAL_TASK_ACTIONS.has(detail?.action)
    || Boolean(patch && ('parentId' in patch || 'type' in patch || 'id' in patch));
  return {
    accepted: true,
    tasks: applyConstructionTaskPatch(tasks, detail),
    refreshProjection,
  };
}
