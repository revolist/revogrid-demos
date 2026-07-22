# Pro Project Table

A preset-driven RevoGrid Pro project tracker implemented in Vanilla TypeScript, React, Vue, and Angular.

## What it features

- Project grouping by section, status, priority, risk, department, or owner, with expandable groups and group-level metrics
- Selection-aware bulk actions plus row and column context menus
- Selection, text, date, number, and slider filters with custom filter-header rendering
- Dropdown, multi-select, date, currency, integer, progress, timeline, avatar, and rating cells
- Drag-and-drop row ordering, sorting, pinning, hiding, and responsive last-column stretching
- A column-add popup for adding and removing project-specific dynamic columns
- Inline project progress, budget summaries, editable fields, and light/dark theme controls

## Preset entry point

All four framework variants register only `GridPresetPlugin` directly. The plugin reads `gridPreset`, combines the selected presets, applies defaults only when the application has not supplied its own value, and installs each required plugin once.

| Package feature | How this demo uses it and why it helps |
| --- | --- |
| `GridPresetPlugin` | Activates the shared `common-column-types` and `project-pipeline` presets, keeping a large project-grid setup consistent across all framework variants. |
| `common-column-types` | Supplies reusable column types. This demo uses `dropdown` and `select` for project choices, `date` for dates, `currency` for budgets, and `integer` for numeric fields; dynamic columns can reuse more of the same catalog. |
| `project-pipeline` | Installs the Pro plugin stack below and provides safe defaults for row ordering, last-column stretching, and context-menu configuration. The demo replaces or extends those defaults with its project-specific behavior. |

## Pro plugins installed by the project preset

These plugins come from `@revolist/revogrid-pro`. They are installed automatically by `GridPresetPlugin`, so they should not be repeated in `projectPlugins`.

| Preset-installed Pro plugin | How this demo uses it and why it helps |
| --- | --- |
| `EventManagerPlugin` | Provides the shared event lifecycle used by the preset stack, helping editing, selection, filtering, and other plugins cooperate. |
| `TreeDataPlugin` | Adds tree hierarchy support to the reusable project-pipeline baseline. This demo uses Core grouping instead of configuring `tree`, so tree rows are currently dormant. |
| `RowOrderPlugin` | Enables project rows to be reordered from the Project name handle; the demo supplies a compact project-name drag preview. |
| `RowSelectPlugin` | Powers the pinned checkbox column and selected-row state, enabling bulk actions, selection-aware menus, and moving checked projects together. |
| `MasterRowPlugin` | Adds master-detail row infrastructure to the preset. No `masterRow` template is configured in this demo, so detail rows are currently dormant. |
| `OverlayPlugin` | Provides an aligned grid overlay surface for master-detail content. It is included by the preset and reused when `MasterRowPlugin` initializes it. |
| `RowHeaderPlugin` | Provides numbered-header focus, selection, and drag integration for layouts that enable row headers. This demo uses its own pinned selection column instead of a generated numbered row header. |
| `ContextMenuPlugin` | Runs the custom row actions (duplicate, change state, move, and delete) and column actions (sort, filter, hide, and pin) next to the affected data. |
| `CellColumnFocusVerifyPlugin` | Allows a column to approve or reject focus through a custom `focus` callback. It is available through the preset, but the current project columns do not define focus guards. |
| `ColumnStretchPlugin` | Stretches the last visible column into unused width so the table fills its container cleanly. |
| `DimensionAnimationPlugin` | Smooths dimension changes, making group expansion, visibility changes, and other layout updates easier to follow. |
| `AdvanceFilterPlugin` | Adds the selection, string, date, slider, and numeric filtering used across project fields. |
| `FilterHeaderPlugin` | Places filter controls in the headers and supports the demo's custom owner, department, status, and skills filter summaries. |
| `ColumnHidePlugin` | Applies toolbar and context-menu visibility choices while preserving the underlying column definitions. |
| `TooltipPlugin` | Supplies reusable tooltip behavior for columns that opt into it. The four primary project-tracker variants do not set tooltip content; the additional Svelte prototype does. |
| `ColumnAddPopupPlugin` | Opens the typed column chooser from the pinned add-column header and lets users add or remove project fields without rebuilding the grid. |

