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

## Enterprise-only plugin

- `GanttPlugin` from `@revolist/revogrid-enterprise` — timeline rendering, task hierarchy, dependencies, resources, assignments, calendars, baselines, critical path, and Gantt-specific grid properties

## Pro-only plugin stack

- `ExportExcelPlugin` — exports project-grid data to Excel
- `RowStatusPlugin` — renders and manages row status presentation

Gantt requires an Enterprise entitlement, while export and row-status enhancements require Pro functionality.

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
