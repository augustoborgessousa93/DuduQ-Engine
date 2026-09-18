# DuduQ Canonical HUD contract

The human-approved, read-only Penpot mains are Header `88954f25-7a86-800b-8008-a87e6f0d4e44` and Question `88954f25-7a86-800b-8008-a87e700a22e9` (reference frame `2258249c-3ca6-8006-8008-a3ae753195c7`). Their sole runtime exports are `DuduQCanonicalHeaderHUD` and `DuduQCanonicalQuestionHUD` from `core/ui/index.js`.

Header accepts only `title`, `progressCurrent`, `progressTotal`, `mascot`, and `onFullscreen`. Question accepts only `eyebrow`, `question`, `audio`, `onAudio`, and `audioDisabled`. Header subtitles are deprecated and ignored: instructional text belongs exclusively to the Question HUD. Core owns markup, layout, typography, progress fill/badge, audio/fullscreen controls, disabled state, focus semantics, and all responsive rules. Progress is clamped to `0..total` and exposed as an accessible progress bar. Audio and fullscreen controls are native buttons with accessible labels.

The shared stylesheet is authoritative at 1920×1080, 1366×768, 1280×720, 640×360, and 480×320. Mechanics may supply content and callbacks only; they may not override HUD geometry, dimensions, radius, shadows, fills, typography, progress, fullscreen, or audio styling.

`DuduQCanonicalHeaderHUD` composes `DuduQCanonicalFullscreenButton`; `DuduQCanonicalQuestionHUD` composes `DuduQCanonicalAudioButton`. The fullscreen control owns enter/exit, `fullscreenchange` state synchronization, keyboard semantics, and focus state. The audio control owns its icon, state, disabled behavior, and invokes its supplied `onPlay` callback once. **NO MECHANIC MAY IMPLEMENT A LOCAL FULLSCREEN BUTTON. NO MECHANIC MAY IMPLEMENT A LOCAL QUESTION AUDIO BUTTON.**

**NO MECHANIC MAY CREATE A LOCAL HEADER HUD. NO MECHANIC MAY CREATE A LOCAL QUESTION HUD.** Existing player roles are legacy-compatible Core-owned adapters until all consumers are migrated; they are not a mechanic extension point.
