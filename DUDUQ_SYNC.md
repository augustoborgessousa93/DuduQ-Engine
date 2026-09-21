# DUDUQ Universal Sync Protocol

## Human commands

**ATUALIZE O CORE** (and `SINCRONIZE O CORE`, `ATUALIZE O DUDUQ`, `SINCRONIZE O DUDUQ`) means:

```text
npm run duduq:update-core
```

**MOSTRE O QUE VAI MUDAR** means the read-only dry run:

```text
npm run duduq:update-core -- --dry-run
```

Normal operation never requires `--component`, a node ID, a property name, or a manual snapshot. `--component question-audio` remains an advanced diagnostic route only.

## Universal live protocol

1. Connect to the configured Penpot MCP endpoint and capture the authorized Design Graph.
2. Validate graph completeness and compare the current graph with `design-system/penpot-sync/graph/last-successful.json`.
3. Identify affected screens from the generic graph diff.
4. Compile only affected screens with `scripts/compile-penpot-screen.mjs` and Penpot-generated markup/style/font payloads.
5. Stage and validate the complete Visual Package (`manifest.json`, markup, styles, fonts, bindings).
6. Atomically activate staged packages; a failed stage leaves the previous package active.
7. Validate the Universal Screen Host and the existing consumers (Matching and Target Shooter).
8. Promote the raw current graph and package hashes only after validation passes.
9. Commit the resulting checkpoint in Git.
10. Resolve the affected consumers' real local preview routes, ensure the preview server is running, perform HTTP health checks, and return clickable verification URLs. A successful update must never end with only “Core atualizado”. When there are no changes, return the current relevant consumer URLs as well.

Dry-run stops after capture, diff, screen identification, and policy/reporting. It performs no package activation, Core write, mechanic write, or successful-snapshot promotion.

## State and recovery

- Current live graph: `design-system/penpot-sync/graph/current-live.json`.
- Last successful graph: `design-system/penpot-sync/graph/last-successful.json`.
- Visual packages: `design-system/runtime/screens/`.
- Project state and next safe action: `DUDUQ_PROJECT_STATE.json`.
- Architecture and golden checkpoints: `DUDUQ_ARCHITECTURE.md`.

If a package validation or consumer test fails, keep the prior active package and investigate the failing stage. Do not edit successful snapshots manually and do not bypass the Universal Screen Host.

## Real commands

```text
node scripts/compile-penpot-screen.mjs matching-master
node scripts/compile-penpot-screen.mjs target-shooter-master
node test/penpot-sync/duduq-screen-runtime.test.mjs
node test/runtime/universal-visual-change-matrix.mjs
node test/runtime/matching-universal-host.e2e.mjs
node test/runtime/target-shooter-universal-host.e2e.mjs
npm run duduq:update-core -- --dry-run
npm run duduq:update-core
```

## Verification links

The official preview server is `scripts/duduq-test-server.mjs` (default port `4175`; an available `DUDUQ_TEST_PORT` is honored). The verification registry lives in `DUDUQ_PROJECT_STATE.json` under `verification.routes`:

- Matching: `/runtime/preview/?mechanic=matching`
- Target Shooter: `/runtime/preview/?mechanic=target-shooter`

The runner health-checks each resolved URL and returns its HTTP status and clickable URL in the `verification.urls` result. These routes mount the real Visual Package through `DuduQScreenRuntime` and the real mechanic runtime; they are not Penpot or static fixture links.

The last four commands are the live regression path; the E2E commands use the existing local browser test harness.
