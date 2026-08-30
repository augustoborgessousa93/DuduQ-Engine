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

  function normalizeAssetFileName(value) {
    return String(value || "")
      .replace(/ /g, "%20")
      .replace(/%C3%A7/gi, "%C3%A7")
      .replace(/%C3%A3/gi, "%C3%A3");
  }

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
    const file = normalizeAssetFileName(relative);
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
    content: Object.freeze({
      english: Object.freeze({
        year1: Object.freeze({
          module01: Object.freeze({
            greeting: IMAGE_BASE + "Hello.png", goodbye: IMAGE_BASE + "Bye.png",
            morning: IMAGE_BASE + "Good%20Morning.png", afternoon: IMAGE_BASE + "Good%20Afternoon.png",
            night: IMAGE_BASE + "Good%20Night.png", boy: IMAGE_BASE + "Boy.png", girl: IMAGE_BASE + "Girl.png",
            selfintro: IMAGE_BASE + "My%20name.png", rain: IMAGE_BASE + "Rain.png", nervous: IMAGE_BASE + "nervous.png",
            fishGirl: IMAGE_BASE + "Fish_Girl.png", wheelchairBoy: IMAGE_BASE + "wheelchair_boy.png"
          })
        }),
        year2: Object.freeze({
          module01: Object.freeze({
            greeting: IMAGE_BASE + "Hello.png", goodbye: IMAGE_BASE + "Bye.png",
            morning: IMAGE_BASE + "Good%20Morning.png", afternoon: IMAGE_BASE + "Good%20Afternoon.png",
            night: IMAGE_BASE + "Good%20Night.png", rain: IMAGE_BASE + "Rain.png", nervous: IMAGE_BASE + "nervous.png",
            fishGirl: IMAGE_BASE + "Fish_Girl.png", wheelchairBoy: IMAGE_BASE + "wheelchair_boy.png"
          })
        })
      })
    })
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

  function getContentAsset(subject, year, module, name) {
    const subjectKey = String(subject || "").trim().toLowerCase();
    const yearKey = "year" + String(year || "").replace(/\D/g, "");
    const moduleKey = "module" + String(module || "").replace(/\D/g, "").padStart(2, "0");
    return ASSETS.content?.[subjectKey]?.[yearKey]?.[moduleKey]?.[name] || null;
  }

  function cloneAndRewrite(value, seen) {
    if (typeof value === "string") return rewriteLegacyAssetUrl(value);
    if (value === null || typeof value !== "object") return value;
    if (value instanceof Date) return new Date(value.getTime());
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

  const GENERIC_ACTIVITY_TITLE = /^(?:ou[cç]a|listen|toque|escolha|relacione|encontre|coloque|organize|arraste|estoure|aponte|clique)\b/i;
  const TOPIC_RULES = Object.freeze([
    ["NUMBERS", /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|number|numbers|numeral|numerals|numero|numeros|quantidade|quantidades|\d+)\b/i],
    ["COLORS", /\b(?:color|colors|colour|colours|red|blue|yellow|green|orange|pink|purple|brown|black|white|cor|cores|vermelh\w*|azul|amarel\w*|verde|laranja|rosa|roxo|marrom|preto|branco)\b/i],
    ["SCHOOL OBJECTS", /\b(?:school objects?|pencils?|rulers?|crayons?|erasers?|backpacks?|pencil cases?|books?|notebooks?|pens?|lapis|regua|giz|borracha|mochila|estojo|livro|caderno|caneta|objetos? escolares?)\b/i],
    ["BODY PARTS", /\b(?:body|head|hands?|arms?|legs?|feet|foot|eyes?|ears?|nose|mouth|cabeca|maos?|bracos?|pernas?|pes?|olhos?|orelhas?|nariz|boca|partes? do corpo)\b/i],
    ["PETS", /\b(?:pets?|dog|cat|rabbit|turtle|fish|hamster|bird|cachorro|gato|coelho|tartaruga|peixe|passaro|animais? de estimacao)\b/i],
    ["SIZES", /\b(?:size|sizes|big|small|large|little|tamanho|tamanhos|grande|pequeno)\b/i],
    ["GREETINGS", /\b(?:greetings?|hello|hi|good morning|good afternoon|good evening|good night|goodbye|bye|see you|saudacao|saudacoes|cumprimento|cumprimentos|despedida)\b/i],
    ["INTRODUCTIONS", /\b(?:introductions?|my name|what is your name|how old|i am|i'm|nome|idade|apresentacao|apresentacoes)\b/i],
    ["CLASSROOM COMMANDS", /\b(?:classroom commands?|sit down|stand up|come in|quiet|touch|listen|repeat|open|close|comandos? de sala|sente|levante|entre|silencio|toque)\b/i],
    ["WEATHER", /\b(?:weather|sunny|rainy|windy|foggy|cloudy|stormy|snowy|hot|cold|clima|ensolarado|chuvoso|ventando|neblina|nublado|tempestade|nevando|quente|frio)\b/i],
    ["EMOTIONS", /\b(?:emotions?|happy|sad|angry|afraid|scared|nervous|tired|emocao|emocoes|feliz|triste|bravo|assustado|nervoso|cansado)\b/i]
  ]);

  function topicText(question) {
    const parts = [];
    function add(value) { if (typeof value === "string" && value.trim()) parts.push(value); }
    add(question?.statement); add(question?.audioText); add(question?.skill?.description); add(question?.metadata?.sourceStatement);
    [question?.alternatives, question?.options, question?.metadata?.sourceOptions, question?.metadata?.targetShooter?.items, question?.metadata?.bubblePop?.items]
      .forEach((collection) => {
        if (!Array.isArray(collection)) return;
        collection.forEach((entry) => { add(entry?.text); add(entry?.label); add(entry?.alt); add(entry?.audioText); });
      });
    return normalizeSemanticAssetName(parts.join(" "));
  }

  function inferActivityTopic(activity, moduleDefinition) {
    const explicit = String(activity?.topic || "").trim();
    if (explicit) return explicit.toUpperCase();
    const current = String(activity?.title || "").trim();
    if (current && !GENERIC_ACTIVITY_TITLE.test(current)) return current;
    const questions = Array.isArray(activity?.questions) ? activity.questions : [];
    const semanticText = questions.map(topicText).join(" ");
    const topics = TOPIC_RULES.filter((entry) => entry[1].test(semanticText)).map((entry) => entry[0]);
    if (topics.length === 1) return topics[0];
    if (topics.length === 2) return topics.join(" & ");
    const moduleTitle = String(moduleDefinition?.title || "").trim();
    return (moduleTitle || current || "ENGLISH").toUpperCase();
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
    if (Array.isArray(normalized.activities)) {
      normalized.activities.forEach((activity) => {
        if (activity && typeof activity === "object") activity.title = inferActivityTopic(activity, normalized);
      });
    }
    return Object.freeze(normalized);
  }

  function normalizeLoadedContent() {
    const content = window.DUDUQ_CONTENT;
    if (!content || typeof content !== "object") return false;
    let changed = false;
    Object.keys(content).forEach((subjectKey) => {
      const subject = content[subjectKey];
      if (!subject || typeof subject !== "object") return;
      Object.keys(subject).forEach((yearKey) => {
        const yearObject = subject[yearKey];
        if (!yearObject || typeof yearObject !== "object") return;
        Object.keys(yearObject).forEach((moduleKey) => {
          const current = yearObject[moduleKey];
          if (!current || typeof current !== "object") return;
          try { yearObject[moduleKey] = normalizeModule(current); changed = true; }
          catch (error) { console.warn("[DuduQ Assets] Não foi possível normalizar " + subjectKey + "/" + yearKey + "/" + moduleKey + ".", error); }
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
    Object.defineProperty(bridgedFetch, "__duduqAssetPathBridge", { value: true, enumerable: false });
    Object.defineProperty(bridgedFetch, "__duduqNativeFetch", { value: nativeFetch, enumerable: false });
    window.fetch = bridgedFetch;
    return true;
  }

  window.DUDUQ_ASSETS = ASSETS;
  window.DuduQAssets = Object.freeze({
    version: VERSION,
    assets: ASSETS,
    canonicalCatalog: ASSETS.canonicalCatalog,
    setYear: applyYear,
    getYear: () => document.documentElement.getAttribute("data-duduq-ano-ativo") || null,
    get: (type, name) => ASSETS[type]?.[name] || null,
    getSound: (name) => ASSETS.sounds[name] || null,
    getContent: getContentAsset,
    resolveImage,
    resolveImageDetails,
    normalizeImageName: normalizeSemanticAssetName,
    inferActivityTopic,
    rewriteUrl: rewriteLegacyAssetUrl,
    rewriteText,
    normalizeContent: normalizeLoadedContent,
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
