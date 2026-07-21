# Pro E-commerce Analytics

A customer analytics RevoGrid Pro demo implemented in Vanilla TypeScript, React, Vue, and Angular.

## What it features

- Grouped Profile and Commerce columns for customer and transaction metrics
- Rich customer, gender, membership, discount, rating, currency, and spend-change cells
- Editable dropdowns with avatar and status-style option rendering
- Row context actions for copy, duplicate, discount changes, export, and delete
- Column context actions for sorting, clearing, hiding, pinning, and export
- Toolbar-driven expression filtering with a full-text fallback
- Per-column slider, selection, and text filtering in the header
- Runtime column visibility controls and responsive last-column stretching
- Styled Excel export configuration for headers, values, number formats, and workbook metadata

## Pro feature inventory

Every plugin in this table comes from `@revolist/revogrid-pro` and is registered directly by all four framework variants through `ecommercePlugins`.

| Pro plugin | How this demo uses it and why it helps |
| --- | --- |
| `ContextMenuPlugin` | Places customer actions and column-management commands beside the clicked row or header, reducing trips to a separate toolbar. |
| `ColumnHidePlugin` | Applies toolbar and context-menu visibility changes while preserving the full grouped column model for later restoration. |
| `ColumnStretchPlugin` | Expands the last visible column into spare width so the analytics grid fits its container cleanly. |
| `AdvanceFilterPlugin` | Applies the slider, selection, and text filter definitions already configured on ecommerce columns. |
| `FilterHeaderPlugin` | Renders the interactive per-column filter controls directly in the grid headers. |

### Pro plugin installed automatically

This companion is created internally and should not be repeated in `ecommercePlugins`.

| Auto-installed plugin | Installed by | Benefit in this demo |
| --- | --- | --- |
| `ColumnGroupRenderSyncPlugin` | `ColumnHidePlugin` | Reprojects Profile and Commerce group-header indexes as child columns are hidden or restored, preventing grouped headers from drifting out of alignment. |

### Other Pro APIs used

| Pro API | Benefit in this demo |
| --- | --- |
| `ColumnDropdown` | Provides controlled editors for Customer, Gender, Membership, and Discount fields, keeping edits within the demo's valid choices. |
| `avatarTemplate` | Renders recognizable customer initials consistently in avatar cells and dropdown options. |
| Excel export cell and transformer contracts | Attach workbook names, sheet names, number formats, header styles, group-header styles, and value-specific styling to the export configuration. |

The toolbar expression parser remains demo application code. It filters the source before passing rows to RevoGrid, while `AdvanceFilterPlugin` and `FilterHeaderPlugin` apply the per-column filters to those visible rows.

### Excel export registration status

The four framework entry points import `ExportExcelPlugin`, look it up through `getPlugins()`, and provide detailed `excelExport` column configuration. However, `ExportExcelPlugin` is not currently included in `ecommercePlugins`, and none of the three registered plugins installs it automatically. As written, the export lookup returns no plugin and the Export action does not create a workbook.

Register `ExportExcelPlugin` in `ecommercePlugins` to activate the prepared XLSX export behavior. Once registered, its benefit is a styled, shareable workbook that preserves the analytics table's labels, formats, and visual cues.

## Run it

```bash
pnpm dev          # Vanilla TypeScript
pnpm dev:react
pnpm dev:vue
pnpm dev:angular
```

Build variants use the matching `build:ts`, `build:react`, `build:vue`, and `build:angular` scripts.

## Main files

- `src/ecommerce.ts` — Vanilla TypeScript
- `src/ecommerce.react.tsx` — React
- `src/ecommerce.vue` — Vue
- `src/ecommerce.angular.ts` — Angular
- `src/ecommerce.shared.ts` — columns, Pro plugin registration, menus, filtering, and export configuration
- `src/sys-data/ecommerce.columns.ts` — grouped source column definitions
- `src/sys-data/ecommerce.data.ts` — customer analytics dataset
