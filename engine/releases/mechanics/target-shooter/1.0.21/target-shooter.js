/* =========================================================
   DUDUQ MECHANIC — TARGET SHOOTER
   Candidate Release 1.0.21
   Runtime preservado: Target Shooter 2.0.2

   AJUSTE 1.0.21
   - upgrade exclusivamente visual do cenário da arena;
   - céu, nuvens, horizonte e grama mais ricos e discretos;
   - microanimações ambientais leves e respeitando reduced motion;
   - lógica, interação, física, hit areas, alvos, pontuação e progressão intactos.
   ========================================================= */

(function () {
  "use strict";

  if (!window.DuduQ) {
    console.error("[DuduQ Target Shooter] duduq-host.js precisa ser carregado antes.");
    return;
  }

  const MECHANIC_ID = "target-shooter";
  const VERSION = "1.0.21";
  const RUNTIME_VERSION = "2.0.2";
  const RELEASE_PATH = "/engine/releases/mechanics/target-shooter/1.0.21/";

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function asString(value, fallback = "") {
    if (value === null || value === undefined) return fallback;
    const text = String(value).trim();
    return text || fallback;
  }

  function getEngineBase() {
    if (window.DUDUQ_ENGINE_BASE) return String(window.DUDUQ_ENGINE_BASE).replace(/\/$/, "");
    return ".";
  }

  function liveRandom() {
    try {
      if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
        const buffer = new Uint32Array(1);
        globalThis.crypto.getRandomValues(buffer);
        return buffer[0] / 4294967296;
      }
    } catch (_) {}
    return Math.random();
  }

  function shuffle(values) {
    const out = [...values];
    for (let index = out.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(liveRandom() * (index + 1));
      [out[index], out[swapIndex]] = [out[swapIndex], out[index]];
    }
    return out;
  }

  function presentationStore() {
    const candidates = [];
    try {
      if (window.parent && window.parent !== window) candidates.push(window.parent);
    } catch (_) {}
    candidates.push(window);

    for (const host of candidates) {
      try {
        if (!host.__DUDUQ_PRESENTATION_ORDERS_V2__) {
          Object.defineProperty(host, "__DUDUQ_PRESENTATION_ORDERS_V2__", {
            value: Object.create(null),
            configurable: true
          });
        }
        return host.__DUDUQ_PRESENTATION_ORDERS_V2__;
      } catch (_) {}
    }
    return null;
  }

  function readPreviousOrder(key, ids) {
    const shared = presentationStore();
    try {
      const stored = shared?.[key];
      if (
        Array.isArray(stored) &&
        stored.length === ids.length &&
        [...stored].sort().join("\u0001") === [...ids].sort().join("\u0001")
      ) return [...stored];
    } catch (_) {}

    const storages = [];
    try { storages.push(localStorage); } catch (_) {}
    try { storages.push(sessionStorage); } catch (_) {}

    for (const storage of storages) {
      try {
        const raw = storage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (
          Array.isArray(parsed) &&
          parsed.length === ids.length &&
          [...parsed].sort().join("\u0001") === [...ids].sort().join("\u0001")
        ) return parsed;
      } catch (_) {}
    }
    return null;
  }

  function writeOrder(key, order) {
    const shared = presentationStore();
    try { if (shared) shared[key] = [...order]; } catch (_) {}
    try { localStorage.setItem(key, JSON.stringify(order)); } catch (_) {}
    try { sessionStorage.setItem(key, JSON.stringify(order)); } catch (_) {}
  }

  function antiRepeatIds(ids, key) {
    const source = [...ids];
    if (source.length < 2) return source;

    const storageKey = "duduq:presentation:v3:target-shooter:" + key;
    const previous = readPreviousOrder(storageKey, source) || source;
    const score = (candidate) => candidate.reduce(
      (total, value, index) => total + (value !== previous[index] ? 1 : 0),
      0
    );

    let best = source;
    let bestScore = -1;
    for (let attempt = 0; attempt < 32; attempt += 1) {
      const candidate = shuffle(source);
      const candidateScore = score(candidate);
      if (candidateScore > bestScore) {
        best = candidate;
        bestScore = candidateScore;
      }
      if (candidateScore === source.length) break;
    }

    if (bestScore < source.length) {
      const shift = 1 + Math.floor(liveRandom() * (source.length - 1));
      best = previous.map((_, index) => previous[(index + shift) % previous.length]);
    }

    writeOrder(storageKey, best);
    return best;
  }

  function reorderItems(items, ids) {
    const map = new Map(items.map((item) => [item.id, item]));
    return ids.map((id) => map.get(id)).filter(Boolean);
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

  function normalizeTargetConfig(question) {
    const config = question?.metadata?.targetShooter;
    if (!isObject(config)) {
      throw new Error(`[DuduQ Target Shooter] Questão ${question?.id || "sem-id"} não possui metadata.targetShooter.`);
    }
    if (!Array.isArray(config.items) || config.items.length < 2) {
      throw new Error(`[DuduQ Target Shooter] Questão ${question.id}: informe ao menos dois alvos.`);
    }
    const correctIds = Array.isArray(config.correctIds) ? config.correctIds : [];
    if (!correctIds.length) {
      throw new Error(`[DuduQ Target Shooter] Questão ${question.id}: correctIds é obrigatório.`);
    }
    return config;
  }

  function stageFromQuestion(question, index) {
    const config = normalizeTargetConfig(question);
    const itemIds = config.items.map((item) => item.id);
    const order = antiRepeatIds(itemIds, `${question.id || `stage-${index + 1}`}::items`);
    const items = reorderItems(config.items, order);

    return {
      id: asString(question.id, `target-stage-${index + 1}`),
      title: asString(
        question.metadata?.screenTitle || question.metadata?.title || question.statement,
        "Listen & Choose"
      ),
      instruction: asString(question.instruction, "Ouça e acerte a cena correta."),
      audioText: asString(config.audioText || question?.media?.audio?.text || question?.audio?.text),
      mode: asString(config.mode, "audio-to-image"),
      shape: asString(config.shape, "balloon"),
      rule: { type: "ids", values: config.correctIds },
      difficulty: {
        speed: Number(config.difficulty?.speed) || .48,
        objectCount: Number(config.difficulty?.objectCount) || config.items.length,
        spawnIntervalMs: Number(config.difficulty?.spawnIntervalMs) || 170,
        requiredCorrect: config.difficulty?.requiredCorrect ?? 1,
        targetSize: Number(config.difficulty?.targetSize) || 150,
        timeLimitMs: 0,
        timerMode: "none",
        ...(config.difficulty || {}),
        timeLimitMs: 0,
        timerMode: "none"
      },
      items,
      feedback: {
        success: asString(question.feedback?.correct, "Muito bem!"),
        retry: asString(question.feedback?.incorrect, "Ouça novamente e observe as imagens.")
      }
    };
  }

  function buildRuntimeConfig(payload, questions) {
    return {
      schemaVersion: 1,
      mechanic: "target-shooter",
      version: RUNTIME_VERSION,
      title: asString(payload?.title, "Listen & Choose"),
      interfaceLocale: "pt-BR",
      learningLanguage: "en-US",
      sounds: { launch: null, hit: null, miss: null, complete: null },
      stages: questions.map(stageFromQuestion)
    };
  }

  function replaceConfig(html, config) {
    const startTag = '<script id="targetShooterConfig" type="application/json">';
    const start = html.indexOf(startTag);
    if (start < 0) throw new Error("[DuduQ Target Shooter] JSON de configuração não encontrado.");

    const contentStart = start + startTag.length;
    const end = html.indexOf("</script>", contentStart);
    if (end < 0) throw new Error("[DuduQ Target Shooter] Fechamento do JSON não encontrado.");

    const json = JSON.stringify(config).replace(/</g, "\\u003c");
    return html.slice(0, contentStart) + json + html.slice(end);
  }

  function installCompletionBridge(html) {
    const pattern = /autoPlayInstruction:true,gamificationPolicy:/;
    if (!pattern.test(html)) {
      throw new Error("[DuduQ Target Shooter] Ponto de integração do Lesson Host não encontrado.");
    }
    return html.replace(
      pattern,
      [
        "autoPlayInstruction:true,",
        "hostedByDuduQ:true,",
        "onLessonComplete:()=>window.parent.postMessage({",
        'type:"DUDUQ_TARGET_SHOOTER_COMPLETE"',
        '},"*"),',
        "gamificationPolicy:"
      ].join("")
    );
  }

  function installVisualEnvironment(html) {
    const marker = "</head>";
    if (!html.includes(marker)) {
      throw new Error("[DuduQ Target Shooter] Cabeçalho do runtime não encontrado para aplicar o cenário visual.");
    }

    const css = `
<style id="duduq-target-shooter-1-0-21-environment">
/* Candidate 1.0.21 — cenário visual apenas. Nenhum seletor funcional é alterado. */
.duduq-ts-arena {
  background:
    radial-gradient(circle at 13% 15%, rgba(255,255,230,.68) 0 3.5%, rgba(255,255,255,.18) 7%, transparent 14%),
    linear-gradient(180deg, #83d4ff 0%, #bdeaff 46%, #eaf8ff 72%, #eefdf1 100%) !important;
  box-shadow:
    0 7px 0 #abc6d9,
    0 20px 38px rgba(55,99,140,.12),
    inset 0 2px 0 rgba(255,255,255,.96),
    inset 0 -18px 38px rgba(63,158,82,.06) !important;
}

.duduq-ts-arena::before {
  z-index: 0 !important;
  inset: -3% -5% 24% -5% !important;
  border-radius: 0 !important;
  background:
    radial-gradient(ellipse at 12% 32%, rgba(255,255,255,.74) 0 6%, rgba(255,255,255,.48) 7% 10%, transparent 11%),
    radial-gradient(ellipse at 19% 27%, rgba(255,255,255,.64) 0 5%, transparent 6%),
    radial-gradient(ellipse at 76% 22%, rgba(255,255,255,.72) 0 6%, rgba(255,255,255,.45) 7% 11%, transparent 12%),
    radial-gradient(ellipse at 84% 28%, rgba(255,255,255,.60) 0 5%, transparent 6%),
    radial-gradient(ellipse at 53% 46%, rgba(255,255,255,.30) 0 4%, transparent 5%),
    linear-gradient(180deg, rgba(255,255,255,.09), rgba(255,255,255,0)) !important;
  opacity: .80 !important;
  transform: translate3d(0,0,0);
  animation: duduq-ts-environment-clouds 38s ease-in-out infinite alternate;
}

.duduq-ts-arena::after {
  z-index: 1 !important;
  left: -6% !important;
  right: -6% !important;
  bottom: -16% !important;
  height: 43% !important;
  border-radius: 48% 52% 0 0 / 18% 18% 0 0 !important;
  background:
    radial-gradient(ellipse at 12% 12%, rgba(255,238,112,.20) 0 1.2%, transparent 1.5%),
    radial-gradient(ellipse at 38% 24%, rgba(255,255,255,.13) 0 1.2%, transparent 1.5%),
    radial-gradient(ellipse at 70% 16%, rgba(255,238,112,.18) 0 1.1%, transparent 1.4%),
    repeating-linear-gradient(102deg, rgba(26,126,46,.10) 0 2px, transparent 2px 10px),
    linear-gradient(180deg, #b8ee8f 0%, #8ed86f 32%, #68c356 68%, #4ca845 100%) !important;
  background-size: 180px 120px, 220px 130px, 210px 130px, 26px 100%, 100% 100% !important;
  box-shadow:
    inset 0 10px 0 rgba(255,255,255,.26),
    inset 0 22px 24px rgba(255,255,255,.08),
    0 -8px 26px rgba(45,149,69,.08) !important;
  transform-origin: 50% 100%;
  animation: duduq-ts-environment-grass 6.8s ease-in-out infinite alternate;
}

.duduq-ts-ambient { z-index: 1 !important; opacity: .72; }
.duduq-ts-cloud {
  background: rgba(255,255,255,.68) !important;
  box-shadow: 0 10px 24px rgba(53,133,181,.07) !important;
  filter: blur(.15px) !important;
  opacity: .68 !important;
}
.duduq-ts-sparkle { opacity: .42 !important; }

@keyframes duduq-ts-environment-clouds {
  from { transform: translate3d(-.7%, 0, 0); }
  to { transform: translate3d(.7%, .25%, 0); }
}
@keyframes duduq-ts-environment-grass {
  from { transform: translate3d(0,0,0) scaleX(1.001); filter: saturate(.98); }
  to { transform: translate3d(.18%,0,0) scaleX(.999); filter: saturate(1.02); }
}

.duduq-ts-root[data-reduced-motion="true"] .duduq-ts-arena::before,
.duduq-ts-root[data-reduced-motion="true"] .duduq-ts-arena::after {
  animation: none !important;
  transform: none !important;
}

@media (max-width: 640px) {
  .duduq-ts-arena::before { opacity: .68 !important; }
  .duduq-ts-arena::after { height: 39% !important; bottom: -12% !important; }
}
</style>`;

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

    const trail = doc.querySelector(".duduq-progress-trail");
    if (trail) {
      const completedBefore = Math.max(0, Math.min(stepIndex, totalSteps));
      trail.style.setProperty("--lesson-progress", String(completedBefore / totalSteps));
      trail.setAttribute("aria-valuemax", String(totalSteps));
      trail.setAttribute("aria-valuenow", String(completedBefore));
      trail.setAttribute("aria-valuetext", `${completedBefore} de ${totalSteps} etapas concluídas`);
    }
  }

  function installChromeSync(doc, context, title) {
    syncGlobalChrome(doc, context, title);
    const observer = new MutationObserver(() => syncGlobalChrome(doc, context, title));
    if (doc.body) observer.observe(doc.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }

  function validate(payload) {
    const list = extractQuestions(payload);
    if (!list.length) return false;
    try {
      list.map(normalizeQuestion).forEach(normalizeTargetConfig);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  function mount({ container, payload, context = {}, onComplete }) {
    if (!container) throw new Error("[DuduQ Target Shooter] Container não informado.");

    const questions = extractQuestions(payload).map(normalizeQuestion);
    if (!questions.length) throw new Error("[DuduQ Target Shooter] Nenhuma questão recebida.");
    questions.forEach(normalizeTargetConfig);

    container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "duduq-mechanic-frame";
    wrapper.style.width = "100%";
    wrapper.style.height = "100%";
    wrapper.style.minHeight = "0";
    wrapper.style.overflow = "hidden";
    wrapper.style.position = "relative";

    const iframe = document.createElement("iframe");
    iframe.title = "DuduQ — Target Shooter";
    iframe.setAttribute("allow", "autoplay; fullscreen");
    iframe.setAttribute("allowfullscreen", "");
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.minHeight = "0";
    iframe.style.border = "0";
    iframe.style.display = "block";
    iframe.style.background = "transparent";

    wrapper.appendChild(iframe);
    container.appendChild(wrapper);

    let destroyed = false;
    let completed = false;
    let stopChromeSync = null;
    const title = asString(payload?.title, "Listen & Choose");

    function finish() {
      if (destroyed || completed) return;
      completed = true;
      if (typeof onComplete === "function") {
        onComplete({ type: "complete", completed: true, mechanic: MECHANIC_ID });
      }
    }

    function handleMessage(event) {
      if (event.source !== iframe.contentWindow || event.data?.type !== "DUDUQ_TARGET_SHOOTER_COMPLETE") return;
      finish();
    }

    window.addEventListener("message", handleMessage);
    iframe.addEventListener("load", function () {
      if (destroyed) return;
      try {
        stopChromeSync = installChromeSync(iframe.contentDocument, context, title);
      } catch (error) {
        console.warn("[DuduQ Target Shooter] Chrome global não pôde ser sincronizado.", error);
      }
    });

    const runtimeUrl = getEngineBase() + RELEASE_PATH + "DUDUQ_TARGET_SHOOTER.html?engineAdapter=" + encodeURIComponent(VERSION);

    fetch(runtimeUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status} ao carregar Target Shooter.`);
        return response.text();
      })
      .then((html) => {
        if (destroyed) return;
        const config = buildRuntimeConfig(payload, questions);
        let prepared = replaceConfig(html, config);
        prepared = installCompletionBridge(prepared);
        prepared = installVisualEnvironment(prepared);
        prepared = stampYear(prepared, context.year);
        iframe.srcdoc = prepared;
      })
      .catch((error) => {
        console.error("[DuduQ Target Shooter] Falha ao preparar runtime:", error);
        if (!destroyed) container.textContent = "Erro ao preparar a atividade Target Shooter.";
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
      name: "Target Shooter",
      category: "selecao-rapida-audiovisual",
      active: true,
      acceptsSchema: "1.0.0",
      globalProgress: true,
      literacyFriendly: true,
      routerProfile: {
        name: "Target Shooter",
        active: true,
        baseScore: 68,
        answerTypes: ["single"],
        answerTypeWeights: { single: 30 },
        minAlternatives: 2,
        maxAlternatives: 8,
        supports: {
          questionImage: true,
          optionImageUrl: true,
          optionImageAssetKey: true,
          questionAudio: true,
          optionAudio: false
        },
        metadata: {
          category: "selecao-rapida-audiovisual",
          earlyLiteracy: true,
          timerRequired: false
        }
      }
    }
  });

  console.info("[DuduQ] Target Shooter registrado:", VERSION);
})();
