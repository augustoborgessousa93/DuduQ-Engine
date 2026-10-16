import { access, mkdir, readFile, writeFile } from "node:fs/promises";

const readJson = async file => JSON.parse(await readFile(file, "utf8"));
const questions = await readJson("content/english/year-2/module-01/questions.json");
const registry = await readJson("content/english/audio/audio-registry.json");
const audioById = new Map((registry.entries || []).map(entry => [entry.audioId, entry]));
const entriesById = new Map();
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^A-Za-z0-9]/g, "").toUpperCase();

for (const question of questions.items || []) {
  const pairTarget = new Map((question.pairs || []).map(pair => [pair.pairId, pair.semanticTarget]));
  const itemTarget = new Map((question.items || []).map(item => [item.id, item.semanticTarget || item.label || ""]));
  const refs = [];
  for (const binding of question.audioBindings || []) {
    if (!binding.audioId || String(binding.role || "").startsWith("instruction_")) continue;
    const target = pairTarget.get(binding.pairId) || itemTarget.get(binding.itemId) || question.stimulus?.target || "";
    refs.push({ audioId: binding.audioId, role: binding.role || "learner-content", expectedTarget: target });
  }
  if (question.stimulus?.audioId) refs.push({ audioId: question.stimulus.audioId, role: "learner-stimulus", expectedTarget: question.stimulus.target || "" });
  const seenForQuestion = new Set();
  for (const ref of refs) {
    const id = ref.audioId;
    if (seenForQuestion.has(id)) continue;
    seenForQuestion.add(id);
    const entry = audioById.get(id);
    const asset = String(entry?.urlOrPath || entry?.outputPath || "").replaceAll("\\", "/");
    const transcript = String(entry?.transcript || "");
    const expectedTarget = ref.expectedTarget || transcript;
    const transcriptMatch = !ref.expectedTarget || !transcript
      || normalize(ref.expectedTarget) === normalize(transcript)
      || normalize(transcript).includes(normalize(ref.expectedTarget));
    let assetExists = false;
    if (asset) try { await access(asset); assetExists = true; } catch {}
    const use = {
      questionId: question.item_id,
      mechanicId: question.mechanicId,
      semanticType: question.semanticTargetType || "UNSPECIFIED",
      semanticTarget: ref.expectedTarget || question.stimulus?.target || "",
      audioRole: ref.role,
      expectedEnglish: expectedTarget,
      technicalBindingStatus: entry && assetExists && transcriptMatch && entry.status === "APPROVED" ? "PASS" : "ISSUE",
      assetPresentExpected: assetExists
    };
    const current = entriesById.get(id) || {
      audioId: id,
      assetPath: asset,
      registeredTranscript: transcript || null,
      engine: entry?.engine || null,
      profile: entry?.voiceProfile || entry?.productionVoiceProfile || null,
      language: entry?.language || null,
      reuse: entry?.sourceComposition ? "COMPOSED_FROM_REUSED_CANONICAL_LETTER_AUDIO"
        : /CANONICAL_LETTERS/.test(asset) ? "REUSED_CANONICAL"
          : entry?.reused === true ? "REUSED_APPROVED_ASSET" : "EXISTING_REGISTERED_ASSET",
      uses: []
    };
    current.uses.push(use);
    current.technicalBindingStatus = current.uses.every(row => row.technicalBindingStatus === "PASS") ? "PASS" : "ISSUE";
    current.assetPresentExpected = current.uses.every(row => row.assetPresentExpected);
    current.pronunciationReviewStatus = "HUMAN_LISTENING_PENDING";
    current.pronunciationFinding = "NOT_MACHINE_CERTIFIABLE";
    current.playControl = asset ? `/${asset}` : null;
    current.portugueseMeaning = /^[A-Z]$/.test(String(expectedTarget).trim())
      ? "Sem tradução; identificar a letra."
      : null;
    entriesById.set(id, current);
  }
}

