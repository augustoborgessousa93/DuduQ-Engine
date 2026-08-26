# Year 2 Gamification Diversity — RC1

Status: **draft / homologation only**  
Branch: `feat/year2-gamification-diversity-v23`  
Layer: `year2-v23-gamification-diversity.js`  
Version: `2.3.1-gamification-diversity-rc1`

## Non-negotiable scope

This RC changes **only the gamification / interaction layer**. It does not rewrite the official Year 2 pedagogical bank.

Preserved by runtime integrity gates:

- question IDs and order;
- source item count;
- source answer (`metadata.sourceAnswerV23`);
- vocabulary and source alternatives;
- ability / linguistic target already carried by each question;
- source content version v2.3;
- Year 2 literacy profile: no autonomous English reading required.

If IDs/order or source answers diverge, module construction throws an integrity error instead of silently publishing the change.

## Problem addressed

The current Year 2 implementation overuses the same interaction pattern, especially image/context + four audio options delivered through Drag & Drop. The RC retains Drag & Drop where it is useful and introduces different actions for the **same source relations**:

- `matching-image-audio`: connect the existing visual stimulus to one of the existing audio alternatives;
- `matching-audio-image`: hear the existing correct target and connect it to a visual alternative;
- `matching-audio-audio`: connect an oral stimulus to the corresponding oral alternative without requiring reading;
- `bubble-audio-numeral`: hear the number word and pop the corresponding numeral symbol;
- `target-audio-image`: hear the existing target and hit the corresponding image.

## Matching with distractors

The official Smart Matching 1.2.0 validator normally requires every item in both columns to participate in a correct pair. That rule makes a one-correct-answer editorial item incompatible with Matching because the other three alternatives are distractors.

RC1 enables a narrowly scoped mode only when the question declares:

```js
behavior.allowUnpairedDistractors = true
```

For that mode only, the Year 2 layer patches the Matching runtime validation response so right-side distractors may remain intentionally unpaired. The expected connection count remains `question.pairs.length`, so the learner still needs exactly the original single correct relation. Legacy Matching activities without the explicit flag keep the original validator behavior.

## Candidate transformations

RC1 contains **55 candidate interaction transformations** across M01–M06. The real-bank integrity audit currently applies **53 transformations safely**. Two candidates — `EN2-M5-08` and `EN2-M5-12` — deliberately remain in their original mechanic because the current source/asset representation does not provide a safe four-option image mapping for Target Shooter without inventing or distorting content.

This is intentional. Items that cannot be represented safely are **not forced**: they remain in their original mechanic and are recorded in `gamificationDiversityAudit.skipped` with `REPRESENTATION_NOT_SAFE`. CI permits exactly these two documented fallbacks; any additional skipped candidate fails the RC1 integrity gate.

Broad distribution strategy:

- **M01**: keep the already useful mix of Target Shooter, Bubble Pop, Word Slash and Drag & Drop; interrupt the opening Target Shooter streak with real Matching and add one oral Matching relation.
- **M02**: strongest intervention; mix Bubble Pop, Matching, Target Shooter and retained Drag & Drop across numbers and family.
- **M03**: mix Matching and Target Shooter into the repetitive toy/image sequences while retaining Drag & Drop for more integrated phrases and quantities.
- **M04**: use Matching/Target Shooter for direct animal/shape recognition and retain Drag & Drop for integrated descriptions.
- **M05**: alternate image→audio Matching with audio→highlighted-body Target Shooter where the visual relation is safe; retain Drag & Drop for commands/quantity relations and for the two candidates that cannot be converted without inventing a visual relation.
- **M06**: mix Matching/Target Shooter for direct food recognition while retaining Drag & Drop for quantities, size and integrated descriptions; exact existing repository art is preferred when already mapped.

## Runtime audit

Every built module now exposes `gamificationDiversityAudit` with:

- `before` mechanic distribution;
- `after` mechanic distribution;
- changed IDs and selected rule;
- skipped candidate IDs and reason;
- source/final item counts;
- ID integrity result;
- explicit flags that content and pedagogical difficulty were not changed.

The automated real-bank gate loads all **90 Year 2 source items** and requires:

- 15 items in each of M01–M06;
- original ID order preserved;
- original source answers preserved;
- no autonomous English reading introduced;
- expected mechanic presence by module;
- Matching keeps exactly one original correct relation plus the three original distractors;
- Bubble Pop number activities expose numeral symbols rather than requiring English word reading;
- Target Shooter conversions use image targets;
- only `EN2-M5-08` and `EN2-M5-12` may fall back as `REPRESENTATION_NOT_SAFE`.

## QA gates before promotion

- [ ] Open all six public Year 2 module entry points from this branch/build.
- [x] Confirm each module still contains all 15 original IDs in the same order through the automated 90-item integrity gate.
- [x] Confirm source-answer integrity through the automated 90-item gate.
- [x] Confirm the generated metadata does not introduce autonomous English reading.
- [ ] Confirm Matching image→audio exposes four playable audio choices and only the original answer forms the correct pair in-browser.
- [ ] Confirm Matching audio→image accepts one correct connection while distractor images remain unpaired in-browser.
- [x] Confirm Bubble Pop number payloads speak the original English word and display numeral symbols only.
- [ ] Confirm Target Shooter uses large, low-speed image targets and does not introduce motor difficulty as the main source of error in-browser.
- [ ] Confirm error feedback still permits another attempt and audio replay without penalty in-browser.
- [ ] Confirm exact Assets-DuduQ images remain preferred where already mapped and provisional visuals are clearly non-commercial fallback.
- [x] Confirm the RC does not modify the approved R143 Drag & Drop runtime files; only Year 2 entry points and the isolated diversity layer are changed.

## Promotion rule

Do **not** merge/promote this RC only because the mechanic count is more varied. Promotion requires visual and interaction homologation of M01–M06, especially the new Matching distractor mode. The approved `main` baseline remains untouched until that review passes.
