/* =========================================================
   DUDUQ MECHANIC — DRAG & DROP 2.0.22
   CONSOLIDATED SEQUENCE FEEDBACK — CANDIDATE

   Correção de integração após falha de registro da 2.0.21 no
   carregamento direto dos módulos oficiais.

   Princípios:
   - uma única herança da base estável 2.0.18;
   - sem cadeia 2.0.19 -> 2.0.20 -> 2.0.21;
   - preserva slots quadrados e ajuste vertical homologados;
   - amplia a mídia internamente quando a sequência está completa;
   - erro temporário em vermelho;
   - acertos permanecem em verde e bloqueados;
   - apenas itens incorretos retornam ao banco;
   - não altera targetId, sequenceIndex, scoring, áudio ou conteúdo.
   ========================================================= */
(function () {
  "use strict";

  const CANDIDATE_VERSION = "2.0.22";
  const BASE_VERSION = "2.0.18";
  const BASE_ADAPTER_URL = "/engine/releases/mechanics/drag-drop/2.0.18/drag-drop.js";
  const CANDIDATE_RELEASE_PATH = "/engine/releases/mechanics/drag-drop/2.0.22/";
  const PATCH_HOOK = "__DUDUQ_DD222_PATCH_RUNTIME__";

  const SEQUENCE_CHILDREN_218 = `ids.length ? ids.map(function (id,index) {
                  var item = itemMap.get(id);
                  return item ? renderItem(item, question.strategy === "sequence" ? index : undefined) : null;
                }) : React.createElement("span", { className:"duduq-dd2-empty" }, "Solte aqui")`;

  const SEQUENCE_CHILDREN_222 = `question.strategy === "sequence"
                  ? Array.from({ length: Math.max(capacity, ids.length) }, function (_, index) {
                      var item = ids[index] ? itemMap.get(ids[index]) : null;
                      return React.createElement("div", {
                        key:"sequence-slot-" + index,
                        className:"duduq-dd2-sequence-slot",
                        "data-filled":item ? "true" : "false",
                        "aria-label":item ? undefined : "Posição " + (index + 1) + " vazia"
                      },
                        item
                          ? renderItem(item, index)
                          : React.createElement("span", { className:"duduq-dd2-empty" }, "Solte aqui")
                      );
                    })
                  : (ids.length ? ids.map(function (id,index) {
                      var item = itemMap.get(id);
                      return item ? renderItem(item, undefined) : null;
                    }) : React.createElement("span", { className:"duduq-dd2-empty" }, "Solte aqui"))`;

  const SEQUENCE_CSS = `
/* === DUDUQ DRAG & DROP 2.0.22 — CONSOLIDATED SEQUENCE SLOTS === */
.duduq-dd2-root:has(.duduq-dd2-target[data-kind="list"]) .duduq-dd2-arena {
  gap: 7px !important;
}
.duduq-dd2-targets:has(.duduq-dd2-target[data-kind="list"]) {
  grid-template-columns: minmax(0, min(100%, 420px)) !important;
  justify-content: center !important;
}
.duduq-dd2-target[data-kind="list"] {
  width: min(100%, 420px) !important;
  min-height: 0 !important;
  padding: 24px 12px 8px !important;
  gap: 8px !important;
  border-radius: 22px !important;
}
.duduq-dd2-target[data-kind="list"] .duduq-dd2-target-head {
  min-height: 34px !important;
  padding: 2px 8px !important;
  flex-direction: row !important;
  justify-content: center !important;
  gap: 8px !important;
}
.duduq-dd2-target[data-kind="list"] .duduq-dd2-target-head > span {
  font-size: clamp(14px, 1.25vw, 17px) !important;
}
.duduq-dd2-target[data-kind="list"] .duduq-dd2-zone {
  width: 100% !important;
  min-height: 0 !important;
  padding: 4px !important;
  display: flex !important;
  flex-wrap: wrap !important;
  align-items: center !important;
  justify-content: center !important;
  gap: clamp(8px, .8vw, 12px) !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}
.duduq-dd2-sequence-slot {
  box-sizing: border-box;
  width: clamp(98px, 9vw, 116px);
  aspect-ratio: 1 / 1;
  min-width: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: 6px;
  border: 2px dashed #91afd0;
  border-radius: 18px;
  background: linear-gradient(180deg,#fbfdff 0%,#f1f6fb 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.96);
}
.duduq-dd2-sequence-slot[data-filled="true"] {
  border-style: solid;
  border-color: #7faee0;
  background: #fff;
  box-shadow: 0 4px 0 #c7d7e7, 0 9px 16px rgba(31,65,99,.08);
}
.duduq-dd2-sequence-slot > .duduq-dd2-empty {
  margin: 0 !important;
  color: #6d7d8c !important;
  font: 800 12px/1.15 Nunito,system-ui,sans-serif !important;
  text-align: center !important;
}
.duduq-dd2-sequence-slot .duduq-dd2-item-shell {
  width: 100% !important;
  max-width: none !important;
  height: 100% !important;
  flex: 1 1 100% !important;
  display: grid !important;
  place-items: center !important;
}
.duduq-dd2-sequence-slot .duduq-dd2-item {
  box-sizing: border-box !important;
  width: 100% !important;
  min-width: 0 !important;
  max-width: none !important;
  height: 100% !important;
  min-height: 0 !important;
  padding: 7px !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 3px !important;
  border: 0 !important;
  border-radius: 14px !important;
  background: transparent !important;
  box-shadow: none !important;
}
.duduq-dd2-sequence-slot .duduq-dd2-item[data-has-media="true"][data-placed="true"] .duduq-dd2-item-media,
.duduq-dd2-sequence-slot .duduq-dd2-item-media {
  width: min(84%, 92px) !important;
  max-width: 84% !important;
  height: min(84%, 92px) !important;
  max-height: 84% !important;
  object-fit: contain !important;
  object-position: center !important;
  flex: 0 0 auto !important;
}
.duduq-dd2-target[data-kind="list"][data-active="true"] .duduq-dd2-sequence-slot:not([data-filled="true"]) {
  border-color: #1682e5;
  background: #eef7ff;
}
.duduq-dd2-target[data-kind="list"][data-wrong="true"] {
  border-color: #b7c9dc !important;
  background: #fff !important;
  box-shadow: 0 4px 0 #c7d7e7, 0 9px 16px rgba(31,65,99,.08) !important;
}
.duduq-dd2-sequence-slot[data-wrong="true"] {
  border-style: solid !important;
  border-color: #ff5d5d !important;
  background: #fff0f0 !important;
  box-shadow: 0 4px 0 #e14b4b, 0 8px 14px rgba(183,28,28,.10) !important;
  animation: duduqDD222RetryPulse .72s ease-in-out 1;
}
.duduq-dd2-sequence-slot[data-correct="true"] {
  border-style: solid !important;
  border-color: #45ad68 !important;
  background: #effaf2 !important;
  box-shadow: 0 4px 0 #2f8d51, 0 8px 14px rgba(27,94,32,.10) !important;
}
.duduq-dd2-item[data-correct="true"] {
  cursor: default !important;
}
.duduq-dd2-target[data-kind="list"][data-complete="true"] .duduq-dd2-sequence-slot {
  padding: 3px !important;
}
.duduq-dd2-target[data-kind="list"][data-complete="true"] .duduq-dd2-sequence-slot .duduq-dd2-item {
  padding: 3px !important;
}
.duduq-dd2-target[data-kind="list"][data-complete="true"] .duduq-dd2-sequence-slot .duduq-dd2-item-media {
  width: min(94%, 106px) !important;
  max-width: 94% !important;
  height: min(94%, 106px) !important;
  max-height: 94% !important;
  object-fit: contain !important;
  object-position: center !important;
}
@keyframes duduqDD222RetryPulse {
  0%,100% { transform: scale(1); }
  45% { transform: scale(.975); }
}
@media (max-width: 640px) {
  .duduq-dd2-target[data-kind="list"] {
    width: min(100%, 340px) !important;
    padding: 22px 8px 7px !important;
  }
  .duduq-dd2-target[data-kind="list"] .duduq-dd2-zone {
    gap: 8px !important;
    padding: 2px !important;
  }
  .duduq-dd2-sequence-slot {
    width: clamp(78px, 24vw, 96px);
    padding: 5px;
    border-radius: 16px;
  }
  .duduq-dd2-sequence-slot .duduq-dd2-item[data-has-media="true"][data-placed="true"] .duduq-dd2-item-media,
  .duduq-dd2-sequence-slot .duduq-dd2-item-media {
    width: min(82%, 76px) !important;
    max-width: 82% !important;
    height: min(82%, 76px) !important;
    max-height: 82% !important;
  }
  .duduq-dd2-target[data-kind="list"][data-complete="true"] .duduq-dd2-sequence-slot .duduq-dd2-item-media {
    width: min(92%, 82px) !important;
    max-width: 92% !important;
    height: min(92%, 82px) !important;
    max-height: 92% !important;
  }
}
@media (max-width: 430px) {
  .duduq-dd2-target[data-kind="list"] {
    width: 100% !important;
    padding-inline: 7px !important;
  }
  .duduq-dd2-target[data-kind="list"] .duduq-dd2-zone {
    gap: 6px !important;
  }
  .duduq-dd2-sequence-slot {
    width: clamp(72px, 23vw, 86px);
    padding: 4px;
    border-radius: 14px;
  }
  .duduq-dd2-sequence-slot > .duduq-dd2-empty {
    font-size: 11px !important;
  }
  .duduq-dd2-sequence-slot .duduq-dd2-item[data-has-media="true"][data-placed="true"] .duduq-dd2-item-media,
  .duduq-dd2-sequence-slot .duduq-dd2-item-media {
    width: min(82%, 68px) !important;
    max-width: 82% !important;
    height: min(82%, 68px) !important;
    max-height: 82% !important;
  }
  .duduq-dd2-target[data-kind="list"][data-complete="true"] .duduq-dd2-sequence-slot .duduq-dd2-item-media {
    width: min(92%, 72px) !important;
    max-width: 92% !important;
    height: min(92%, 72px) !important;
    max-height: 92% !important;
  }
}
`;

  function fail(message) {
    throw new Error("[DuduQ Drag & Drop 2.0.22] " + message);
  }

  function replaceRequired(source, from, to, expected) {
    const count = source.split(from).length - 1;
    if (count !== expected) {
      fail("assinatura inesperada: " + from.slice(0, 120) + " (" + count + ")");
    }
    return source.split(from).join(to);
  }

  function patchRuntime(html) {
    if (typeof html !== "string" || !html.trim()) {
      fail("runtime base vazio ou inválido.");
    }

    let prepared = html;

    prepared = replaceRequired(
      prepared,
      SEQUENCE_CHILDREN_218,
      SEQUENCE_CHILDREN_222,
      1
    );

    prepared = replaceRequired(
      prepared,
      `var dd2WrongState = useState([]), wrongItemIds = dd2WrongState[0], setWrongItemIds = dd2WrongState[1];`,
      `var dd2WrongState = useState([]), wrongItemIds = dd2WrongState[0], setWrongItemIds = dd2WrongState[1];
    var dd2CorrectState = useState([]), correctItemIds = dd2CorrectState[0], setCorrectItemIds = dd2CorrectState[1];
    var dd2RetryState = useState(false), retryAnimating = dd2RetryState[0], setRetryAnimating = dd2RetryState[1];`,
      1
    );

    prepared = replaceRequired(
      prepared,
      `var submitted = useRef(false);`,
      `var submitted = useRef(false);
    var retryReturnTimer = useRef(null);`,
      1
    );

    prepared = replaceRequired(
      prepared,
      `setHoverTarget(null);
      submitted.current = false;
      previousFeedback.current = "idle";`,
      `setHoverTarget(null);
      setWrongItemIds([]);
      setCorrectItemIds([]);
      setRetryAnimating(false);
      if (retryReturnTimer.current !== null) { window.clearTimeout(retryReturnTimer.current); retryReturnTimer.current = null; }
      submitted.current = false;
      previousFeedback.current = "idle";`,
      1
    );

    prepared = replaceRequired(
      prepared,
      `var place = useCallback(function (itemId, targetId, source) {
      if (disabled || feedbackState === "success") return;`,
      `var place = useCallback(function (itemId, targetId, source) {
      if (disabled || feedbackState === "success" || retryAnimating || correctItemIds.indexOf(itemId) >= 0) return;`,
      1
    );

    prepared = replaceRequired(
      prepared,
      `return [entry[0], entry[1].filter(function (id) { return id !== itemId; })];`,
      `return [entry[0], question.strategy === "sequence" ? entry[1].map(function (id) { return id === itemId ? null : id; }) : entry[1].filter(function (id) { return id !== itemId; })];`,
      2
    );

    prepared = replaceRequired(
      prepared,
      `var targetOccupants = (placements[targetId] || []).filter(function (id) { return id !== itemId; });`,
      `var targetOccupants = (placements[targetId] || []).filter(function (id) { return id && id !== itemId; });`,
      1
    );

    prepared = replaceRequired(
      prepared,
      `if (capacity === 1) next[targetId] = [];
        next[targetId] = (next[targetId] || []).concat(itemId);`,
      `if (question.strategy === "sequence") {
          var order = (next[targetId] || []).slice();
          var emptyIndex = order.findIndex(function (id) { return !id; });
          if (emptyIndex >= 0) order[emptyIndex] = itemId;
          else order.push(itemId);
          next[targetId] = order.slice(0, capacity);
        } else {
          if (capacity === 1) next[targetId] = [];
          next[targetId] = (next[targetId] || []).concat(itemId);
        }`,
      1
    );

    prepared = replaceRequired(
      prepared,
      `}, [audio.activeAudioKey, capacityFor, disabled, feedbackState, itemMap, onInteraction, placements, playValueAudio, question.id, targetMap]);`,
      `}, [audio.activeAudioKey, capacityFor, correctItemIds, disabled, feedbackState, itemMap, onInteraction, placements, playValueAudio, question.id, question.strategy, retryAnimating, targetMap]);`,
      1
    );

    prepared = replaceRequired(
      prepared,
      `"data-wrong":wrongItemIds.indexOf(item.id) >= 0 ? "true" : "false",`,
      `"data-wrong":wrongItemIds.indexOf(item.id) >= 0 ? "true" : "false",
          "data-correct":correctItemIds.indexOf(item.id) >= 0 ? "true" : "false",`,
      1
    );

    prepared = replaceRequired(
      prepared,
      `disabled:disabled || feedbackState === "success",`,
      `disabled:disabled || feedbackState === "success" || retryAnimating || correctItemIds.indexOf(item.id) >= 0,`,
      1
    );

    prepared = replaceRequired(
      prepared,
      `"data-filled":item ? "true" : "false",
                        "aria-label":item ? undefined : "Posição " + (index + 1) + " vazia"`,
      `"data-filled":item ? "true" : "false",
                        "data-wrong":item && wrongItemIds.indexOf(item.id) >= 0 ? "true" : "false",
                        "data-correct":item && correctItemIds.indexOf(item.id) >= 0 ? "true" : "false",
                        "aria-label":item ? undefined : "Posição " + (index + 1) + " vazia"`,
      1
    );

    prepared = replaceRequired(
      prepared,
      `"data-filled":ids.length > 0 ? "true" : "false"`,
      `"data-filled":ids.some(function (id) { return Boolean(id); }) ? "true" : "false",
              "data-complete":question.strategy === "sequence" && ids.filter(Boolean).length >= capacity ? "true" : "false"`,
      1
    );

    prepared = replaceRequired(
      prepared,
      `React.createElement("span", { className:"duduq-dd2-capacity" }, ids.length, "/", capacity),`,
      `React.createElement("span", { className:"duduq-dd2-capacity" }, ids.filter(Boolean).length, "/", capacity),`,
      1
    );

    prepared = replaceRequired(
      prepared,
      `var submit = useCallback(function (event) {
      if (!ready || disabled || feedbackState !== "idle" || submitted.current) return;
      submitted.current = true;
      var incorrect = validatePlacement();
      setWrongItemIds(incorrect.slice());`,
      `var submit = useCallback(function (event) {
      if (!ready || disabled || feedbackState !== "idle" || submitted.current || retryAnimating) return;
      submitted.current = true;
      var incorrect = validatePlacement();
      var correct = question.items.filter(function (item) { return item.required !== false && incorrect.indexOf(item.id) < 0; }).map(function (item) { return item.id; });
      setCorrectItemIds(correct);
      setWrongItemIds(incorrect.slice());
      if (question.strategy === "sequence" && incorrect.length > 0) {
        setRetryAnimating(true);
        if (retryReturnTimer.current !== null) window.clearTimeout(retryReturnTimer.current);
        retryReturnTimer.current = window.setTimeout(function () {
          setPlacements(function (current) {
            return Object.fromEntries(Object.entries(current).map(function (entry) {
              return [entry[0], entry[1].map(function (id) { return incorrect.indexOf(id) >= 0 ? null : id; })];
            }));
          });
          setWrongItemIds([]);
          setRetryAnimating(false);
          retryReturnTimer.current = null;
          setAnnouncement(correct.length ? "Os itens corretos ficaram em verde. Complete as posições restantes." : "Tente novamente.");
        }, 850);
      }`,
      1
    );

    prepared = replaceRequired(
      prepared,
      `}, [disabled, feedbackState, locationOf, onAnswer, placements, question.items, question.mode, question.strategy, ready, validatePlacement]);`,
      `}, [disabled, feedbackState, locationOf, onAnswer, placements, question.items, question.mode, question.strategy, ready, retryAnimating, validatePlacement]);`,
      1
    );

    if (!prepared.includes("</head>")) {
      fail("runtime sem fechamento </head>.");
    }

    prepared = prepared.replace(
      "</head>",
      '<style id="duduq-dd222-consolidated-sequence">' + SEQUENCE_CSS + "</style></head>"
    );

    prepared = prepared.replace(
      "<title>DuduQ - Drag and Drop 2.0.18 - Target Shooter Shell</title>",
      "<title>DuduQ - Drag and Drop 2.0.22 - Consolidated Sequence Feedback</title>"
    );

    return prepared;
  }

  try {
    Object.defineProperty(window, PATCH_HOOK, {
      value: patchRuntime,
      configurable: true,
      writable: false
    });
  } catch (_) {
    window[PATCH_HOOK] = patchRuntime;
  }

  const xhr = new XMLHttpRequest();
  xhr.open("GET", BASE_ADAPTER_URL + "?dd222Base=" + encodeURIComponent(BASE_VERSION), false);

  try {
    xhr.send(null);
  } catch (error) {
    fail("não foi possível carregar a base 2.0.18: " + (error && error.message ? error.message : String(error)));
  }

  if (xhr.status < 200 || xhr.status >= 300 || !xhr.responseText) {
    fail("falha HTTP " + xhr.status + " ao carregar a base 2.0.18.");
  }

  let source = xhr.responseText;

  const required = [
    ['const VERSION = "2.0.18";', 'const VERSION = "2.0.22";'],
    [
      'const RELEASE_PATH = "/engine/releases/mechanics/drag-drop/2.0.18/";',
      'const RELEASE_PATH = "/engine/releases/mechanics/drag-drop/2.0.22/";'
    ],
    [
      "prepared = stampContext(prepared, context);",
      "prepared = stampContext(prepared, context);\n        prepared = window.__DUDUQ_DD222_PATCH_RUNTIME__(prepared);"
    ]
  ];

  required.forEach(function (pair) {
    source = replaceRequired(source, pair[0], pair[1], 1);
  });

  source = source.split("DuduQ Drag & Drop 2.0.18").join("DuduQ Drag & Drop 2.0.22");

  try {
    (0, eval)(source);
  } catch (error) {
    fail("falha ao inicializar adapter consolidado: " + (error && error.message ? error.message : String(error)));
  }
})();
