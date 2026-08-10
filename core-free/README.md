# Core HR Grid

A free RevoGrid Core demo built as an HR dataset explorer. It demonstrates the same experience in Vanilla TypeScript, React, Vue, and Angular without using RevoGrid Pro or Enterprise.

## Demo preview

[![Core HR Grid walkthrough](./assets/core-free-walkthrough.gif)](./assets/core-free-walkthrough.mp4)

_Click the animated preview to open the full-quality MP4._

## What it features

- Time-budgeted, cache-backed preparation of large HR datasets with loading progress
- Live browser performance metrics separating data preparation from grid apply-to-paint time, plus scroll smoothness normalized to a 60 FPS ceiling and page heap sampling every second while visible
- Browser-local Save view and Reset view controls for dataset, theme, column order and widths, sorting, and filters
- Filtering, single-column sorting, Shift-click multi-column sorting, range selection, row headers, resizing, and grouped columns
- Custom cell rendering and a reusable color-select column type
- Date, numeral, and select column packages
- Dynamic columns and a selector for every built-in and modern preset theme
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

- `src/hr.ts` — Vanilla TypeScript
- `src/hr.react.tsx` — React
- `src/hr.vue` — Vue
- `src/hr.angular.ts` — Angular
- `src/sys-data/` — HR data and column definitions

This demo uses only free/core functionality. It is the baseline for comparing the Pro and Enterprise demos in this workspace.
