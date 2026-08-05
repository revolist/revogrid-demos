# RevoGrid Pro Infinity Scroll

A remote user directory implemented in Vanilla TypeScript, React, Vue, and
Angular. It migrates the maintained Infinity Scroll example into the standalone
`revogrid-demos` gallery.

## What it features

- Chunked remote loading as the viewport moves
- Configurable chunk, buffer, and preload thresholds
- Remote sorting and advanced filtering state forwarded to `loadData`
- Explicit backend `total` and `hasMore` pagination signals
- Pinned status and support rows outside the remote source lifecycle
- Complete Excel export fetched from the same simulated backend
- Deterministic 1,000-row dataset and live loading status

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

- `src/infinity-scroll.ts` — Vanilla TypeScript
- `src/infinity-scroll.react.tsx` — React
- `src/infinity-scroll.vue` — Vue
- `src/infinity-scroll.angular.ts` — Angular
- `src/infinity-scroll.shared.ts` — deterministic rows, filtering, sorting, and paging
- `src/infinity-scroll.export.ts` — complete remote export workflow
