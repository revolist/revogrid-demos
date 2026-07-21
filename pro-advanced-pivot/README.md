# Advanced Financial Pivot

An Enterprise financial-analysis demo that combines RevoGrid Pivot with Pro grid plugins across Vanilla TypeScript, React, Vue, and Angular.

## What it features

- Configurable row, column, value, and filter dimensions
- Sales, profitability, and product-performance presets
- Sum, average, minimum, and maximum aggregations
- Expand/collapse drill-down, grouped aggregations, subtotals, and grand totals
- Collapsible pivot column groups and multi-row headers
- Dimension sorting, text/number/selection filters, and header filter controls
- Currency, numeric, integer, and heatmap column types
- Responsive configurator, KPI header, guidance panel, reset, and expanded view

## Enterprise feature inventory

| Enterprise API | How this demo uses it and why it helps |
| --- | --- |
| `PivotPlugin` | Builds the pivot model and configurator, turns dimensions into row and column axes, supports drill-down, and produces grouped aggregations, subtotals, and grand totals. This lets users reshape the same financial data without a new report. |
| `filterPivotSource` | Applies the active pivot filter selections before modeling and KPI calculation, keeping the grid, header metrics, and guidance panel consistent. |

The demo configures `PivotPlugin` with three reusable financial presets, sortable dimensions, selectable filters, expanded or collapsed row groups, column-group totals, and sum, average, minimum, or maximum value choices.

## Pro feature inventory

Every directly registered item below comes from `@revolist/revogrid-pro`.

| Pro plugin or API | How this demo uses it and why it helps |
| --- | --- |
| `AdvanceFilterPlugin` | Adds selection, text, and numeric filter choices to pivot dimensions so users can isolate a market, product, period, or value range. |
| `ColumnCollapsePlugin` | Collapses generated period or market column groups into aggregate placeholder columns, preserving useful totals while saving width. |
| `FilterHeaderPlugin` | Places filter controls in the generated headers so filtering stays close to the data being analyzed. |
| `MultiRowHeaderPlugin` | Renders the pivot's nested column groups as clear multi-level headers instead of a flat, ambiguous label row. |
| `RowOddPlugin` | Adds stable row striping hooks that improve readability across dense pivot output. |
| `RowSelectPlugin` | Enables checkbox-based row selection for workflows that need to act on selected pivot rows. |
| `SameValueMergePlugin` | Hides repeated adjacent row-axis labels, making Country, Segment, and Product groupings easier to scan. |
| `commonAggregators` | Supplies the standard sum, average, minimum, and maximum calculations used by the financial dimensions and presets. |
| `mergeCellProperties` | Composes heatmap styling with existing cell properties, so value intensity cues do not overwrite other pivot styling. |

`ColumnCollapsePlugin` automatically installs `ColumnGroupRenderSyncPlugin`. The companion keeps generated pivot-group header indexes correct as aggregate columns are collapsed or expanded; it does not need to be added to `FINANCIAL_SHOWCASE_PLUGINS`.

`SameValueMergePlugin` can automatically install `StickyCellsPlugin` for columns that opt into sticky same-value merging. This pivot uses normal same-value merging, so that optional companion is not installed here.

Currency, number, and integer formatting comes from `@revolist/revogrid-column-numeral`; the Pro heatmap column types add value-intensity coloring on top. Pivot requires an Enterprise entitlement, while the supporting grid features require Pro functionality.

## Run it

```bash
pnpm dev          # Vanilla TypeScript
pnpm dev:react
pnpm dev:vue
pnpm dev:angular
```

Build variants use the matching `build:ts`, `build:react`, `build:vue`, and `build:angular` scripts.

## Main files

- `src/pivot.ts` — Vanilla TypeScript
- `src/pivot.react.tsx` — React
- `src/pivot.vue` — Vue
- `src/pivot.angular.ts` — Angular
- `src/financial.pivot.ts` — dimensions, presets, aggregations, and plugin configuration
- `src/financial-pivot-header/` — standalone KPI/header component
- `src/financial-dataset.ts` — financial source data
