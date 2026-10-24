import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const base = process.cwd();
const qa = path.join(base, "docs/qa");
const raw = JSON.parse(await readFile(path.join(qa, "DUDUQ_RESPONSIVE_GOLD_MASTER_V6_2_MATRIX_RAW.json"), "utf8"));
const feedback = JSON.parse(await readFile(path.join(qa, "DUDUQ_RESPONSIVE_FEEDBACK_CONTAINER_V6_2.json"), "utf8"));
const sha256 = data => createHash("sha256").update(data).digest("hex");
const round2 = number => Math.round(number * 100) / 100;
const casesByMechanic = Object.groupBy(raw.cases, row => row.mechanicId);
const visibleTextClipCandidates = raw.cases.flatMap(row => row.sample?.textClipCandidates || []).filter(row => row.className !== "intro-eyebrow");
const introCases = casesByMechanic.intro || [];
const matchingCases = casesByMechanic.matching || [];
const gameRootOverflow = raw.cases.map(row => ({
  caseId: row.caseId,
  mechanic: row.mechanicId,
  documentX: row.sample?.doc?.overflowX ?? null,
  documentY: row.sample?.doc?.overflowY ?? null,
  rootX: row.sample?.game?.overflowX ?? null,
  rootY: row.sample?.game?.overflowY ?? null
}));
const introLogical = introCases.filter(row => row.sample?.game?.overflowX || row.sample?.game?.overflowY);
const matchingRounding = matchingCases.filter(row => row.sample?.game?.overflowY === 1 && row.sample?.doc?.overflowY === 0);
const allInitialRenderPass = raw.rendered === raw.requested && raw.correlated === raw.requested && raw.unmatched === 0;

const patchedFile = "core/duduq-live-hud.css";
const currentCss = await readFile(path.join(base, patchedFile), "utf8");
const marker = "/* These approved Matching/Target Shooter feedback compositions";
const markerIndex = currentCss.indexOf(marker);
if (markerIndex < 0) throw new Error(`V6.2 responsive patch marker missing from ${patchedFile}`);
const beforeCss = currentCss.slice(0, markerIndex).replace(/\n$/, "");
const patchBlock = currentCss.slice(markerIndex);
const afterSha = sha256(currentCss);
const beforeSha = sha256(beforeCss);
const patchSha = sha256(patchBlock);

const components = [
  ["responsiveness-architecture", "PARTIAL", "Main runtime currently combines fixed-coordinate artboards, shared game-container sizing, and mechanic-specific scale rules. This mission changed only the confirmed Matching/Target Shooter feedback dependence on 100vw; a broader shared-scale unification was not attempted without state interaction and Gold Master comparison."],
  ["intro-full-stage", introLogical.length ? "ISSUE_REVIEWED_INTENTIONAL_GEOMETRY" : "PASS", "The stage has a 1366x768 layout box with a uniform transform fit. At 6 compact presets its untransformed logical extent exceeds the container; the document itself has zero overflow. The sampled 1100x700 full-bleed screenshot shows the artboard fitting the visible container; click/resize-during-transition remains untested."],
  ["hud-mascot-and-progress", "INITIAL_RENDER_ONLY", "Visible in the initial-state matrix. Per-size geometric ratios and progress-animation hit testing were not specifically asserted."],
  ["buttons", "NOT_TESTED_INTERACTIVELY", "Visibility on initial states was correlated; responsive hitbox, touch target, active/disabled appearance, and pointer interaction were not exercised."],
  ["feedback-card", feedback.failures.length ? "ISSUE" : "PASS_CSS_SCALE_PROBE_ONLY", "Matching and Target Shooter correct/incorrect fixed artboards now use container-relative cqw/cqh. The real routes were loaded and a temporary CSS presentation probe measured 8/8 expected uniform scales. Actual feedback states were not triggered."],
  ["feedback-margins-and-copy", "NOT_TESTED", "Margin, title/subtitle wrapping, and button layout in actual feedback states require interaction-state QA."],
  ["instruction-audio-icon", "INITIAL_RENDER_ONLY", "Visible in selected DDM and other initial-state captures. Playback, replay, collision, and hitbox measurements were not run in this mission."],
  ["drag-drop-and-dropzones", "NOT_TESTED_INTERACTIVELY", "DDM and Grouping initialized in 9/9 container cases each; real pointer drag/drop, snap, confirmation and retry were not performed."],
  ["smart-sentence", "PROTECTED_UNCHANGED_NOT_FUNCTIONALLY_TESTED", "Smart Sentence source/freeze was not modified. The V6.1 isolated punctuation candidate was not included in this responsive interaction run."],
  ["matching-geometry", "INITIAL_RENDER_PLUS_1PX_LOGICAL_ROUNDING", "Matching initialized in 9/9 cases. Root scrollHeight exceeds clientHeight by exactly 1px in all nine, while document overflow is zero; no card geometry assertion was run in feedback states."],
  ["other-mechanics", "INITIAL_RENDER_ONLY", "Target Shooter, Bubble Pop, DDM, Grouping, Memory Quest, Module Final and Smart Sentence each initialized in their 9 requested containers; interactions were not run."],
  ["text-and-image-scaling", visibleTextClipCandidates.length ? "ISSUE" : "PARTIAL", "No visible gameplay text clipping candidate was found. The six text clip findings are only the intentionally visually-hidden Intro eyebrow. Full image aspect-ratio comparison against a Gold Master image baseline was not performed."],
  ["document-overflow", "PASS_INITIAL_STATE", "Zero document horizontal or vertical overflow in the 90 initial-state cases."],
  ["intentional-logical-overflow", "REVIEWED", `Intro fixed-stage logical overflow: ${introLogical.filter(row => row.sample.game.overflowX > 0).length} X cases and ${introLogical.filter(row => row.sample.game.overflowY > 0).length} Y cases; Matching: ${matchingRounding.length} one-pixel Y-rounding cases. No document scrolling resulted.`]
];

