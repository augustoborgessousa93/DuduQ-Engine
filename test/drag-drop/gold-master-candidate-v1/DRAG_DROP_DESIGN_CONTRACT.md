# DUDUQ DRAG & DROP — GOLD MASTER DESIGN CONTRACT

**Status:** design candidate for human visual review. This document deliberately contains no runtime, adapter, legacy-mechanic, production, Matching, or Target Shooter changes.

## Purpose and educational fixture

The Gold Master proves one unambiguous learning loop: **image ↔ sound ↔ written word**. The QuestionPanel says `OUÇA E ARRASTE A PALAVRA CORRETA`; its Core GameAudioButton plays “DOG”; the PromptVisual depicts a dog; the only correct DraggableTile is `DOG`.

Question data is semantic only. It supplies prompt media, optional audio, answer choices, correct relation(s), accessible labels, and pedagogical metadata. It must never contain selectors, classes, coordinates, animation instructions, timing, or drag implementation details. A mechanic adapter maps that data into the interaction model.

## 1366 × 768 Gold Master composition

The board is a centered, layered game board—not a worksheet or an input form. Core owns the header, QuestionPanel and feedback layers. The DragDropArena owns only the center play surface.

```text
┌────────────────── Core Header / HUD (DuduQHud) ──────────────────┐
│ mascot · progress · audio · fullscreen                            │
├────────────────── Core QuestionPanel ─────────────────────────────┤
│              OUÇA E ARRASTE A PALAVRA CORRETA                    │
├──────────── DragDropArena: sky-blue framed game board ────────────┤
│                                                                    │
│                     PromptVisual                                  │
│              [ official DuduQ dog illustration ]                  │
│                                                                    │
│                 ↓ soft directional cue                            │
│          ╔════ recessed answer nest / drop zone ════╗             │
│          ║  hand cue + ARRASTE AQUI                 ║             │
│          ╚══════════════════════════════════════════╝             │
│                                                                    │
│       [ DOG ]   [ CAT ]   [ RABBIT ]   [ FROG ]  draggable tray  │
└────────────────────────────────────────────────────────────────────┘
```

The prompt occupies the visual center and carries the semantic answer target. The answer nest sits directly below it, so the movement reads downwards as “name what you see.” The tray is visually separate yet within the same board, using a softly recessed rail to establish origin and preserve each tile’s return location. No local mascot, audio, feedback, CTA, or celebration is created.

## Visual-material specification

### Arena — `DuduQ / DragDrop / Arena`

- A cool sky-to-cream, softly textured field with rounded 28px-class outer geometry, white rim light and restrained deep-blue underside; it is a play board rather than a white card.
- Prompt zone: a warm off-white picture medallion with a subtle inner shadow, cloud-like rim, and enough clear space that the animal silhouette reads at a glance.
- The arena uses a maximum readable width, outer composition spacing, and container-relative height; it does not redefine any Core-component geometry.
- Decorative detail remains behind content at L0–L2. Prompt, nest and tiles remain at L3–L5; a dragging tile is L6; Core feedback and celebration retain their existing higher layers.

### PromptVisual — `DuduQ / DragDrop / PromptVisual`

- Large official DuduQ-style dog asset, facing into the board; no textual answer printed in the image.
- Intrinsic aspect ratio is preserved; contain rather than crop. Its semantic alt is `A dog`.
- The prompt frame may show a quiet image cue, but it never duplicates QuestionPanel or Core audio control.

### DropZone — `DuduQ / DragDrop / DropZone`

The drop zone is an answer **nest**, not a text input: deep inset cavity, rounded perimeter, quiet dashed inner stitch, pale blue inner glow, and a small downward/hand cue. `ARRASTE AQUI` is supplementary visible copy and is always paired with the affordance.

