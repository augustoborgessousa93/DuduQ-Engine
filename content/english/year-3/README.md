# DuduQ English — Year 3 v2.3 multimodal

## Source of truth

Pedagogical source: `DUDUQ_Ingles_1ao5_Revisao_Alfabetizacao_Multimodal_v2.3.docx` (24 Aug 2026).

The Year 3 implementation must preserve all 90 source IDs (`EN3-M1-*` through `EN3-M6-*`), source answers, item order and pedagogical intent. No mechanic may change the construct being assessed.

## Year 3 literacy / accessibility contract

Year 3 is a transition year. Autonomous English reading must **not** be required for success. Written words and short sentences may appear progressively, but verbal content must remain supported by repeatable audio plus image, icon or sufficient context.

Implementation defaults:

- repeatable audio for verbal content;
- tappable textual alternatives must also be listenable when they appear before the answer;
- images / icons / context support meaning before autonomous reading;
- spelling is progressive exposure, not an access barrier;
- scored tasks may be receptive; guided oral / productive extensions are transfer evidence;
- feedback must allow another attempt and reinforce the target chunk / vocabulary;
- fictitious profiles only; no sensitive real-world student data.

## Modules

1. **Greetings, Friends & Personal Information** — social interactions, introducing a friend, simple fictitious personal information, greetings / farewells and alphabet support.
2. **Numbers 1–50 & Age** — numbers through 50 and simple age exchanges (`How old are you? / I am ... years old.`).
3. **Family, Toys & Animals** — family vocabulary, toys, animals, guided descriptions with number / color / plural support.
4. **Math in English & School Objects** — English vocabulary for deliberately simple mathematical operations plus school objects; arithmetic must not become the main difficulty.
5. **Shapes, Colors, Numbers & Size** — visual descriptions combining shape, quantity, color and size, privileging meaning over abstract syntax labels.
6. **Transportation & Body Description** — transportation and body vocabulary with short supported descriptions using color, quantity and size.

## Mechanic selection policy

Mechanics are selected per item only after checking pedagogical fit and runtime capability. The allowed pool includes the currently homologated DuduQ mechanics, including Word Slash where pedagogically appropriate, but Year 3 must not be forced into text-heavy interaction simply to increase mechanic diversity.

Priority order when multiple mechanics can represent the same construct:

1. audio + visual / contextual recognition;
2. image ↔ audio / supported spelling association;
3. multimodal Matching with complete semantic pairs;
4. Drag & Drop for association / construction when motor demand remains appropriate;
5. Bubble Pop / Target Shooter for rapid recognition only when they do not remove needed context;
6. Word Slash / Smart Sentence only where the source item genuinely introduces supported written recognition or guided construction.

## Asset policy

Use `Assets-DuduQ` first. Resolve assets by semantic concept, not by fragile filename equality alone. Prefer official transparent object / character / number / color / family / school / transportation / body assets. Deterministic generated vectors may only be used when an exact repository asset genuinely does not exist and must never silently replace an available official asset.

## Release gates before promotion

- 90/90 Year 3 source IDs present and in order;
- source answers preserved;
- no autonomous-reading-only item in Year 3;
- all required audio / visual supports resolvable;
- no broken image / generic placeholder where an official asset exists;
- declared mechanic compatible with Router / Schema;
- desktop and mobile Chromium interaction tests;
- public entrypoint smoke for M01–M06;
- visual review of Intro, representative mechanic states, feedback and responsive layout;
- promotion only through a dedicated Year 3 PR with rollback-safe merge.