/* =========================================================
   DUDUQ CORE — ASSETS
   Candidate 1.0.11 — canonical Assets-DuduQ catalog consumer
   ========================================================= */
(function () {
  "use strict";

  const VERSION = "1.7.0-canonical-catalog-candidate";
  const CANONICAL_RUNTIME_COMMIT = "f0f8bed8e8c24fad4eae204bf4a5cc84a8d8263f";
  if (window.DuduQAssets?.version === VERSION) return;

  const LEGACY_LOCAL_BASE = "/assets-duduq-local-v1/";
  const BASE = "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/";
  const IMAGE_BASE = BASE + "Imagens%20Ilustrativa/";
  const SOUND_BASE = BASE + "Efeitos%20sonoros/";
  const TEMPLATE_BASE = BASE + "Templates/";
  const AUDIO_ROOT = BASE + "Audios/";
  const CATALOG = window.DUDUQ_CANONICAL_ASSET_CATALOG;

  if (!CATALOG || Number(CATALOG.schemaVersion) !== 2) {
    throw new Error("DuduQ canonical asset catalog schema 2 must load before duduq-assets.js.");
  }
  if (Number(CATALOG.stats?.unresolvedCollisions || 0) || Number(CATALOG.stats?.warnings || 0) || Number(CATALOG.stats?.errors || 0)) {
    throw new Error("DuduQ canonical asset catalog integrity counters are not clean.");
  }

  function normalizeSemanticAssetName(value) {
    let normalized = String(value == null ? "" : value).trim();
    try { normalized = decodeURIComponent(normalized); } catch (_) {}
    normalized = normalized.split(/[?#]/)[0];
    normalized = normalized.slice(normalized.lastIndexOf("/") + 1);
    normalized = normalized.replace(/\.[a-z0-9]{2,5}$/i, "");
    return normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/&/g, " e ").replace(/[_-]+/g, " ").replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ").trim();
  }

  function resolveImageDetails(value) {
    const query = normalizeSemanticAssetName(value);
    if (!query) return null;
    const aliasId = CATALOG.aliases?.[query];
    const exactId = CATALOG.byKey?.[query];
    const id = String(aliasId || exactId || "");
    if (!id) return null;
    const asset = CATALOG.assets?.[id];
    if (!asset) return null;
    return Object.freeze({
      key: String(asset.key || query),
      file: String(asset.file || id.split("/").pop() || ""),
      id,
      url: String(asset.rawUrl || ""),
      query,
      strategy: aliasId ? "canonical-alias" : "canonical-key",
      catalogSchema: 2,
      catalogRuntimeCommit: CANONICAL_RUNTIME_COMMIT
    });
  }

  function resolveImage(value) {
    return resolveImageDetails(value)?.url || null;
  }

  const IMAGE_FILES = new Set([
    "Boy.png","Bye.png","DUDUQ_ACERTO.png","DUDUQ_ERRO.png","DUDUQ_IDLE.png",
    "Duduq_Li%C3%A7%C3%A3o%20concluida.png","Fish_Girl.png","Girl.png",
    "Good%20Afternoon.png","Good%20Morning.png","Good%20Night.png","Hello.png",
    "LOGO%20DA%20EMPRESA_COLORIDO.png","LOGO%20DUDUQ.png","Logo%20EduQ%20Play.png",
    "My%20name.png","Rain.png","nervous.png","wheelchair_boy.png"
  ]);
  const SOUND_FILES = new Set([
    "Ops_feedback_erro.mp3","bubble-pop.mp3","click.mp3","correct.mp3","ding.mp3","error.mp3",
    "feedback_correto.mp3","happy-fun-EduQ_Play.mp3","pop.mp3","swoosh-sound-effect--transitions.mp3",
    "swoosh.mp3","you%20win.mp3"
  ]);
  const TEMPLATE_FILES = new Set([
    "1%C2%BA%20ano%20-whispering-woods.png","2%C2%BA%20ano%20-chroma-canyons.png",
    "3%C2%BA%20ano%20-clockwork-valley.png","4%C2%BA%20ano%20-papercraft-campus.png",
    "5%C2%BA%20ano%20-sky-lab.png"
  ]);

  function audioFolderFromFile(fileName) {
    const match = String(fileName || "").match(/^ING_(\d+)ANO_M(\d+)_/i);
    if (!match) return "";
    return String(Number(match[1])) + "_ANO/M" + String(Number(match[2])).padStart(2, "0") + "/";
  }

  function rewriteLegacyAssetUrl(value) {
    if (typeof value !== "string") return value;
    let relative = "";
    if (value.startsWith(BASE)) relative = value.slice(BASE.length);
    else if (value.startsWith(LEGACY_LOCAL_BASE)) relative = value.slice(LEGACY_LOCAL_BASE.length);
    else return value;

    if (relative.startsWith("Imagens%20Ilustrativa/")) {
      const smart = resolveImage(relative.slice("Imagens%20Ilustrativa/".length));
      return smart || BASE + relative;
    }
    if (relative.startsWith("Efeitos%20sonoros/") || relative.startsWith("Templates/") || relative.startsWith("Audios/")) {
      if (relative.startsWith("Audios/") && relative.split("/").length === 2) {
        const file = relative.slice("Audios/".length);
        const folder = audioFolderFromFile(file);
        if (folder) return AUDIO_ROOT + folder + file;
      }
      return BASE + relative;
    }
    const file = String(relative || "").replace(/ /g, "%20");
    if (IMAGE_FILES.has(file)) return IMAGE_BASE + file;
    if (SOUND_FILES.has(file)) return SOUND_BASE + file;
    if (TEMPLATE_FILES.has(file)) return TEMPLATE_BASE + file;
    return BASE + relative;
  }

  function rewriteText(text) {
    if (typeof text !== "string") return text;
    return text
      .replace(/https:\/\/raw\.githubusercontent\.com\/augustoborgessousa93\/Assets-DuduQ\/main\/[^\s"'<>\\)]+/g, rewriteLegacyAssetUrl)
      .replace(/\/assets-duduq-local-v1\/[^\s"'<>\\)]+/g, rewriteLegacyAssetUrl);
  }

  function normalizeYear(value) {
    return String(value == null ? "" : value).match(/[1-5]/)?.[0] || "";
  }
  function moduleAudioBase(year, module) {
    const y = normalizeYear(year);
    const m = String(Number(module) || 1).padStart(2, "0");
    return y ? AUDIO_ROOT + y + "_ANO/M" + m + "/" : AUDIO_ROOT;
  }

  const ASSETS = Object.freeze({
    version: VERSION,
    repository: "augustoborgessousa93/Assets-DuduQ",
    canonicalCatalog: Object.freeze({
      schemaVersion: 2,
      runtimeCommit: CANONICAL_RUNTIME_COMMIT,
      images: Number(CATALOG.stats?.images || 0),
      aliases: Number(CATALOG.stats?.aliases || 0)
    }),
    paths: Object.freeze({ base: BASE, images: IMAGE_BASE, sounds: SOUND_BASE, templates: TEMPLATE_BASE, audios: AUDIO_ROOT }),
    branding: Object.freeze({
      companyLogo: IMAGE_BASE + "LOGO%20DA%20EMPRESA_COLORIDO.png",
      duduqLogo: IMAGE_BASE + "LOGO%20DUDUQ.png",
      eduqPlayLogo: IMAGE_BASE + "Logo%20EduQ%20Play.png"
    }),
    mascots: Object.freeze({
      idle: IMAGE_BASE + "DUDUQ_IDLE.png", correct: IMAGE_BASE + "DUDUQ_ACERTO.png",
      error: IMAGE_BASE + "DUDUQ_ERRO.png", transition: IMAGE_BASE + "DUDUQ_IDLE.png",
      complete: IMAGE_BASE + "Duduq_Li%C3%A7%C3%A3o%20concluida.png"
    }),
    sounds: Object.freeze({
      "bubble-pop": SOUND_BASE + "bubble-pop.mp3", click: SOUND_BASE + "click.mp3", pop: SOUND_BASE + "pop.mp3",
      correct: SOUND_BASE + "correct.mp3", ding: SOUND_BASE + "ding.mp3", error: SOUND_BASE + "error.mp3",
      "feedback-correct-voice": SOUND_BASE + "feedback_correto.mp3", "feedback-error-voice": SOUND_BASE + "Ops_feedback_erro.mp3",
      "intro-company-swoosh": SOUND_BASE + "swoosh.mp3", "intro-mission-music": SOUND_BASE + "happy-fun-EduQ_Play.mp3",
      "transition-swoosh": SOUND_BASE + "swoosh-sound-effect--transitions.mp3", win: SOUND_BASE + "you%20win.mp3"
    }),
    backgrounds: Object.freeze({
      "1": TEMPLATE_BASE + "1%C2%BA%20ano%20-whispering-woods.png",
      "2": TEMPLATE_BASE + "2%C2%BA%20ano%20-chroma-canyons.png",
      "3": TEMPLATE_BASE + "3%C2%BA%20ano%20-clockwork-valley.png",
      "4": TEMPLATE_BASE + "4%C2%BA%20ano%20-papercraft-campus.png",
      "5": TEMPLATE_BASE + "5%C2%BA%20ano%20-sky-lab.png"
    }),
    content: Object.freeze({ english: Object.freeze({}) })
  });

  function applyYear(value) {
    const year = normalizeYear(value);
    if (!year || !ASSETS.backgrounds[year] || !document.body) return false;
    const url = ASSETS.backgrounds[year];
    document.documentElement.setAttribute("data-duduq-ano-ativo", year);
    document.documentElement.style.setProperty("--duduq-world-image", 'url("' + url + '")');
    document.documentElement.style.backgroundColor = "#1b4866";
    Object.assign(document.body.style, {
      backgroundImage: 'url("' + url + '")', backgroundPosition: "center center", backgroundSize: "cover",
      backgroundRepeat: "no-repeat", backgroundAttachment: "fixed", minHeight: "100dvh", width: "100%"
    });
    return true;
  }

  function cloneAndRewrite(value, seen) {
    if (typeof value === "string") return rewriteLegacyAssetUrl(value);
    if (value === null || typeof value !== "object") return value;
    const cache = seen || new WeakMap();
    if (cache.has(value)) return cache.get(value);
    if (Array.isArray(value)) {
      const result = []; cache.set(value, result);
      value.forEach((item) => result.push(cloneAndRewrite(item, cache)));
      return result;
    }
    const result = {}; cache.set(value, result);
    Object.keys(value).forEach((key) => { result[key] = cloneAndRewrite(value[key], cache); });
    return result;
  }

  function inferActivityTopic(activity, moduleDefinition) {
    const explicit = String(activity?.topic || "").trim();
    if (explicit) return explicit.toUpperCase();
    const current = String(activity?.title || "").trim();
    if (current) return current;
    return String(moduleDefinition?.title || "ENGLISH").trim().toUpperCase();
  }

  function normalizeModule(moduleDefinition) {
    if (!moduleDefinition || typeof moduleDefinition !== "object") return moduleDefinition;
    const normalized = cloneAndRewrite(moduleDefinition);
    if (normalized.audioPolicy && typeof normalized.audioPolicy === "object") {
      normalized.audioPolicy.base = moduleAudioBase(normalized.year, normalized.module);
    }
    if (normalized.intro && typeof normalized.intro === "object") {
      normalized.intro.companyLogo = ASSETS.branding.companyLogo;
      if (!normalized.intro.collectionLogo || normalized.intro.collectionLogo.includes("Logo%20EduQ%20Play.png")) {
        normalized.intro.collectionLogo = ASSETS.branding.eduqPlayLogo;
      }
    }
    return Object.freeze(normalized);
  }

  function normalizeLoadedContent() {
    const content = window.DUDUQ_CONTENT;
    if (!content || typeof content !== "object") return false;
    let changed = false;
    Object.values(content).forEach((subject) => {
      if (!subject || typeof subject !== "object") return;
      Object.values(subject).forEach((yearObject) => {
        if (!yearObject || typeof yearObject !== "object") return;
        Object.keys(yearObject).forEach((moduleKey) => {
          const current = yearObject[moduleKey];
          if (!current || typeof current !== "object") return;
          yearObject[moduleKey] = normalizeModule(current); changed = true;
        });
      });
    });
    return changed;
  }

  const RUNTIME_PATTERN = /(?:^|\/)DUDUQ_(?:BUBBLE_POP|DRAG_DROP|MATCHING|MEMORY_QUEST|SMART_SENTENCE|TARGET_SHOOTER|WORD_SLASH)\.html(?:[?#]|$)/i;
  function installRuntimeFetchBridge() {
    if (typeof window.fetch !== "function" || window.fetch.__duduqAssetPathBridge) return false;
    const nativeFetch = window.fetch.bind(window);
    const bridgedFetch = function (input, init) {
      const url = typeof input === "string" ? input : String(input?.url || "");
      const request = nativeFetch(input, init);
      if (!RUNTIME_PATTERN.test(url)) return request;
      return request.then((response) => response && response.ok ? response.text().then((html) => {
        const headers = new Headers(response.headers); headers.delete("content-length"); headers.delete("content-encoding");
        return new Response(rewriteText(html), { status: response.status, statusText: response.statusText, headers });
      }) : response);
    };
    Object.defineProperty(bridgedFetch, "__duduqAssetPathBridge", { value: true });
    window.fetch = bridgedFetch;
    return true;
  }

  window.DUDUQ_ASSETS = ASSETS;
  window.DuduQAssets = Object.freeze({
    version: VERSION, assets: ASSETS, canonicalCatalog: ASSETS.canonicalCatalog,
    setYear: applyYear, getYear: () => document.documentElement.getAttribute("data-duduq-ano-ativo") || null,
    get: (type, name) => ASSETS[type]?.[name] || null, getSound: (name) => ASSETS.sounds[name] || null,
    getContent: () => null, resolveImage, resolveImageDetails, normalizeImageName: normalizeSemanticAssetName,
    inferActivityTopic, rewriteUrl: rewriteLegacyAssetUrl, rewriteText, normalizeContent: normalizeLoadedContent,
    getAudioBase: moduleAudioBase
  });

  installRuntimeFetchBridge();
  const params = new URLSearchParams(window.location.search);
  const requestedYear = params.get("ano") || params.get("year") || params.get("serie") || params.get("série") ||
    document.documentElement.getAttribute("data-duduq-ano") || window.DUDUQ_ANO;
  if (requestedYear) applyYear(requestedYear);
  window.addEventListener("DOMContentLoaded", normalizeLoadedContent);
  window.addEventListener("load", normalizeLoadedContent);
  try { window.dispatchEvent(new CustomEvent("duduq:assets-ready", { detail: { version: VERSION, catalogRuntimeCommit: CANONICAL_RUNTIME_COMMIT } })); } catch (_) {}
})();
