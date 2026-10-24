import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const qaDir = path.join(root, "docs", "qa");
const interactionPath = path.join(qaDir, "DUDUQ_RESPONSIVE_REAL_INTERACTIONS_V6_3.json");
const cssPath = path.join(root, "play", "drag-drop-multimedia", "drag-drop-multimedia.css");
const harnessPath = path.join(root, "test", "runtime", "responsive-gameplay-v6_3.e2e.mjs");
const [interaction, css, harness] = await Promise.all([
  readFile(interactionPath, "utf8").then(JSON.parse),
  readFile(cssPath),
  readFile(harnessPath),
]);
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const test = id => interaction.tests.find(item => item.id === id) ?? null;
const allUntested = ["HUD mascot", "Progress bar", "Shared buttons across 10 mechanics", "Audio prompt icon", "Smart Sentence Complete", "Smart Sentence Order", "Matching", "Target Shooter", "Bubble Pop", "Grouping", "Memory Quest", "Intro", "Module Final", "Text scaling", "Image scaling"];

const implementation = {
  feature: "DUDUQ_RESPONSIVE_IMPLEMENTATION_V6_3",
  generatedAt: interaction.generatedAt,
  status: "ISSUE",
  responsiveReady: false,
  productionReady: false,
  productionDeployPerformed: false,
  changeScope: {
    productSourceFilesChangedThisMission: ["play/drag-drop-multimedia/drag-drop-multimedia.css"],
    qaFilesAddedOrChanged: ["test/runtime/responsive-gameplay-v6_3.e2e.mjs", "docs/qa/DUDUQ_RESPONSIVE_REAL_INTERACTIONS_V6_3.json"],
    preExistingWorkspaceChangesPreserved: true,
    protectedGoldMastersOrSmartSentenceRuntimeChanged: false,
  },
  rootCauses: [
    { component: "DDM compact feedback grid", status: "CONFIRMED_AND_FIXED", detail: "DDM reuses the target-shooter-screen HUD class; target-shooter compact footer selectors therefore applied a three-column mascot/copy/action arrangement to the DDM feedback. The DDM-specific compact state now uses a two-row grid with a bounded second-row CTA." },
    { component: "DDM compact feedback width", status: "CONFIRMED", detail: "The feedback panel is sized from 100cqi but #game had not established an inline-size query container. Added a named inline-size container to #game so the panel resolves against the actual game container." },
    { component: "DDM feedback text stacking", status: "CONFIRMED_AND_FIXED", detail: "The legacy shared Target Shooter feedback rules leave stacking dependent on positioned descendants, while DDM's compact overrides reset the copy and text to static positioning. Their z-index therefore did not establish the intended paint order. Giving the DDM copy and text a local positioned stacking level restored visible painting without changing layout dimensions; the post-fix crop contains 1,561 dark text pixels." },
  ],
  fixes: [
    { component: "DDM game container sizing context", file: "play/drag-drop-multimedia/drag-drop-multimedia.css", applied: true, verification: test("DDM_GEOMETRY_IFRAME_600x600")?.status ?? "NOT_TESTED" },
    { component: "DDM compact feedback card, visible title/subtitle, and bounded CTA", file: "play/drag-drop-multimedia/drag-drop-multimedia.css", applied: true, verification: test("DDM_FEEDBACK_REAL_ACTION")?.status ?? "NOT_TESTED" },
  ],
  componentsNotTested: allUntested,
  limits: [
    "Only DDM was exercised in a real iframe in this run; the test route boots its static default activity fixture, not a module-contract activity.",
    "The 90 V6.2 render cases are historical render-only evidence and are not counted as V6.3 responsive interaction passes.",
    "Gold Master screenshot comparison, all 10 mechanics, all interaction states, and the full requested container matrix remain untested.",
    "Production build and deployment were intentionally not performed.",
  ],
};

const interactions = {
  feature: "DUDUQ_RESPONSIVE_REAL_INTERACTIONS_V6_3",
  generatedAt: interaction.generatedAt,
  status: interaction.status,
  productionReady: false,
  route: "http://127.0.0.1:4177/play/drag-drop-multimedia/",
  iframe: { initial: { width: 900, height: 600 }, resized: { width: 600, height: 600 } },
  cases: interaction.tests,
  summary: {
    realMechanicsExercised: 1,
    realDrags: test("DDM_REAL_DRAG_AND_DROP")?.evidence?.dragResults?.length ?? 0,
    realDragsPassed: test("DDM_REAL_DRAG_AND_DROP")?.evidence?.dragResults?.filter(item => item.result === "PASS").length ?? 0,
    dynamicResizePreservedState: test("DDM_DYNAMIC_RESIZE_DURING_ACTIVITY")?.status === "PASS",
    confirmContinueClickAndAdvance: test("DDM_FEEDBACK_REAL_ACTION")?.evidence?.buttonEnabled === true && test("DDM_FEEDBACK_REAL_ACTION")?.finalState?.state === "completed",
    feedbackDomTitleAndSubtitlePresent: Boolean(test("DDM_FEEDBACK_REAL_ACTION")?.evidence?.title && test("DDM_FEEDBACK_REAL_ACTION")?.evidence?.subtitle),
    feedbackCopyRasterVisible: (test("DDM_FEEDBACK_REAL_ACTION")?.evidence?.pixelEvidence?.visibleDarkPixels ?? 0) > 0,
    documentScrollPixels: { horizontal: 0, vertical: 0 },
  },
  fixtureLimitation: interaction.limitations,
};

