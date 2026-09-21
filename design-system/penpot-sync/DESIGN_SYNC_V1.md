# Design Sync V1 — Question Audio

`design-system/question-audio-component-contract.json` is the visual intermediate contract. The Core imports generated semantic variables from `core/duduq-question-audio-contract.css`; Matching and Target Shooter keep consuming the canonical Question HUD with no mechanic edits.

- Dry run: `node scripts/duduq-design-sync-question-audio.mjs`
- Apply: `node scripts/duduq-design-sync-question-audio.mjs --apply`
- Rollback: restore the manifest and generated CSS through Git.

Supported safe properties: dimensions, surface, depth/highlight metadata, border, radius, shadow, icon name/asset/color/size, and hover/pressed/disabled visual state values. Structural layers/slots require review; unknown top-level contract properties block. Add a component by giving it its own contract, Core consumer, and focused sync test.
