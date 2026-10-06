const MODULE_BASE = "/content/english/year-1/module-01/";
const MANIFEST_URL = "/duduq-audio/manifests/AUDIO_MANIFEST.json";
const REGISTRY_URL = "/content/english/audio/audio-registry.json";
const missingSimulation = new URL(location.href).searchParams.get("simulateMissing");
const audio = document.querySelector("#shared-audio");
const state = { questions: [], contracts: [], registry: [], audioProduction: {}, questionIndex: 0, activeButton: null, lastContract: null, playing: false };
const el = (selector) => document.querySelector(selector);

function decodeLegacyText(value) {
  if (typeof value !== "string" || !/[ÃÂâ]/.test(value)) return value || "";
  try { return new TextDecoder("utf-8").decode(Uint8Array.from([...value].map((char) => char.charCodeAt(0) & 255))); }
  catch { return value; }
}
function normalize(value) { return decodeLegacyText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function contractUrl(contract) { return `/${contract.audioPath.replace(/^\/+/, "")}`; }
function contractsForQuestion(questionId) { return state.contracts.filter((item) => item.module === "Y1M01" && item.activity?.includes(questionId)); }
function itemContracts(questionId) { return contractsForQuestion(questionId).filter((item) => item.type !== "GLOBAL_UI"); }
function globalContracts() { return state.contracts.filter((item) => item.module === "Y1M01" && item.type === "GLOBAL_UI"); }
function matchContentContract(label, candidates) {
  const key = normalize(label).replace(/^audio\s+/, "");
  const content = candidates.filter((item) => item.type !== "GLOBAL_UI");
  const exact = content.filter((item) => normalize(item.displayText) === key);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;
  const tokens = key.split(" ").filter(Boolean);
  const matching = content.filter((item) => {
    const words = normalize(item.displayText).split(" ");
    return tokens.length > 0 && tokens.every((token) => words.includes(token));
  });
  return matching.length === 1 ? matching[0] : null;
}
function setStatus(text, status = "ready", contract = null) {
  const line = el("#play-status");
  line.dataset.state = status;
  el("#status-text").textContent = text;
  el("#status-id").textContent = contract?.id || "";
}
function stopActiveAudio({ rewind = true } = {}) {
  audio.pause();
  if (rewind) { try { audio.currentTime = 0; } catch {} }
  if (state.activeButton) state.activeButton.setAttribute("aria-pressed", "false");
  state.activeButton = null;
  state.playing = false;
}
async function playContract(contract, button) {
  stopActiveAudio();
  state.lastContract = contract;
  state.activeButton = button;
  button?.setAttribute("aria-pressed", "true");
  const source = missingSimulation === contract.id ? "/qa/y1m01-audio/__qa_missing_audio__.mp3" : contractUrl(contract);
  audio.src = source;
  audio.load();
  setStatus("Carregando áudio oficial…", "loading", contract);
  try {
    await audio.play();
    state.playing = true;
    setStatus("PLAYING · áudio oficial", "playing", contract);
  } catch (error) {
    stopActiveAudio();
    setStatus("Áudio indisponível; a questão continua funcionando.", "missing", contract);
    console.warn("[Y1M01 Audio QA] Missing/failed audio", { id: contract.id, path: source, error: error?.message || String(error) });
  }
}
audio.addEventListener("playing", () => { state.playing = true; setStatus("PLAYING · áudio oficial", "playing", state.lastContract); });
audio.addEventListener("ended", () => { stopActiveAudio({ rewind: false }); setStatus("Reprodução concluída", "ready", state.lastContract); });
audio.addEventListener("pause", () => { if (!audio.ended && state.playing) { stopActiveAudio({ rewind: false }); setStatus("Reprodução pausada", "ready", state.lastContract); } });
audio.addEventListener("error", () => {
  if (!state.lastContract) return;
  stopActiveAudio();
  setStatus("Áudio indisponível; a questão continua funcionando.", "missing", state.lastContract);
  console.warn("[Y1M01 Audio QA] Audio element error", { id: state.lastContract.id, source: audio.currentSrc });
});

function makePlayButton(contract, label, className = "mini-play") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `play-button ${className}`;
  button.setAttribute("aria-label", `Reproduzir ${label}: ${contract.displayText}`);
  button.setAttribute("aria-pressed", "false");
  button.innerHTML = className.includes("primary-play") ? `▶ <span>${label}</span>` : "▶";
  button.addEventListener("click", () => {
    if (state.activeButton === button && !audio.paused) { stopActiveAudio(); setStatus("Reprodução pausada", "ready", contract); return; }
    void playContract(contract, button);
  });
  return button;
}

