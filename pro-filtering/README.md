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
