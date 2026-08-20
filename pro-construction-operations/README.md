# Construction + Fabrication Operations

A standalone RevoGrid operations showcase backed by the supplied Pebblestone CSV fixtures. Company Master and Project Schedule use Gantt; Assigned Resources uses Scheduler's resource timeline. Every view projects the same mutable task and assignment data at a purpose-specific level of detail.

## Run locally

```bash
pnpm dev:construction
pnpm dev:construction:react
pnpm dev:construction:vue
pnpm dev:construction:angular
```

The adapter keeps projects separate from tasks, namespaces IDs per project, preserves all dependency endpoints and resource calendars, retains unmatched project `2776` rows as diagnostics, and creates explicitly marked residual scope only when partial Look-Ahead detail would shorten a master task.

Company Master starts with projects only and excludes execution-level Look-Ahead rows. Project Schedule is the authoritative full hierarchy, initially expanding the project and Installation phase. Look-Ahead projects only overlapping execution rows plus their immediate main-task or Constraints & logistics parent, so a subtask never loses its schedule context.

Scheduler events are derived from the same canonical tasks and assignments; Scheduler move/resize changes patch those tasks by ID so the edits remain visible on return to Project Schedule.

Task-table filters use the Pro field-specific controls: Resource, Department, Work area, and Status use selection lists; Progress offers number and slider modes; Duration uses a range slider. Duration filtering remains numeric internally, while its visible bounds and tooltips are converted from canonical working hours to the project's configured working days; Progress slider labels include `%`. Categorical filters synchronize their option rendering with the owning cell template, so Department and Status retain the same visual language inside the filter popup.
