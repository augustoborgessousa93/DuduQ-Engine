/* =========================================================
   DUDUQ MECHANIC — DRAG & DROP 2.0.20
   SEQUENCE VERTICAL FIT — CANDIDATE

   Hotfix visual sobre a candidata 2.0.19:
   - preserva a arquitetura de slots quadrados;
   - reduz somente a densidade vertical da sequência;
   - mantém imagens grandes e object-fit: contain;
   - não altera targetId, sequenceIndex, scoring, retry, áudio ou conteúdo;
   - não altera Canary nem releases anteriores.
   ========================================================= */
(function () {
  "use strict";

  const VERSION = "2.0.20";
  const BASE_ADAPTER_URL = "/engine/releases/mechanics/drag-drop/2.0.19/drag-drop.js";

  function fail(message) {
    throw new Error("[DuduQ Drag & Drop 2.0.20] " + message);
  }

  function replaceRequired(source, from, to, expected) {
    const count = source.split(from).length - 1;
    if (count !== expected) {
      fail("assinatura inesperada ao preparar 2.0.20: " + from + " (" + count + ")");
    }
    return source.split(from).join(to);
  }

  const xhr = new XMLHttpRequest();
  xhr.open("GET", BASE_ADAPTER_URL + "?dd220Base=2.0.19", false);
  try {
    xhr.send(null);
  } catch (error) {
    fail("não foi possível carregar a base 2.0.19: " + (error && error.message ? error.message : String(error)));
  }

  if (xhr.status < 200 || xhr.status >= 300 || !xhr.responseText) {
    fail("falha HTTP " + xhr.status + " ao carregar a base 2.0.19.");
  }

  let source = xhr.responseText;

  /* Promove somente a identidade da candidata em memória. */
  source = source.split("2.0.19").join("2.0.20");
  source = source.split("DD219").join("DD220");
  source = source.split("dd219").join("dd220");

  /*
   * Ajuste cirúrgico motivado pela homologação 1365x728:
   * o banco inferior ficava alguns pixels abaixo do recorte útil.
   * Reduzimos altura do target/slots, não a legibilidade das imagens.
   */
  source = replaceRequired(
    source,
    'grid-template-columns: minmax(0, min(100%, 470px)) !important;',
    'grid-template-columns: minmax(0, min(100%, 420px)) !important;',
    1
  );
  source = replaceRequired(
    source,
    'width: min(100%, 470px) !important;',
    'width: min(100%, 420px) !important;',
    1
  );
  source = replaceRequired(
    source,
    'padding: 34px 14px 14px !important;',
    'padding: 24px 12px 8px !important;',
    1
  );
  source = replaceRequired(
    source,
    'min-height: 42px !important;',
    'min-height: 34px !important;',
    1
  );
  source = replaceRequired(
    source,
    'padding: 4px 10px !important;',
    'padding: 2px 8px !important;',
    1
  );
  source = replaceRequired(
    source,
    'gap: clamp(10px, 1vw, 14px) !important;',
    'gap: clamp(8px, .8vw, 12px) !important;',
    1
  );
  source = replaceRequired(
    source,
    'width: clamp(108px, 10vw, 132px);',
    'width: clamp(98px, 9vw, 116px);',
    1
  );
  source = replaceRequired(
    source,
    'width: min(82%, 98px) !important;',
    'width: min(84%, 92px) !important;',
    1
  );
  source = replaceRequired(
    source,
    'max-width: 82% !important;',
    'max-width: 84% !important;',
    1
  );
  source = replaceRequired(
    source,
    'height: min(82%, 98px) !important;',
    'height: min(84%, 92px) !important;',
    1
  );
  source = replaceRequired(
    source,
    'max-height: 82% !important;',
    'max-height: 84% !important;',
    1
  );

  /* Viewports menores: mesma correção proporcional, mantendo três slots quando couber. */
  source = replaceRequired(
    source,
    'width: min(100%, 370px) !important;',
    'width: min(100%, 340px) !important;',
    1
  );
  source = replaceRequired(
    source,
    'padding: 32px 10px 10px !important;',
    'padding: 22px 8px 7px !important;',
    1
  );
  source = replaceRequired(
    source,
    'width: clamp(84px, 25vw, 104px);',
    'width: clamp(78px, 24vw, 96px);',
    1
  );
  source = replaceRequired(
    source,
    'width: min(80%, 78px) !important;',
    'width: min(82%, 76px) !important;',
    1
  );
  source = replaceRequired(
    source,
    'height: min(80%, 78px) !important;',
    'height: min(82%, 76px) !important;',
    1
  );
  source = replaceRequired(
    source,
    'width: clamp(76px, 24vw, 92px);',
    'width: clamp(72px, 23vw, 86px);',
    1
  );
  source = replaceRequired(
    source,
    'width: min(80%, 72px) !important;',
    'width: min(82%, 68px) !important;',
    1
  );
  source = replaceRequired(
    source,
    'height: min(80%, 72px) !important;',
    'height: min(82%, 68px) !important;',
    1
  );

  /* Reduz o respiro vertical da arena somente quando há sequência. */
  source = replaceRequired(
    source,
    '/* === DUDUQ DRAG & DROP 2.0.20 — SEQUENCE VISUAL SLOTS ===',
    '/* === DUDUQ DRAG & DROP 2.0.20 — SEQUENCE VERTICAL FIT ===',
    1
  );
  source = replaceRequired(
    source,
    '.duduq-dd2-targets:has(.duduq-dd2-target[data-kind="list"]) {',
    '.duduq-dd2-root:has(.duduq-dd2-target[data-kind="list"]) .duduq-dd2-arena { gap: 7px !important; }\n.duduq-dd2-targets:has(.duduq-dd2-target[data-kind="list"]) {',
    1
  );

  try {
    (0, eval)(source);
  } catch (error) {
    fail("falha ao inicializar adapter 2.0.20: " + (error && error.message ? error.message : String(error)));
  }
})();
