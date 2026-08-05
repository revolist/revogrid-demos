# RevoGrid Pro Row Master

A project portfolio explorer implemented in Vanilla TypeScript, React, Vue,
and Angular. It migrates the maintained Row Master example into the standalone
`revogrid-demos` gallery.

## What it features

- Virtualized master-detail overlays that span the grid viewport
- Tree Data and Row Master working together in one hierarchy
- Expand controls on leaf initiatives while parent rows retain tree controls
- Async project risk, review, and staffing details
- Responsive detail cards with milestones, progress, ownership, and team data
- Direct `masterRow` and `tree` property configuration

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

- `src/row-master.ts` — Vanilla TypeScript
- `src/row-master.react.tsx` — React
- `src/row-master.vue` — Vue
- `src/row-master.angular.ts` — Angular
- `src/row-master.shared.ts` — project hierarchy, columns, and detail template
