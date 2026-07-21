# Core HR Grid

A free RevoGrid Core demo built as an HR dataset explorer. It demonstrates the same experience in Vanilla TypeScript, React, Vue, and Angular without using RevoGrid Pro or Enterprise.

## What it features

- Asynchronous generation of large HR datasets with loading progress
- Filtering, range selection, row headers, resizing, and grouped columns
- Custom cell rendering and a reusable color-select column type
- Date, numeral, and select column packages
- Dynamic columns and light/dark themes
- A small custom `BasePlugin` example for row-drag text

## Run it

```bash
pnpm dev          # Vanilla TypeScript
pnpm dev:react
pnpm dev:vue
pnpm dev:angular
```

Build variants use the matching `build:ts`, `build:react`, `build:vue`, and `build:angular` scripts.

## Main files

- `src/hr-demo.ts` — Vanilla TypeScript
- `src/hr-demo.react.tsx` — React
- `src/hr-demo.vue` — Vue
- `src/hr-demo.angular.ts` — Angular
- `src/sys-data/` — HR data and column definitions

This demo uses only free/core functionality. It is the baseline for comparing the Pro and Enterprise demos in this workspace.