### Plugins installed automatically inside Pro plugins

These nested companions are created and reused internally; they are not listed in either the demo's plugin array or the preset's project plugin list.

| Auto-installed plugin | Installed by | Benefit in this demo |
| --- | --- | --- |
| `RowMasterAccessibilityPlugin` | `MasterRowPlugin` | Isolates keyboard and focus behavior for nested master-detail content if the project table later enables detail rows. |
| `ColumnGroupRenderSyncPlugin` | `ColumnHidePlugin` | Keeps grouped-header source indexes aligned with visible indexes as columns are hidden or restored. |

`MasterRowPlugin` also auto-installs or reuses `OverlayPlugin`. Because `OverlayPlugin` is already part of the `project-pipeline` definition, the runtime shares one instance rather than registering a duplicate.

`TreeDataPlugin` can install `DimensionAnimationPlugin` when tree animation is enabled. The preset already includes one `DimensionAnimationPlugin`, and this demo does not configure tree mode.

### Other Pro APIs used

| Pro API | Benefit in this demo |
| --- | --- |
| `ColumnDropdown` via `common-column-types` | Provides single- and multi-select editors with custom option rendering for owners, status, priority, risk, departments, and skills. |
| `avatarTemplate` | Renders compact, consistent owner avatars in cells, editors, and filter controls. |
| `circularProgressRenderer` | Adds an immediately readable completion ring beside every project name. |
| `editorSlider` | Turns progress values into an in-cell visual control instead of requiring raw number entry. |
| `editorTimeline` | Displays project date ranges and completion together as a compact timeline. |
| `ColumnAddPopupConfig` | Defines the project-specific column catalog and add/remove callbacks consumed by `ColumnAddPopupPlugin`. |

Currency and integer formatting is supplied by `@revolist/revogrid-column-numeral`. Project grouping itself comes from RevoGrid Core; the Pro plugins add the richer filtering, selection, menus, visibility, ordering, popup, and rendering workflows around it.

### Additional Svelte prototype

`src/project-table.svelte` is an extra source prototype and is not wired into this package's dev or build scripts. It registers `GridPresetPlugin` with only `common-column-types`, then directly adds `AdvanceFilterPlugin`, `FilterHeaderPlugin`, `ColumnHidePlugin`, and `TooltipPlugin`.

It reuses `circularProgressRenderer`, `editorSlider`, and `editorTimeline` from the inventory above and adds these Pro helpers:

| Svelte-only Pro API | Benefit in the prototype |
| --- | --- |
| `avatarRenderer` | Renders compact owner identities without a custom avatar template. |
| `arrayRenderer` and `linkRenderer` | Compose multiple links into one readable, reusable cell renderer. |
| `extendTemplates` | Layers the task label, color rail, progress ring, and tooltip trigger without replacing one template with another. |
| `commonAggregators` and `getGroupingData` | Calculate and render budget totals for each Core grouping row. |
| `defineDropdown` | Builds the add-column visibility chooser attached to the custom header button. |
| `ignoreCellEvents` and `EXPAND_ICON` | Keep custom grouped subheaders from stealing cell interactions and provide a consistent expand/collapse affordance. |

## Run it

```bash
pnpm dev          # Vanilla TypeScript
pnpm dev:react
pnpm dev:vue
pnpm dev:angular
```

Build variants use the matching `build:ts`, `build:react`, `build:vue`, and `build:angular` scripts.

## Main files

- `src/project-table.ts` — Vanilla TypeScript
- `src/project-table.react.tsx` — React
- `src/project-table.vue` — Vue
- `src/project-table.angular.ts` — Angular
- `src/project-tracker/plugins.ts` — preset and direct plugin registration
- `src/project-tracker/columns.ts` — project columns, renderers, editors, and add-column configuration
- `src/project-tracker/filters.ts` — Pro filter configuration and custom header templates
- `src/project-tracker/context-menus.ts` — row and column menu actions
- `src/project-tracker/grouping.ts` — Core grouping and group summary rendering
