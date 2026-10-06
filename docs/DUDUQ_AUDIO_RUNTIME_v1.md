# DUDUQ Audio Runtime v1

Status: `DUDUQ_AUDIO_RUNTIME_v1` frozen for canonical audio delivery (2026-10-06).

The canonical audio contract is identified by `audioId` values in
`duduq-audio/manifests/AUDIO_MANIFEST.json`. The shared owner
`core/duduq-content-audio.js` exposes `resolveAudio(audioId)`,
`playVoice(audioId)`, `stopVoice()`, and `replayVoice(audioId)`. Resolution
accepts only `APPROVED` manifest rows with an `.mp3` runtime path. Missing IDs
fail safely without substituting an utterance. One shared voice player replaces
the currently active voice; `setActiveQuestion()` and the
`duduq:questionchange` event stop audio when the question changes.

Legacy mechanic `audioCatalog` entries with `src` remain temporarily supported
when no canonical `audioId` exists. Where an ID is present, canonical ID
resolution takes priority. Existing legacy catalog owners include Y1M05,
Y1M06, and Y2M01; this compatibility is retained during migration. Runtime
delivery is MP3 only. WAV masters are retained under the versioned master
directory for production/audit and must not be served to the game.

The approved Y1M01 set is `DUDUQ_GOLD_VOICE_v1`, synthesized by
`CHATTERBOX_MULTILINGUAL_V3` using `NATURAL_CLEAR_V2`. Contract IDs remain the
semantic identity; asset paths are versioned. Prior CURRENT paths and hashes
are retained in each contract's `previousProduction` metadata for rollback.
`DUDUQ_FAST_VOICE_v1` (Qwen 0.6B) remains a separate validated fallback and is
not published in the Y1M01 production set.

Language conditioning is `pt` for `pt-BR` contracts and `en` for `en-US`.
Production loudness remains -16 LUFS with a -1.5 dBTP true-peak ceiling. The
approved onset protection keeps a 120 ms leading pad and verifies at least
100 ms of decoded leading margin plus a clean ending. Automated QC does not
replace human pronunciation/naturalness review.

The focused human QA route is `/qa/y1m01-audio/`. The integration smoke
`node scripts/validate-y1m01-audio-production.mjs` resolves and plays each of
the 23 Y1M01 IDs through the shared owner, verifies HTTP `audio/mpeg`, Q009's
three IDs, Q015's two IDs, Q010/Q013 dialogue bindings, global PT-BR UI audio,
single-voice replacement, question-change stop, and missing-ID fail-safe. No
mechanic-specific Gold Master or gameplay files were changed. Y1M01 audio is
approved; module release remains blocked on its pending image domain.
