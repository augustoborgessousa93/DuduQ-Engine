# Matching controlled proof — v1

## Routing

The orchestrator selected design-system, UI-components, button-master, matching-master,
educational-UX, responsive, mascot, typography, motion, game-feel/VFX, accessibility,
performance, QA and design-to-code bridge. No new mechanic, asset, component family or
effect engine is needed.

## Reuse-first decision

- Reused `HeaderControlButton` for Audio and Fullscreen; raised its single shared glyph token.
- Reused `GameActionButton` for Confirm; only the Matching action-area owns its position.
- Reused `MascotHUD`; normalized its contained box and composited float.
- Reused `ResultFX` and connector energy flow; no new VFX emitter.
- Reused existing background, cards, connectors, assets and Matching Engine unchanged.

## Quality profile

The Candidate uses subtle intensity, transform/opacity-oriented motion, existing
`prefers-reduced-motion` fallbacks and no new runtime dependency. The CTA is in a flow
action area after the playfield so connector geometry ends before the CTA region.

## Functional polish — fullscreen, retry and CTA

- `GameShell` calculates `--duduq-ui-scale` from the smaller width/height ratio against
  the 1366×768 Gold Master viewport, capped at `.82…1.2`; fullscreen is exposed as a
  Core state and triggers a recomputation without root `transform: scale()`.
- Retry retains connections whose state is `correct` and removes only `incorrect` ones.
  MatchingBoard locks retained cards and preserves their green connector and badge.
- Confirm derives visibility and enabled state from `connections.length === pairs.length`.
  It is hidden and non-focusable while incomplete, then uses the registered
  `attention.cta.shake` preset on completion.
- MascotHUD uses its Core 76px reference size with 64px/92px safety bounds, `flex: 0 0
  auto`, and transform-only float. Compact containers apply their explicit 46px/34px
  sizes.

## Mascot and CTA attention correction

The legacy stylesheet contained competing `.hud-mascot` sizes and a clipping
`.game-hud { overflow: hidden }` rule. The Core authority now gives the mascot a
non-shrinking 300px desktop brand slot, visible overflow, explicit `width`/`height`, no
max-size cap and 64px–92px bounds. `CTAAttention` is a single reusable controller for
Confirm, Retry and Continue: it waits 700ms, shakes for 560ms, then repeats after 4.2s
only while the action remains visible and enabled; hover, focus, pointerdown and click stop it.

## Success celebration

`celebration.success.soft` extends the existing ResultFX layer instead of adding a second
emitter. The medium tier creates 10 radial particles plus 2 sparkles, keeps the layer
non-interactive, performs one feedback glow pulse, and cleans itself at 1200ms. Reduced
motion limits the burst to static/fading stars and the existing glow. MascotFeedback is a
Core variant with an 84px-high contained slot and a small reaction rather than transform-led sizing.
