/* =========================================================
   DUDUQ TARGET SHOOTER 1.0.22 — OPTION AUDIO PREVIEW

   Base imutável: Target Shooter 1.0.21.
   Escopo exclusivo desta release:
   - preserva integralmente o runtime e o comportamento 1.0.21;
   - habilita preview repetível de áudio por opção SOMENTE quando
     metadata.targetShooter.mode = "visual-to-audio";
   - exige confirmação explícita após a escuta para não transformar
     o preview em resposta imediata;
   - cancela fala anterior antes de repetir/trocar a opção;
   - não altera Core, Host, scoring, progress ou releases anteriores.
   ========================================================= */
(function () {
  "use strict";

  const VERSION = "1.0.22";
  const BASE_URL = "/engine/releases/mechanics/target-shooter/1.0.21/target-shooter.js";

  function fail(message) {
    throw new Error("[DuduQ Target Shooter 1.0.22] " + message);
  }

  function replaceRequired(source, from, to, expected) {
    const wanted = expected == null ? 1 : expected;
    const count = source.split(from).length - 1;
    if (count !== wanted) {
      fail("assinatura inesperada (" + count + "/" + wanted + "): " + from.slice(0, 140));
    }
    return source.split(from).join(to);
  }

  const OPTION_AUDIO_FUNCTION = String.raw`
  function installOptionAudioPreview(html) {
    const marker = "</body>";
    if (!html.includes(marker)) {
      throw new Error("[DuduQ Target Shooter] Body do runtime não encontrado para option audio preview.");
    }

    const patch = String.raw\`
<style id="duduq-target-shooter-1-0-22-option-audio">
.duduq-ts-option-audio-panel {
  position: absolute;
  z-index: 40;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: min(430px, calc(100% - 24px));
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 7px 10px;
  border: 2px solid rgba(112,145,178,.42);
  border-radius: 18px;
  background: rgba(255,255,255,.96);
  box-shadow: 0 5px 0 rgba(126,157,187,.26), 0 10px 24px rgba(31,65,99,.10);
  box-sizing: border-box;
}
.duduq-ts-option-audio-prompt {
  min-width: 70px;
  min-height: 42px;
  display: grid;
  place-items: center;
  padding: 3px 12px;
  border-radius: 13px;
  background: #f4f9ff;
  color: #17395f;
  font: 900 clamp(22px,3vw,32px)/1 Fredoka,Nunito,system-ui,sans-serif;
  box-shadow: inset 0 0 0 2px rgba(62,132,201,.18);
}
.duduq-ts-option-audio-confirm {
  min-width: 132px;
  min-height: 42px;
  padding: 7px 15px;
  border: 0;
  border-radius: 13px;
  background: #0967c9;
  color: #fff;
  box-shadow: 0 4px 0 #064a92;
  font: 900 15px/1 Nunito,system-ui,sans-serif;
  cursor: pointer;
}
.duduq-ts-option-audio-confirm:disabled {
  background: #dbe4ed;
  color: #6b7785;
  box-shadow: 0 4px 0 #bcc9d6;
  cursor: default;
}
.duduq-ts-target[data-duduq-option-audio-selected="true"] .duduq-ts-target-shell {
  outline: 5px solid #0967c9 !important;
  outline-offset: 4px !important;
  filter: brightness(1.04) saturate(1.05);
}
@media (max-width:520px) {
  .duduq-ts-option-audio-panel { top: 7px; gap: 7px; padding: 6px 8px; min-height: 44px; }
  .duduq-ts-option-audio-prompt { min-width: 58px; min-height: 38px; font-size: 23px; }
  .duduq-ts-option-audio-confirm { min-width: 112px; min-height: 38px; font-size: 13px; }
}
</style>
<script id="duduq-target-shooter-1-0-22-option-audio-runtime">
(function () {
  "use strict";
  var configNode = document.getElementById("targetShooterConfig");
  if (!configNode) return;
  var config;
  try { config = JSON.parse(configNode.textContent || "{}"); } catch (_) { return; }
  var stage = Array.isArray(config.stages) ? config.stages[0] : null;
  if (!stage || stage.mode !== "visual-to-audio") return;

  var selectedButton = null;
  var confirmButton = null;
  var bypassPreview = false;

  function targetLabel(button) {
    return String(button && button.getAttribute("aria-label") || "")
      .replace(/^Lançar estrela no alvo\s*/i, "")
      .trim();
  }

  function itemFor(button) {
    var label = targetLabel(button);
    return (stage.items || []).find(function (item) {
      return String(item.label || item.id || "").trim() === label;
    }) || null;
  }

  function clearSelection() {
    if (selectedButton) selectedButton.removeAttribute("data-duduq-option-audio-selected");
    selectedButton = null;
    if (confirmButton) confirmButton.disabled = true;
  }

  function speak(item) {
    if (!item || !item.spokenText || !window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== "function") return;
    try {
      window.speechSynthesis.cancel();
      var utterance = new SpeechSynthesisUtterance(String(item.spokenText));
      utterance.lang = item.speechLocale || "en-US";
      utterance.rate = .86;
      utterance.pitch = 1.03;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.debug("[DuduQ Target Shooter] option audio preview unavailable.", error);
    }
  }

  function ensurePanel() {
    var arena = document.querySelector(".duduq-ts-arena");
    if (!arena || arena.querySelector(".duduq-ts-option-audio-panel")) return;
    var panel = document.createElement("div");
    panel.className = "duduq-ts-option-audio-panel";
    panel.setAttribute("data-duduq-option-audio", "true");

    var prompt = document.createElement("span");
    prompt.className = "duduq-ts-option-audio-prompt";
    prompt.textContent = String(stage.promptVisual || "");
    prompt.setAttribute("aria-label", "Numeral alvo " + String(stage.promptVisual || ""));

    confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.className = "duduq-ts-option-audio-confirm";
    confirmButton.textContent = "CONFIRMAR";
    confirmButton.setAttribute("aria-label", "Confirmar opção de áudio selecionada");
    confirmButton.disabled = true;
    confirmButton.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (!selectedButton || selectedButton.disabled) return;
      var target = selectedButton;
      clearSelection();
      bypassPreview = true;
      try { target.click(); } finally { bypassPreview = false; }
    });

    panel.appendChild(prompt);
    panel.appendChild(confirmButton);
    arena.appendChild(panel);
  }

  document.addEventListener("click", function (event) {
    if (bypassPreview) return;
    var target = event.target instanceof Element ? event.target.closest(".duduq-ts-target") : null;
    if (!target) return;
    var item = itemFor(target);
    if (!item || !item.spokenText) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (selectedButton && selectedButton !== target) selectedButton.removeAttribute("data-duduq-option-audio-selected");
    selectedButton = target;
    selectedButton.setAttribute("data-duduq-option-audio-selected", "true");
    if (confirmButton) confirmButton.disabled = false;
    speak(item);
  }, true);

  ensurePanel();
  new MutationObserver(ensurePanel).observe(document.documentElement, { childList:true, subtree:true });
})();
</script>\`;
    return html.replace(marker, patch + "\n" + marker);
  }
`.split("\\`").join("`");

  const xhr = new XMLHttpRequest();
  xhr.open("GET", BASE_URL + "?ts122Base=1.0.21", false);
  try { xhr.send(null); } catch (error) {
    fail("não foi possível carregar a base 1.0.21: " + (error && error.message ? error.message : String(error)));
  }
  if (xhr.status < 200 || xhr.status >= 300 || !xhr.responseText) {
    fail("falha HTTP " + xhr.status + " ao carregar a base 1.0.21.");
  }

  let source = xhr.responseText;
  source = replaceRequired(source, 'const VERSION = "1.0.21";', 'const VERSION = "' + VERSION + '";');
  source = replaceRequired(
    source,
    '      audioText: asString(config.audioText || question?.media?.audio?.text || question?.audio?.text),',
    '      audioText: asString(config.audioText || question?.media?.audio?.text || question?.audio?.text),\n      promptVisual: asString(config.promptVisual),'
  );
  source = replaceRequired(source, '  function installVisualEnvironment(html) {', OPTION_AUDIO_FUNCTION + '\n  function installVisualEnvironment(html) {');
  source = replaceRequired(
    source,
    '        prepared = installVisualEnvironment(prepared);',
    '        prepared = installVisualEnvironment(prepared);\n        prepared = installOptionAudioPreview(prepared);'
  );
  source = replaceRequired(source, '          optionAudio: false', '          optionAudio: true');

  try {
    (0, eval)(source);
  } catch (error) {
    fail("falha ao inicializar release: " + (error && error.message ? error.message : String(error)));
  }
})();
