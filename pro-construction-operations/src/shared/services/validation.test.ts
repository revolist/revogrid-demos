import { describe, expect, it } from 'vitest';
import { allowsConstructionTaskChange, validateConstructionHierarchyAction, validateConstructionProjectDrop } from './validation';

const riverbank = { id: 'project:2801' };
const civic = { id: 'project:2814' };
const phase = { id: 'task:2801:20', parentId: 'project:2801', projectRef: '2801' };

describe('construction project row-order validation', () => {
  it('allows project reordering at the Company Master root', () => {
    expect(validateConstructionProjectDrop({
      dropPosition: 'before',
      movedRows: [riverbank],
      targetExpanded: false,
      targetRow: civic,
    })).toEqual({ valid: true });
  });

  it('rejects project drops that would create a parent', () => {
    expect(validateConstructionProjectDrop({
      dropPosition: 'inside',
      movedRows: [riverbank],
      targetExpanded: false,
      targetRow: civic,
    })).toEqual({ valid: false, reason: 'Projects must remain at Company Master level.' });
    expect(validateConstructionProjectDrop({
      dropPosition: 'after',
      movedRows: [riverbank],
      targetExpanded: true,
      targetRow: civic,
    })).toEqual({ valid: false, reason: 'Projects must remain at Company Master level.' });
    expect(validateConstructionProjectDrop({
      dropPosition: 'inside',
      movedRows: [riverbank, phase],
      targetExpanded: false,
      targetRow: phase,
    })).toEqual({ valid: false, reason: 'Projects must remain at Company Master level.' });
    expect(validateConstructionProjectDrop({
      dropPosition: 'before',
      movedRows: [riverbank],
      targetExpanded: false,
      targetRow: phase,
    })).toEqual({ valid: false, reason: 'Projects must remain at Company Master level.' });
  });

  it('rejects a task drop into another project', () => {
    expect(validateConstructionProjectDrop({
      dropPosition: 'inside',
      movedRows: [phase],
      targetExpanded: false,
      targetRow: { ...civic, projectRef: '2814' },
    })).toEqual({ valid: false, reason: 'Tasks must remain inside their project.' });
  });

  it('keeps Project Schedule tasks under their selected project root', () => {
    const project = { id: 'project:2801', projectRef: '2801' };
    const sibling = { id: 'task:2801:21', parentId: 'project:2801', projectRef: '2801' };
    const otherProject = { id: 'project:2814', projectRef: '2814' };
    expect(validateConstructionProjectDrop({
      dropPosition: 'inside', movedRows: [phase], targetExpanded: false, targetRow: project,
    })).toEqual({ valid: true });
    expect(validateConstructionProjectDrop({
      dropPosition: 'before', movedRows: [phase], targetExpanded: false, targetRow: project,
    })).toEqual({ valid: false, reason: 'Tasks must remain inside their project.' });
    expect(validateConstructionProjectDrop({
      dropPosition: 'inside', movedRows: [phase], targetExpanded: false, targetRow: otherProject,
    })).toEqual({ valid: false, reason: 'Tasks must remain inside their project.' });
    expect(validateConstructionProjectDrop({
      dropPosition: 'after', movedRows: [phase], targetExpanded: false, targetRow: sibling,
    })).toEqual({ valid: true });
  });

  it('keeps Company Master projects at the root and project tasks inside their project', () => {
    const tasks = [
      { id: 'project:2801', parentId: null, projectRef: '2801' },
      { id: 'task:2801:phase', parentId: 'project:2801', projectRef: '2801' },
      { id: 'task:2801:activity', parentId: 'task:2801:phase', projectRef: '2801' },
    ];
    expect(validateConstructionHierarchyAction('indent', ['project:2801'], tasks)).toEqual({ valid: false, reason: 'Projects must remain at Company Master level.' });
    expect(validateConstructionHierarchyAction('outdent', ['task:2801:phase'], tasks)).toEqual({ valid: false, reason: 'Tasks must remain inside their project.' });
    expect(validateConstructionHierarchyAction('outdent', ['task:2801:activity'], tasks)).toEqual({ valid: true });
    expect(allowsConstructionTaskChange({ action: 'outdent', taskId: 'task:2801:phase' }, tasks)).toBe(false);
    expect(allowsConstructionTaskChange({ action: 'resize', taskId: 'task:2801:phase' }, tasks)).toBe(true);
    expect(allowsConstructionTaskChange({ action: 'resize', taskId: 'task:2801:phase' }, tasks, true)).toBe(true);
    expect(allowsConstructionTaskChange({ action: 'indent', taskId: 'task:2801:activity' }, tasks, true)).toBe(false);
  });
});
