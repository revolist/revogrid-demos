<div align="center">

# RevoGrid Examples

**Sixteen production-style showcases. Four feature repositories. One polished gallery.**

[![Frameworks](https://img.shields.io/badge/TypeScript%20%7C%20React%20%7C%20Vue%20%7C%20Angular-4f46e5)](#showcases)
[![RevoGrid](https://img.shields.io/badge/RevoGrid-4.25.1-2563eb)](https://rv-grid.com/)

[View gallery](https://example.rv-grid.com/) · [Request trial](https://pro.rv-grid.com/guides/installation-npm-trial/) · [Get Pro Advanced](https://rv-grid.com/pricing/)

</div>

## Architecture

`revogrid-demos` is the deployment and discovery layer for RevoGrid examples.
Pivot, Gantt, Kanban, and Scheduler are complete public repositories included as
Git submodules. The parent validates each child `feature.json`, builds every
showcase recursively, and assembles the site deployed to
`example.rv-grid.com`.

```text
revogrid-demos/
├── pro-advanced-pivot/        # revolist/pivot submodule
├── pro-advanced-gantt/        # revolist/gantt submodule
├── pro-advanced-kanban/       # revolist/kanban submodule
├── pro-advanced-scheduler/    # revolist/scheduler submodule
├── core-free/                 # retained Core showcase
├── pro-excel/                 # retained spreadsheet showcase
├── pro-e-commerce/            # retained commerce showcase
├── pro-project-table/         # retained project showcase
├── pro-filtering/             # retained advanced filtering showcase
├── pro-infinity-scroll/       # retained remote loading showcase
├── pro-column-collapse/       # retained grouped-column showcase
├── pro-data-grid-context-menu/ # retained universal context-menu showcase
├── pro-row-master/            # retained master-detail showcase
├── pro-audit-history/         # retained accountable change-log showcase
├── pro-tree-data/             # retained hierarchical data showcase
├── pro-advanced-planning/     # retained planning suite
├── gallery/                   # visual system and retained metadata
└── scripts/                   # setup, build, test, media delegation
```

Submodules track each feature repository's `main` branch. `pnpm run setup`
initializes them and advances every checkout to the latest remote `main`.

## Showcases

| Edition | Showcase | Source | Live route |
| --- | --- | --- | --- |
| Core | RevoGrid Core | [`core-free`](./core-free/) | [`/core/`](https://example.rv-grid.com/core/) |
| Pro | Excel Workbench | [`pro-excel`](./pro-excel/) | [`/excel/`](https://example.rv-grid.com/excel/) |
| Pro | E-commerce Analytics | [`pro-e-commerce`](./pro-e-commerce/) | [`/ecommerce/`](https://example.rv-grid.com/ecommerce/) |
| Pro | Project Portfolio | [`pro-project-table`](./pro-project-table/) | [`/project-table/`](https://example.rv-grid.com/project-table/) |
| Pro | Advanced Filtering: Order Explorer | [`pro-filtering`](./pro-filtering/) | [`/filtering/`](https://example.rv-grid.com/filtering/) |
| Pro | Infinity Scroll: Remote Directory | [`pro-infinity-scroll`](./pro-infinity-scroll/) | [`/infinity-scroll/`](https://example.rv-grid.com/infinity-scroll/) |
| Pro | Column Collapse: Contact Workspace | [`pro-column-collapse`](./pro-column-collapse/) | [`/column-collapse/`](https://example.rv-grid.com/column-collapse/) |
| Pro | Data Grid Context Menu & Formatting | [`pro-data-grid-context-menu`](./pro-data-grid-context-menu/) | [`/data-grid-context-menu/`](https://example.rv-grid.com/data-grid-context-menu/) |
| Pro | Row Master: Portfolio Explorer | [`pro-row-master`](./pro-row-master/) | [`/row-master/`](https://example.rv-grid.com/row-master/) |
| Pro | Audit History: Invoice Ledger | [`pro-audit-history`](./pro-audit-history/) | [`/audit-history/`](https://example.rv-grid.com/audit-history/) |
| Pro | Tree Data: Organization Explorer | [`pro-tree-data`](./pro-tree-data/) | [`/tree-data/`](https://example.rv-grid.com/tree-data/) |
| Pro Advanced | Pivot | [`revolist/pivot`](https://github.com/revolist/pivot) | [`pivot.rv-grid.com`](https://pivot.rv-grid.com/demo/) |
| Pro Advanced | Gantt | [`revolist/gantt`](https://github.com/revolist/gantt) | [`gantt.rv-grid.com`](https://gantt.rv-grid.com/) |
| Pro Advanced | Kanban | [`revolist/kanban`](https://github.com/revolist/kanban) | [`kanban.rv-grid.com`](https://kanban.rv-grid.com/demo/) |
| Pro Advanced | Scheduler | [`revolist/scheduler`](https://github.com/revolist/scheduler) | [`scheduler.rv-grid.com`](https://scheduler.rv-grid.com/demo/) |
| Pro Advanced | Unified Planning Suite | [`pro-advanced-planning`](./pro-advanced-planning/) | [`/planning/`](https://example.rv-grid.com/planning/) |

The gallery retains detail and demo routes at `/<showcase>/` and
`/<showcase>/demo/`. Feature live-demo links use the dedicated subdomains.
Descriptions, recipes, frameworks, links, media, and output paths are read
directly from each child repository's validated `feature.json`.

## Local development

Use Node.js 22.22.3+, 24.15.0+, or a newer supported release. This matches the
Angular 22 toolchain used by the framework variants and CI.

Clone with submodules and provide trial-registry authentication outside the
repository:

```bash
git clone --recurse-submodules https://github.com/revolist/revogrid-demos.git
cd revogrid-demos
export GITHUB_TOKEN="<GitHub token with read:packages>"
pnpm run setup
pnpm build
pnpm dev
```

`pnpm run setup` initializes nested repositories and performs frozen parent and
child installs. `pnpm build` builds four child repositories, eleven retained
showcases, then assembles `dist/`.

Useful validation commands:

```bash
pnpm test
pnpm test:e2e
pnpm media:inspect --feature pivot
pnpm media:record --feature gantt
```

Each feature repository also supports the same standalone commands:

```bash
pnpm dev
pnpm build
pnpm build:frameworks
pnpm test
pnpm test:e2e
pnpm media:inspect
pnpm media:record
```

## Trial and licensed installs

Showcase source imports the production package names
`@revolist/revogrid-pro`, `@revolist/pivot`, `@revolist/gantt`,
`@revolist/kanban`, and `@revolist/scheduler`. Dependency specifications alias
those imports to the 2.6.3 trial packages by default. Licensed users change
package specifications and registry configuration; no source imports need to
be rewritten. RevoGrid core and framework wrappers are pinned to the validated
4.25.1 line.

Never commit registry tokens, credentials, proprietary implementation source,
or commercial license material.

## Publishing

The Pages workflow checks out submodules recursively, performs frozen installs,
builds the complete gallery, validates routes and links, and deploys only the
parent `dist/` artifact. `CNAME` preserves the existing
`example.rv-grid.com` custom-domain configuration.

## Licensing and support

Feature repositories license their example, recipe, documentation, and media
tooling under MIT. Commercial RevoGrid runtime packages retain their product
license. Use the relevant feature repository for example issues and
[RevoGrid support](https://rv-grid.com/contact/) for product or licensing help.
