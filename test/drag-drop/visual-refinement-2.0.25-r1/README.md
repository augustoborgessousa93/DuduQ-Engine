# Drag & Drop 2.0.25 — Visual Refinement R1 (isolated)

This folder is an isolated visual prototype only. It mounts the official Drag & Drop **2.0.25** and applies a test-only internal-card refinement without editing any immutable release, Core, Player, Shell, content module, or Assets-DuduQ.

## Visual changes in the isolated example

- destinations use more horizontal width;
- positioned items remain side by side inside a destination;
- positioned media is enlarged with `object-fit: contain`;
- the item bank disappears completely when empty and returns automatically when an item comes back;
- Confirm remains controlled by the existing 2.0.25 ready state and therefore exists only when the activity is fully positioned;
- each removable positioned item receives a small `×` outside the media footprint;
- `×` routes the item back through the existing native drag-to-bank path instead of mutating scoring state directly;
- layout is compacted to protect feedback/Confirm visibility and avoid horizontal overflow.

## Scope guard

The official release at `engine/releases/mechanics/drag-drop/2.0.25/` is untouched. This prototype must not be promoted to the mechanic until explicit visual approval.

## Validation

`e2e.mjs` checks the isolated example in:

- 1366×768
- 768×1024
- 390×844

It validates bank visibility, conditional Confirm, horizontal placed-item layout, larger media, removal with `×`, retry/success preservation, no critical 404, no pageError, and no horizontal overflow.
