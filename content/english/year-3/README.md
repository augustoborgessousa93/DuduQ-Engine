# DUDUQ English — Year 3

## Purpose

Year 3 is the first production year built under the scale architecture:

> **CONTENT defines WHAT to teach.**  
> **CORE / ENGINE / MECHANICS define HOW the game works.**

The goal is to preserve the official pedagogical bank while avoiding a new stack of module/year-specific structural hotfixes.

## Source of truth

Official internal source: `DUDUQ_Ingles_1ao5(20260825-012151).docx` — Revisão Pedagógica Integral v2.2.

Year 3 contains 6 modules × 15 items = **90 official IDs**:

1. Greetings, Friends & Personal Information
2. Numbers 1–50 & Age
3. Family, Toys & Animals
4. Math in English & School Objects
5. Shapes, Colors, Numbers & Size
6. Transportation & Body Description

The source files live inside each `module-XX/` folder as `module-XX-source-v22.js` and contain only:

- source ID and order;
- editorial status;
- difficulty;
- skill / revised ability;
- final prompt;
- four source alternatives;
- source answer;
- media / suggested format;
- module pedagogical profile.

Runtime mechanics must never mutate these source values silently.

## Architecture

```text
module-XX-source-v22.js       official content / gabarito
            ↓
year3-plan-v1.js              pedagogical + mechanic selection
            ↓
year3-visual-resolver-v1.js   official asset first, controlled fallback
            ↓
year3-factory-v1.js           native DuduQ question/activity payload
            ↓
core/ + engine/ + mechanics/  shared behavior
            ↓
module-XX/index.html          thin public entrypoint
```

### Shared presentation / Host layers

Year 3 entrypoints should use the shared low-risk layers introduced during scale preparation:

- `core/duduq-gamified-typography.js`
- `core/duduq-tactile-buttons-3d.js`
- `core/duduq-host-completion-guard.js`

These must remain year-agnostic.

## Pedagogical profile

Year 3 still belongs to the literacy-sensitive group (Years 1–3), but introduces more supported reading and controlled production than Year 2.

Prioritize:

- repeatable audio;
- clear images / scenes;
- short readable labels and mini-profiles;
- image → word / short phrase;
- audio → numeral / image;
- contextual dialogue;
- guided sentence building;
- one or two short supported sentences when productive transfer is appropriate.

Avoid long autonomous English reading or text-only repetition for the sake of mechanic diversity.

## Mechanic selection

Available mechanics remain shared:

- Target Shooter
- Matching
- Drag & Drop
- Bubble Pop
- Smart Sentence
- Memory Quest
- Word Slash

The factory/plan may choose a subset according to the linguistic construct. Equal distribution is not required.

Word Slash must be used cautiously in Year 3 and only when word recognition/reading is genuinely part of the construct.

## Asset policy

Resolution priority:

1. exact official Assets-DuduQ file;
2. canonical alias / normalized semantic match;
3. deterministic semantic composition when the exact visual does not exist;
4. explicit controlled fallback that never breaks the activity.

A fallback must encode the concept being assessed (object, count, color, size, shape, etc.), not merely one descriptor.

## Structural bug rule

Before creating a local patch, classify the issue:

- **content** → fix source/plan only when editorial/pedagogical;
- **mechanic** → fix shared mechanic;
- **core/engine** → fix shared core/engine;
- **pedagogical** → keep scoped to the necessary year/module;
- **asset** → fix resolver/library/alias.

Do not create `year3-*-fix.js` for a behavior that can also affect other years.

## Checkpoint policy

Do not deeply homologate after every module. Each module checkpoint needs at least:

- public entry opens, no white screen;
- source ID/order/gabarito contract passes;
- correct and incorrect interaction paths work;
- feedback and progression work;
- required images/audio resolve or fall back safely;
- desktop and mobile remain usable;
- cards/text/images do not overflow or become unusable.

Non-blocking cosmetic refinements are recorded for transversal review instead of stopping production.

## Regression gates

- `Shared Engine Foundation RC1`
- `Year 3 Source Integrity RC1`

As runtime modules are added, Year 3 gets a quick public/runtime checkpoint gate rather than a large Year-2-style homologation stack per module.
