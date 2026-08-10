# Data Grid Context Menu & Formatting

A standalone RevoGrid Pro showcase that combines the predefined,
spreadsheet-style data-grid context menu with a rich **Format Cells** editor.
Right-click cells, row headers, synthetic row groups, leaf columns, and grouped
column headers to explore commands tailored to each surface. From a writable
cell or column header, open **Format** to apply a quick preset or launch the
complete formatting dialog.

`DataGridContextMenuPlugin` automatically installs the formatting runtime, so
the menu, selection targeting, stored formats, and editor work as one feature.
Formatting changes presentation metadata only: source values remain unchanged
for editing, sorting, filtering, formulas, and application code.

## Context-menu showcase

The example demonstrates the configuration paths applications commonly need:

- complete defaults through `DataGridContextMenuPlugin`;
- built-in raw cell inspection, including readonly cells;
- complete row actions, including the danger-styled `row.delete` command;
- business-oriented application summaries appended with `items`, using the
  shared Pro dialog for employee, row, team, and column details;
- replacement of the grouped-column-header surface with `getItems`;
- selection-aware clipboard commands, including multi-range formats;
- readonly ID cells and conditionally readonly archived scores;
- several predefined cell formats bound through the direct
  `dataGridFormatting` grid property in React and Vue, and through
  `additionalData.dataGridFormatting` for Angular wrapper compatibility;
- optional row pinning and application-owned column schema creation;
- filtering, column auto-size, grouped columns, row groups, and CSV/XLSX export capabilities.

The built-in **Inspect cell** and **Inspect column** actions expose technical
details such as raw values, coordinates, schema, and readonly metadata. The
custom **View…** actions demonstrate application-owned business UI instead:
employee profiles, selected-row details, team summaries, column summaries, and
column-group summaries in the shared Pro dialog.

## Rich formatting editor

The **Format** submenu provides type-aware shortcuts, while **More formats…**
opens the full editor with a live original-versus-formatted preview.

The editor includes:

- locale-aware value formats for numbers, currency, accounting, percentages,
  scientific notation, dates, times, date-time values, and plain text;
- decimal, thousands-separator, currency, and negative-number controls;
- font family, size, bold, italic, underline, and strikethrough controls;
- text and fill colors, including custom colors;
- horizontal and vertical alignment, text wrapping, and borders;
- formatting for the active cell range, multiple selected ranges, or an entire
  column when opened from its header;
- readonly-aware targeting that skips cells the user cannot edit;
- **Clear formatting** for removing value and appearance overrides without
  mutating source data.

Columns with custom cell templates retain their authored content. For those
targets, the editor keeps appearance formatting available while avoiding value
formatting that could replace interactive content.

## Run the showcase

The same showcase is implemented in TypeScript, React, Vue, and Angular under
`src/`. Use the matching command from the repository root:

```bash
pnpm dev:data-grid-context-menu
pnpm dev:data-grid-context-menu:react
pnpm dev:data-grid-context-menu:vue
pnpm dev:data-grid-context-menu:angular
```

Run its structural coverage with:

```bash
pnpm --filter revogrid-demo-pro-data-grid-context-menu test
```
