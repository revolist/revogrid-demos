<div align="center">

# RevoGrid Demos

**Production-style examples for RevoGrid Core, Pro, and Pro Advance.**

[![RevoGrid](https://img.shields.io/badge/RevoGrid-Demos-1f6feb?style=for-the-badge)](https://github.com/revolist/revogrid)
[![Frameworks](https://img.shields.io/badge/Frameworks-TS_%7C_React_%7C_Vue_%7C_Angular-8250df?style=for-the-badge)](#framework-support)
[![Demos](https://img.shields.io/badge/Showcases-7-2ea44f?style=for-the-badge)](#demo-catalog)

</div>

## About

This repository contains focused source examples for [RevoGrid](https://github.com/revolist/revogrid). The demos cover the free Core grid and Pro spreadsheet, e-commerce, project table, Pivot, Scheduler, and Gantt use cases.

Every showcase provides equivalent implementations for the major supported frontend approaches, making it easier to compare integrations or adapt an example to an existing application.

## Demo catalog

| Edition | Demo | Highlights | Source |
| --- | --- | --- | --- |
| **Core** | HR data grid | Async large-data loading, grouped columns, custom cell templates, column types, row drag handling, and light/dark themes | [Demo guide](./core-free/README.md) |
| **Pro** | Spreadsheet workbench | Formula bar, XLSX export, history, autofill, multi-range selection, merged cells, validation, context menus, and collaborative presence simulation | [Demo guide](./pro-excel/README.md) |
| **Pro** | E-commerce analytics | Customer profiles, grouped analytics columns, filtering, column controls, context menus, and styled Excel export configuration | [Demo guide](./pro-e-commerce/README.md) |
| **Pro** | Project table | Project grouping, status filtering, custom editors, toolbar actions, context menus, and project presets | [Demo guide](./pro-project-table/README.md) |
| **Pro Advance** | Financial pivot | Financial presets, configurable row and column axes, filtering, KPIs, heatmap formatting, responsive layout, and expanded view | [Demo guide](./pro-advanced-pivot/README.md) |
| **Pro Advance** | Event scheduler | Calendar and resource views, table view, navigation, search, event creation, open shifts, reassignment, and team scheduling | [Demo guide](./pro-advanced-scheduler/README.md) |
| **Pro Advance** | Project Gantt | Tasks, dependencies, resources, assignments, working calendars, baselines, critical path controls, row status, and Excel export | [Demo guide](./pro-advanced-gantt/README.md) |

Each commercial demo guide contains a source-audited inventory of its directly registered and automatically installed Pro or Enterprise plugins, the supporting package APIs it uses, and the practical benefit of each capability.

## Repository structure

```text
revogrid-demos/
├── package.json                # Root scripts and package-manager contract
├── pnpm-workspace.yaml         # Workspace package discovery
├── core-free/                  # Core HR data-grid showcase
├── pro-excel/                  # Pro spreadsheet workbench
├── pro-e-commerce/             # Pro e-commerce analytics
├── pro-project-table/          # Pro project tracker table
├── pro-advanced-pivot/         # Financial pivot showcase
├── pro-advanced-scheduler/     # Shift and event scheduler
└── pro-advanced-gantt/
    └── src/
        ├── gantt.*             # Gantt framework implementations
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
pnpm dev:ecommerce
pnpm dev:project
```

Each short command starts the Vanilla TypeScript variant. Append a framework name
to run another implementation:

```bash
pnpm dev:pivot:ts
pnpm dev:pivot:react
pnpm dev:pivot:vue
pnpm dev:pivot:angular
```

The same `:ts`, `:react`, `:vue`, and `:angular` suffixes work for `core`,
`excel`, `scheduler`, `gantt`, `ecommerce`, and `project`.

You can also run a demo from its package directory:

```bash
cd pro-advanced-pivot
pnpm dev            # TypeScript
pnpm dev:react
pnpm dev:vue
pnpm dev:angular
```

## Example entry points

| Demo | TypeScript | React | Vue | Angular |
| --- | --- | --- | --- | --- |
| HR data grid | [`hr.ts`](./core-free/src/hr.ts) | [`hr.react.tsx`](./core-free/src/hr.react.tsx) | [`hr.vue`](./core-free/src/hr.vue) | [`hr.angular.ts`](./core-free/src/hr.angular.ts) |
| Spreadsheet | [`excel.ts`](./pro-excel/src/excel.ts) | [`excel.react.tsx`](./pro-excel/src/excel.react.tsx) | [`excel.vue`](./pro-excel/src/excel.vue) | [`excel.angular.ts`](./pro-excel/src/excel.angular.ts) |
| E-commerce | [`ecommerce.ts`](./pro-e-commerce/src/ecommerce.ts) | [`ecommerce.react.tsx`](./pro-e-commerce/src/ecommerce.react.tsx) | [`ecommerce.vue`](./pro-e-commerce/src/ecommerce.vue) | [`ecommerce.angular.ts`](./pro-e-commerce/src/ecommerce.angular.ts) |
| Project table | [`project-table.ts`](./pro-project-table/src/project-table.ts) | [`project-table.react.tsx`](./pro-project-table/src/project-table.react.tsx) | [`project-table.vue`](./pro-project-table/src/project-table.vue) | [`project-table.angular.ts`](./pro-project-table/src/project-table.angular.ts) |
| Pivot | [`pivot.ts`](./pro-advanced-pivot/src/pivot.ts) | [`pivot.react.tsx`](./pro-advanced-pivot/src/pivot.react.tsx) | [`pivot.vue`](./pro-advanced-pivot/src/pivot.vue) | [`pivot.angular.ts`](./pro-advanced-pivot/src/pivot.angular.ts) |
| Scheduler | [`scheduler.ts`](./pro-advanced-scheduler/src/scheduler.ts) | [`scheduler.react.tsx`](./pro-advanced-scheduler/src/scheduler.react.tsx) | [`scheduler.vue`](./pro-advanced-scheduler/src/scheduler.vue) | [`scheduler.angular.ts`](./pro-advanced-scheduler/src/scheduler.angular.ts) |
| Gantt | [`gantt.ts`](./pro-advanced-gantt/src/gantt.ts) | [`gantt.react.tsx`](./pro-advanced-gantt/src/gantt.react.tsx) | [`gantt.vue`](./pro-advanced-gantt/src/gantt.vue) | [`gantt.angular.ts`](./pro-advanced-gantt/src/gantt.angular.ts) |

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
- [Report an issue](https://github.com/revolist/revogrid-demos/issues)

---

<div align="center">
  Explore RevoGrid features in the framework you already use.
</div>
