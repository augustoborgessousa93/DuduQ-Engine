# Component Registry

## Core Result FX

- **Name:** DuduQFX / Success Celebration
- **Location:** `test/matching/gold-master-candidate-v1/src/core/ui/result-fx.js`
- **API:** `DuduQFX(layer).play("success")` or semantic `activity-success` event
- **Renderer:** Canvas 2D
- **Used by:** Matching and future mechanics (Target Shooter, Drag & Drop, Bubble Pop, Memory Quest, Smart Sentence, Word Slash)
- **Lifecycle:** Core owns trigger, resize, cleanup and cancellation

| Name | Purpose | API | Used by |
|---|---|---|---|
| HeaderControlButton | Audio/fullscreen control, shared 56px blue material and glyph scale | variant, size, state | HUD, question panel |
| GameActionButton | Primary/success/danger action; visual material only | variant, state, disabled | Matching, feedback |
| MascotHUD | Compact mascot with composited float and reduced-motion fallback | state, motion, theme | HUD |
| MascotFeedback | Feedback mascot with contained enter/breathe reaction | state, motion, theme | Correct and incorrect feedback |
| QuestionPanel | Instruction surface | content, audio, state | Mechanics |
| GameShell | Viewport-aware UI-scale coordinator; no root transform | designViewport, fullscreen state | Candidate and future mechanics |
| CTAAttention | Semantic next-action attention controller | delay, repeat, start, stop | Confirm, Retry, Continue |

## Penpot Core UI library (Gold Master)

These are the canonical Main Components created/normalized in the active
`DuduQ Core UI Kit — Gold Master` file. Runtime mechanics must instantiate the
mapped code module and may not redefine internal geometry.

| Penpot Main | Library component ID | Main shape ID | Geometry | Code mapping |
|---|---|---|---:|---|
| DuduQ / Core / HUD / Header | `0fa9ab83-e084-8008-8008-a72967059aa7` | `0fa9ab83-e084-8008-8008-a72966dce0d0` | 1056×94 | `DuduQHud` |
| DuduQ / Core / Control / Audio | `536e9278-6e26-80b9-8008-a63b9ad28e51` | `536e9278-6e26-80b9-8008-a63b999d0472` | 56×56 | `GameAudioButton` |
| DuduQ / Core / Control / Fullscreen | `536e9278-6e26-80b9-8008-a63b998ce41c` | `536e9278-6e26-80b9-8008-a63b9860aea6` | 56×56 | `GameFullscreenButton` |
| DuduQ / Core / Mascot / HUD | `002497e5-f2c0-8002-8008-a2b93cb5ffc5` | `002497e5-f2c0-8002-8008-a2b93c432866` | 180×220 | `MascotHUD` |
| DuduQ / Core / HUD / Question / Standard | `0fa9ab83-e084-8008-8008-a728c6944258` | `0fa9ab83-e084-8008-8008-a728c66b9e7d` | 720×86 | `QuestionPanel` |
| DuduQ / Core / HUD / Question / Wide | `0fa9ab83-e084-8008-8008-a72f17c66565` | `0fa9ab83-e084-8008-8008-a72f17332bed` | 826×86 | `QuestionPanel` |
| DuduQ / Core / Progress / Bar | `002497e5-f2c0-8002-8008-a2b0156e8679` | `002497e5-f2c0-8002-8008-a2b014d23579` | 260×16 | `ProgressBar` |
| DuduQ / Core / Progress / Badge | `002497e5-f2c0-8002-8008-a2b058e92255` | `002497e5-f2c0-8002-8008-a2b058765f88` | 72×38 | `ProgressBadge` |
| DuduQ / Core / Button / Confirm | `536e9278-6e26-80b9-8008-a63b485a4016` | `2258249c-3ca6-8006-8008-a39c823877cf` | 280×72 | `GameButton(primary)` |
| DuduQ / Core / Button / Continue | `0fa9ab83-e084-8008-8008-a7296b3f4f8e` | `0fa9ab83-e084-8008-8008-a7296b3ee745` | 280×72 | `GameButton(success)` |
| DuduQ / Core / Button / Try Again | `0fa9ab83-e084-8008-8008-a7296d93df86` | `0fa9ab83-e084-8008-8008-a7296d93866f` | 280×72 | `GameButton(danger)` |
| DuduQ / Core / Feedback / Correct | `a6aad67f-36be-80e2-8008-a51abe6b2f52` | `a6aad67f-36be-80e2-8008-a51abe6ac48f` | 297×176 | `FeedbackHUD(correct)` |
| DuduQ / Core / Feedback / Incorrect | `a6aad67f-36be-80e2-8008-a51abe7b2820` | `a6aad67f-36be-80e2-8008-a51abe7a85e3` | 294×170 | `FeedbackHUD(incorrect)` |
| DuduQ / Core / Status / Correct | `0fa9ab83-e084-8008-8008-a7296ff0cf3d` | `0fa9ab83-e084-8008-8008-a7296ff07a9b` | 38×38 | `StatusBadge(correct)` |
| DuduQ / Core / Status / Incorrect | `0fa9ab83-e084-8008-8008-a7297298302f` | `0fa9ab83-e084-8008-8008-a72972976e10` | 65×56 | `StatusBadge(incorrect)` |
| DuduQ / Core / Mascot / Feedback / Correct | `0fa9ab83-e084-8008-8008-a72eaef0a985` | `0fa9ab83-e084-8008-8008-a72eaeeaae24` | 216×212 | `MascotFeedback(correct)` |
| DuduQ / Core / Mascot / Feedback / Incorrect | `0fa9ab83-e084-8008-8008-a72e6d6496e4` | `0fa9ab83-e084-8008-8008-a72e6d5df530` | 230×220 | `MascotFeedback(incorrect)` |

Existing canonical controls remain unchanged: Audio `536e9278-6e26-80b9-8008-a63b9ad28e51`
(main `536e9278-6e26-80b9-8008-a63b999d0472`) and Fullscreen
`536e9278-6e26-80b9-8008-a63b998ce41c` (main
`536e9278-6e26-80b9-8008-a63b9860aea6`).

**Reuse policy:** content, semantic state, approved variant and external
position are mechanic-owned. Width, height, padding, radius, depth, surface,
shadow, control size and internal spacing are Core-owned.

The file also contains pre-existing/interrupted draft copies with duplicated
paths. They are not canonical mappings. The IDs in the table above are the
single source used by the bridge and are the only IDs permitted for new
mechanics.

Extend this registry when a shared primitive is introduced. Record location, accessibility, motion and dependencies.