| Variant | Visual contract |
|---|---|
| Empty | Blue-gray recess, directional cue, dashed stitch, no selected-answer content. |
| Drag Over | Blue rim brightens, cavity glow rises, cue resolves to a target ring; no layout movement. |
| Correct | DuduQ green rim/glow, tile seated in cavity, Core correct status/feedback owns the confirmation. |
| Incorrect | Coral rim plus brief local color/icon acknowledgement; the tile is returning, then Empty restores. |
| Locked | Correct material remains calm and stable; no longer accepts input. |

### DraggableTile — `DuduQ / DragDrop / DraggableTile`

Each word tile is a roomy, pillowed game piece rather than a button: off-white face, light blue edge, 3–4px visual depth, upper sheen, strong Fredoka/Nunito label, and a small nonessential grip motif. `DOG`, `CAT`, `RABBIT`, `FROG` all maintain a minimum 48px touch height in constrained layouts; normal landscape height is 64px+.

| Variant | Visual contract |
|---|---|
| Idle | Raised, available, word fully readable. |
| Hover | +1–2px lift, brighter rim; cursor/grab hint only for precision pointers. |
| Pressed | Depth compresses; no answer validation yet. |
| Dragging | 1.03–1.05 scale, increased shadow, optional 1–2° tilt; origin leaves a quiet placeholder. |
| Valid Target | Dragging visual plus target’s blue/green eligibility response. |
| Invalid Target | Neutral/coral eligibility signal without a punitive shake. |
| Placed | Seated in the nest and unavailable from tray. |
| Returning | Natural short path to the preserved origin placeholder. |
| Disabled | Lower contrast but AA-readable, no grab cue, reason announced when focused. |

## Component and design/code mapping

Core instances used exactly as registered: `GameShell`, `DuduQHud`, `MascotHUD`, `ProgressBar`, `ProgressBadge`, `QuestionPanel`, `GameAudioButton`, `GameFullscreenButton`, `FeedbackHUD`, `MascotFeedback`, `GameButton`, `CTAAttention`, and `DuduQFX` via `activity-success` → `celebration.success.canvas.aaa`.

| Target-specific candidate | Inputs owned by mechanic | Output/state contract | Core boundary |
|---|---|---|---|
| DragDropArena | prompt relation, choices, composition mode | drop target registration; local visual state | places Core instances only; does not recreate them |
| PromptVisual | semantic media, alt, kind | stable prompt anchor | no QuestionPanel/audio duplication |
| DropZone | semantic target ID, capacity, state | eligible/ineligible drop result | correct/incorrect feedback goes to Core |
| DraggableTray | choice IDs/order | origin registration and layout | no validation logic in content |
| DraggableTile | choice ID, accessible name, state | pointer/keyboard intent | not a Core GameButton |
| InteractionFeedback | semantic correct/wrong/pending | local board-state presentation only | FeedbackHUD/MascotFeedback own messages/CTA |

Future modes use the same relation model: text→text, image→text, audio→text, text→image, audio→image, image→image, multiple matching, classification, and sequence/order. The shell and Core components do not change; only PromptVisual/DraggableTile/DropZone renderers and relation cardinality vary.

## Motion, feedback, performance

Use semantic motion tokens (`motion-fast`, `motion-normal`, `ease-standard`, `ease-enter`, `ease-exit`, `ease-spring`) rather than mechanic-local timing payloads. Pickup is a restrained transform/shadow lift; correct drop is a small squash/settle and green glow; incorrect drop has a brief coral acknowledgement and a natural return—no harsh shake, long delay, local confetti, or CSS layout animation. Core receives `answer:correct` / `answer:wrong` as appropriate, and only final completion emits `activity-success` once.

The presentation must use transform/opacity for transient movement, one drag overlay, cached drop-target rectangles only while dragging, `requestAnimationFrame`-coalesced pointer movement, passive non-drag listeners, and no per-frame React/layout reconstruction. Reduced motion retains color, icon, focus, state copy and final placement but removes floating/tilt, minimizes lift, and makes return direct and quick.

## Asset register