function renderQuestion() {
  stopActiveAudio();
  const q = state.questions[state.questionIndex];
  const qid = q.item_id;
  const contracts = itemContracts(qid);
  const promptContract = globalContracts().find((item) => normalize(item.displayText) === normalize(q.instrucao_pt)) || null;
  el("#question-position").textContent = `QUESTÃO ${String(state.questionIndex + 1).padStart(2, "0")} / ${state.questions.length}`;
  el("#question-title").textContent = `${qid} · ${decodeLegacyText(q.objetivo)}`;
  el("#mechanic-tag").textContent = decodeLegacyText(q.mecanica_preferida || "Y1M01").replaceAll("-", " ").toUpperCase();
  el("#question-prompt").textContent = decodeLegacyText(q.instrucao_pt || q.objetivo || "");
  const promptButton = el("#play-prompt");
  promptButton.disabled = !promptContract;
  promptButton.querySelector("span").textContent = promptContract ? "Ouvir instrução" : "Instrução sem áudio associado";
  promptButton.onclick = promptContract ? () => void playContract(promptContract, promptButton) : null;
  promptButton.setAttribute("aria-label", promptContract ? `Reproduzir instrução ${promptContract.id}` : "Instrução sem áudio associado no manifesto");
  const stimuli = el("#stimuli");
  stimuli.replaceChildren();
  const choices = [q.opcao_a, q.opcao_b, q.opcao_c, q.opcao_d].filter((value) => value && String(value).trim());
  const moduleContentContracts = state.contracts.filter((item) => item.module === "Y1M01" && item.type !== "GLOBAL_UI");
  const optionBindings = state.audioProduction[qid] || [];
  const hasExplicitAudioOptions = choices.some((choice) => normalize(choice).startsWith("audio "));
  const optionMatches = choices.map((choice, index) => {
    if (hasExplicitAudioOptions) {
      const role = `option_${String.fromCharCode(97 + index)}`;
      const binding = optionBindings.find((entry) => entry.role === role);
      const boundContract = binding && state.contracts.find((item) => item.id === binding.audioId);
      if (boundContract) return boundContract;
    }
    return matchContentContract(choice, contracts) || matchContentContract(choice, moduleContentContracts);
  });
  const stimulusContracts = [...new Map([...contracts.filter((item) => item.type !== "GLOBAL_UI"), ...optionMatches.filter(Boolean)].map((item) => [item.id, item])).values()];
  for (const contract of stimulusContracts) {
    const chip = document.createElement("div");
    chip.className = "stimulus-chip";
    const copy = document.createElement("div");
    copy.className = "stimulus-copy";
    const title = document.createElement("strong"); title.textContent = `Áudio do conteúdo · ${contract.type}`;
    const text = document.createElement("span"); text.textContent = decodeLegacyText(contract.displayText);
    copy.append(title, text);
    chip.append(copy, makePlayButton(contract, "áudio do conteúdo"));
    stimuli.append(chip);
  }
  const options = el("#options"); options.replaceChildren();
  choices.forEach((choice, index) => {
    const card = document.createElement("div"); card.className = "option-card";
    const letter = document.createElement("span"); letter.className = "option-letter"; letter.textContent = String.fromCharCode(65 + index);
    const text = document.createElement("span"); text.className = "option-text"; text.textContent = decodeLegacyText(choice);
    card.append(letter, text);
    const matching = optionMatches[index];
    if (matching) card.append(makePlayButton(matching, `alternativa ${String.fromCharCode(65 + index)}`, "mini-play option-audio"));
    else { const unavailable = document.createElement("span"); unavailable.className = "option-unavailable"; unavailable.textContent = "sem áudio no contrato"; card.append(unavailable); }
    options.append(card);
  });
  el("#previous").disabled = state.questionIndex === 0;
  el("#next").disabled = state.questionIndex === state.questions.length - 1;
  el("#progress").style.width = `${((state.questionIndex + 1) / state.questions.length) * 100}%`;
  setStatus(promptContract ? "Pronto para reproduzir · sem autoplay" : "Sem áudio de enunciado mapeado; questão preservada", promptContract ? "ready" : "missing", promptContract);
}

function renderGlobalAudio() {
  const list = el("#global-audio-list");
  const global = globalContracts();
  el("#global-audio-count").textContent = `· ${global.length} contratos`;
  for (const contract of global) {
    const chip = document.createElement("div"); chip.className = "stimulus-chip";
    const copy = document.createElement("div"); copy.className = "stimulus-copy";
    const title = document.createElement("strong"); title.textContent = `Instrução global · ${contract.id}`;
    const text = document.createElement("span"); text.textContent = decodeLegacyText(contract.displayText);
    copy.append(title, text); chip.append(copy, makePlayButton(contract, "instrução")); list.append(chip);
  }
}

