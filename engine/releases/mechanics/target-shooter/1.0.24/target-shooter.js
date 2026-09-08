/* =========================================================
   DUDUQ TARGET SHOOTER 1.0.24 — STABLE VISUAL-TO-AUDIO SELECTION

   Base imutável: Target Shooter 1.0.23.
   Escopo exclusivo desta release:
   - troca referência DOM transitória por identidade lógica estável;
   - reaplica seleção e estado de CONFIRMAR após reconciliações DOM;
   - resolve o alvo DOM atual somente no momento da confirmação;
   - preserva integralmente gameplay normal, scoring, feedback, Host,
     completion, timer, promptVisual, promptVisualMedia e option audio.
   ========================================================= */
(function () {
  "use strict";

  const VERSION = "1.0.24";
  const BASE_URL = "/engine/releases/mechanics/target-shooter/1.0.23/target-shooter.js";

  function fail(message) {
    throw new Error("[DuduQ Target Shooter 1.0.24] " + message);
  }

  function replaceRequired(source, from, to, expected) {
    const wanted = expected == null ? 1 : expected;
    const count = source.split(from).length - 1;
    if (count !== wanted) {
      fail("assinatura inesperada (" + count + "/" + wanted + "): " + from.slice(0, 140));
    }
    return source.split(from).join(to);
  }

  const xhr = new XMLHttpRequest();
  xhr.open("GET", BASE_URL + "?ts124Base=1.0.23", false);
  try { xhr.send(null); } catch (error) {
    fail("não foi possível carregar a base 1.0.23: " + (error && error.message ? error.message : String(error)));
  }
  if (xhr.status < 200 || xhr.status >= 300 || !xhr.responseText) {
    fail("falha HTTP " + xhr.status + " ao carregar a base 1.0.23.");
  }

  let source = xhr.responseText;

  source = replaceRequired(source, 'const VERSION = "1.0.23";', 'const VERSION = "' + VERSION + '";');
  source = replaceRequired(
    source,
    'throw new Error("[DuduQ Target Shooter 1.0.23] " + message);',
    'throw new Error("[DuduQ Target Shooter 1.0.24] " + message);'
  );

  const stableSelectionPatch = [
    '  // 1.0.24: logical selection survives React DOM replacement.',
    '  source = replaceRequired(source, \'  var selectedButton = null;\', \'  var selectedItemId = null;\');',
    '',
    '  source = replaceRequired(',
    '    source,',
    '    String.raw`  function itemFor(button) {',
    '    var label = targetLabel(button);',
    '    return (stage.items || []).find(function (item) {',
    '      return String(item.label || item.id || "").trim() === label;',
    '    }) || null;',
    '  }',
    '',
    '  function clearSelection() {`,',
    '    String.raw`  function itemFor(button) {',
    '    var label = targetLabel(button);',
    '    return (stage.items || []).find(function (item) {',
    '      return String(item.label || item.id || "").trim() === label;',
    '    }) || null;',
    '  }',
    '',
    '  function itemIdentity(item) {',
    '    return String(item && (item.id || item.label) || "").trim();',
    '  }',
    '',
    '  function currentTargetForSelectedItem() {',
    '    if (!selectedItemId) return null;',
    '    var targets = document.querySelectorAll(".duduq-ts-target");',
    '    for (var index = 0; index < targets.length; index += 1) {',
    '      if (itemIdentity(itemFor(targets[index])) === selectedItemId) return targets[index];',
    '    }',
    '    return null;',
    '  }',
    '',
    '  function syncSelectionToCurrentDom() {',
    '    var targets = document.querySelectorAll(".duduq-ts-target");',
    '    var currentTarget = null;',
    '    for (var index = 0; index < targets.length; index += 1) {',
    '      var button = targets[index];',
    '      var id = itemIdentity(itemFor(button));',
    '      if (id && button.getAttribute("data-duduq-option-id") !== id) {',
    '        button.setAttribute("data-duduq-option-id", id);',
    '      }',
    '      var shouldSelect = Boolean(selectedItemId && id === selectedItemId);',
    '      var isMarked = button.getAttribute("data-duduq-option-audio-selected") === "true";',
    '      if (shouldSelect) {',
    '        currentTarget = button;',
    '        if (!isMarked) button.setAttribute("data-duduq-option-audio-selected", "true");',
    '      } else if (isMarked) {',
    '        button.removeAttribute("data-duduq-option-audio-selected");',
    '      }',
    '    }',
    '    if (confirmButton) {',
    '      var shouldDisable = !currentTarget;',
    '      if (confirmButton.disabled !== shouldDisable) confirmButton.disabled = shouldDisable;',
    '    }',
    '    window.__DUDUQ_TARGET_OPTION_AUDIO_SELECTED_ITEM_ID__ = selectedItemId || "";',
    '    return currentTarget;',
    '  }',
    '',
    '  function clearSelection() {`',
    '  );',
    '',
    '  source = replaceRequired(',
    '    source,',
    '    String.raw`  function clearSelection() {',
    '    if (selectedButton) selectedButton.removeAttribute("data-duduq-option-audio-selected");',
    '    selectedButton = null;',
    '    if (confirmButton) confirmButton.disabled = true;',
    '  }`,',
    '    String.raw`  function clearSelection() {',
    '    selectedItemId = null;',
    '    syncSelectionToCurrentDom();',
    '  }`',
    '  );',
    '',
    '  source = replaceRequired(',
    '    source,',
    '    \'    if (!arena || arena.querySelector(".duduq-ts-option-audio-panel")) return;\',',
    '    String.raw`    if (!arena) return;',
    '    var existingPanel = arena.querySelector(".duduq-ts-option-audio-panel");',
    '    if (existingPanel) {',
    '      confirmButton = existingPanel.querySelector(".duduq-ts-option-audio-confirm");',
    '      syncSelectionToCurrentDom();',
    '      return;',
    '    }`',
    '  );',
    '',
    '  source = replaceRequired(',
    '    source,',
    '    String.raw`    panel.appendChild(prompt);',
    '    panel.appendChild(confirmButton);',
    '    arena.appendChild(panel);`,',
    '    String.raw`    panel.appendChild(prompt);',
    '    panel.appendChild(confirmButton);',
    '    arena.appendChild(panel);',
    '    syncSelectionToCurrentDom();`',
    '  );',
    '',
    '  source = replaceRequired(',
    '    source,',
    '    String.raw`      if (!selectedButton || selectedButton.disabled) return;',
    '      var target = selectedButton;',
    '      clearSelection();',
    '      bypassPreview = true;',
    '      try { target.click(); } finally { bypassPreview = false; }`,',
    '    String.raw`      var target = currentTargetForSelectedItem();',
    '      if (!selectedItemId || !target || target.disabled) return;',
    '      clearSelection();',
    '      bypassPreview = true;',
    '      try { target.click(); } finally { bypassPreview = false; }`',
    '  );',
    '',
    '  source = replaceRequired(',
    '    source,',
    '    String.raw`    if (selectedButton && selectedButton !== target) selectedButton.removeAttribute("data-duduq-option-audio-selected");',
    '    selectedButton = target;',
    '    selectedButton.setAttribute("data-duduq-option-audio-selected", "true");',
    '    if (confirmButton) confirmButton.disabled = false;',
    '    speak(item);`,',
    '    String.raw`    selectedItemId = itemIdentity(item);',
    '    if (!selectedItemId) return;',
    '    syncSelectionToCurrentDom();',
    '    speak(item);`',
    '  );',
    '',
    '  source = replaceRequired(',
    '    source,',
    '    \'  new MutationObserver(ensurePanel).observe(document.documentElement, { childList:true, subtree:true });\',',
    '    String.raw`  var reconcileQueued = false;',
    '  new MutationObserver(function () {',
    '    if (reconcileQueued) return;',
    '    reconcileQueued = true;',
    '    queueMicrotask(function () {',
    '      reconcileQueued = false;',
    '      ensurePanel();',
    '      syncSelectionToCurrentDom();',
    '    });',
    '  }).observe(document.documentElement, { childList:true, subtree:true });`',
    '  );'
  ].join("\n");

  source = replaceRequired(
    source,
    '  let source = xhr.responseText;\n',
    '  let source = xhr.responseText;\n' + stableSelectionPatch + '\n'
  );

  try {
    (0, eval)(source);
  } catch (error) {
    fail("falha ao inicializar release: " + (error && error.message ? error.message : String(error)));
  }
})();
