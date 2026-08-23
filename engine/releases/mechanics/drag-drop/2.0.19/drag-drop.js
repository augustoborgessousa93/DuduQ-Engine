/* =========================================================
   DUDUQ MECHANIC — DRAG & DROP 2.0.19
   SEQUENCE VISUAL SLOTS — CANDIDATE

   Segurança:
   - preserva integralmente a release 2.0.18;
   - reutiliza a base 2.0.18 como fonte imutável;
   - promove apenas VERSION/RELEASE_PATH em memória;
   - transforma somente o render visual de strategy="sequence";
   - não altera targetId, sequenceIndex, scoring, retry, áudio ou dados.
   ========================================================= */
(function () {
  "use strict";

  const CANDIDATE_VERSION = "2.0.19";
  const BASE_VERSION = "2.0.18";
  const BASE_ADAPTER_URL = "/engine/releases/mechanics/drag-drop/2.0.18/drag-drop.js";
  const CANDIDATE_RELEASE_PATH = "/engine/releases/mechanics/drag-drop/2.0.19/";
  const PATCH_HOOK = "__DUDUQ_DD219_PATCH_RUNTIME__";

  const SEQUENCE_CHILDREN_218 = `ids.length ? ids.map(function (id,index) {
                  var item = itemMap.get(id);
                  return item ? renderItem(item, question.strategy === "sequence" ? index : undefined) : null;
                }) : React.createElement("span", { className:"duduq-dd2-empty" }, "Solte aqui")`;

  const SEQUENCE_CHILDREN_219 = `question.strategy === "sequence"
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

  const SEQUENCE_SLOT_CSS = `
/* === DUDUQ DRAG & DROP 2.0.19 — SEQUENCE VISUAL SLOTS ===
   Escopo estrito: target kind="list" (strategy="sequence").
   O target semântico permanece único; os slots são somente visuais. */
.duduq-dd2-targets:has(.duduq-dd2-target[data-kind="list"]) {
  grid-template-columns: minmax(0, min(100%, 470px)) !important;
  justify-content: center !important;
}
.duduq-dd2-target[data-kind="list"] {
  width: min(100%, 470px) !important;
  min-height: 0 !important;
  padding: 34px 14px 14px !important;
  gap: 8px !important;
  border-radius: 22px !important;
}
.duduq-dd2-target[data-kind="list"] .duduq-dd2-target-head {
  min-height: 42px !important;
  padding: 4px 10px !important;
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
  gap: clamp(10px, 1vw, 14px) !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}
.duduq-dd2-sequence-slot {
  box-sizing: border-box;
  width: clamp(108px, 10vw, 132px);
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
  width: min(82%, 98px) !important;
  max-width: 82% !important;
  height: min(82%, 98px) !important;
  max-height: 82% !important;
  object-fit: contain !important;
  object-position: center !important;
  flex: 0 0 auto !important;
}
.duduq-dd2-target[data-kind="list"][data-active="true"] .duduq-dd2-sequence-slot:not([data-filled="true"]) {
  border-color: #1682e5;
  background: #eef7ff;
}
@media (max-width: 640px) {
  .duduq-dd2-target[data-kind="list"] {
    width: min(100%, 370px) !important;
    padding: 32px 10px 10px !important;
  }
  .duduq-dd2-target[data-kind="list"] .duduq-dd2-zone {
    gap: 8px !important;
    padding: 2px !important;
  }
  .duduq-dd2-sequence-slot {
    width: clamp(84px, 25vw, 104px);
    padding: 5px;
    border-radius: 16px;
  }
  .duduq-dd2-sequence-slot .duduq-dd2-item[data-has-media="true"][data-placed="true"] .duduq-dd2-item-media,
  .duduq-dd2-sequence-slot .duduq-dd2-item-media {
    width: min(80%, 78px) !important;
    max-width: 80% !important;
    height: min(80%, 78px) !important;
    max-height: 80% !important;
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
    width: clamp(76px, 24vw, 92px);
    padding: 4px;
    border-radius: 14px;
  }
  .duduq-dd2-sequence-slot > .duduq-dd2-empty {
    font-size: 11px !important;
  }
  .duduq-dd2-sequence-slot .duduq-dd2-item[data-has-media="true"][data-placed="true"] .duduq-dd2-item-media,
  .duduq-dd2-sequence-slot .duduq-dd2-item-media {
    width: min(80%, 72px) !important;
    max-width: 80% !important;
    height: min(80%, 72px) !important;
    max-height: 80% !important;
  }
}
`;

  function fail(message) {
    throw new Error("[DuduQ Drag & Drop 2.0.19] " + message);
  }

  function patchRuntime(html) {
    if (typeof html !== "string" || !html.trim()) fail("runtime 2.0.18 vazio ou inválido.");

    let prepared = html;
    const occurrences = prepared.split(SEQUENCE_CHILDREN_218).length - 1;
    if (occurrences !== 1) {
      fail("assinatura do renderer de sequência 2.0.18 inesperada (" + occurrences + " ocorrência(s)).");
    }
    prepared = prepared.replace(SEQUENCE_CHILDREN_218, SEQUENCE_CHILDREN_219);

    if (!prepared.includes("</head>")) fail("runtime sem fechamento </head>.");
    prepared = prepared.replace(
      "</head>",
      '<style id="duduq-dd219-sequence-slots">' + SEQUENCE_SLOT_CSS + "</style></head>"
    );

    prepared = prepared.replace(
      "<title>DuduQ - Drag and Drop 2.0.18 - Target Shooter Shell</title>",
      "<title>DuduQ - Drag and Drop 2.0.19 - Sequence Visual Slots</title>"
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
  xhr.open("GET", BASE_ADAPTER_URL + "?dd219Base=" + encodeURIComponent(BASE_VERSION), false);
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
    ['const VERSION = "2.0.18";', 'const VERSION = "2.0.19";'],
    [
      'const RELEASE_PATH = "/engine/releases/mechanics/drag-drop/2.0.18/";',
      'const RELEASE_PATH = "/engine/releases/mechanics/drag-drop/2.0.19/";'
    ],
    [
      "prepared = stampContext(prepared, context);",
      "prepared = stampContext(prepared, context);\\n        prepared = window.__DUDUQ_DD219_PATCH_RUNTIME__(prepared);"
    ]
  ];

  required.forEach(function (pair) {
    const count = source.split(pair[0]).length - 1;
    if (count !== 1) fail("assinatura da base 2.0.18 não encontrada de forma única: " + pair[0]);
    source = source.replace(pair[0], pair[1]);
  });

  source = source.split("DuduQ Drag & Drop 2.0.18").join("DuduQ Drag & Drop 2.0.19");

  try {
    (0, eval)(source);
  } catch (error) {
    fail("falha ao inicializar adapter herdado: " + (error && error.message ? error.message : String(error)));
  }
})();
