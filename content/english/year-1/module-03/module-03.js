/* =========================================================
   DUDUQ CONTENT — ENGLISH — YEAR 1 — MODULE 03
   Colors & School Objects
   Version 1.1.0 — PEDAGOGY v1.0 / FACTORY REPO PACKAGE

   SOURCE:
   - DUDUQ_Ingles_1ao5.docx — Revisão Pedagógica Integral v2.2
   - DUDUQ_Documento_Mestre_v1.0(5).docx — Conteúdo & Orquestração v1.0
   - DUDUQ_FACTORY_PEDAGOGICAL_SPECIFICATION_v1.0 — NORMATIVE / PRODUCTION

   FACTORY:
   - Prompt Mestre DuduQ Factory v1.0
   - Prompt Complementar de Entrega v1.0
   - Smart Assets: ON
   - Integration B: semantic/native contract applied
   - Pedagogy: Y1_EARLY_LITERACY / R0 / non-reader test PASS
   - Engine baseline: Canary R124
   - GitHub write: NO

   DELIVERY STATUS:
   - REVIEW_REQUIRED_MEDIA_GAPS

   IMPORTANT:
   - Procedural SVGs in PREVIEW_VISUALS are review-only substitutes for
     ASSET_GAP entries. Replace through Smart Assets before commercial READY.
   - Missing recorded MP3s use the Engine Speech Synthesis fallback.
     Produce the AUDIO_GAP manifest before commercial READY.
   ========================================================= */

