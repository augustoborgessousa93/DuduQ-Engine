# Year 1 audio availability at the immutable Assets pin

Canonical Assets-DuduQ runtime pin: `f0f8bed8e8c24fad4eae204bf4a5cc84a8d8263f`.

Observed repository tree at this exact pin:

- `Audios/`
  - `1_ANO/`
    - `M01/`

No `M02`, `M03`, `M04`, `M05` or `M06` audio directories are present under `Audios/1_ANO` at the immutable pin.

## Consequence for preparation

1. Do not generate or reference guessed MP3 URLs for M05/M06.
2. The legacy `plannedSrc` values for M05/M06 describe intended future media but do not resolve at the current canonical pin.
3. For current Year 1 homologation, spokenText / speechLocale and the Engine's controlled speech fallback remain the safe audio source unless a real recorded file is later added under a new, explicitly promoted Assets pin.
4. QA must validate repeatable audible behavior, not merely presence of an `audio.src` string.
5. This is not a global blocker: M01–M04 homologation already established the controlled multimodal fallback pattern under R0.

## Current legacy counts

- M05 package: 13 planned audio paths; 13 active `src` values empty.
- M06 package: 18 planned audio paths; 18 active `src` values empty.

The missing directories explain why those planned paths must not be promoted blindly.
