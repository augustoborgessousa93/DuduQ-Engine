/* DUDUQ English Year 3 — visual resolver v1
   OFFICIAL CORE CATALOG FIRST -> deterministic semantic composition.
   This file contains no mechanic behavior. It only resolves pedagogical visuals.
*/
(function () {
  "use strict";

  const VERSION = "1.0.0";
  if (window.DuduQYear3Visuals?.version === VERSION) return;

  const COLORS = Object.freeze({
    red: "#ef4444",
    blue: "#3b82f6",
    yellow: "#facc15",
    green: "#22c55e",
    orange: "#fb923c",
    pink: "#ec4899",
    brown: "#92400e",
    black: "#1f2937",
    white: "#ffffff",
    purple: "#8b5cf6",
    gray: "#94a3b8",
    grey: "#94a3b8"
  });

  const NUMBER_WORDS = Object.freeze({
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
    thirty: 30, forty: 40, fifty: 50
  });

  const EMOJI = Object.freeze({
    friend: "🧒🏽🧒🏻",
    friends: "🧒🏽🧒🏻",
    teacher: "🧑‍🏫",
    mother: "👩",
    father: "👨",
    sister: "👧",
    brother: "👦",
    grandfather: "👴",
    grandmother: "👵",
    ball: "⚽",
    kite: "🪁",
    doll: "🪆",
    train: "🚆",
    truck: "🚚",
    bus: "🚌",
    car: "🚗",
    plane: "✈️",
    pencil: "✏️",
    ruler: "📏",
    eraser: "▰",
    backpack: "🎒",
    cat: "🐱",
    cats: "🐱",
    dog: "🐶",
    dogs: "🐶",
    rabbit: "🐰",
    rabbits: "🐰",
    turtle: "🐢",
    turtles: "🐢",
    duck: "🦆",
    ducks: "🦆",
    bird: "🐦",
    birds: "🐦",
    hands: "👐",
    hand: "✋",
    nose: "👃",
    eyes: "👀",
    eye: "👁️",
    hair: "💇"
  });

  function normalize(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[“”‘’'".,!?;:()[\]{}]/g, " ")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeXml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function dataSvg(svg) {
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  function cardSvg(inner, options = {}) {
    const width = Number(options.width) || 640;
    const height = Number(options.height) || 420;
    const background = options.background || "#f8fbff";
    return dataSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="100%" height="100%" rx="38" fill="${background}"/>
        <rect x="12" y="12" width="${width - 24}" height="${height - 24}" rx="30" fill="none" stroke="#d6e8f7" stroke-width="8"/>
        ${inner}
      </svg>`);
  }

  function official(label) {
    try {
      const details = window.DuduQAssets?.resolveImageDetails?.(label);
      if (details?.url) {
        return Object.freeze({
          kind: "official",
          src: details.url,
          assetKey: details.key || "",
          alt: String(label || ""),
          strategy: "CORE_OFFICIAL_EXACT_ALIAS"
        });
      }
    } catch (_) {}
    return null;
  }

  function letter(value) {
    const text = String(value || "").trim().toUpperCase().slice(0, 2);
    return {
      kind: "semantic",
      src: cardSvg(`<circle cx="320" cy="210" r="132" fill="#ffffff" stroke="#58a6dc" stroke-width="12"/>
        <text x="320" y="258" text-anchor="middle" font-family="Nunito,Arial,sans-serif" font-size="154" font-weight="900" fill="#123b67">${escapeXml(text)}</text>`),
      alt: `Letra ${text}`,
      strategy: "SEMANTIC_LETTER_CARD"
    };
  }

  function numeral(value) {
    const text = String(value || "").trim();
    return {
      kind: "semantic",
      src: cardSvg(`<circle cx="320" cy="210" r="136" fill="#ffffff" stroke="#ffd34f" stroke-width="13"/>
        <text x="320" y="257" text-anchor="middle" font-family="Nunito,Arial,sans-serif" font-size="142" font-weight="900" fill="#163d6a">${escapeXml(text)}</text>`),
      alt: `Número ${text}`,
      strategy: "SEMANTIC_NUMBER_CARD"
    };
  }

  function profileCard(data = {}) {
    const rows = [
      ["Name", data.name],
      ["Age", data.age],
      ["Birthday", data.birthday],
      ["Favorite animal", data.favoriteAnimal]
    ].filter((row) => row[1] !== undefined && row[1] !== null && String(row[1]).trim());

    const rowHeight = 64;
    const startY = 110;
    const body = rows.map((row, index) => {
      const y = startY + index * rowHeight;
      return `<text x="70" y="${y}" font-family="Nunito,Arial,sans-serif" font-size="28" font-weight="800" fill="#41627c">${escapeXml(row[0])}:</text>
        <text x="300" y="${y}" font-family="Nunito,Arial,sans-serif" font-size="31" font-weight="900" fill="#153e69">${escapeXml(row[1])}</text>`;
    }).join("");

    return Object.freeze({
      kind: "semantic",
      src: cardSvg(`<rect x="45" y="48" width="550" height="324" rx="28" fill="#ffffff" stroke="#9dd5f3" stroke-width="6"/>
        <circle cx="535" cy="105" r="42" fill="#f3c54b"/><circle cx="535" cy="92" r="17" fill="#ffddb8"/><path d="M506 136 Q535 112 564 136" fill="#72b4e7"/>${body}`),
      alt: `Minificha fictícia de ${String(data.name || "personagem")}`,
      strategy: "SEMANTIC_FICTIONAL_PROFILE"
    });
  }

  function peopleScene(type = "friends") {
    const farewell = type === "farewell";
    const afternoon = type === "afternoon";
    const handshake = type === "meet" || type === "friends";
    const sun = afternoon
      ? '<circle cx="535" cy="90" r="42" fill="#ffd34f"/>'
      : '';
    const gesture = farewell
      ? '<path d="M425 190 Q485 135 520 175" fill="none" stroke="#153e69" stroke-width="12" stroke-linecap="round"/>'
      : handshake
        ? '<path d="M275 250 Q320 225 365 250" fill="none" stroke="#f2b087" stroke-width="20" stroke-linecap="round"/>'
        : '';

    return Object.freeze({
      kind: "semantic",
      src: cardSvg(`${sun}
        <circle cx="220" cy="155" r="54" fill="#8d5524"/><circle cx="420" cy="155" r="54" fill="#f1c27d"/>
        <path d="M150 335 Q220 220 290 335" fill="#4f9bd9"/><path d="M350 335 Q420 220 490 335" fill="#ef6f8f"/>
        <circle cx="201" cy="150" r="7" fill="#17202a"/><circle cx="239" cy="150" r="7" fill="#17202a"/>
        <circle cx="401" cy="150" r="7" fill="#17202a"/><circle cx="439" cy="150" r="7" fill="#17202a"/>
        ${gesture}`),
      alt: farewell ? "Cena de despedida entre dois amigos" : "Cena de encontro entre dois amigos",
      strategy: "SEMANTIC_PEOPLE_SCENE"
    });
  }

  function parseCount(words) {
    if (!words.length) return { count: 1, consumed: 0 };
    if (/^\d+$/.test(words[0])) return { count: Math.max(1, Number(words[0])), consumed: 1 };
    if (NUMBER_WORDS[words[0]]) {
      let count = NUMBER_WORDS[words[0]];
      if (count >= 20 && words[1] && NUMBER_WORDS[words[1]] && NUMBER_WORDS[words[1]] < 10) {
        count += NUMBER_WORDS[words[1]];
        return { count, consumed: 2 };
      }
      return { count, consumed: 1 };
    }
    return { count: 1, consumed: 0 };
  }

  function shapeVisual(label) {
    const n = normalize(label);
    const words = n.split(" ").filter(Boolean);
    const parsed = parseCount(words);
    const count = Math.min(parsed.count, 12);
    const colorName = words.find((word) => COLORS[word]) || "blue";
    const fill = COLORS[colorName];
    const small = words.includes("small");
    const big = words.includes("big");
    const shape = ["circle", "circles", "square", "squares", "rectangle", "rectangles", "triangle", "triangles", "star", "stars"].find((word) => words.includes(word));
    if (!shape) return null;

    const kind = shape.replace(/s$/, "");
    const cols = Math.min(4, count);
    const rows = Math.ceil(count / cols);
    const base = small ? 34 : big ? 60 : 48;
    const cells = [];
    for (let i = 0; i < count; i += 1) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 320 + (col - (cols - 1) / 2) * 120;
      const y = 210 + (row - (rows - 1) / 2) * 110;
      if (kind === "circle") cells.push(`<circle cx="${x}" cy="${y}" r="${base}" fill="${fill}" stroke="#17395e" stroke-width="5"/>`);
      if (kind === "square") cells.push(`<rect x="${x - base}" y="${y - base}" width="${base * 2}" height="${base * 2}" rx="10" fill="${fill}" stroke="#17395e" stroke-width="5"/>`);
      if (kind === "rectangle") cells.push(`<rect x="${x - base * 1.25}" y="${y - base * .72}" width="${base * 2.5}" height="${base * 1.44}" rx="10" fill="${fill}" stroke="#17395e" stroke-width="5"/>`);
      if (kind === "triangle") cells.push(`<path d="M ${x} ${y - base} L ${x - base} ${y + base} L ${x + base} ${y + base} Z" fill="${fill}" stroke="#17395e" stroke-width="5"/>`);
      if (kind === "star") {
        const points = [];
        for (let p = 0; p < 10; p += 1) {
          const angle = -Math.PI / 2 + p * Math.PI / 5;
          const radius = p % 2 === 0 ? base : base * .45;
          points.push(`${x + Math.cos(angle) * radius},${y + Math.sin(angle) * radius}`);
        }
        cells.push(`<polygon points="${points.join(" ")}" fill="${fill}" stroke="#17395e" stroke-width="5"/>`);
      }
    }
    return Object.freeze({ kind: "semantic", src: cardSvg(cells.join("")), alt: label, strategy: "SEMANTIC_SHAPE_COUNT_COLOR_SIZE" });
  }

  function conceptVisual(label) {
    const n = normalize(label);
    if (!n) return null;

    const officialResult = official(n);
    if (officialResult) return officialResult;

    if (/^[a-z]$/i.test(String(label || "").trim())) return Object.freeze(letter(label));
    if (/^\d{1,2}$/.test(n)) return Object.freeze(numeral(n));

    const shape = shapeVisual(n);
    if (shape) return shape;

    if (n.includes("nice to meet") || n.includes("friend")) return peopleScene("meet");
    if (n.includes("see you") || n.includes("goodbye") || n.includes("bye")) return peopleScene("farewell");
    if (n.includes("good afternoon")) return peopleScene("afternoon");

    const words = n.split(" ").filter(Boolean);
    const parsed = parseCount(words);
    const colorName = words.find((word) => COLORS[word]) || "";
    const objectKey = Object.keys(EMOJI).find((key) => words.includes(key));
    if (objectKey) {
      const count = Math.min(parsed.count, 10);
      const emoji = EMOJI[objectKey];
      const itemSize = words.includes("big") ? 88 : words.includes("small") ? 54 : 70;
      const cols = Math.min(5, count);
      const rows = Math.ceil(count / cols);
      const nodes = [];
      if (colorName) {
        nodes.push(`<rect x="44" y="44" width="552" height="54" rx="27" fill="${COLORS[colorName]}" stroke="#17395e" stroke-width="4"/>`);
      }
      for (let i = 0; i < count; i += 1) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = 320 + (col - (cols - 1) / 2) * 105;
        const y = 225 + (row - (rows - 1) / 2) * 110;
        nodes.push(`<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="${itemSize}">${escapeXml(emoji)}</text>`);
      }
      return Object.freeze({
        kind: "semantic",
        src: cardSvg(nodes.join("")),
        alt: label,
        strategy: colorName ? "SEMANTIC_COLOR_PLUS_OBJECT_COMPOSITION" : "SEMANTIC_OBJECT_COUNT_SIZE"
      });
    }

    return Object.freeze({
      kind: "semantic",
      src: cardSvg(`<circle cx="320" cy="190" r="92" fill="#dceffc"/><text x="320" y="215" text-anchor="middle" font-family="Arial,sans-serif" font-size="92">✨</text>`),
      alt: label,
      strategy: "SEMANTIC_GENERIC_SAFE_FALLBACK"
    });
  }

  function resolve(label, options = {}) {
    if (options.type === "profile") return profileCard(options.data || {});
    if (options.type === "scene") return peopleScene(options.scene || "friends");
    return conceptVisual(label);
  }

  window.DuduQYear3Visuals = Object.freeze({
    version: VERSION,
    policy: "CORE_OFFICIAL_FIRST > DETERMINISTIC_SEMANTIC > SAFE_FALLBACK",
    resolve,
    profileCard,
    peopleScene,
    letter,
    numeral,
    normalize
  });
})();
