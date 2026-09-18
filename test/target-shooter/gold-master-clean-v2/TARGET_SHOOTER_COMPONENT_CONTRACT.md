# Target Shooter Component Contract

## Shared Core (reused, not duplicated)

`GameShell`, `DuduQHud`, `MascotHUD`, `ProgressBar`, `ProgressBadge`, `QuestionPanel`, `GameAudioButton`, `GameFullscreenButton`, `FeedbackHUD`, `MascotFeedback`, `GameButton`, `CTAAttention`, and `DuduQFX` are imported from `core/ui/index.js`.

## Target-specific components

- `DuduQMagicLauncher`: front-facing modular launcher; fixed base/support, aim and recoil layers, world FX layer.
- `.target-shooter-target`: semantic Dog/Cat/Rabbit/Fish controls with target-local ring, animal and status badge.
- `TargetShooterGameplay`: owns target selection, aim, projectile, impact and feedback sequencing.

No local duplicate Core components exist. `activity-success` is dispatched to the shared `DuduQFX` celebration listener.
