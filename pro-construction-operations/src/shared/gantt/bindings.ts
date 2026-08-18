import { GanttPlugin } from '@revolist/gantt';
import { rowHeaders } from '@revolist/revogrid-pro';
import { createConstructionColumns } from '../columns';
import { createBaseGridBindings } from '../base-grid';
import { CONSTRUCTION_MODEL } from '../data/model';
import { dependenciesFor, trimmedProjectRows } from '../data/projections';
import { constructionTaskBarVisual } from '../services/presentation';
import { validateConstructionHierarchyAction, validateConstructionProjectDrop } from '../services/validation';
import type { ConstructionGridBindings, ConstructionGridOptions } from '../grid';
import type { ConstructionTask } from '../types';

function createRowOrder(expandedRowIds: ReadonlySet<string>): any {
  return { prop: 'name', previewProp: 'name', validateDrop: (context: any) => {
    const store = context.dataItem.providers.data;
    const targetPhysicalIndex = store?.get?.('items')?.[context.targetRow];
    const targetRow = targetPhysicalIndex === undefined ? undefined : store?.get?.('source')?.[targetPhysicalIndex];
    return validateConstructionProjectDrop({ dropPosition: context.dropPosition, movedRows: [...context.items.values()], targetExpanded: Boolean(targetRow?.id && expandedRowIds.has(String(targetRow.id))), targetRow });
  } };
}

export function createGanttBindings(options: ConstructionGridOptions): ConstructionGridBindings {
  const source = options.sourceForView();
  const sourceById = new Map(source.map((task) => [task.id, task]));
  const isMaster = options.view === 'master';
  return {
    ...createBaseGridBindings(), plugins: [GanttPlugin],
    tree: { idField: 'id', parentIdField: 'parentId', rootParentId: null, expandedRowIds: new Set(options.expandedRowIds) },
    rowHeaders: { ...rowHeaders({ rowDrag: !isMaster }), size: 52 }, ...(isMaster ? {} : { rowOrder: createRowOrder(options.expandedRowIds) }), columns: createConstructionColumns(source, options),
    ganttResources: CONSTRUCTION_MODEL.resources, ganttAssignments: CONSTRUCTION_MODEL.assignments, ganttCalendars: CONSTRUCTION_MODEL.calendars, ganttDependencies: dependenciesFor(source),
    gantt: { id: options.view === 'master' ? 'pebblestone-company-master' : `pebblestone-${options.selectedProject}`, name: options.view === 'master' ? 'Pebblestone Company Master' : options.projectName, version: '1', currency: 'AUD', timeZone: 'Australia/Sydney', primaryCalendarId: 'cal-site_mon_fri', updatedAt: '2026-08-17T08:00:00Z', contextMenu: { colorPalette: false, hidden: { add: isMaster, convertToMilestone: isMaster, delete: true, indent: ({ taskIds, tasks }: { taskIds: readonly string[]; tasks: readonly ConstructionTask[] }) => isMaster || !validateConstructionHierarchyAction('indent', taskIds, tasks).valid, outdent: ({ taskIds, tasks }: { taskIds: readonly string[]; tasks: readonly ConstructionTask[] }) => isMaster || !validateConstructionHierarchyAction('outdent', taskIds, tasks).valid } }, zoomPreset: options.view === 'lookahead' ? 'day-week' : options.scale, ...(options.view === 'lookahead' ? { timelineRange: { startDate: options.period.start, endDate: options.period.end } } : {}), scrollToTaskOnCellClick: true, visuals: { ...(options.view === 'lookahead' ? { timeRanges: [{ id: 'lookahead-window', name: 'Active 2-week period', startDate: options.period.start, endDate: options.period.end, color: '#6d96a3' }] } : {}), taskBarColorHook: ({ row }: any) => constructionTaskBarVisual(row, sourceById) } },
    ganttTaskEditorDialog: { readOnly: false, menuItemName: 'Edit…' },
    ...(options.view === 'project' ? { trimmedRows: trimmedProjectRows(source, options.projectDepartment) } : {}), source,
  };
}
