# ChatGPT image batch 10 — inbox for Codex / GitHub Actions

Expected single archive: `DUDUQ_ChatGPT_Lote_Escolar_10_20261029.zip`, containing ten **original** 1254px RGBA PNGs, `batch-manifest.json`, and `evidence.json`.

The signed-in Codex browser could not securely access this ChatGPT conversation. Do not bypass the browser restriction, copy cookies, weaken Windows Smart App Control, or call paid image APIs.

One-time fallback: download the archive from its attachment in this chat to Windows Downloads, then let Codex perform **one single upload of this ZIP** using the GitHub web interface to this inbox folder, on branch `automation/duduq-media-source-only-fix-20261029`. No need to upload individual PNGs or execute `sh.exe`.

Workflow `.github/workflows/duduq-native-chatgpt-batch-qa.yml` validates the entire zip on Linux, checks all hashes and exact option meanings, builds V26 and patches a QA-only artifact. Unmatched book/notebook/sharpener are kept in staging and not applied blindly.

**No production deploy. No Gold Master modifications. Human pedagogical QA remains pending.**

If the Codex browser is also blocked from GitHub, abort. That single transfer cannot be performed by the present connector; notify the user of the exact remaining requirement.
