# DUDUQ Continuity Handoff

## What are we doing?
Maintaining three approved-runtime native Penpot editable workbenches inside the existing DUDUQ Control Panel.

## Just completed
Created and inspected native workbenches: Matching `b96e92df-258a-802e-8008-a91dbb811d92`, Target Shooter `b96e92df-258a-802e-8008-a91dbc21b142`, and Drag & Drop `b96e92df-258a-802e-8008-a91dbc64c72a`. Added `design-system/duduq-screen-property-map.json`.

## Validation
Runtime evidence remains unchanged; gameplay and Magic Cannon / Magic Launcher behavior are protected.

## Approved / frozen
Header Main 88954f25-7a86-800b-8008-a87e6f0d4e44; Question Main 88954f25-7a86-800b-8008-a87e700a22e9; Control Panel 855af85f-faf4-8069-8008-a8e75a3255fd; gameplay and Magic Cannon / Magic Launcher protected.

## Current limitation
Penpot live sync is not claimed. The property map records inspected native IDs; a future sync must read current Penpot properties before writing Core.

## Next exact action
Human visual review of the three workbenches, then controlled Penpot-property export to Core. No gameplay changes.

## Penpot
`PENPOT_SYNC_REQUIRED`: browser/MCP review is the current authority.

## Branch / commit
`recovery/duduq-20260919-workbench-master` / `12219e8` (published; preserves local workbench state without overwriting the diverged development branch).
