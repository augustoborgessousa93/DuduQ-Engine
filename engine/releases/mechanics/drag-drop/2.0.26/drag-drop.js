/* =========================================================
   DUDUQ MECHANIC — DRAG & DROP 2.0.26 CANDIDATE
   BALANCED CARD SCALE

   Base imutável: Drag & Drop 2.0.25.
   Escopo desta candidata:
   - estabiliza a proporção entre banco, itens posicionados e destinos;
   - remove saltos visuais grandes entre estados;
   - preserva integralmente avaliação, confirmar, retry, success e smart snap;
   - não altera Core, Loader, Player, Host, Progress ou conteúdo.
   ========================================================= */
(function () {
  "use strict";

  const VERSION = "2.0.26";
  const BASE_URL = "/engine/releases/mechanics/drag-drop/2.0.25/drag-drop.js";
  const BALANCED_CSS_HOOK = "__DUDUQ_DD226_BALANCED_CSS__";

  function fail(message) {
    throw new Error("[DuduQ Drag & Drop 2.0.26 candidate] " + message);
  }

  function replaceRequired(source, from, to, expected) {
    const wanted = expected == null ? 1 : expected;
    const count = source.split(from).length - 1;
    if (count !== wanted) {
      fail("assinatura inesperada (" + count + "/" + wanted + "): " + from.slice(0, 140));
    }
    return source.split(from).join(to);
  }

  const BALANCED_CSS = `
/* === DUDUQ DRAG & DROP 2.0.26 — BALANCED CARDS === */
.duduq-dd2-root {
  --dd226-bank-card-w: clamp(148px, 12vw, 160px);
  --dd226-bank-card-h: 92px;
  --dd226-placed-card-w: clamp(146px, 11.8vw, 158px);
  --dd226-placed-card-h: 90px;
  --dd226-media-h: 60px;
  --dd226-target-h: clamp(150px, 20vh, 172px);
  --dd226-zone-h: 98px;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  overflow-x: clip !important;
}

.duduq-dd2-arena {
  width: min(1180px, 100%) !important;
  max-width: 100% !important;
  min-width: 0 !important;
  gap: clamp(8px, 1.2vh, 14px) !important;
  padding: clamp(3px, .55vw, 7px) clamp(5px, .9vw, 11px) clamp(8px, 1.1vh, 12px) !important;
  overflow-x: clip !important;
}

.duduq-dd2-targets {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)) !important;
  gap: clamp(10px, 1vw, 14px) !important;
  align-items: stretch !important;
}

.duduq-dd2-target {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  min-height: var(--dd226-target-h) !important;
  padding: 20px 8px 7px !important;
  box-sizing: border-box !important;
}

.duduq-dd2-target-head {
  min-height: 48px !important;
  padding: 2px 6px !important;
  box-sizing: border-box !important;
}

.duduq-dd2-zone {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  min-height: var(--dd226-zone-h) !important;
  display: flex !important;
  flex-flow: row nowrap !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  padding: 5px 8px !important;
  box-sizing: border-box !important;
  overflow: clip !important;
}

/* Mesma família de tamanho em todos os estados: sem salto grande. */
.duduq-dd2-bank[data-dd2-bank] .duduq-dd2-item[data-has-media="true"] {
  width: var(--dd226-bank-card-w) !important;
  min-width: min(var(--dd226-bank-card-w), 100%) !important;
  max-width: min(var(--dd226-bank-card-w), 100%) !important;
  min-height: var(--dd226-bank-card-h) !important;
  height: var(--dd226-bank-card-h) !important;
  max-height: var(--dd226-bank-card-h) !important;
  padding: 5px 7px !important;
  gap: 2px !important;
  box-sizing: border-box !important;
}

.duduq-dd2-zone .duduq-dd2-item-shell {
  width: var(--dd226-placed-card-w) !important;
  min-width: 0 !important;
  max-width: min(var(--dd226-placed-card-w), 48%) !important;
  flex: 0 1 var(--dd226-placed-card-w) !important;
  overflow: visible !important;
}

.duduq-dd2-zone .duduq-dd2-item[data-has-media="true"][data-placed="true"],
.duduq-dd2-zone .duduq-dd2-item[data-has-media="true"] {
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
  min-height: var(--dd226-placed-card-h) !important;
  height: var(--dd226-placed-card-h) !important;
  max-height: var(--dd226-placed-card-h) !important;
  padding: 5px 7px !important;
  gap: 2px !important;
  box-sizing: border-box !important;
  overflow: visible !important;
}

.duduq-dd2-bank[data-dd2-bank] .duduq-dd2-item-media,
.duduq-dd2-zone .duduq-dd2-item-media {
  width: min(92%, 112px) !important;
  max-width: 92% !important;
  height: var(--dd226-media-h) !important;
  max-height: var(--dd226-media-h) !important;
  object-fit: contain !important;
  object-position: center !important;
  flex: 0 0 var(--dd226-media-h) !important;
}

.duduq-dd2-bank[data-dd2-bank] .duduq-dd2-item > span:not(.duduq-dd2-audio-mark),
.duduq-dd2-zone .duduq-dd2-item > span:not(.duduq-dd2-audio-mark) {
  display: block !important;
  min-height: 17px !important;
  line-height: 17px !important;
  margin: 0 !important;
  padding: 0 2px !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  box-sizing: border-box !important;
}

.duduq-dd2-bank[data-dd2-bank] {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  padding: 5px 8px 7px !important;
  box-sizing: border-box !important;
}

.duduq-dd2-bank-items {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  gap: 10px !important;
  align-items: center !important;
  justify-content: center !important;
}

/* O banco vazio deixa de reservar altura. */
.duduq-dd2-bank[data-dd2-bank]:not(:has(.duduq-dd2-item)) {
  display: none !important;
  min-height: 0 !important;
  height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  box-shadow: none !important;
}

.duduq-dd2-actions {
  margin-top: 8px !important;
  padding-top: 8px !important;
}

@media (max-height: 720px) and (min-width: 700px) {
  .duduq-dd2-root {
    --dd226-bank-card-w: 150px;
    --dd226-bank-card-h: 86px;
    --dd226-placed-card-w: 150px;
    --dd226-placed-card-h: 86px;
    --dd226-media-h: 56px;
    --dd226-target-h: 156px;
    --dd226-zone-h: 94px;
  }
  .duduq-dd2-arena { gap: 6px !important; padding-bottom: 6px !important; }
  .duduq-dd2-target { padding: 18px 7px 6px !important; }
  .duduq-dd2-target-head { min-height: 34px !important; }
  .duduq-dd2-zone { padding: 4px 7px !important; gap: 7px !important; }
  .duduq-dd2-bank[data-dd2-bank] { padding-block: 4px 6px !important; }
  .duduq-dd2-actions { margin-top: 9px !important; padding-top: 8px !important; }
}

@media (max-width: 820px) {
  .duduq-dd2-root {
    --dd226-bank-card-w: 146px;
    --dd226-bank-card-h: 86px;
    --dd226-placed-card-w: 144px;
    --dd226-placed-card-h: 84px;
    --dd226-media-h: 54px;
    --dd226-target-h: 148px;
    --dd226-zone-h: 92px;
  }
  .duduq-dd2-targets { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 8px !important; }
  .duduq-dd2-zone { gap: 6px !important; padding-inline: 5px !important; }
}

@media (max-width: 520px) {
  .duduq-dd2-root {
    --dd226-bank-card-w: 138px;
    --dd226-bank-card-h: 82px;
    --dd226-placed-card-w: 136px;
    --dd226-placed-card-h: 82px;
    --dd226-media-h: 52px;
    --dd226-target-h: 138px;
    --dd226-zone-h: 88px;
  }
  .duduq-dd2-arena { gap: 7px !important; padding: 2px 4px 8px !important; }
  .duduq-dd2-targets { grid-template-columns: minmax(0, 1fr) !important; gap: 7px !important; }
  .duduq-dd2-target { padding: 18px 6px 6px !important; }
  .duduq-dd2-target-head { min-height: 38px !important; }
  .duduq-dd2-zone .duduq-dd2-item-shell { max-width: min(var(--dd226-placed-card-w), 46%) !important; }
  .duduq-dd2-bank-items { gap: 8px !important; }
}

@media (prefers-reduced-motion: reduce) {
  .duduq-dd2-target,
  .duduq-dd2-item,
  .duduq-dd2-ghost { transition: none !important; transform: none !important; }
}
`;

  try {
    Object.defineProperty(window, BALANCED_CSS_HOOK, {
      value: BALANCED_CSS,
      configurable: true,
      writable: false
    });
  } catch (_) {
    window[BALANCED_CSS_HOOK] = BALANCED_CSS;
  }

  const xhr = new XMLHttpRequest();
  xhr.open("GET", BASE_URL + "?dd226Base=2.0.25", false);
  try { xhr.send(null); } catch (error) {
    fail("não foi possível carregar a base 2.0.25: " + (error && error.message ? error.message : String(error)));
  }
  if (xhr.status < 200 || xhr.status >= 300 || !xhr.responseText) {
    fail("falha HTTP " + xhr.status + " ao carregar a base 2.0.25.");
  }

  let source = xhr.responseText;

  /* A lógica é exatamente a da 2.0.25; somente a identidade da release candidata muda. */
  source = source.split("2.0.25").join(VERSION);
  source = source.split("__DUDUQ_DD225_SMART_CONFIRM_PATCH__").join("__DUDUQ_DD226_SMART_CONFIRM_PATCH__");

  source = replaceRequired(
    source,
    `prepared = prepared.replace("</head>", '<style id="duduq-dd225-internal-smart-surface">' + INTERNAL_CSS + "</style></head>");`,
    `prepared = prepared.replace("</head>", '<style id="duduq-dd225-internal-smart-surface">' + INTERNAL_CSS + '</style><style id="duduq-dd226-balanced-cards">' + window.__DUDUQ_DD226_BALANCED_CSS__ + "</style></head>");`
  );

  try {
    (0, eval)(source);
  } catch (error) {
    fail("falha ao inicializar release candidata: " + (error && error.message ? error.message : String(error)));
  }
})();
