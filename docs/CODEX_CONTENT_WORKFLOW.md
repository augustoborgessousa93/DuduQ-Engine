# DUDUQ — Codex Content Workflow V1

## Purpose
This package gives Codex a stable, repository-local source for curriculum, questions, media and audio reuse.

## Source hierarchy
1. `docs/master/DUDUQ_English_Master_Curricular_Pedagogico_V2.docx` — governance/pedagogy.
2. `content/english/source/DUDUQ_English_Master_Curricular_Pedagogico_V2.xlsx` — human editorial master.
3. `content/english/master/modules-index.json` — machine-readable module index.
4. `content/english/year-*/module-*/module.json` + `questions.json` — module runtime content.
5. `content/english/audio/audio-policy.json` + registry — reusable audio contract.

## Critical rule
Do NOT parse the DOCX/XLSX on every runtime build.
Use them as editorial sources. Runtime generation must consume validated JSON.

## Module generation flow
1. Read the requested `module.json`.
2. Read its `questions.json`.
3. Validate age/year rules against the Master.
4. Resolve images through approved Media Registry only.
5. Resolve audio through the Audio Registry. Reuse exact approved utterances.
6. Select a mechanic only from `preferred/allowed`.
7. Populate canonical header/topic/subtitle from Module Spec.
8. Generate module configuration/content data only.
9. Do not modify Gold Master engines or canonical shells.
10. Stop on validation failure.

## Audio rule
One item != one audio.
One UNIQUE UTTERANCE + voice/prosody profile = one canonical audio asset.

UI prompts are global.
Vocabulary is reusable across modules/years.
Functional chunks are reusable.
Only genuinely context-specific sentences/dialogues create new clips.

Never concatenate isolated word recordings to fake a natural sentence.
