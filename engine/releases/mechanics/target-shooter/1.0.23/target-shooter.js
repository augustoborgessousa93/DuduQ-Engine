/* =========================================================
   DUDUQ TARGET SHOOTER 1.0.23 — STIMULUS VISUAL PASS-THROUGH

   Base imutável: Target Shooter 1.0.22.
   Escopo exclusivo desta release:
   - preserva optionAudio, confirmação, retry, feedback, score, timer,
     Host e completion da 1.0.22;
   - encaminha metadata.targetShooter.promptVisualMedia ao runtime;
   - renderiza estímulo canônico OU TEMP_VISUAL_PLACEHOLDER no painel
     visual-to-audio, inclusive repetição por count e caption curta;
   - não altera releases anteriores.
   ========================================================= */
(function () {
  "use strict";

  const VERSION = "1.0.23";
  const BASE_URL = "/engine/releases/mechanics/target-shooter/1.0.22/target-shooter.js";

  function fail(message) {
    throw new Error("[DuduQ Target Shooter 1.0.23] " + message);
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
  xhr.open("GET", BASE_URL + "?ts123Base=1.0.22", false);
  try { xhr.send(null); } catch (error) {
    fail("não foi possível carregar a base 1.0.22: " + (error && error.message ? error.message : String(error)));
  }
  if (xhr.status < 200 || xhr.status >= 300 || !xhr.responseText) {
    fail("falha HTTP " + xhr.status + " ao carregar a base 1.0.22.");
  }

  let source = xhr.responseText;
  source = replaceRequired(source, 'const VERSION = "1.0.22";', 'const VERSION = "' + VERSION + '";');

  // The 1.0.22 wrapper injects promptVisual into the 1.0.21 stage contract.
  // Extend that same immutable patch string with one structured visual field.
  source = replaceRequired(
    source,
    'promptVisual: asString(config.promptVisual),',
    'promptVisual: asString(config.promptVisual),\\n      promptVisualMedia: config.promptVisualMedia || null,'
  );

  source = replaceRequired(
    source,
    '@media (max-width:520px) {',
    String.raw`.duduq-ts-option-audio-prompt.is-media {
  min-width: 112px;
  max-width: min(250px, 58vw);
  padding: 5px 9px;
  gap: 5px;
}
.duduq-ts-option-audio-prompt-media {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px;
  max-width: 100%;
}
.duduq-ts-option-audio-prompt-media img {
  width: clamp(38px, 6vw, 58px);
  height: clamp(38px, 6vw, 58px);
  object-fit: contain;
  display: block;
}
.duduq-ts-option-audio-prompt-emoji {
  font: 900 clamp(26px, 5vw, 42px)/1 system-ui, sans-serif;
}
.duduq-ts-option-audio-prompt-caption {
  display: block;
  margin-left: 4px;
  color: #17395f;
  font: 900 13px/1.1 Nunito,system-ui,sans-serif;
  white-space: nowrap;
}
@media (max-width:520px) {`
  );

  const OLD_PROMPT = String.raw`    var prompt = document.createElement("span");
    prompt.className = "duduq-ts-option-audio-prompt";
    prompt.textContent = String(stage.promptVisual || "");
    prompt.setAttribute("aria-label", "Numeral alvo " + String(stage.promptVisual || ""));`;

  const NEW_PROMPT = String.raw`    var prompt = document.createElement("div");
    prompt.className = "duduq-ts-option-audio-prompt";
    var visualMedia = stage.promptVisualMedia || null;
    if (visualMedia && (visualMedia.src || visualMedia.value)) {
      prompt.classList.add("is-media");
      var mediaWrap = document.createElement("span");
      mediaWrap.className = "duduq-ts-option-audio-prompt-media";
      var count = Math.max(1, Math.min(12, Number(visualMedia.count) || 1));
      for (var visualIndex = 0; visualIndex < count; visualIndex += 1) {
        if (visualMedia.src) {
          var image = document.createElement("img");
          image.src = String(visualMedia.src);
          image.alt = visualIndex === 0 ? String(visualMedia.alt || "") : "";
          image.loading = "eager";
          image.decoding = "async";
          if (visualMedia.assetKey) image.setAttribute("data-asset-key", String(visualMedia.assetKey));
          mediaWrap.appendChild(image);
        } else {
          var emoji = document.createElement("span");
          emoji.className = "duduq-ts-option-audio-prompt-emoji";
          emoji.textContent = String(visualMedia.value || "🖼️");
          emoji.setAttribute("aria-hidden", "true");
          mediaWrap.appendChild(emoji);
        }
      }
      prompt.appendChild(mediaWrap);
      if (visualMedia.caption) {
        var caption = document.createElement("span");
        caption.className = "duduq-ts-option-audio-prompt-caption";
        caption.textContent = String(visualMedia.caption);
        prompt.appendChild(caption);
      }
      prompt.setAttribute("aria-label", String(visualMedia.alt || "Estímulo visual"));
      prompt.setAttribute("data-visual-status", String(visualMedia.visualStatus || visualMedia.status || "VISUAL"));
      if (visualMedia.expectedAsset) prompt.setAttribute("data-expected-asset", String(visualMedia.expectedAsset));
    } else {
      prompt.textContent = String(stage.promptVisual || "");
      prompt.setAttribute("aria-label", "Estímulo visual " + String(stage.promptVisual || ""));
    }`;

  source = replaceRequired(source, OLD_PROMPT, NEW_PROMPT);

  try {
    (0, eval)(source);
  } catch (error) {
    fail("falha ao inicializar release: " + (error && error.message ? error.message : String(error)));
  }
})();
