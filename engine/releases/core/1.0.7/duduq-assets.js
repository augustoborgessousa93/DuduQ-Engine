/* =========================================================
   DUDUQ CORE — ASSETS
   Fonte central de mascotes, sons, backgrounds e conteúdo.

   Versão 1.5.1 — INTELLIGENT RESOLVERS + FULL BACKGROUND
   ========================================================= */

(function () {
  "use strict";

  const VERSION = "1.5.1-full-background";

  if (
    window.DuduQAssets &&
    window.DuduQAssets.version === VERSION
  ) {
    return;
  }

  const LEGACY_LOCAL_BASE =
    "/assets-duduq-local-v1/";

  const BASE =
    "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/";

  const IMAGE_BASE = BASE + "Imagens%20Ilustrativa/";
  const SOUND_BASE = BASE + "Efeitos%20sonoros/";
  const TEMPLATE_BASE = BASE + "Templates/";
  const AUDIO_ROOT = BASE + "Audios/";

  const INTELLIGENT_IMAGE_CATALOG = Object.freeze([
    { key: "number-1", file: "um%20-%20one%20-%201.png", aliases: ["1", "one", "um", "number one", "number 1", "numero um", "numero 1", "um one 1"] },
    { key: "number-2", file: "dois%20-%20two%20-%202.png", aliases: ["2", "two", "dois", "number two", "number 2", "numero dois", "numero 2", "dois two 2"] },
    { key: "number-3", file: "tr%C3%AAs%20-%20three%20-%203.png", aliases: ["3", "three", "tres", "number three", "number 3", "numero tres", "numero 3", "tres three 3"] },
    { key: "number-4", file: "quatro%20-%20four%20-%204.png", aliases: ["4", "four", "quatro", "number four", "number 4", "numero quatro", "numero 4", "quatro four 4"] },
    { key: "number-5", file: "cinco%20-%20five%20-%205.png", aliases: ["5", "five", "cinco", "number five", "number 5", "numero cinco", "numero 5", "cinco five 5"] },
    { key: "number-6", file: "seis%20-%20six%20-%206.png", aliases: ["6", "six", "seis", "number six", "number 6", "numero seis", "numero 6", "seis six 6"] },
    { key: "number-7", file: "sete%20-%20seven%20-%207.png", aliases: ["7", "seven", "sete", "number seven", "number 7", "numero sete", "numero 7", "sete seven 7"] },
    { key: "number-8", file: "oito%20-%20eight%20-%208.png", aliases: ["8", "eight", "oito", "number eight", "number 8", "numero oito", "numero 8", "oito eight 8"] },
    { key: "number-9", file: "nove%20-%20nine%20-%209.png", aliases: ["9", "nine", "nove", "number nine", "number 9", "numero nove", "numero 9", "nove nine 9"] },
    { key: "number-10", file: "dez%20%20-%20ten%20-%2010.png", aliases: ["10", "ten", "dez", "number ten", "number 10", "numero dez", "numero 10", "dez ten 10"] }
  ]);

  function normalizeSemanticAssetName(value) {
    let normalized = String(value == null ? "" : value).trim();
    try { normalized = decodeURIComponent(normalized); } catch (_) {}
    normalized = normalized.split(/[?#]/)[0];
    normalized = normalized.slice(normalized.lastIndexOf("/") + 1);
    normalized = normalized.replace(/\.[a-z0-9]{2,5}$/i, "");
    return normalized
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const INTELLIGENT_IMAGE_ALIASES = (function () {
    const aliases = new Map();
    INTELLIGENT_IMAGE_CATALOG.forEach(function (entry) {
      entry.aliases.forEach(function (alias) {
        aliases.set(normalizeSemanticAssetName(alias), entry);
      });
    });
    return aliases;
  })();

  function resolveImageDetails(value) {
    const normalized = normalizeSemanticAssetName(value);
    if (!normalized) return null;
    const entry = INTELLIGENT_IMAGE_ALIASES.get(normalized);
    if (!entry) return null;
    return Object.freeze({
      key: entry.key,
      file: entry.file,
      url: IMAGE_BASE + entry.file,
      query: normalized,
      strategy: "exact-bilingual-alias"
    });
  }

  function resolveImage(value) {
    const resolved = resolveImageDetails(value);
    return resolved ? resolved.url : null;
  }

  const IMAGE_FILES = new Set([
    "Boy.png","Bye.png","DUDUQ_ACERTO.png","DUDUQ_ERRO.png","DUDUQ_IDLE.png",
    "Duduq_Li%C3%A7%C3%A3o%20concluida.png","Fish_Girl.png","Girl.png",
    "Good%20Afternoon.png","Good%20Morning.png","Good%20Night.png","Hello.png",
    "LOGO%20DA%20EMPRESA_COLORIDO.png","LOGO%20DUDUQ.png","Logo%20EduQ%20Play.png",
    "My%20name.png","Rain.png","nervous.png","wheelchair_boy.png"
  ]);

  const SOUND_FILES = new Set([
    "Ops_feedback_erro.mp3","bubble-pop.mp3","click.mp3","correct.mp3","ding.mp3",
    "error.mp3","feedback_correto.mp3","happy-fun-EduQ_Play.mp3","pop.mp3",
    "swoosh-sound-effect--transitions.mp3","swoosh.mp3","you%20win.mp3"
  ]);

  const TEMPLATE_FILES = new Set([
    "1%C2%BA%20ano%20-whispering-woods.png",
    "2%C2%BA%20ano%20-chroma-canyons.png",
    "3%C2%BA%20ano%20-clockwork-valley.png",
    "4%C2%BA%20ano%20-papercraft-campus.png",
    "5%C2%BA%20ano%20-sky-lab.png"
  ]);

  function normalizeAssetFileName(value) {
    return String(value || "")
      .replace(/ /g, "%20")
      .replace(/%C3%A7/gi, "%C3%A7")
      .replace(/%C3%A3/gi, "%C3%A3");
  }

  function audioFolderFromFile(fileName) {
    const file = String(fileName || "");
    const match = file.match(/^ING_(\d+)ANO_M(\d+)_/i);
    if (!match) return "";
    const year = String(Number(match[1]));
    const module = String(Number(match[2])).padStart(2, "0");
    return year + "_ANO/M" + module + "/";
  }

  function rewriteLegacyAssetUrl(value) {
    if (typeof value !== "string") return value;

    let relative = "";
    if (value.startsWith(BASE)) {
      relative = value.slice(BASE.length);
    } else if (value.startsWith(LEGACY_LOCAL_BASE)) {
      relative = value.slice(LEGACY_LOCAL_BASE.length);
    } else {
      return value;
    }

    if (
      relative.startsWith("Imagens%20Ilustrativa/") ||
      relative.startsWith("Efeitos%20sonoros/") ||
      relative.startsWith("Templates/") ||
      relative.startsWith("Audios/")
    ) {
      if (relative.startsWith("Audios/") && relative.split("/").length === 2) {
        const fileName = relative.slice("Audios/".length);
        const folder = audioFolderFromFile(fileName);
        if (folder) return AUDIO_ROOT + folder + fileName;
      }
      return BASE + relative;
    }

    const fileName = normalizeAssetFileName(relative);
    if (IMAGE_FILES.has(fileName)) return IMAGE_BASE + fileName;
    if (SOUND_FILES.has(fileName)) return SOUND_BASE + fileName;
    if (TEMPLATE_FILES.has(fileName)) return TEMPLATE_BASE + fileName;
    return BASE + relative;
  }

  function rewriteText(text) {
    if (typeof text !== "string") return text;
    let updated = text.replace(
      /https:\/\/raw\.githubusercontent\.com\/augustoborgessousa93\/Assets-DuduQ\/main\/[^\s"'<>\\)]+/g,
      function (url) { return rewriteLegacyAssetUrl(url); }
    );
    updated = updated.replace(
      /\/assets-duduq-local-v1\/[^\s"'<>\\)]+/g,
      function (url) { return rewriteLegacyAssetUrl(url); }
    );
    return updated;
  }

  function normalizeYear(value) {
    const match = String(value == null ? "" : value).match(/[1-5]/);
    return match ? match[0] : "";
  }

  function moduleAudioBase(year, module) {
    const normalizedYear = normalizeYear(year);
    const normalizedModule = String(Number(module) || 1).padStart(2, "0");
    if (!normalizedYear) return AUDIO_ROOT;
    return AUDIO_ROOT + normalizedYear + "_ANO/M" + normalizedModule + "/";
  }

  const ASSETS = Object.freeze({
    version: VERSION,
    repository: "augustoborgessousa93/Assets-DuduQ",
    paths: Object.freeze({
      base: BASE,
      images: IMAGE_BASE,
      sounds: SOUND_BASE,
      templates: TEMPLATE_BASE,
      audios: AUDIO_ROOT
    }),
    branding: Object.freeze({
      companyLogo: IMAGE_BASE + "LOGO%20DA%20EMPRESA_COLORIDO.png",
      duduqLogo: IMAGE_BASE + "LOGO%20DUDUQ.png",
      eduqPlayLogo: IMAGE_BASE + "Logo%20EduQ%20Play.png"
    }),
    mascots: Object.freeze({
      idle: IMAGE_BASE + "DUDUQ_IDLE.png",
      correct: IMAGE_BASE + "DUDUQ_ACERTO.png",
      error: IMAGE_BASE + "DUDUQ_ERRO.png",
      transition: IMAGE_BASE + "DUDUQ_IDLE.png",
      complete: IMAGE_BASE + "Duduq_Li%C3%A7%C3%A3o%20concluida.png"
    }),
    sounds: Object.freeze({
      "bubble-pop": SOUND_BASE + "bubble-pop.mp3",
      click: SOUND_BASE + "click.mp3",
      pop: SOUND_BASE + "pop.mp3",
      correct: SOUND_BASE + "correct.mp3",
      ding: SOUND_BASE + "ding.mp3",
      error: SOUND_BASE + "error.mp3",
      "feedback-correct-voice": SOUND_BASE + "feedback_correto.mp3",
      "feedback-error-voice": SOUND_BASE + "Ops_feedback_erro.mp3",
      "intro-company-swoosh": SOUND_BASE + "swoosh.mp3",
      "intro-mission-music": SOUND_BASE + "happy-fun-EduQ_Play.mp3",
      "transition-swoosh": SOUND_BASE + "swoosh-sound-effect--transitions.mp3",
      win: SOUND_BASE + "you%20win.mp3"
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
            greeting: IMAGE_BASE + "Hello.png",
            goodbye: IMAGE_BASE + "Bye.png",
            morning: IMAGE_BASE + "Good%20Morning.png",
            afternoon: IMAGE_BASE + "Good%20Afternoon.png",
            night: IMAGE_BASE + "Good%20Night.png",
            boy: IMAGE_BASE + "Boy.png",
            girl: IMAGE_BASE + "Girl.png",
            selfintro: IMAGE_BASE + "My%20name.png",
            rain: IMAGE_BASE + "Rain.png",
            nervous: IMAGE_BASE + "nervous.png",
            fishGirl: IMAGE_BASE + "Fish_Girl.png",
            wheelchairBoy: IMAGE_BASE + "wheelchair_boy.png"
          })
        }),
        year2: Object.freeze({
          module01: Object.freeze({
            greeting: IMAGE_BASE + "Hello.png",
            goodbye: IMAGE_BASE + "Bye.png",
            morning: IMAGE_BASE + "Good%20Morning.png",
            afternoon: IMAGE_BASE + "Good%20Afternoon.png",
            night: IMAGE_BASE + "Good%20Night.png",
            rain: IMAGE_BASE + "Rain.png",
            nervous: IMAGE_BASE + "nervous.png",
            fishGirl: IMAGE_BASE + "Fish_Girl.png",
            wheelchairBoy: IMAGE_BASE + "wheelchair_boy.png"
          })
        })
      })
    })
  });

  function applyYear(value) {
    const year = normalizeYear(value);
    if (!year || !ASSETS.backgrounds[year] || !document.body) return false;
    const backgroundUrl = ASSETS.backgrounds[year];
    document.documentElement.setAttribute("data-duduq-ano-ativo", year);
    document.documentElement.style.setProperty("--duduq-world-image", 'url("' + backgroundUrl + '")');
    document.documentElement.style.backgroundColor = "#1b4866";
    document.body.style.backgroundImage = 'url("' + backgroundUrl + '")';
    document.body.style.backgroundPosition = "center center";
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundRepeat = "no-repeat";
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.minHeight = "100dvh";
    document.body.style.width = "100%";
    return true;
  }

  function getYear() {
    return document.documentElement.getAttribute("data-duduq-ano-ativo") || null;
  }

  function getAsset(type, name) {
    if (!ASSETS[type]) return null;
    return ASSETS[type][name] || null;
  }

  function getSound(name) { return ASSETS.sounds[name] || null; }

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
      const result = [];
      cache.set(value, result);
      value.forEach(function (item) { result.push(cloneAndRewrite(item, cache)); });
      return result;
    }
    const result = {};
    cache.set(value, result);
    Object.keys(value).forEach(function (key) { result[key] = cloneAndRewrite(value[key], cache); });
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
    function add(value) {
      if (typeof value === "string" && value.trim()) parts.push(value);
    }
    add(question?.statement);
    add(question?.audioText);
    add(question?.skill?.description);
    add(question?.metadata?.sourceStatement);
    const collections = [
      question?.alternatives,
      question?.options,
      question?.metadata?.sourceOptions,
      question?.metadata?.targetShooter?.items,
      question?.metadata?.bubblePop?.items
    ];
    collections.forEach(function (collection) {
      if (!Array.isArray(collection)) return;
      collection.forEach(function (entry) {
        add(entry?.text);
        add(entry?.label);
        add(entry?.alt);
        add(entry?.audioText);
      });
    });
    return normalizeSemanticAssetName(parts.join(" "));
  }

  function inferActivityTopic(activity, moduleDefinition) {
    const explicit = String(activity?.topic || "").trim();
    if (explicit) return explicit.toUpperCase();
    const currentTitle = String(activity?.title || "").trim();
    if (currentTitle && !GENERIC_ACTIVITY_TITLE.test(currentTitle)) return currentTitle;
    const questions = Array.isArray(activity?.questions) ? activity.questions : [];
    const semanticText = questions.map(topicText).join(" ");
    const topics = TOPIC_RULES
      .filter(function (entry) { return entry[1].test(semanticText); })
      .map(function (entry) { return entry[0]; });
    if (topics.length === 1) return topics[0];
    if (topics.length === 2) return topics.join(" & ");
    const moduleTitle = String(moduleDefinition?.title || "").trim();
    return (moduleTitle || currentTitle || "ENGLISH").toUpperCase();
  }

  function normalizeModule(moduleDefinition) {
    if (!moduleDefinition || typeof moduleDefinition !== "object") return moduleDefinition;
    const normalized = cloneAndRewrite(moduleDefinition);
    const year = normalized.year;
    const module = normalized.module;
    if (normalized.audioPolicy && typeof normalized.audioPolicy === "object") {
      normalized.audioPolicy.base = moduleAudioBase(year, module);
    }
    if (normalized.intro && typeof normalized.intro === "object") {
      normalized.intro.companyLogo = ASSETS.branding.companyLogo;
      if (!normalized.intro.collectionLogo || normalized.intro.collectionLogo.includes("Logo%20EduQ%20Play.png")) {
        normalized.intro.collectionLogo = ASSETS.branding.eduqPlayLogo;
      }
    }
    if (Array.isArray(normalized.activities)) {
      normalized.activities.forEach(function (activity) {
        if (!activity || typeof activity !== "object") return;
        activity.title = inferActivityTopic(activity, normalized);
      });
    }
    return Object.freeze(normalized);
  }

  function normalizeLoadedContent() {
    const content = window.DUDUQ_CONTENT;
    if (!content || typeof content !== "object") return false;
    let changed = false;
    Object.keys(content).forEach(function (subjectKey) {
      const subject = content[subjectKey];
      if (!subject || typeof subject !== "object") return;
      Object.keys(subject).forEach(function (yearKey) {
        const yearObject = subject[yearKey];
        if (!yearObject || typeof yearObject !== "object") return;
        Object.keys(yearObject).forEach(function (moduleKey) {
          const current = yearObject[moduleKey];
          if (!current || typeof current !== "object") return;
          try {
            yearObject[moduleKey] = normalizeModule(current);
            changed = true;
          } catch (error) {
            console.warn("[DuduQ Assets] Não foi possível normalizar " + subjectKey + "/" + yearKey + "/" + moduleKey + ".", error);
          }
        });
      });
    });
    return changed;
  }

  const RUNTIME_PATTERN = /(?:^|\/)DUDUQ_(?:BUBBLE_POP|DRAG_DROP|MATCHING|MEMORY_QUEST|SMART_SENTENCE|TARGET_SHOOTER|WORD_SLASH)\.html(?:[?#]|$)/i;

  function getRequestUrl(input) {
    if (typeof input === "string") return input;
    if (input && typeof input.url === "string") return input.url;
    return "";
  }

  function installRuntimeFetchBridge() {
    if (typeof window.fetch !== "function" || window.fetch.__duduqAssetPathBridge) return false;
    const nativeFetch = window.fetch.bind(window);
    const bridgedFetch = function (input, init) {
      const requestUrl = getRequestUrl(input);
      const request = nativeFetch(input, init);
      if (!RUNTIME_PATTERN.test(requestUrl)) return request;
      return request.then(function (response) {
        if (!response || !response.ok) return response;
        return response.text().then(function (originalHtml) {
          const updatedHtml = rewriteText(originalHtml);
          const headers = new Headers(response.headers);
          headers.delete("content-length");
          headers.delete("content-encoding");
          return new Response(updatedHtml, {
            status: response.status,
            statusText: response.statusText,
            headers: headers
          });
        });
      });
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
    setYear: applyYear,
    getYear: getYear,
    get: getAsset,
    getSound: getSound,
    getContent: getContentAsset,
    resolveImage: resolveImage,
    resolveImageDetails: resolveImageDetails,
    normalizeImageName: normalizeSemanticAssetName,
    inferActivityTopic: inferActivityTopic,
    rewriteUrl: rewriteLegacyAssetUrl,
    rewriteText: rewriteText,
    normalizeContent: normalizeLoadedContent,
    getAudioBase: moduleAudioBase
  });

  installRuntimeFetchBridge();

  const params = new URLSearchParams(window.location.search);
  const requestedYear = params.get("ano") || params.get("year") || params.get("serie") || params.get("série") ||
    document.documentElement.getAttribute("data-duduq-ano") || window.DUDUQ_ANO;
  if (requestedYear) applyYear(requestedYear);

  window.addEventListener("DOMContentLoaded", function () { normalizeLoadedContent(); });
  window.addEventListener("load", function () { normalizeLoadedContent(); });

  try {
    window.dispatchEvent(new CustomEvent("duduq:assets-ready", { detail: { version: VERSION } }));
  } catch (_) {}

  console.info("[DuduQ Assets] v" + VERSION + " — remote Assets-DuduQ + compatibilidade legada carregadas.");
})();
