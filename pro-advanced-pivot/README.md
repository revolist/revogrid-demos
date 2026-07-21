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

## Enterprise-only plugin

- `PivotPlugin` from `@revolist/revogrid-enterprise` — pivot modeling, configurator, drill-down, aggregations, totals, and pivot-specific grid properties

## Pro-only plugin stack

- `AdvanceFilterPlugin`
- `ColumnCollapsePlugin`
- `FilterHeaderPlugin`
- `MultiRowHeaderPlugin`
- `RowOddPlugin`
- `RowSelectPlugin`
- `SameValueMergePlugin`

The demo also uses Pro `commonAggregators`. Pivot requires an Enterprise entitlement, while the supporting plugins require Pro functionality.

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
