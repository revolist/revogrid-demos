# Unified Planning Suite: Grid + Kanban + Gantt + Scheduler + Calendar

An integrated Data Grid, Kanban board, Gantt, Scheduler, and Calendar demo
backed by one canonical task store. Switch between each planning surface to
see committed edits carried into the next view.

## Edit synchronization

Gantt, Kanban, and Scheduler commit their own interactions before emitting a
`gridedit` event with `sourceMutation: 'producer'`. The demo applies the
event's `domainChanges` to its canonical store, but does not assign a new
source back to the component that originated the edit. This avoids a redundant
full projection and preserves plugin-local history.

The demo publishes a fresh task snapshot only when a consumer actually needs
one: initial mount, view switch, filtering, reset, or explicit deletion. Grid
cell edits follow the same rule and resolve row-index-only editor events by
stable task ID. A real application can persist the same `domainChanges` as a
delta and treat the server response as an acknowledgement; only normalized or
conflicting values need to be applied back through incremental plugin APIs.

## Run this example

This is one workspace inside the **full**
[`revogrid-demos`](https://github.com/revolist/revogrid-demos) repository. It
does not run from a copied source file: clone the repository, install once at
its root, then start the framework you want.

The repository includes `.npmrc` for the public `@revolist` trial registry, so
no token or npm login is required. This example installs these trial packages
under the production import names:

- `@revolist/revogrid-pro` → `@revolist/rv-pro-trial@2.8.2`
- `@revolist/kanban` → `@revolist/kanban-trial@2.8.2`
- `@revolist/gantt` → `@revolist/gantt-trial@2.8.2`
- `@revolist/scheduler` → `@revolist/scheduler-trial@2.8.2`

```bash
git clone https://github.com/revolist/revogrid-demos.git
cd revogrid-demos
pnpm install
```

Choose the framework whose file you inspected in **Code**:

```bash
# Vanilla TypeScript — src/planning.ts
pnpm --filter revogrid-demo-pro-advanced-planning dev:ts

# React — src/planning.react.tsx
pnpm --filter revogrid-demo-pro-advanced-planning dev:react

# Vue 3 — src/planning.vue
pnpm --filter revogrid-demo-pro-advanced-planning dev:vue

# Angular — src/planning.angular.ts
pnpm --filter revogrid-demo-pro-advanced-planning dev:angular
```

Open the localhost URL Vite prints. To add the same trial packages to an
existing application instead, follow the [trial installation guide](https://pro.rv-grid.com/guides/installation-npm-trial/).

## Demo preview

[![Unified Planning Suite walkthrough](./assets/pro-advanced-planning-walkthrough.gif)](./assets/pro-advanced-planning-walkthrough.mp4)

_Click the animated preview to open the full-quality MP4._

Kanban maps the existing `workflowStatus`, `order`, `id`, and `name` task fields
directly. Gantt Charts and Event Scheduler use their built-in context menus. The plain data
grid keeps standard editing, range selection, resizing, filtering, sorting,
and column-moving behavior.
