import { readFile, writeFile } from "node:fs/promises";

const source = JSON.parse(await readFile("docs/qa/DUDUQ_RESPONSIVE_CONTAINER_MATRIX_V5.json", "utf8"));
const cases = source.cases;
const byMechanic = {};
for (const mechanic of [...new Set(cases.map(row => row.mechanicId))]) {
  const rows = cases.filter(row => row.mechanicId === mechanic);
  byMechanic[mechanic] = {
    rendered: rows.filter(row => row.runtimeReady && row.httpStatus === 200).length,
    correlated: rows.filter(row => row.correlation).length,
    documentOverflowX: rows.filter(row => row.sample.doc.overflowX > 1).length,
    documentOverflowY: rows.filter(row => row.sample.doc.overflowY > 1).length,
    gameRootOverflowX: rows.filter(row => row.sample.game.overflowX > 1).map(row => row.expectedPreset),
    gameRootOverflowY: rows.filter(row => row.sample.game.overflowY > 1).map(row => row.expectedPreset),
    textClipCandidates: rows.filter(row => row.sample.textClipped > 0).map(row => row.expectedPreset),
    outsideControls: rows.reduce((n, row) => n + row.sample.outsideControls.length, 0),
    pageErrors: rows.reduce((n, row) => n + row.pageErrors.length, 0)
  };
}
const report = {
  feature: "DUDUQ_RESPONSIVE_CONTAINER_QA_V5",
  sourceReport: "docs/qa/DUDUQ_RESPONSIVE_CONTAINER_MATRIX_V5.json",
  generatedAt: new Date().toISOString(),
  requested: source.requested,
  rendered: source.rendered,
  correlated: source.correlated,
  unmatched: source.unmatched,
  duplicateCaseIds: source.duplicateCaseIds.length,
  documentVisibleOverflow: { horizontalCases: cases.filter(row => row.sample.doc.overflowX > 1).length, verticalCases: cases.filter(row => row.sample.doc.overflowY > 1).length },
  measuredGameRootOverflow: { horizontalCases: cases.filter(row => row.sample.game.overflowX > 1).length, verticalCases: cases.filter(row => row.sample.game.overflowY > 1).length },
  visibleScrollbarCases: cases.filter(row => row.sample.visibleScrollbarCount > 0).length,
  outsideControlCases: cases.filter(row => row.sample.outsideControls.length > 0).length,
  pageErrorCount: cases.reduce((n, row) => n + row.pageErrors.length, 0),
  textClipCandidateCases: cases.filter(row => row.sample.textClipped > 0).length,
  byMechanic,
  interpretation: {
    correlationPassIsNotVisualOrInteractionCertification: true,
    measuredGameRootOverflowRequiresInterpretation: "All current game-root overflow cases are the Intro fixed 1366x768 logical stage with uniform scale; document overflow and outside controls are zero, and no visible scrollbars were reported. The logical root metrics still exceed the iframe at six presets, so strict internal-zero-scroll remains unproven.",
    textClipCandidates: "Two large Intro cases are emitted by the harness because the Intro intentionally uses clipped 1x1 screen-reader-only heading nodes. The human-visible screenshot at 1100x700 shows the main content in frame; these candidates are not accepted as confirmed clipping.",
    interactionCoverage: "Initial runtime state only; no click, drag/drop, retry, audio, or Continue interaction was executed by this matrix.",
    protectedResponsiveFilesNotModified: true
  },
  result: "ISSUE",
  reason: "90/90 correlation and initial rendering PASS; Intro logical game-root overflow at 6 presets and no functional interaction state coverage prevent responsive certification."
};
await writeFile("docs/qa/DUDUQ_RESPONSIVE_CONTAINER_QA_V5.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ result: report.result, correlated: report.correlated, rootOverflowX: report.measuredGameRootOverflow.horizontalCases, rootOverflowY: report.measuredGameRootOverflow.verticalCases, visibleScrollbars: report.visibleScrollbarCases, output: "docs/qa/DUDUQ_RESPONSIVE_CONTAINER_QA_V5.json" }, null, 2));
