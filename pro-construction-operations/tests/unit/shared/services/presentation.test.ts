import { describe, expect, it } from 'vitest';
import { constructionTaskBarVisual, resolveConstructionHierarchyRole } from '../../../../src/shared/services/presentation';

const rows = [
  { id: 'project:2801', parentId: null, type: 'summary', department: 'projects' },
  { id: 'phase:installation', parentId: 'project:2801', type: 'summary', department: 'installation' },
  { id: 'task:install', parentId: 'phase:installation', type: 'task', department: 'installation' },
  { id: 'lookahead:glass', parentId: 'task:install', type: 'task', department: 'installation' },
  { id: 'task:gate', parentId: 'phase:installation', type: 'milestone', department: 'installation' },
] as const;
const rowsById = new Map(rows.map((row) => [row.id, row]));

describe('construction hierarchy presentation', () => {
  it('distinguishes project, summary, task, subtask, and milestone rows', () => {
    expect(rows.map((row) => resolveConstructionHierarchyRole(row, rowsById as never))).toEqual([
      'project', 'summary', 'task', 'subtask', 'milestone',
    ]);
  });

  it('uses blue summaries and progressively quieter execution bars', () => {
    expect(constructionTaskBarVisual(rows[0], rowsById as never)).toMatchObject({ className: 'construction-gantt-bar--project', barColor: '#2563eb' });
    expect(constructionTaskBarVisual(rows[1], rowsById as never)).toMatchObject({ className: 'construction-gantt-bar--summary', barColor: '#3b82f6' });
    expect(constructionTaskBarVisual(rows[2], rowsById as never)).toMatchObject({ className: 'construction-gantt-bar--task', barColor: '#78909c' });
    expect(constructionTaskBarVisual(rows[3], rowsById as never)).toMatchObject({ className: 'construction-gantt-bar--subtask', barColor: '#94a3b8' });
  });
});
