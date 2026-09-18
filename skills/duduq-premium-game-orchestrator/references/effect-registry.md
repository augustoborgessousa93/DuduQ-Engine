# Effect Registry

## Locked Core standard

**Preset:** `celebration.success.canvas.aaa`  
**Semantic trigger:** `activity-success`  
**Renderer/owner:** Canvas 2D / DUDUQ Core  
**Usage:** atividade concluída com sucesso  
**Reusable:** YES  
**Targets:** Matching, Target Shooter, Drag & Drop, Bubble Pop, Memory Quest, Smart Sentence, Word Slash  
**Quality:** LOW/MEDIUM/HIGH (existing tier policy)  
**Lifecycle:** Core owns resize, fullscreen/embed bounds, reduced-motion fallback, cleanup and cancellation.

`celebration.success.canvas.aaa` — Canvas 2D success sequence (impact → burst → rain → magic finish), 90/60/35/10 quality budgets, DPR-aware resize and automatic cleanup.

## AAA+ success rain

`celebration.success.rain.aaa` — activity-success once per success state; premium three-plane rain with ribbons, stars, sparkles and magic finish; pointer-events none, cleaned after 4200ms; reduced-motion fallback is bounded fade/glow.

| Effect | Trigger | Intensity | Cost | Reduced-motion fallback |
|---|---|---|---|---|
| success-small | answer:correct | SUBTLE | low | icon + color + copy |
| wrong-soft | answer:wrong | SUBTLE | low | icon + copy |
| connector-energy-flow | match:success / connected | SUBTLE | low | static cable core |
| attention.cta.shake | primary-next-action | NORMAL | low | static CTA highlight |
| celebration.success.medium | activity-success | NORMAL | low/medium/high tiers | glow + 4–6 static stars | Matching feedback and future mechanics |
| celebration.success.rain | activity-success | MEDIUM | legacy compatibility preset | short vertical fades + glow | Matching and future mechanics |
| star-burst | reward | NORMAL | medium | static stars |
| target-hit | impact | NORMAL | medium | brief opacity flash |
