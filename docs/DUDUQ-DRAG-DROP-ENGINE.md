# DUDUQ Drag & Drop Engine

`core/duduq-drag-drop-engine.js` is the single DOM-free engine for DUDUQ drag-and-drop activities. A renderer owns only markup, pointer events, visuals, audio controls, and responsive layout. Activity data never owns a mechanic.

## Activity schema

```js
{
  id: "activity-id",
  mechanic: "drag-drop",
  layout: "grouping" | "target-grid",
  prompt: { eyebrow, title, audioSrc },
  validation: { strategy: "groupId" | "answerKey" },
  items: [{ id, type: "text" | "audio" | "image", text, imageSrc, audioSrc, answerKey, correctGroupId }],
  targets: [{ id, type: "image" | "group", imageSrc, title, icon, answerKey, groupId, capacity }]
}
```

`capacity` defaults to `1` for an image target and `"infinite"` for a group. An occupied capacity-one target returns its unlocked occupant to editing; a finite target above one refuses an extra placement, preserving all occupants. Invalid/duplicate IDs, unsupported types, and missing strategy keys are rejected when the activity is created.

## Strategies and layouts

- `groupId`: `item.correctGroupId === target.groupId`. Used by the Grouping renderer at `/play/drag-drop/`.
- `answerKey`: `item.answerKey === target.answerKey`. Used by the Target Grid / Multimedia renderer at `/play/drag-drop-multimedia/`.
- `grouping` renders group containers and supports multiple placements per target.
- `target-grid` renders image targets with one slot each. It may mix text, audio, and image items.

## Lifecycle

`core/duduq-drag-drop-lifecycle.js` is the renderer-facing contract for `canEdit`, `place`, `remove`, `canConfirm`, `validate`, `retry`, and `continueActivity`. `editing` permits place/remove. `validate()` marks correct items locked and returns either `retry` or `completed`. `retry()` returns only incorrect items to editing while correct items remain locked. `continueActivity()` succeeds exactly once after completion. Renderers map these results to the canonical Confirm, Feedback, Result FX, Sound, and no-auto-advance behavior.

Audio is an `audio` draggable type. Its renderer preserves the existing play control lifecycle (one audio at a time, playing visual, press state) and must prevent the play control from initiating pointer drag.

Fullscreen remains renderer-owned: it changes responsive geometry only. The engine stays DOM-free, so hit testing remains in the renderer's native coordinate system.

## Incremental route migration

`/play/drag-drop/` is the first migrated and homologated route. It passes its complete grouping activity configuration to the shared engine and lifecycle. `core/duduq-drag-drop-engine.js` owns round state, placements, validation, correct locks, retry, and continuation; `play/drag-drop/drag-drop.js` owns DOM associations, pointer capture/drag preview, layout, and presentation/audio effects, without a parallel round-state model.

`/play/drag-drop-multimedia/` remains on its existing adapter until its own parity migration is performed and reviewed. Do not migrate it in the same change as Grouping, and do not use the Mixed QA route as authority for either official route.

## Adding a mode

Create data with existing item/target types, choose a layout renderer and validation strategy, then instantiate `createDuduqDragDropEngine(activity)`. Add a renderer only when the layout is genuinely new; do not create a second state, validation, feedback, or drag engine. `test/drag-drop/unified-engine-mixed-fixture.mjs` is the QA fixture showing text, audio, and image items in one target-grid configuration.
