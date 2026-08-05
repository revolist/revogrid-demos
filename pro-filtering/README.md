# RevoGrid Pro Advanced Filtering

An Order Explorer implemented in Vanilla TypeScript, React, Vue, and Angular.
It combines Core text and number filters with RevoGrid Pro selection, slider,
date, expression, header, cascade, global quick search, and active-filter badge workflows.

Add `?recipe=remote` to the live URL for the separate deterministic remote-filtering recipe. It switches between Pagination and Infinity Scroll and displays the complete transport payload, including multi-condition filters and normalized quick search.

## What it features

- Nine typed columns with consistent header icons and a wider Order date column
- Cross-column multi-word quick search (try `Lisbon pending`)
- Predefined High-value Europe, Recent expedited, and Review queue filters
- Selection values derived from rows matching filters on the other columns
- Reusable grid-synchronized badges with remove and clear actions
- Selection, slider, date, expression, text, and number operators
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
- `src/filtering.shared.ts` — data, columns, presets, filters, and badges
- `src/filtering.scss` — shared presentation
- `src/remote.*` — the separate remote Pagination/Infinity recipe
