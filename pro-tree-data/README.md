# RevoGrid Pro Tree Data

An organization explorer implemented in Vanilla TypeScript, React, Vue, and
Angular. It moves the maintained Tree Data example into the standalone
`revogrid-demos` gallery while keeping all framework variants aligned.

## What it features

- Flat `id` and `parentId` records projected into an expandable hierarchy
- Expand all, collapse all, and animated branch transitions
- Sticky parent rows that can be toggled at runtime
- Tree-aware row selection and drag-and-drop ordering
- Selection filters, sorting, range selection, and column resizing
- Styled avatars, status badges, and currency values
- Excel export through the public `ExportExcelPlugin` instance

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

- `src/tree.ts` — Vanilla TypeScript
- `src/tree.react.tsx` — React
- `src/tree.vue` — Vue
- `src/tree.angular.ts` — Angular
- `src/tree.shared.ts` — rows, columns, plugins, and shared configuration
- `src/tree.scss` — shared presentation
