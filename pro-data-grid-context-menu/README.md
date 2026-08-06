# Universal Data Grid Context Menu

A standalone RevoGrid Pro showcase for the predefined, spreadsheet-style data-grid context menu. Right-click cells, row headers, synthetic row groups, leaf columns, and grouped column headers to compare the semantic presets.

The example intentionally demonstrates the configuration paths applications usually need:

- complete defaults through `DataGridContextMenuPlugin`;
- stable item IDs by hiding `row.delete`;
- an application action appended with `items`;
- replacement of the grouped-column-header surface with `getItems`;
- selection-aware clipboard commands, including multi-range formats;
- readonly ID cells and conditionally readonly archived scores;
- optional row pinning and application-owned column schema creation;
- filtering, auto-size, grouped columns, row groups, and CSV/XLSX export capabilities.

## Frameworks

The same showcase is implemented in TypeScript, React, Vue, and Angular under `src/`. Use the matching command from the repository root:

```bash
pnpm dev:data-grid-context-menu
pnpm dev:data-grid-context-menu:react
pnpm dev:data-grid-context-menu:vue
pnpm dev:data-grid-context-menu:angular
```

Run the structural coverage with:

```bash
pnpm --filter revogrid-demo-pro-data-grid-context-menu test
```
