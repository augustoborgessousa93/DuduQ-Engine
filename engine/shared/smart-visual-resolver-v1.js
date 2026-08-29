/* =========================================================
   DUDUQ SHARED — SMART VISUAL RESOLVER v1.0.0

   Cross-year contract:
   1) DuduQAssets official exact/alias resolver first;
   2) deterministic semantic composition only for genuine gaps;
   3) never returns a broken/empty URL silently.

   This layer contains presentation semantics, not Year-specific pedagogy.
   ========================================================= */
(function () {
  "use strict";

  const VERSION = "1.0.0";
  if (window.DuduQSmartVisual?.version === VERSION) return;

  function clean(value) {
    return String(value == null ? "" : value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/[^a-z0-9+×÷=\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function svg(markup) {
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(markup);
  }

  function card(body, aria) {
    return svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420" role="img" aria-label="${String(aria || "visual").replace(/&/g,"&amp;").replace(/"/g,"&quot;")}"><rect x="8" y="8" width="624" height="404" rx="48" fill="#f7fbff" stroke="#b8d4ec" stroke-width="8"/>${body}</svg>`);
  }

  const COLOR = Object.freeze({
    red: "#e53935", blue: "#1e88e5", yellow: "#fdd835", green: "#43a047",
    orange: "#fb8c00", pink: "#ec407a", purple: "#8e24aa", brown: "#795548",
    black: "#263238", white: "#ffffff"
  });
  const SHAPES = ["circle","rectangle","triangle","square","star"];

  function numeral(value) {
    const match = clean(value).match(/(?:^|\b)(\d{1,2})(?:\b|$)/);
    if (!match) return null;
    const number = Number(match[1]);
    if (!Number.isFinite(number) || number < 1 || number > 99) return null;
    return card(`<circle cx="320" cy="210" r="145" fill="#fff" stroke="#4aa3e8" stroke-width="14"/><text x="320" y="250" text-anchor="middle" font-family="Nunito,Arial,sans-serif" font-size="132" font-weight="900" fill="#173d68">${number}</text>`, String(number));
  }

  function mathExpression(value) {
    const raw = String(value || "").trim();
    if (!/[+×÷=−-]/.test(raw) || !/\d/.test(raw)) return null;
    const safe = raw.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    return card(`<rect x="70" y="128" width="500" height="164" rx="34" fill="#fff" stroke="#79b7e8" stroke-width="8"/><text x="320" y="235" text-anchor="middle" font-family="Nunito,Arial,sans-serif" font-size="72" font-weight="900" fill="#173d68">${safe}</text>`, raw);
  }

  function shapeVisual(value) {
    const norm = clean(value);
    const shape = SHAPES.find((name) => new RegExp(`\\b${name}s?\\b`).test(norm));
    if (!shape) return null;
    const colorName = Object.keys(COLOR).find((name) => new RegExp(`\\b${name}\\b`).test(norm)) || "blue";
    const fill = COLOR[colorName];
    const countMatch = norm.match(/\b(\d{1,2})\b/);
    const count = Math.max(1, Math.min(12, Number(countMatch?.[1]) || (/\btwo\b/.test(norm)?2:/\bthree\b/.test(norm)?3:/\bfour\b/.test(norm)?4:/\bfive\b/.test(norm)?5:/\bsix\b/.test(norm)?6:/\bseven\b/.test(norm)?7:1)));
    const small = /\bsmall\b/.test(norm);
    const big = /\bbig\b/.test(norm);
    const size = small ? 42 : big ? 78 : count > 4 ? 44 : 62;
    const cols = Math.min(4, count);
    const rows = Math.ceil(count / cols);
    const gapX = 440 / Math.max(1, cols - 1 || 1);
    const gapY = 250 / Math.max(1, rows - 1 || 1);
    let marks = "";
    for (let i=0;i<count;i+=1) {
      const col=i%cols, row=Math.floor(i/cols);
      const x=100+(cols===1?220:col*gapX), y=85+(rows===1?125:row*gapY);
      if (shape === "circle") marks += `<circle cx="${x}" cy="${y}" r="${size/2}" fill="${fill}" stroke="#173d68" stroke-width="5"/>`;
      else if (shape === "rectangle") marks += `<rect x="${x-size*.72}" y="${y-size*.42}" width="${size*1.44}" height="${size*.84}" rx="10" fill="${fill}" stroke="#173d68" stroke-width="5"/>`;
      else if (shape === "square") marks += `<rect x="${x-size/2}" y="${y-size/2}" width="${size}" height="${size}" rx="10" fill="${fill}" stroke="#173d68" stroke-width="5"/>`;
      else if (shape === "triangle") marks += `<path d="M ${x} ${y-size*.62} L ${x-size*.62} ${y+size*.5} L ${x+size*.62} ${y+size*.5} Z" fill="${fill}" stroke="#173d68" stroke-width="5"/>`;
      else marks += `<path d="M ${x} ${y-size*.62} L ${x+size*.18} ${y-size*.2} L ${x+size*.62} ${y-size*.18} L ${x+size*.28} ${y+size*.1} L ${x+size*.39} ${y+size*.55} L ${x} ${y+size*.3} L ${x-size*.39} ${y+size*.55} L ${x-size*.28} ${y+size*.1} L ${x-size*.62} ${y-size*.18} L ${x-size*.18} ${y-size*.2} Z" fill="${fill}" stroke="#173d68" stroke-width="5"/>`;
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

  function official(value) {
    try {
      const details = window.DuduQAssets?.resolveImageDetails?.(value);
      if (details?.url) return { src: details.url, status: "official", visualKey: `official:${details.key || clean(value)}`, details };
      const src = window.DuduQAssets?.resolveImage?.(value);
      if (src) return { src, status: "official", visualKey: `official:${clean(value)}` };
    } catch (_) {}
    return null;
  }

  function resolve(value, options) {
    const requested = String(value == null ? "" : value).trim();
    if (!requested) return null;
    const exact = official(requested);
    if (exact) return Object.freeze({ requested, ...exact });

    const builders = [
      () => mathExpression(options?.expression || requested),
      () => shapeVisual(requested),
      () => numeral(requested),
      () => colorVisual(requested)
    ];
    for (const build of builders) {
      const src = build();
      if (src) return Object.freeze({ requested, src, status: "semantic-composition", visualKey: `semantic:${clean(requested)}` });
    }
    return Object.freeze({ requested, src: null, status: "asset-gap", visualKey: `gap:${clean(requested)}` });
  }

  window.DuduQSmartVisual = Object.freeze({
    version: VERSION,
    contract: "OFFICIAL_EXACT_ALIAS > CONTROLLED_SEMANTIC > EXPLICIT_GAP",
    resolve
  });
})();
