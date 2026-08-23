/* =========================================================
   DUDUQ CORE — ASSETS
   Fonte central de mascotes, sons, backgrounds e conteúdo.

   Versão 1.6.0 — BILINGUAL SMART IMAGE CATALOG
   ========================================================= */

(function () {
  "use strict";

  const VERSION = "1.6.0-bilingual-image-catalog";

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
    { key: "number-1", file: "number-01-one-um.png", aliases: ["1", "one", "um", "number one", "number 1", "numero um", "numero 1"] },
    { key: "number-2", file: "number-02-two-dois.png", aliases: ["2", "two", "dois", "number two", "number 2", "numero dois", "numero 2"] },
    { key: "number-3", file: "number-03-three-tres.png", aliases: ["3", "three", "tres", "number three", "number 3", "numero tres", "numero 3"] },
    { key: "number-4", file: "number-04-four-quatro.png", aliases: ["4", "four", "quatro", "number four", "number 4", "numero quatro", "numero 4"] },
    { key: "number-5", file: "number-05-five-cinco.png", aliases: ["5", "five", "cinco", "number five", "number 5", "numero cinco", "numero 5"] },
    { key: "number-6", file: "number-06-six-seis.png", aliases: ["6", "six", "seis", "number six", "number 6", "numero seis", "numero 6"] },
    { key: "number-7", file: "number-07-seven-sete.png", aliases: ["7", "seven", "sete", "number seven", "number 7", "numero sete", "numero 7"] },
    { key: "number-8", file: "number-08-eight-oito.png", aliases: ["8", "eight", "oito", "number eight", "number 8", "numero oito", "numero 8"] },
    { key: "number-9", file: "number-09-nine-nove.png", aliases: ["9", "nine", "nove", "number nine", "number 9", "numero nove", "numero 9"] },
    { key: "number-10", file: "number-10-ten-dez.png", aliases: ["10", "ten", "dez", "number ten", "number 10", "numero dez", "numero 10"] },
    { key: "color-red", file: "color-red-vermelho.png", aliases: ["red", "vermelho", "vermelha", "cor vermelha"] },
    { key: "color-blue", file: "color-blue-azul.png", aliases: ["blue", "azul", "cor azul"] },
    { key: "color-yellow", file: "color-yellow-amarelo.png", aliases: ["yellow", "amarelo", "amarela", "cor amarela"] },
    { key: "color-green", file: "color-green-verde.png", aliases: ["green", "verde", "cor verde"] },
    { key: "color-orange", file: "color-orange-laranja.png", aliases: ["orange", "laranja", "cor laranja"] },
    { key: "color-pink", file: "color-pink-rosa.png", aliases: ["pink", "rosa", "cor rosa"] },
    { key: "color-black", file: "color-black-preto.png", aliases: ["black", "preto", "preta", "cor preta"] },
    { key: "color-white", file: "color-white-branco.png", aliases: ["white", "branco", "branca", "cor branca"] },
    { key: "color-brown", file: "color-brown-marrom.png", aliases: ["brown", "marrom", "cor marrom"] },
    { key: "greeting-hello", file: "greeting-hello-oi.png", aliases: ["hello", "hi", "oi", "ola"] },
    { key: "greeting-goodbye", file: "greeting-goodbye-tchau.png", aliases: ["goodbye", "bye", "see you", "tchau"] },
    { key: "greeting-morning", file: "greeting-good-morning-bom-dia.png", aliases: ["good morning", "bom dia"] },
    { key: "greeting-afternoon", file: "greeting-good-afternoon-boa-tarde.png", aliases: ["good afternoon", "boa tarde"] },
    { key: "greeting-night", file: "greeting-good-night-boa-noite.png", aliases: ["good night", "boa noite"] },
    { key: "introduction-name", file: "introduction-my-name-meu-nome.png", aliases: ["my name", "meu nome", "what is your name"] },
    { key: "person-boy", file: "person-boy-menino.png", aliases: ["boy", "menino"] },
    { key: "person-girl", file: "person-girl-menina.png", aliases: ["girl", "menina"] },
    { key: "school-pencil", file: "school-object-pencil-lapis.png", aliases: ["pencil", "lapis"] },
    { key: "school-pencil-blue", file: "school-object-blue-pencil-lapis-azul.png", aliases: ["blue pencil", "lapis azul"] },
    { key: "school-pencil-red", file: "school-object-red-pencil-lapis-vermelho.png", aliases: ["red pencil", "lapis vermelho"] },
    { key: "school-ruler", file: "school-object-ruler-regua.png", aliases: ["ruler", "regua"] },
    { key: "school-eraser", file: "school-object-eraser-borracha.png", aliases: ["eraser", "borracha"] },
    { key: "school-backpack", file: "school-object-backpack-mochila.png", aliases: ["backpack", "school bag", "mochila"] },
    { key: "school-pencil-case", file: "school-object-pencil-case-estojo.png", aliases: ["pencil case", "estojo"] },
    { key: "school-pen-blue", file: "school-object-blue-pen-caneta-azul.png", aliases: ["blue pen", "caneta azul"] },
    { key: "school-crayon-orange", file: "school-object-orange-crayon-giz-laranja.png", aliases: ["orange crayon", "giz de cera laranja"] },
    { key: "school-crayon-red", file: "school-object-red-crayon-giz-vermelho.png", aliases: ["red crayon", "giz de cera vermelho"] },
    { key: "command-sit", file: "classroom-command-sit-down-sentar.png", aliases: ["sit down", "sentar", "sentado", "sentada"] },
    { key: "command-stand", file: "classroom-command-stand-up-em-pe.png", aliases: ["stand up", "em pe", "levantar"] },
    { key: "command-quiet", file: "classroom-command-quiet-silencio.png", aliases: ["quiet", "silence", "silencio"] },
    { key: "body-hands", file: "body-part-touch-hands-tocar-maos.png", aliases: ["hands", "touch hands", "maos", "tocar as maos"] },
    { key: "body-head", file: "body-part-touch-head-tocar-cabeca.png", aliases: ["head", "touch head", "cabeca", "tocar a cabeca"] },
    { key: "body-arms", file: "body-part-touch-arms-tocar-bracos.png", aliases: ["arms", "touch arms", "bracos", "tocar os bracos"] },
    { key: "body-knees", file: "body-part-touch-knees-tocar-joelhos.png", aliases: ["knees", "touch knees", "joelhos", "tocar os joelhos"] },
    { key: "body-feet", file: "body-part-touch-feet-tocar-pes.png", aliases: ["feet", "touch feet", "pes", "tocar os pes"] },
    { key: "pet-dog", file: "pet-dog-cachorro.png", aliases: ["dog", "cachorro"] },
    { key: "pet-cat", file: "pet-cat-gato.png", aliases: ["cat", "gato"] },
    { key: "pet-rabbit", file: "pet-rabbit-coelho.png", aliases: ["rabbit", "bunny", "coelho"] },
    { key: "pet-turtle", file: "pet-turtle-tartaruga.png", aliases: ["turtle", "tartaruga"] },
    { key: "pet-fish", file: "pet-fish-peixe.png", aliases: ["fish", "peixe"] },
    { key: "pet-hamster", file: "pet-hamster.png", aliases: ["hamster", "hamister"] },
    { key: "pet-bird", file: "pet-bird-passaro.png", aliases: ["bird", "passaro"] },
    { key: "routine-wake", file: "routine-wake-up-acordar.png", aliases: ["wake up", "waking up", "acordar", "acordando"] },
    { key: "routine-brush", file: "routine-brush-teeth-escovar-dentes.png", aliases: ["brush teeth", "brushing teeth", "escovar os dentes"] },
    { key: "routine-school", file: "routine-go-to-school-ir-para-escola.png", aliases: ["go to school", "going to school", "ir para a escola"] },
    { key: "routine-lunch", file: "routine-have-lunch-almocar.png", aliases: ["have lunch", "having lunch", "almocar", "almocando"] },
    { key: "routine-play", file: "routine-play-brincar.png", aliases: ["play", "playing", "brincar", "brincando"] },
    { key: "routine-read", file: "routine-read-ler.png", aliases: ["read", "reading", "ler", "lendo"] },
    { key: "routine-draw", file: "routine-draw-desenhar.png", aliases: ["draw", "drawing", "desenhar", "desenhando"] },
    { key: "routine-rest", file: "routine-rest-descansar.png", aliases: ["rest", "resting", "descansar", "descansando"] },
    { key: "routine-sleep", file: "routine-go-to-sleep-ir-dormir.png", aliases: ["go to sleep", "going to sleep", "ir dormir"] }
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
      [entry.key, entry.file].concat(entry.aliases).forEach(function (alias) {
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
