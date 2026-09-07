# RevoGrid Pro Advanced Filtering

An Order Explorer implemented in Vanilla TypeScript, React, Vue, and Angular.
It combines Core text and number filters with RevoGrid Pro structured filters,
selection, slider, date, expression, header, cascade, and global quick search.

## What it features

- Seventeen typed columns, including one contextual column for each of the
  fourteen built-in structured filter types
- Cross-column multi-word quick search (try `Lisbon pending`)
- Predefined High-value Europe, Recent expedited, and Review queue filters
- Selection values derived from rows matching filters on the other columns
- Token, fuzzy, regex, facet, badge, histogram, rating, statistical, calendar,
  relative, timeline, time-matrix, boolean, and array filter bodies
- Deterministic 1,000-order dataset and live visible-row count
- Shared Pro button and pill styles with 500-weight labels

## Run it

```bash
pnpm dev
pnpm dev:react
pnpm dev:vue
pnpm dev:angular
```

Build variants use `build:ts`, `build:react`, `build:vue`, and
`build:angular`. The default `pnpm build` produces the Vanilla TypeScript demo
used by the RevoGrid showcase gallery.

## Main files

- `src/filtering.ts` — Vanilla TypeScript
- `src/filtering.react.tsx` — React
- `src/filtering.vue` — Vue
- `src/filtering.angular.ts` — Angular
- `src/filtering.shared.ts` — stable shared facade for all four frameworks
- `src/filtering.structured.ts` — structured filter registrations and options
- `src/filtering.scss` — shared presentation

## Guided first entry

Open any of the four standalone runners with `?mode=first-entry`.
The documentation entry is `/demo/`. The explicit
`/demo/?experiment_variant=order-first-entry` URL remains supported for existing links.

Embed the same mode with:

- Vue: `<Filtering mode="first-entry" />`
- React: `<Filtering mode="first-entry" />`
- Angular: `<filtering-grid mode="first-entry" />`
- TypeScript: `load('#app', undefined, { mode: 'first-entry' })`

Choose **Review queue**, search **Northstar**, then select **Total ≥ $1,000**:
120 → 24 → 6 → 2 orders. Status is an alternative refinement. Each condition
can be removed separately. **Reset demo** restores the full snapshot, table
layout, sorting, scroll, search, filters, and guide progress, including pending search.
The fixed August 2026 dataset uses USD and consistent customer locations.

`first-entry.controller.ts` shares the public grid lifecycle and filter operations;
framework-specific `first-entry` views own their controls and subscriptions.
The `order-explorer-action` event reports only confirmed progress and result count;
`order-explorer-reset` clears the host guide. Neither includes search text.

The docs scenario navigation and trial context use the commercial catalog.
The full catalogue and Performance remain available at `/demo/?scenario=performance`.
Performance within the focused scenario navigation uses
`/demo/?experiment_variant=order-first-entry&scenario=performance`.
Trial retains the selected demo and experiment only, never the filter state.
