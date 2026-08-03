# Kanban design QA

## Evidence

- Source visual truth:
  - `/Users/maks/Desktop/Screenshot 2026-08-02 at 15.57.02.png` — 1846 × 1410 px
  - `/Users/maks/Desktop/Screenshot 2026-08-02 at 15.57.25.png` — 1862 × 1174 px
  - `/Users/maks/Desktop/Screenshot 2026-08-02 at 15.56.15.png` — 1342 × 1196 px
  - `/Users/maks/Desktop/Screenshot 2026-08-02 at 16.09.02.png` — 2048 × 729 px drag-state reference exposing the uncontained ghost.
- Implementation evidence: `/private/var/folders/_p/8r8qf76x73702y2kg2sc5k0m0000gn/T/TemporaryItems/NSIRD_screencaptureui_Bq0s9U/Screenshot 2026-08-02 at 16.10.03.png` — 628 × 332 px focused crop.
- Second implementation evidence: `/private/var/folders/_p/8r8qf76x73702y2kg2sc5k0m0000gn/T/TemporaryItems/NSIRD_screencaptureui_e9Od0I/Screenshot 2026-08-02 at 16.14.58.png` — 1334 × 872 px board crop during drag.
- Drag-affordance evidence: `/private/var/folders/_p/8r8qf76x73702y2kg2sc5k0m0000gn/T/TemporaryItems/NSIRD_screencaptureui_9LYMiL/Screenshot 2026-08-02 at 16.09.39.png` — 564 × 272 px card crop.
- Proportion/typography evidence: `/private/var/folders/_p/8r8qf76x73702y2kg2sc5k0m0000gn/T/TemporaryItems/NSIRD_screencaptureui_BX8jdD/Screenshot 2026-08-02 at 16.32.27.png` — 1784 × 1190 px board crop.
- Route: `kanban-board/ts`, light theme.
- Viewport and density: unavailable from the focused implementation crop; no density normalization was applied.
- Browser automation: blocked because the requested in-app Browser connection reports `Browser is not available: iab`.

## Findings

- [P1] Card metadata overflowed into the following native grid row.
  - Evidence: the implementation crop shows the owner avatar/name and story points crossing the card bottom and the next row divider.
  - Fix applied: introduced uniform `cardRowHeight`, set the showcase to 176 CSS px, and contained custom card content inside its reserved card shell.
- [P2] The previous projection placed multiple cards inside one cell and introduced a nested scrolling/virtualization surface.
  - Fix applied: each swimlane now expands into native RevoGrid card rows, each workflow cell contains at most one card, and a compact final row provides an append drop target.
- [P2] Swimlane collapse was not reliable for derived lanes.
  - Fix applied: derived lanes are collapsible by default and runtime collapse state is reapplied during reprojection.
- [P2] The swimlane label column consumed full width even when lane context was secondary.
  - Fix applied: added an independent accessible column-collapse state that reduces the row-header rail from 176 px to 52 px and presents each lane title as a constrained vertical badge. This does not change card rows or each swimlane's own collapse state.
- [P2] Empty alignment cells exposed repeated drop affordances.
  - Evidence: the second implementation crop shows a dashed empty target within the aligned card rows.
  - Fix applied: only occupied card cells and the first empty cell immediately after each column's final card are drop targets; all other alignment cells are blank and non-droppable.
- [P2] A dedicated dotted drag icon remained after the full card became draggable.
  - Evidence: the focused card crop shows the redundant dotted control consuming the left content inset.
  - Fix applied: removed the visible handle, made the focusable card shell the keyboard pickup/drop target, and restored the content padding.
- [P2] Header status pills and card typography were visually too dominant at narrow column widths.
  - Evidence: the board crop shows count/WIP pills competing with truncated workflow titles, while heavy card titles and priority badges increase the perceived scale of each card.
  - Fix applied: compacted count, WIP, priority, and collapse-control geometry; added strict flex shrinking and ellipsis; clamped title/description regions; aligned card metadata to the bottom; and capped every Kanban-specific font weight at 500.
