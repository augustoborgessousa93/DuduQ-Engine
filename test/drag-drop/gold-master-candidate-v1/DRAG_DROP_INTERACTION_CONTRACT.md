# DUDUQ DRAG & DROP — INTERACTION CONTRACT

## State model

`READY → PICKING_UP → DRAGGING → OVER_VALID_ZONE | OVER_INVALID_ZONE → DROPPING → CHECKING → CORRECT | INCORRECT → RETURNING → READY`; `CORRECT → COMPLETED` when the activity relation set is satisfied. `READY → PICKING_UP` also covers keyboard/tap selection. `COMPLETED` is terminal for the current activity. Cancellation from PICKING_UP/DRAGGING returns to READY; lost pointer capture and interrupted focus resolve through RETURNING, never a stuck state.

`CHECKING` is data/host validation state, not a timeout. While CHECKING, the active tile and target are locked against reentry. Correct relations persist as `LOCKED`; an incorrect relation restores the same tile to its registered origin and clears only the transient target state. There is no scattered timeout-driven business logic.

## Pointer and touch architecture

Use Pointer Events—not HTML5 drag APIs. On `pointerdown`, only a primary pointer begins PICKING_UP after eligibility is checked; call pointer capture on the tile. A small movement threshold promotes to DRAGGING; the tile is rendered in a single fixed drag overlay using transform coordinates within the actual game container. Drop-zone rectangle checks use container-relative coordinates and update `OVER_VALID_ZONE`/`OVER_INVALID_ZONE`. `pointerup` resolves DROP or RETURNING; `pointercancel`, capture loss, escape, blur, resize, or target removal cleanly return the tile.

For tap-friendly use, touching a tile without drag selects it and gives a clear selected outline/announcement. Touching an eligible drop zone then executes the same DROPPING → CHECKING path. Do not require a fine pointer or hover; do not suppress page scrolling until an actual drag begins; use `touch-action: none` only on active draggable surfaces as implementation detail.

## Keyboard alternative

Keyboard completion is first-class:

1. Tab to a tile. Focus uses the shared high-contrast visible ring.
2. Space/Enter selects it; `Selected DOG. Choose a destination.` is announced in a polite live region.
3. Tab moves to DropZone(s). Space/Enter commits the selected relation.
4. Escape cancels selection. Arrow keys may move among tiles/zones as an enhancement, not the only route.

Each tile has an accessible name such as `DOG, draggable answer`; each zone describes its purpose without leaking correctness, e.g. `Answer nest for the pictured animal`. Correct/wrong outcome uses Core FeedbackHUD plus a concise status announcement. Focus returns predictably: incorrect → source tile; correct → next available tile/appropriate Core CTA; completed → Core Continue. Dragging never removes the focused DOM source.

## Semantic events and ownership

The mechanic publishes intent and result events (`drag:start`, `drag:end`, `answer:selected`, `answer:correct`, `answer:wrong`, `activity-success`). Core owns audio controls, FeedbackHUD, MascotFeedback, CTAAttention, DuduQFX and celebration lifecycle. The mechanic emits `activity-success` exactly once after COMPLETED; Core maps it to `celebration.success.canvas.aaa`. No local celebration or duplicate feedback surface is allowed.

## Acceptance checks for implementation

- A DOG tile can be completed via mouse, touch drag, tap-select → target, and keyboard select → target.
- Incorrect CAT drop returns naturally and leaves DOG, progress and Core feedback semantically consistent.
- Pointer cancellation, resize and focus loss never strand an overlay or lock input.
- Audio absent mode remains valid: image prompt + written options + answer nest still form a complete relation.
- Screen reader instructions state both actions and result; focus is never hidden by a drag overlay.
- `prefers-reduced-motion` keeps state/color/icon feedback while removing decorative/elastic motion.

