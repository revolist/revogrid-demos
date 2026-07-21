# Pro Excel Workbench

A spreadsheet-style RevoGrid Pro demo implemented in Vanilla TypeScript, React, Vue, and Angular.

## What it features

- Formula editing, named ranges, dependency highlighting, and computed cells
- XLSX import and export
- Undo/redo history
- Autofill with preview and custom fill strategy
- Multi-range selection and structured clipboard data
- Cell validation, merged cells, and same-value merging
- Advanced filtering and filter controls in headers
- Row ordering, advanced column movement, hiding, collapsing, and stretching
- Row and cell context menus, tooltips, and spreadsheet row headers
- Simulated collaborative cursors, live data updates, and cell flashes
- Pinned summary rows, dropdown columns, and readonly-cell guards

## Pro-only plugin stack

All plugins below come from `@revolist/revogrid-pro` and are instantiated by this demo:

- `AdvanceFilterPlugin`
- `AutoFillPlugin`
- `AutoFillPreviewPlugin`
- `CellFlashPlugin`
- `CellMergePlugin`
- `CellValidatePlugin`
- `ClipboardJsonPlugin`
- `CollaborativePresencePlugin`
- `ColumnCollapsePlugin`
- `ColumnHidePlugin`
- `ColumnMoveAdvancedPlugin`
- `ColumnStretchPlugin`
- `ContextMenuPlugin`
- `EventManagerPlugin`
- `ExportExcelPlugin`
- `FilterHeaderPlugin`
- `FormulaBarPlugin`
- `FormulaDependencyHighlightPlugin`
- `FormulaPlugin`
- `HistoryPlugin`
- `MultiRangeSelectionPlugin`
- `NamedRangesPlugin`
- `RowHeaderPlugin`
- `RowOrderPlugin`
- `SameValueMergePlugin`
- `TooltipPlugin`

The demo also uses the Pro `ColumnDropdown` column type. These Pro capabilities require the appropriate RevoGrid Pro license; the base grid behavior comes from RevoGrid Core.

## Run it

```bash
pnpm dev          # Vanilla TypeScript
pnpm dev:react
pnpm dev:vue
pnpm dev:angular
```

Build variants use the matching `build:ts`, `build:react`, `build:vue`, and `build:angular` scripts.

## Main files

- `src/excel.ts` — Vanilla TypeScript
- `src/excel.react.tsx` — React
- `src/excel.vue` — Vue
- `src/excel.angular.ts` — Angular
- `src/spreadsheet.shared.ts` — shared workbook configuration and UI logic
- `src/spreadsheet.presence.ts`, `spreadsheet.feed.ts`, and `spreadsheet.simulation.ts` — live-update simulations
