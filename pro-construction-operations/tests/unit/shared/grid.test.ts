import { describe, expect, it } from 'vitest';
import { CONSTRUCTION_MODEL } from '../../../src/shared/data/model';
import { applyConstructionTaskChange } from '../../../src/shared/services/task-change';

describe('construction task update projection policy', () => {
  const taskId = 'task:2801:lookahead:3';

  it('patches ordinary Gantt edits without refreshing the active source', () => {
    for (const detail of [
      { action: 'move', taskId, sourcePatch: { startDate: '2026-08-28', endDate: '2026-09-03' } },
      { action: 'resize', taskId, sourcePatch: { endDate: '2026-09-04' } },
      { action: 'progress', taskId, sourcePatch: { percentDone: 58 } },
      { action: 'edit', taskId, changes: { name: 'Install glass panels L1 East — revised' } },
    ]) {
      const result = applyConstructionTaskChange(detail, CONSTRUCTION_MODEL.tasks, false);
      expect(result.accepted).toBe(true);
      expect(result.refreshProjection).toBe(false);
      expect(result.tasks).not.toBe(CONSTRUCTION_MODEL.tasks);
    }
  });

  it('requests a projection refresh for hierarchy-changing operations', () => {
    const result = applyConstructionTaskChange(
      { action: 'indent', taskId, sourcePatch: { parentId: 'task:2801:21' } },
      CONSTRUCTION_MODEL.tasks,
      false,
    );
    expect(result).toMatchObject({ accepted: true, refreshProjection: true });
  });

  it('blocks hierarchy changes from Company Master', () => {
    const result = applyConstructionTaskChange(
      { action: 'outdent', taskId, sourcePatch: { parentId: null } },
      CONSTRUCTION_MODEL.tasks,
      true,
    );
    expect(result).toMatchObject({ accepted: false, refreshProjection: false, tasks: CONSTRUCTION_MODEL.tasks });
  });
});
