# Pro Excel Workbench

A spreadsheet-style RevoGrid Pro demo implemented in Vanilla TypeScript, React, Vue, and Angular.

## What it features

- Formula editing, named ranges, dependency highlighting, and computed cells
- XLSX export
- Undo/redo history
- Autofill with preview and custom fill strategy
- Multi-range selection and structured clipboard data
- Cell validation, merged cells, and same-value merging
- Advanced filtering and filter controls in headers
- Row ordering, advanced column movement, hiding, collapsing, and stretching
- Row and cell context menus, tooltips, and spreadsheet row headers
- Simulated collaborative cursors, live data updates, and cell flashes
- Pinned summary rows, dropdown columns, and readonly-cell guards

## Pro feature inventory

Every plugin in this table comes from `@revolist/revogrid-pro` and is registered directly by all four framework variants.

| Pro plugin | How this demo uses it and why it helps |
| --- | --- |
| `AdvanceFilterPlugin` | Adds selection, text, number, and range-aware filtering so users can narrow a workbook with richer rules than a basic text match. |
| `AutoFillPlugin` | Fills dragged ranges with detected sequences or repeated values; the demo also registers a currency-aware copy strategy for faster budget entry. |
| `AutoFillPreviewPlugin` | Shows the values that autofill will create before the user commits the drag, reducing accidental bulk edits. |
| `CellFlashPlugin` | Highlights simulated live-feed and collaborator edits, including directional change cues, so changing values are easy to spot. |
| `CellMergePlugin` | Combines configured adjacent cells into larger spreadsheet regions while keeping focus and range behavior merge-aware. |
| `CellValidatePlugin` | Rejects negative currency edits and adds an inline error indicator plus tooltip, protecting workbook data quality. |
| `CollaborativePresencePlugin` | Renders simulated remote cursors, ranges, users, and edits without taking over the local user's focus or history. |
| `ColumnCollapsePlugin` | Lets users collapse related budget columns into a compact placeholder, reducing horizontal clutter. |
| `ColumnHidePlugin` | Supports runtime column visibility changes so users can tailor the workbook to the fields they need. |
| `ColumnMoveAdvancedPlugin` | Provides group-aware drag-and-drop column reordering while protecting grouped-column boundaries. |
| `ColumnStretchPlugin` | Expands columns into unused grid width, keeping the workbook readable across container sizes. |
| `ContextMenuPlugin` | Supplies contextual row and column commands for actions such as insert, delete, copy, filter, hide, and pin. |
| `EventManagerPlugin` | Centralizes edit events so validation, history, formulas, and change feedback can react to the same edit lifecycle. |
| `ExportExcelPlugin` | Exports the current workbook to XLSX, including the demo's workbook and sheet naming configuration. |
| `FilterHeaderPlugin` | Places filter controls directly in column headers for quick, discoverable filtering. |
| `FormulaBarPlugin` | Keeps an external formula bar synchronized with the focused cell's raw value and writes edits back through the grid. |
| `FormulaDependencyHighlightPlugin` | Highlights precedent cells for the focused formula, making calculations easier to understand and audit. |
| `FormulaPlugin` | Evaluates and renders formula cells, including formulas that reference named ranges. |
| `HistoryPlugin` | Tracks edits for keyboard and toolbar undo/redo, allowing users to recover from mistakes. |
| `MultiRangeSelectionPlugin` | Enables Ctrl/Cmd multi-range selection and includes disjoint ranges in clipboard operations. |
| `NamedRangesPlugin` | Owns reusable range and constant names, updates references as structure changes, and makes formulas more readable. |
| `RowHeaderPlugin` | Adds interactive spreadsheet-style row headers for row focus, selection, and drag actions. |
| `RowOrderPlugin` | Enables guarded drag-and-drop row reordering while keeping pinned totals fixed. |
| `SameValueMergePlugin` | Visually suppresses repeated adjacent values in configured columns, making grouped records easier to scan. |
| `TooltipPlugin` | Displays contextual help and validation details on hover without permanently occupying grid space. |

### Pro plugins installed automatically

These companion plugins are not repeated in the demo's `plugins` array. Their owning Pro plugins install and reuse them internally when needed.

| Auto-installed plugin | Installed by | Benefit in this demo |
| --- | --- | --- |
| `ColumnGroupRenderSyncPlugin` | `ColumnCollapsePlugin`, `ColumnHidePlugin`, and `ColumnMoveAdvancedPlugin` | Keeps grouped-header indexes synchronized as columns are collapsed, hidden, or moved. |
| `MultiRangeClipboardPlugin` | `MultiRangeSelectionPlugin` | Serializes every selected range and restores sparse multi-range clipboard data on paste. |
| `MultiRangeCrossViewportAutoFillPlugin` | `MultiRangeSelectionPlugin` | Carries selection and autofill gestures across pinned and main grid viewports with a correct preview and commit. |

`SameValueMergePlugin` can also install `StickyCellsPlugin` when a column opts into sticky same-value merging. This workbook does not enable that option, so it is not part of this demo's runtime stack.

### Other Pro APIs used

| Pro API | Benefit in this demo |
| --- | --- |
| `ColumnDropdown` | Provides reusable dropdown column types for Department and Status, limiting edits to valid named-range values. |
| `createFormulaConditionalCellProperties` | Applies formula-aware conditional styling to calculated variance cells. |
| `createNamedRangeDropdown` | Connects dropdown choices to named ranges so formulas and editors share one source of truth. |
| `rowHeaders` | Builds the numbered row-header configuration and enables row dragging from the header. |
| `columnTypeRenderer` | Renders the compact column-type indicator used in the custom header. |
| `validationRenderer` | Adds inline validation feedback to the demo's composed cell templates. |
| `cellFlashArrowTemplate` | Adds up/down change arrows to live-update flashes. |
| `progressLineWithValueRenderer` | Shows target attainment as an immediately readable progress bar plus value. |
| `sparklineRenderer` | Turns trend values into compact in-cell charts. |

These capabilities require the appropriate RevoGrid Pro license; base grid rendering, editing, pinning, and virtualization come from RevoGrid Core. XLSX export is provided by `ExportExcelPlugin`.

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
