# Grid + Kanban + Gantt + Scheduler

A minimal editable planning demo backed by one task array. Switch between the
data grid, Kanban board, Gantt, and resource scheduler to see edits carried
into the next view.

Kanban maps the existing `workflowStatus`, `order`, `id`, and `name` task fields
directly. Gantt and Scheduler use their built-in context menus. The plain data
grid keeps standard editing, range selection, resizing, filtering, sorting,
and column-moving behavior.

```bash
pnpm dev:planning
pnpm dev:planning:react
pnpm dev:planning:vue
pnpm dev:planning:angular
```
