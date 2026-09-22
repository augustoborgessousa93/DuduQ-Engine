/* DUDUQ English Year 2 — M05 body-part visual clarity bridge
   Scope: visual resolution only.
   The M05 source explicitly requires the body part to be highlighted. Full-body
   character art is not sufficient at small Matching/Target cards, so this bridge
   returns deterministic zoomed semantic cards for body vocabulary.
*/
(function () {
  "use strict";

  const factory = window.DuduQYear2V23Factory;
  if (!factory || typeof factory.buildModule !== "function") {
    throw new Error("[DuduQ Year2 Body Highlight] Factory v2.3 indisponível.");
  }
  if (factory.__bodyHighlightBridgeApplied) return;

  const VERSION = "1.0.0-m05-body-highlight-rc1";
  const upstreamResolve = typeof factory.resolveYear2Visual === "function"
    ? factory.resolveYear2Visual.bind(factory)
    : null;

  const BODY = Object.freeze({
    head:"head", eye:"eye", eyes:"eye", ear:"ear", ears:"ear", nose:"nose", mouth:"mouth",
    shoulder:"shoulders", shoulders:"shoulders", arm:"arms", arms:"arms", hand:"hands", hands:"hands",
    knee:"knee", knees:"knee", leg:"legs", legs:"legs", foot:"feet", feet:"feet",
    finger:"finger", fingers:"finger"
  });
  const PLURAL_DEFAULT_TWO = new Set(["eye","ear","shoulders","arms","hands","knee","legs","feet"]);

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

  function escapeXml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parseBody(label) {
    const key = normalize(label);
    const tokens = key.split(" ").filter(Boolean);
    const token = tokens.find((word) => BODY[word]);
    if (!token) return null;
    const part = BODY[token];
    let count = 1;
    if (tokens.includes("two") || tokens.includes("2")) count = 2;
    else if (tokens.includes("one") || tokens.includes("1")) count = 1;
    else if (/s$/.test(token) && PLURAL_DEFAULT_TWO.has(part)) count = 2;
    return { part, count, key };
  }

  function shell(inner, alt) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="260" viewBox="0 0 360 260" role="img" aria-label="${escapeXml(alt)}"><defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect x="7" y="7" width="346" height="246" rx="34" fill="#f8fcff" stroke="#d8e8f6" stroke-width="4"/>${inner}</svg>`;
  }

  function ring(cx, cy, rx, ry) {
    return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#ffd43b" fill-opacity=".15" stroke="#ffb000" stroke-width="10" filter="url(#glow)"/>`;
  }

  function faceCard(part, count, alt) {
    let h = `<circle cx="180" cy="130" r="88" fill="#f3c7a4" stroke="#6b7d8e" stroke-width="5"/><path d="M105 103 Q112 31 180 29 Q248 31 255 103 Q229 72 180 72 Q131 72 105 103" fill="#4c2f23"/><ellipse cx="91" cy="132" rx="17" ry="28" fill="#f3c7a4" stroke="#6b7d8e" stroke-width="4"/><ellipse cx="269" cy="132" rx="17" ry="28" fill="#f3c7a4" stroke="#6b7d8e" stroke-width="4"/><circle cx="151" cy="119" r="9" fill="#263238"/><circle cx="209" cy="119" r="9" fill="#263238"/><path d="M180 126 l-10 30 h20" fill="none" stroke="#a56f58" stroke-width="5" stroke-linecap="round"/><path d="M151 174 Q180 196 209 174" fill="none" stroke="#9d3f47" stroke-width="7" stroke-linecap="round"/>`;
    if (part === "head") h += ring(180,130,104,104);
    if (part === "eye") h += count > 1 ? ring(180,119,49,21) : ring(151,119,22,22);
    if (part === "ear") h += count > 1 ? ring(180,132,108,38) : ring(91,132,27,38);
    if (part === "nose") h += ring(180,145,28,33);
    if (part === "mouth") h += ring(180,176,45,25);
    return shell(h, alt);
  }

  function upperCard(part, count, alt) {
    let h = `<circle cx="180" cy="55" r="34" fill="#f3c7a4" stroke="#6b7d8e" stroke-width="4"/><path d="M148 48 Q154 19 180 18 Q207 19 213 48 Q195 34 180 34 Q165 34 148 48" fill="#4c2f23"/><rect x="126" y="91" width="108" height="104" rx="34" fill="#4fa5e8" stroke="#5e7488" stroke-width="5"/><line x1="137" y1="112" x2="78" y2="181" stroke="#f3c7a4" stroke-width="24" stroke-linecap="round"/><line x1="223" y1="112" x2="282" y2="181" stroke="#f3c7a4" stroke-width="24" stroke-linecap="round"/><circle cx="73" cy="187" r="18" fill="#f3c7a4" stroke="#6b7d8e" stroke-width="4"/><circle cx="287" cy="187" r="18" fill="#f3c7a4" stroke="#6b7d8e" stroke-width="4"/>`;
    if (part === "shoulders") h += `${ring(137,111,29,25)}${ring(223,111,29,25)}`;
    if (part === "arms") h += count > 1 ? `${ring(105,146,43,64)}${ring(255,146,43,64)}` : ring(105,146,43,64);
    if (part === "hands") h += count > 1 ? `${ring(73,187,29,29)}${ring(287,187,29,29)}` : ring(73,187,29,29);
    return shell(h, alt);
  }

  function lowerCard(part, count, alt) {
    let h = `<rect x="128" y="25" width="104" height="92" rx="30" fill="#4fa5e8" stroke="#5e7488" stroke-width="5"/><line x1="157" y1="110" x2="128" y2="211" stroke="#34495e" stroke-width="30" stroke-linecap="round"/><line x1="203" y1="110" x2="232" y2="211" stroke="#34495e" stroke-width="30" stroke-linecap="round"/><ellipse cx="113" cy="229" rx="35" ry="16" fill="#f5c441" stroke="#6b7d8e" stroke-width="4"/><ellipse cx="247" cy="229" rx="35" ry="16" fill="#f5c441" stroke="#6b7d8e" stroke-width="4"/>`;
    if (part === "knee") h += count > 1 ? `${ring(140,166,29,25)}${ring(220,166,29,25)}` : ring(140,166,29,25);
    if (part === "legs") h += count > 1 ? `${ring(137,165,37,76)}${ring(223,165,37,76)}` : ring(137,165,37,76);
    if (part === "feet") h += count > 1 ? `${ring(113,229,46,25)}${ring(247,229,46,25)}` : ring(113,229,46,25);
    return shell(h, alt);
  }

  function fingerCard(alt) {
    const h = `<text x="180" y="185" text-anchor="middle" font-size="150" font-family="Segoe UI Emoji,Apple Color Emoji,Noto Color Emoji,sans-serif">☝️</text>${ring(180,131,76,93)}`;
    return shell(h, alt);
  }

  function bodyVisual(label) {
    const parsed = parseBody(label);
    if (!parsed) return null;
    const { part, count, key } = parsed;
    let svg = null;
    if (["head","eye","ear","nose","mouth"].includes(part)) svg = faceCard(part, count, String(label));
    else if (["shoulders","arms","hands"].includes(part)) svg = upperCard(part, count, String(label));
    else if (["knee","legs","feet"].includes(part)) svg = lowerCard(part, count, String(label));
    else if (part === "finger") svg = fingerCard(String(label));
    if (!svg) return null;
    return {
      src: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      status: "semantic-body-highlight",
      visualKey: `body-highlight:${part}:${count}`,
      canonical: key,
      alt: String(label)
    };
  }

  function resolveYear2Visual(label) {
    return bodyVisual(label) || (upstreamResolve ? upstreamResolve(label) : null);
  }

  window.DuduQYear2V23Factory = Object.freeze({
    ...factory,
    resolveYear2Visual,
    resolveOfficialYear2Image:(label) => resolveYear2Visual(label)?.src || null,
    __bodyHighlightBridgeApplied:true,
    bodyHighlightBridgeVersion:VERSION
  });
})();
