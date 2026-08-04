<div align="center">

# RevoGrid Examples

**Nine production-style showcases. Four feature repositories. One polished gallery.**

[![Pages](https://img.shields.io/github/actions/workflow/status/revolist/revogrid-demos/pages.yml?branch=main&label=gallery)](https://example.rv-grid.com/)
[![Frameworks](https://img.shields.io/badge/TypeScript%20%7C%20React%20%7C%20Vue%20%7C%20Angular-4f46e5)](#showcases)
[![RevoGrid](https://img.shields.io/badge/RevoGrid-4.25.1-2563eb)](https://rv-grid.com/)

[View gallery](https://example.rv-grid.com/) · [Request trial](https://pro.rv-grid.com/guides/installation-npm-trial/) · [Get Pro Advanced](https://rv-grid.com/pricing/)

</div>

## Architecture

`revogrid-demos` is the deployment and discovery layer for RevoGrid examples.
Pivot, Gantt, Kanban, and Scheduler are complete public repositories pinned as
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
├── pro-advanced-planning/     # retained planning suite
├── gallery/                   # visual system and retained metadata
└── scripts/                   # setup, build, test, media delegation
```

Submodules are pinned to exact commits. Production builds never follow moving
branches.

## Showcases

| Edition | Showcase | Source | Live route |
| --- | --- | --- | --- |
| Core | RevoGrid Core | [`core-free`](./core-free/) | [`/core/`](https://example.rv-grid.com/core/) |
| Pro | Excel Workbench | [`pro-excel`](./pro-excel/) | [`/excel/`](https://example.rv-grid.com/excel/) |
| Pro | E-commerce Analytics | [`pro-e-commerce`](./pro-e-commerce/) | [`/ecommerce/`](https://example.rv-grid.com/ecommerce/) |
| Pro | Project Portfolio | [`pro-project-table`](./pro-project-table/) | [`/project-table/`](https://example.rv-grid.com/project-table/) |
| Pro Advanced | Pivot | [`revolist/pivot`](https://github.com/revolist/pivot) | [`/pivot/`](https://example.rv-grid.com/pivot/) |
| Pro Advanced | Gantt | [`revolist/gantt`](https://github.com/revolist/gantt) | [`/gantt/`](https://example.rv-grid.com/gantt/) |
| Pro Advanced | Kanban | [`revolist/kanban`](https://github.com/revolist/kanban) | [`/kanban/`](https://example.rv-grid.com/kanban/) |
| Pro Advanced | Scheduler | [`revolist/scheduler`](https://github.com/revolist/scheduler) | [`/scheduler/`](https://example.rv-grid.com/scheduler/) |
| Pro Advanced | Unified Planning Suite | [`pro-advanced-planning`](./pro-advanced-planning/) | [`/planning/`](https://example.rv-grid.com/planning/) |

Every route has a detail page and a canonical live demo at
`/<showcase>/demo/`. Feature descriptions, recipes, frameworks, links, media,
and output paths are read directly from each child repository's validated
`feature.json`.

## Local development

Clone with submodules and provide trial-registry authentication outside the
repository:

```bash
git clone --recurse-submodules https://github.com/revolist/revogrid-demos.git
cd revogrid-demos
export NODE_AUTH_TOKEN="<trial token>"
pnpm run setup
pnpm build
pnpm dev
```

`pnpm run setup` initializes nested repositories and performs frozen parent and
child installs. `pnpm build` builds four child repositories, five retained
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
`@revolist/revogrid-pro` and `@revolist/revogrid-enterprise`. Dependency
specifications alias those imports to the 2.5.0 trial packages by default.
Licensed users change package specifications and registry configuration; no
source imports need to be rewritten. RevoGrid core and framework wrappers are
pinned to the validated 4.25.1 line.

Never commit registry tokens, credentials, proprietary implementation source,
or commercial license material.

## Publishing

The Pages workflow checks out submodules recursively, performs frozen installs,
builds the complete gallery, validates routes and links, and deploys only the
parent `dist/` artifact. `CNAME` preserves the existing
`example.rv-grid.com` custom-domain configuration.

## Licensing and support

Feature repositories license their example, recipe, documentation, and media
tooling under MIT. RevoGrid Pro and Enterprise runtime packages retain their
commercial license. Use the relevant feature repository for example issues and
[RevoGrid support](https://rv-grid.com/contact/) for product or licensing help.
