/* =========================================================
   DUDUQ MECHANIC — WORD SLASH
   Candidate Release 1.0.7 — Typography + Audio Playing Parity

   Escopo exclusivo:
   - alinhar família/tamanho/peso do enunciado à Target Shooter 1.0.21;
   - manter botão de áudio 44x44 no mesmo padrão visual;
   - aplicar estado verde durante reprodução;
   - aplicar ícone verde-escuro durante reprodução;
   - preservar geometria/glass arena da 1.0.6;
   - preservar corte, física, spawn, velocidade, score, progressão e completion flow;
   - manter Canary, módulos oficiais e releases anteriores intocados.
   ========================================================= */
(function () {
  "use strict";

  if (!window.DuduQ) {
    console.error("[DuduQ Word Slash] duduq-host.js precisa ser carregado antes.");
    return;
  }

  const MECHANIC_ID = "word-slash";
  const VERSION = "1.0.7";
  const RUNTIME_VERSION = "1.0.0";
  const RUNTIME_PATH = "/engine/releases/mechanics/word-slash/1.0.7/";

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function asString(value, fallback = "") {
    if (value === null || value === undefined) return fallback;
    const text = String(value).trim();
    return text || fallback;
  }

  function asNumber(value, fallback, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, number));
  }

  function getEngineBase() {
    if (window.DUDUQ_ENGINE_BASE) return String(window.DUDUQ_ENGINE_BASE).replace(/\/$/, "");
    return ".";
  }

  function extractQuestions(payload) {
    if (Array.isArray(payload)) return payload;
    if (!isObject(payload)) return [];
    if (Array.isArray(payload.questions)) return payload.questions;
    if (Array.isArray(payload.items)) return payload.items;
    return [payload];
  }

  function normalizeQuestion(raw, index) {
    if (window.DuduQSchema?.normalizeQuestion) return window.DuduQSchema.normalizeQuestion(raw, index, {});
    return raw;
  }

  function normalizeWordSlashConfig(question) {
    const config = question?.metadata?.wordSlash;
    if (!isObject(config)) {
      throw new Error(`[DuduQ Word Slash] Questão ${question?.id || "sem-id"} não possui metadata.wordSlash.`);
    }
    if (!Array.isArray(config.objects) || config.objects.length < 2) {
      throw new Error(`[DuduQ Word Slash] Questão ${question?.id || "sem-id"}: informe ao menos dois objetos.`);
    }
    if (!isObject(config.target)) {
      throw new Error(`[DuduQ Word Slash] Questão ${question?.id || "sem-id"}: target é obrigatório.`);
    }
    return config;
  }

  function defaultDifficulty(year) {
    const grade = Math.max(1, Math.min(5, Number(year) || 1));
    const profiles = {
      1: { speedMinMs: 3600, speedMaxMs: 4600, maxObjects: 4, spawnEveryMs: 860, timeLimitSeconds: 38, correctProbability: .50 },
      2: { speedMinMs: 3400, speedMaxMs: 4400, maxObjects: 4, spawnEveryMs: 820, timeLimitSeconds: 38, correctProbability: .52 },
      3: { speedMinMs: 3200, speedMaxMs: 4200, maxObjects: 5, spawnEveryMs: 760, timeLimitSeconds: 40, correctProbability: .54 },
      4: { speedMinMs: 3000, speedMaxMs: 4000, maxObjects: 5, spawnEveryMs: 700, timeLimitSeconds: 42, correctProbability: .56 },
      5: { speedMinMs: 2800, speedMaxMs: 3800, maxObjects: 6, spawnEveryMs: 650, timeLimitSeconds: 44, correctProbability: .58 }
    };
    return { ...profiles[grade] };
  }

  function normalizeObject(raw, questionId, index, assets) {
    const object = isObject(raw) ? raw : {};
    const id = asString(object.id, `${questionId}-object-${index + 1}`);
    const imageSrc = asString(object.imageSrc || object.image?.src);
    let imageAssetKey = asString(object.imageAssetKey);

    if (imageSrc) {
      imageAssetKey = imageAssetKey || `ws-${questionId}-${id}`;
      assets[imageAssetKey] = imageSrc;
    }

    const normalized = {
      id,
      type: asString(object.type, imageAssetKey ? "image" : object.colorHex ? "color" : "word"),
      label: asString(object.label),
      value: asString(object.value, object.label || object.alt || id),
      category: asString(object.category),
      weight: asNumber(object.weight, 1, 1, 20)
    };

    if (imageAssetKey) normalized.imageAssetKey = imageAssetKey;
    if (imageAssetKey) normalized.alt = asString(object.alt, object.label || object.value || id);
    if (object.colorHex) normalized.colorHex = asString(object.colorHex);
    return normalized;
  }

  function normalizeTarget(raw) {
    const target = isObject(raw) ? raw : {};
    const normalized = {
      label: asString(target.label, "TARGET"),
      value: asString(target.value),
      spokenText: asString(target.spokenText || target.value || target.label)
    };
    if (Array.isArray(target.acceptCategories)) {
      normalized.acceptCategories = target.acceptCategories.map((value) => asString(value)).filter(Boolean);
    }
    if (target.hideValue === true) normalized.hideValue = true;
    return normalized;
  }

  function stageFromQuestion(question, index, context, assets) {
    const config = normalizeWordSlashConfig(question);
    const year = context?.year ?? question?.year ?? 1;
    const difficulty = { ...defaultDifficulty(year), ...(isObject(config.difficulty) ? config.difficulty : {}) };
    const questionId = asString(question.id, `word-slash-stage-${index + 1}`);

    return {
      id: questionId,
      title: asString(question?.metadata?.screenTitle || question?.metadata?.title || question?.statement, "Word Slash"),
      instruction: asString(question?.instruction, "Corte somente os elementos corretos."),
      audioText: asString(config.audioText || question?.audio?.text || question?.media?.audio?.text || question?.instruction),
      mode: asString(config.mode, "correct-word"),
      target: normalizeTarget(config.target),
      goal: Math.round(asNumber(config.goal, 3, 1, 20)),
      difficulty: {
        speedMinMs: Math.round(asNumber(difficulty.speedMinMs, 3600, 1200, 12000)),
        speedMaxMs: Math.round(asNumber(difficulty.speedMaxMs, 4600, 1400, 14000)),
        maxObjects: Math.round(asNumber(difficulty.maxObjects, 4, 2, 10)),
        spawnEveryMs: Math.round(asNumber(difficulty.spawnEveryMs, 860, 300, 3000)),
        timeLimitSeconds: Math.round(asNumber(difficulty.timeLimitSeconds, 38, 15, 120)),
        correctProbability: asNumber(difficulty.correctProbability, .5, .14, .85)
      },
      objects: config.objects.map((object, objectIndex) => normalizeObject(object, questionId, objectIndex, assets))
    };
  }

  function buildRuntimeConfig(payload, questions, context) {
    const assets = Object.create(null);
    const stages = questions.map((question, index) => stageFromQuestion(question, index, context, assets));
    const first = questions[0] || {};
    const year = Math.max(1, Math.min(5, Number(context?.year ?? first?.year ?? 1) || 1));

    return {
      config: {
        schemaVersion: 1,
        mechanic: "word-slash",
        version: RUNTIME_VERSION,
        title: asString(payload?.title || first?.metadata?.screenTitle || first?.metadata?.title, "Word Slash"),
        settings: {
          interfaceLocale: "pt-BR",
          speechLocale: "en-US",
          targetGrade: year,
          extraTimeSeconds: Math.round(asNumber(first?.metadata?.wordSlash?.extraTimeSeconds, 12, 0, 60)),
          wrongPenalty: Math.round(asNumber(first?.metadata?.wordSlash?.wrongPenalty, 0, 0, 5))
        },
        stages
      },
      assets
    };
  }

  function safeJson(value) {
    return JSON.stringify(value, null, 2)
      .replace(/</g, "\\u003c")
      .replace(/`/g, "\\`")
      .replace(/\$\{/g, "\\${");
  }

  function replaceActivityConfig(html, config) {
    const marker = 'var WORD_SLASH_ACTIVITY_JSON = String.raw`';
    const start = html.indexOf(marker);
    if (start < 0) throw new Error("[DuduQ Word Slash] Bloco WORD_SLASH_ACTIVITY_JSON não encontrado.");
    const contentStart = start + marker.length;
    const tailMarker = '`;\n\n  var WORD_SLASH_CONFIG = JSON.parse(WORD_SLASH_ACTIVITY_JSON);';
    const end = html.indexOf(tailMarker, contentStart);
    if (end < 0) throw new Error("[DuduQ Word Slash] Fechamento do JSON não encontrado.");
    return html.slice(0, contentStart) + safeJson(config) + html.slice(end);
  }

  function installAssets(html, assets) {
    const marker = 'var WORD_SLASH_ASSETS = {\n    ...DRAG_DROP_UNIVERSAL_ASSETS\n  };';
    if (!html.includes(marker)) throw new Error("[DuduQ Word Slash] Ponto de injeção de assets não encontrado.");
    return html.replace(
      marker,
      `var WORD_SLASH_ASSETS = {\n    ...DRAG_DROP_UNIVERSAL_ASSETS,\n    ...${safeJson(assets)}\n  };`
    );
  }

  function installCompletionBridge(html) {
    const marker = "autoPlayInstruction: true,\n        gamificationPolicy:";
    if (!html.includes(marker)) throw new Error("[DuduQ Word Slash] Ponto de integração do Lesson Host não encontrado.");
    return html.replace(marker, [
      "autoPlayInstruction: true,",
      "        hostedByDuduQ: true,",
      '        onLessonComplete: () => window.parent.postMessage({type:"DUDUQ_WORD_SLASH_COMPLETE"}, "*"),',
      "        gamificationPolicy:"
    ].join("\n"));
  }

  function installShellParity(html) {
    const marker = "</body>";
    if (!html.includes(marker)) {
      throw new Error("[DuduQ Word Slash] Fechamento do runtime não encontrado para padronização visual.");
    }

    const speakerMask = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M11%205%206.5%209H3v6h3.5L11%2019V5Z%22%20fill%3D%22black%22%2F%3E%3Cpath%20d%3D%22M15%208.5c1.3%201.8%201.3%205.2%200%207%22%20stroke%3D%22black%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%2F%3E%3Cpath%20d%3D%22M18%206c2.7%203.4%202.7%208.6%200%2012%22%20stroke%3D%22black%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fsvg%3E";

    const css = `
<style id="duduq-word-slash-1-0-7-shell-parity">
/* Camada FINAL da cascata: mesma tipografia do Target Shooter 1.0.21,
   estado de áudio verde e ícone verde-escuro durante reprodução.
   Exclusivamente visual; não altera física, spawn, hit testing ou lógica. */
html body #root .duduq-engine-stage .duduq-ws-surface {
  width: 100% !important;
  max-width: none !important;
  min-width: 0 !important;
  margin: 0 auto !important;
  padding: 0 8px 16px !important;
  gap: 12px !important;
  row-gap: 12px !important;
}
html body #root .duduq-engine-stage .duduq-ws-instruction {
  width: min(1110px, calc(100% - 96px)) !important;
  min-height: 66px !important;
  margin: 0 auto !important;
  grid-template-columns: 48px minmax(0, 1fr) 48px !important;
  align-items: center !important;
  gap: 12px !important;
  padding: 8px 14px 10px !important;
  border: 2px solid #D8E0E8 !important;
  border-radius: 999px !important;
  background: rgba(255,255,255,.97) !important;
  box-shadow: 0 3px 0 rgba(161,188,199,.64), 0 7px 14px rgba(43,89,110,.055), inset 0 1px 0 #fff !important;
}
html body #root .duduq-engine-stage .duduq-ws-instruction::before {
  content: "" !important;
  width: 48px !important;
  height: 48px !important;
  display: block !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  color: transparent !important;
  font-size: 0 !important;
}
html body #root .duduq-engine-stage .duduq-ws-instruction h2 {
  margin: 0 !important;
  min-width: 0 !important;
  color: #075AB8 !important;
  font-family: Fredoka, Nunito, ui-rounded, system-ui, sans-serif !important;
  font-size: clamp(18px, 2.15vw, 27px) !important;
  font-weight: 800 !important;
  line-height: 1.16 !important;
  text-align: center !important;
  overflow-wrap: anywhere !important;
}
html body #root .duduq-engine-stage .duduq-ws-audio-shell {
  position: relative !important;
  width: 44px !important;
  height: 44px !important;
  display: grid !important;
  place-items: center !important;
  isolation: isolate !important;
}
html body #root .duduq-engine-stage .duduq-ws-audio {
  position: relative !important;
  z-index: 2 !important;
  width: 44px !important;
  height: 44px !important;
  min-width: 44px !important;
  min-height: 44px !important;
  display: grid !important;
  place-items: center !important;
  padding: 0 !important;
  border: 2px solid #064A92 !important;
  border-radius: 999px !important;
  background: linear-gradient(180deg, #218BEA, #0B70D5 70%, #0864BF) !important;
  color: #fff !important;
  box-shadow: 0 4px 0 #064A92, 0 8px 15px rgba(9,103,201,.18), inset 0 2px 0 rgba(255,255,255,.42) !important;
  font-size: 0 !important;
  line-height: 0 !important;
  overflow: visible !important;
  transition: transform 140ms ease, filter 140ms ease, background 180ms ease, border-color 180ms ease, box-shadow 180ms ease, color 180ms ease !important;
}
html body #root .duduq-engine-stage .duduq-ws-audio::before {
  content: "" !important;
  position: absolute !important;
  left: 50% !important;
  top: 50% !important;
  width: 23px !important;
  height: 23px !important;
  margin: 0 !important;
  transform: translate(-50%, -50%) !important;
  background: currentColor !important;
  -webkit-mask: center / 23px 23px no-repeat url("${speakerMask}") !important;
  mask: center / 23px 23px no-repeat url("${speakerMask}") !important;
  pointer-events: none !important;
  z-index: 2 !important;
}
html body #root .duduq-engine-stage .duduq-ws-audio[data-playing="true"],
html body #root .duduq-engine-stage .duduq-ws-audio.duduq-audio-standard[data-duduq-audio-playing="true"] {
  border-color: #359500 !important;
  background: linear-gradient(180deg, #70E90E 0%, #58CC02 62%, #49B900 100%) !important;
  color: #1B5E20 !important;
  box-shadow: 0 5px 0 #2F8A00, 0 10px 20px rgba(57,156,0,.22), inset 0 2px 0 rgba(255,255,255,.38) !important;
  filter: none !important;
  transform: translateY(-1px) !important;
}
html body #root .duduq-engine-stage .duduq-ws-audio:hover:not(:disabled) {
  filter: brightness(1.05) !important;
}
html body #root .duduq-engine-stage .duduq-ws-audio:active:not(:disabled) {
  transform: translateY(4px) !important;
  box-shadow: 0 1px 0 #064A92, 0 3px 7px rgba(9,103,201,.13) !important;
}
html body #root .duduq-engine-stage .duduq-ws-audio:focus-visible {
  outline: 4px solid #111827 !important;
  outline-offset: 4px !important;
}
html body #root .duduq-engine-stage .duduq-ws-dashboard {
  min-height: 36px !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 10px !important;
  row-gap: 10px !important;
}
html body #root .duduq-engine-stage .duduq-ws-stat {
  min-height: 36px !important;
  height: 36px !important;
  padding: 0 13px !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  border: 2px solid #B7C9DC !important;
  border-radius: 999px !important;
  background: rgba(255,255,255,.97) !important;
  color: #16375B !important;
  box-shadow: 0 3px 0 #B8C5D6, 0 6px 12px rgba(43,89,110,.05), inset 0 1px 0 #fff !important;
  font-size: 14px !important;
  font-weight: 900 !important;
  line-height: 1 !important;
}
html body #root .duduq-engine-stage .duduq-ws-stat strong {
  color: #075AB8 !important;
  font-size: 17px !important;
  line-height: 1 !important;
}
html body #root .duduq-engine-stage .duduq-ws-arena {
  width: calc(100% - 16px) !important;
  min-height: clamp(292px, 40vh, 350px) !important;
  height: clamp(292px, 40vh, 350px) !important;
  max-height: 350px !important;
  margin: 0 auto !important;
  border: 2px solid rgba(176,205,224,.78) !important;
  border-radius: 28px !important;
  background:
    radial-gradient(circle at 18% 14%, rgba(255,255,255,.92) 0 3%, rgba(255,255,255,.28) 19%, transparent 38%),
    radial-gradient(circle at 82% 76%, rgba(177,230,242,.18) 0 13%, transparent 36%),
    linear-gradient(145deg, rgba(255,255,255,.82) 0%, rgba(245,251,255,.72) 38%, rgba(227,244,250,.58) 100%) !important;
  box-shadow: 0 3px 0 rgba(166,192,201,.62), 0 10px 24px rgba(44,89,109,.055), inset 0 1px 0 rgba(255,255,255,.98), inset 0 -1px 0 rgba(168,202,221,.30) !important;
  backdrop-filter: blur(10px) saturate(1.08);
  -webkit-backdrop-filter: blur(10px) saturate(1.08);
  overflow: hidden !important;
}
html body #root .duduq-engine-stage .duduq-ws-background-layer {
  background:
    linear-gradient(112deg, transparent 0 18%, rgba(255,255,255,.28) 22%, transparent 31%),
    radial-gradient(circle at 20% 24%, rgba(255,255,255,.42) 0 1px, transparent 2px),
    radial-gradient(circle at 72% 68%, rgba(149,205,224,.14) 0 1px, transparent 2px) !important;
  background-size: 100% 100%, 30px 30px, 36px 36px !important;
  opacity: .72 !important;
}
html body #root .duduq-engine-stage .duduq-ws-status { margin-top: 0 !important; }
@media (max-width: 720px) {
  html body #root .duduq-engine-stage .duduq-ws-surface {
    padding: 0 6px 12px !important;
    gap: 10px !important;
    row-gap: 10px !important;
  }
  html body #root .duduq-engine-stage .duduq-ws-instruction {
    width: calc(100% - 12px) !important;
    min-height: 62px !important;
    grid-template-columns: 38px minmax(0,1fr) 44px !important;
    gap: 7px !important;
    padding: 7px 9px 10px !important;
  }
  html body #root .duduq-engine-stage .duduq-ws-instruction::before {
    width: 38px !important;
    height: 38px !important;
  }
  html body #root .duduq-engine-stage .duduq-ws-instruction h2 {
    font-size: clamp(17px, 5vw, 22px) !important;
  }
  html body #root .duduq-engine-stage .duduq-ws-stat {
    min-height: 34px !important;
    height: 34px !important;
    padding: 0 11px !important;
  }
  html body #root .duduq-engine-stage .duduq-ws-arena {
    width: calc(100% - 8px) !important;
    min-height: clamp(280px, 43vh, 330px) !important;
    height: clamp(280px, 43vh, 330px) !important;
    max-height: 330px !important;
    border-radius: 24px !important;
  }
}
</style>
`;
    return html.replace(marker, css + "\n" + marker);
  }

  function stampYear(html, year) {
    if (year == null) return html;
    return html.replace(/<html([^>]*)>/i, function (_, attrs) {
      return `<html${attrs} data-duduq-ano="${String(year)}" data-duduq-ano-ativo="${String(year)}">`;
    });
  }

  function syncGlobalChrome(doc, context, title) {
    if (!doc?.documentElement) return;
    if (context?.year != null) {
      doc.documentElement.setAttribute("data-duduq-ano-ativo", String(context.year));
      doc.documentElement.setAttribute("data-duduq-ano", String(context.year));
    }
    const heading = doc.querySelector(".duduq-engine-heading h1");
    if (heading && heading.textContent !== title) heading.textContent = title;
    const stepIndex = Number.isFinite(context?.stepIndex) ? context.stepIndex : 0;
    const totalSteps = Number.isFinite(context?.totalSteps) ? Math.max(1, context.totalSteps) : 1;
    const current = Math.min(stepIndex + 1, totalSteps);
    const label = `Etapa ${current} de ${totalSteps}`;
    const strong = doc.querySelector(".duduq-progress-copy strong");
    if (strong && strong.textContent !== label) strong.textContent = label;
  }

  function installChromeSync(doc, context, title) {
    syncGlobalChrome(doc, context, title);
    const observer = new MutationObserver(() => syncGlobalChrome(doc, context, title));
    if (doc.body) observer.observe(doc.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }

  function validate(payload) {
    const questions = extractQuestions(payload);
    if (!questions.length) return false;
    try {
      questions.map(normalizeQuestion).forEach(normalizeWordSlashConfig);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  function mount({ container, payload, context = {}, onComplete }) {
    if (!container) throw new Error("[DuduQ Word Slash] Container não informado.");
    const questions = extractQuestions(payload).map(normalizeQuestion);
    if (!questions.length) throw new Error("[DuduQ Word Slash] Nenhuma questão recebida.");
    questions.forEach(normalizeWordSlashConfig);
    container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "duduq-mechanic-frame";
    Object.assign(wrapper.style, { width: "100%", height: "100%", minHeight: "0", overflow: "hidden", position: "relative" });
    const iframe = document.createElement("iframe");
    iframe.title = "DuduQ — Word Slash";
    iframe.setAttribute("allow", "autoplay; fullscreen");
    iframe.setAttribute("allowfullscreen", "");
    Object.assign(iframe.style, { width: "100%", height: "100%", minHeight: "0", border: "0", display: "block", background: "transparent" });
    wrapper.appendChild(iframe);
    container.appendChild(wrapper);
    let destroyed = false;
    let completed = false;
    let stopChromeSync = null;
    const title = asString(payload?.title || questions[0]?.metadata?.screenTitle || questions[0]?.metadata?.title, "Word Slash");

    function finish() {
      if (destroyed || completed) return;
      completed = true;
      if (typeof onComplete === "function") onComplete({ type: "complete", completed: true, mechanic: MECHANIC_ID });
    }

    function handleMessage(event) {
      if (event.source !== iframe.contentWindow || event.data?.type !== "DUDUQ_WORD_SLASH_COMPLETE") return;
      finish();
    }

    window.addEventListener("message", handleMessage);
    iframe.addEventListener("load", function () {
      if (destroyed) return;
      try { stopChromeSync = installChromeSync(iframe.contentDocument, context, title); }
      catch (error) { console.warn("[DuduQ Word Slash] Chrome global não pôde ser sincronizado.", error); }
    });

    const runtimeUrl = getEngineBase() + RUNTIME_PATH + "DUDUQ_WORD_SLASH.html?engineAdapter=" + encodeURIComponent(VERSION);
    fetch(runtimeUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status} ao carregar Word Slash.`);
        return response.text();
      })
      .then((html) => {
        if (destroyed) return;
        const runtime = buildRuntimeConfig(payload, questions, context);
        let prepared = replaceActivityConfig(html, runtime.config);
        prepared = installAssets(prepared, runtime.assets);
        prepared = installCompletionBridge(prepared);
        prepared = installShellParity(prepared);
        prepared = stampYear(prepared, context.year ?? questions[0]?.year);
        iframe.srcdoc = prepared;
      })
      .catch((error) => {
        console.error("[DuduQ Word Slash] Falha ao preparar runtime:", error);
        if (!destroyed) container.textContent = "Erro ao preparar a atividade Word Slash.";
      });

    return function destroy() {
      destroyed = true;
      stopChromeSync?.();
      window.removeEventListener("message", handleMessage);
      try { iframe.src = "about:blank"; } catch (_) {}
      iframe.remove();
      wrapper.remove();
    };
  }

  window.DuduQ.registerMechanic({
    id: MECHANIC_ID,
    version: VERSION,
    validate,
    mount,
    metadata: {
      name: "Word Slash",
      category: "reconhecimento-rapido",
      active: true,
      acceptsSchema: "1.0.0",
      globalProgress: true,
      literacyFriendly: true,
      supportsMedia: ["text", "image", "color", "audio-target"],
      gradeRange: { minimum: 1, maximum: 5 },
      routerProfile: {
        name: "Word Slash",
        active: true,
        baseScore: 84,
        answerTypes: ["single", "multiple"],
        answerTypeWeights: { single: 34, multiple: 32 },
        minAlternatives: 2,
        maxAlternatives: 10,
        supports: {
          questionImage: false,
          optionImageUrl: true,
          optionImageAssetKey: true,
          questionAudio: true,
          optionAudio: false
        },
        metadata: {
          category: "reconhecimento-rapido",
          earlyLiteracy: true,
          speedBased: true,
          supportsCategories: true,
          shellReference: "target-shooter-1.0.21",
          shellParity: "typography-audio-playing-1.0.7"
        },
        tags: ["word", "image", "category", "listening", "speed"]
      }
    }
  });
})();
