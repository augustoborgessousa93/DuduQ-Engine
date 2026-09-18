# DUDUQ Premium Game Skills System v1.0

## Route

### Success celebration routing

When a mechanic needs a success celebration, FIRST consult `celebration.success.canvas.aaa` in the effect registry. Reuse the Core preset when it fits; do not create `matching.confetti`, `target.confetti` or another success-FX variant. The mechanic emits only `activity-success`; DUDUQ Core handles rendering, physics, lifecycle and cleanup.

Discover existing components, effects, assets and motion first. Then select the smallest relevant set: system/component work uses design-system + components; visual remasters add art-director, lighting and educational-ux; interaction work adds motion, game-feel and the mechanic-specific skill; cross-device work adds responsive, accessibility, performance and QA.

Never change production, mechanics or pedagogical content unless the request explicitly authorizes it. Keep content -> adapter/state -> mechanic -> UI -> motion/VFX/audio hooks boundaries.

## Quality gates

Use registries before creation. Components expose variant, size, state, theme, motion, vfx, disabled and interactive where appropriate. Layer scenes L0 background through L10 celebration. Prefer semantic events: game:start, question:start, answer:selected, answer:correct, answer:wrong, drag:start, drag:end, match:success, combo, streak, reward, level:complete, game:complete.

## References

Read component-registry.md for reusable UI, effect-registry.md for effects, asset-registry.md for assets, and animation-registry.md for motion. Apply quality LOW/MEDIUM/HIGH and effect intensity OFF/SUBTLE/NORMAL/EPIC.
