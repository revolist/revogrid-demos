import { describe, expect, it } from 'vitest';
import { parseCsv } from '../../../../src/shared/data/csv';
import { buildConstructionModel, CONSTRUCTION_MODEL } from '../../../../src/shared/data/model';
import { companyMasterSource, DEFAULT_LOOK_AHEAD, lookAheadSource, projectSource, trimmedProjectRows } from '../../../../src/shared/data/projections';
import { applyConstructionTaskPatch, moveLookAheadPeriod } from '../../../../src/shared/data/updates';
import { schedulerEventsFor, schedulerResourcesFor } from '../../../../src/shared/scheduler/projection';
import { applySchedulerTaskChanges } from '../../../../src/shared/scheduler/updates';

describe('Pebblestone construction CSV adapter', () => {
  it('parses malformed notes by joining surplus fields', () => {
    expect(parseCsv('id,notes\n1,calendar day, not working day')).toEqual([{ id: '1', notes: 'calendar day, not working day' }]);
  });
  it('keeps source counts, unique namespaced ids and separate projects', () => {
    expect(CONSTRUCTION_MODEL.projects).toHaveLength(3); expect(CONSTRUCTION_MODEL.tasks.filter((task) => task.entityKind === 'task')).toHaveLength(38);
    const ids = CONSTRUCTION_MODEL.tasks.map(({ id }) => id); expect(new Set(ids).size).toBe(ids.length); expect(CONSTRUCTION_MODEL.projects.map(({ name }) => name)).toContain('Riverbank Apartments');
  });
  it('links hierarchy, dependencies, resources and diagnostics', () => {
    const riverbank = projectSource(CONSTRUCTION_MODEL, '2801'); const glass = riverbank.find((task) => task.name === 'Install glass panels L1 East')!;
    expect(glass.parentId).toBe('task:2801:22'); expect(CONSTRUCTION_MODEL.dependencies).toHaveLength(26); expect(CONSTRUCTION_MODEL.dependencies.every((dependency) => riverbank.some((task) => task.id === dependency.predecessorTaskId) || dependency.predecessorTaskId.startsWith('task:2814:'))).toBe(true);
    expect(CONSTRUCTION_MODEL.assignments.some((assignment) => assignment.taskId === glass.id && assignment.resourceId.includes('install-crew-a'))).toBe(true); expect(CONSTRUCTION_MODEL.diagnostics.orphanLookAheadRows).toEqual(['9', '10']); expect(CONSTRUCTION_MODEL.diagnostics.residualTaskIds).toContain('task:2801:22:residual');
  });
  it('projects Master without operational subtasks and keeps Look-Ahead parents without project phases', () => {
    const master = companyMasterSource(CONSTRUCTION_MODEL);
    expect(master.filter((task) => task.id.startsWith('project:'))).toHaveLength(3);
    expect(master.some((task) => task.source === 'lookahead')).toBe(false);
    const source = lookAheadSource(CONSTRUCTION_MODEL, '2801', DEFAULT_LOOK_AHEAD, { department: 'installation', workArea: 'Level 1 East' });
    const ids = new Set(source.map(({ id }) => id));
    expect(ids).toContain('task:2801:lookahead:3');
    expect(ids).toContain('task:2801:22');
    expect(ids).not.toContain('task:2801:20');
    expect(ids).not.toContain('project:2801');
    expect(ids).not.toContain('task:2801:lookahead:8');
    expect(source.find((task) => task.id === 'task:2801:22')?.parentId).toBeNull();
    expect(source.every((task) => task.parentId == null || ids.has(String(task.parentId)))).toBe(true);
  });
  it('moves windows in exact two-week increments and preserves cross-view task patches', () => {
    expect(moveLookAheadPeriod(DEFAULT_LOOK_AHEAD, 1)).toEqual({ start: '2026-08-31', end: '2026-09-13' }); const changed = applyConstructionTaskPatch(CONSTRUCTION_MODEL.tasks, { taskId: 'task:2801:lookahead:3', sourcePatch: { endDate: '2026-09-02', percentDone: 58 } });
    expect(projectSource(CONSTRUCTION_MODEL, '2801', changed).find((task) => task.id === 'task:2801:lookahead:3')).toMatchObject({ endDate: '2026-09-02', percentDone: 58 }); expect(projectSource(CONSTRUCTION_MODEL, '2814', changed).find((task) => task.name === 'Issue purchase order - louvre system')?.endDate).toBe('2026-08-21');
  });
  it('persists task-editor changes when the editor emits canonical fields', () => {
    const changed = applyConstructionTaskPatch(CONSTRUCTION_MODEL.tasks, {
      action: 'edit',
      taskId: 'task:2801:lookahead:3',
      changes: { name: 'Install glass panels L1 East — revised' },
    });
    expect(changed.find((task) => task.id === 'task:2801:lookahead:3')?.name).toBe('Install glass panels L1 East — revised');
  });
  it('persists project-summary edits separately from task records', () => {
    const project = CONSTRUCTION_MODEL.projects.find((item) => item.id === 'project:2814')!;
    const originalName = project.name;
    try {
      const changed = applyConstructionTaskPatch(CONSTRUCTION_MODEL.tasks, {
        action: 'edit', taskId: project.id, sourcePatch: { name: 'Civic Health Precinct — revised' },
      });
      expect(changed).not.toBe(CONSTRUCTION_MODEL.tasks);
      expect(project.name).toBe('Civic Health Precinct — revised');
    } finally {
      project.name = originalName;
    }
  });
  it('keeps ancestors in project department filters', () => {
    const source = projectSource(CONSTRUCTION_MODEL, '2801');
    const trimmed = trimmedProjectRows(source, 'fabrication');
    const visible = source.filter((_, index) => !trimmed[index]);
    expect(visible.some((task) => task.name === 'Fabrication')).toBe(true);
    expect(visible.some((task) => task.name === 'Installation')).toBe(false);
    expect(visible.some((task) => task.id === 'project:2801')).toBe(true);
  });
  it('projects assigned project work into Scheduler and patches the canonical task', () => {
    const source = projectSource(CONSTRUCTION_MODEL, '2801');
    const resources = schedulerResourcesFor(source);
    const events = schedulerEventsFor(source);
    const glass = events.find((event) => event.id === 'task:2801:lookahead:3')!;
    expect(resources.some((resource) => resource.id === glass.resourceId)).toBe(true);
    expect(glass.startDateTime).toContain('2026-08-27');
    const changed = applySchedulerTaskChanges(CONSTRUCTION_MODEL.tasks, { events: [{ ...glass, endDateTime: '2026-09-04T00:00:00+10:00' }] });
    expect(changed.find((task) => task.id === glass.id)?.endDate).toBe('2026-09-03');
  });
  it('does not create metadata for an unmatched source project', () => { const model = buildConstructionModel(); expect(model.projects.some((project) => project.projectRef === '2776')).toBe(false); });
});
