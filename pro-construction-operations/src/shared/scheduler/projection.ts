import type { ConstructionModel, ConstructionTask } from '../types';
import { CONSTRUCTION_MODEL } from '../data/model';

export function schedulerResourcesFor(source: ConstructionTask[], model = CONSTRUCTION_MODEL) {
  const taskIds = new Set(source.map(({ id }) => id));
  const resourceIds = new Set(model.assignments.filter((assignment) => taskIds.has(String(assignment.taskId))).map((assignment) => String(assignment.resourceId)));
  return model.resources.filter((resource) => resourceIds.has(String(resource.id))).map((resource) => ({ id: resource.id, name: resource.name, role: resource.role, color: resource.role === 'crew' ? '#26837e' : '#2c6883' }));
}

export function schedulerEventsFor(source: ConstructionTask[], model = CONSTRUCTION_MODEL) {
  const exclusiveEnd = (date: string) => { const next = new Date(`${date.slice(0, 10)}T00:00:00Z`); next.setUTCDate(next.getUTCDate() + 1); return next.toISOString().slice(0, 10); };
  const assignmentByTask = new Map(model.assignments.map((assignment) => [String(assignment.taskId), assignment]));
  return source.flatMap((task) => {
    const assignment = assignmentByTask.get(task.id);
    if (!assignment || task.type === 'summary') return [];
    return [{ id: task.id, resourceId: String(assignment.resourceId), title: String(task.name), startDateTime: `${String(task.startDate).slice(0, 10)}T00:00:00+10:00`, endDateTime: `${exclusiveEnd(String(task.endDate))}T00:00:00+10:00`, status: task.workflowStatus, color: task.department === 'fabrication' ? '#26837e' : '#2c6883' }];
  });
}
