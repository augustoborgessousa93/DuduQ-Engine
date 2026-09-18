# Target Shooter Gold Master Regression Checklist

- [ ] Header geometry and centering unchanged.
- [ ] Question geometry, audio integration and centering unchanged.
- [ ] Dog/Cat/Rabbit/Fish positions, artwork and rings unchanged.
- [ ] Fish optical center remains aligned to its target frame.
- [ ] Correct/incorrect badges remain target-local, balanced on the upper-right circumference.
- [ ] Launcher root, scale, pivot, muzzle point and front kit unchanged.
- [ ] Projectile and impact terminate at the runtime target center.
- [ ] Initial targets are all IDLE; no premature blue/green/red state or badge.
- [ ] Hover/selection blue state is exclusive and moves between all four targets.
- [ ] Wrong shots show red/X/shake only after impact; correct shot shows green/check/pulse after impact.
- [ ] Non-correct targets subdue only after success; reset returns all to neutral.
- [ ] Rapid clicks produce one sequence/projectile/evaluation.
- [ ] `activity-success` emits once and shared celebration runs; no local confetti.
- [ ] Audio replay and fullscreen enter/exit remain functional.
- [ ] Reduced-motion behavior remains readable.
- [ ] Responsive checks pass at 1366×768, 1280×720 and 640×360.
- [ ] No imports or runtime dependencies from legacy Target Shooter, Matching, Drag & Drop or production.
