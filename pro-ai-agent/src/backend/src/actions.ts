import type {
  AiActionDescriptor,
  AiGridActionName,
  AiDataActionName,
  AiIntegrationName,
} from '@revolist/revogrid-pro';

type BuiltInAction =
  | AiGridActionName
  | AiDataActionName
  | AiIntegrationName
  | 'cells.format'
  | 'cells.highlight'
  | 'grid.validate'
  | 'columns.add'
  | 'columns.remove'
  | 'columns.change'
  | 'view.switch'
  | 'view.back'
  | 'view.inspect'
  | 'pivot.read'
  | 'pivotCharts.inspect'
  | 'pivotCharts.update'
  | 'gantt.readTasks'
  | 'gantt.getChildren'
  | 'gantt.updateTask'
  | 'scheduler.readEvents'
  | 'scheduler.selectEvents'
  | 'scheduler.updateEvent'
  | 'kanban.readCards'
  | 'kanban.selectCards'
  | 'kanban.updateCard'
  | 'kanban.moveCards';
// Product actions are supplied by optional adapters owned by their product packages.

/** The server approves names; the browser advertises its available, typed capabilities. */
export const referenceActions: Record<BuiltInAction, true> = {
  'view.switch': true,
  'cells.format': true,
  'cells.highlight': true,
  'grid.validate': true,
  'view.back': true,
  'view.inspect': true,
  'grid.inspect': true,
  'grid.read': true,
  'grid.find': true,
  'grid.focus': true,
  'grid.select': true,
  'grid.aggregate': true,
  'grid.highlight': true,
  'grid.selectRecords': true,
  'columns.visibility': true,
  'columns.move': true,
  'columns.resize': true,
  'columns.pin': true,
  'columns.autosize': true,
  'grouping.set': true,
  'grouping.expand': true,
  'cells.update': true,
  'rows.add': true,
  'rows.duplicate': true,
  'rows.delete': true,
  'columns.add': true,
  'columns.remove': true,
  'columns.change': true,
  'formulas.apply': true,
  'data.import': true,
  'data.export': true,
  'charts.open': true,
  'pivot.configure': true,
  'pivot.read': true,
  'pivotCharts.inspect': true,
  'pivotCharts.update': true,
  'gantt.readTasks': true,
  'gantt.getChildren': true,
  'gantt.updateTask': true,
  'scheduler.readEvents': true,
  'scheduler.selectEvents': true,
  'scheduler.updateEvent': true,
  'kanban.readCards': true,
  'kanban.selectCards': true,
  'kanban.updateCard': true,
  'kanban.moveCards': true,
  'backend.run': true,
};

/** Descriptors carry no executable code. Execution and approval remain on the host. */
export function approveRequestedActions(input: unknown): AiActionDescriptor[] {
  if (input === undefined) return [];
  if (
    !Array.isArray(input) ||
    input.length > Object.keys(referenceActions).length
  )
    throw new Error('Invalid action capabilities.');
  const names = new Set<string>();
  return input.map((item) => {
    if (
      !item ||
      typeof item !== 'object' ||
      Object.keys(item).some(
        (key) => !['name', 'description', 'inputSchema'].includes(key),
      ) ||
      typeof item.name !== 'string' ||
      !Object.hasOwn(referenceActions, item.name) ||
      names.has(item.name) ||
      typeof item.description !== 'string' ||
      item.description.length > 4000 ||
      !item.inputSchema ||
      typeof item.inputSchema !== 'object' ||
      Array.isArray(item.inputSchema) ||
      item.inputSchema.type !== 'object'
    )
      throw new Error('Invalid action capabilities.');
    names.add(item.name);
    return {
      name: item.name,
      description: item.description,
      inputSchema: item.inputSchema,
    };
  });
}
