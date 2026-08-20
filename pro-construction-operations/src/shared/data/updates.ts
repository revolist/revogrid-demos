import type { ConstructionTask, LookAheadPeriod } from '../types';
import { CONSTRUCTION_MODEL } from './model';

export function moveLookAheadPeriod(period: LookAheadPeriod, direction: -1 | 1): LookAheadPeriod { const move = (date: string) => { const next = new Date(`${date}T00:00:00Z`); next.setUTCDate(next.getUTCDate() + direction * 14); return next.toISOString().slice(0, 10); }; return { start: move(period.start), end: move(period.end) }; }
export function applyConstructionTaskPatch(tasks: ConstructionTask[], detail: any): ConstructionTask[] {
  if (detail?.taskId == null) return tasks;
  // Grid mutations include a source patch. The task editor submits its canonical
  // field changes, so accept those too when a framework event omits sourcePatch.
  const patch = detail.sourcePatch ?? (detail.action === 'edit' ? detail.changes : undefined);
  if (!patch || Object.keys(patch).length === 0) return tasks;

  const project = CONSTRUCTION_MODEL.projects.find((item) => item.id === String(detail.taskId));
  if (project) {
    for (const field of ['name', 'startDate', 'endDate', 'percentDone', 'notes'] as const) {
      if (field in patch) project[field] = patch[field] as never;
    }
    // Project rows are intentionally separate from task rows. Return a new task
    // collection so every framework re-projects the edited project summary.
    return [...tasks];
  }

  return tasks.map((task) => task.id === String(detail.taskId) ? { ...task, ...patch } : task);
}
