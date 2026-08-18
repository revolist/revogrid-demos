import type { ConstructionDepartment, ConstructionModel, ConstructionTask, ProjectEntity } from '../types';
import tasksCsv from '../../csv/tasks.csv?raw';
import resourcesCsv from '../../csv/resources.csv?raw';
import lookAheadCsv from '../../csv/lookahead.csv?raw';
import dependenciesCsv from '../../csv/dependencies.csv?raw';
import { parseCsv } from './csv';

const departmentLabel: Record<ConstructionDepartment, string> = { projects: 'Project', fabrication: 'Fabrication', installation: 'Installation', procurement: 'Procurement', external: 'External' };
const asNumber = (value: string | undefined) => Number(value || 0);
const taskId = (projectRef: string, id: string) => `task:${projectRef}:${id}`;
const projectId = (projectRef: string) => `project:${projectRef}`;
const mapDepartment = (value: string): ConstructionDepartment => value === 'construction' ? 'installation' : value === 'fabrication' || value === 'procurement' || value === 'external' ? value : 'projects';
const status = (source: string, percent: number) => percent >= 100 ? 'done' : source === 'open' ? 'blocked' : source === 'in_progress' || source === 'confirmed' || percent > 0 ? 'in-progress' : 'not-started';
const resourceKey = (name: string) => `resource:${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

export function projectRow(project: ProjectEntity): ConstructionTask {
  return { id: project.id, parentId: null, projectRef: project.projectRef, legacyTaskId: project.legacyTaskId, entityKind: 'task', source: 'master', name: project.name, type: 'summary', startDate: project.startDate, endDate: project.endDate, percentDone: project.percentDone, workflowStatus: status('', project.percentDone), statusLabel: status('', project.percentDone), calendarId: 'cal-office_mon_fri', department: 'projects', departmentLabel: 'Project', notes: project.notes, tags: ['project'] };
}

export function buildConstructionModel(input = { tasksCsv, resourcesCsv, lookAheadCsv, dependenciesCsv }): ConstructionModel {
  const sourceTasks = parseCsv(input.tasksCsv); const sourceResources = parseCsv(input.resourcesCsv); const lookAhead = parseCsv(input.lookAheadCsv); const sourceDependencies = parseCsv(input.dependenciesCsv);
  const projectSource = sourceTasks.filter(({ type }) => type === 'project');
  const projects: ProjectEntity[] = projectSource.map((row) => ({ id: projectId(row.project_ref), projectRef: row.project_ref, legacyTaskId: row.id, name: row.name, startDate: row.start, endDate: row.finish, percentDone: asNumber(row.percent_complete), notes: row.notes }));
  const projectRefs = new Set(projects.map(({ projectRef }) => projectRef));
  const resources = sourceResources.map((row) => ({ id: resourceKey(row.name), name: row.name, role: row.type, calendarId: `cal-${row.calendar || 'office_mon_fri'}`, allocationCapacity: 100, hourlyCost: 0, headcount: asNumber(row.headcount), capacityHoursPerDay: asNumber(row.capacity_hours_per_day), costBasis: row.cost_basis, notes: row.notes }));
  const resourceByName = new Map(resources.map((resource) => [resource.name, resource]));
  const canonical = sourceTasks.filter(({ type }) => type !== 'project').map((row): ConstructionTask => {
    const department = mapDepartment(row.department); const parentId = row.parent_id ? (projectSource.some((project) => project.id === row.parent_id) ? projectId(row.project_ref) : taskId(row.project_ref, row.parent_id)) : null;
    return { id: taskId(row.project_ref, row.id), parentId, projectRef: row.project_ref, legacyTaskId: row.id, entityKind: 'task', source: 'master', name: row.name, type: row.type === 'phase' ? 'summary' : row.type === 'milestone' ? 'milestone' : 'task', startDate: row.start, endDate: row.finish, percentDone: asNumber(row.percent_complete), workflowStatus: status('', asNumber(row.percent_complete)), statusLabel: status('', asNumber(row.percent_complete)), calendarId: `cal-${resourceByName.get(row.owner)?.calendarId?.replace(/^cal-/, '') || 'office_mon_fri'}`, department, departmentLabel: departmentLabel[department], resourceName: row.owner, wbs: row.wbs, notes: row.notes, tags: [row.wbs, department] };
  });
  const masterByLegacy = new Map(canonical.filter((task) => task.legacyTaskId).map((task) => [`${task.projectRef}:${task.legacyTaskId}`, task]));
  const generated: ConstructionTask[] = []; const orphanLookAheadRows: string[] = []; const residualTaskIds: string[] = []; const constraintsByProject = new Map<string, string>();
  for (const row of lookAhead) {
    if (!projectRefs.has(row.project_ref)) { orphanLookAheadRows.push(row.id); continue; }
    const master = row.master_task_id ? masterByLegacy.get(`${row.project_ref}:${row.master_task_id}`) : undefined;
    let parentId = master?.id;
    if (!parentId) {
      let constraintId = constraintsByProject.get(row.project_ref);
      if (!constraintId) { constraintId = `task:${row.project_ref}:constraints`; constraintsByProject.set(row.project_ref, constraintId); generated.push({ id: constraintId, parentId: projectId(row.project_ref), projectRef: row.project_ref, entityKind: 'context', source: 'lookahead', name: 'Constraints & logistics', type: 'summary', startDate: row.start, endDate: row.finish, percentDone: 0, workflowStatus: 'not-started', statusLabel: 'Not started', calendarId: 'cal-site_mon_fri', department: 'projects', departmentLabel: 'Project', tags: ['constraints'] }); }
      parentId = constraintId;
    }
    const department = row.crew_or_party === 'Workshop Crew' ? 'fabrication' : 'installation';
    generated.push({ id: `task:${row.project_ref}:lookahead:${row.id}`, parentId, projectRef: row.project_ref, legacyTaskId: row.master_task_id || undefined, entityKind: master ? 'execution' : 'context', source: 'lookahead', name: row.name, type: row.activity_type === 'delivery' || row.activity_type === 'inspection' ? 'milestone' : 'task', startDate: row.start, endDate: row.finish, percentDone: row.status === 'in_progress' ? 45 : 0, workflowStatus: status(row.status, 0), statusLabel: row.status.replace('_', ' '), calendarId: `cal-${resourceByName.get(row.crew_or_party === 'Hired EWP' ? 'Hired EWP - scissor lift' : row.crew_or_party)?.calendarId?.replace(/^cal-/, '') || 'site_mon_fri'}`, department, departmentLabel: departmentLabel[department], workArea: row.work_area, resourceName: row.crew_or_party, originalStatus: row.status, legacyPushToMaster: row.push_to_master, notes: row.notes, tags: [row.work_area, row.activity_type] });
  }
  for (const master of canonical.filter((task) => task.type === 'task')) {
    const details = generated.filter((task) => task.parentId === master.id && task.entityKind === 'execution');
    if (!details.length) continue;
    const starts = details.map(({ startDate }) => String(startDate)); const ends = details.map(({ endDate }) => String(endDate));
    if (Math.min(...starts.map(Date.parse)) > Date.parse(String(master.startDate)) || Math.max(...ends.map(Date.parse)) < Date.parse(String(master.endDate))) {
      const id = `${master.id}:residual`; residualTaskIds.push(id);
      generated.push({ ...master, id, parentId: master.id, name: 'Remaining scheduled scope (generated)', entityKind: 'supplemental', generated: true, source: 'lookahead', startDate: String(master.startDate), endDate: String(master.endDate), percentDone: Math.max(0, 100 - Number(master.percentDone || 0)), workflowStatus: 'not-started', statusLabel: 'Remaining scope', tags: ['residual-scope'] });
    }
  }
  const tasks = [...canonical, ...generated];
  const assignments = tasks.flatMap((task) => { const name = task.resourceName === 'Hired EWP' ? 'Hired EWP - scissor lift' : task.resourceName; const resource = resourceByName.get(name || ''); return resource ? [{ id: `assignment:${task.id}:${resource.id}`, taskId: task.id, resourceId: resource.id, allocationUnits: 100, responsibility: 'assigned' }] : []; });
  const dependencies = sourceDependencies.map((row) => ({ id: `dependency:${row.id}`, predecessorTaskId: taskId(sourceTasks.find((task) => task.id === row.predecessor_id)!.project_ref, row.predecessor_id), successorTaskId: taskId(sourceTasks.find((task) => task.id === row.successor_id)!.project_ref, row.successor_id), type: row.type === 'SS' ? 'start-to-start' : 'finish-to-start', lagDays: asNumber(row.lag_days), notes: row.notes }));
  const calendars = [{ id: 'cal-office_mon_fri', name: 'Office Mon–Fri', workingDays: [1, 2, 3, 4, 5], holidays: [], hoursPerDay: 8 }, { id: 'cal-workshop_mon_fri', name: 'Workshop Mon–Fri', workingDays: [1, 2, 3, 4, 5], holidays: [], hoursPerDay: 8 }, { id: 'cal-site_mon_fri', name: 'Site Mon–Fri', workingDays: [1, 2, 3, 4, 5], holidays: [], hoursPerDay: 8 }, { id: 'cal-site_mon_sat', name: 'Site Mon–Sat', workingDays: [1, 2, 3, 4, 5, 6], holidays: [], hoursPerDay: 10 }, { id: 'cal-supplier_lead_time', name: 'Supplier lead time', workingDays: [1, 2, 3, 4, 5], holidays: [], hoursPerDay: 8 }, { id: 'cal-builder_programme', name: 'Builder programme', workingDays: [1, 2, 3, 4, 5], holidays: [], hoursPerDay: 8 }];
  return { projects, tasks, dependencies, resources, assignments, calendars, diagnostics: { orphanLookAheadRows, residualTaskIds } };
}

export const CONSTRUCTION_MODEL = buildConstructionModel();
