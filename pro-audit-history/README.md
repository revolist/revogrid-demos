# RevoGrid Pro Audit History

An invoice review ledger implemented in Vanilla TypeScript, React, Vue, and
Angular. It moves the maintained Audit History example into the standalone
`revogrid-demos` gallery with a focused, production-style workflow.

## What it features

- Attributed cell and bulk-edit history with stable invoice identities
- A docked review panel with cell, row, and table scopes
- Before/after comparison, filters, JSON/CSV export, and restore actions
- Seeded audit records plus live records from new grid edits
- Cell-and-row flash feedback for edits and restore replay
- Direct `auditHistory` and `cellFlash` property configuration

## Run it

```bash
pnpm dev
pnpm dev:react
pnpm dev:vue
pnpm dev:angular
```

Build variants use `build:ts`, `build:react`, `build:vue`, and
`build:angular`. The default `pnpm build` produces the Vanilla TypeScript demo
used by the RevoGrid showcase gallery.

## Main files

- `src/audit-history.ts` — Vanilla TypeScript
- `src/audit-history.react.tsx` — React
- `src/audit-history.vue` — Vue
- `src/audit-history.angular.ts` — Angular
- `src/audit-history.shared.ts` — invoices, audit records, columns, and config
