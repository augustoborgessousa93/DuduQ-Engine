/* DUDUQ English Year 2 — manual review hotfix v2
   Manual-review contract:
   - official EduQ Play logo in Intro;
   - Assets-DuduQ images first, semantic deterministic vectors only when the bank
     genuinely has no exact visual;
   - Matching uses N complete audio <-> visual pairs (2x2, 3x3, 4x4...), never
     one stimulus with loose multiple-choice distractors;
   - the original pedagogical answer/concept must be represented in Matching.
*/
(function () {
  "use strict";

  const upstreamFactory = window.DuduQYear2V23Factory;
  const v22Factory = window.DuduQYear2V22Factory;
  if (!upstreamFactory || typeof upstreamFactory.buildModule !== "function") {
    throw new Error("[DuduQ Year2 Manual Review v2] Factory v2.3 indisponível.");
  }

  const VERSION = "2.3.2-manual-review-rc2";
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

  const OFFICIAL = Object.freeze({
    "hello":"greeting-hello-oi.png","hi":"greeting-hello-oi.png",
    "goodbye":"greeting-goodbye-tchau.png","bye":"greeting-goodbye-tchau.png","see you":"greeting-goodbye-tchau.png","see you later":"greeting-goodbye-tchau.png",
    "good morning":"greeting-good-morning-bom-dia.png","good afternoon":"greeting-good-afternoon-boa-tarde.png","good night":"greeting-good-night-boa-noite.png",
    "my name":"introduction-my-name-meu-nome.png",
    "a":"Letra A - EI.png","b":"Letra B - BI.png","c":"Letra C - SI.png","d":"Letra D - DI.png","e":"Letra E - I.png","m":"Letra M - EM.png","s":"Letra S - ES.png",
    "one":"number-01-one-um.png","1":"number-01-one-um.png","two":"number-02-two-dois.png","2":"number-02-two-dois.png",
    "three":"number-03-three-tres.png","3":"number-03-three-tres.png","four":"number-04-four-quatro.png","4":"number-04-four-quatro.png",
    "five":"number-05-five-cinco.png","5":"number-05-five-cinco.png","six":"number-06-six-seis.png","6":"number-06-six-seis.png",
    "seven":"number-07-seven-sete.png","7":"number-07-seven-sete.png","eight":"number-08-eight-oito.png","8":"number-08-eight-oito.png",
    "nine":"number-09-nine-nove.png","9":"number-09-nine-nove.png","ten":"number-10-ten-dez.png","10":"number-10-ten-dez.png",
    "eleven":"eleven-onze.png","11":"eleven-onze.png","twelve":"Twelve-doze.png","12":"Twelve-doze.png",
    "thirteen":"Thirteen-treze.png","13":"Thirteen-treze.png","fourteen":"Fourteen-quatorze.png","14":"Fourteen-quatorze.png",
    "fifteen":"Fifteen-quinze.png","15":"Fifteen-quinze.png","sixteen":"Sixteen-dezesseis.png","16":"Sixteen-dezesseis.png",
    "seventeen":"Seventeen-dezessete.png","17":"Seventeen-dezessete.png","eighteen":"Eighteen-dezoito.png","18":"Eighteen-dezoito.png",
    "nineteen":"Dezenove-nineteen.png","19":"Dezenove-nineteen.png","twenty":"wenty-vinte.png","20":"wenty-vinte.png",
    "mother":"mother - mãe.png","mom":"mother - mãe.png","father":"father-pai.png","dad":"father-pai.png",
    "brother":"brother-irmão.png","sister":"sister-irmã.png","grandfather":"grandfather - avô.png","grandpa":"grandfather - avô.png",
    "grandmother":"grandmother - avó.png","grandma":"grandmother - avó.png",
    "doll":"doll - boneca.png","ball":"blue ball - bola azul.png","blue ball":"blue ball - bola azul.png",
    "teddy bear":"teddy bear.png","bear":"teddy bear.png","video game":"video game.png","videogame":"video game.png",
    "kite":"kite - pipa.png","boat":"red boat - barco vermelho.png","red boat":"red boat - barco vermelho.png",
    "train":"Train - trem.png","plane":"Plane - avião.png","bus":"Bus - ônibus.png","car":"Car - carro.png","truck":"Truck - caminhão.png",
    "red":"color-red-vermelho.png","blue":"color-blue-azul.png","yellow":"color-yellow-amarelo.png","green":"color-green-verde.png",
    "orange":"color-orange-laranja.png","pink":"color-pink-rosa.png","black":"color-black-preto.png","white":"color-white-branco.png","brown":"color-brown-marrom.png",
    "dog":"pet-dog-cachorro.png","cat":"pet-cat-gato.png","fish":"pet-fish-peixe.png","bird":"pet-bird-passaro.png","hamster":"pet-hamster.png",
    "rabbit":"pet-rabbit-coelho.png","turtle":"pet-turtle-tartaruga.png","cow":"animal-cow-vaca.png","duck":"animal-duck-pato.png",
    "horse":"animal-horse-cavalo.png","pig":"animal-pig-porco.png","sheep":"animal-sheep-ovelha.png",
    "big cat":"big cat - gato grande.png","small cat":"small cat -gato pequeno.png","big dog":"big dog -cachorro grande.png","small dog":"small dog -cachorro pequeno.png",
    "head":"body-part-touch-head-tocar-cabeca.png","hands":"body-part-touch-hands-tocar-maos.png","arms":"body-part-touch-arms-tocar-bracos.png",
    "knees":"body-part-touch-knees-tocar-joelhos.png","feet":"body-part-touch-feet-tocar-pes.png",
    "apple":"Apple - maçã.png","banana":"Banana.png","grapes":"Grapes - uvas.png","grape":"Grapes - uvas.png","pear":"Pear - pera.png",
    "papaya":"Papaya - mamão.png","melon":"Melon - melão.png","carrot":"Carrot - cenoura.png","potato":"Potato - batata.png","tomato":"Tomato - tomate.png",
    "backpack":"school-object-backpack-mochila.png","pencil":"school-object-pencil-lapis.png","ruler":"school-object-ruler-regua.png","eraser":"school-object-eraser-borracha.png",
    "wake up":"routine-wake-up-acordar.png","brush teeth":"routine-brush-teeth-escovar-dentes.png","go to school":"routine-go-to-school-ir-para-escola.png",
    "have lunch":"routine-have-lunch-almocar.png","play":"routine-play-brincar.png","read":"routine-read-ler.png","draw":"routine-draw-desenhar.png",
    "rest":"routine-rest-descansar.png","go to sleep":"routine-go-to-sleep-ir-dormir.png","rain":"weather-rain-chuva.png"
  });

  const NUMBER_WORDS = Object.freeze({one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20});
  const COLORS = new Set(["red","blue","yellow","green","orange","pink","black","white","brown"]);
  const SHAPES = new Set(["circle","square","rectangle","triangle","star"]);
  const BODY = Object.freeze({head:"head",eye:"eye",eyes:"eye",ear:"ear",ears:"ear",nose:"nose",mouth:"mouth",knee:"knee",knees:"knee",shoulder:"shoulders",shoulders:"shoulders",hand:"hands",hands:"hands",arm:"arms",arms:"arms",leg:"legs",legs:"legs",foot:"feet",feet:"feet",finger:"finger",fingers:"finger"});

  function phraseCore(label) {
    let key = normalize(label);
    const prefixes = [
      "its a ","its an ","it is a ","it is an ","this is a ","this is an ","this is my ",
      "these are ","those are ","touch your ","point to your ","show me your ","i have a ","i have an ",
      "my favorite toy is a ","my favorite toy is ","my favourite toy is a ","my favourite toy is "
    ];
    for (const prefix of prefixes) if (key.startsWith(prefix)) key = key.slice(prefix.length).trim();
    return key;
  }

  function officialExact(label) {
    const raw = normalize(label);
    const core = phraseCore(label);
    const file = OFFICIAL[raw] || OFFICIAL[core];
    return file ? { src: bank(file), status: "repository-asset", visualKey: `official:${file}`, canonical: core || raw } : null;
  }

  function semanticShape(label) {
    if (!v22Factory || typeof v22Factory.resolveVisual !== "function") return null;
    const words = normalize(label).split(" ").filter(Boolean);
    const shapeWord = words.find((word) => SHAPES.has(word.replace(/s$/, "")));
    if (!shapeWord) return null;
    const shape = shapeWord.replace(/s$/, "");
    const color = words.find((word) => COLORS.has(word)) || "blue";
    let count = 1;
    for (const word of words) {
      if (NUMBER_WORDS[word]) { count = NUMBER_WORDS[word]; break; }
      if (/^\d+$/.test(word)) { count = Math.max(1, Math.min(20, Number(word))); break; }
    }
    const spec = count > 1
      ? { kind:"shape-count", shape, color, count, alt:String(label) }
      : { kind:"shape", shape, color, alt:String(label) };
    const visual = v22Factory.resolveVisual(spec);
    if (!visual?.src) return null;
    return { src:visual.src, status:"semantic-vector", visualKey:`shape:${shape}:${color}:${count}`, canonical:`${count}-${color}-${shape}` };
  }

  function semanticBody(label) {
    if (!v22Factory || typeof v22Factory.resolveVisual !== "function") return null;
    const words = normalize(label).split(" ").filter(Boolean);
    const bodyWord = words.find((word) => BODY[word]);
    if (!bodyWord) return null;
    const part = BODY[bodyWord];
    let count = 1;
    for (const word of words) {
      if (NUMBER_WORDS[word]) { count = NUMBER_WORDS[word]; break; }
      if (/^\d+$/.test(word)) { count = Math.max(1, Math.min(2, Number(word))); break; }
    }
    const countSensitive = new Set(["hands","arms","legs","feet"]);
    const visualCount = countSensitive.has(part) ? count : 1;
    const visual = v22Factory.resolveVisual({ kind:"body", part, count:visualCount, alt:String(label) });
    if (!visual?.src) return null;
    return { src:visual.src, status:"semantic-vector", visualKey:`body:${part}:${visualCount}`, canonical:`${visualCount}-${part}` };
  }

  function resolveVisual(label) {
    return officialExact(label) || semanticShape(label) || semanticBody(label) || null;
  }

  function sourceLabels(question) {
    const stored = question?.metadata?.sourceAlternativesV23;
    if (Array.isArray(stored) && stored.length) return stored.map(String);
    return (question?.alternatives || []).map((alt) => String(alt?.metadata?.sourceWrittenLabel ?? alt?.audio?.text ?? alt?.text ?? ""));
  }

  function sourceCorrectLabel(question) {
    const stored = String(question?.metadata?.sourceAnswerV23 ?? "").trim();
    if (stored) return stored;
    const labels = sourceLabels(question);
    const value = String(question?.answer?.value ?? "");
    const index = (question?.alternatives || []).findIndex((alt) => String(alt?.id ?? "") === value);
    return index >= 0 ? labels[index] : "";
  }

  function optionId(sourceIndex) {
    return `opt-${sourceIndex + 1}`;
  }

  function completeMatching(question) {
    const labels = sourceLabels(question);
    const correctLabel = sourceCorrectLabel(question);
    const correctNorm = normalize(correctLabel);
    const entries = labels.map((label, sourceIndex) => ({ label:String(label), sourceIndex, resolved:resolveVisual(label) }));
    const correctEntry = entries.find((entry) => normalize(entry.label) === correctNorm);
    if (!correctEntry?.resolved) return { ok:false, reason:"SOURCE_CORRECT_HAS_NO_SAFE_VISUAL" };

    const ordered = [correctEntry, ...entries.filter((entry) => entry !== correctEntry)];
    const selected = [];
    const usedLabels = new Set();
    const usedVisuals = new Set();
    for (const entry of ordered) {
      if (!entry.resolved) continue;
      const labelKey = normalize(entry.label);
      const visualKey = entry.resolved.visualKey || entry.resolved.src;
      if (!labelKey || usedLabels.has(labelKey) || usedVisuals.has(visualKey)) continue;
      usedLabels.add(labelKey);
      usedVisuals.add(visualKey);
      selected.push(entry);
    }
    if (selected.length < 2) return { ok:false, reason:"LESS_THAN_TWO_COMPLETE_DISTINCT_PAIRS", available:selected.length };
    if (!selected.some((entry) => normalize(entry.label) === correctNorm)) return { ok:false, reason:"SOURCE_CORRECT_NOT_INCLUDED" };

    const assets = {};
    const leftItems = [];
    const rightItems = [];
    const pairs = [];
    for (const entry of selected) {
      const id = optionId(entry.sourceIndex);
      const leftId = `audio-${id}`;
      const rightId = `visual-${id}`;
      const assetKey = `asset-${id}`;
      assets[assetKey] = entry.resolved.src;
      leftItems.push({ id:leftId, spokenText:entry.label, speechLocale:"en-US", audioDescription:`Ouvir ${entry.sourceIndex + 1}` });
      rightItems.push({ id:rightId, imageAssetKey:assetKey, alt:entry.label });
      pairs.push({ leftId, rightId });
    }

    question.alternatives = selected.map((entry) => ({
      id:optionId(entry.sourceIndex),
      text:`🔊 ${String.fromCharCode(65 + entry.sourceIndex)}`,
      audio:{ enabled:true, text:entry.label, language:"en-US", role:"option" },
      metadata:{ sourceWrittenLabel:entry.label, writtenLabelVisibleBeforeAnswer:false }
    }));
    const correctSelected = selected.find((entry) => normalize(entry.label) === correctNorm);
    question.answer = { type:"single", value:optionId(correctSelected.sourceIndex) };
    question.delivery = { ...(question.delivery || {}), mechanic:"matching", allowImage:true, allowAudio:true };
    question.image = { enabled:false, src:null, alt:"" };
    if (question.media?.image) question.media.image = { enabled:false, src:null, alt:"" };
    question.metadata = question.metadata || {};
    question.metadata.matching = {
      mode:"audio-image",
      leftTitle:"Ouça",
      rightTitle:"Ligue à imagem",
      assets,
      leftItems,
      rightItems,
      pairs,
      behavior:{ shuffleLeft:selected.length > 2, shuffleRight:true, connectionMode:"1x1", interactionMode:"smart", lockCorrectPairsOnRetry:true, allowUnpairedDistractors:false }
    };
    question.statement = "🔊🖼️ OUÇA E LIGUE AOS PARES";
    question.instruction = question.statement;
    question.metadata.optionPresentation = "COMPLETE_AUDIO_IMAGE_MATCHING";
    question.metadata.englishReadingRequired = false;
    question.metadata.readingDependency = "NÃO";
    question.metadata.manualReviewMatching = {
      version:VERSION,
      format:"audio-image-complete-pairs",
      pairCount:selected.length,
      sourceCorrectIncluded:true,
      sourceAnswerV23:question.metadata.sourceAnswerV23 ?? correctLabel,
      visualStatuses:selected.map((entry) => entry.resolved.status)
    };
    return { ok:true, pairCount:selected.length, labels:selected.map((entry) => entry.label) };
  }

  function restoreAsDragDropChoice(question, reason) {
    const labels = sourceLabels(question);
    const correctLabel = sourceCorrectLabel(question);
    const correctNorm = normalize(correctLabel);
    const correctIndex = labels.findIndex((label) => normalize(label) === correctNorm);
    if (correctIndex < 0) throw new Error(`[DuduQ Year2 Manual Review v2] Gabarito não localizado em ${question.id}.`);

    const existingAudio = clone(question.audio || question.media?.audio || question.metadata?.stimulusAudio || null);
    const targetVisual = question?.image?.enabled && question?.image?.src ? { src:question.image.src, alt:question.image.alt || "" } : null;
    question.alternatives = labels.map((label, index) => ({
      id:optionId(index),
      text:`🔊 ${String.fromCharCode(65 + index)}`,
      audio:{ enabled:true, text:String(label), language:"en-US", role:"option" },
      metadata:{ sourceWrittenLabel:String(label), writtenLabelVisibleBeforeAnswer:false }
    }));
    question.answer = { type:"pairs", value:[{ source:optionId(correctIndex), target:"response-target" }] };
    question.delivery = { ...(question.delivery || {}), mechanic:"drag-drop", allowImage:Boolean(targetVisual), allowAudio:true };
    question.image = { enabled:false, src:null, alt:"" };
    if (question.media?.image) question.media.image = { enabled:false, src:null, alt:"" };
    if (existingAudio) question.audio = existingAudio;
    delete question.metadata.matching;
    question.metadata.targets = [{
      id:"response-target",
      label:"ARRASTE A RESPOSTA",
      capacity:1,
      kind:"box",
      ...(targetVisual ? { imageSrc:targetVisual.src, alt:targetVisual.alt || "Imagem da atividade" } : {})
    }];
    question.metadata.optionAudioRequired = true;
    question.metadata.optionPresentation = "AUDIO_PRIMARY_DRAG_DROP_CHOICE";
    question.metadata.manualReviewFallback = {
      version:VERSION,
      from:"matching",
      to:"drag-drop",
      reason,
      sourceAnswerPreserved:true
    };
    question.statement = targetVisual ? "👀🔊 VEJA, OUÇA E ARRASTE" : "🔊 OUÇA E ARRASTE A RESPOSTA";
    question.instruction = question.statement;
    return { mechanic:"drag-drop", reason };
  }

  function upgradeTargetShooter(question) {
    const target = question?.metadata?.targetShooter;
    if (!Array.isArray(target?.items)) return 0;
    const labels = sourceLabels(question);
    let changed = 0;
    target.items = target.items.map((item, index) => {
      const label = labels[index] || item?.alt || item?.label || "";
      const visual = resolveVisual(label);
      if (!visual) return item;
      changed += 1;
      return { ...item, image:visual.src, imageSrc:visual.src, imageUrl:visual.src, alt:item?.alt || label, label:"", display:"image", visualStatus:visual.status };
    });
    return changed;
  }

  function upgradePrimaryImage(question) {
    const label = sourceCorrectLabel(question);
    const visual = resolveVisual(label);
    if (!visual || !question?.image || typeof question.image !== "object") return 0;
    if (/^https?:\/\//i.test(String(question.image.src || "")) && !/Imagem%20generica\.svg/i.test(String(question.image.src || ""))) return 0;
    question.image = { enabled:true, src:visual.src, alt:question.image.alt || label };
    question.metadata = question.metadata || {};
    question.metadata.visualStatus = visual.status;
    return 1;
  }

  function upgradeDragDropTargets(question) {
    if (question?.delivery?.mechanic !== "drag-drop") return 0;
    const label = sourceCorrectLabel(question);
    const visual = resolveVisual(label);
    if (!visual) return 0;
    let changed = 0;
    const arrays = [question?.metadata?.targets, question?.metadata?.dragDrop?.targets];
    for (const items of arrays) {
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const current = String(item.imageSrc || item.image || item.imageUrl || "");
        if (!current || !/^https?:\/\//i.test(current) || /Imagem%20generica\.svg/i.test(current)) {
          item.imageSrc = visual.src;
          item.image = visual.src;
          item.imageUrl = visual.src;
          item.alt = item.alt || label;
          changed += 1;
        }
      }
    }
    return changed;
  }

  function regroup(module) {
    const flat = (module.activities || []).flatMap((activity) => (activity.questions || []).map((question) => ({ question, topic:String(question?.metadata?.topic || activity.topic || activity.title || "").toUpperCase() })));
    const activities = [];
    let current = null;
    for (const entry of flat) {
      const q = entry.question;
      const mechanic = q?.delivery?.mechanic || "drag-drop";
      const topic = entry.topic;
      const forceOwn = q?.metadata?.forceOwnActivity === true;
      if (forceOwn || !current || current.mechanic !== mechanic || current.topic !== topic || current.questions.length >= 4) {
        current = {
          id:`${String(q.id).toLowerCase()}-${mechanic}-${topic.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`,
          title:topic || module.title,
          topic:topic || module.title,
          mechanic,
          skill:q.skill,
          questions:[]
        };
        activities.push(current);
      }
      current.questions.push(q);
      if (forceOwn) current = null;
    }
    return activities;
  }

  function distribution(activities) {
    const out = {};
    for (const activity of activities || []) for (const q of activity.questions || []) {
      const mechanic = q?.delivery?.mechanic || activity.mechanic || "unknown";
      out[mechanic] = (out[mechanic] || 0) + 1;
    }
    return out;
  }

  function buildModule(config) {
    const built = clone(upstreamFactory.buildModule(config));
    const beforeIds = (built.activities || []).flatMap((activity) => (activity.questions || []).map((q) => q.id));
    const audit = {
      version:VERSION,
      officialLogo:OFFICIAL_LOGO,
      matchingFormat:"variable-complete-audio-image-pairs",
      matchingRebuilt:[],
      matchingFallbacks:[],
      smartVisualUpgrades:0,
      sourceIdsPreserved:true,
      sourceOrderPreserved:true
    };

    built.version = VERSION;
    built.intro = { ...(built.intro || {}), collectionName:"EduQ Play", collectionLogo:OFFICIAL_LOGO, collectionAlt:"EduQ Play" };
    built.visualPolicy = {
      ...(built.visualPolicy || {}),
      mode:"OFFICIAL_ASSET_BANK_FIRST_WITH_SEMANTIC_FALLBACK",
      repositoryAssetsPreferred:true,
      provisionalEmojiVectorAllowed:false,
      semanticDeterministicFallbackAllowed:true,
      smartAssetResolution:true
    };

    for (const activity of built.activities || []) {
      for (const question of activity.questions || []) {
        const mechanic = question?.delivery?.mechanic || activity.mechanic;
        if (mechanic === "matching") {
          const result = completeMatching(question);
          if (result.ok) audit.matchingRebuilt.push({ id:question.id, pairCount:result.pairCount, labels:result.labels });
          else audit.matchingFallbacks.push({ id:question.id, ...restoreAsDragDropChoice(question, result.reason) });
        }
        audit.smartVisualUpgrades += upgradeTargetShooter(question);
        audit.smartVisualUpgrades += upgradePrimaryImage(question);
        audit.smartVisualUpgrades += upgradeDragDropTargets(question);
      }
    }

    built.activities = regroup(built);
    built.mechanicDistribution = distribution(built.activities);
    const afterIds = built.activities.flatMap((activity) => (activity.questions || []).map((q) => q.id));
    if (JSON.stringify(beforeIds) !== JSON.stringify(afterIds)) {
      throw new Error("[DuduQ Year2 Manual Review v2] IDs/ordem foram alterados.");
    }
    for (const q of built.activities.flatMap((activity) => activity.questions || [])) {
      if (!q?.metadata?.sourceAnswerV23) throw new Error(`[DuduQ Year2 Manual Review v2] sourceAnswerV23 ausente em ${q?.id || "sem-id"}.`);
      if (q.delivery?.mechanic === "matching") {
        const m = q.metadata?.matching || {};
        const n = m.pairs?.length || 0;
        if (n < 2 || m.leftItems?.length !== n || m.rightItems?.length !== n || m.behavior?.allowUnpairedDistractors === true) {
          throw new Error(`[DuduQ Year2 Manual Review v2] Matching incompleto em ${q.id}.`);
        }
        if (q.metadata?.manualReviewMatching?.sourceCorrectIncluded !== true) {
          throw new Error(`[DuduQ Year2 Manual Review v2] Gabarito fora dos pares em ${q.id}.`);
        }
      }
    }

    built.manualReviewHotfix = audit;
    return Object.freeze(built);
  }

  window.DuduQYear2V23Factory = Object.freeze({
    ...upstreamFactory,
    version:VERSION,
    buildModule,
    __manualReviewHotfixApplied:true,
    manualReviewHotfixVersion:VERSION,
    officialEduQPlayLogo:OFFICIAL_LOGO,
    resolveOfficialYear2Image:(label) => resolveVisual(label)?.src || null,
    resolveYear2Visual:resolveVisual
  });
})();
