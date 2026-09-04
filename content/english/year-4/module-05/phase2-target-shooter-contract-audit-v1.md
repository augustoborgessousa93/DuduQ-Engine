# Y4 M05 — Target Shooter image contract audit

Status: **CAPABILITY_PARTIAL / CONTENT_BLOCKED**

Baseline adapter: Target Shooter **1.0.21**  
Runtime: Target Shooter **2.0.2**  
Pilot branch only. No main/publish change.

## 1. Contract currently received from content

The 1.0.21 adapter reads `question.metadata.targetShooter` and requires:

- `items[]`
- `correctIds[]`
- optional `audioText`, `mode`, `shape`, `difficulty`

Each `items[]` object is reordered but otherwise passed to the runtime without field projection.

## 2. Canonical alternative-image capability

For a Target Shooter **answer target**, the existing contract is already lossless:

`metadata.targetShooter.items[n].image`  
→ `stageFromQuestion()` keeps the item object  
→ runtime `TSTarget` reads `item.image`  
→ target renders the image.

A canonical trace key may travel beside it as `imageAssetKey`; the runtime does not need to interpret the key after the resolver has produced the canonical URL. `item.label` remains the accessible button name.

**Finding:** the earlier hypothesis that the adapter dropped an answer-target image was incorrect. Creating a new release solely to add target-image pass-through would be an unnecessary patch.

## 3. Actual field loss found

The M05 source items are **image stimulus → word/chunk/sentence response** tasks. Preserving that editorial action requires a stable source image in addition to the answer targets.

The runtime 2.0.2 supports a question-level `instructionImage`, but 1.0.21 `stageFromQuestion()` does not copy `config.instructionImage` (nor a canonical question-image equivalent) into the stage.

Current path:

`canonical source stimulus`  
→ Factory/builder can resolve it  
→ `metadata.targetShooter.instructionImage` **available conceptually**  
→ **dropped in adapter 1.0.21**  
→ runtime receives no `instructionImage`.

Minimum code point, if a candidate adapter release is cut:

```js
instructionImage: asString(
  config.instructionImage ||
  question?.media?.image?.src
),
```

inside `stageFromQuestion()`, adjacent to `instruction` / `audioText` / `mode`.

## 4. Why no in-place patch was made

`1.0.21` is an immutable published release. It must not be edited in place.

A safe implementation therefore requires a new candidate adapter version and proportional regression. The candidate must preserve the existing 1.0.21 runtime/gameplay and add only the question-image field. No change is justified in physics, speed, scoring, retry, feedback, completion, Host or Core.

## 5. Backward compatibility oracle

The extension must satisfy all of the following:

- legacy textual targets: unchanged;
- legacy audio targets: unchanged;
- target `item.image`: already supported and unchanged;
- no source image: identical 1.0.21 behavior;
- canonical source image: new optional capability only;
- missing canonical asset: builder returns `ASSET_GAP`; no emoji/icon/data URI/placeholder substitution.

## 6. Pilot consequence

The 10 approved Target Shooter IDs remain pedagogically recommended, but **definitive runtime payloads are not emitted yet** because:

1. all 10 depend on unresolved canonical visuals; and
2. preserving the original image-stimulus action also depends on the question-image capability described above.

Until both are proven, their execution state is `MECHANIC_REVIEW_REQUIRED / ASSET_GAP`, not `READY`.
