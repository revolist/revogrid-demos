<div align="center">

# RevoGrid Demos

**Production-style examples for RevoGrid Core, Pro, and Pro Advance.**

[![RevoGrid](https://img.shields.io/badge/RevoGrid-Demos-1f6feb?style=for-the-badge)](https://github.com/revolist/revogrid)
[![Frameworks](https://img.shields.io/badge/Frameworks-TS_%7C_React_%7C_Vue_%7C_Angular-8250df?style=for-the-badge)](#framework-support)
[![Demos](https://img.shields.io/badge/Showcases-5-2ea44f?style=for-the-badge)](#demo-catalog)

</div>

## About

This repository contains focused source examples for [RevoGrid](https://github.com/revolist/revogrid). The demos cover the free Core grid, the Pro spreadsheet experience, and advanced Pivot, Scheduler, and Gantt use cases.

Every showcase provides equivalent implementations for the major supported frontend approaches, making it easier to compare integrations or adapt an example to an existing application.

## Demo catalog

| Edition | Demo | Highlights | Source |
| --- | --- | --- | --- |
| **Core** | HR data grid | Async large-data loading, grouped columns, custom cell templates, column types, row drag handling, and light/dark themes | [`core-free/`](./core-free/) |
| **Pro** | Spreadsheet workbench | Formula bar, XLSX import/export, history, autofill, multi-range selection, merged cells, validation, context menus, and collaborative presence simulation | [`pro-excel/`](./pro-excel/) |
| **Pro Advance** | Financial pivot | Financial presets, configurable row and column axes, filtering, KPIs, heatmap formatting, responsive layout, and expanded view | [`pro-advanced-pivot/`](./pro-advanced-pivot/) |
| **Pro Advance** | Event scheduler | Calendar and resource views, table view, navigation, search, event creation, open shifts, reassignment, and team scheduling | [`pro-advanced-scheduler/`](./pro-advanced-scheduler/) |
| **Pro Advance** | Project Gantt | Tasks, dependencies, resources, assignments, working calendars, baselines, critical path controls, row status, and Excel export | [`pro-advanced-gantt/`](./pro-advanced-gantt/) |

## Repository structure

```text
revogrid-demos/
├── package.json                # Root scripts and package-manager contract
├── pnpm-workspace.yaml         # Workspace package discovery
├── core-free/                  # Core HR data-grid showcase
├── pro-excel/                  # Pro spreadsheet workbench
├── pro-advanced-pivot/         # Financial pivot showcase
├── pro-advanced-scheduler/     # Shift and event scheduler
└── pro-advanced-gantt/
    └── src/
        ├── GanttShowcase.*     # Gantt framework implementations
        └── shared/             # Shared project data and configuration
```

## Framework support

Each demo includes four implementation variants:

| File type | Framework |
| --- | --- |
| `*.ts` | Vanilla TypeScript and Web Components |
| `*.tsx` | React |
| `*.vue` | Vue 3 |
| `*Angular.ts` or `angular.ts` | Angular |

The supporting files next to each implementation contain shared data, styles, configuration, templates, and demo-specific helpers.

## Using an example

These workspace packages contain demo source code rather than standalone applications. They are intended to be integrated into a compatible RevoGrid project or used as implementation references. Each demo has a dedicated `package.json` containing the combined dependencies for its TypeScript, React, Vue, and Angular variants.

1. Choose the edition and feature you want to explore.
2. Open the file matching your framework.
3. Run `pnpm install` once from the repository root.
4. Copy the implementation and its adjacent shared files into your application.
5. Resolve the demo's local imports against your project structure.
6. Align package versions with your host application when integrating the example.

> Pro and Pro Advance examples require access to their corresponding commercial packages. Keep registry credentials and package tokens outside source control.

### Run the demos

After `pnpm install`, start any demo from the repository root:

```bash
pnpm dev:core
pnpm dev:excel
pnpm dev:pivot
pnpm dev:scheduler
pnpm dev:gantt
```

Each command starts a Vite development server using that package's Vanilla TypeScript entry point.

## Example entry points

| Demo | TypeScript | React | Vue | Angular |
| --- | --- | --- | --- | --- |
| HR data grid | [`HRDemo.ts`](./core-free/src/HRDemo.ts) | [`HRDemo.tsx`](./core-free/src/HRDemo.tsx) | [`HRDemo.vue`](./core-free/src/HRDemo.vue) | [`HRDemoAngular.ts`](./core-free/src/HRDemoAngular.ts) |
| Spreadsheet | [`SpreadsheetWorkbench.ts`](./pro-excel/src/SpreadsheetWorkbench.ts) | [`SpreadsheetWorkbench.tsx`](./pro-excel/src/SpreadsheetWorkbench.tsx) | [`SpreadsheetWorkbench.vue`](./pro-excel/src/SpreadsheetWorkbench.vue) | [`SpreadsheetWorkbenchAngular.ts`](./pro-excel/src/SpreadsheetWorkbenchAngular.ts) |
| Pivot | [`PivotShowcase.ts`](./pro-advanced-pivot/src/PivotShowcase.ts) | [`PivotShowcase.tsx`](./pro-advanced-pivot/src/PivotShowcase.tsx) | [`PivotShowcase.vue`](./pro-advanced-pivot/src/PivotShowcase.vue) | [`PivotShowcaseAngular.ts`](./pro-advanced-pivot/src/PivotShowcaseAngular.ts) |
| Scheduler | [`index.ts`](./pro-advanced-scheduler/src/index.ts) | [`index.tsx`](./pro-advanced-scheduler/src/index.tsx) | [`index.vue`](./pro-advanced-scheduler/src/index.vue) | [`angular.ts`](./pro-advanced-scheduler/src/angular.ts) |
| Gantt | [`GanttShowcase.ts`](./pro-advanced-gantt/src/GanttShowcase.ts) | [`GanttShowcase.tsx`](./pro-advanced-gantt/src/GanttShowcase.tsx) | [`GanttShowcase.vue`](./pro-advanced-gantt/src/GanttShowcase.vue) | [`GanttShowcaseAngular.ts`](./pro-advanced-gantt/src/GanttShowcaseAngular.ts) |

## Contributing

When adding or updating a showcase:

1. Put it in the directory for the correct edition and feature.
2. Keep the four framework variants behaviorally aligned.
3. Share data and feature configuration where practical.
4. Include the styles and helper files needed to understand the example.
5. Add focused tests for reusable data or configuration logic.
6. Never commit private registry credentials, license keys, or commercial package tokens.

## Useful links

- [RevoGrid on GitHub](https://github.com/revolist/revogrid)
- [RevoGrid demo repository](https://github.com/revolist/revogrid-demos)
- [Report an issue](https://github.com/revolist/revogrid-demos/issues)

---

<div align="center">
  Explore RevoGrid features in the framework you already use.
</div>
