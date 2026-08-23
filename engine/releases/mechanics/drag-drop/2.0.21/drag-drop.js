/* =========================================================
   DUDUQ MECHANIC — DRAG & DROP 2.0.21
   SMART SEQUENCE FEEDBACK — CANDIDATE

   Evolução segura sobre 2.0.20:
   - mantém os 3 slots quadrados e o ajuste vertical homologado;
   - amplia a mídia internamente quando a sequência está completa;
   - tentativa incorreta: slot errado vermelho por curto período;
   - itens corretos permanecem no slot, bloqueados e em verde;
   - somente itens incorretos retornam ao banco;
   - slots internos podem ficar vazios sem perder a posição dos acertos;
   - não altera targetId, sequenceIndex, scoring, áudio, conteúdo ou Canary.
   ========================================================= */
(function () {
  "use strict";

  const VERSION = "2.0.21";
  const BASE_ADAPTER_URL = "/engine/releases/mechanics/drag-drop/2.0.20/drag-drop.js";
  const SMART_HOOK = "__DUDUQ_DD221_SMART_FEEDBACK_RUNTIME__";

  function fail(message) {
    throw new Error("[DuduQ Drag & Drop 2.0.21] " + message);
  }

  function replaceRequired(source, from, to, expected) {
    const count = source.split(from).length - 1;
    if (count !== expected) {
      fail("assinatura inesperada: " + from.slice(0, 120) + " (" + count + ")");
    }
    return source.split(from).join(to);
  }

  const SMART_CSS = `
/* === DUDUQ DRAG & DROP 2.0.21 — SMART SEQUENCE FEEDBACK === */
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
  animation: duduqDD221RetryPulse .72s ease-in-out 1;
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
@keyframes duduqDD221RetryPulse {
  0%,100% { transform: scale(1); }
  45% { transform: scale(.975); }
}
@media (max-width: 640px) {
  .duduq-dd2-target[data-kind="list"][data-complete="true"] .duduq-dd2-sequence-slot .duduq-dd2-item-media {
    width: min(92%, 82px) !important;
    max-width: 92% !important;
    height: min(92%, 82px) !important;
    max-height: 92% !important;
  }
}
@media (max-width: 430px) {
  .duduq-dd2-target[data-kind="list"][data-complete="true"] .duduq-dd2-sequence-slot .duduq-dd2-item-media {
    width: min(92%, 72px) !important;
    max-width: 92% !important;
    height: min(92%, 72px) !important;
    max-height: 92% !important;
  }
}
`;

  function patchRuntime(html) {
    if (typeof html !== "string" || !html.trim()) fail("runtime base vazio.");
    let prepared = html;

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

    if (!prepared.includes("</head>")) fail("runtime sem </head>.");
    prepared = prepared.replace(
      "</head>",
      '<style id="duduq-dd221-smart-sequence-feedback">' + SMART_CSS + "</style></head>"
    );

    prepared = prepared.replace(
      "<title>DuduQ - Drag and Drop 2.0.21 - Sequence Visual Slots</title>",
      "<title>DuduQ - Drag and Drop 2.0.21 - Smart Sequence Feedback</title>"
    );

    return prepared;
  }

  try {
    Object.defineProperty(window, SMART_HOOK, {
      value: patchRuntime,
      configurable: true,
      writable: false
    });
  } catch (_) {
    window[SMART_HOOK] = patchRuntime;
  }

  const xhr = new XMLHttpRequest();
  xhr.open("GET", BASE_ADAPTER_URL + "?dd221Base=2.0.20", false);
  try {
    xhr.send(null);
  } catch (error) {
    fail("não foi possível carregar a base 2.0.20: " + (error && error.message ? error.message : String(error)));
  }

  if (xhr.status < 200 || xhr.status >= 300 || !xhr.responseText) {
    fail("falha HTTP " + xhr.status + " ao carregar a base 2.0.20.");
  }

  let source = xhr.responseText;
  source = source.split("2.0.20").join("2.0.21");
  source = source.split("DD220").join("DD221");
  source = source.split("dd220").join("dd221");

  /* Injeta o segundo patch no adapter 2.0.19 já promovido em memória para 2.0.21. */
  source = replaceRequired(
    source,
    `try {
    (0, eval)(source);`,
    `source = replaceRequired(
    source,
    "prepared = window.__DUDUQ_DD221_PATCH_RUNTIME__(prepared);",
    "prepared = window.__DUDUQ_DD221_PATCH_RUNTIME__(prepared);\\\\n        prepared = window.__DUDUQ_DD221_SMART_FEEDBACK_RUNTIME__(prepared);",
    1
  );

  try {
    (0, eval)(source);`,
    1
  );

  try {
    (0, eval)(source);
  } catch (error) {
    fail("falha ao inicializar adapter 2.0.21: " + (error && error.message ? error.message : String(error)));
  }
})();
