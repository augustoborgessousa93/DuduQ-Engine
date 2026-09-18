# DuduQ Core Component Contract

This contract is the Design-to-Code bridge for reusable game UI. Penpot Main IDs
are authoritative only when present in the official library; a missing Main ID is
an explicit library gap, not permission for a mechanic-local replacement.

| Penpot component | Main ID | Core code module | Mechanic authority |
|---|---|---|---|
| DuduQ / Core / Control / Audio | `536e9278-6e26-80b9-8008-a63b9ad28e51` (main `536e9278-6e26-80b9-8008-a63b999d0472`) | `GameAudioButton` | external position only; 56×56 |
| DuduQ / Core / Control / Fullscreen | `536e9278-6e26-80b9-8008-a63b998ce41c` (main `536e9278-6e26-80b9-8008-a63b9860aea6`) | `GameFullscreenButton` | Header slot only; 56×56 |
| DuduQ / Core / Mascot / HUD | `002497e5-f2c0-8002-8008-a2b93cb5ffc5` (main `002497e5-f2c0-8002-8008-a2b93c432866`) | `MascotHUD` | no internal sizing; 180×220 |
| DuduQ / Core / Feedback / Correct | `a6aad67f-36be-80e2-8008-a51abe6b2f52` (main `a6aad67f-36be-80e2-8008-a51abe6ac48f`) | `FeedbackHUD` + `MascotFeedback("correct")` | external position only; 297×176 |
| DuduQ / Core / Feedback / Incorrect | `a6aad67f-36be-80e2-8008-a51abe7b2820` (main `a6aad67f-36be-80e2-8008-a51abe7a85e3`) | `FeedbackHUD` + `MascotFeedback("incorrect")` | external position only; 294×170 |
| DuduQ / Core / Mascot / Feedback / Correct | `0fa9ab83-e084-8008-8008-a72eaef0a985` (main `0fa9ab83-e084-8008-8008-a72eaeeaae24`) | `MascotFeedback("correct")` | no internal sizing; 216×212 |
| DuduQ / Core / Mascot / Feedback / Incorrect | `0fa9ab83-e084-8008-8008-a72e6d6496e4` (main `0fa9ab83-e084-8008-8008-a72e6d5df530`) | `MascotFeedback("incorrect")` | no internal sizing; 230×220 |
| DuduQ / Core / HUD / Header | `0fa9ab83-e084-8008-8008-a72967059aa7` (main `0fa9ab83-e084-8008-8008-a72966dce0d0`) | `DuduQHud` + `GameShell` | title, subtitle, progress only; 1056×94 |
| DuduQ / Core / HUD / Question / Standard | `0fa9ab83-e084-8008-8008-a728c6944258` (main `0fa9ab83-e084-8008-8008-a728c66b9e7d`) | `QuestionPanel` | eyebrow, question, audio; 720×86 |
| DuduQ / Core / HUD / Question / Wide | `0fa9ab83-e084-8008-8008-a72f17c66565` (main `0fa9ab83-e084-8008-8008-a72f17332bed`) | `QuestionPanel` | approved wide variant; eyebrow, question, audio; 826×86 |
| DuduQ / Core / Progress / Bar | `002497e5-f2c0-8002-8008-a2b0156e8679` (main `002497e5-f2c0-8002-8008-a2b014d23579`) | `ProgressBar` | value only; 260×16 |
| DuduQ / Core / Progress / Badge | `002497e5-f2c0-8002-8008-a2b058e92255` (main `002497e5-f2c0-8002-8008-a2b058765f88`) | `ProgressBadge` | label/value only; 72×38 |
| DuduQ / Core / Button / Confirm | `536e9278-6e26-80b9-8008-a63b485a4016` (main `2258249c-3ca6-8006-8008-a39c823877cf`) | `GameButton("primary")` | label/state only; 280×72 |
| DuduQ / Core / Button / Continue | `0fa9ab83-e084-8008-8008-a7296b3f4f8e` (main `0fa9ab83-e084-8008-8008-a7296b3ee745`) | `GameButton("success")` | label/state only; 280×72 |
| DuduQ / Core / Button / Try Again | `0fa9ab83-e084-8008-8008-a7296d93df86` (main `0fa9ab83-e084-8008-8008-a7296d93866f`) | `GameButton("danger")` | label/state only; 280×72 |
| DuduQ / Core / Status / Correct | `0fa9ab83-e084-8008-8008-a7296ff0cf3d` (main `0fa9ab83-e084-8008-8008-a7296ff07a9b`) | `StatusBadge("correct")` | state only; 38×38 |
| DuduQ / Core / Status / Incorrect | `0fa9ab83-e084-8008-8008-a7297298302f` (main `0fa9ab83-e084-8008-8008-a72972976e10`) | `StatusBadge("incorrect")` | state only; 65×56 |
| DuduQ / Core / Mascot / Feedback / Correct | `0fa9ab83-e084-8008-8008-a72eaef0a985` (main `0fa9ab83-e084-8008-8008-a72eaeeaae24`) | `MascotFeedback("correct")` | no internal sizing; 216×212 |
| DuduQ / Core / Mascot / Feedback / Incorrect | `0fa9ab83-e084-8008-8008-a72e6d6496e4` (main `0fa9ab83-e084-8008-8008-a72e6d5df530`) | `MascotFeedback("incorrect")` | no internal sizing; 230×220 |

## Runtime source

All listed code modules are exported by
`test/matching/gold-master-candidate-v1/src/core/ui/index.js`. `GameShell` is
exported by `test/matching/gold-master-candidate-v1/src/game-shell.js`.

## Existing Core geometry tokens

The following are measured runtime tokens from the approved Matching source
(`styles/tokens.css`), not mechanic overrides:

- `--duduq-control-size: 56px`
- `--duduq-control-radius: 18px`
- `--duduq-control-icon-size: 26px`
- `--duduq-hud-mascot-min-size: 64px`
- `--duduq-header-mascot-size: clamp(60px, 4.5cqi, 72px)`

The IDs above were read from the active Penpot library after creation and each
listed component had a real documentation instance used for an opacity
propagation check. Mechanics may override content, approved variant and
external position only; internal geometry remains Core-owned.