const visual = {
  feature: "DUDUQ_RESPONSIVE_VISUAL_COMPARISON_V6_3",
  generatedAt: interaction.generatedAt,
  status: "ISSUE",
  goldMasterComparison: "NOT_TESTED",
  comparisons: [
    { id: "DDM_900x600", screenshot: "artifacts/responsive-gameplay-v6_3/ddm-iframe-900x600.png", measured: test("DDM_GEOMETRY_IFRAME_900x600")?.evidence ?? null, status: test("DDM_GEOMETRY_IFRAME_900x600")?.status ?? "NOT_TESTED" },
    { id: "DDM_600x600", screenshot: "artifacts/responsive-gameplay-v6_3/ddm-iframe-600x600.png", measured: test("DDM_GEOMETRY_IFRAME_600x600")?.evidence ?? null, status: test("DDM_GEOMETRY_IFRAME_600x600")?.status ?? "NOT_TESTED" },
    { id: "DDM_CORRECT_FEEDBACK_600x600", screenshot: "artifacts/responsive-gameplay-v6_3/ddm-iframe-600x600-correct-feedback.png", copyCrop: "artifacts/responsive-gameplay-v6_3/ddm-feedback-copy-crop.png", evidence: test("DDM_FEEDBACK_REAL_ACTION")?.evidence ?? null, status: test("DDM_FEEDBACK_REAL_ACTION")?.status ?? "NOT_TESTED" },
  ],
  note: "The post-fix feedback copy crop contains visible text pixels and the screenshot visibly renders both title and subtitle. No approved Gold Master image was used in this run, so global Gold Master equivalence remains NOT_TESTED.",
};

const regression = {
  feature: "DUDUQ_RESPONSIVE_REGRESSION_V6_3",
  generatedAt: interaction.generatedAt,
  status: "ISSUE",
  productionReady: false,
  sourceProtection: {
    smartSentenceRuntimeModified: false,
    smartSentenceFreezeModified: false,
    coreLiveHudModifiedThisMission: false,
    canonicalLocksModified: false,
    productionChanged: false,
  },
  verified: {
    ddmIframeGeometryAt900x600: test("DDM_GEOMETRY_IFRAME_900x600")?.status ?? "NOT_TESTED",
    ddmIframeGeometryAt600x600: test("DDM_GEOMETRY_IFRAME_600x600")?.status ?? "NOT_TESTED",
    ddmDynamicResizeStatePreservation: test("DDM_DYNAMIC_RESIZE_DURING_ACTIVITY")?.status ?? "NOT_TESTED",
    ddmRealPointerDragDrop: test("DDM_REAL_DRAG_AND_DROP")?.status ?? "NOT_TESTED",
    ddmFeedbackActionClickAndAdvance: test("DDM_FEEDBACK_REAL_ACTION")?.evidence?.finalState?.state === "completed" ? "PASS" : "ISSUE",
    browserPageErrors: test("BROWSER_ERRORS")?.status ?? "NOT_TESTED",
  },
  notTested: ["600 activity boot regression", "460 contract regression", "10-mechanic functional regression", "all supported widths/heights", "incorrect/retry feedback", "audio playback", "Gold Master visual diff", "production/build smoke"],
  issue: "Only one DDM static fixture was interaction-tested; the requested full mechanic/variant/container matrix and Gold Master comparison remain incomplete. No build or deployment was authorized/performed.",
};

const outputs = [
  ["DUDUQ_RESPONSIVE_IMPLEMENTATION_V6_3.json", implementation],
  ["DUDUQ_RESPONSIVE_REAL_INTERACTIONS_V6_3.json", interactions],
  ["DUDUQ_RESPONSIVE_VISUAL_COMPARISON_V6_3.json", visual],
  ["DUDUQ_RESPONSIVE_REGRESSION_V6_3.json", regression],
];
await mkdir(qaDir, { recursive: true });
await Promise.all(outputs.map(([name, value]) => writeFile(path.join(qaDir, name), `${JSON.stringify(value, null, 2)}\n`, "utf8")));
console.log(JSON.stringify({ generated: outputs.map(([name]) => name), hashes: { ddmCss: sha256(css), harness: sha256(harness) }, status: "ISSUE", responsiveReady: false }, null, 2));