(function () {
  "use strict";

  const VERSION = "1.1.0";
  const YEAR = 1;
  const MODULE = 3;
  const BASE = "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/";
  const IMAGE_BASE = BASE + "Imagens%20Ilustrativa/";
  const AUDIO_BASE = BASE + "Audios/1_ANO/M03/";

  window.DUDUQ_CONTENT = window.DUDUQ_CONTENT || {};
  window.DUDUQ_CONTENT.english = window.DUDUQ_CONTENT.english || {};
  window.DUDUQ_CONTENT.english.year1 = window.DUDUQ_CONTENT.english.year1 || {};

  if (window.DUDUQ_CONTENT.english.year1.module03?.version === VERSION) {
    return;
  }

  function svgAsset(svg) {
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  function countDots(count) {
    const cols = Math.min(5, Math.max(2, Math.ceil(Math.sqrt(count))));
    const rows = Math.ceil(count / cols);
    const width = 560;
    const height = 360;
    const gapX = width / (cols + 1);
    const gapY = height / (rows + 1);
    let circles = "";
    for (let i = 0; i < count; i += 1) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      circles += `<circle cx="${Math.round(gapX * (col + 1))}" cy="${Math.round(gapY * (row + 1))}" r="32" fill="#42A5F5" stroke="#183B66" stroke-width="5"/>`;
    }
    return svgAsset(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" rx="34" fill="#F7FBFF"/>${circles}</svg>`);
  }

  function colorBlock(fill) {
    return svgAsset(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 360"><rect width="560" height="360" rx="36" fill="#F7FBFF"/><rect x="120" y="55" width="320" height="250" rx="42" fill="${fill}" stroke="#183B66" stroke-width="8"/></svg>`);
  }

  function bodyPreview(part) {
    const regions = {
      head: [280,80,42,42],
      hands: [145,205,34,34],
      legs: [235,290,45,60],
      arms: [185,175,42,75],
      feet: [235,340,55,25]
    };
    const r = regions[part] || regions.head;
    return svgAsset(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 400">
      <rect width="560" height="400" rx="36" fill="#F7FBFF"/>
      <circle cx="280" cy="82" r="44" fill="#F2C7A5" stroke="#183B66" stroke-width="5"/>
      <rect x="240" y="128" width="80" height="125" rx="34" fill="#90CAF9" stroke="#183B66" stroke-width="5"/>
      <line x1="245" y1="155" x2="160" y2="215" stroke="#183B66" stroke-width="18" stroke-linecap="round"/>
      <line x1="315" y1="155" x2="400" y2="215" stroke="#183B66" stroke-width="18" stroke-linecap="round"/>
      <line x1="260" y1="245" x2="235" y2="345" stroke="#183B66" stroke-width="22" stroke-linecap="round"/>
      <line x1="300" y1="245" x2="325" y2="345" stroke="#183B66" stroke-width="22" stroke-linecap="round"/>
      <ellipse cx="${r[0]}" cy="${r[1]}" rx="${r[2]}" ry="${r[3]}" fill="none" stroke="#FF7043" stroke-width="12"/>
    </svg>`);
  }

  function simplePet(kind, fill, scale = 1) {
    const s = Math.max(.55, Math.min(1.25, Number(scale) || 1));
    const bodyW = 150 * s;
    const bodyH = 100 * s;
    const x = 280 - bodyW / 2;
    const y = 200 - bodyH / 2;
    const ears = kind === "rabbit"
      ? `<ellipse cx="${235}" cy="${95}" rx="18" ry="58" fill="${fill}"/><ellipse cx="${325}" cy="${95}" rx="18" ry="58" fill="${fill}"/>`
      : `<path d="M220 125 L245 72 L270 130 Z" fill="${fill}"/><path d="M290 130 L315 72 L340 125 Z" fill="${fill}"/>`;
    return svgAsset(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 400">
      <rect width="560" height="400" rx="36" fill="#F7FBFF"/>
      ${ears}
      <ellipse cx="280" cy="145" rx="${70*s}" ry="${62*s}" fill="${fill}" stroke="#183B66" stroke-width="5"/>
      <ellipse cx="280" cy="245" rx="${bodyW/2}" ry="${bodyH/2}" fill="${fill}" stroke="#183B66" stroke-width="5"/>
      <circle cx="255" cy="135" r="7" fill="#183B66"/><circle cx="305" cy="135" r="7" fill="#183B66"/>
      <path d="M270 160 Q280 170 290 160" fill="none" stroke="#183B66" stroke-width="5" stroke-linecap="round"/>
    </svg>`);
  }

  function pairSizePreview(kind) {
    const a = kind === "cat" ? "#B0BEC5" : "#C58B5B";
    return svgAsset(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 400">
      <rect width="760" height="400" rx="36" fill="#F7FBFF"/>
      <g transform="translate(30 30) scale(.65)">
        <ellipse cx="280" cy="145" rx="70" ry="62" fill="${a}" stroke="#183B66" stroke-width="5"/>
        <ellipse cx="280" cy="245" rx="150" ry="100" fill="${a}" stroke="#183B66" stroke-width="5"/>
        <circle cx="255" cy="135" r="7" fill="#183B66"/><circle cx="305" cy="135" r="7" fill="#183B66"/>
      </g>
      <g transform="translate(330 -10) scale(1.0)">
        <ellipse cx="280" cy="145" rx="70" ry="62" fill="${a}" stroke="#183B66" stroke-width="5"/>
        <ellipse cx="280" cy="245" rx="150" ry="100" fill="${a}" stroke="#183B66" stroke-width="5"/>
        <circle cx="255" cy="135" r="7" fill="#183B66"/><circle cx="305" cy="135" r="7" fill="#183B66"/>
      </g>
    </svg>`);
  }

  function simpleSchoolCount(count, color = "#90CAF9", shape = "pencil") {
    const width = 720;
    const height = 400;
    let marks = "";
    const cols = Math.min(6, count);
    for (let i = 0; i < count; i += 1) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 70 + col * 105;
      const y = 85 + row * 155;
      if (shape === "ruler") {
        marks += `<rect x="${x}" y="${y}" width="78" height="28" rx="8" fill="${color}" stroke="#183B66" stroke-width="4"/>`;
      } else if (shape === "crayon") {
        marks += `<rect x="${x}" y="${y}" width="34" height="94" rx="10" fill="${color}" stroke="#183B66" stroke-width="4"/>`;
      } else {
        marks += `<rect x="${x}" y="${y}" width="28" height="110" rx="8" fill="${color}" stroke="#183B66" stroke-width="4"/>`;
      }
    }
    return svgAsset(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" rx="36" fill="#F7FBFF"/>${marks}</svg>`);
  }

  const PREVIEW_VISUALS = Object.freeze({
    "count-2": countDots(2),
    "count-4": countDots(4),
    "count-6": countDots(6),
    "count-8": countDots(8),
    "count-10": countDots(10),
    "color-red": colorBlock("#E53935"),
    "color-blue": colorBlock("#1E88E5"),
    "color-yellow": colorBlock("#FDD835"),
    "color-green": colorBlock("#43A047"),
    "three-rulers": simpleSchoolCount(3, "#90CAF9", "ruler"),
    "body-head": bodyPreview("head"),
    "body-hands": bodyPreview("hands"),
    "body-legs": bodyPreview("legs"),
    "body-arms": bodyPreview("arms"),
    "body-feet": bodyPreview("feet"),
    "big-small-dogs": pairSizePreview("dog"),
    "big-small-cats": pairSizePreview("cat"),
    "brown-dog": simplePet("dog", "#8D6E63", 1),
    "person-dog": simplePet("dog", "#C58B5B", .8),
    "person-rabbit": simplePet("rabbit", "#CFD8DC", .8),
    "person-cat": simplePet("cat", "#B0BEC5", .8),
    "small-white-cat": simplePet("cat", "#FAFAFA", .65),
    "morning-leo": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Good%20Morning.png",
    "six-blue-pencils": simpleSchoolCount(6, "#42A5F5", "pencil"),
    "five-blue-pencils": simpleSchoolCount(5, "#42A5F5", "pencil"),
    "six-blue-rulers": simpleSchoolCount(6, "#42A5F5", "ruler"),
    "red-backpack": colorBlock("#E53935"),
    "three-orange-crayons": simpleSchoolCount(3, "#FB8C00", "crayon"),
    "come-in-scene": bodyPreview("head"),
    "small-turtle": simplePet("turtle", "#66BB6A", .65),
    "four-rulers": simpleSchoolCount(4, "#90CAF9", "ruler"),
    "five-rulers": simpleSchoolCount(5, "#90CAF9", "ruler"),
    "six-rulers": simpleSchoolCount(6, "#90CAF9", "ruler"),
    "touch-legs": bodyPreview("legs"),
    "big-brown-dog": simplePet("dog", "#795548", 1.15)
  });

  const VISUAL_META = Object.freeze({
    "backpack": {
      "status": "resolved",
      "imageAsset": "backpack",
      "imageCategory": "school",
      "file": "Mochila.png",
      "url": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Mochila.png"
    },
    "blue pencil": {
      "status": "resolved",
      "imageAsset": "blue pencil",
      "imageCategory": "school",
      "file": "Lápis azul.png",
      "url": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/L%C3%A1pis%20azul.png"
    },
    "color-blue": {
      "status": "gap-preview",
      "imageAsset": "color-blue",
      "imageCategory": "unknown",
      "file": null,
      "url": null
    },
    "color-green": {
      "status": "gap-preview",
      "imageAsset": "color-green",
      "imageCategory": "unknown",
      "file": null,
      "url": null
    },
    "color-red": {
      "status": "gap-preview",
      "imageAsset": "color-red",
      "imageCategory": "unknown",
      "file": null,
      "url": null
    },
    "color-yellow": {
      "status": "gap-preview",
      "imageAsset": "color-yellow",
      "imageCategory": "unknown",
      "file": null,
      "url": null
    },
    "eraser": {
      "status": "resolved",
      "imageAsset": "eraser",
      "imageCategory": "school",
      "file": "Borracha.png",
      "url": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Borracha.png"
    },
    "orange crayon": {
      "status": "resolved",
      "imageAsset": "orange crayon",
      "imageCategory": "school",
      "file": "Giz de cera laranja.png",
      "url": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Giz%20de%20cera%20laranja.png"
    },
    "pencil": {
      "status": "resolved",
      "imageAsset": "pencil",
      "imageCategory": "school",
      "file": "Lápis.png",
      "url": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/L%C3%A1pis.png"
    },
    "pink pencil case": {
      "status": "resolved",
      "imageAsset": "pink pencil case",
      "imageCategory": "school",
      "file": "Estojo rosa.png",
      "url": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Estojo%20rosa.png"
    },
    "ruler": {
      "status": "resolved",
      "imageAsset": "ruler",
      "imageCategory": "school",
      "file": "Régua.png",
      "url": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/R%C3%A9gua.png"
    },
    "three-rulers": {
      "status": "gap-preview",
      "imageAsset": "three-rulers",
      "imageCategory": "unknown",
      "file": null,
      "url": null
    }
  });

  const VISUALS = Object.freeze({
    "hello": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Hello.png",
    "goodbye": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Bye.png",
    "good morning": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Good%20Morning.png",
    "good afternoon": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Good%20Afternoon.png",
    "my name": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/My%20name.png",
    "boy": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Boy.png",
    "girl": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Girl.png",
    "pencil": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/L%C3%A1pis.png",
    "eraser": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Borracha.png",
    "ruler": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/R%C3%A9gua.png",
    "backpack": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Mochila.png",
    "blue pencil": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/L%C3%A1pis%20azul.png",
    "red pencil": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/L%C3%A1pis%20vermelho.png",
    "orange crayon": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Giz%20de%20cera%20laranja.png",
    "pink pencil case": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Estojo%20rosa.png",
    "dog": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Cachorro.png",
    "cat": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Gato.png",
    "fish": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Peixe.png",
    "rabbit": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Coelho.png",
    "hamster": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Hamister.png",
    "bird": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Pass%C3%A1ro.png",
    "turtle": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Tartaruga.png",
    "sit down": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Sentada.png",
    "stand up": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Em%20p%C3%A9.png",
    "quiet": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Sil%C3%AAncio.png",
    "touch head": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Tocando%20na%20cabe%C3%A7a.png",
    "touch hands": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Tocando%20as%20m%C3%A3os.png",
    "touch arms": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Tocando%20os%20bra%C3%A7os.png",
    "touch feet": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Tocando%20os%20p%C3%A9s.png",
    "body-head": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Tocando%20na%20cabe%C3%A7a.png",
    "body-hands": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Tocando%20as%20m%C3%A3os.png",
    "body-arms": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Tocando%20os%20bra%C3%A7os.png",
    "body-feet": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Tocando%20os%20p%C3%A9s.png",
    ...PREVIEW_VISUALS
  });

  const AUDIO_CATALOG = Object.freeze({
    "EN1-M3-01": {
      "mechanic": "smart-sentence",
      "instruction": {
        "text": "Observe a cor da imagem e escolha seu nome em inglês.",
        "language": "pt-BR",
        "src": "",
        "plannedSrc": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Audios/1_ANO/M03/ING_1ANO_M03_EN1-M3-01_SMART-SENTENCE_ENUNCIADO_PTBR.mp3",
        "file": "ING_1ANO_M03_EN1-M3-01_SMART-SENTENCE_ENUNCIADO_PTBR.mp3"
      },
      "stimuli": []
    },
    "EN1-M3-02": {
      "mechanic": "smart-sentence",
      "instruction": {
        "text": "Qual palavra em inglês nomeia a cor mostrada?",
        "language": "pt-BR",
        "src": "",
        "plannedSrc": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Audios/1_ANO/M03/ING_1ANO_M03_EN1-M3-02_SMART-SENTENCE_ENUNCIADO_PTBR.mp3",
        "file": "ING_1ANO_M03_EN1-M3-02_SMART-SENTENCE_ENUNCIADO_PTBR.mp3"
      },
      "stimuli": []
    },
    "EN1-M3-03": {
      "mechanic": "smart-sentence",
      "instruction": {
        "text": "Toque no cartão com o nome da cor da imagem.",
        "language": "pt-BR",
        "src": "",
        "plannedSrc": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Audios/1_ANO/M03/ING_1ANO_M03_EN1-M3-03_SMART-SENTENCE_ENUNCIADO_PTBR.mp3",
        "file": "ING_1ANO_M03_EN1-M3-03_SMART-SENTENCE_ENUNCIADO_PTBR.mp3"
      },
      "stimuli": []
    },
    "EN1-M3-04": {
      "mechanic": "smart-sentence",
      "instruction": {
        "text": "A imagem destaca uma cor. Escolha a palavra correta em inglês.",
        "language": "pt-BR",
        "src": "",
        "plannedSrc": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Audios/1_ANO/M03/ING_1ANO_M03_EN1-M3-04_SMART-SENTENCE_ENUNCIADO_PTBR.mp3",
        "file": "ING_1ANO_M03_EN1-M3-04_SMART-SENTENCE_ENUNCIADO_PTBR.mp3"
      },
      "stimuli": []
    },
    "EN1-M3-05": {
      "mechanic": "smart-sentence",
      "instruction": {
        "text": "Observe o objeto e escolha seu nome em inglês.",
        "language": "pt-BR",
        "src": "",
        "plannedSrc": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Audios/1_ANO/M03/ING_1ANO_M03_EN1-M3-05_SMART-SENTENCE_ENUNCIADO_PTBR.mp3",
        "file": "ING_1ANO_M03_EN1-M3-05_SMART-SENTENCE_ENUNCIADO_PTBR.mp3"
      },
      "stimuli": []
    },
    "EN1-M3-06": {
      "mechanic": "smart-sentence",
      "instruction": {
        "text": "Qual palavra em inglês nomeia o objeto da imagem?",
        "language": "pt-BR",
        "src": "",
        "plannedSrc": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Audios/1_ANO/M03/ING_1ANO_M03_EN1-M3-06_SMART-SENTENCE_ENUNCIADO_PTBR.mp3",
        "file": "ING_1ANO_M03_EN1-M3-06_SMART-SENTENCE_ENUNCIADO_PTBR.mp3"
      },
      "stimuli": []
    },
    "EN1-M3-07": {
      "mechanic": "smart-sentence",
      "instruction": {
        "text": "Toque no cartão com o nome em inglês do objeto.",
        "language": "pt-BR",
        "src": "",
        "plannedSrc": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Audios/1_ANO/M03/ING_1ANO_M03_EN1-M3-07_SMART-SENTENCE_ENUNCIADO_PTBR.mp3",
        "file": "ING_1ANO_M03_EN1-M3-07_SMART-SENTENCE_ENUNCIADO_PTBR.mp3"
      },
      "stimuli": []
    },
    "EN1-M3-08": {
      "mechanic": "smart-sentence",
      "instruction": {
        "text": "A imagem mostra um objeto escolar. Escolha o nome correto.",
        "language": "pt-BR",
        "src": "",
        "plannedSrc": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Audios/1_ANO/M03/ING_1ANO_M03_EN1-M3-08_SMART-SENTENCE_ENUNCIADO_PTBR.mp3",
        "file": "ING_1ANO_M03_EN1-M3-08_SMART-SENTENCE_ENUNCIADO_PTBR.mp3"
      },
      "stimuli": []
    },
    "EN1-M3-09": {
      "mechanic": "smart-sentence",
      "instruction": {
        "text": "Uma imagem mostra um lápis azul. Qual expressão corresponde à imagem?",
        "language": "pt-BR",
        "src": "",
        "plannedSrc": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Audios/1_ANO/M03/ING_1ANO_M03_EN1-M3-09_SMART-SENTENCE_ENUNCIADO_PTBR.mp3",
        "file": "ING_1ANO_M03_EN1-M3-09_SMART-SENTENCE_ENUNCIADO_PTBR.mp3"
      },
      "stimuli": []
    },
    "EN1-M3-10": {
      "mechanic": "smart-sentence",
      "instruction": {
        "text": "Observe a imagem com 3 réguas. Qual expressão descreve a quantidade?",
        "language": "pt-BR",
        "src": "",
        "plannedSrc": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Audios/1_ANO/M03/ING_1ANO_M03_EN1-M3-10_SMART-SENTENCE_ENUNCIADO_PTBR.mp3",
        "file": "ING_1ANO_M03_EN1-M3-10_SMART-SENTENCE_ENUNCIADO_PTBR.mp3"
      },
      "stimuli": []
    },
    "EN1-M3-11": {
      "mechanic": "smart-sentence",
      "instruction": {
        "text": "Observe o giz de cera laranja. Qual expressão descreve o objeto?",
        "language": "pt-BR",
        "src": "",
        "plannedSrc": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Audios/1_ANO/M03/ING_1ANO_M03_EN1-M3-11_SMART-SENTENCE_ENUNCIADO_PTBR.mp3",
        "file": "ING_1ANO_M03_EN1-M3-11_SMART-SENTENCE_ENUNCIADO_PTBR.mp3"
      },
      "stimuli": []
    },
    "EN1-M3-12": {
      "mechanic": "smart-sentence",
      "instruction": {
        "text": "Observe o estojo rosa. Qual expressão descreve o objeto?",
        "language": "pt-BR",
        "src": "",
        "plannedSrc": "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Audios/1_ANO/M03/ING_1ANO_M03_EN1-M3-12_SMART-SENTENCE_ENUNCIADO_PTBR.mp3",
        "file": "ING_1ANO_M03_EN1-M3-12_SMART-SENTENCE_ENUNCIADO_PTBR.mp3"
      },
      "stimuli": []
    }
  });


  const PEDAGOGY_PROFILE = Object.freeze({
    specification: "DUDUQ_FACTORY_PEDAGOGICAL_SPECIFICATION_v1.0",
    specificationVersion: "1.0.0",
    profile: "Y1_EARLY_LITERACY",
    literacyDemand: "R0",
    readingEssential: false,
    instructionLanguage: "pt-BR",
    instructionAudioRequired: true,
    targetAudioRepeatable: true,
    uppercaseSupport: true,
    primaryModalities: ["audio", "image", "gesture", "manipulation"],
    motorPrecisionDemand: "low",
    nonReaderTest: "PASS",
    audit: "PEDAGOGICAL_PASS"
  });

  function skill(description) {
    return Object.freeze({ code: null, description });
  }

  function normalizeSemantic(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’]/g, "'")
      .toLowerCase()
      .replace(/[.!?,;:]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function iconPreview(emoji, accent = "#E3F2FD") {
    return svgAsset(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 400">
      <rect width="560" height="400" rx="42" fill="#F7FBFF"/>
      <circle cx="280" cy="200" r="132" fill="${accent}" stroke="#183B66" stroke-width="6"/>
      <text x="280" y="235" text-anchor="middle" font-size="128" font-family="system-ui,Apple Color Emoji,Segoe UI Emoji,sans-serif">${emoji}</text>
    </svg>`);
  }

  function numeralPreview(number) {
    const n = String(number || "").replace(/[^0-9]/g, "");
    return svgAsset(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 400">
      <rect width="560" height="400" rx="42" fill="#F7FBFF"/>
      <rect x="125" y="55" width="310" height="290" rx="48" fill="#FFFFFF" stroke="#183B66" stroke-width="8"/>
      <text x="280" y="265" text-anchor="middle" font-size="176" font-weight="900" font-family="system-ui,sans-serif" fill="#17375e">${n}</text>
    </svg>`);
  }

  function dayScene(kind) {
    const map = {
      morning: ["#E3F2FD", "#FFD54F", 110, 100],
      afternoon: ["#BBDEFB", "#FFB74D", 405, 125],
      night: ["#263238", "#FFF59D", 410, 95]
    };
    const cfg = map[kind] || map.morning;
    const star = kind === "night"
      ? '<circle cx="120" cy="90" r="6" fill="#FFFDE7"/><circle cx="185" cy="62" r="5" fill="#FFFDE7"/><circle cx="330" cy="70" r="6" fill="#FFFDE7"/>'
      : '';
    return svgAsset(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 400">
      <rect width="560" height="400" rx="42" fill="${cfg[0]}"/>
      ${star}<circle cx="${cfg[2]}" cy="${cfg[3]}" r="54" fill="${cfg[1]}"/>
      <path d="M0 300 Q140 220 280 300 T560 300 V400 H0Z" fill="#7CB342"/>
      <rect x="250" y="200" width="80" height="110" rx="30" fill="#90CAF9" stroke="#183B66" stroke-width="5"/>
      <circle cx="290" cy="160" r="42" fill="#F2C7A5" stroke="#183B66" stroke-width="5"/>
    </svg>`);
  }

  function greetingScene(mode) {
    if (mode === "goodbye") return iconPreview("👋", "#FFE0B2");
    if (mode === "name") return iconPreview("🪪", "#E8EAF6");
    if (mode === "age") return iconPreview("🎂", "#FCE4EC");
    if (mode === "thanks") return iconPreview("🙏", "#E8F5E9");
    if (mode === "please") return iconPreview("🤲", "#FFF3E0");
    if (mode === "enter") return iconPreview("🚪", "#E0F2F1");
    return iconPreview("🙂👋", "#E3F2FD");
  }

  function visualForText(value) {
    const raw = String(value || "");
    const n = normalizeSemantic(raw);

    const alias = {
      "hi": "hello",
      "bye": "goodbye",
      "see you": "goodbye",
      "quiet please": "quiet",
      "ao chegar": "hello",
      "ao se despedir": "goodbye",
      "despedindo-se": "goodbye",
      "dizendo boa tarde": "good afternoon",
      "personagem sentado": "sit down",
      "personagem em pe": "stand up",
      "maos tocadas": "touch hands",
      "pes tocados": "touch feet",
      "cabeca tocada": "touch head",
      "bracos tocados": "touch arms"
    };

    const direct = alias[n] || n;
    if (VISUALS[direct]) return VISUALS[direct];

    if (n === "good night") return dayScene("night");
    if (n === "come in" || n === "personagem entrando") return greetingScene("enter");
    if (n === "please") return greetingScene("please");
    if (n === "thank you") return greetingScene("thanks");
    if (n === "ao dizer a idade") return greetingScene("age");
    if (n === "dizendo o proprio nome") return greetingScene("name");

    if (/good morning/.test(n)) return dayScene("morning");
    if (/good afternoon/.test(n)) return dayScene("afternoon");
    if (/goodbye|\bbye\b|see you/.test(n)) return greetingScene("goodbye");
    if (/\bhello\b|\bhi\b/.test(n)) return greetingScene("hello");
    if (/i'?m\s+[a-z]+/.test(n)) return greetingScene("name");

    const numberWords = {
      one: 1, two: 2, three: 3, four: 4, five: 5,
      six: 6, seven: 7, eight: 8, nine: 9, ten: 10
    };
    if (numberWords[n]) return countDots(numberWords[n]);
    if (/^\d+$/.test(n)) return numeralPreview(n);

    const colors = {
      red: "#E53935", blue: "#1E88E5", yellow: "#FDD835", green: "#43A047",
      orange: "#FB8C00", pink: "#EC407A", purple: "#8E24AA", brown: "#795548", white: "#FAFAFA"
    };
    if (colors[n]) return colorBlock(colors[n]);

    let count = 1;
    for (const [word, value] of Object.entries(numberWords)) {
      if (n.includes(word + " ")) { count = value; break; }
    }
    const digit = n.match(/\b(\d{1,2})\b/);
    if (digit) count = Number(digit[1]);

    let color = "#90CAF9";
    for (const [word, value] of Object.entries(colors)) {
      if (n.includes(word)) { color = value; break; }
    }
    if (n.includes("azul")) color = colors.blue;
    if (n.includes("laranja")) color = colors.orange;
    if (n.includes("vermelh")) color = colors.red;

    if (/pencil|lapis/.test(n)) return simpleSchoolCount(count, color, "pencil");
    if (/ruler|regua/.test(n)) return simpleSchoolCount(count, color, "ruler");
    if (/crayon|giz/.test(n)) return simpleSchoolCount(count, color, "crayon");
    if (/backpack|mochila/.test(n)) return iconPreview("🎒", color === "#90CAF9" ? "#E3F2FD" : color + "33");
    if (/eraser/.test(n)) return iconPreview("🧽", "#FFF3E0");
    if (/pencil case/.test(n)) return iconPreview("🖍️", color === "#90CAF9" ? "#FCE4EC" : color + "33");

    let pet = null;
    for (const animal of ["dog", "cat", "rabbit", "turtle", "fish", "hamster", "bird"]) {
      if (n.includes(animal)) { pet = animal; break; }
    }
    if (/cachorro/.test(n)) pet = "dog";
    if (/gato/.test(n)) pet = "cat";
    if (/coelho/.test(n)) pet = "rabbit";
    if (pet) {
      if (VISUALS[pet] && !/small|big|brown|white/.test(n)) return VISUALS[pet];
      const scale = n.includes("small") ? .62 : n.includes("big") ? 1.16 : .88;
      return simplePet(pet, color, scale);
    }

    if (/\bhead\b|cabeca/.test(n)) return bodyPreview("head");
    if (/\bhands\b|maos/.test(n)) return bodyPreview("hands");
    if (/\blegs\b|pernas/.test(n)) return bodyPreview("legs");
    if (/\barms\b|bracos/.test(n)) return bodyPreview("arms");
    if (/\bfeet\b|pes/.test(n)) return bodyPreview("feet");

    if (/personagem com um/.test(n)) {
      if (/cachorro/.test(n)) return simplePet("dog", "#C58B5B", .8);
      if (/coelho/.test(n)) return simplePet("rabbit", "#CFD8DC", .8);
      if (/gato/.test(n)) return simplePet("cat", "#B0BEC5", .8);
    }

    return iconPreview("👀", "#ECEFF1");
  }

  function visualStatus(value) {
    const n = normalizeSemantic(value);
    if (VISUALS[n]) return "resolved";
    const aliases = {
      hi: "hello", bye: "goodbye", "see you": "goodbye", "quiet please": "quiet",
      "ao chegar": "hello", "ao se despedir": "goodbye", "despedindo-se": "goodbye",
      "dizendo boa tarde": "good afternoon", "personagem sentado": "sit down",
      "personagem em pe": "stand up", "maos tocadas": "touch hands", "pes tocados": "touch feet",
      "cabeca tocada": "touch head", "bracos tocados": "touch arms"
    };
    return aliases[n] && VISUALS[aliases[n]] ? "resolved" : "gap-preview";
  }

  function option(id, text, audioEnabled = false, imageSrc = null) {
    return {
      id,
      text,
      image: imageSrc
        ? { enabled: true, src: imageSrc, alt: text }
        : { enabled: false, src: null, alt: "" },
      audio: audioEnabled
        ? { enabled: true, text, language: "en-US", role: "option" }
        : { enabled: false, src: null, text: "", language: "en-US", role: "option" }
    };
  }

  function correctOption(bp) {
    return bp.options.find((entry) => entry.id === bp.correct) || bp.options[0];
  }

  function targetAudioText(bp) {
    return String(bp.audioText || correctOption(bp)?.text || bp.statement || "").trim();
  }

  function baseQuestion(bp, mechanic, metadata, answer, alternatives = null) {
    const audioEntry = AUDIO_CATALOG[bp.id] || {};
    const stimulus = Array.isArray(audioEntry.stimuli) ? audioEntry.stimuli[0] : null;
    const targetAudio = targetAudioText(bp);

    return {
      id: bp.id,
      subject: "Língua Inglesa",
      year: YEAR,
      module: MODULE,
      skill: skill(bp.skill),
      difficulty: bp.difficulty,
      statement: "Ouça e observe.",
      instruction: mechanic === "drag-drop"
        ? "Ouça e coloque as imagens na ordem."
        : "Ouça e toque na imagem correta.",
      contentLanguage: "en",
      instructionLanguage: "pt-BR",
      feedbackLanguage: "pt-BR",
      audio: {
        enabled: true,
        text: targetAudio,
        src: stimulus?.src || null,
        language: "en-US",
        role: "instruction"
      },
      alternatives: alternatives || bp.options.map((entry) => option(entry.id, entry.text, false)),
      answer,
      feedback: {
        correct: `Muito bem! ${targetAudio.toUpperCase()}`,
        incorrect: "Ouça novamente, observe as imagens e tente outra vez.",
        language: "pt-BR"
      },
      delivery: {
        mechanic,
        preferred: [mechanic],
        allowImage: true,
        allowAudio: true
      },
      metadata: {
        sourceStatus: bp.status,
        sourceStatement: bp.statement,
        sourceInstruction: bp.instruction,
        sourceMedia: bp.sourceMedia,
        sourceCorrectOptionId: bp.correct,
        sourceOptions: bp.options.map((entry) => ({ id: entry.id, text: entry.text })),
        factoryNote: bp.note || "",
        pedagogy: {
          ...PEDAGOGY_PROFILE,
          sourceQuestionId: bp.id,
          adaptation: mechanic === "drag-drop" ? "R0_AUDIO_VISUAL_SEQUENCE" : "R0_AUDIO_TO_VISUAL",
          readingEssential: false,
          literacyDemand: "R0"
        },
        instructionAudio: {
          required: true,
          text: mechanic === "drag-drop"
            ? "Ouça e coloque as imagens na ordem."
            : "Ouça e toque na imagem correta.",
          language: "pt-BR",
          fallback: "speech-synthesis"
        },
        ...metadata
      }
    };
  }

  function targetQuestion(bp) {
    const correctId = `target-${bp.correct}`;
    const items = bp.options.map((entry, index) => {
      const hintedKey = bp.imageOptions?.[index];
      const image = hintedKey && VISUALS[hintedKey]
        ? VISUALS[hintedKey]
        : visualForText(entry.text);
      return {
        id: `target-${entry.id}`,
        label: "",
        image,
        display: "image",
        alt: entry.text,
        assetStatus: hintedKey && VISUALS[hintedKey] ? "resolved" : visualStatus(entry.text)
      };
    });

    return baseQuestion(
      bp,
      "target-shooter",
      {
        screenTitle: "Ouça e escolha",
        targetShooter: {
          audioText: targetAudioText(bp),
          mode: "audio-to-image",
          shape: "cloud",
          correctIds: [correctId],
          difficulty: {
            speed: .30,
            objectCount: Math.max(2, items.length),
            spawnIntervalMs: 250,
            requiredCorrect: 1,
            targetSize: 176,
            timeLimitMs: 0,
            timerMode: "none"
          },
          items
        }
      },
      { type: "single", value: bp.correct }
    );
  }

  function sequenceQuestion(bp) {
    const order = Array.isArray(bp.sequence) ? bp.sequence : bp.options.map((entry) => entry.id);
    const alternatives = bp.options.map((entry) => option(
      entry.id,
      "",
      false,
      visualForText(entry.text)
    ));

    return baseQuestion(
      bp,
      "drag-drop",
      {
        screenTitle: "Coloque na ordem",
        sourceCorrectAnswer: order.join(" → "),
        sequenceLabels: order.map((_, index) => String(index + 1)),
        layout: "sequence",
        shuffleItems: true
      },
      { type: "sequence", value: order },
      alternatives
    );
  }

  function buildQuestion(bp) {
    if (bp.kind === "sequence") return sequenceQuestion(bp);
    return targetQuestion(bp);
  }

  const BLUEPRINTS = Object.freeze([
    {
      "id": "EN1-M3-01",
      "status": "Ajustar",
      "difficulty": "easy",
      "skill": "Identificar cores em inglês.",
      "statement": "Red",
      "instruction": "Observe a cor da imagem e escolha seu nome em inglês.",
      "options": [
        {
          "id": "o1",
          "text": "green"
        },
        {
          "id": "o2",
          "text": "red"
        },
        {
          "id": "o3",
          "text": "yellow"
        }
      ],
      "correct": "o2",
      "kind": "image-choice",
      "audioText": null,
      "visual": "color-red",
      "visualAlt": "Bloco vermelho",
      "imageOptions": null,
      "sequence": null,
      "sourceMedia": "Imagem obrigatória: bloco red.",
      "note": ""
    },
    {
      "id": "EN1-M3-02",
      "status": "Ajustar",
      "difficulty": "easy",
      "skill": "Identificar cores em inglês.",
      "statement": "Blue",
      "instruction": "Qual palavra em inglês nomeia a cor mostrada?",
      "options": [
        {
          "id": "o1",
          "text": "red"
        },
        {
          "id": "o2",
          "text": "green"
        },
        {
          "id": "o3",
          "text": "blue"
        }
      ],
      "correct": "o3",
      "kind": "image-choice",
      "audioText": null,
      "visual": "color-blue",
      "visualAlt": "Bloco azul",
      "imageOptions": null,
      "sequence": null,
      "sourceMedia": "Imagem obrigatória: bloco blue.",
      "note": ""
    },
    {
      "id": "EN1-M3-03",
      "status": "Ajustar",
      "difficulty": "easy",
      "skill": "Identificar cores em inglês.",
      "statement": "Yellow",
      "instruction": "Toque no cartão com o nome da cor da imagem.",
      "options": [
        {
          "id": "o1",
          "text": "yellow"
        },
        {
          "id": "o2",
          "text": "red"
        },
        {
          "id": "o3",
          "text": "green"
        }
      ],
      "correct": "o1",
      "kind": "image-choice",
      "audioText": null,
      "visual": "color-yellow",
      "visualAlt": "Bloco amarelo",
      "imageOptions": null,
      "sequence": null,
      "sourceMedia": "Imagem obrigatória: bloco yellow.",
      "note": ""
    },
    {
      "id": "EN1-M3-04",
      "status": "Ajustar",
      "difficulty": "easy",
      "skill": "Identificar cores em inglês.",
      "statement": "Green",
      "instruction": "A imagem destaca uma cor. Escolha a palavra correta em inglês.",
      "options": [
        {
          "id": "o1",
          "text": "red"
        },
        {
          "id": "o2",
          "text": "green"
        },
        {
          "id": "o3",
          "text": "yellow"
        }
      ],
      "correct": "o2",
      "kind": "image-choice",
      "audioText": null,
      "visual": "color-green",
      "visualAlt": "Bloco verde",
      "imageOptions": null,
      "sequence": null,
      "sourceMedia": "Imagem obrigatória: bloco green.",
      "note": ""
    },
    {
      "id": "EN1-M3-05",
      "status": "Ajustar",
      "difficulty": "easy",
      "skill": "Identificar objetos escolares em inglês.",
      "statement": "Pencil",
      "instruction": "Observe o objeto e escolha seu nome em inglês.",
      "options": [
        {
          "id": "o1",
          "text": "eraser"
        },
        {
          "id": "o2",
          "text": "colored pencil"
        },
        {
          "id": "o3",
          "text": "pencil"
        }
      ],
      "correct": "o3",
      "kind": "image-choice",
      "audioText": null,
      "visual": "pencil",
      "visualAlt": "Pencil",
      "imageOptions": null,
      "sequence": null,
      "sourceMedia": "Imagem obrigatória: pencil.",
      "note": ""
    },
    {
      "id": "EN1-M3-06",
      "status": "Ajustar",
      "difficulty": "easy",
      "skill": "Identificar objetos escolares em inglês.",
      "statement": "Eraser",
      "instruction": "Qual palavra em inglês nomeia o objeto da imagem?",
      "options": [
        {
          "id": "o1",
          "text": "eraser"
        },
        {
          "id": "o2",
          "text": "pencil"
        },
        {
          "id": "o3",
          "text": "colored pencil"
        }
      ],
      "correct": "o1",
      "kind": "image-choice",
      "audioText": null,
      "visual": "eraser",
      "visualAlt": "Eraser",
      "imageOptions": null,
      "sequence": null,
      "sourceMedia": "Imagem obrigatória: eraser.",
      "note": ""
    },
    {
      "id": "EN1-M3-07",
      "status": "Ajustar",
      "difficulty": "easy",
      "skill": "Identificar objetos escolares em inglês.",
      "statement": "Ruler",
      "instruction": "Toque no cartão com o nome em inglês do objeto.",
      "options": [
        {
          "id": "o1",
          "text": "eraser"
        },
        {
          "id": "o2",
          "text": "ruler"
        },
        {
          "id": "o3",
          "text": "pencil"
        }
      ],
      "correct": "o2",
      "kind": "image-choice",
      "audioText": null,
      "visual": "ruler",
      "visualAlt": "Ruler",
      "imageOptions": null,
      "sequence": null,
      "sourceMedia": "Imagem obrigatória: ruler.",
      "note": ""
    },
    {
      "id": "EN1-M3-08",
      "status": "Ajustar",
      "difficulty": "easy",
      "skill": "Identificar objetos escolares em inglês.",
      "statement": "Backpack",
      "instruction": "A imagem mostra um objeto escolar. Escolha o nome correto.",
      "options": [
        {
          "id": "o1",
          "text": "eraser"
        },
        {
          "id": "o2",
          "text": "pencil"
        },
        {
          "id": "o3",
          "text": "backpack"
        }
      ],
      "correct": "o3",
      "kind": "image-choice",
      "audioText": null,
      "visual": "backpack",
      "visualAlt": "Backpack",
      "imageOptions": null,
      "sequence": null,
      "sourceMedia": "Imagem obrigatória: backpack.",
      "note": ""
    },
    {
      "id": "EN1-M3-09",
      "status": "Manter",
      "difficulty": "medium",
      "skill": "Relacionar cores e objetos escolares.",
      "statement": "Blue pencil",
      "instruction": "Uma imagem mostra um lápis azul. Qual expressão corresponde à imagem?",
      "options": [
        {
          "id": "o1",
          "text": "blue pencil"
        },
        {
          "id": "o2",
          "text": "red pencil"
        },
        {
          "id": "o3",
          "text": "blue ruler"
        }
      ],
      "correct": "o1",
      "kind": "image-choice",
      "audioText": null,
      "visual": "blue pencil",
      "visualAlt": "Blue pencil",
      "imageOptions": null,
      "sequence": null,
      "sourceMedia": "Imagem obrigatória: lápis azul.",
      "note": ""
    },
    {
      "id": "EN1-M3-10",
      "status": "Ajustar",
      "difficulty": "medium",
      "skill": "Relacionar quantidade e objeto escolar em uma expressão curta.",
      "statement": "Three rulers",
      "instruction": "Observe a imagem com 3 réguas. Qual expressão descreve a quantidade?",
      "options": [
        {
          "id": "o1",
          "text": "two rulers"
        },
        {
          "id": "o2",
          "text": "three rulers"
        },
        {
          "id": "o3",
          "text": "four rulers"
        }
      ],
      "correct": "o2",
      "kind": "image-choice",
      "audioText": null,
      "visual": "three-rulers",
      "visualAlt": "Três réguas bem separadas",
      "imageOptions": null,
      "sequence": null,
      "sourceMedia": "Imagem obrigatória: 3 réguas bem separadas.",
      "note": ""
    },
    {
      "id": "EN1-M3-11",
      "status": "Reescrever",
      "difficulty": "medium",
      "skill": "Relacionar cor e objeto escolar em uma expressão curta.",
      "statement": "Orange crayon",
      "instruction": "Observe o giz de cera laranja. Qual expressão descreve o objeto?",
      "options": [
        {
          "id": "o1",
          "text": "orange crayon"
        },
        {
          "id": "o2",
          "text": "pink crayon"
        },
        {
          "id": "o3",
          "text": "orange pencil"
        }
      ],
      "correct": "o1",
      "kind": "image-choice",
      "audioText": null,
      "visual": "orange crayon",
      "visualAlt": "Orange crayon",
      "imageOptions": null,
      "sequence": null,
      "sourceMedia": "Imagem obrigatória: orange crayon; palavras com áudio sob toque.",
      "note": ""
    },
    {
      "id": "EN1-M3-12",
      "status": "Reescrever",
      "difficulty": "hard",
      "skill": "Relacionar cor e objeto escolar em uma expressão curta.",
      "statement": "Pink pencil case",
      "instruction": "Observe o estojo rosa. Qual expressão descreve o objeto?",
      "options": [
        {
          "id": "o1",
          "text": "pink pencil case"
        },
        {
          "id": "o2",
          "text": "purple pencil case"
        },
        {
          "id": "o3",
          "text": "pink backpack"
        }
      ],
      "correct": "o1",
      "kind": "image-choice",
      "audioText": null,
      "visual": "pink pencil case",
      "visualAlt": "Pink pencil case",
      "imageOptions": null,
      "sequence": null,
      "sourceMedia": "Imagem obrigatória: pink pencil case; palavras com áudio sob toque.",
      "note": ""
    }
  ]);

  const questions = BLUEPRINTS.map(buildQuestion);

  const activityGroups = [];
  let current = null;
  questions.forEach((question) => {
    const mechanic = question.delivery.mechanic;
    if (!current || current.mechanic !== mechanic || current.questions.length >= 4) {
      current = {
        id: `en1-m03-step-${String(activityGroups.length + 1).padStart(2, "0")}`,
        title: mechanic === "drag-drop" ? "Coloque na ordem" : "Ouça e escolha",
        mechanic,
        skill: question.skill,
        pedagogy: { profile: "Y1_EARLY_LITERACY", literacyDemand: "R0", readingEssential: false },
        questions: []
      };
      activityGroups.push(current);
    }
    current.questions.push(question);
  });

  const moduleDefinition = {
    id: "english-year-1-module-03",
    version: VERSION,
    sourceVersion: "DUDUQ English 1–5 v2.2",
    factoryVersion: "1.0-pedagogy-v1",
    productionStatus: "REVIEW_REQUIRED_MEDIA_GAPS",
    subject: "Língua Inglesa",
    year: YEAR,
    module: MODULE,
    title: "Colors & School Objects",
    description: "Reconhecer cores e objetos escolares e combinar cor + objeto em descrições muito curtas, fazendo o acerto depender do inglês.",
    estimatedMinutes: 4,
    audioPolicy: {
      primary: "AUDIO_GAP",
      fallback: "speech-synthesis",
      base: AUDIO_BASE,
      instructionLanguage: "pt-BR",
      contentLanguage: "en-US"
    },
    audioCatalog: AUDIO_CATALOG,
    assetPolicy: {
      semanticAuthoring: "imageAsset/imageCategory",
      smartAssets: true,
      integrationB: true,
      previewGeneratedAssetsAllowedForReviewOnly: true,
      commercialGate: "fallback=0; blocked=0; missing=0; assetGaps=0",
      repoReady: true,
      cloudflareReady: true,
      engineBaseline: "Canary R124",
      routerContract: "R124_FACTORY_NATIVE_PAYLOAD"
    },
    pedagogyPolicy: {
      specification: "DUDUQ_FACTORY_PEDAGOGICAL_SPECIFICATION_v1.0",
      specificationVersion: "1.0.0",
      profile: "Y1_EARLY_LITERACY",
      maxLiteracyDemand: "R0",
      readingEssential: false,
      uppercaseSupport: true,
      instructionAudioRequired: true,
      targetAudioRepeatable: true,
      nonReaderTest: "PASS",
      pedagogicalAudit: "PASS",
      gates: ["PED-01", "PED-02", "PED-03", "PED-04", "PED-05", "PED-06", "PED-07", "PED-08", "PED-09", "PED-10", "PED-11", "PED-12"]
    },
    learningGoals: [
      "Reconhecer cores e objetos escolares e combinar cor + objeto em descrições muito curtas, fazendo o acerto depender do inglês."
    ],
    pedagogicalNotes: {
      officialSource: "DUDUQ English 1–5 v2.2 — Manual do Educador, 1º ano, Unidade 2, p. 22 e Unidade 3, p. 23",
      literacy: "Y1_EARLY_LITERACY: R0 como padrão. Leitura nunca é requisito para acertar; texto é apenas apoio.",
      maintenance: "IDs editoriais permanecem estáveis. Troca de imagem usa imageAsset; troca de mecânica exige regenerar o payload.",
      qaStatus: "REVIEW_REQUIRED_MEDIA_GAPS"
    },
    intro: {
      companyKicker: "UMA CRIAÇÃO DE",
      companyLogo: "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/LOGO%20DA%20EMPRESA_COLORIDO.png",
      companyAlt: "Editora Brasil Cultural",
      companyName: "Editora Brasil Cultural",
      companyWidth: 820,
      collectionLogo: "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Logo%20EduQ%20Play.png",
      collectionName: "EduQ Play",
      collectionAlt: "EduQ Play",
      collectionWidth: 760,
      loadingLabel: "PREPARANDO SUA MISSÃO",
      readyLabel: "MISSÃO PRONTA",
      startLabel: "INICIAR MISSÃO",
      hint: "Tudo pronto para começar!",
      minDurationMs: 2200,
      brandingDurationMs: 3000,
      switchingDurationMs: 760,
      missionMinDurationMs: 1200,
      sparkCount: 14
    },
    activities: activityGroups
  };

  window.DUDUQ_CONTENT.english.year1.module03 = Object.freeze(moduleDefinition);
})();
