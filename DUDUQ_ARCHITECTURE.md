# DUDUQ Runtime Architecture

## Production source of truth

- **Penpot** is the visual authoring source.
- **Penpot MCP** (`http://localhost:4401/mcp`) is the live connection; the Penpot plugin must be connected.
- **Design Graph** records live structure, identity, screen changes, and history.
- Penpot `generateMarkup`, `generateStyle`, `generateFontFaces`, and `export_shape` provide the lossless visual payload.
- **Visual Packages** under `design-system/runtime/screens/` are versioned runtime artifacts.
- **DuduQScreenRuntime** in `core/duduq-screen-runtime.js` is the generic visual host.
- Behavior/game runtime remains separate from visual markup. Matching and Target Shooter are validated consumers; their Gold Master DOM is behavior-only and is never a second visible scene.
- **Git** is the technical source of truth for checkpoints, rollback, and continuation.
- Golden visual verification launches its own isolated Playwright Chromium; it never requires an external CDP port or a human browser session.

## Official flow

```text
Penpot LIVE
  → Design Graph capture
  → affected-screen detection
  → lossless visual compilation
  → staged Visual Package
  → Universal Screen Host
  → gameplay/behavior binding
  → E2E validation
  → atomic activation
  → successful graph/package promotion
  → Git checkpoint
```

The normal human command is `npm run duduq:update-core`. It does not require a component name, node ID, property name, or manually supplied snapshot.

## Golden baselines

- Golden compiler: `e12e2ef`.
- Golden Universal Screen Host: `9084fd44`.
- Matching runtime recovery: `88ab394`.
- Matching Universal Runtime: `5aed8165`.
- Target Shooter Universal Runtime: `fd22da82`.
- Golden live update path: `70c1c791`.
- Golden consumers: Matching and Target Shooter.

## Runtime packages

`design-system/runtime/screens/matching-master/` and `target-shooter-master/` contain `manifest.json`, generated markup, styles, fonts, and bindings. Package hashes are recorded in `DUDUQ_PROJECT_STATE.json` and in the successful graph metadata.

The host is shared. Screen-specific behavior belongs in the existing mechanic integration layer. Human mechanic previews expose the complete LIVE_VISUAL_PACKAGE tree as the only visible scene; the Gold Master iframe is hidden and used only as a behavior engine. Interactive behavior is rebound to visible Penpot source nodes through `bindings.json`.

## Future work

For a new mechanic: identify/author its board in Penpot, compile the package with the existing compiler, mount it with `DuduQScreenRuntime`, connect existing behavior bindings, run the consumer E2E, then register the validated consumer and commit a checkpoint. Do not create property-specific visual handlers or component-specific visual adapters.

For normal visual edits to integrated screens: edit Penpot and run `npm run duduq:update-core`. The validated generic matrix covers move, color, size, shadow, opacity, typography, SVG/icon, image, add, remove, reorder, and new-screen detection.

## Rollback

Failed staged packages are rejected before activation and the previous active package remains in place. To recover a known-good state, inspect `design-system/penpot-sync/graph/last-successful.json`, package manifests under `design-system/runtime/screens/`, and checkout the production baseline commit recorded in `DUDUQ_PROJECT_STATE.json`. Never edit successful snapshots manually.

## Known limitations

Live capture requires a connected Penpot plugin. Visual and human-interaction verification launches isolated Playwright Chromium and must not depend on external CDP, `127.0.0.1:9223`, or a browser opened by a user. Legacy iframe geometry projection is deprecated and is not loaded by production previews.
