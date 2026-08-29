/* =========================================================
   DUDUQ SHARED — SMART VISUAL RESOLVER v1.1.0

   Cross-year contract:
   1) DuduQAssets official exact/alias resolver first;
   2) known official Assets-DuduQ library aliases second;
   3) deterministic semantic composition only for genuine gaps;
   4) composite concepts must never degrade to number/color-only cards;
   5) never returns a broken/empty URL silently.

   This layer contains presentation semantics, not Year-specific pedagogy.
   ========================================================= */
(function () {
  "use strict";

  const VERSION = "1.1.0";
  if (window.DuduQSmartVisual?.version === VERSION) return;

  const ASSET_BASE = "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/";

  function clean(value) {
    return String(value == null ? "" : value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/[^a-z0-9+×÷=−\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeXml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function svg(markup) {
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(markup);
  }

  function card(body, aria) {
    return svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420" role="img" aria-label="${escapeXml(aria || "visual")}"><rect x="8" y="8" width="624" height="404" rx="48" fill="#f7fbff" stroke="#b8d4ec" stroke-width="8"/>${body}</svg>`);
  }

  function officialUrl(filename) {
    return ASSET_BASE + encodeURIComponent(filename).replace(/%2F/gi, "/");
  }

  const OFFICIAL_LIBRARY = Object.freeze({
    "m": "Letra M - EM.png",
    "leo": "Leo.png",
    "maya": "Maya.png",
    "maya profile": "Maya.png",

    "mother": "mother - mãe.png",
    "father": "father-pai.png",
    "brother": "brother-irmão.png",
    "sister": "sister-irmã.png",
    "grandfather": "grandfather - avô.png",
    "grandmother": "grandmother - avó.png",

    "doll": "doll - boneca.png",
    "kite": "kite - pipa.png",
    "teddy bear": "teddy bear.png",
    "video game": "video game.png",

    "cat": "pet-cat-gato.png",
    "dog": "pet-dog-cachorro.png",
    "rabbit": "pet-rabbit-coelho.png",
    "turtle": "pet-turtle-tartaruga.png",
    "duck": "animal-duck-pato.png",

    "car": "Car - carro.png",
    "bus": "Bus - ônibus.png",
    "truck": "Truck - caminhão.png",
    "plane": "Plane - avião.png",
    "train": "Train - trem.png",

    "pencil": "school-object-pencil-lapis.png",
    "blue pencil": "school-object-blue-pencil-lapis-azul.png",

    "head": "body-part-touch-head-tocar-cabeca.png",
    "hands": "body-part-touch-hands-tocar-maos.png",
    "arms": "body-part-touch-arms-tocar-bracos.png",
    "feet": "body-part-touch-feet-tocar-pes.png",
    "knees": "body-part-touch-knees-tocar-joelhos.png"
  });

  const COLOR = Object.freeze({
    red: "#e53935", blue: "#1e88e5", yellow: "#fdd835", green: "#43a047",
    orange: "#fb8c00", pink: "#ec407a", purple: "#8e24aa", brown: "#795548",
    black: "#263238", white: "#ffffff"
  });
  const SHAPES = ["circle", "rectangle", "triangle", "square", "star"];
  const COUNT_WORDS = Object.freeze({
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
    seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12
  });

  function parseCount(norm) {
    const digit = norm.match(/\b(\d{1,2})\b/);
    if (digit) return Math.max(1, Math.min(12, Number(digit[1])));
    for (const [word, amount] of Object.entries(COUNT_WORDS)) {
      if (new RegExp(`\\b${word}\\b`).test(norm)) return amount;
    }
    return 1;
  }

  function parseColors(norm) {
    const hits = [];
    for (const name of Object.keys(COLOR)) {
      const index = norm.search(new RegExp(`\\b${name}\\b`));
      if (index >= 0) hits.push({ name, index });
    }
    return hits.sort((a, b) => a.index - b.index).map((item) => item.name);
  }

  function numeral(value) {
    const norm = clean(value);
    if (!/^\d{1,2}$/.test(norm)) return null;
    const number = Number(norm);
    if (!Number.isFinite(number) || number < 1 || number > 99) return null;
    return card(`<circle cx="320" cy="210" r="145" fill="#fff" stroke="#4aa3e8" stroke-width="14"/><text x="320" y="250" text-anchor="middle" font-family="Nunito,Arial,sans-serif" font-size="132" font-weight="900" fill="#173d68">${number}</text>`, String(number));
  }

  function mathExpression(value) {
    const raw = String(value || "").trim();
    if (!/[+×÷=−-]/.test(raw) || !/\d/.test(raw)) return null;
    const safe = escapeXml(raw);
    return card(`<rect x="70" y="128" width="500" height="164" rx="34" fill="#fff" stroke="#79b7e8" stroke-width="8"/><text x="320" y="235" text-anchor="middle" font-family="Nunito,Arial,sans-serif" font-size="72" font-weight="900" fill="#173d68">${safe}</text>`, raw);
  }

  function shapeVisual(value) {
    const norm = clean(value);
    const shape = SHAPES.find((name) => new RegExp(`\\b${name}s?\\b`).test(norm));
    if (!shape) return null;
    const colorName = parseColors(norm)[0] || "blue";
    const fill = COLOR[colorName];
    const count = parseCount(norm);
    const small = /\bsmall\b/.test(norm);
    const big = /\bbig\b/.test(norm);
    const size = small ? 42 : big ? 78 : count > 4 ? 44 : 62;
    const cols = Math.min(4, count);
    const rows = Math.ceil(count / cols);
    const gapX = 440 / Math.max(1, cols - 1 || 1);
    const gapY = 250 / Math.max(1, rows - 1 || 1);
    let marks = "";
    for (let i = 0; i < count; i += 1) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 100 + (cols === 1 ? 220 : col * gapX);
      const y = 85 + (rows === 1 ? 125 : row * gapY);
      if (shape === "circle") marks += `<circle cx="${x}" cy="${y}" r="${size / 2}" fill="${fill}" stroke="#173d68" stroke-width="5"/>`;
      else if (shape === "rectangle") marks += `<rect x="${x - size * .72}" y="${y - size * .42}" width="${size * 1.44}" height="${size * .84}" rx="10" fill="${fill}" stroke="#173d68" stroke-width="5"/>`;
      else if (shape === "square") marks += `<rect x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" rx="10" fill="${fill}" stroke="#173d68" stroke-width="5"/>`;
      else if (shape === "triangle") marks += `<path d="M ${x} ${y - size * .62} L ${x - size * .62} ${y + size * .5} L ${x + size * .62} ${y + size * .5} Z" fill="${fill}" stroke="#173d68" stroke-width="5"/>`;
      else marks += `<path d="M ${x} ${y - size * .62} L ${x + size * .18} ${y - size * .2} L ${x + size * .62} ${y - size * .18} L ${x + size * .28} ${y + size * .1} L ${x + size * .39} ${y + size * .55} L ${x} ${y + size * .3} L ${x - size * .39} ${y + size * .55} L ${x - size * .28} ${y + size * .1} L ${x - size * .62} ${y - size * .18} L ${x - size * .18} ${y - size * .2} Z" fill="${fill}" stroke="#173d68" stroke-width="5"/>`;
    }
    return card(marks, value);
  }

  function colorVisual(value) {
    const norm = clean(value);
    const name = Object.keys(COLOR).find((item) => norm === item || norm === `color ${item}`);
    if (!name) return null;
    const stroke = name === "white" ? "#78909c" : "#173d68";
    return card(`<rect x="150" y="92" width="340" height="236" rx="44" fill="${COLOR[name]}" stroke="${stroke}" stroke-width="8"/>`, name);
  }

  function sceneVisual(value) {
    const norm = clean(value);
    if (norm === "friends") {
      return card(`<g transform="translate(180 82)"><circle cx="0" cy="70" r="48" fill="#f4c7a1" stroke="#173d68" stroke-width="6"/><path d="M-72 230 Q-58 135 0 135 Q58 135 72 230Z" fill="#4aa3e8" stroke="#173d68" stroke-width="6"/></g><g transform="translate(460 82)"><circle cx="0" cy="70" r="48" fill="#9b6a47" stroke="#173d68" stroke-width="6"/><path d="M-72 230 Q-58 135 0 135 Q58 135 72 230Z" fill="#f5b841" stroke="#173d68" stroke-width="6"/></g><path d="M258 205 Q320 150 382 205" fill="none" stroke="#43a047" stroke-width="12" stroke-linecap="round"/><circle cx="320" cy="162" r="15" fill="#43a047"/>`, value);
    }
    if (norm === "nice to meet you") {
      return card(`<g transform="translate(185 80)"><circle cx="0" cy="65" r="44" fill="#f4c7a1" stroke="#173d68" stroke-width="6"/><path d="M-62 222 Q-48 130 0 130 Q48 130 62 222Z" fill="#4aa3e8" stroke="#173d68" stroke-width="6"/></g><g transform="translate(455 80)"><circle cx="0" cy="65" r="44" fill="#9b6a47" stroke="#173d68" stroke-width="6"/><path d="M-62 222 Q-48 130 0 130 Q48 130 62 222Z" fill="#f5b841" stroke="#173d68" stroke-width="6"/></g><path d="M242 250 Q320 205 398 250" fill="none" stroke="#43a047" stroke-width="12" stroke-linecap="round"/><circle cx="298" cy="224" r="13" fill="#43a047"/><circle cx="342" cy="224" r="13" fill="#43a047"/>`, value);
    }
    if (norm === "how are you") {
      return card(`<g transform="translate(210 90)"><circle cx="0" cy="70" r="48" fill="#f4c7a1" stroke="#173d68" stroke-width="6"/><path d="M-68 230 Q-54 140 0 140 Q54 140 68 230Z" fill="#4aa3e8" stroke="#173d68" stroke-width="6"/></g><g transform="translate(430 90)"><circle cx="0" cy="70" r="48" fill="#9b6a47" stroke="#173d68" stroke-width="6"/><path d="M-68 230 Q-54 140 0 140 Q54 140 68 230Z" fill="#f5b841" stroke="#173d68" stroke-width="6"/></g><path d="M285 86 Q320 46 355 86 L345 130 Q320 152 295 130Z" fill="#fff" stroke="#79b7e8" stroke-width="6"/><text x="320" y="119" text-anchor="middle" font-family="Nunito,Arial,sans-serif" font-size="56" font-weight="900" fill="#173d68">?</text>`, value);
    }
    if (norm === "age") {
      return card(`<circle cx="220" cy="155" r="62" fill="#f4c7a1" stroke="#173d68" stroke-width="7"/><path d="M120 340 Q135 230 220 230 Q305 230 320 340Z" fill="#4aa3e8" stroke="#173d68" stroke-width="7"/><rect x="380" y="230" width="130" height="92" rx="18" fill="#f5b841" stroke="#173d68" stroke-width="7"/><path d="M395 230 Q445 186 495 230" fill="#f8c8dc" stroke="#173d68" stroke-width="7"/><rect x="438" y="154" width="14" height="54" rx="7" fill="#43a047"/><path d="M445 148 Q428 130 445 114 Q462 130 445 148Z" fill="#fb8c00"/><text x="555" y="185" text-anchor="middle" font-family="Nunito,Arial,sans-serif" font-size="72" font-weight="900" fill="#173d68">?</text>`, value);
    }
    return null;
  }

  function objectKind(norm) {
    const patterns = [
      ["duck", /\bducks?\b/], ["cat", /\bcats?\b/], ["rabbit", /\brabbits?\b/], ["turtle", /\bturtles?\b/],
      ["ball", /\bballs?\b/], ["pencil", /\bpencils?\b/], ["car", /\bcars?\b/], ["bus", /\bbus(?:es)?\b/],
      ["truck", /\btrucks?\b/], ["plane", /\bplanes?\b/], ["train", /\btrains?\b/],
      ["nose", /\bnoses?\b/], ["eye", /\beyes?\b/], ["hair", /\bhair\b/], ["hand", /\bhands?\b/]
    ];
    return patterns.find(([, pattern]) => pattern.test(norm))?.[0] || null;
  }

  function objectMark(kind, x, y, scale, colors) {
    const c1 = COLOR[colors[0]] || ({ duck: "#fdd835", cat: "#90a4ae", rabbit: "#b0bec5", turtle: "#66bb6a", ball: "#4aa3e8", pencil: "#f5b841", car: "#4aa3e8", bus: "#f5b841", truck: "#4aa3e8", plane: "#cfd8dc", train: "#e53935", hair: "#795548" }[kind] || "#4aa3e8");
    const c2 = COLOR[colors[1]] || c1;
    const stroke = "#173d68";
    const transform = `translate(${x} ${y}) scale(${scale})`;

    if (kind === "duck") return `<g transform="${transform}"><ellipse cx="0" cy="22" rx="48" ry="30" fill="${c1}" stroke="${stroke}" stroke-width="5"/><circle cx="32" cy="-12" r="24" fill="${c1}" stroke="${stroke}" stroke-width="5"/><path d="M54 -10 L82 0 L54 10Z" fill="#fb8c00" stroke="${stroke}" stroke-width="4"/><circle cx="39" cy="-17" r="4" fill="${stroke}"/></g>`;
    if (kind === "cat") return `<g transform="${transform}"><path d="M-36 -28 L-20 -62 L0 -42 L22 -62 L38 -28 Q54 4 38 34 Q0 58 -38 34 Q-54 4 -36 -28Z" fill="${c1}" stroke="${stroke}" stroke-width="5"/><circle cx="-15" cy="-8" r="5" fill="${stroke}"/><circle cx="16" cy="-8" r="5" fill="${stroke}"/><path d="M-5 7 L5 7 L0 15Z" fill="#ec407a"/><path d="M-12 20 Q0 30 12 20" fill="none" stroke="${stroke}" stroke-width="4"/></g>`;
    if (kind === "rabbit") return `<g transform="${transform}"><ellipse cx="-18" cy="-48" rx="13" ry="38" fill="${c1}" stroke="${stroke}" stroke-width="5"/><ellipse cx="18" cy="-48" rx="13" ry="38" fill="${c1}" stroke="${stroke}" stroke-width="5"/><circle cx="0" cy="2" r="42" fill="${c1}" stroke="${stroke}" stroke-width="5"/><circle cx="-14" cy="-5" r="5" fill="${stroke}"/><circle cx="15" cy="-5" r="5" fill="${stroke}"/><path d="M-5 10 L5 10 L0 18Z" fill="#ec407a"/></g>`;
    if (kind === "turtle") return `<g transform="${transform}"><ellipse cx="0" cy="10" rx="50" ry="34" fill="${c1}" stroke="${stroke}" stroke-width="5"/><path d="M-30 -8 L0 32 L30 -8 M-42 10 L42 10" fill="none" stroke="${stroke}" stroke-width="4" opacity=".65"/><circle cx="58" cy="8" r="17" fill="#81c784" stroke="${stroke}" stroke-width="5"/><circle cx="63" cy="4" r="3" fill="${stroke}"/><circle cx="-35" cy="45" r="10" fill="#81c784"/><circle cx="35" cy="45" r="10" fill="#81c784"/></g>`;
    if (kind === "ball") return `<g transform="${transform}"><circle cx="0" cy="0" r="48" fill="${c1}" stroke="${stroke}" stroke-width="6"/><path d="M-42 -18 Q0 4 42 -18 M-42 18 Q0 -4 42 18 M-8 -47 Q12 0 -8 47" fill="none" stroke="#fff" stroke-width="6" opacity=".88"/></g>`;
    if (kind === "pencil") return `<g transform="${transform} rotate(-18)"><rect x="-62" y="-14" width="105" height="28" rx="7" fill="${c1}" stroke="${stroke}" stroke-width="5"/><path d="M43 -14 L72 0 L43 14Z" fill="#f4c7a1" stroke="${stroke}" stroke-width="5"/><path d="M72 0 L61 -5 L61 5Z" fill="#263238"/><rect x="-75" y="-14" width="15" height="28" rx="5" fill="#ec407a" stroke="${stroke}" stroke-width="5"/></g>`;
    if (kind === "car") return `<g transform="${transform}"><path d="M-58 22 L-50 -10 L-20 -34 L28 -34 L52 -8 L62 22Z" fill="${c1}" stroke="${stroke}" stroke-width="6"/><path d="M-14 -30 L-10 -8 L34 -8 L22 -30Z" fill="#d9f2ff" stroke="${stroke}" stroke-width="4"/><circle cx="-36" cy="28" r="15" fill="#263238"/><circle cx="38" cy="28" r="15" fill="#263238"/></g>`;
    if (kind === "bus") return `<g transform="${transform}"><rect x="-66" y="-42" width="132" height="70" rx="14" fill="${c1}" stroke="${stroke}" stroke-width="6"/><path d="M0 -39 H64 V25 H0Z" fill="${c2}" opacity="${colors[1] ? 1 : 0}"/><rect x="-48" y="-28" width="28" height="22" rx="4" fill="#d9f2ff"/><rect x="-10" y="-28" width="28" height="22" rx="4" fill="#d9f2ff"/><rect x="28" y="-28" width="22" height="22" rx="4" fill="#d9f2ff"/><circle cx="-40" cy="32" r="14" fill="#263238"/><circle cx="42" cy="32" r="14" fill="#263238"/></g>`;
    if (kind === "truck") return `<g transform="${transform}"><rect x="-70" y="-24" width="82" height="48" rx="8" fill="${c1}" stroke="${stroke}" stroke-width="6"/><path d="M12 -24 H48 L70 0 V24 H12Z" fill="${c2}" stroke="${stroke}" stroke-width="6"/><rect x="28" y="-14" width="22" height="18" rx="3" fill="#d9f2ff"/><circle cx="-42" cy="30" r="14" fill="#263238"/><circle cx="42" cy="30" r="14" fill="#263238"/></g>`;
    if (kind === "plane") return `<g transform="${transform}"><path d="M-72 4 L-8 -10 L18 -65 L36 -62 L24 -8 L72 5 L72 18 L22 15 L8 58 L-10 58 L-6 14 L-72 18Z" fill="${c1}" stroke="${stroke}" stroke-width="6" stroke-linejoin="round"/></g>`;
    if (kind === "train") return `<g transform="${transform}"><rect x="-62" y="-34" width="92" height="62" rx="10" fill="${c1}" stroke="${stroke}" stroke-width="6"/><rect x="30" y="-10" width="34" height="38" rx="6" fill="${c2}" stroke="${stroke}" stroke-width="6"/><rect x="-42" y="-20" width="24" height="20" fill="#d9f2ff"/><circle cx="-38" cy="34" r="14" fill="#263238"/><circle cx="34" cy="34" r="14" fill="#263238"/></g>`;
    if (kind === "eye") return `<g transform="${transform}"><path d="M-56 0 Q0 -48 56 0 Q0 48 -56 0Z" fill="#fff" stroke="${stroke}" stroke-width="6"/><circle cx="0" cy="0" r="23" fill="${c1}" stroke="${stroke}" stroke-width="5"/><circle cx="0" cy="0" r="10" fill="#263238"/><circle cx="8" cy="-8" r="4" fill="#fff"/></g>`;
    if (kind === "nose") return `<g transform="${transform}"><circle cx="0" cy="0" r="70" fill="#f4c7a1" stroke="${stroke}" stroke-width="6"/><path d="M0 -32 Q-16 2 -22 26 Q0 40 22 26" fill="#efb38a" stroke="${stroke}" stroke-width="6" stroke-linecap="round"/><circle cx="0" cy="25" r="34" fill="none" stroke="#f5b841" stroke-width="8"/></g>`;
    if (kind === "hair") return `<g transform="${transform}"><circle cx="0" cy="12" r="60" fill="#f4c7a1" stroke="${stroke}" stroke-width="6"/><path d="M-58 7 Q-55 -66 0 -66 Q55 -66 58 7 Q35 -12 18 -2 Q0 -25 -18 -2 Q-38 -14 -58 7Z" fill="${c1}" stroke="${stroke}" stroke-width="6"/><circle cx="-20" cy="20" r="5" fill="${stroke}"/><circle cx="20" cy="20" r="5" fill="${stroke}"/></g>`;
    if (kind === "hand") return `<g transform="${transform}"><rect x="-34" y="-10" width="68" height="62" rx="26" fill="#f4c7a1" stroke="${stroke}" stroke-width="5"/><rect x="-36" y="-62" width="14" height="64" rx="7" fill="#f4c7a1" stroke="${stroke}" stroke-width="4"/><rect x="-17" y="-75" width="14" height="75" rx="7" fill="#f4c7a1" stroke="${stroke}" stroke-width="4"/><rect x="2" y="-72" width="14" height="72" rx="7" fill="#f4c7a1" stroke="${stroke}" stroke-width="4"/><rect x="21" y="-58" width="14" height="58" rx="7" fill="#f4c7a1" stroke="${stroke}" stroke-width="4"/><path d="M-34 17 Q-72 3 -65 -20 Q-60 -35 -46 -22 L-19 7" fill="#f4c7a1" stroke="${stroke}" stroke-width="5"/></g>`;
    return "";
  }

  function objectVisual(value) {
    const norm = clean(value);
    const kind = objectKind(norm);
    if (!kind) return null;

    const count = kind === "hair" || kind === "nose" ? 1 : parseCount(norm);
    const colors = parseColors(norm);
    const isBig = /\bbig\b/.test(norm);
    const isSmall = /\bsmall\b/.test(norm);
    const cols = Math.min(count, count > 4 ? 4 : 3);
    const rows = Math.ceil(count / cols);
    const xs = cols === 1 ? [320] : Array.from({ length: cols }, (_, i) => 115 + i * (410 / Math.max(1, cols - 1)));
    const ys = rows === 1 ? [210] : Array.from({ length: rows }, (_, i) => 130 + i * (165 / Math.max(1, rows - 1)));
    let baseScale = count > 6 ? .66 : count > 4 ? .76 : count > 2 ? .9 : 1.02;
    if (isBig) baseScale *= 1.28;
    if (isSmall) baseScale *= .75;
    if (kind === "nose" || kind === "hair") baseScale = isBig ? 1.35 : 1.15;
    if (kind === "hand" && isBig) baseScale = count > 1 ? 1.12 : 1.35;

    let marks = "";
    for (let i = 0; i < count; i += 1) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      marks += objectMark(kind, xs[col], ys[row], baseScale, colors);
    }
    return card(marks, value);
  }

  function official(value) {
    try {
      const details = window.DuduQAssets?.resolveImageDetails?.(value);
      if (details?.url) return { src: details.url, status: "official", kind: "official", visualKey: `official:${details.key || clean(value)}`, details };
      const src = window.DuduQAssets?.resolveImage?.(value);
      if (src) return { src, status: "official", kind: "official", visualKey: `official:${clean(value)}` };
    } catch (_) {}
    return null;
  }

  function officialLibrary(value) {
    const key = clean(value);
    const filename = OFFICIAL_LIBRARY[key];
    if (!filename) return null;
    return {
      src: officialUrl(filename),
      status: "official",
      kind: "official-library",
      visualKey: `official-library:${key}`,
      details: { key, filename, source: "Assets-DuduQ" }
    };
  }

  function resolve(value, options) {
    const requested = String(value == null ? "" : value).trim();
    if (!requested) return null;

    const exact = official(requested) || officialLibrary(requested);
    if (exact) return Object.freeze({ requested, ...exact });

    const builders = [
      ["math", () => mathExpression(options?.expression || requested)],
      ["shape", () => shapeVisual(requested)],
      ["scene", () => sceneVisual(requested)],
      ["object-composition", () => objectVisual(requested)],
      ["number", () => numeral(requested)],
      ["color", () => colorVisual(requested)]
    ];
    for (const [kind, build] of builders) {
      const src = build();
      if (src) return Object.freeze({ requested, src, status: "semantic-composition", kind, visualKey: `semantic:${clean(requested)}` });
    }
    return Object.freeze({ requested, src: null, status: "asset-gap", kind: "gap", visualKey: `gap:${clean(requested)}` });
  }

  window.DuduQSmartVisual = Object.freeze({
    version: VERSION,
    contract: "OFFICIAL_EXACT_ALIAS > OFFICIAL_LIBRARY > CONTROLLED_SEMANTIC > EXPLICIT_GAP",
    resolve
  });
})();
