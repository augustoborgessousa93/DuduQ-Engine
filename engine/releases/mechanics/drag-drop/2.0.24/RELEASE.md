# Drag & Drop 2.0.24

Immutable release candidate composed on Drag & Drop 2.0.22.

## Added
- Explicit `payload.mode = "single-choice"` contract.
- Formal validation for exactly one target/capacity 1, at least two alternatives, exactly one editorially correct required item, and at least one distractor without `targetId`.
- Immediate evaluation when an item is placed in single-choice mode.
- Incorrect placement emits retry and releases the target after feedback.
- Correct placement emits success and follows normal stage progression.

## Preserved
- Drag & Drop 2.0.22 files are unchanged.
- Association, classification, pairs, and sequence retain the 2.0.22 execution path.
- Existing audio, keyboard, touch, focus, ARIA and reduced-motion mechanisms remain owned by the established DD2 runtime.

No redesign, physics change, general refactor or unrelated mechanic behavior is included.
