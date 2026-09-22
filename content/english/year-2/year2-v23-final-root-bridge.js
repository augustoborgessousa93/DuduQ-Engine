/* DUDUQ English Year 2 — final-root compatibility + smart visual bridge
   The upstream v2.3 factory freezes only the module root. Final Year-2 hotfix
   layers need to append audit metadata while preserving the same nested content.

   Smart-visual contract added here:
   - exact Assets-DuduQ matches remain first priority;
   - ambiguous ORANGE is resolved as the fruit in the current Year-2 vocabulary;
   - composite labels such as RED APPLE, RED TRAIN and FOUR DOLLS resolve by the
     pedagogical object, never by an isolated descriptor such as RED;
   - deterministic semantic compositions are used only when the bank has no exact
     composite image (quantity/color/size combinations).
*/
(function () {
  "use strict";

  const factory = window.DuduQYear2V23Factory;
  if (!factory || typeof factory.buildModule !== "function") {
    throw new Error("[DuduQ Year2 Final Root Bridge] Factory v2.3 indisponível.");
  }
  if (factory.__finalRootBridgeApplied) return;

  const VERSION = "1.1.1-year2-smart-visual-root";
  const originalBuild = factory.buildModule.bind(factory);
  const upstreamResolve = typeof factory.resolveYear2Visual === "function"
    ? factory.resolveYear2Visual.bind(factory)
    : null;
  const baseFactory = window.DuduQYear2V22Factory;
  const ASSET_BASE = "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/";

  const NUMBER_WORDS = Object.freeze({
    one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,
    eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,
    seventeen:17,eighteen:18,nineteen:19,twenty:20
  });
  const COLORS = Object.freeze({
    red:"#e53935",blue:"#1976d2",green:"#43a047",yellow:"#f2c94c",
    orange:"#f57c00",pink:"#ec7aa8",black:"#263238",white:"#f7f7f7",brown:"#795548"
  });
  const OBJECTS = Object.freeze([
    { canonical:"teddy bear", aliases:["teddy bear","teddy bears"], emoji:"🧸" },
    { canonical:"video game", aliases:["video game","video games","videogame","videogames"], emoji:"🎮" },
    { canonical:"doll", aliases:["doll","dolls"], emoji:"🪆" },
    { canonical:"ball", aliases:["ball","balls"], emoji:"⚽" },
    { canonical:"train", aliases:["train","trains"], emoji:"🚂" },
    { canonical:"plane", aliases:["plane","planes"], emoji:"✈️" },
    { canonical:"kite", aliases:["kite","kites"], emoji:"🪁" },
    { canonical:"boat", aliases:["boat","boats"], emoji:"⛵" },
    { canonical:"duck", aliases:["duck","ducks"], emoji:"🦆" },
    { canonical:"horse", aliases:["horse","horses"], emoji:"🐴" },
    { canonical:"cow", aliases:["cow","cows"], emoji:"🐄" },
    { canonical:"pig", aliases:["pig","pigs"], emoji:"🐷" },
    { canonical:"sheep", aliases:["sheep"], emoji:"🐑" },
    { canonical:"dog", aliases:["dog","dogs"], emoji:"🐕" },
    { canonical:"cat", aliases:["cat","cats"], emoji:"🐈" },
    { canonical:"apple", aliases:["apple","apples"], emoji:"🍎", food:true },
    { canonical:"banana", aliases:["banana","bananas"], emoji:"🍌", food:true },
    { canonical:"grape", aliases:["grape","grapes"], emoji:"🍇", food:true },
    { canonical:"papaya", aliases:["papaya","papayas"], emoji:"🍈", food:true },
    { canonical:"melon", aliases:["melon","melons"], emoji:"🍈", food:true },
    { canonical:"carrot", aliases:["carrot","carrots"], emoji:"🥕", food:true },
    { canonical:"tomato", aliases:["tomato","tomatoes"], emoji:"🍅", food:true },
    { canonical:"potato", aliases:["potato","potatoes"], emoji:"🥔", food:true },
    { canonical:"pear", aliases:["pear","pears"], emoji:"🍐", food:true },
    { canonical:"orange", aliases:["orange","oranges"], emoji:"🍊", food:true }
  ]);

  function normalize(value) {
    return String(value == null ? "" : value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  function phraseCore(value) {
    let key = normalize(value);
    const prefixes = [
      "its a ","its an ","it is a ","it is an ","this is a ","this is an ",
      "this is my ","these are ","those are ","i have a ","i have an ",
      "my favorite toy is a ","my favorite toy is ","my favourite toy is a ","my favourite toy is "
    ];
    for (const prefix of prefixes) {
      if (key.startsWith(prefix)) {
        key = key.slice(prefix.length).trim();
        break;
      }
    }
    return key;
  }

  function bank(file) {
    return ASSET_BASE + encodeURIComponent(file).replace(/%2F/gi, "/");
  }

  function repository(file, canonical) {
    return {
      src: bank(file),
      status: "repository-asset",
      visualKey: `official:${file}`,
      canonical: canonical || normalize(file)
    };
  }

  function resolvedBase(descriptor, status, visualKey) {
    if (!baseFactory || typeof baseFactory.resolveVisual !== "function") return null;
    try {
      const visual = baseFactory.resolveVisual(descriptor);
      if (!visual?.src) return null;
      return {
        src: String(visual.src),
        status: status || String(visual.status || "semantic-vector"),
        visualKey: visualKey || String(visual.src),
        canonical: normalize(descriptor?.alt || "")
      };
    } catch (_) {
      return null;
    }
  }

  function findObject(key) {
    const padded = ` ${key} `;
    for (const object of OBJECTS) {
      for (const alias of object.aliases) {
        if (padded.includes(` ${alias} `)) return object;
      }
    }
    return null;
  }

  function countIn(key) {
    for (const token of key.split(" ")) {
      if (NUMBER_WORDS[token]) return NUMBER_WORDS[token];
      if (/^\d+$/.test(token)) return Math.max(1, Math.min(20, Number(token)));
    }
    return 1;
  }

  function colorIn(key) {
    return key.split(" ").find((token) => Object.prototype.hasOwnProperty.call(COLORS, token)) || null;
  }

  function escapeXml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function coloredObjectSvg(object, color, count, alt) {
    if (!["ball","train","boat"].includes(object) || !color) return null;
    const fill = COLORS[color] || "#1976d2";
    const n = Math.max(1, Math.min(6, Number(count) || 1));
    const cols = n <= 3 ? n : 3;
    const rows = Math.ceil(n / cols);
    const cellW = 300 / cols;
    const cellH = 190 / rows;
    const scale = Math.min(1, 2.2 / Math.max(cols, rows));
    let body = "";

    function icon(cx, cy) {
      const s = 52 * scale;
      if (object === "ball") {
        return `<circle cx="${cx}" cy="${cy}" r="${s}" fill="${fill}" stroke="#263238" stroke-width="5"/><path d="M${cx-s*.72} ${cy-s*.15} Q${cx} ${cy-s*.75} ${cx+s*.72} ${cy-s*.15} M${cx-s*.65} ${cy+s*.25} Q${cx} ${cy+s*.78} ${cx+s*.65} ${cy+s*.25}" fill="none" stroke="#ffffff" stroke-width="5" opacity=".85"/>`;
      }
      if (object === "train") {
        return `<g><rect x="${cx-s}" y="${cy-s*.25}" width="${s*1.7}" height="${s*.72}" rx="8" fill="${fill}" stroke="#263238" stroke-width="5"/><rect x="${cx-s*.65}" y="${cy-s*.83}" width="${s*.75}" height="${s*.62}" rx="7" fill="${fill}" stroke="#263238" stroke-width="5"/><rect x="${cx+s*.25}" y="${cy-s*.78}" width="${s*.18}" height="${s*.55}" fill="#455a64"/><circle cx="${cx-s*.55}" cy="${cy+s*.55}" r="${s*.28}" fill="#263238"/><circle cx="${cx+s*.28}" cy="${cy+s*.55}" r="${s*.28}" fill="#263238"/></g>`;
      }
      return `<g><polygon points="${cx-s},${cy+s*.18} ${cx+s},${cy+s*.18} ${cx+s*.55},${cy+s*.72} ${cx-s*.62},${cy+s*.72}" fill="${fill}" stroke="#263238" stroke-width="5"/><line x1="${cx}" y1="${cy-s*.85}" x2="${cx}" y2="${cy+s*.18}" stroke="#455a64" stroke-width="5"/><polygon points="${cx+4},${cy-s*.78} ${cx+s*.72},${cy-s*.02} ${cx+4},${cy-s*.02}" fill="#ffffff" stroke="#607d8b" stroke-width="4"/></g>`;
    }

    for (let i = 0; i < n; i += 1) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = 30 + cellW * col + cellW / 2;
      const cy = 25 + cellH * row + cellH / 2;
      body += icon(cx, cy);
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="260" viewBox="0 0 360 260" role="img" aria-label="${escapeXml(alt)}"><rect x="8" y="8" width="344" height="244" rx="36" fill="#f8fbff" stroke="#d6e4f1" stroke-width="4"/>${body}</svg>`;
    return {
      src: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      status: "semantic-object-color-count",
      visualKey: `object:${object}:${color}:${n}`,
      canonical: normalize(alt)
    };
  }

  function semanticComposite(label) {
    const key = phraseCore(label);
    const object = findObject(key);
    if (!object) return null;

    const count = countIn(key);
    const color = colorIn(key);
    const hasBig = /(^| )big( |$)/.test(key);
    const hasSmall = /(^| )small( |$)/.test(key);

    if (object.food && hasBig && hasSmall) {
      return resolvedBase(
        { kind:"food-size-pair", food:object.canonical, alt:String(label) },
        "semantic-food-size-pair",
        `food-size-pair:${object.canonical}`
      );
    }
    if (object.food && (hasBig || hasSmall)) {
      const size = hasBig ? "big" : "small";
      return resolvedBase(
        { kind:"food-size", food:object.canonical, size, alt:String(label) },
        "semantic-food-size",
        `food-size:${object.canonical}:${size}`
      );
    }

    if (color && ["ball","train","boat"].includes(object.canonical)) {
      const colored = coloredObjectSvg(object.canonical, color, count, String(label));
      if (colored) return colored;
    }

    if (count > 1) {
      return resolvedBase(
        { kind:"count-emoji", emoji:object.emoji, count, alt:String(label) },
        "semantic-object-count",
        `object-count:${object.canonical}:${count}:${color || "natural"}`
      );
    }

    // For descriptive phrases without an exact composite asset, preserve the
    // semantic object. If color/attributes are not visually encoded, keep the
    // original visualKey so Matching cannot treat the same bitmap as two variants.
    if (upstreamResolve) {
      const objectVisual = upstreamResolve(object.canonical);
      if (objectVisual?.src) {
        return {
          ...objectVisual,
          status: objectVisual.status === "repository-asset"
            ? "repository-asset-object-context"
            : String(objectVisual.status || "semantic-object-context"),
          visualKey: String(objectVisual.visualKey || objectVisual.src),
          canonical: key
        };
      }
    }

    return resolvedBase(
      { kind:"count-emoji", emoji:object.emoji, count:1, alt:String(label) },
      "semantic-object-context",
      `object:${object.canonical}:1:${color || "natural"}`
    );
  }

  function resolveYear2Visual(label) {
    const key = phraseCore(label);

    // In the frozen Year-2 source, standalone "orange" is FOOD (M06), not the
    // color vocabulary card. Explicit color+object phrases are handled below.
    if (key === "orange") {
      return repository("Orange  -laranja fruta.png", "orange-fruit");
    }

    const direct = upstreamResolve ? upstreamResolve(label) : null;
    if (direct?.src) return direct;

    return semanticComposite(label);
  }

  window.DuduQYear2V23Factory = Object.freeze({
    ...factory,
    buildModule(config) {
      const module = originalBuild(config);
      if (!module || typeof module !== "object") return module;
      return {
        ...module,
        audit: { ...(module.audit || {}) }
      };
    },
    resolveYear2Visual,
    resolveOfficialYear2Image:(label) => resolveYear2Visual(label)?.src || null,
    __finalRootBridgeApplied: true,
    finalRootBridgeVersion: VERSION,
    smartVisualContract: "OFFICIAL_EXACT > OBJECT_AWARE_COMPOSITE > CONTROLLED_SEMANTIC"
  });
})();
