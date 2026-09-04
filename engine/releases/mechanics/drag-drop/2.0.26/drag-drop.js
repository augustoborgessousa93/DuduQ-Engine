/* =========================================================
   DUDUQ MECHANIC — DRAG & DROP 2.0.26 CANDIDATE
   BALANCED CARD SCALE + COMPLETE REVIEW SURFACE

   Base imutável: Drag & Drop 2.0.25.
   Escopo desta candidata:
   - estabiliza a proporção entre banco, itens posicionados e destinos;
   - amplia levemente os cards sem saltos visuais grandes entre estados;
   - quando todos os itens estão posicionados, usa melhor a área disponível;
   - adiciona × discreto que devolve o item pelo caminho nativo do banco;
   - preserva integralmente avaliação, confirmar, retry, success e smart snap;
   - não altera Core, Loader, Player, Host, Progress ou conteúdo.
   ========================================================= */
(function () {
  "use strict";

  const VERSION = "2.0.26";
  const BASE_URL = "/engine/releases/mechanics/drag-drop/2.0.25/drag-drop.js";
  const BALANCED_CSS_HOOK = "__DUDUQ_DD226_BALANCED_CSS__";
  const BALANCED_RUNTIME_HOOK = "__DUDUQ_DD226_BALANCED_RUNTIME__";

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
/* === DUDUQ DRAG & DROP 2.0.26 — BALANCED CARDS + COMPLETE REVIEW === */
.duduq-dd2-root {
  --dd226-bank-card-w: clamp(206px, 15.3vw, 210px);
  --dd226-bank-card-h: 122px;
  --dd226-placed-card-w: clamp(150px, 12vw, 162px);
  --dd226-placed-card-h: 94px;
  --dd226-media-h: 64px;
  --dd226-target-h: clamp(154px, 20.5vh, 176px);
  --dd226-zone-h: 102px;
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
  padding: 6px 9px !important;
  box-sizing: border-box !important;
  overflow: visible !important;
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
  position: relative !important;
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
  width: min(92%, 116px) !important;
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
  margin: 0 !important;
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
  transform: none;
  transform-origin: center center;
}

/* O banco vazio deixa de reservar altura. O proxy é usado apenas durante × -> banco. */
.duduq-dd2-bank[data-dd2-bank]:not([data-dd226-return-proxy="true"]):not(:has(.duduq-dd2-item)) {
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

/* × discreto. Fica no canto do shell, fora da área principal da imagem. */
.duduq-dd226-remove {
  position: absolute !important;
  top: -7px !important;
  right: -7px !important;
  z-index: 20 !important;
  width: 22px !important;
  height: 22px !important;
  min-width: 22px !important;
  min-height: 22px !important;
  display: grid !important;
  place-items: center !important;
  margin: 0 !important;
  padding: 0 0 2px !important;
  border: 1px solid rgba(72,89,108,.28) !important;
  border-radius: 999px !important;
  background: rgba(255,255,255,.97) !important;
  color: #52606d !important;
  box-shadow: 0 2px 6px rgba(31,65,99,.16) !important;
  font: 800 16px/1 system-ui,sans-serif !important;
  cursor: pointer !important;
  -webkit-tap-highlight-color: transparent !important;
}
.duduq-dd226-remove:hover { background:#f7fafc !important; color:#24384d !important; }
.duduq-dd226-remove:focus-visible { outline:3px solid #111827 !important; outline-offset:2px !important; }
/* Hit target invisível usado somente para acionar a devolução nativa ao banco. */
.duduq-dd2-bank[data-dd226-return-proxy="true"] {
  display: flex !important;
  position: fixed !important;
  left: 3px !important;
  bottom: 3px !important;
  z-index: 2147483000 !important;
  width: 74px !important;
  height: 74px !important;
  min-width: 74px !important;
  min-height: 74px !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  opacity: 0 !important;
  pointer-events: auto !important;
}

/* Estado de revisão: todos posicionados. Usa a área liberada pelo banco vazio. */
@media (min-width: 821px) and (min-height: 721px) {
  /* Ajuste visual r10: aumento perceptível dos itens disponíveis no desktop. */
  .duduq-dd2-bank[data-dd2-bank] .duduq-dd2-item-media {
    width: min(94%, 156px) !important;
    max-width: 94% !important;
    height: 92px !important;
    max-height: 92px !important;
    flex: 0 0 92px !important;
  }
  .duduq-dd2-root:has(.duduq-dd2-bank[data-dd2-bank]:not(:has(.duduq-dd2-item))) {
    --dd226-placed-card-w: 178px;
    --dd226-placed-card-h: 110px;
    --dd226-media-h: 78px;
    --dd226-target-h: 194px;
    --dd226-zone-h: 122px;
  }
  .duduq-dd2-root:has(.duduq-dd2-bank[data-dd2-bank]:not(:has(.duduq-dd2-item))) .duduq-dd2-zone .duduq-dd2-item-media {
    width: min(94%, 132px) !important;
    max-width: 94% !important;
  }
  .duduq-dd2-root:has(.duduq-dd2-bank[data-dd2-bank]:not(:has(.duduq-dd2-item))) .duduq-dd2-target {
    padding-bottom: 10px !important;
  }
  .duduq-dd2-root:has(.duduq-dd2-bank[data-dd2-bank]:not(:has(.duduq-dd2-item))) .duduq-dd2-actions {
    margin-top: 18px !important;
    padding-top: 10px !important;
    transform: translateY(4px);
  }
}

/* Usa visualmente a faixa inferior sem alterar a altura estrutural medida pelo Host. */
@media (min-width: 900px) and (min-height: 650px) {
  .duduq-dd2-bank[data-dd2-bank] .duduq-dd2-bank-items {
    transform: translateY(clamp(14px, 2.6vh, 20px));
  }
  .duduq-dd2-bank[data-dd2-bank]:has(.duduq-dd2-item-shell):not(:has(.duduq-dd2-item-shell:nth-child(4))) .duduq-dd2-bank-items {
    transform: translateY(clamp(22px, 3.4vh, 28px));
  }
}

@media (max-height: 720px) and (min-width: 700px) {
  .duduq-dd2-root {
    --dd226-bank-card-w: 154px;
    --dd226-bank-card-h: 88px;
    --dd226-placed-card-w: 154px;
    --dd226-placed-card-h: 88px;
    --dd226-media-h: 58px;
    --dd226-target-h: 160px;
    --dd226-zone-h: 98px;
  }
  .duduq-dd2-arena { gap: 6px !important; padding-bottom: 6px !important; }
  .duduq-dd2-target { padding: 18px 7px 6px !important; }
  .duduq-dd2-target-head { min-height: 34px !important; }
  .duduq-dd2-zone { padding: 5px 8px !important; gap: 7px !important; }
  .duduq-dd2-bank[data-dd2-bank] { padding-block: 4px 6px !important; }
  .duduq-dd2-bank[data-dd2-bank] .duduq-dd2-bank-items { transform: translateY(10px); }
  .duduq-dd2-bank[data-dd2-bank]:has(.duduq-dd2-item-shell):not(:has(.duduq-dd2-item-shell:nth-child(4))) .duduq-dd2-bank-items { transform: translateY(16px); }
  .duduq-dd2-actions { margin-top: 9px !important; padding-top: 8px !important; }
  .duduq-dd2-root:has(.duduq-dd2-bank[data-dd2-bank]:not(:has(.duduq-dd2-item))) {
    --dd226-placed-card-w: 166px;
    --dd226-placed-card-h: 96px;
    --dd226-media-h: 66px;
    --dd226-target-h: 176px;
    --dd226-zone-h: 108px;
  }
  .duduq-dd2-root:has(.duduq-dd2-bank[data-dd2-bank]:not(:has(.duduq-dd2-item))) .duduq-dd2-actions {
    margin-top: 15px !important;
    padding-top: 8px !important;
  }
}

/*
 * Correção estrutural r11: em uma tela física 1366×768, o viewport útil do
 * navegador costuma ficar abaixo de 721px por causa da barra do browser.
 * A regra compacta acima estava reduzindo novamente o banco para 154×88,
 * anulando visualmente todos os aumentos feitos para desktop. O banco passa
 * a responder à largura real disponível, enquanto destinos e ações mantêm
 * o modo vertical compacto. Também fixamos o shell ao mesmo tamanho do card,
 * eliminando qualquer flex-basis legado das camadas 2.0.18→2.0.25.
 */
@media (min-width: 1000px) {
  .duduq-dd2-bank[data-dd2-bank] .duduq-dd2-item-shell {
    width: var(--dd226-bank-card-w) !important;
    min-width: var(--dd226-bank-card-w) !important;
    max-width: var(--dd226-bank-card-w) !important;
    flex: 0 0 var(--dd226-bank-card-w) !important;
  }
}

@media (min-width: 1000px) and (max-height: 720px) {
  .duduq-dd2-root {
    --dd226-bank-card-w: 210px;
    --dd226-bank-card-h: 118px;
  }
  .duduq-dd2-bank[data-dd2-bank] .duduq-dd2-item-media {
    width: min(94%, 156px) !important;
    max-width: 94% !important;
    height: 88px !important;
    max-height: 88px !important;
    flex: 0 0 88px !important;
  }
}

@media (max-width: 820px) {
  .duduq-dd2-root {
    --dd226-bank-card-w: 150px;
    --dd226-bank-card-h: 90px;
    --dd226-placed-card-w: 148px;
    --dd226-placed-card-h: 88px;
    --dd226-media-h: 58px;
    --dd226-target-h: 152px;
    --dd226-zone-h: 96px;
  }
  .duduq-dd2-targets { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 8px !important; }
  .duduq-dd2-zone { gap: 6px !important; padding-inline: 6px !important; }
  .duduq-dd2-bank[data-dd2-bank] .duduq-dd2-bank-items { transform: translateY(10px); }
  .duduq-dd2-bank[data-dd2-bank]:has(.duduq-dd2-item-shell):not(:has(.duduq-dd2-item-shell:nth-child(4))) .duduq-dd2-bank-items { transform: translateY(16px); }
  .duduq-dd2-root:has(.duduq-dd2-bank[data-dd2-bank]:not(:has(.duduq-dd2-item))) {
    --dd226-placed-card-w: 156px;
    --dd226-placed-card-h: 96px;
    --dd226-media-h: 66px;
    --dd226-target-h: 164px;
    --dd226-zone-h: 104px;
  }
  .duduq-dd2-root:has(.duduq-dd2-bank[data-dd2-bank]:not(:has(.duduq-dd2-item))) .duduq-dd2-actions {
    margin-top: 14px !important;
    padding-top: 9px !important;
  }
}

@media (max-width: 520px) {
  .duduq-dd2-root {
    --dd226-bank-card-w: 142px;
    --dd226-bank-card-h: 84px;
    --dd226-placed-card-w: 140px;
    --dd226-placed-card-h: 84px;
    --dd226-media-h: 54px;
    --dd226-target-h: 140px;
    --dd226-zone-h: 90px;
  }
  .duduq-dd2-arena { gap: 7px !important; padding: 2px 4px 8px !important; }
  .duduq-dd2-targets { grid-template-columns: minmax(0, 1fr) !important; gap: 7px !important; }
  .duduq-dd2-target { padding: 18px 6px 6px !important; }
  .duduq-dd2-target-head { min-height: 38px !important; }
  .duduq-dd2-zone .duduq-dd2-item-shell { max-width: min(var(--dd226-placed-card-w), 46%) !important; }
  .duduq-dd2-bank[data-dd2-bank] .duduq-dd2-bank-items,
  .duduq-dd2-bank[data-dd2-bank]:has(.duduq-dd2-item-shell):not(:has(.duduq-dd2-item-shell:nth-child(4))) .duduq-dd2-bank-items { transform: none; }
  .duduq-dd2-bank-items { gap: 8px !important; }
  .duduq-dd226-remove {
    width: 20px !important;
    height: 20px !important;
    min-width: 20px !important;
    min-height: 20px !important;
    top: -5px !important;
    right: -5px !important;
    font-size: 15px !important;
  }
  .duduq-dd2-root:has(.duduq-dd2-bank[data-dd2-bank]:not(:has(.duduq-dd2-item))) {
    --dd226-placed-card-w: 146px;
    --dd226-placed-card-h: 88px;
    --dd226-media-h: 58px;
    --dd226-target-h: 146px;
    --dd226-zone-h: 94px;
  }
  .duduq-dd2-root:has(.duduq-dd2-bank[data-dd2-bank]:not(:has(.duduq-dd2-item))) .duduq-dd2-actions {
    margin-top: 11px !important;
    padding-top: 7px !important;
  }
}

/* Marcador explícito do estado visual completo. Evita depender de :has() aninhado. */
@media (min-width: 821px) and (min-height: 721px) {
  .duduq-dd2-root[data-dd226-complete="true"] {
    --dd226-placed-card-w: 178px;
    --dd226-placed-card-h: 110px;
    --dd226-media-h: 78px;
    --dd226-target-h: 194px;
    --dd226-zone-h: 122px;
  }
  .duduq-dd2-root[data-dd226-complete="true"] .duduq-dd2-zone .duduq-dd2-item-media {
    width: min(94%, 132px) !important;
    max-width: 94% !important;
  }
  .duduq-dd2-root[data-dd226-complete="true"] .duduq-dd2-target { padding-bottom: 10px !important; }
  .duduq-dd2-root[data-dd226-complete="true"] .duduq-dd2-actions {
    margin-top: 18px !important;
    padding-top: 10px !important;
    transform: translateY(4px);
  }
}

@media (max-height: 720px) and (min-width: 700px) {
  .duduq-dd2-root[data-dd226-complete="true"] {
    --dd226-placed-card-w: 166px;
    --dd226-placed-card-h: 96px;
    --dd226-media-h: 66px;
    --dd226-target-h: 176px;
    --dd226-zone-h: 108px;
  }
  .duduq-dd2-root[data-dd226-complete="true"] .duduq-dd2-actions {
    margin-top: 15px !important;
    padding-top: 8px !important;
  }
}

@media (max-width: 820px) {
  .duduq-dd2-root[data-dd226-complete="true"] {
    --dd226-placed-card-w: 156px;
    --dd226-placed-card-h: 96px;
    --dd226-media-h: 66px;
    --dd226-target-h: 164px;
    --dd226-zone-h: 104px;
  }
  .duduq-dd2-root[data-dd226-complete="true"] .duduq-dd2-actions {
    margin-top: 14px !important;
    padding-top: 9px !important;
  }
}

@media (max-width: 520px) {
  .duduq-dd2-root[data-dd226-complete="true"] {
    --dd226-placed-card-w: 146px;
    --dd226-placed-card-h: 88px;
    --dd226-media-h: 58px;
    --dd226-target-h: 146px;
    --dd226-zone-h: 94px;
  }
  .duduq-dd2-root[data-dd226-complete="true"] .duduq-dd2-actions {
    margin-top: 11px !important;
    padding-top: 7px !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .duduq-dd2-target,
  .duduq-dd2-item,
  .duduq-dd2-ghost,
  .duduq-dd226-remove { transition: none !important; transform: none !important; }
}
`;

  const BALANCED_RUNTIME = `
(function () {
  "use strict";
  var REMOVE_CLASS = "duduq-dd226-remove";
  var RETURN_PROXY = "data-dd226-return-proxy";
  var pointerSerial = 22600;
  var syncQueued = false;

  function dispatchPointer(target, type, coords, pointerId) {
    var event = new PointerEvent(type, {
      bubbles:true,
      cancelable:true,
      composed:true,
      pointerId:pointerId,
      pointerType:"mouse",
      isPrimary:true,
      button:0,
      buttons:type === "pointerup" ? 0 : 1,
      clientX:coords.x,
      clientY:coords.y
    });
    target.dispatchEvent(event);
  }

  function feedbackIdle(doc) {
    var feedback = doc.querySelector(".duduq-engine-feedback");
    var state = feedback && feedback.getAttribute("data-state");
    return !state || state === "idle";
  }

  function returnThroughNativeBank(doc, itemButton) {
    var bank = doc.querySelector(".duduq-dd2-bank[data-dd2-bank]");
    if (!bank || !itemButton || itemButton.disabled) return false;

    bank.setAttribute(RETURN_PROXY, "true");
    var itemRect = itemButton.getBoundingClientRect();
    var bankRect = bank.getBoundingClientRect();
    var start = { x:itemRect.left + itemRect.width / 2, y:itemRect.top + itemRect.height / 2 };
    var end = { x:bankRect.left + bankRect.width / 2, y:bankRect.top + bankRect.height / 2 };
    var pointerId = ++pointerSerial;
    var ownSetPointerCapture = Object.prototype.hasOwnProperty.call(itemButton, "setPointerCapture");
    var previousSetPointerCapture = itemButton.setPointerCapture;

    try {
      itemButton.setPointerCapture = function () {};
      dispatchPointer(itemButton, "pointerdown", start, pointerId);
      dispatchPointer(itemButton, "pointermove", end, pointerId);
      dispatchPointer(itemButton, "pointerup", end, pointerId);
    } finally {
      if (ownSetPointerCapture) itemButton.setPointerCapture = previousSetPointerCapture;
      else {
        try { delete itemButton.setPointerCapture; }
        catch (_) { itemButton.setPointerCapture = previousSetPointerCapture; }
      }
      bank.removeAttribute(RETURN_PROXY);
    }
    return true;
  }

  function sync() {
    syncQueued = false;
    var doc = document;
    var idle = feedbackIdle(doc);
    var root = doc.querySelector(".duduq-dd2-root");
    var bank = doc.querySelector(".duduq-dd2-bank[data-dd2-bank]");
    var complete = Boolean(bank && bank.querySelectorAll(".duduq-dd2-item").length === 0);
    if (root) root.setAttribute("data-dd226-complete", complete ? "true" : "false");
    var placedShells = doc.querySelectorAll(".duduq-dd2-zone .duduq-dd2-item-shell");

    placedShells.forEach(function (shell) {
      var item = shell.querySelector('.duduq-dd2-item[data-placed="true"]');
      var remove = shell.querySelector("." + REMOVE_CLASS);
      var removable = Boolean(item && !item.disabled && idle);

      if (!removable) {
        if (remove) remove.remove();
        return;
      }
      if (remove) return;

      remove = doc.createElement("button");
      remove.type = "button";
      remove.className = REMOVE_CLASS;
      remove.textContent = "×";
      remove.setAttribute("aria-label", "Remover item e devolver para Itens");
      remove.setAttribute("title", "Devolver para Itens");
      remove.addEventListener("pointerdown", function (event) {
        event.preventDefault();
        event.stopPropagation();
      });
      remove.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        returnThroughNativeBank(doc, item);
        window.setTimeout(queueSync, 0);
      });
      shell.appendChild(remove);
    });

    doc.querySelectorAll("." + REMOVE_CLASS).forEach(function (remove) {
      if (!remove.closest(".duduq-dd2-zone .duduq-dd2-item-shell")) remove.remove();
    });
  }

  function queueSync() {
    if (syncQueued) return;
    syncQueued = true;
    window.requestAnimationFrame(sync);
  }

  var observer = new MutationObserver(queueSync);
  function start() {
    observer.observe(document.documentElement, {
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:["data-placed", "data-state", "disabled"]
    });
    queueSync();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once:true });
  else start();
})();
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

  try {
    Object.defineProperty(window, BALANCED_RUNTIME_HOOK, {
      value: BALANCED_RUNTIME,
      configurable: true,
      writable: false
    });
  } catch (_) {
    window[BALANCED_RUNTIME_HOOK] = BALANCED_RUNTIME;
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
    `prepared = prepared.replace("</head>", '<style id="duduq-dd225-internal-smart-surface">' + INTERNAL_CSS + '</style><style id="duduq-dd226-balanced-cards">' + window.__DUDUQ_DD226_BALANCED_CSS__ + "</style></head>");\n    prepared = prepared.replace("</body>", '<script id="duduq-dd226-balanced-runtime">' + window.__DUDUQ_DD226_BALANCED_RUNTIME__ + "</script></body>");`
  );

  try {
    (0, eval)(source);
  } catch (error) {
    fail("falha ao inicializar release candidata: " + (error && error.message ? error.message : String(error)));
  }
})();