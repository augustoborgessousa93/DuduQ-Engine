import { createHash } from "node:crypto";
import { readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = "content/mechanics/canonical-mechanics-lock-v1.json";
const lock = JSON.parse(await readFile(path.join(root, lockPath), "utf8"));
const files = [];
for (const [mechanic, entry] of Object.entries(lock.mechanics || {})) {
  for (const file of entry.sourceFiles || []) files.push({ path: file.path, mechanic, locked: file.sha256, kind: "sourceFiles" });
  for (const file of entry.integrationDependencies || []) files.push({ path: file.path, mechanic, locked: file.sha256, kind: "integrationDependencies" });
}
for (const file of lock.sharedDependencies || []) files.push({ path: file.path, mechanic: "shared", locked: file.sha256, kind: "sharedDependencies" });

function classify(pathname, added, removed) {
  const joined = [...added, ...removed].join("\n");
  if (pathname.startsWith("core/audio/") || pathname === "core/duduq-sound.js" || pathname === "core/duduq-content-audio.js") {
    return {
      classification: "MIXED_FILE_REQUIRES_SPLIT_REVIEW",
      approvalStatus: "PARTIAL_APPROVAL_EVIDENCE_ONLY",
      originEvidence: "V11.0 explicitly preserves final-win audio scope and the user-authorized audio lifecycle, but this diff must be separated by exact hunk; technical PASS alone does not establish approval for every new sound/manifest behavior.",
      recommendedAction: "Review hunks independently; retain only changes directly covered by the prior human rules and leave unrelated additions blocked from lock refresh."
    };
  }
  if (pathname.startsWith("test/target-shooter/gold-master-clean-v2/") || pathname === "play/target-shooter/index.html") {
    return {
      classification: "MIXED_FILE_REQUIRES_SPLIT_REVIEW",
      approvalStatus: "ROUTE_APPROVAL_EVIDENCED_OTHER_HUNKS_NOT_YET_APPROVED",
      originEvidence: "The V11.3 baseline explicitly verifies the intentional source /test/ path and build-only /runtime/ relocation plus a Target Shooter journey. These files also contain other hunks (see exactChangedRegions); route approval does not approve every current byte or Gold Master visual/behavior edit.",
      recommendedAction: "Keep the separately fixed route-owner expectation; split route-only hunks from Gold Master/visual/gameplay hunks and reconcile only individually evidenced hunks."
    };
  }
  if (pathname.startsWith("play/drag-drop/") && /150|recenter|center|audio|group|drag/i.test(joined)) {
    return {
      classification: "MIXED_FILE_REQUIRES_SPLIT_REVIEW",
      approvalStatus: "PRIOR_HUMAN_RULES_EXIST_EXACT_HUNK_APPROVAL_NOT_YET_PROVEN",
      originEvidence: "Human instructions explicitly require 150x150 Grouping cards, dynamic recentering, and audio-first/answer-neutral letter cards. Exact changed hunks must match those requirements; the broad instruction is not approval for unrelated behavior changes.",
      recommendedAction: "Compare each changed selector/function with the frozen Grouping invariants; reconcile only matching approved hunks."
    };
  }
  return {
    classification: "PROVENANCE_UNKNOWN",
    approvalStatus: "UNRESOLVED_FROM_LOCAL_EVIDENCE",
    originEvidence: "Git shows this path modified in the working tree relative to HEAD f37aebf5 (2026-10-14); no per-file commit provenance is available for the dirty hunk. A related freeze/preservation statement or automated PASS is not proof that this exact diff was approved.",
    recommendedAction: "Do not update the lock. Obtain a matching prior approval artifact or review/split the exact hunk; surgically reconcile any unapproved portion."
  };
}

const untrackedPaths = new Set([
  "core/duduq-module-flow.js",
  "core/duduq-target-shooter-content.js",
  "play/memory-quest/memory-quest-contract.js",
  "core/duduq-y1m01-module-runtime.js",
  "core/duduq-canonical-screen-transition.js"
]);

const rows = [];
const completeDiff = await new Promise((resolve, reject) => {
  let value = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", chunk => { value += chunk; });
  process.stdin.on("end", () => resolve(value));
  process.stdin.on("error", reject);
});
const diffByPath = new Map();
let diffPath = null;
let diffLines = [];
for (const line of completeDiff.split(/\r?\n/)) {
  if (line.startsWith("diff --git a/")) {
    if (diffPath) diffByPath.set(diffPath, diffLines.join("\n"));
    diffPath = line.slice("diff --git a/".length).split(" b/")[0];
    diffLines = [line];
  } else if (diffPath) diffLines.push(line);
}
if (diffPath) diffByPath.set(diffPath, diffLines.join("\n"));
for (const meta of files) {
  const pathname = meta.path;
  const currentBytes = await readFile(path.join(root, pathname));
  const currentSha256 = createHash("sha256").update(currentBytes).digest("hex");
  if (currentSha256 === meta.locked) continue;
  const normalizedLfSha256 = createHash("sha256").update(currentBytes.toString("utf8").replace(/\r\n/g, "\n")).digest("hex");
  const diff = diffByPath.get(pathname) || "";
  const hunks = [];
  let active = null;
  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith("@@")) {
      active = { range: line, removed: [], added: [] };
      hunks.push(active);
    } else if (active && line.startsWith("+") && !line.startsWith("+++")) active.added.push(line.slice(1));
    else if (active && line.startsWith("-") && !line.startsWith("---")) active.removed.push(line.slice(1));
  }
  const added = hunks.flatMap(h => h.added);
  const removed = hunks.flatMap(h => h.removed);
  const fileStat = await stat(path.join(root, pathname));
  const isUntracked = untrackedPaths.has(pathname);
  const result = isUntracked ? {
    classification: pathname === "core/duduq-target-shooter-content.js" ? "CONTENT_ADAPTER_ONLY" : "PROVENANCE_UNKNOWN",
    approvalStatus: "NO_TRACKED_PRIOR_VERSION_OR_EXACT_DIFF; CURRENT_ROLE_REVIEWED_ONLY",
    originEvidence: `Git reports this path as untracked (??), so its locked predecessor has no available Git blob or textual diff. Current file role can be read, but exact changed regions, origin mission, and approval cannot be reconstructed from SHA-256 alone. Filesystem last-write UTC: ${fileStat.mtime.toISOString()}.`,
    recommendedAction: "Do not update this lock entry until an approved prior source/artifact or explicit human acceptance of this exact current file is recorded."
  } : !hunks.length && normalizedLfSha256 === meta.locked ? {
    classification: "NON_BEHAVIORAL_BUILD_OR_ROUTE_CHANGE",
    approvalStatus: "NO_HUMAN_APPROVAL_REQUIRED_BYTE_NORMALIZATION_ONLY",
    originEvidence: "The current byte hash differs, but normalizing CRLF to LF exactly reproduces the locked SHA-256; Git reports no textual content hunk. This is line-ending normalization only, not a source-semantic change.",
    recommendedAction: "Make the validator hash LF-normalized text (or the Git blob) for this source class; do not rewrite the source or treat line-ending variance as mechanic drift."
  } : classify(pathname, added, removed);
  const symbolLines = [...added, ...removed].filter(line => /\b(function|class|const|let|var|export|@media|@keyframes)\b|^\s*\.[\w:#.[\]-]+\s*\{|^\s*#[\w-]+/.test(line)).slice(0, 80);
  rows.push({
    divergenceId: `SHA-${String(rows.length + 1).padStart(2, "0")}`,
    path: pathname,
    mechanic: meta.mechanic,
    lockEntryType: meta.kind,
    lockedSha256: meta.locked,
    currentSha256,
    normalizedLfSha256,
    classification: result.classification,
    exactChangedRegions: hunks.map(h => ({ range: h.range, removed: h.removed, added: h.added })),
    changeType: isUntracked ? "Untracked current source; locked predecessor has no recoverable repository blob, so exact old-to-new diff is unavailable." : hunks.length ? `${added.length} added lines / ${removed.length} removed lines in ${hunks.length} hunks` : "SHA differs but Git reports no text hunk; byte-level provenance is unresolved.",
    functionsSelectorsConstantsAffected: symbolLines,
    diffSummary: `Added: ${added.length}; removed: ${removed.length}; hunks: ${hunks.length}. Exact changed lines are preserved in exactChangedRegions.`,
    behaviorImpact: result.classification === "APPROVED_SHARED_INFRASTRUCTURE_EVOLUTION" ? "Shared learner-audio sequencing/cancellation only; preserves isolated letter target once when validated." : "Requires per-hunk semantic review; hash-only evidence cannot establish behavior change or invariance.",
    visualImpact: /\.css$/.test(pathname) || /index\.html$/.test(pathname) ? "Potential visual/layout/route impact; inspect exact changed regions." : "No direct visual impact established from hash alone; inspect exact changed regions.",
    runtimeImpact: result.classification === "NON_BEHAVIORAL_BUILD_OR_ROUTE_CHANGE" ? "Route/source/build resolution; verify source and staged-runtime ownership." : "Current runtime source differs from locked bytes; behavioral impact unresolved unless explicitly scoped above.",
    likelyOrigin: isUntracked ? `Untracked source file; filesystem last-write UTC ${fileStat.mtime.toISOString()}; exact creation/overwrite event not represented in Git.` : "Uncommitted working-tree change after HEAD f37aebf5 (2026-10-14); no later per-file commit found because the modification is uncommitted.",
    originEvidence: result.originEvidence,
    approvalEvidence: result.originEvidence,
    approvalStatus: result.approvalStatus,
    recommendedAction: result.recommendedAction,
    engineChangeRequired: false,
    gitDiffStatus: isUntracked ? "UNTRACKED_NO_BASELINE_DIFF_AVAILABLE" : hunks.length ? "MODIFIED_WORKTREE_TEXT_DIFF" : "MODIFIED_WORKTREE_NO_TEXT_HUNK"
  });
}

const counts = rows.reduce((out, row) => (out[row.classification] = (out[row.classification] || 0) + 1, out), {});
const uniquePaths = new Set(rows.map(row => row.path));
const partialApprovalRows = rows.filter(row => /EVIDENCED|PARTIAL_APPROVAL/.test(row.approvalStatus)).length;
const ledger = {
  feature: "DUDUQ_CANONICAL_HASH_PROVENANCE_V11_3B",
  baseline: "HEAD f37aebf5, 2026-10-14T12:59:05-03:00; dirty working-tree hunks audited against canonical lock",
  authority: lockPath,
  hashDivergenceEntriesAudited: rows.length,
  uniquePathsAudited: uniquePaths.size,
  classificationCounts: counts,
  findings: "Lock comparisons are byte-hash checks only. The 45 lock divergence entries represent 44 unique paths because core/duduq-module-flow.js is locked both as Intro source and as a shared dependency. Five unique paths are untracked and have no recoverable prior Git blob; their old exact diff cannot be reconstructed from a SHA-256. Other current textual changes are dirty worktree hunks relative to HEAD f37aebf5. Ten rows contain evidence for a previously approved subset of hunks, but each is mixed and does not justify refreshing the whole-file hash. Technical validation is not treated as human approval.",
  partialPriorApprovalEvidenceRows: partialApprovalRows,
  wholeFilePriorApprovalProven: 0,
  unexplainedOrMixedRows: rows.length,
  untrackedUniquePaths: [...uniquePaths].filter(p => untrackedPaths.has(p)),
  lockHashesUpdated: 0,
  rows
};
if (rows.length !== 45) throw new Error(`EXPECTED_45_HASH_DIVERGENCES_GOT_${rows.length}`);
const jsonPath = path.join(root, "docs/qa/DUDUQ_CANONICAL_HASH_PROVENANCE_V11_3B.json");
await writeFile(jsonPath, `${JSON.stringify(ledger, null, 2)}\n`);
const md = [
  "# DUDUQ Canonical Hash Provenance V11.3B",
  "",
  `Files audited: **${rows.length}/45**. Lock hashes updated: **0**.`,
  "",
  `HEAD baseline: ${ledger.baseline}. The lock performs exact SHA-256 checks; it does not prove behavioral change or approval. Current diffs are dirty worktree changes, so Git cannot assign them to a committed mission. Exact added/removed hunk lines and ranges are in the JSON ledger. Automated PASS is not treated as human approval.`,
  "",
  "## Classification",
  "",
  ...Object.entries(counts).map(([name, count]) => `- ${name}: ${count}`),
  "",
  "## Per-file ledger",
  "",
  ...rows.map(row => [
    `### ${row.path}`,
    "",
    `- Mechanic / dependency: ${row.mechanic} / ${row.lockEntryType}`,
    `- Locked: ${row.lockedSha256}`,
    `- Current: ${row.currentSha256}`,
    `- Classification: **${row.classification}**; approval: **${row.approvalStatus}**`,
    `- Diff: ${row.diffSummary}`,
    `- Impact: ${row.behaviorImpact} Visual: ${row.visualImpact} Runtime: ${row.runtimeImpact}`,
    `- Origin / approval evidence: ${row.originEvidence}`,
    `- Recommended action: ${row.recommendedAction}`,
    `- Exact region headers: ${row.exactChangedRegions.map(h => h.range).join("; ") || "No unstaged textual hunk (check staged/binary state)."}`,
    ""
  ]).flat(),
  ""
].join("\n");
const mdPath = path.join(root, "docs/qa/DUDUQ_CANONICAL_HASH_PROVENANCE_V11_3B.md");
await writeFile(mdPath, md);
console.log(JSON.stringify({ files: rows.length, counts, json: path.relative(root, jsonPath), markdown: path.relative(root, mdPath), lockHashesUpdated: 0 }, null, 2));
