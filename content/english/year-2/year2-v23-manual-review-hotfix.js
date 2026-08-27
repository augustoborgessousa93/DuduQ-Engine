/* DUDUQ English Year 2 — manual review hotfix
   User-review corrections after the first production walkthrough:
   1) official EduQ Play logo in Intro;
   2) official Assets-DuduQ imagery preferred over provisional emoji/SVG;
   3) Matching rebuilt as three complete audio -> image pairs.

   This layer does not edit the frozen v2.3 source bank. Source IDs, order,
   alternatives and sourceAnswerV23 remain provenance fields from the official bank.
*/
(function () {
  "use strict";

  const currentFactory = window.DuduQYear2V23Factory;
  if (!currentFactory || typeof currentFactory.buildModule !== "function") {
    throw new Error("[DuduQ Year2 Manual Review] Factory v2.3 indisponível.");
  }

  const VERSION = "2.3.2-manual-review-rc1";
  const ASSET_BASE = "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/";
  const OFFICIAL_LOGO = ASSET_BASE + "Logo%20EduQ%20Play.png";

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function normalize(value) {
    return String(value == null ? "" : value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  function bank(file) {
    return ASSET_BASE + encodeURIComponent(file).replace(/%2F/gi, "/");
  }

  const files = Object.freeze({
    "hello": "greeting-hello-oi.png",
    "hi": "greeting-hello-oi.png",
    "goodbye": "greeting-goodbye-tchau.png",
    "bye": "greeting-goodbye-tchau.png",
    "see you": "greeting-goodbye-tchau.png",
    "good morning": "greeting-good-morning-bom-dia.png",
    "good afternoon": "greeting-good-afternoon-boa-tarde.png",
    "good night": "greeting-good-night-boa-noite.png",
    "my name": "introduction-my-name-meu-nome.png",

    "a": "Letra A - EI.png",
    "b": "Letra B - BI.png",
    "c": "Letra C - SI.png",
    "d": "Letra D - DI.png",
    "e": "Letra E - I.png",
    "m": "Letra M - EM.png",
    "s": "Letra S - ES.png",

    "one": "number-01-one-um.png", "1": "number-01-one-um.png", "um": "number-01-one-um.png",
    "two": "number-02-two-dois.png", "2": "number-02-two-dois.png", "dois": "number-02-two-dois.png",
    "three": "number-03-three-tres.png", "3": "number-03-three-tres.png", "tres": "number-03-three-tres.png",
    "four": "number-04-four-quatro.png", "4": "number-04-four-quatro.png", "quatro": "number-04-four-quatro.png",
    "five": "number-05-five-cinco.png", "5": "number-05-five-cinco.png", "cinco": "number-05-five-cinco.png",
    "six": "number-06-six-seis.png", "6": "number-06-six-seis.png", "seis": "number-06-six-seis.png",
    "seven": "number-07-seven-sete.png", "7": "number-07-seven-sete.png", "sete": "number-07-seven-sete.png",
    "eight": "number-08-eight-oito.png", "8": "number-08-eight-oito.png", "oito": "number-08-eight-oito.png",
    "nine": "number-09-nine-nove.png", "9": "number-09-nine-nove.png", "nove": "number-09-nine-nove.png",
    "ten": "number-10-ten-dez.png", "10": "number-10-ten-dez.png", "dez": "number-10-ten-dez.png",
    "eleven": "eleven-onze.png", "11": "eleven-onze.png", "onze": "eleven-onze.png",
    "twelve": "Twelve-doze.png", "12": "Twelve-doze.png", "doze": "Twelve-doze.png",
    "thirteen": "Thirteen-treze.png", "13": "Thirteen-treze.png", "treze": "Thirteen-treze.png",
    "fourteen": "Fourteen-quatorze.png", "14": "Fourteen-quatorze.png", "quatorze": "Fourteen-quatorze.png",
    "fifteen": "Fifteen-quinze.png", "15": "Fifteen-quinze.png", "quinze": "Fifteen-quinze.png",
    "sixteen": "Sixteen-dezesseis.png", "16": "Sixteen-dezesseis.png", "dezesseis": "Sixteen-dezesseis.png",
    "seventeen": "Seventeen-dezessete.png", "17": "Seventeen-dezessete.png", "dezessete": "Seventeen-dezessete.png",
    "eighteen": "Eighteen-dezoito.png", "18": "Eighteen-dezoito.png", "dezoito": "Eighteen-dezoito.png",
    "nineteen": "Dezenove-nineteen.png", "19": "Dezenove-nineteen.png", "dezenove": "Dezenove-nineteen.png",
    "twenty": "wenty-vinte.png", "20": "wenty-vinte.png", "vinte": "wenty-vinte.png",

    "mother": "mother - mãe.png", "mom": "mother - mãe.png", "mommy": "mother - mãe.png",
    "father": "father-pai.png", "dad": "father-pai.png", "daddy": "father-pai.png",
    "brother": "brother-irmão.png",
    "sister": "sister-irmã.png",
    "grandfather": "grandfather - avô.png", "grandpa": "grandfather - avô.png",
    "grandmother": "grandmother - avó.png", "grandma": "grandmother - avó.png",

    "doll": "doll - boneca.png",
    "ball": "blue ball - bola azul.png", "blue ball": "blue ball - bola azul.png",
    "teddy bear": "teddy bear.png", "bear": "teddy bear.png",
    "video game": "video game.png", "videogame": "video game.png",
    "kite": "kite - pipa.png",
    "boat": "red boat - barco vermelho.png", "red boat": "red boat - barco vermelho.png",

    "red": "color-red-vermelho.png", "vermelho": "color-red-vermelho.png",
    "blue": "color-blue-azul.png", "azul": "color-blue-azul.png",
    "yellow": "color-yellow-amarelo.png", "amarelo": "color-yellow-amarelo.png",
    "green": "color-green-verde.png", "verde": "color-green-verde.png",
    "orange": "color-orange-laranja.png", "laranja": "color-orange-laranja.png",
    "pink": "color-pink-rosa.png", "rosa": "color-pink-rosa.png",
    "black": "color-black-preto.png", "preto": "color-black-preto.png",
    "white": "color-white-branco.png", "branco": "color-white-branco.png",
    "brown": "color-brown-marrom.png", "marrom": "color-brown-marrom.png",

    "dog": "pet-dog-cachorro.png", "cachorro": "pet-dog-cachorro.png",
    "cat": "pet-cat-gato.png", "gato": "pet-cat-gato.png",
    "fish": "pet-fish-peixe.png", "peixe": "pet-fish-peixe.png",
    "bird": "pet-bird-passaro.png", "passaro": "pet-bird-passaro.png",
    "hamster": "pet-hamster.png",
    "rabbit": "pet-rabbit-coelho.png", "coelho": "pet-rabbit-coelho.png",
    "turtle": "pet-turtle-tartaruga.png", "tartaruga": "pet-turtle-tartaruga.png",
    "cow": "animal-cow-vaca.png", "vaca": "animal-cow-vaca.png",
    "duck": "animal-duck-pato.png", "pato": "animal-duck-pato.png",
    "horse": "animal-horse-cavalo.png", "cavalo": "animal-horse-cavalo.png",
    "pig": "animal-pig-porco.png", "porco": "animal-pig-porco.png",
    "sheep": "animal-sheep-ovelha.png", "ovelha": "animal-sheep-ovelha.png",
    "big cat": "big cat - gato grande.png",
    "small cat": "small cat -gato pequeno.png",
    "big dog": "big dog -cachorro grande.png",
    "small dog": "small dog -cachorro pequeno.png",

    "head": "body-part-touch-head-tocar-cabeca.png", "cabeca": "body-part-touch-head-tocar-cabeca.png",
    "hands": "body-part-touch-hands-tocar-maos.png", "hand": "body-part-touch-hands-tocar-maos.png", "maos": "body-part-touch-hands-tocar-maos.png",
    "arms": "body-part-touch-arms-tocar-bracos.png", "arm": "body-part-touch-arms-tocar-bracos.png", "bracos": "body-part-touch-arms-tocar-bracos.png",
    "knees": "body-part-touch-knees-tocar-joelhos.png", "knee": "body-part-touch-knees-tocar-joelhos.png", "joelhos": "body-part-touch-knees-tocar-joelhos.png",
    "feet": "body-part-touch-feet-tocar-pes.png", "foot": "body-part-touch-feet-tocar-pes.png", "pes": "body-part-touch-feet-tocar-pes.png",

    "apple": "Apple - maçã.png", "maca": "Apple - maçã.png",
    "banana": "Banana.png",
    "grapes": "Grapes - uvas.png", "grape": "Grapes - uvas.png", "uvas": "Grapes - uvas.png",
    "pear": "Pear - pera.png", "pera": "Pear - pera.png",
    "papaya": "Papaya - mamão.png", "mamao": "Papaya - mamão.png",
    "melon": "Melon - melão.png", "melao": "Melon - melão.png",
    "carrot": "Carrot - cenoura.png", "cenoura": "Carrot - cenoura.png",
    "potato": "Potato - batata.png", "batata": "Potato - batata.png",
    "tomato": "Tomato - tomate.png", "tomate": "Tomato - tomate.png",

    "backpack": "school-object-backpack-mochila.png", "mochila": "school-object-backpack-mochila.png",
    "pencil": "school-object-pencil-lapis.png", "lapis": "school-object-pencil-lapis.png",
    "ruler": "school-object-ruler-regua.png", "regua": "school-object-ruler-regua.png",
    "eraser": "school-object-eraser-borracha.png", "borracha": "school-object-eraser-borracha.png",

    "wake up": "routine-wake-up-acordar.png",
    "brush teeth": "routine-brush-teeth-escovar-dentes.png",
    "go to school": "routine-go-to-school-ir-para-escola.png",
    "have lunch": "routine-have-lunch-almocar.png",
    "play": "routine-play-brincar.png",
    "read": "routine-read-ler.png",
    "draw": "routine-draw-desenhar.png",
    "rest": "routine-rest-descansar.png",
    "go to sleep": "routine-go-to-sleep-ir-dormir.png",
    "rain": "weather-rain-chuva.png"
  });

  function smartImage(label) {
    const key = normalize(label);
    const direct = files[key];
    if (direct) return bank(direct);

    // Compound source labels sometimes contain translations or descriptors.
    const keys = Object.keys(files).sort((a, b) => b.length - a.length);
    for (const candidate of keys) {
      if (candidate.length < 2) continue;
      if (key === candidate || key.startsWith(candidate + " ") || key.endsWith(" " + candidate)) {
        return bank(files[candidate]);
      }
    }
    return null;
  }

  function isRealNetworkImage(value) {
    return /^https?:\/\//i.test(String(value || "")) && !/Imagem%20generica\.svg/i.test(String(value || ""));
  }

  function sourceLabels(question) {
    const fromMetadata = question?.metadata?.sourceAlternativesV23;
    if (Array.isArray(fromMetadata) && fromMetadata.length) return fromMetadata.map(String);
    return (question?.alternatives || []).map((alternative) => String(
      alternative?.metadata?.sourceWrittenLabel ?? alternative?.audio?.text ?? alternative?.text ?? ""
    ));
  }

  function sourceCorrectLabel(question) {
    const answer = String(question?.metadata?.sourceAnswerV23 ?? "");
    const labels = sourceLabels(question);
    const alternatives = question?.alternatives || [];
    const answerObject = question?.answer;
    if (answer && labels.includes(answer)) return answer;
    if (answerObject && typeof answerObject === "object") {
      const value = String(answerObject.value ?? "");
      const index = alternatives.findIndex((alt) => String(alt?.id ?? "") === value);
      if (index >= 0) return labels[index] || null;
    }
    const correctIndex = alternatives.findIndex((alt) => alt?.correct === true);
    return correctIndex >= 0 ? labels[correctIndex] : null;
  }

  function existingOfficialMatchingImages(question) {
    const matching = question?.metadata?.matching || {};
    const assets = matching.assets || {};
    const rightItems = matching.rightItems || [];
    const labels = sourceLabels(question);
    const out = new Map();
    rightItems.forEach((item, index) => {
      const candidate = assets[item?.imageAssetKey] || item?.imageSrc || item?.imageUrl || item?.image;
      if (isRealNetworkImage(candidate) && labels[index]) out.set(normalize(labels[index]), String(candidate));
    });
    return out;
  }

  function resolveOfficialForLabel(label, existingMap) {
    return smartImage(label) || existingMap?.get(normalize(label)) || null;
  }

  function rebuildMatching(question) {
    const labels = sourceLabels(question).filter(Boolean);
    const existing = existingOfficialMatchingImages(question);
    const unique = [];
    const seen = new Set();
    for (const label of labels) {
      const key = normalize(label);
      if (!key || seen.has(key)) continue;
      const image = resolveOfficialForLabel(label, existing);
      if (!image) continue;
      seen.add(key);
      unique.push({ label, image });
    }

    if (unique.length < 3) {
      return { ok: false, reason: "LESS_THAN_THREE_OFFICIAL_VISUAL_PAIRS", available: unique.length };
    }

    const correct = normalize(sourceCorrectLabel(question));
    const selected = [];
    if (correct) {
      const preferred = unique.find((entry) => normalize(entry.label) === correct);
      if (preferred) selected.push(preferred);
    }
    for (const entry of unique) {
      if (selected.length >= 3) break;
      if (!selected.some((picked) => normalize(picked.label) === normalize(entry.label))) selected.push(entry);
    }

    if (selected.length !== 3) {
      return { ok: false, reason: "COULD_NOT_SELECT_THREE_DISTINCT_PAIRS", available: selected.length };
    }

    const assets = {};
    const leftItems = [];
    const rightItems = [];
    const pairs = [];
    selected.forEach((entry, index) => {
      const number = index + 1;
      const leftId = `audio-${number}`;
      const rightId = `visual-${number}`;
      const assetKey = `pair-${number}`;
      assets[assetKey] = entry.image;
      leftItems.push({
        id: leftId,
        spokenText: String(entry.label),
        speechLocale: "en-US",
        audioDescription: `Ouvir opção ${number}`
      });
      rightItems.push({
        id: rightId,
        imageAssetKey: assetKey,
        alt: String(entry.label)
      });
      pairs.push({ leftId, rightId });
    });

    question.delivery = { ...(question.delivery || {}), mechanic: "matching", allowImage: true, allowAudio: true };
    question.metadata = question.metadata || {};
    question.metadata.matching = {
      mode: "audio-image",
      leftTitle: "Ouça",
      rightTitle: "Ligue à imagem",
      assets,
      leftItems,
      rightItems,
      pairs,
      behavior: {
        shuffleLeft: true,
        shuffleRight: true,
        connectionMode: "many-to-many"
      }
    };
    question.metadata.optionPresentation = "THREE_AUDIO_THREE_IMAGE_MATCHING";
    question.metadata.englishReadingRequired = false;
    question.metadata.readingDependency = "NÃO";
    question.metadata.manualReviewMatching = {
      version: VERSION,
      format: "3-audio-3-image",
      pairCount: 3,
      sourceAnswerPreservedAsProvenance: true,
      sourceAnswerV23: question.metadata.sourceAnswerV23 ?? null
    };
    return { ok: true, selected: selected.map((entry) => entry.label) };
  }

  function labelForIndex(question, index) {
    return sourceLabels(question)[index] || "";
  }

  function upgradeTargetShooter(question) {
    const target = question?.metadata?.targetShooter;
    if (!target || !Array.isArray(target.items)) return 0;
    let upgraded = 0;
    target.items = target.items.map((item, index) => {
      const label = item?.alt || item?.label || labelForIndex(question, index);
      const image = smartImage(label);
      if (!image) return item;
      upgraded += 1;
      return {
        ...item,
        image,
        imageSrc: image,
        imageUrl: image,
        alt: item?.alt || label,
        label: "",
        display: "image"
      };
    });
    return upgraded;
  }

  function upgradeQuestionPrimaryImage(question) {
    const label = sourceCorrectLabel(question) || question?.audio?.text || question?.metadata?.sourceAnswerV23;
    const image = smartImage(label);
    if (!image) return 0;
    let upgraded = 0;
    if (question?.image && typeof question.image === "object") {
      if (!isRealNetworkImage(question.image.src)) {
        question.image.src = image;
        question.image.alt = question.image.alt || String(label || "Imagem da atividade");
        upgraded += 1;
      }
    }
    if (question?.stimulus?.image && typeof question.stimulus.image === "object") {
      if (!isRealNetworkImage(question.stimulus.image.src)) {
        question.stimulus.image.src = image;
        upgraded += 1;
      }
    }
    return upgraded;
  }

  function upgradeDragDrop(question) {
    if (question?.delivery?.mechanic !== "drag-drop") return 0;
    let upgraded = 0;
    const labels = sourceLabels(question);
    const visitArray = (items) => {
      if (!Array.isArray(items)) return;
      items.forEach((item, index) => {
        if (!item || typeof item !== "object") return;
        const label = item.alt || item.label || item.text || labels[index] || item.spokenText;
        const image = smartImage(label);
        if (!image) return;
        if ("image" in item || "imageSrc" in item || "imageUrl" in item || item.display === "image") {
          item.image = image;
          item.imageSrc = image;
          item.imageUrl = image;
          item.alt = item.alt || String(label || "Imagem");
          upgraded += 1;
        }
      });
    };
    visitArray(question?.metadata?.dragDrop?.items);
    visitArray(question?.metadata?.dragDrop?.targets);
    visitArray(question?.metadata?.dragDrop?.draggables);
    visitArray(question?.metadata?.targets);
    return upgraded;
  }

  function rebuildActivityMechanics(module) {
    for (const activity of module.activities || []) {
      if (!Array.isArray(activity.questions) || !activity.questions.length) continue;
      const mechanics = new Set(activity.questions.map((q) => q?.delivery?.mechanic).filter(Boolean));
      if (mechanics.size === 1) activity.mechanic = [...mechanics][0];
    }
  }

  function buildModule(config) {
    const built = clone(currentFactory.buildModule(config));
    built.version = VERSION;
    built.intro = {
      ...(built.intro || {}),
      collectionName: "EduQ Play",
      collectionLogo: OFFICIAL_LOGO
    };
    built.visualPolicy = {
      ...(built.visualPolicy || {}),
      mode: "OFFICIAL_ASSET_BANK_FIRST",
      repositoryAssetsPreferred: true,
      provisionalEmojiVectorAllowed: false,
      smartAssetResolution: true
    };

    const audit = {
      version: VERSION,
      officialLogo: OFFICIAL_LOGO,
      matchingFormat: "3-audio-3-image",
      matchingRebuilt: [],
      matchingBlocked: [],
      smartVisualUpgrades: 0,
      sourceIdsPreserved: true,
      sourceOrderPreserved: true
    };

    const beforeIds = [];
    const afterIds = [];
    for (const activity of built.activities || []) {
      for (const question of activity.questions || []) beforeIds.push(question.id);
    }

    for (const activity of built.activities || []) {
      for (const question of activity.questions || []) {
        const mechanic = question?.delivery?.mechanic || activity.mechanic;
        if (mechanic === "matching") {
          const result = rebuildMatching(question);
          if (result.ok) audit.matchingRebuilt.push({ id: question.id, pairs: result.selected });
          else audit.matchingBlocked.push({ id: question.id, reason: result.reason, available: result.available });
        }
        audit.smartVisualUpgrades += upgradeTargetShooter(question);
        audit.smartVisualUpgrades += upgradeQuestionPrimaryImage(question);
        audit.smartVisualUpgrades += upgradeDragDrop(question);
      }
    }

    rebuildActivityMechanics(built);
    for (const activity of built.activities || []) {
      for (const question of activity.questions || []) afterIds.push(question.id);
    }

    if (JSON.stringify(beforeIds) !== JSON.stringify(afterIds)) {
      throw new Error("[DuduQ Year2 Manual Review] IDs/ordem foram alterados pela hotfix.");
    }
    if (audit.matchingBlocked.length) {
      throw new Error(
        "[DuduQ Year2 Manual Review] Matching sem 3 pares oficiais: " +
        audit.matchingBlocked.map((entry) => `${entry.id}(${entry.available})`).join(", ")
      );
    }

    built.manualReviewHotfix = audit;
    return Object.freeze(built);
  }

  window.DuduQYear2V23Factory = Object.freeze({
    ...currentFactory,
    version: VERSION,
    buildModule,
    __manualReviewHotfixApplied: true,
    manualReviewHotfixVersion: VERSION,
    officialEduQPlayLogo: OFFICIAL_LOGO,
    resolveOfficialYear2Image: smartImage
  });
})();
