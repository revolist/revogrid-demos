# Advanced Gantt

An Enterprise project-planning demo implemented in Vanilla TypeScript, React, Vue, and Angular.

## What it features

- Hierarchical project tasks with editable task-table columns
- Dependency links, resources, assignments, calendars, and baselines
- Critical-path and baseline visibility controls
- Summary and milestone tasks with completion state
- Custom task-bar content, colors, assignee badges, and task icons
- Configurable hidden columns and row status presentation
- Range selection, column resizing, and Excel export support

## Enterprise feature inventory

`GanttPlugin` comes from `@revolist/revogrid-enterprise` and owns the synchronized task table and project timeline.

| Gantt capability | Benefit demonstrated here |
| --- | --- |
| Hierarchical tasks, summaries, milestones, and an add-task row | Represents a real work-breakdown structure and lets users extend the plan in place. |
| Dependency links and scheduling rules | Makes task order explicit and supports schedule-aware planning instead of disconnected date fields. |
| Working calendars and holiday-aware duration | Keeps task duration aligned with actual working time. |
| Resources, assignments, capacity, and cost data | Connects schedule dates to the people and cost required to deliver the work. |
| Baseline snapshots and status date | Lets planners compare the current plan with its approved reference point. |
| Critical-path highlighting | Shows which linked tasks directly control the project finish date. |
| Today line, non-working-time shading, and milestone lines | Adds timeline context and makes important dates visible at a glance. |
| Critical-path and baseline visibility controls | Lets users reduce visual noise or focus on schedule risk as needed. |
| Task-bar content and color hooks | Adds assignee badges, completion colors, task icons, and cleaner summary bars while retaining native Gantt behavior. |
| `createDefaultTaskTableColumn` | Reuses Gantt-aware WBS, task, assignee, cost, date, duration, predecessor, successor, and status column behavior. |
| `isGanttAddTaskRow` | Keeps the completion control readonly on the synthetic add-task row, preventing an invalid status edit. |

## Auto-installed Gantt dependency stack

`GanttPlugin` installs and reuses its dependency plugins internally. They should not be duplicated in the demo's `plugins` array.

| Package | Auto-installed plugin | Benefit inside Gantt |
| --- | --- | --- |
| Pro | `OverlayPlugin` | Hosts Gantt overlays and editor surfaces above the virtualized grid. |
| Pro | `EventManagerPlugin` | Coordinates task-table edits through one event lifecycle. |
| Pro | `HistoryPlugin` | Captures task and dependency mutations for undo and redo integration. |
| Pro | `TooltipPlugin` | Provides task and dependency details on hover. |
| Pro | `ContextMenuPlugin` | Powers task and timeline actions in contextual menus. |
| Pro | `RowOrderPlugin` | Supports drag-based task reordering while Gantt keeps hierarchy and schedule state synchronized. |
| Pro | `TreeDataPlugin` | Projects parent-child task hierarchy with expand and collapse behavior. |
| Pro | `ColumnHidePlugin` | Applies the demo's default hidden task-table columns without rebuilding column definitions. |
| Pro | `ColumnDialogPlugin` | Provides Gantt-aware column visibility management. |
| Enterprise | `GanttPanelResizePlugin` | Manages the resizable split between the task table and timeline. |
| Enterprise | `GanttTaskEditorDialogPlugin` | Supplies the full task-editing dialog used by Gantt actions. |
| Enterprise | `GanttAddTaskRowPlugin` | Renders and manages the pinned row for creating a new task. |
| Enterprise | `GanttTimelineHeaderPlugin` | Renders the day/week timeline scale for the active zoom preset. |
| Enterprise | `GanttTaskBarsPlugin` | Renders and interacts with task bars, including the demo's content and color hooks. |
| Enterprise | `GanttDependencyOverlayPlugin` | Draws and updates dependency connectors over the timeline. |

`GanttPlugin` can also auto-install `AdvanceFilterPlugin` when task-table filtering is enabled. This demo does not set the grid `filter` property, so that optional dependency is not part of its runtime stack.

## Directly registered Pro features

The demo adds two more plugins from `@revolist/revogrid-pro` alongside `GanttPlugin`:

| Pro plugin | How this demo uses it and why it helps |
| --- | --- |
| `ExportExcelPlugin` | Makes the task-table data available for XLSX export, giving teams an offline or shareable project snapshot through the plugin API. |
| `RowStatusPlugin` | Turns the `done` field into a source-backed completion checkbox and applies completed-row presentation without maintaining parallel UI state. |

Gantt requires an Enterprise entitlement, while Excel export, row status, and the shared Pro dependency stack require Pro functionality. Range selection and column resizing shown by the demo are base-grid capabilities rather than additional Pro plugins.

## Run it

```bash
pnpm dev          # Vanilla TypeScript
pnpm dev:react
pnpm dev:vue
pnpm dev:angular
```

Build variants use the matching `build:ts`, `build:react`, `build:vue`, and `build:angular` scripts. Run `pnpm test` for the Gantt data/configuration tests.

## Main files

- `src/gantt.ts` — Vanilla TypeScript
- `src/gantt.react.tsx` — React
- `src/gantt.vue` — Vue
- `src/gantt.angular.ts` — Angular
- `src/shared/gantt-project-data.ts` — public fixture/configuration barrel
- `src/shared/gantt-showcase-data.ts` — tasks, dependencies, resources, assignments, and baselines
- `src/shared/gantt-showcase-columns.ts` — task-table columns and task-bar renderers
