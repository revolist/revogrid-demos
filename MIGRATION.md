# Feature repository migration

Pivot, Gantt, Kanban, and Scheduler moved from nested demo directories to
public, standalone repositories. The parent continues to publish their
canonical live routes and pins each repository as a submodule.

| Previous path | Repository | Canonical example |
| --- | --- | --- |
| `pro-advanced-pivot/` | `https://github.com/revolist/pivot` | `https://example.rv-grid.com/pivot/demo/` |
| `pro-advanced-gantt/` | `https://github.com/revolist/gantt` | `https://example.rv-grid.com/gantt/demo/` |
| `pro-advanced-kanban/` | `https://github.com/revolist/kanban` | `https://example.rv-grid.com/kanban/demo/` |
| `pro-advanced-scheduler/` | `https://github.com/revolist/scheduler` | `https://example.rv-grid.com/scheduler/demo/` |

The migration does not change RevoGrid runtime APIs or package exports. Trial
and licensed consumers continue to import the production package names.
