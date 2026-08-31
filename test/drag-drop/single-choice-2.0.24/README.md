# Drag & Drop 2.0.24 — explicit single-choice gate

This gate is intentionally narrow. It validates only the explicit `payload.mode = "single-choice"` contract introduced by Drag & Drop 2.0.24 and guards the existing association, classification, pairs, and sequence paths inherited from 2.0.22.

A valid single-choice payload has exactly one target with capacity 1, at least two alternatives, exactly one required/editorially correct item pointing to that target, and at least one distractor with `required: false` and no `targetId`.

The placement itself is the answer. A distractor must emit an incorrect result and `retry` without completing or advancing. After retry, the target is released and the correct option remains usable. A correct placement emits success and completes normally. The mode is never inferred from `required: false`.
