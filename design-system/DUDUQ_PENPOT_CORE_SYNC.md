# DUDUQ Penpot ↔ Core Sync

## Real capability audit

This environment has an authenticated Penpot browser tab and controlled browser UI automation. No Penpot API, Penpot MCP tool, or supported programmatic export/write endpoint was available. Therefore live automatic sync is **not** asserted.

## Repeatable workflow

1. Augusto edits an official Main in Penpot and approves it.
2. Export only the authorized properties to `design-system/duduq-penpot-authorized-export.json` (a reviewed JSON handoff, never an inferred canvas scrape).
3. Run `npm run duduq:sync:penpot-to-core` to classify `NO_CHANGE`, `PENPOT_CHANGED`, `CORE_CHANGED`, or `BOTH_CHANGED`.
4. `BOTH_CHANGED` stops and writes a conflict report. A human chooses direction.
5. Apply a reviewed mapping change, run guards and syntax checks, then update the snapshot with human approval.

## Core → Penpot

When Core changes a mapped visual property, the workflow reports `PENPOT UPDATE REQUIRED: YES`. A Codex operator can update the exact Main through the already authenticated browser UI, then verify the visible result. Until a Penpot write API/MCP is installed, this is controlled browser-assisted sync, not automatic write sync.
