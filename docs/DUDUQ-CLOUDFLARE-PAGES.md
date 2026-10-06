# DuduQ Cloudflare Pages

SOURCE: `https://github.com/augustoborgessousa93/DuduQ-Engine`

BUILD COMMAND: `node scripts/build-cloudflare-pages.mjs`

OUTPUT: `dist-pages`

DEPLOYMENT MODEL: Git-integrated Cloudflare Pages. The configured production branch is `feat/design-sync-primary-button-v1`; preview deployments remain enabled for other branches.

PUBLIC BOUNDARY: Only `dist-pages/` is publishable. The builder is an allowlist and excludes source control, documentation, tests, tools, artifacts, recovery data, local QA, Penpot tooling, logs, and environment files.

PRODUCTION ROUTES:

- `/play/matching/`
- `/play/target-shooter/`
- `/play/drag-drop/`
- `/play/drag-drop-multimedia/`
- `/play/bubble-pop/`
- `/play/smart-sentence/`
- `/play/memory-quest/`
- `/play/intro-module/`
- `/play/transition/` (shared transition infrastructure)

EXTERNAL DEPENDENCIES: DuduQ visual/audio media is currently loaded from `raw.githubusercontent.com`; Fredoka and Nunito are loaded from Google Fonts; some Penpot-exported SVGs retain Penpot-hosted font URLs. All use HTTPS. They are not migrated by the Pages builder.

Gold Master source files are copied as runtime-only artifacts under `runtime/gold-masters/` during the build. Tests, screenshots, source documentation, and preview tooling are never copied.