- [P2] The showcase added a redundant full-board frame inside the demo canvas.
  - Evidence: the proportion screenshot shows a rounded border and shadow around the entire Kanban surface, duplicating the surrounding demo frame.
  - Fix applied: removed the showcase border, radius, and shadow and explicitly cleared the grid host border.
- [P1] The body-mounted pointer ghost lost the managed card surface and rendered as loose, overlapping card text.
  - Evidence: the 2048 × 729 drag-state screenshot shows the dragged card content without a background, border, containment, or reliable hierarchy, plus a grip-like fragment above the task ID.
  - Fix applied: the DOM layer now creates one inert, identity-free ghost surface, preserves safe card/customization classes, copies resolved light/dark Kanban tokens, clamps source width to 220–320 px, caps height at 136 px, removes selection/drag state, and reserves space for a compact multi-card count pill. The showcase ghost clamps title and description to one line and contains all content.

## Required fidelity surfaces

- Typography: all Kanban-specific styles now use a maximum font weight of 500; a full post-fix capture is still required to verify the lighter hierarchy across all columns.
- Spacing/layout: the reported row overlap was fixed in code with uniform reserved height; post-fix browser evidence is unavailable.
- Colors/tokens: the demo uses neutral board surfaces and semantic priority/status tones aligned with the references; full-view comparison remains pending.
- Image quality/assets: people rendering now uses the shared Pro avatar template rather than a bespoke Kanban avatar.
- Copy/content: concise task IDs, titles, descriptions, owners, priorities, and story points are used consistently.
- Focused comparison: performed against the supplied 628 × 332 px crop; it directly exposed the row-height defect.
- Full-view comparison: blocked because no post-fix implementation screenshot can be captured through the selected Browser.

## Comparison history

1. Initial implementation crop: P1 owner/points metadata overflow below the card shell.
2. Second implementation crop: uniform card rows contain the visible owner and story-point metadata, confirming the overflow fix. A repeated empty target remained visible.
3. Fix: limited each column to one append target immediately after its final visible card. Post-fix visual evidence for this final adjustment is blocked by the unavailable in-app Browser connection.
4. Fix: removed the redundant dotted handle while preserving card-shell pointer, touch, and keyboard drag operation. Post-fix visual evidence is blocked by the unavailable in-app Browser connection.
5. Fix: reduced badge/header chrome, enforced overflow containment, and capped Kanban typography at weight 500. The 1784 × 1190 px proportion screenshot confirms compact badges, aligned card footers, and the lighter hierarchy.
6. Fix: removed the redundant whole-board frame. Post-fix visual evidence for this final adjustment is blocked by the unavailable in-app Browser connection.
7. Fix: added a compact swimlane-label rail with vertical badges and an accessible header toggle. Renderer tests verify expanded/collapsed widths, classes, accessible state, toggle dispatch, and lane-badge content; post-fix visual evidence is blocked by the unavailable in-app Browser connection.
8. Drag-state reference: P1 ghost appeared as uncontained duplicate text with a grip-like fragment. Fix: replaced the raw clone presentation with a themed, bounded ghost card and removed card identity/transient state. A red-before-green DOM-layer test verifies structure, semantics, theme transfer, sizing, customization-class preservation, content, and batch count; post-fix browser evidence is blocked by the unavailable Browser connection.

## Interaction coverage

- Automated unit coverage verifies one-card-per-cell projection, append rows, collapsed swimlanes, compact swimlane-column rendering, whole-card pointer initiation, interactive-child drag exclusion, and contained pointer-ghost creation.
- Browser checks for pointer drag, touch drag, keyboard drop, collapse controls, responsive widths, and console errors remain blocked.

## Final result

final result: blocked

Blocker: the selected in-app Browser is not connected, so a same-viewport post-fix screenshot and interaction pass cannot be captured.
