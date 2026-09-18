# DUDUQ Design System Contract

Penpot is the human visual source; Core is the runtime implementation; mechanics consume Core. A visual shared component is official only when it has a Penpot Main mapping and a Core runtime path in `duduq-component-manifest.json`.

## Ownership

Mechanics may supply content, data, callback, semantic state and external composition. Core owns shared dimensions, spacing, radius, depth, controls, HUD structure, responsive rules and accessibility. No mechanic may clone Header, Question HUD, Progress, Audio, Fullscreen or shared Button.

## Main vs instance

Edit visual structure in a Penpot Main. Instance overrides are limited to the manifest's `instanceOverrides`. The Header Gold Master `88954f25-7a86-800b-8008-a87e6f0d4e44` and Question Gold Master `88954f25-7a86-800b-8008-a87e700a22e9` are protected: never delete, replace or duplicate them.

## States and motion

Shared controls use `IDLE`, `HOVER`, `FOCUS`, `PRESSED`, `DISABLED`; target uses `SELECTED`, `CORRECT`, `INCORRECT`. Header mascot motion is runtime-owned, transform-only, 3.8 seconds, with `prefers-reduced-motion` fallback.

## Current explicit library gap

`DUDUQ / Target / Base` and `DUDUQ / Target / Select` do not yet have confirmed Penpot Main IDs. They are recorded as `PENPOT_MAIN_REQUIRED`; this is not permission for a clone.
