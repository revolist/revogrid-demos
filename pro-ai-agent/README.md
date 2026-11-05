# AI Grid Assistant

Start with the shared grid demo, then connect the optional backend for model interpretation.

| Example | Source |
| --- | --- |
| TypeScript | [AiAssistant.ts](src/AiAssistant.ts) |
| Vue | [AiAssistant.vue](src/AiAssistant.vue) |
| React | [AiAssistant.react.tsx](src/AiAssistant.react.tsx) |
| Angular | [AiAssistantAngular.ts](src/AiAssistantAngular.ts) |
| Node backend | [Setup, authentication and usage limits](src/backend/README.md) |

The framework demos share the same configuration and UI. Chat mounts in a right sidebar through `mountTo`, while `ui.controlsMountTo` places undo/redo and view controls above the grid. `New conversation` is a separate icon that clears messages, draft, request bookkeeping and AI context while preserving the current workspace. `ui.showNewConversation: false` hides it. Drag the shared resize divider or use its arrow keys to set the sidebar width. On narrow screens the assistant stacks below the grid; its conversation scrolls above the bottom composer. Typed requests try the same-origin AI backend without URL flags. If it is unavailable, the demo shows a clear message for free-form requests; scripted suggestions still work without a provider key. The backend is a separate workspace package, `@revolist/ai-backend-example`; provider credentials stay on the server.

Run `pnpm dev:ts`, `pnpm dev:react`, `pnpm dev:vue` or `pnpm dev:angular` from this directory. Build each framework with its matching `build:*` command. In the Pro checkout, Vite uses local built Pro, Pivot and Charts packages. The new Pivot/Charts integrations use links to the built packages in the Pro checkout while their matching public packages are unreleased. Run this version from the Pro checkout; replace those links with released package versions when available.

From the Pro repository root, after the normal workspace setup/build:

```sh
cp examples/revogrid-demos/pro-ai-agent/src/backend/.env.example examples/revogrid-demos/pro-ai-agent/src/backend/.env.local
pnpm --filter @revolist/ai-backend-example dev
```

See the [backend README](src/backend/README.md) for the demo connection URL and live-provider configuration. Browser demo sources live here in `src/`; the Pro standalone TypeScript, Vue, React and Angular entrypoints load this same implementation.

Local demos explicitly select `adapter: createViewSwitcherAiAdapter()` and install `ViewSwitcherPlugin` with native Pivot/Charts adapters. This optional preset owns report tools, source-query routing, source metadata preservation. View controls belong to the application toolbar. Applications can omit it, use existing custom tools/executors directly, or supply their own `AiAssistantAdapterFactory`.
The demo stays in one grid workspace. Grouping is ordinary grid configuration. AI switches between source data and Pivot; charts appear in a dashboard beside the report grid. The toolbar offers a compact Data Grid / active control switch, preserving each configuration.
Try “Show donut chart by amount and status”, “Show this as an area chart”,
“Show this as Pivot”, “Show grouped rows by Status”, “Show a dashboard with donut and area charts”, and “Go back to the previous view”.
These exact suggestions work in scripted mode too. Free-form equivalents use the configured AI backend.
Configurators are hidden by default, and dashboard charts omit the Data/Chart switch. Ask “Show chart settings” or “Show Pivot settings” to open the native configurator, and “Hide chart settings” or “Hide Pivot settings” to close it. The Data Grid / active control switch returns to source rows and reopens the latest native control with its saved configuration. New conversation preserves filters, grouping, chart models, layout and source data. Reload the page to restore the demo’s initial state. Switching saves the live
configuration, including manual changes; Back restores it against the current rows.
The remote orders demo keeps its server-owned action contract and does not install these local analytical views.

Compact charts reveal native export, context and close controls on hover or keyboard focus. The compact header reserves its own row so actions never cover chart marks. The top-right × removes that widget; remaining widgets keep their settings in view history. Removing the last widget frees the dashboard space. Chart settings replace a compact card and close through × or Escape. Pivot and dashboard report cells are read-only; edit the source in Data. The native Pivot Charts plugin keeps linked charts synchronized with regenerated reports. Filter/sort requests update the source query in place while retaining the current dashboard and its native chart instances. Source predicates use the original field metadata, so filtering never displays the initial Data grid.

The steps popup retains successful chart, dashboard and other plugin requests alongside filters and sorting. Plugin actions remain numbered history entries without a selective-removal button; only the newest filter/sort step can be undone, without replaying requests from the middle. Failed or cancelled actions do not add steps. Chat hides request history by default. Toolbar mode can show its history icon, without a step count. New conversation clears AI bookkeeping without applying grid changes. The demo has no workspace reset button or reset policy; reload the page to restore its initial state.

The demo sets `ui.maxVisibleSuggestions: 2`. Request history is hidden in chat; `ui.showRequestHistory` can override this. Other choices stay under More. Each variation has a short curated list with business labels such as Orders above 1K, Group by status, Totals by status and Order Charts. Configurator prompts remain available only through explicit typed requests.

The dashboard combines Amount by Status (donut) with Amount by Country (area), using native linked analytical slices. Try “Only Europe” or “Only Portugal” to see both respond. Columns stretch to fill the grid; Amount uses the registered numeric column type in both source and report grids.

The regular grid also uses native advanced filter controls: numeric Amount with a range slider, Excel-style Region/Country/Status selection filters, and the existing Status dropdown column. All four frameworks share this setup.

Amount remains a JavaScript number and is right-aligned in source and report grids.
The demo registers application-owned native tools in `AiAssistant.formatting.ts`:
- **Amounts above 100** installs a reactive highlight on the Amount column.
- **Highlight invalid Amounts** uses the existing column validator; **Check Amounts** reports invalid order IDs.
- **Format Amount as currency** changes display formatting through `DataGridFormattingPlugin`, preserving source values. The tool also accepts explicit order IDs for individual cells. Formatting and highlights share the column's native `dataGridFormat` definition, so they combine and survive a Pivot round trip.

These optional tools are supplied through `aiAssistant.actions`; applications can replace them. `createAiDemoFormattingActions(getGrid, translations)` accepts host translations for action messages.
