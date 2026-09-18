# DUDUQ DRAG & DROP — RESPONSIVE / EMBED CONTRACT

## Rules

The activity measures its actual `GameShell` container, never assumes viewport size or uses a global scale transform. Container-aware Grid/Flex and `clamp()` sizing preserve hierarchy; CSS container queries switch composition based on available inline/block size. Core component internals retain registered geometry—only outer placement and the target-specific arena adapt.

The playable arena uses a three-region layout: prompt, answer nest, and answer tray. At adequate inline width, tiles are a single evenly spaced row. At constrained width, the tray becomes a balanced 2×2 grid before labels shrink; at constrained height, the prompt frame reduces its nonsemantic padding before interactive targets reduce. Tiles keep at least 48px block-size with 8px+ separation; keyboard focus rings are included in measured safe area.

## Target plan

| Container | Planned composition | Non-negotiables |
|---|---|---|
| 1920×1080 | Centered max-width board with generous breathing room; one-row tray. | Prompt remains dominant, never visually dwarfed by empty background. |
| 1366×768 | Header → QuestionPanel → compact arena → one-row tray all visible with no scrolling. | Gold Master reference; preserve lower safe spacing. |
| 1280×720 | Tighter vertical rhythm; prompt medallion and nest reduce proportionally; one-row tray if labels fit. | 48px+ tiles and no overlap with feedback layer. |
| 640×360 | Short-landscape mode: smaller prompt frame, concise directional cue, 2×2 tray if needed. | Question, prompt, nest, all choices remain visible and operable. |
| 480×320 | Ultra-compact landscape: two-column tray, minimal decor, prompt uses contain sizing, feedback remains Core overlay/region. | No global scaling, horizontal clipping, or targets below 48px. |

## Embed and resilience

Use ResizeObserver plus shell/container bounds for initial and changed size. Recompute drag target rectangles on drag start and observed resize, cancel/return a currently dragged tile safely if geometry changes. Respect iframe clipping, safe insets supplied by host, and host fullscreen state; do not query or mutate a parent document. No fixed `100vh` dependency.

## Responsive quality gates

- No vertical scroll at the 1366×768 reference board.
- No horizontal overflow, clipped focus ring, obscured tile, or unreachable drop zone at any specified size.
- Text labels remain readable; wrapping is deliberate only for `RABBIT` if a localized string requires it, never ellipsized during an active drag.
- Pointer, tap, keyboard and reduced-motion paths preserve the same semantic state model at every size.
- Decorative layers may disappear in low space; learning prompt, target, controls and answer labels may not.