const rows = [...entriesById.values()].sort((a, b) => a.audioId.localeCompare(b.audioId));
const report = {
  feature: "DUDUQ_HUMAN_QA_CORRECTION_ROUND_V10_13",
  moduleId: "Y2M01",
  generatedAt: new Date().toISOString(),
  scope: "Unique learner-content target/stimulus clips; instruction and feedback audio excluded.",
  voice: "DUDUQ_GOLD_VOICE_v1",
  engine: "CHATTERBOX_MULTILINGUAL_V3",
  technicalBindingStatus: rows.every(row => row.technicalBindingStatus === "PASS") ? "PASS" : "ISSUE",
  humanPronunciationStatus: "HUMAN_LISTENING_PENDING",
  pronunciationDefectCount: "UNASSESSED_BY_MACHINE",
  humanReportedSuspectClipCount: "NOT_YET_LOCALIZED_TO_AUDIO_IDS",
  note: "Registry, transcript matching, and file checks do not certify pronunciation. Augusto must listen to each clip and identify any defective targets before scale.",
  uniqueClipCount: rows.length,
  entries: rows
};
await mkdir("docs/qa", { recursive: true });
await mkdir("qa/y2m01", { recursive: true });
await writeFile("docs/qa/DUDUQ_Y2M01_HUMAN_AUDIO_REVIEW_V10_13.json", `${JSON.stringify(report, null, 2)}\n`);

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
})[char]);
const cards = rows.map(row => {
  const usages = row.uses.map(use => `${use.questionId} · ${use.mechanicId} · ${use.audioRole}`).join(" | ");
  const targets = [...new Set(row.uses.map(use => use.expectedEnglish))].join(" / ");
  return `<article class="clip"><header><strong>${escapeHtml(row.audioId)}</strong><span>${escapeHtml(row.language || "language unresolved")}</span></header><h2>${escapeHtml(row.registeredTranscript || "Transcript unavailable")}</h2><p>${escapeHtml(usages)}</p><audio controls preload="none" src="${escapeHtml(row.playControl || "")}"></audio><dl><dt>Expected target(s)</dt><dd>${escapeHtml(targets)}</dd><dt>PT support</dt><dd>${escapeHtml(row.portugueseMeaning || "Only if useful; do not force translation")}</dd><dt>Pronunciation</dt><dd>HUMAN_LISTENING_PENDING</dd><dt>Binding</dt><dd>${escapeHtml(row.technicalBindingStatus)}</dd><dt>Profile / engine</dt><dd>${escapeHtml(`${row.profile || "profile unresolved"} / ${row.engine || "engine unresolved"}`)}</dd><dt>Asset</dt><dd>${escapeHtml(row.assetPath || "UNRESOLVED")}</dd></dl></article>`;
}).join("\n");
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Y2M01 Gold Voice Review</title><style>body{margin:0;background:#eef4f0;color:#31473d;font:16px/1.45 Nunito,system-ui,sans-serif}main{max-width:1120px;margin:0 auto;padding:24px}h1{font-size:clamp(1.5rem,3vw,2.2rem)}.notice{padding:14px 18px;border-radius:12px;background:#fff1c2}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),1fr));gap:14px;margin-top:20px}.clip{background:#fffdf7;border:1px solid #decfa9;border-radius:16px;padding:16px;box-shadow:0 3px 0 #b8a68e}.clip header{display:flex;justify-content:space-between;gap:8px}.clip h2{font-size:1.25rem;margin:10px 0 4px}.clip p,.clip dd{overflow-wrap:anywhere}.clip audio{width:100%;min-height:44px}.clip dl{display:grid;grid-template-columns:110px 1fr;gap:4px 10px}.clip dt{font-weight:800}.clip dd{margin:0;font-size:.9rem}@media(max-width:480px){main{padding:14px}.clip dl{grid-template-columns:1fr;gap:0}.clip dd{margin-bottom:8px}}</style><main><h1>Y2M01 learner-audio pronunciation review</h1><p class="notice"><strong>Pronunciation remains unapproved.</strong> Listen for the intended English target, clear articulation, clipping, pace, and any extra speech. Technical validity is not pronunciation approval.</p><p>${rows.length} unique learner-content clips · Gold Voice: DUDUQ_GOLD_VOICE_v1 · Engine: CHATTERBOX_MULTILINGUAL_V3.</p><section class="grid">${cards}</section></main></html>`;
await writeFile("qa/y2m01/human-audio-review.html", html);
console.log(JSON.stringify({ status: report.technicalBindingStatus, uniqueClipCount: rows.length, pending: rows.length }, null, 2));
