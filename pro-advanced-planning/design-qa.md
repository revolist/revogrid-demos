# Planning toolbar — option 2

Source visual truth: /Users/maks/.codex/generated_images/01a183b4-485c-7e70-988e-c4c2b5a6b120/exec-4bbe6529-148f-472f-b29d-efbc78a5828e.png
User refinements: Status/Priority toolbar dropdowns belong only to Kanban; regular-weight card titles.
Implementation screenshots:
- /Users/maks/.codex/visualizations/2026/10/28/01a183b4-485c-7e70-988e-c4c2b5a6b120/planning-grid-final.jpg
- /Users/maks/.codex/visualizations/2026/10/28/01a183b4-485c-7e70-988e-c4c2b5a6b120/planning-kanban-final.jpg
Full-view comparison: /Users/maks/.codex/visualizations/2026/10/28/01a183b4-485c-7e70-988e-c4c2b5a6b120/planning-option2-comparison.png
Focused comparison: /Users/maks/.codex/visualizations/2026/10/28/01a183b4-485c-7e70-988e-c4c2b5a6b120/planning-toolbar-comparison.png

## Viewport and normalization
Source 1942×809 raster concept; implementation 1280×720 browser viewport, 1× density.
Comparisons crop to the demo panel and normalize width to 1440px, preserving aspect ratio in the full comparison. The focused comparison is supplementary; use the full comparison for proportions. Browser checks additionally cover 1440×900 desktop and 390×844 mobile.
State: Grid and Kanban selected, default filters. Existing fixtures and grid columns retained.

## Findings and required fidelity surfaces
- Typography: existing product font retained, toolbar 13px and 32px controls; Kanban titles use 400 weight. Intentional density improvement over the concept.
- Spacing/layout: compact row, grouped controls, divider before Active tasks, Reset right aligned. Mobile wraps within available width.
- Colors/tokens: shared UI surface, field, border, text, focus and selected-state tokens retained; existing workflow colors preserved.
- Assets: existing Font Awesome magnifier, correct search padding, loaded owner portraits. No drawn replacement assets.
- Copy/content: Project: All; Status: All and Priority: All appear only in Kanban per user refinement. Fixture content remains authoritative over generated mock data.
- Interaction: search, project, preset on/off, reset, Kanban status/priority intersection and view-dependent filter visibility pass for TS/Vue/React/Angular. Card weight and mobile overflow assertions pass.
- Console: existing TS avatar/runtime regression passes without page errors.
No actionable P0/P1/P2 issues remain within this toolbar/card-title scope.

## Comparison history
Initial: full-width 38px fields stacked; focused regression failed before edits.
First implementation: compact controls; screenshot exposed unsupported local SVG import in TS sandbox. Fixed with the sandbox's existing Font Awesome dependency resolver.
Final: correct magnifier, compact toolbar, Kanban-only dropdowns and regular card titles verified in saved screenshots and browser tests.

## Follow-up polish
None required. Existing grid column widths, Kanban lane sizing and shell scrollbars are outside this change.

final result: passed
