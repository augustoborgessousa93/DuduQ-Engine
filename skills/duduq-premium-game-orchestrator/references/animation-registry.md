# Animation Registry

`celebration.success.canvas.aaa` is the canonical success animation family. Mechanics emit semantic `activity-success`; Core owns impact, burst, rain, finish and lifecycle. Do not register mechanic-specific celebration animations.

`celebration.success.canvas.aaa` — activity-success once, Canvas 2D requestAnimationFrame renderer; high 90 particles, three depth planes, ribbons, flutter, wind and shockwave; reduced-motion short fade fallback.

## AAA+ success rain

`celebration.success.rain.aaa` — activity-success, maximum 4200ms, transform/opacity-only, three depth layers; high 40 rain + 12 burst + 6 finish, medium 28 + 9 + 5, low 18 + 6 + 4. Reduced motion uses bounded fade particles and glow.

Use semantic tokens motion-instant, motion-fast, motion-normal and motion-slow; ease-standard, ease-enter, ease-exit, ease-bounce, ease-elastic and ease-spring. Register trigger, duration, transform/opacity usage, reduced-motion fallback and supported mechanics.

| Animation | Trigger | Duration | Properties | Reduced-motion fallback | Mechanics |
|---|---|---:|---|---|---|
| hud-float | HUD idle | 3.4s | transform | static mascot | all HUD consumers |
| connector-energy-flow | pair connected | 1.6s | SVG stroke-dashoffset | static cable | Matching |
| attention.cta.shake | primary next action | 700ms lead, 520ms shake, 5000ms repeat | transform | static brightness pulse | Matching and future action areas |
| celebration.success.medium | activity-success | 1200ms | transform, opacity | glow + 4–6 static sparkles | Matching and future mechanics |
| celebration.success.rain | activity-success | 2200–3600ms | transform, opacity | 6–8 short fades | Matching and future mechanics |