const responsiveSummary = {
  feature: "DUDUQ_RESPONSIVE_GOLD_MASTER_V6_2",
  generatedAt: new Date().toISOString(),
  status: "ISSUE",
  responsiveReady: false,
  productionReady: false,
  productionDeploy: "NOT_AUTHORIZED_AND_NOT_RUN",
  architecture: "FIXED_COORDINATE_AND_CONTAINER_SCALE_SYSTEMS_COEXIST",
  appliedPatch: { file: patchedFile, reason: "Replace outer-window width scaling for approved fixed feedback artboards with actual named game-container width and height units.", oldSha256ReconstructedFromPrePatchWorkingBytes: beforeSha, newSha256: afterSha, patchSha256: patchSha },
  initialStateMatrix: { requested: raw.requested, rendered: raw.rendered, correlated: raw.correlated, unmatched: raw.unmatched, initialStateOnly: true, result: allInitialRenderPass ? "PASS_RENDER_CORRELATION_ONLY" : "ISSUE" },
  documentOverflow: { horizontalCases: raw.cases.filter(row => row.sample?.doc?.overflowX > 0).length, verticalCases: raw.cases.filter(row => row.sample?.doc?.overflowY > 0).length, result: "PASS_INITIAL_STATE" },
  rootLogicalOverflow: {
    introStage: { casesWithX: introLogical.filter(row => row.sample.game.overflowX > 0).length, casesWithY: introLogical.filter(row => row.sample.game.overflowY > 0).length, explanation: "Uniformly transformed fixed artboard retains pre-transform logical scroll extent; document remains contained and the sampled rendered stage fits." },
    matching: { onePixelYCases: matchingRounding.length, maximumPx: matchingRounding.length ? 1 : 0, documentOverflowCases: 0, interpretation: "Subpixel/integer scroll extent rounding; no visible/document scrollbar." },
    allCases: gameRootOverflow
  },
  falsePositiveTextClip: { count: raw.cases.reduce((sum, row) => sum + (row.sample?.textClipped || 0), 0), className: "intro-eyebrow", reason: "Intentionally visually-hidden semantic eyebrow, clipped to a 1px accessible text region; no visible gameplay text clipping found." },
  screenshotEvidence: { directory: "artifacts/responsive-gold-master-v6_2-20261021", captured: 15, visualBaselineComparison: "NOT_PERFORMED", interactionStateCaptures: "NOT_PERFORMED" },
  detailedMatrix: "docs/qa/DUDUQ_RESPONSIVE_GOLD_MASTER_V6_2_MATRIX_RAW.json",
  feedbackScaleProbe: "docs/qa/DUDUQ_RESPONSIVE_FEEDBACK_CONTAINER_V6_2.json",
  components: components.map(([component, result, details]) => ({ component, result, details }))
};

const componentAudit = {
  feature: "DUDUQ_RESPONSIVE_COMPONENT_AUDIT_V6_2",
  generatedAt: responsiveSummary.generatedAt,
  status: "ISSUE",
  mechanics: Object.entries(casesByMechanic).map(([mechanic, rows]) => ({ mechanic, initialCases: rows.length, rendered: rows.filter(row => row.runtimeReady).length, correlated: rows.filter(row => row.correlation).length, documentOverflowCases: rows.filter(row => row.sample?.doc?.overflowX || row.sample?.doc?.overflowY).length, rootLogicalOverflowCases: rows.filter(row => row.sample?.game?.overflowX || row.sample?.game?.overflowY).length, visibleTextClipCandidates: rows.flatMap(row => row.sample?.textClipCandidates || []).filter(row => row.className !== "intro-eyebrow").length, interactionQa: "NOT_TESTED" })),
  componentFindings: responsiveSummary.components,
  sourceData: responsiveSummary.detailedMatrix
};

