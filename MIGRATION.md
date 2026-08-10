# Feature repository migration

Pivot, Gantt, Kanban, and Scheduler moved from nested demo directories to
public, standalone repositories. The parent continues to publish their
canonical live routes and pins each repository as a submodule.

| Previous path | Repository | Canonical example |
| --- | --- | --- |
| `pro-advanced-pivot/` | `https://github.com/revolist/pivot` | `https://pivot.rv-grid.com/demo/` |
| `pro-advanced-gantt/` | `https://github.com/revolist/gantt` | `https://gantt.rv-grid.com/` |
| `pro-advanced-kanban/` | `https://github.com/revolist/kanban` | `https://kanban.rv-grid.com/demo/` |
| `pro-advanced-scheduler/` | `https://github.com/revolist/scheduler` | `https://scheduler.rv-grid.com/demo/` |

The migration does not change RevoGrid runtime APIs or package exports. Trial
and licensed consumers continue to import the production package names.
