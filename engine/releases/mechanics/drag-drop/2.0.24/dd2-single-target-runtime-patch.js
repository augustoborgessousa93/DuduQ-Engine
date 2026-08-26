/* DUDUQ Drag & Drop 2.0.24 — SINGLE_TARGET_CHOICE / R143 visual candidate
   Composes the validated 2.0.23 behavioral runtime patch, then applies only
   the next homologation delta:
   - R143-like centered visual hierarchy;
   - stable-height target/drop zone;
   - larger visual stimulus;
   - compact placed answer;
   - one-shot audio on tap; completed drag keeps the base DD2 audio path.

   Homologation only. Canary/public production remains on R143 / 2.0.22.
*/
(function () {
  "use strict";

  const VERSION = "2.0.24-r143-visual-c";
  const HOOK = "__DUDUQ_DD222_PATCH_RUNTIME__";
  const MARK = "__duduqDD24R143VisualWrapped";
  const BASE_PATCH_URL = "/engine/releases/mechanics/drag-drop/2.0.23/dd2-single-target-runtime-patch.js";
  const STYLE_ID = "duduq-dd24-r143-single-target-style";

  function fail(message) {
    throw new Error("[DuduQ Drag & Drop 2.0.24] " + message);
  }

  function replaceRequired(source, from, to, expected = 1) {
    const count = source.split(from).length - 1;
    if (count !== expected) {
      fail("assinatura inesperada: " + from.slice(0, 140) + " (" + count + ")");
    }
    return source.split(from).join(to);
  }

  function loadBasePatch() {
    if (window.DuduQDD23SingleTargetRuntimePatch?.ready === true) return;
    const xhr = new XMLHttpRequest();
    xhr.open("GET", BASE_PATCH_URL + "?dd224RuntimeBase=2.0.23", false);
    try {
      xhr.send(null);
    } catch (error) {
      fail("não foi possível carregar o runtime base 2.0.23: " + (error?.message || String(error)));
    }
    if (xhr.status < 200 || xhr.status >= 300 || !xhr.responseText) {
      fail("falha HTTP " + xhr.status + " ao carregar o runtime base 2.0.23.");
    }
    try {
      (0, eval)(xhr.responseText);
    } catch (error) {
      fail("falha ao inicializar runtime base 2.0.23: " + (error?.message || String(error)));
    }
  }

  const R143_VISUAL_CSS = `
/* === 2.0.24 R143 VISUAL CONTRACT === */
.duduq-dd2-arena:has(.duduq-dd2-target[data-single-target-choice="true"]) {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 10px !important;
  width: 100% !important;
  min-width: 0 !important;
}

.duduq-dd2-arena:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-targets {
  width: 100% !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) !important;
  justify-items: center !important;
  min-width: 0 !important;
}

.duduq-dd2-target[data-single-target-choice="true"] {
  box-sizing: border-box !important;
  width: min(100%, 270px) !important;
  height: clamp(228px, 32vh, 258px) !important;
  min-height: 0 !important;
  max-height: 258px !important;
  padding: 9px 10px 10px !important;
  gap: 7px !important;
  overflow: hidden !important;
}

.duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-capacity {
  display: none !important;
}

.duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-target-head {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  height: auto !important;
  padding: 0 2px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  overflow: hidden !important;
}

.duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-target-head img,
.duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-target-head .duduq-dd2-item-media,
.duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-target-media,
.duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-target-media img {
  width: min(96%, 184px) !important;
  max-width: 96% !important;
  height: min(96%, 176px) !important;
  max-height: 176px !important;
  object-fit: contain !important;
  font-size: clamp(78px, 8.6vw, 112px) !important;
  line-height: 1 !important;
  transform: scale(1.22) !important;
  transform-origin: center !important;
}

.duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-zone {
  box-sizing: border-box !important;
  flex: 0 0 66px !important;
  width: 100% !important;
  height: 66px !important;
  min-height: 66px !important;
  max-height: 66px !important;
  padding: 5px 8px !important;
  overflow: hidden !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-zone .duduq-dd2-item-shell {
  width: auto !important;
  max-width: 100% !important;
  min-width: 0 !important;
  margin: 0 auto !important;
}

.duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-zone .duduq-dd2-item {
  box-sizing: border-box !important;
  width: auto !important;
  min-width: 96px !important;
  max-width: 128px !important;
  height: 48px !important;
  min-height: 48px !important;
  max-height: 48px !important;
  padding: 5px 10px !important;
  margin: 0 auto !important;
  overflow: hidden !important;
}

.duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-item[data-wrong="true"] {
  border-color: #ff6262 !important;
  background: linear-gradient(180deg, #fff6f6 0%, #ffe3e3 100%) !important;
  box-shadow: 0 4px 0 #df5555, 0 8px 16px rgba(183,28,28,.12) !important;
}

.duduq-dd2-arena:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-bank {
  box-sizing: border-box !important;
  width: min(100%, 720px) !important;
  max-width: 720px !important;
  min-width: 0 !important;
  min-height: 0 !important;
  margin: 0 auto !important;
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  align-self: center !important;
}

.duduq-dd2-arena:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-bank-items {
  width: 100% !important;
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: wrap !important;
  align-items: center !important;
  justify-content: center !important;
  align-content: center !important;
  gap: 10px 12px !important;
  padding: 0 !important;
}

.duduq-dd2-arena:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-bank .duduq-dd2-item-shell {
  width: auto !important;
  max-width: none !important;
  min-width: 0 !important;
}

.duduq-dd2-arena:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-bank .duduq-dd2-item {
  box-sizing: border-box !important;
  width: 104px !important;
  min-width: 104px !important;
  max-width: 104px !important;
  height: 52px !important;
  min-height: 52px !important;
  max-height: 52px !important;
  padding: 6px 10px !important;
}

.duduq-dd2-arena:has(.duduq-dd2-target[data-single-target-choice="true"]) + .duduq-dd2-actions,
.duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-actions,
.duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-matching-action-slot.duduq-dd2-actions {
  box-sizing: border-box !important;
  width: min(100%, 280px) !important;
  margin: 6px auto 0 !important;
  padding: 0 !important;
  min-height: 50px !important;
}

.duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-confirm {
  box-sizing: border-box !important;
  width: 100% !important;
  min-height: 48px !important;
  margin: 0 !important;
}

/* 2.0.23 marks notebook/tablet hosts with this attribute. These selectors are
   intentionally equally/more specific so R143 visual rules cannot be silently
   overridden by the inherited R144 compact-host block. */
html[data-duduq-host-compact-viewport="true"] .duduq-dd2-arena:has(.duduq-dd2-target[data-single-target-choice="true"]) {
  display: flex !important;
  flex-direction: column !important;
  gap: 7px !important;
}
html[data-duduq-host-compact-viewport="true"] .duduq-dd2-target[data-single-target-choice="true"] {
  width: min(100%, 250px) !important;
  height: 218px !important;
  min-height: 218px !important;
  max-height: 218px !important;
}
html[data-duduq-host-compact-viewport="true"] .duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-target-head {
  min-height: 0 !important;
  max-height: none !important;
  padding: 0 2px !important;
}
html[data-duduq-host-compact-viewport="true"] .duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-target-head img,
html[data-duduq-host-compact-viewport="true"] .duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-target-head .duduq-dd2-item-media,
html[data-duduq-host-compact-viewport="true"] .duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-target-media,
html[data-duduq-host-compact-viewport="true"] .duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-target-media img {
  width: min(96%, 164px) !important;
  max-width: 96% !important;
  height: min(96%, 154px) !important;
  max-height: 154px !important;
  font-size: 88px !important;
  transform: scale(1.2) !important;
}
html[data-duduq-host-compact-viewport="true"] .duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-zone {
  flex: 0 0 60px !important;
  height: 60px !important;
  min-height: 60px !important;
  max-height: 60px !important;
  padding: 4px 8px !important;
}
html[data-duduq-host-compact-viewport="true"] .duduq-dd2-arena:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-bank-items {
  display: flex !important;
  flex-direction: row !important;
  gap: 7px 10px !important;
}
html[data-duduq-host-compact-viewport="true"] .duduq-dd2-arena:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-bank .duduq-dd2-item {
  width: 100px !important;
  min-width: 100px !important;
  max-width: 100px !important;
  height: 50px !important;
  min-height: 50px !important;
  max-height: 50px !important;
  padding-block: 5px !important;
}
html[data-duduq-host-compact-viewport="true"] .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-actions,
html[data-duduq-host-compact-viewport="true"] .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-matching-action-slot.duduq-dd2-actions {
  width: min(100%, 270px) !important;
  margin: 3px auto 0 !important;
  padding: 0 !important;
  min-height: 48px !important;
}
html[data-duduq-host-compact-viewport="true"] .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-confirm {
  width: 100% !important;
  min-height: 48px !important;
}

@media (min-width: 761px) and (max-height: 680px) {
  .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-arena {
    gap: 7px !important;
  }
  .duduq-dd2-target[data-single-target-choice="true"] {
    width: min(100%, 250px) !important;
    height: 218px !important;
    min-height: 218px !important;
    max-height: 218px !important;
  }
  .duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-target-head img,
  .duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-target-head .duduq-dd2-item-media,
  .duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-target-media,
  .duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-target-media img {
    width: min(96%, 164px) !important;
    height: min(96%, 154px) !important;
    max-height: 154px !important;
    font-size: 88px !important;
    transform: scale(1.2) !important;
  }
  .duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-zone {
    flex-basis: 60px !important;
    height: 60px !important;
    min-height: 60px !important;
    max-height: 60px !important;
  }
  .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-actions {
    margin-top: 3px !important;
    min-height: 48px !important;
  }
}

@media (max-width: 760px) {
  .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-arena {
    gap: 10px !important;
  }
  .duduq-dd2-target[data-single-target-choice="true"] {
    width: min(100%, 270px) !important;
    height: 232px !important;
    min-height: 232px !important;
    max-height: 232px !important;
  }
  .duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-target-head img,
  .duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-target-head .duduq-dd2-item-media,
  .duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-target-media,
  .duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-target-media img {
    width: min(96%, 174px) !important;
    height: min(96%, 164px) !important;
    max-height: 164px !important;
    font-size: 92px !important;
    transform: scale(1.18) !important;
  }
  .duduq-dd2-arena:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-bank {
    width: min(100%, 340px) !important;
  }
  .duduq-dd2-arena:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-bank-items {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 9px !important;
  }
  .duduq-dd2-arena:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-bank .duduq-dd2-item-shell,
  .duduq-dd2-arena:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-bank .duduq-dd2-item {
    width: 100% !important;
    min-width: 0 !important;
    max-width: none !important;
  }
  .duduq-dd2-arena:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-bank .duduq-dd2-item {
    height: 52px !important;
    min-height: 52px !important;
    max-height: 52px !important;
  }
  .duduq-dd2-root:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-actions {
    width: min(100%, 260px) !important;
  }
}
`;

  function patchAfter23(html) {
    let prepared = html;

    /* DD2 base already plays choice audio exactly once when place(..., "drop")
       completes. 2.0.24 only adds the missing tap/click path. This avoids a
       second restart after drag and therefore avoids duplicate audio. */
    prepared = replaceRequired(
      prepared,
      `var singleTargetPointerContextRef = useRef(null);`,
      `var singleTargetAudioGateRef = useRef({ itemId:null, at:0 });\n    function playSingleTargetSelectionAudio(item) {\n      if (!item || !(item.audioAssetKey || item.spokenText)) return;\n      var now = Date.now();\n      var gate = singleTargetAudioGateRef.current || {};\n      if (gate.itemId === item.id && now - Number(gate.at || 0) < 260) return;\n      singleTargetAudioGateRef.current = { itemId:item.id, at:now };\n      playValueAudio(item, "item");\n    }\n    var singleTargetPointerContextRef = useRef(null);`
    );

    prepared = replaceRequired(
      prepared,
      `          place(item.id, singleTarget.id, "tap");\n          return;`,
      `          place(item.id, singleTarget.id, "tap");\n          playSingleTargetSelectionAudio(item);\n          return;`
    );

    if (!prepared.includes("</head>")) fail("runtime sem </head> para o visual R143.");
    prepared = prepared.replace("</head>", `<style id="${STYLE_ID}">${R143_VISUAL_CSS}</style></head>`);
    return prepared;
  }

  function expose(ready, details) {
    window.DuduQDD24R143VisualRuntimePatch = Object.freeze({
      version: VERSION,
      ready: Boolean(ready),
      hook: HOOK,
      styleId: STYLE_ID,
      details: details || null
    });
  }

  function install() {
    const previous = window[HOOK];
    if (typeof previous !== "function") return false;
    if (previous[MARK]) {
      expose(true, "already-wrapped");
      return true;
    }
    if (window.DuduQDD23SingleTargetRuntimePatch?.ready !== true) return false;

    const wrapped = function (source) {
      return patchAfter23(previous(source));
    };
    Object.defineProperty(wrapped, MARK, { value: true });
    Object.defineProperty(window, HOOK, {
      value: wrapped,
      configurable: true,
      writable: false
    });

    expose(true, "2.0.23-behavior-plus-r143-visual-and-tap-audio");
    window.dispatchEvent(new CustomEvent("duduq:dd24-r143-visual-ready", {
      detail: { version: VERSION, styleId: STYLE_ID }
    }));
    return true;
  }

  loadBasePatch();
  expose(false, "waiting-for-2.0.23-runtime-hook");

  if (install()) return;

  let attempts = 0;
  const timer = window.setInterval(function () {
    attempts += 1;
    if (install()) {
      window.clearInterval(timer);
      return;
    }
    if (attempts >= 600) {
      window.clearInterval(timer);
      expose(false, "timeout-waiting-for-2.0.23-runtime-hook");
      console.error("[DuduQ Drag & Drop 2.0.24] runtime base 2.0.23 não ficou pronto a tempo.");
    }
  }, 10);
})();
