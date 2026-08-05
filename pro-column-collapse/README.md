# RevoGrid Pro Column Collapse

A grouped contact workspace implemented in Vanilla TypeScript, React, Vue, and
Angular. It migrates the maintained Column Collapse example into the standalone
`revogrid-demos` gallery.

## What it features

- Expandable and collapsible grouped column headers
- Initially collapsed Personal Information and Contact groups
- Sealed Age, Street, and Email columns that remain visible
- Advanced filtering, filter headers, row selection, and alternating rows
- Responsive light and dark presentation
- Deterministic contact data shared by all four framework variants

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

- `src/column-collapse.ts` — Vanilla TypeScript
- `src/column-collapse.react.tsx` — React
- `src/column-collapse.vue` — Vue
- `src/column-collapse.angular.ts` — Angular
- `src/column-collapse.shared.ts` — shared contacts and grouped columns
