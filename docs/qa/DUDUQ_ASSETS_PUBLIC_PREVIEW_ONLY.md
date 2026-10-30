# DUDUQ — Public preview only / Assets-DuduQ Y1M04

This branch is a review candidate for educational images, NOT an approved production release.

- Source: `augustoborgessousa93/Assets-DuduQ`, immutable commit `658d94f08031820cfea5258a6f4e7c24f278df92`.
- Six reviewed source PNGs under `qa/assets-reuse-source/y1m04/Imagens Ilustrativa/`.
- Build hook executes ONLY when `CF_PAGES_BRANCH=integration/assets-duduq-resume-20261030`.
- Built V26 receives updated candidate bindings on `dist-pages` (not the source data); remaining temporary images preserved.
- QA evidence: https://github.com/augustoborgessousa93/DuduQ-Engine/actions/runs/41119414742 — 6 PNGs, 55 bindings, browser entrypoint in 3 viewports.
- Preview does not certify 55 option-level semantic/gameplay checks, and does not merge or alter production.
- Do not connect this preview to the school's official embedded URLs without final pedagogical QA and approval.

To rollback, disable custom preview branch builds on `duduq-engine` Pages project; production branch is unchanged.