async function auditContracts() {
  const rows = el("#audit-rows");
  const results = await Promise.all(state.contracts.filter((item) => item.module === "Y1M01").map(async (item) => {
    const path = contractUrl(item);
    let response;
    try { response = await fetch(path, { method: "HEAD", cache: "no-store" }); }
    catch (error) { return { item, path, status: "NETWORK_ERROR", type: "—", ok: false, error: error.message }; }
    const type = response.headers.get("content-type") || "unknown";
    const ok = response.status === 200 && type.toLowerCase().includes("audio/mpeg") && ["DONE", "APPROVED"].includes(item.status) && item.voiceVersion === "DUDUQ_GOLD_VOICE_v1" && item.deliveryProfile === "NATURAL_CLEAR_V2";
    return { item, path, status: response.status, type, ok };
  }));
  rows.replaceChildren();
  for (const result of results) {
    const tr = document.createElement("tr");
    const td1 = document.createElement("td"); const contractName = document.createElement("strong"); contractName.textContent = result.item.id; const usages = document.createElement("small"); usages.textContent = (result.item.activity || []).join(", "); td1.append(contractName, document.createElement("br"), usages);
    const td2 = document.createElement("td"); td2.textContent = decodeLegacyText(result.item.displayText);
    const td3 = document.createElement("td"); td3.textContent = decodeLegacyText(result.item.speechText || result.item.displayText);
    const td4 = document.createElement("td"); td4.textContent = `${result.item.type} · ${result.item.locale} · ${result.item.voiceVersion}`;
    const td5 = document.createElement("td"); const code = document.createElement("code"); code.textContent = result.item.audioPath; const duration = document.createElement("small"); duration.textContent = `${result.item.duration ?? "?"} s`; td5.append(code, document.createElement("br"), duration);
    const td6 = document.createElement("td"); td6.className = result.ok ? "http-ok" : "http-bad"; td6.textContent = `${result.ok ? "SIM" : "NÃO"} · ${result.status} · ${result.type}`;
    tr.append(td1, td2, td3, td4, td5, td6); rows.append(tr);
  }
  const pass = results.filter((item) => item.ok).length;
  el("#audit-count").textContent = `${pass}/${results.length}`;
  el("#audit-http").textContent = `${results.filter((item) => item.status === 200 && item.type.includes("audio/mpeg")).length}/${results.length}`;
  el("#audit-missing").textContent = String(results.length - pass);
  return results;
}

async function init() {
  const [manifest, questionsFile, registry, audioProduction] = await Promise.all([
    fetch(MANIFEST_URL).then((response) => { if (!response.ok) throw new Error(`manifest HTTP ${response.status}`); return response.json(); }),
    fetch(`${MODULE_BASE}questions.json`).then((response) => { if (!response.ok) throw new Error(`questions HTTP ${response.status}`); return response.json(); }),
    fetch(REGISTRY_URL).then((response) => { if (!response.ok) throw new Error(`registry HTTP ${response.status}`); return response.json(); }),
    fetch(`${MODULE_BASE}audio-production-manifest.json`).then((response) => { if (!response.ok) throw new Error(`audio production manifest HTTP ${response.status}`); return response.json(); })
  ]);
  state.contracts = manifest.items;
  state.questions = questionsFile.items;
  state.registry = registry.entries || [];
  state.audioProduction = audioProduction.items || {};
  if (state.contracts.filter((item) => item.module === "Y1M01").length !== 23) throw new Error("Y1M01 precisa conter exatamente 23 contratos oficiais.");
  renderGlobalAudio();
  renderQuestion();
  el("#previous").addEventListener("click", () => { if (state.questionIndex > 0) { state.questionIndex--; renderQuestion(); } });
  el("#next").addEventListener("click", () => { if (state.questionIndex < state.questions.length - 1) { state.questionIndex++; renderQuestion(); } });
  el("#toggle-audit").addEventListener("click", (event) => {
    const panel = el("#audit-panel"); panel.hidden = !panel.hidden;
    event.currentTarget.setAttribute("aria-expanded", String(!panel.hidden));
  });
  await auditContracts();
  document.body.dataset.qaReady = "true";
  el("#qa-shell").setAttribute("aria-busy", "false");
  el("#qa-shell").dataset.loaded = "true";
  el("#status-text").textContent = "Pronto para ouvir · use os controles para testar a voz";
}

init().catch((error) => {
  console.error("[Y1M01 Audio QA] Initialization failed", error);
  el("#audit-count").textContent = "Falha ao carregar";
  setStatus(`Erro ao abrir a configuração: ${error.message}`, "missing");
  el("#qa-shell").setAttribute("aria-busy", "false");
});
