# Advanced Scheduler

An Enterprise event and shift-scheduling workspace implemented in Vanilla TypeScript, React, Vue, and Angular.

## What it features

- Calendar and resource timeline views plus a synchronized table view
- Day, week, and month navigation with a Today action
- Resource lanes, event selection, search highlighting, and calendar presets
- Event creation, manual events, open shifts, and reassignment
- Team avatars, workspace navigation, and responsive scheduling UI
- Advanced filtering and polished supporting table behavior

## Enterprise-only plugin

- `EventSchedulerPlugin` from `@revolist/revogrid-enterprise` — scheduler layout, events, resources, selection, calendar navigation, and scheduler-specific grid properties

## Pro-only plugin stack

The supporting table uses:

- `AdvanceFilterPlugin`
- `ColumnStretchPlugin`
- `RowOddPlugin`

Scheduler requires an Enterprise entitlement, while these supporting grid enhancements require Pro functionality.

## Run it

```bash
pnpm dev          # Vanilla TypeScript
pnpm dev:react
pnpm dev:vue
pnpm dev:angular
```

Build variants use the matching `build:ts`, `build:react`, `build:vue`, and `build:angular` scripts. Run `pnpm test` for the scheduler data/configuration tests.

## Main files

- `src/scheduler.ts` — Vanilla TypeScript
- `src/scheduler.react.tsx` — React
- `src/scheduler.vue` — Vue
- `src/scheduler.angular.ts` — Angular
- `src/data.ts` — events, resources, views, navigation, and scheduler configuration
- `src/resource-range.ts` and `src/time-label.ts` — scheduler presentation helpers
