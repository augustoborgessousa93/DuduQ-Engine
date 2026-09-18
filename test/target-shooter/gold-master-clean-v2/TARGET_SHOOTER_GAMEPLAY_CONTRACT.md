# Target Shooter Gameplay Contract

## State machine

`IDLE → TARGET_SELECTED → AIMING → CHARGING → FIRING → FLIGHT → IMPACT → EVALUATING → CORRECT_FEEDBACK | INCORRECT_FEEDBACK → READY_NEXT | RESETTING`.

Only one sequence may run at a time. Additional input is locked after selection. Hover/selection is blue and exclusive; correctness is evaluated only after impact. Incorrect feedback shows the selected target's red ring/X and shake. Correct feedback shows green ring/check pulse, dims non-correct targets, and emits one `activity-success` event for shared celebration.

## Aim and effects

Pointer aim is smoothly clamped to the safe launcher range. Ballistic destination uses runtime target geometry and is independent from visual launcher rotation. Projectile spawns at the transformed muzzle marker, follows a deterministic short arc, and ends at the effective target center. Impact is centered before answer-state reveal. Portal/particles are charge-only; projectile/trail/impact are transient.

## Accessibility and recovery

Targets remain buttons with keyboard activation and visible focus. `prefers-reduced-motion` removes nonessential shake/pulse/interpolation while preserving state readability. Try Again and Continue use the shared feedback action; reset clears target classes, badges, dimming and FX without reloading.