Required new asset: **one official DuduQ-style dog illustration** (transparent PNG/WebP or SVG, semantic source record, 1:1 or portrait-friendly crop, intrinsic dimensions and license/ownership recorded before implementation). Existing Core mascot, audio/control, feedback and celebration assets are reused. No new mascot, particle, or local confetti asset is permitted.

## Penpot status

Penpot board created: `DUDUQ DRAG & DROP — GOLD MASTER SCREEN 1.0` (`cc5094bd-0364-80cf-8008-a7a83495416b`), 1366×768. It uses the isolated new board only; approved Matching and Target Shooter boards were not modified.

| Role | Penpot Main / component ID | Documentation instance ID | Runtime mapping |
|---|---|---|---|
| DragDropArena | `cc5094bd-0364-80cf-8008-a7a857c79bc1` (main `cc5094bd-0364-80cf-8008-a7a8548800a8`) | `f18aba45-0237-8016-8008-a7a9ada6e690` | `DragDropArena` |
| PromptVisual | `cc5094bd-0364-80cf-8008-a7a85a49d450` (main `cc5094bd-0364-80cf-8008-a7a857e743c1`) | `f18aba45-0237-8016-8008-a7a9aded825e` | `PromptVisual` |
| DropZone | `cc5094bd-0364-80cf-8008-a7a85d2b6cf8` (main `cc5094bd-0364-80cf-8008-a7a85a6a0018`) | `f18aba45-0237-8016-8008-a7a9ae1aa307` | `DropZone` |
| DraggableTile | `cc5094bd-0364-80cf-8008-a7a86022388d` (main `cc5094bd-0364-80cf-8008-a7a85d5de51c`) | `f18aba45-0237-8016-8008-a7a9ae4b9722` | `DraggableTile` |

The full-screen composition uses Core instances: Header `cc5094bd-0364-80cf-8008-a7a83aca9c45`, QuestionPanel Wide `cc5094bd-0364-80cf-8008-a7a83db02f13`, GameAudioButton `cc5094bd-0364-80cf-8008-a7a83e99c53e`, and DOG asset `cc5094bd-0364-80cf-8008-a7a844acea27`. The registered header internally retains its approved progress, badge, fullscreen, and mascot geometry.

One harmless temporary fill change was made on a decorative internal element of each new Main, observed on its documentation instance, and restored. Propagation passed for all four new target-specific components. State preparation remains named in the component contract: DropZone (Empty, Drag Over, Correct, Incorrect, Locked); DraggableTile (Idle, Hover, Pressed, Dragging, Placed, Disabled).

## Surgical PromptVisual repair — 2026-09-17

- **Board:** `cc5094bd-0364-80cf-8008-a7a83495416b` — 1366×768.
- **Canonical Main:** `DuduQ / DragDrop / PromptVisual / Image` — main `c11e4df8-bf5f-80ff-8008-a7af431fb028`; component `c11e4df8-bf5f-80ff-8008-a7af47f5dade`; 350×176.
- **Gold Master instance:** `c11e4df8-bf5f-80ff-8008-a7af486f5c3f`.
- **Documentation instance:** `c11e4df8-bf5f-80ff-8008-a7aff55e28ec`.
- **Official DOG asset source:** `DuduQ dog` image asset `d8ac01df-6646-81d2-8008-a2b750d74354`, isolated from the official Target Shooter composition’s pedagogical-illustration layer. The image itself, rather than any target shell, ring, pedestal, status icon, or label, is the asset used by DragDrop.
- **Role:** a centered, nonverbal image-identification cue: cream card surface, soft ivory image well, restrained cyan accent, and clean DOG illustration. The written answer remains exclusively in the DraggableTile.
- **Dependency ownership:** DragDrop owns this Main and both instances. **Target Shooter dependency = NONE.** No Target Shooter component, target ring, pedestal, status icon, or written `DOG` text exists in the PromptVisual hierarchy.
- **Propagation test:** PASS. The DragDrop-only `PromptVisual / restrained sparkle` opacity was changed temporarily on the Main, observed on the documentation instance, then restored to `1`.
