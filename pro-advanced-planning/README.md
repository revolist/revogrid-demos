# Unified Planning Suite: Grid + Kanban + Gantt + Scheduler + Calendar

An integrated Data Grid, Kanban board, Gantt, Scheduler, and Calendar demo
backed by one canonical task store. Switch between each planning surface to
see committed edits carried into the next view.

## Shared source and edit synchronization

Every planning view receives the same application-owned task records. One
shared `ViewFieldMap` tells Gantt, Kanban, Scheduler, and Calendar which task
properties represent identity, title, status, dates, color, progress, and
owner. The plugins translate those fields internally, so the demo does not
create Scheduler event objects or maintain view-specific aliases.

Accepted mapped edits arrive through `gridedit` with the authored property
names. A small generic handler applies those row patches to the demo store by
stable task ID, refreshing only derived avatar and elapsed-duration values.
Fresh snapshots are published on view switches, filtering, and reset without
echoing a new source into the view that originated an edit.

The demo's small `PlanningWorkspacePlugin` exposes visible rows and row
selection through grid providers. Framework components therefore do not retain
grid-element refs or move plugin-rendered filter badges through the DOM; the
filter plugin keeps its badge UI in its native header slot.

This compact showcase intentionally keeps structural CRUD, Gantt hierarchy
reordering, and multiple Gantt assignments outside its cross-view contract.
Gantt assignments are derived from the scalar `owner` field.

## Run this example

This is one workspace inside the **full**
[`revogrid-demos`](https://github.com/revolist/revogrid-demos) repository. It
does not run from a copied source file: clone the repository, install once at
its root, then start the framework you want.

The repository includes `.npmrc` for the public `@revolist` trial registry, so
no token or npm login is required. This example installs these trial packages
under the production import names:

- `@revolist/revogrid-pro` → `@revolist/rv-pro-trial@2.8.9`
- `@revolist/kanban` → `@revolist/kanban-trial@2.8.9`
- `@revolist/gantt` → `@revolist/gantt-trial@2.8.9`
- `@revolist/scheduler` → `@revolist/scheduler-trial@2.8.9`

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

Kanban, Gantt Charts, Event Scheduler, and Calendar all map the existing task
fields directly. The plain data grid keeps standard editing, range selection,
resizing, filtering, sorting, and column-moving behavior.