const interactionMatrix = {
  feature: "DUDUQ_RESPONSIVE_INTERACTION_MATRIX_V6_2",
  generatedAt: responsiveSummary.generatedAt,
  status: "NOT_CERTIFIED",
  distinction: "90/90 entries prove actual iframe route/render correlation only. They do not prove successful pointer/touch interaction or gameplay states.",
  cases: raw.cases.map(row => ({ caseId: row.caseId, mechanic: row.mechanicId, container: row.expectedContainer, initialRender: row.correlation ? "PASS" : "FAIL", ready: row.runtimeReady ? "PASS" : "FAIL", correctInteraction: "NOT_TESTED", incorrectRetry: "NOT_TESTED", audioPlayback: "NOT_TESTED", continue: "NOT_TESTED", resizeDuringInteraction: "NOT_TESTED", hitboxAlignment: "NOT_TESTED" })),
  specialFeedbackSizingProbe: { result: feedback.status, evaluated: feedback.evaluated, expectedScaleDeltaMaximum: Math.max(...feedback.cases.flatMap(row => [row.correct.delta, row.incorrect.delta])), actionButtonWidthDeltaMaximum: Math.max(...feedback.cases.flatMap(row => [row.correct.buttonWidthDelta, row.incorrect.buttonWidthDelta])), scope: "CSS-only temporary presentation probes on real Matching/Target Shooter routes; parent scale and child action-button bounding width checked; no feedback state transition." }
};

const visualRegression = {
  feature: "DUDUQ_RESPONSIVE_VISUAL_REGRESSION_V6_2",
  generatedAt: responsiveSummary.generatedAt,
  status: "PARTIAL_NOT_GOLD_MASTER_CERTIFIED",
  approvedGoldMasterImageComparison: "NOT_PERFORMED",
  screenshotReview: { selectedScreenshots: 4, inspectedExamples: ["Intro 1100x700", "DDM 1000x700", "Matching 1280x720", "Memory Quest 1000x700"], result: "VISUAL_SPOT_REVIEW_ONLY" },
  patchScope: "Only the container-relative scaling source for Matching and Target Shooter feedback artboards changed; desktop composition remains the same scale 1 by CSS formula and no Smart Sentence protected file changed.",
  fullVisualEquivalence: "NOT_CLAIMED",
  evidenceDirectory: responsiveSummary.screenshotEvidence.directory
};

const patchReport = {
  feature: "DUDUQ_RESPONSIVE_PATCHES_V6_2",
  generatedAt: responsiveSummary.generatedAt,
  status: feedback.failures.length ? "ISSUE" : "PATCH_APPLIED_AND_CSS_PROBE_PASS",
  patches: [{
    file: patchedFile,
    category: "SHARED_VISUAL_CSS_NOT_IN_SMART_SENTENCE_FREEZE_INVENTORY",
    oldSha256: beforeSha,
    newSha256: afterSha,
    patchSha256: patchSha,
    rootCause: "Matching/Target Shooter fixed feedback artboards scaled from 100vw, which is the top-level browsing context and can differ from the game container used by the platform.",
    change: "Scale uses min(1, 100cqw/designWidth, 100cqh/designHeight) for correct and incorrect states. Uniform parent transform preserves artwork geometry and action hitbox relation.",
    desktopScale: 1,
    qa: { actualRoutesLoaded: ["Matching", "Target Shooter"], containerSizesPerMechanic: 4, expectedScaleDeltaMax: Math.max(...feedback.cases.flatMap(row => [row.correct.delta, row.incorrect.delta])), actionButtonWidthDeltaMax: Math.max(...feedback.cases.flatMap(row => [row.correct.buttonWidthDelta, row.incorrect.buttonWidthDelta])), result: feedback.status, realFeedbackTransitions: "NOT_TESTED" },
    rollback: "Remove the final V6.2 comment and its following @supports block; no earlier lines are changed by this patch."
  }],
  noOtherProductSourceChangedByV6_2: [patchedFile],
  protectedSmartSentenceFilesChanged: [],
  build: "NOT_RUN",
  deploy: "NOT_RUN"
};

const outputs = [
  ["DUDUQ_RESPONSIVE_GOLD_MASTER_V6_2.json", responsiveSummary],
  ["DUDUQ_RESPONSIVE_COMPONENT_AUDIT_V6_2.json", componentAudit],
  ["DUDUQ_RESPONSIVE_INTERACTION_MATRIX_V6_2.json", interactionMatrix],
  ["DUDUQ_RESPONSIVE_VISUAL_REGRESSION_V6_2.json", visualRegression],
  ["DUDUQ_RESPONSIVE_PATCHES_V6_2.json", patchReport]
];
await mkdir(qa, { recursive: true });
for (const [name, value] of outputs) await writeFile(path.join(qa, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ files: outputs.map(([name]) => path.join("docs/qa", name)), requested: raw.requested, rendered: raw.rendered, feedbackProbeCases: feedback.evaluated, status: responsiveSummary.status, responsiveReady: responsiveSummary.responsiveReady }, null, 2));
