/* DUDUQ English Year 2 — Drag & Drop selected-choice tools bridge V2
   Year-2 page scope only. Keeps Canary R143 and Drag & Drop 2.0.22 immutable.

   Single-target choice contract:
   - after a choice is placed, expose a replay control inside the target;
   - expose an explicit remove (X) control so the learner can change the choice
     before pressing CONFIRMAR;
   - replay uses the native DD2 playValueAudio(item, "item") path;
   - replay is an accessible non-button control with its own speaker glyph, a
     neutral replay class/name and a private replay-state marker, outside both the
     global audio normalizer selector and the generic [data-playing] observer scope;
   - while a single-target answer is placed and idle, the target zone no longer
     inherits aria-disabled over replay/X; the zone itself stays out of tab order;
   - remove uses the native DD2 place(itemId, null) path, returning cleanly to the bank
     without validating the answer;
   - controls disappear during retry feedback and never modify scoring/content.
*/
(function () {
  "use strict";

  const VERSION = "2.0.4-year2-selected-choice-tools-dd2";
  const HOOK = "__DUDUQ_DD222_PATCH_RUNTIME__";
  const MARK = "__duduqYear2SelectedToolsV2ActiveDD2";
  const SENTINEL = "__DUDUQ_YEAR2_SELECTED_TOOLS_V2_ACTIVE_DD2__";
  const inheritedDefineProperty = Object.defineProperty;
  let interceptionArmed = true;
  let restoreTimer = null;

  if (window.__DUDUQ_YEAR2_DD_SELECTED_TOOLS_V2_BRIDGE__) return;

  function fail(message) {
    throw new Error("[DuduQ Year2 DD selected tools V2] " + message);
  }

  function replaceRequired(source, from, to, expected = 1) {
    const count = source.split(from).length - 1;
    if (count !== expected) {
      fail("assinatura inesperada (" + count + "/" + expected + "): " + from.slice(0, 150));
    }
    return source.split(from).join(to);
  }

  function patchSelectedTools(html) {
    if (typeof html !== "string" || !html.trim()) fail("runtime DD2 vazio.");
    if (html.includes(SENTINEL)) return html;

    let prepared = html;

    prepared = replaceRequired(
      prepared,
      `return React.createElement("div", { className:"duduq-dd2-item-shell" + (hasAudio && question.strategy === "single-target-choice" && !placed ? " duduq-dd2-item-shell-audio-choice" : ""), key:item.id },`,
      `return React.createElement("div", { className:"duduq-dd2-item-shell" + (hasAudio && question.strategy === "single-target-choice" && !placed ? " duduq-dd2-item-shell-audio-choice" : "") + (question.strategy === "single-target-choice" && placed ? " duduq-dd2-item-shell-selected-choice" : ""), key:item.id },`
    );

    prepared = replaceRequired(
      prepared,
      `"aria-disabled":disabled || !selected || feedbackState === "success" ? "true" : "false",`,
      `"aria-disabled":disabled || (!selected && !(question.strategy === "single-target-choice" && ids.length > 0 && feedbackState === "idle")) || feedbackState === "success" ? "true" : "false",`
    );

    prepared = replaceRequired(
      prepared,
      `        hasAudio && question.strategy === "single-target-choice" && !placed ? React.createElement("button", {\n          type:"button",\n          className:"duduq-dd2-item-audio",\n          "data-dd2-audio-item-id":item.id,\n          "data-playing":audio.activeAudioKey === ("dd2:" + question.id + ":item:" + item.id) ? "true" : "false",\n          disabled:disabled || feedbackState === "success",\n          onClick:function (event) { event.stopPropagation(); onInteraction && onInteraction(); playValueAudio(item, "item"); },\n          "aria-label":audio.activeAudioKey === ("dd2:" + question.id + ":item:" + item.id)\n            ? ("Parar áudio da alternativa " + dd2Accessible(item))\n            : ("Ouvir alternativa " + dd2Accessible(item))\n        }, React.createElement(TSAudioIcon,null)) : null\n      );`,
      `        hasAudio && question.strategy === "single-target-choice" && !placed ? React.createElement("button", {\n          type:"button",\n          className:"duduq-dd2-item-audio",\n          "data-dd2-audio-item-id":item.id,\n          "data-playing":audio.activeAudioKey === ("dd2:" + question.id + ":item:" + item.id) ? "true" : "false",\n          disabled:disabled || feedbackState === "success",\n          onClick:function (event) { event.stopPropagation(); onInteraction && onInteraction(); playValueAudio(item, "item"); },\n          "aria-label":audio.activeAudioKey === ("dd2:" + question.id + ":item:" + item.id)\n            ? ("Parar áudio da alternativa " + dd2Accessible(item))\n            : ("Ouvir alternativa " + dd2Accessible(item))\n        }, React.createElement(TSAudioIcon,null)) : null,\n        hasAudio && question.strategy === "single-target-choice" && placed && !retryAnimating && feedbackState === "idle" ? React.createElement("span", {\n          role:"button",\n          tabIndex:0,\n          className:"duduq-dd2-placed-replay",\n          "data-dd2-placed-replay-item-id":item.id,\n          "data-dd2-replay-playing":audio.activeAudioKey === ("dd2:" + question.id + ":item:" + item.id) ? "true" : "false",\n          onPointerDown:function (event) { event.stopPropagation(); },\n          onClick:function (event) {\n            event.preventDefault();\n            event.stopPropagation();\n            onInteraction && onInteraction();\n            playValueAudio(item, "item");\n          },\n          onKeyDown:function (event) {\n            if (event.key === "Enter" || event.key === " ") {\n              event.preventDefault();\n              event.stopPropagation();\n              onInteraction && onInteraction();\n              playValueAudio(item, "item");\n            }\n          },\n          "aria-label":audio.activeAudioKey === ("dd2:" + question.id + ":item:" + item.id)\n            ? ("Parar repetição da alternativa escolhida " + dd2Accessible(item))\n            : ("Repetir alternativa escolhida " + dd2Accessible(item))\n        }, React.createElement("span", { className:"duduq-dd2-placed-replay-glyph", "aria-hidden":"true" }, "🔊")) : null,\n        question.strategy === "single-target-choice" && placed && !retryAnimating && feedbackState === "idle" ? React.createElement("button", {\n          type:"button",\n          className:"duduq-dd2-placed-clear",\n          "data-dd2-clear-item-id":item.id,\n          disabled:disabled,\n          onPointerDown:function (event) { event.stopPropagation(); },\n          onClick:function (event) {\n            event.preventDefault();\n            event.stopPropagation();\n            place(item.id, null, "clear");\n          },\n          "aria-label":"Remover alternativa escolhida " + dd2Accessible(item),\n          title:"Remover alternativa"\n        }, "×") : null\n      );`
    );

    const selectedToolsCss = `<style id="duduq-year2-dd-selected-tools-v2">
.duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-item-shell-selected-choice {
  box-sizing: border-box !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  display: grid !important;
  grid-template-columns: clamp(36px,3.7vw,42px) minmax(64px,1fr) clamp(36px,3.7vw,42px) !important;
  grid-template-rows: auto !important;
  align-items: center !important;
  justify-items: center !important;
  gap: clamp(8px,1vw,14px) !important;
  padding: 0 clamp(4px,.6vw,8px) !important;
}
.duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-item-shell-selected-choice > .duduq-dd2-item {
  grid-column: 2 !important;
  grid-row: 1 !important;
  justify-self: center !important;
  min-width: clamp(72px,7vw,86px) !important;
  max-width: min(100%,112px) !important;
}
.duduq-dd2-placed-replay,
.duduq-dd2-placed-clear {
  box-sizing: border-box !important;
  width: clamp(36px,3.7vw,42px) !important;
  height: clamp(36px,3.7vw,42px) !important;
  min-width: clamp(36px,3.7vw,42px) !important;
  min-height: clamp(36px,3.7vw,42px) !important;
  padding: 0 !important;
  display: grid !important;
  place-items: center !important;
  border: 2px solid #8fbbe0 !important;
  border-radius: 999px !important;
  background: #fff !important;
  color: #1565c0 !important;
  box-shadow: 0 3px 0 rgba(57,103,149,.18) !important;
  cursor: pointer !important;
  line-height: 1 !important;
  z-index: 4 !important;
  user-select: none !important;
  -webkit-user-select: none !important;
  touch-action: manipulation !important;
}
.duduq-dd2-placed-replay {
  grid-column: 1 !important;
  grid-row: 1 !important;
}
.duduq-dd2-placed-replay-glyph {
  display: block !important;
  font-size: clamp(17px,1.8vw,21px) !important;
  line-height: 1 !important;
  transform: translateY(-1px) !important;
}
.duduq-dd2-placed-clear {
  grid-column: 3 !important;
  grid-row: 1 !important;
  border-color: #ef9a9a !important;
  color: #c62828 !important;
  font: 900 clamp(20px,2vw,24px)/1 Nunito,system-ui,sans-serif !important;
}
.duduq-dd2-placed-replay:focus-visible,
.duduq-dd2-placed-clear:focus-visible {
  outline: 3px solid #79b9ee !important;
  outline-offset: 2px !important;
}
.duduq-dd2-placed-clear:disabled {
  cursor: default !important;
  opacity: .55 !important;
}
@media (max-width: 640px) {
  .duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-item-shell-selected-choice {
    grid-template-columns: 36px minmax(58px,1fr) 36px !important;
    gap: 8px !important;
    padding-inline: 2px !important;
  }
  .duduq-dd2-placed-replay,
  .duduq-dd2-placed-clear {
    width: 36px !important;
    height: 36px !important;
    min-width: 36px !important;
    min-height: 36px !important;
  }
}
</style>`;

    if (!prepared.includes("</head>")) fail("runtime sem </head> para controles da alternativa selecionada.");
    prepared = prepared.replace(
      "</head>",
      selectedToolsCss + `<script>window.${SENTINEL}=true;</script></head>`
    );

    return prepared;
  }

  function compose(upstream) {
    if (typeof upstream !== "function") return upstream;
    if (upstream[MARK]) return upstream;
    const wrapped = function year2SelectedToolsV2DD2(source) {
      return patchSelectedTools(upstream(source));
    };
    try {
      Reflect.defineProperty(wrapped, MARK, { value: true });
    } catch (_) {}
    return wrapped;
  }

  function installOnExistingHook() {
    const existing = window[HOOK];
    if (typeof existing !== "function") return false;
    const wrapped = compose(existing);
    try {
      Reflect.defineProperty(window, HOOK, {
        value: wrapped,
        configurable: true,
        writable: false
      });
    } catch (_) {
      return false;
    }
    interceptionArmed = false;
    window.__DUDUQ_YEAR2_DD_SELECTED_TOOLS_V2_CAPTURED__ = true;
    return true;
  }

  function restoreDefineProperty() {
    if (restoreTimer !== null) {
      window.clearTimeout(restoreTimer);
      restoreTimer = null;
    }
    if (Object.defineProperty === selectedToolsV2DefineProperty) {
      Object.defineProperty = inheritedDefineProperty;
    }
  }

  function selectedToolsV2DefineProperty(target, property, descriptor) {
    if (
      interceptionArmed &&
      target === window &&
      property === HOOK &&
      descriptor &&
      typeof descriptor.value === "function"
    ) {
      const result = inheritedDefineProperty(target, property, descriptor);
      const currentHook = window[HOOK];
      if (typeof currentHook !== "function") fail("hook DD2 não ficou disponível após definição.");
      const wrapped = compose(currentHook);
      const ok = Reflect.defineProperty(window, HOOK, {
        value: wrapped,
        configurable: true,
        writable: false
      });
      if (!ok) fail("não foi possível compor controles sobre o hook DD2.");
      interceptionArmed = false;
      window.__DUDUQ_YEAR2_DD_SELECTED_TOOLS_V2_CAPTURED__ = true;
      restoreDefineProperty();
      return result;
    }
    return inheritedDefineProperty(target, property, descriptor);
  }

  if (!installOnExistingHook()) {
    Object.defineProperty = selectedToolsV2DefineProperty;
    restoreTimer = window.setTimeout(function () {
      if (interceptionArmed) {
        console.warn("[DuduQ Year2 DD selected tools V2] Hook 2.0.22 não apareceu na janela de inicialização.");
      }
      restoreDefineProperty();
    }, 30000);
  }

  window.__DUDUQ_YEAR2_DD_SELECTED_TOOLS_V2_BRIDGE__ = Object.freeze({
    version: VERSION,
    scope: "english-year-2",
    targetRelease: "2.0.22",
    releaseModified: false,
    canaryModified: false,
    selectedChoiceReplayEnabled: true,
    selectedChoiceReplayUsesNativeAudioPath: true,
    selectedChoiceReplayAvoidsGlobalButtonNormalizer: true,
    selectedChoiceReplayAvoidsNativePlayingObserver: true,
    selectedChoiceReplayUsesPrivatePlayingMarker: true,
    selectedChoiceToolsKeepPlacedZoneAccessibilityEnabled: true,
    selectedChoiceReplayKeyboardAccessible: true,
    selectedChoiceReplayNeutralAccessibleName: true,
    selectedChoiceReplayNeutralClassName: true,
    selectedChoiceClearEnabled: true,
    clearUsesNativePlacePath: true,
    retryFeedbackPreserved: true
  });
})();
