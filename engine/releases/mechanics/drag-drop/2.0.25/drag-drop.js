/* =========================================================
   DUDUQ MECHANIC — DRAG & DROP 2.0.25
   SMART CONFIRM + SHARED INTERNAL REFINEMENT

   Escopo fechado:
   - compõe a release imutável 2.0.24;
   - mantém contratos atuais e single-choice explícito;
   - nenhuma avaliação no drop: CONFIRMAR é obrigatório;
   - smart snap neutro por geometria/capacidade, nunca por gabarito;
   - retry preserva acertos e devolve somente erros;
   - alterações visuais limitadas ao interior da mecânica.
   ========================================================= */
(function () {
  "use strict";

  const VERSION = "2.0.25";
  const BASE_URL = "/engine/releases/mechanics/drag-drop/2.0.24/drag-drop.js";
  const PATCH_HOOK = "__DUDUQ_DD225_SMART_CONFIRM_PATCH__";

  function fail(message) {
    throw new Error("[DuduQ Drag & Drop 2.0.25] " + message);
  }

  function replaceRequired(source, from, to, expected = 1) {
    const count = source.split(from).length - 1;
    if (count !== expected) {
      fail("assinatura inesperada (" + count + "/" + expected + "): " + from.slice(0, 150));
    }
    return source.split(from).join(to);
  }

  const INTERNAL_CSS = `
/* === DUDUQ DRAG & DROP 2.0.25 — INTERNAL SMART SURFACE === */
.duduq-dd2-root {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: clip;
}
.duduq-dd2-arena {
  width: min(980px, 100%);
  max-width: 100%;
  min-width: 0;
  margin-inline: auto;
  gap: clamp(12px, 1.8vh, 20px);
  padding: clamp(4px, .8vw, 10px) clamp(6px, 1.2vw, 16px) clamp(12px, 1.6vh, 20px);
  overflow-x: clip;
}
.duduq-dd2-targets {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 176px), 220px));
  gap: clamp(10px, 1.5vw, 18px);
}
.duduq-dd2-target {
  width: auto;
  max-width: 100%;
  min-width: 0;
  min-height: clamp(142px, 21vh, 190px);
  padding: clamp(30px, 4.2vh, 38px) clamp(8px, 1vw, 12px) clamp(10px, 1.5vh, 14px);
}
.duduq-dd2-target[data-active="true"] {
  transform: translateY(-2px) scale(1.01);
}
.duduq-dd2-target-head {
  min-width: 0;
  min-height: clamp(88px, 13vh, 120px);
  overflow: hidden;
}
.duduq-dd2-target-head > span {
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.duduq-dd2-zone {
  min-width: 0;
  min-height: 62px;
  padding: clamp(7px, 1vw, 12px);
}
.duduq-dd2-bank {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 82px;
  padding: 8px 10px 12px;
  border: 1px solid #d8e0e8;
  border-radius: 18px;
  background: rgba(255,255,255,.42);
}
.duduq-dd2-bank-items {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  gap: clamp(10px, 1.4vw, 16px);
}
.duduq-dd2-item,
.duduq-dd2-item[data-has-audio="true"] {
  max-width: min(220px, 100%);
  min-height: 52px;
}
.duduq-dd2-item[data-has-media="true"] {
  width: clamp(116px, 14vw, 168px);
  min-width: 0;
  max-width: min(168px, 100%);
  min-height: clamp(112px, 16vh, 154px);
  padding: 8px;
}
.duduq-dd2-item-media,
.duduq-dd2-target-media {
  object-fit: contain !important;
  object-position: center !important;
  max-width: 100% !important;
}
.duduq-dd2-item-media {
  height: clamp(86px, 13vh, 126px);
  max-height: 126px;
}
.duduq-dd2-target-media {
  height: clamp(80px, 12vh, 112px);
  max-height: 112px;
}
.duduq-dd2-item:focus-visible,
.duduq-dd2-zone:focus-visible,
.duduq-dd2-target-audio:focus-visible,
.duduq-dd2-confirm:focus-visible {
  outline: 4px solid #111827;
  outline-offset: 4px;
}
.duduq-dd2-confirm {
  min-height: 52px;
  min-width: min(220px, 100%);
}
@media (max-width: 520px) {
  .duduq-dd2-arena { gap: 10px; padding: 3px 5px 12px; }
  .duduq-dd2-targets { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
  .duduq-dd2-target { min-height: 120px; padding: 28px 6px 8px; border-radius: 16px; }
  .duduq-dd2-target-head { min-height: 72px; font-size: 12px; }
  .duduq-dd2-target-media { height: 70px; max-height: 70px; }
  .duduq-dd2-zone { min-height: 52px; padding: 5px; gap: 6px; }
  .duduq-dd2-bank { min-height: 72px; padding: 6px 6px 9px; }
  .duduq-dd2-bank-items { gap: 8px; }
  .duduq-dd2-item,
  .duduq-dd2-item[data-has-audio="true"] { min-width: 72px; min-height: 48px; padding: 7px 9px; font-size: 14px; }
  .duduq-dd2-item[data-has-media="true"] { width: min(122px, 46vw); max-width: 122px; min-height: 100px; }
  .duduq-dd2-item-media { height: 78px; max-height: 78px; }
}
@media (max-width: 380px) {
  .duduq-dd2-targets { gap: 6px; }
  .duduq-dd2-target { min-height: 112px; padding-inline: 5px; }
  .duduq-dd2-item[data-has-media="true"] { width: min(112px, 45vw); max-width: 112px; }
}
@media (max-height: 520px) {
  .duduq-dd2-root { min-height: 100%; overflow-y: visible; }
  .duduq-dd2-surface { min-height: 100%; overflow-y: visible; }
  .duduq-dd2-arena { overflow-y: visible; gap: 8px; padding-block: 2px 12px; }
  .duduq-dd2-targets { grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); gap: 7px; }
  .duduq-dd2-target { min-height: 106px; padding-top: 27px; }
  .duduq-dd2-target-head { min-height: 58px; }
  .duduq-dd2-target-media { height: 58px; max-height: 58px; }
  .duduq-dd2-zone { min-height: 48px; }
  .duduq-dd2-bank { min-height: 62px; padding-block: 4px 7px; }
}
@media (prefers-reduced-motion: reduce) {
  .duduq-dd2-target,
  .duduq-dd2-item,
  .duduq-dd2-ghost { transition: none !important; transform: none !important; }
}
`;

  function patchRuntime(html) {
    if (typeof html !== "string" || !html.trim()) fail("runtime composto vazio ou inválido.");
    let prepared = html;

    prepared = replaceRequired(
      prepared,
      `      if (question.mode === "single-choice") {
        var singleChoiceCorrect = item.required !== false && item.targetId === targetId;
        submitted.current = true;
        setCorrectItemIds(singleChoiceCorrect ? [item.id] : []);
        setWrongItemIds(singleChoiceCorrect ? [] : [item.id]);
        setAnnouncement(singleChoiceCorrect ? "Resposta correta." : "Tente novamente.");
        var singleChoicePlacements = Object.fromEntries(question.items.map(function (entry) {
          return [entry.id, entry.id === item.id ? targetId : null];
        }));
        onAnswer && onAnswer({
          isCorrect: singleChoiceCorrect,
          answer: { placements: singleChoicePlacements, orders: Object.fromEntries(question.targets.map(function (entry) { return [entry.id, entry.id === targetId ? [item.id] : []]; })) },
          eventCoords: { x: 0, y: 0 },
          metadata: {
            mechanic: "drag-drop",
            mechanicVersion: DD2_VERSION,
            mode: question.mode,
            strategy: question.strategy,
            singleChoice: true,
            selectedItemId: item.id,
            incorrectItemIds: singleChoiceCorrect ? [] : [item.id]
          }
        });
      }

`,
      ""
    );

    prepared = replaceRequired(
      prepared,
      `    var onAnswer = props.onAnswer;
    var onInteraction = props.onInteraction;`,
      `    var onAnswer = props.onAnswer;
    var onInteraction = props.onInteraction;
    var dd225Behavior = Object.assign({
      smartSnap:true,
      instantValidation:false,
      magneticRadiusPx:104,
      snapRadiusPx:44,
      magneticStrength:0.18,
      lockCorrectItemsOnRetry:true,
      returnIncorrectItemsOnRetry:true
    }, question.behavior || {});`
    );

    prepared = replaceRequired(
      prepared,
      `    var playValueAudio = useCallback(function (value, scope, forceRestart) {`,
      `    var canTargetAccept = useCallback(function (targetId, itemId) {
      var target = targetMap.get(targetId);
      if (!target) return false;
      var capacity = capacityFor(target);
      if (capacity === 1) return true;
      var occupants = (placements[targetId] || []).filter(function (id) { return id && id !== itemId; });
      return occupants.length < capacity;
    }, [capacityFor, placements, targetMap]);

    var resolveSmartTarget = useCallback(function (clientX, clientY, itemId) {
      if (typeof document === "undefined") return null;
      var element = document.elementFromPoint(clientX, clientY);
      var direct = element && element.closest && element.closest("[data-dd2-target-id]");
      if (direct) {
        var directId = direct.getAttribute("data-dd2-target-id");
        if (directId && canTargetAccept(directId, itemId)) {
          var directRect = direct.getBoundingClientRect();
          return { targetId:directId, distance:0, direct:true, snapReady:true, centerX:directRect.left + directRect.width/2, centerY:directRect.top + directRect.height/2 };
        }
      }
      if (dd225Behavior.smartSnap === false) return null;
      var magneticRadius = Math.max(24, Number(dd225Behavior.magneticRadiusPx) || 104);
      var snapRadius = Math.max(18, Math.min(magneticRadius, Number(dd225Behavior.snapRadiusPx) || 44));
      var best = null;
      document.querySelectorAll("[data-dd2-target-id]").forEach(function (node) {
        var targetId = node.getAttribute("data-dd2-target-id");
        if (!targetId || !canTargetAccept(targetId, itemId)) return;
        var rect = node.getBoundingClientRect();
        var dx = clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0;
        var dy = clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0;
        var distance = Math.hypot(dx, dy);
        if (distance > magneticRadius) return;
        if (!best || distance < best.distance) {
          best = { targetId:targetId, distance:distance, direct:false, snapReady:distance <= snapRadius, centerX:rect.left + rect.width/2, centerY:rect.top + rect.height/2 };
        }
      });
      return best;
    }, [canTargetAccept, dd225Behavior.magneticRadiusPx, dd225Behavior.smartSnap, dd225Behavior.snapRadiusPx]);

    var playValueAudio = useCallback(function (value, scope, forceRestart) {`
    );

    prepared = replaceRequired(
      prepared,
      `    var onPointerMove = useCallback(function (event) {
      var current = dragRef.current;
      if (!current || current.pointerId !== event.pointerId) return;
      if (event.cancelable) event.preventDefault();
      var moved = current.moved || Math.hypot(event.clientX-current.startX,event.clientY-current.startY) > 6;
      var next = Object.assign({}, current, {
        x:event.clientX-current.offsetX,
        y:event.clientY-current.offsetY,
        moved:moved
      });
      dragRef.current = next;
      var ghost = document.querySelector(".duduq-dd2-ghost");
      if (ghost) {
        ghost.style.left = next.x + "px";
        ghost.style.top = next.y + "px";
      }
      if (moved) {
        var element = document.elementFromPoint(event.clientX,event.clientY);
        var target = element && element.closest && element.closest("[data-dd2-target-id]");
        var nextTargetId = target ? target.getAttribute("data-dd2-target-id") : null;
        setHoverTarget(function (previousTarget) { return previousTarget === nextTargetId ? previousTarget : nextTargetId; });
      }
      setDrag(next);
    }, []);`,
      `    var onPointerMove = useCallback(function (event) {
      var current = dragRef.current;
      if (!current || current.pointerId !== event.pointerId) return;
      if (event.cancelable) event.preventDefault();
      var moved = current.moved || Math.hypot(event.clientX-current.startX,event.clientY-current.startY) > 6;
      var rawX = event.clientX-current.offsetX;
      var rawY = event.clientY-current.offsetY;
      var element = moved ? document.elementFromPoint(event.clientX,event.clientY) : null;
      var bank = element && element.closest && element.closest("[data-dd2-bank]");
      var resolved = moved && !bank ? resolveSmartTarget(event.clientX,event.clientY,current.itemId) : null;
      var x = rawX;
      var y = rawY;
      if (resolved && !resolved.direct && dd225Behavior.smartSnap !== false) {
        var strength = Math.max(0, Math.min(.35, Number(dd225Behavior.magneticStrength) || .18));
        var pullX = (resolved.centerX - event.clientX) * strength;
        var pullY = (resolved.centerY - event.clientY) * strength;
        x += Math.max(-18, Math.min(18, pullX));
        y += Math.max(-18, Math.min(18, pullY));
      }
      var next = Object.assign({}, current, { x:x, y:y, moved:moved });
      dragRef.current = next;
      var ghost = document.querySelector(".duduq-dd2-ghost");
      if (ghost) { ghost.style.left = next.x + "px"; ghost.style.top = next.y + "px"; }
      var nextTargetId = resolved ? resolved.targetId : null;
      setHoverTarget(function (previousTarget) { return previousTarget === nextTargetId ? previousTarget : nextTargetId; });
      setDrag(next);
    }, [dd225Behavior.magneticStrength, dd225Behavior.smartSnap, resolveSmartTarget]);`
    );

    prepared = replaceRequired(
      prepared,
      `    var finishDrag = useCallback(function (event) {
      var activeDrag = dragRef.current;
      if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
      if (activeDrag.moved) {
        var element = document.elementFromPoint(event.clientX,event.clientY);
        var target = element && element.closest && element.closest("[data-dd2-target-id]");
        var bank = element && element.closest && element.closest("[data-dd2-bank]");
        if (target) place(activeDrag.itemId, target.getAttribute("data-dd2-target-id"), "drop");
        else if (bank) place(activeDrag.itemId, null);
        suppressClick.current = true;
      }
      dragRef.current = null;
      setDrag(null); setHoverTarget(null);
    }, [place]);`,
      `    var finishDrag = useCallback(function (event) {
      var activeDrag = dragRef.current;
      if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
      if (activeDrag.moved) {
        var element = document.elementFromPoint(event.clientX,event.clientY);
        var bank = element && element.closest && element.closest("[data-dd2-bank]");
        var resolved = resolveSmartTarget(event.clientX,event.clientY,activeDrag.itemId);
        if (resolved && (resolved.direct || (!bank && resolved.snapReady))) place(activeDrag.itemId, resolved.targetId, "drop");
        else if (bank) place(activeDrag.itemId, null);
        else setAnnouncement("Item retornou à posição anterior.");
        suppressClick.current = true;
      }
      dragRef.current = null;
      setDrag(null); setHoverTarget(null);
    }, [place, resolveSmartTarget]);`
    );

    prepared = replaceRequired(
      prepared,
      `    var requiredItems = question.items.filter(function (item) { return item.required !== false; });`,
      `    var onRootKeyDown = useCallback(function (event) {
      if (event.key !== "Escape") return;
      if (!selected && !dragRef.current) return;
      event.preventDefault();
      setSelected(null);
      dragRef.current = null;
      setDrag(null);
      setHoverTarget(null);
      setAnnouncement("Seleção cancelada.");
    }, [selected]);

    var requiredItems = question.items.filter(function (item) { return item.required !== false; });`
    );

    prepared = replaceRequired(
      prepared,
      `var ready = question.mode === "single-choice" ? false : (requiredItems.length > 0 && positionedCount === requiredItems.length);`,
      `var positionedAnyCount = question.items.filter(function (item) { return Boolean(locationOf(item.id)); }).length;
    var ready = question.mode === "single-choice" ? positionedAnyCount === 1 : (requiredItems.length > 0 && positionedCount === requiredItems.length);`
    );

    prepared = replaceRequired(
      prepared,
      `    var validatePlacement = useCallback(function () {
      var incorrect = [];
      if (question.strategy === "sequence") {`,
      `    var validatePlacement = useCallback(function () {
      var incorrect = [];
      if (question.mode === "single-choice") {
        var chosen = question.items.find(function (item) { return Boolean(locationOf(item.id)); });
        if (!chosen || chosen.required === false || !chosen.targetId || locationOf(chosen.id) !== chosen.targetId) {
          if (chosen) incorrect.push(chosen.id);
        }
      } else if (question.strategy === "sequence") {`
    );
    prepared = replaceRequired(
      prepared,
      `    }, [locationOf, placements, question.strategy, question.targets, requiredItems]);`,
      `    }, [locationOf, placements, question.items, question.mode, question.strategy, question.targets, requiredItems]);`
    );

    prepared = replaceRequired(
      prepared,
      `      var correct = question.items.filter(function (item) { return item.required !== false && incorrect.indexOf(item.id) < 0; }).map(function (item) { return item.id; });`,
      `      var correct = question.mode === "single-choice"
        ? question.items.filter(function (item) { return item.required !== false && item.targetId && locationOf(item.id) === item.targetId; }).map(function (item) { return item.id; })
        : question.items.filter(function (item) { return item.required !== false && incorrect.indexOf(item.id) < 0; }).map(function (item) { return item.id; });`
    );

    prepared = replaceRequired(
      prepared,
      `    useEffect(function () {
      var previous = previousFeedback.current;
      previousFeedback.current = feedbackState;
      if (feedbackState === "idle") { submitted.current = false; return; }
      if (feedbackState !== "retry" || previous === "retry") return;
      submitted.current = false;
      if (question.mode === "single-choice") {
        setRetryAnimating(true);
        if (retryReturnTimer.current !== null) window.clearTimeout(retryReturnTimer.current);
        retryReturnTimer.current = window.setTimeout(function () {
          suppressClick.current = false;
          setPlacements(initialPlacements());
          setSelected(null);
          setWrongItemIds([]);
          setCorrectItemIds([]);
          setRetryAnimating(false);
          retryReturnTimer.current = null;
          setAnnouncement("Ouça novamente e tente outra vez.");
        }, 850);
        return;
      }
      setAnnouncement("Revise as posições e tente novamente.");
    }, [feedbackState, initialPlacements, question.mode]);`,
      `    useEffect(function () {
      var previous = previousFeedback.current;
      previousFeedback.current = feedbackState;
      if (feedbackState === "idle") { submitted.current = false; return; }
      if (feedbackState !== "retry" || previous === "retry") return;
      submitted.current = false;
      if (question.strategy === "sequence") {
        setAnnouncement(correctItemIds.length ? "Os itens corretos ficaram fixos. Complete as posições restantes." : "Tente novamente.");
        return;
      }
      var incorrect = wrongItemIds.slice();
      if (!incorrect.length) { setAnnouncement("Revise as posições e tente novamente."); return; }
      setRetryAnimating(true);
      if (retryReturnTimer.current !== null) window.clearTimeout(retryReturnTimer.current);
      retryReturnTimer.current = window.setTimeout(function () {
        setPlacements(function (current) {
          return Object.fromEntries(Object.entries(current).map(function (entry) {
            return [entry[0], entry[1].filter(function (id) { return incorrect.indexOf(id) < 0; })];
          }));
        });
        suppressClick.current = false;
        setSelected(null);
        setWrongItemIds([]);
        setRetryAnimating(false);
        retryReturnTimer.current = null;
        setAnnouncement(correctItemIds.length ? "Os acertos ficaram fixos. Tente os itens restantes." : "Tente novamente.");
      }, 650);
    }, [correctItemIds, feedbackState, question.strategy, wrongItemIds]);`
    );

    prepared = replaceRequired(
      prepared,
      `      "data-reduced-motion":accessibility.reducedMotion ? "true" : "false",
      "aria-label":"Atividade educativa de arrastar e soltar"`,
      `      "data-reduced-motion":accessibility.reducedMotion ? "true" : "false",
      "aria-label":"Atividade educativa de arrastar e soltar",
      onKeyDown:onRootKeyDown`
    );

    prepared = replaceRequired(
      prepared,
      `      "data-reduced-motion":accessibility.reducedMotion ? "true" : "false",`,
      `      "data-reduced-motion":accessibility.reducedMotion ? "true" : "false",
      "data-dd225-smart-snap":dd225Behavior.smartSnap === false ? "false" : "true",
      "data-dd225-instant-validation":"false",`
    );

    if (!prepared.includes("</head>")) fail("runtime sem fechamento </head>.");
    prepared = prepared.replace("</head>", '<style id="duduq-dd225-internal-smart-surface">' + INTERNAL_CSS + "</style></head>");
    prepared = prepared.replace("<title>DuduQ - Drag and Drop 2.0.25 - Explicit Single Choice</title>", "<title>DuduQ - Drag and Drop 2.0.25 - Smart Confirm</title>");
    return prepared;
  }

  try {
    Object.defineProperty(window, PATCH_HOOK, { value: patchRuntime, configurable: true, writable: false });
  } catch (_) {
    window[PATCH_HOOK] = patchRuntime;
  }

  const xhr = new XMLHttpRequest();
  xhr.open("GET", BASE_URL + "?dd225Base=2.0.24", false);
  try { xhr.send(null); } catch (error) {
    fail("não foi possível carregar a base 2.0.24: " + (error && error.message ? error.message : String(error)));
  }
  if (xhr.status < 200 || xhr.status >= 300 || !xhr.responseText) fail("falha HTTP " + xhr.status + " ao carregar a base 2.0.24.");

  let source = xhr.responseText;
  source = source.split("2.0.24").join("2.0.25");

  source = replaceRequired(
    source,
    `    return prepared;
  }

  try {
    Object.defineProperty(window, SINGLE_CHOICE_HOOK, {`,
    `    prepared = window.__DUDUQ_DD225_SMART_CONFIRM_PATCH__(prepared);
    return prepared;
  }

  try {
    Object.defineProperty(window, SINGLE_CHOICE_HOOK, {`
  );

  try {
    (0, eval)(source);
  } catch (error) {
    fail("falha ao inicializar release composta: " + (error && error.message ? error.message : String(error)));
  }
})();
