import type { ConstructionTask } from '../types';

export function applySchedulerTaskChanges(tasks: ConstructionTask[], detail: any): ConstructionTask[] {
  const events = new Map((detail?.events ?? []).map((event: any) => [String(event.id), event]));
  return tasks.map((task) => {
    const event: any = events.get(task.id);
    return event ? { ...task, name: event.title ?? task.name, startDate: String(event.startDateTime).slice(0, 10), endDate: (() => { const value = String(event.endDateTime); if (!value.includes('T00:00')) return value.slice(0, 10); const end = new Date(`${value.slice(0, 10)}T00:00:00Z`); end.setUTCDate(end.getUTCDate() - 1); return end.toISOString().slice(0, 10); })(), workflowStatus: event.status ?? task.workflowStatus } : task;
  });
}
