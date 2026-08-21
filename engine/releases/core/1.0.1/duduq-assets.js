/* =========================================================
   DUDUQ CORE — ASSETS
   Fonte central de mascotes, sons, backgrounds e conteúdo.

   Versão 1.3.0 — ASSET PATH RESOLVER

   Estrutura oficial do Assets-DuduQ:
   - Imagens Ilustrativa/
   - Efeitos sonoros/
   - Templates/
   - Audios/<ANO>_ANO/M<MODULO>/

   Compatibilidade:
   - Corrige URLs legadas ainda presentes nos módulos.
   - Corrige URLs legadas embutidas nos runtimes DUDUQ_*.html
     quando carregados pelos adapters do Engine.
   - Mantém os nomes originais dos arquivos.
   ========================================================= */

(function () {
  "use strict";

  const VERSION = "1.3.1-local";

  if (
    window.DuduQAssets &&
    window.DuduQAssets.version === VERSION
  ) {
    return;
  }

  const LEGACY_RAW_BASE =
    "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/";

  const BASE =
    "/assets-duduq-local-v1/";

  const IMAGE_BASE =
    BASE + "Imagens%20Ilustrativa/";

  const SOUND_BASE =
    BASE + "Efeitos%20sonoros/";

  const TEMPLATE_BASE =
    BASE + "Templates/";

  const AUDIO_ROOT =
    BASE + "Audios/";

  const IMAGE_FILES =
    new Set([
      "Boy.png",
      "Bye.png",
      "DUDUQ_ACERTO.png",
      "DUDUQ_ERRO.png",
      "DUDUQ_IDLE.png",
      "Duduq_Li%C3%A7%C3%A3o%20concluida.png",
      "Fish_Girl.png",
      "Girl.png",
      "Good%20Afternoon.png",
      "Good%20Morning.png",
      "Good%20Night.png",
      "Hello.png",
      "LOGO%20DA%20EMPRESA_COLORIDO.png",
      "LOGO%20DUDUQ.png",
      "Logo%20EduQ%20Play.png",
      "My%20name.png",
      "Rain.png",
      "nervous.png",
      "wheelchair_boy.png"
    ]);

  const SOUND_FILES =
    new Set([
      "Ops_feedback_erro.mp3",
      "bubble-pop.mp3",
      "click.mp3",
      "correct.mp3",
      "ding.mp3",
      "error.mp3",
      "feedback_correto.mp3",
      "happy-fun-EduQ_Play.mp3",
      "pop.mp3",
      "swoosh-sound-effect--transitions.mp3",
      "swoosh.mp3",
      "you%20win.mp3"
    ]);

  const TEMPLATE_FILES =
    new Set([
      "1%C2%BA%20ano%20-whispering-woods.png",
      "2%C2%BA%20ano%20-chroma-canyons.png",
      "3%C2%BA%20ano%20-clockwork-valley.png",
      "4%C2%BA%20ano%20-papercraft-campus.png",
      "5%C2%BA%20ano%20-sky-lab.png"
    ]);

  function normalizeAssetFileName(value) {
    return String(value || "")
      .replace(/ /g, "%20")
      .replace(/%C3%A7/gi, "%C3%A7")
      .replace(/%C3%A3/gi, "%C3%A3");
  }

  function audioFolderFromFile(fileName) {
    const file =
      String(fileName || "");

    const match =
      file.match(
        /^ING_(\d+)ANO_M(\d+)_/i
      );

    if (!match) {
      return "";
    }

    const year =
      String(
        Number(match[1])
      );

    const module =
      String(
        Number(match[2])
      )
        .padStart(2, "0");

    return (
      year +
      "_ANO/M" +
      module +
      "/"
    );
  }

  function rewriteLegacyAssetUrl(value) {
    if (
      typeof value !== "string"
    ) {
      return value;
    }

    let sourceBase = "";

    if (
      value.startsWith(BASE)
    ) {
      sourceBase = BASE;
    } else if (
      value.startsWith(LEGACY_RAW_BASE)
    ) {
      sourceBase = LEGACY_RAW_BASE;
    } else {
      return value;
    }

    const relative =
      value.slice(sourceBase.length);

    if (
      relative.startsWith("Imagens%20Ilustrativa/") ||
      relative.startsWith("Efeitos%20sonoros/") ||
      relative.startsWith("Templates/") ||
      relative.startsWith("Audios/")
    ) {
      if (
        relative.startsWith("Audios/") &&
        relative.split("/").length === 2
      ) {
        const fileName =
          relative.slice("Audios/".length);

        const folder =
          audioFolderFromFile(fileName);

        if (folder) {
          return (
            AUDIO_ROOT +
            folder +
            fileName
          );
        }
      }

      return (
        BASE +
        relative
      );
    }

    const fileName =
      normalizeAssetFileName(
        relative
      );

    if (
      IMAGE_FILES.has(
        fileName
      )
    ) {
      return (
        IMAGE_BASE +
        fileName
      );
    }

    if (
      SOUND_FILES.has(
        fileName
      )
    ) {
      return (
        SOUND_BASE +
        fileName
      );
    }

    if (
      TEMPLATE_FILES.has(
        fileName
      )
    ) {
      return (
        TEMPLATE_BASE +
        fileName
      );
    }

    return (
      BASE +
      relative
    );
  }
  function rewriteText(text) {
    if (
      typeof text !== "string" ||
      (
        !text.includes(BASE) &&
        !text.includes(LEGACY_RAW_BASE)
      )
    ) {
      return text;
    }

    return text.replace(
      /https:\/\/raw\.githubusercontent\.com\/augustoborgessousa93\/Assets-DuduQ\/main\/[^\s"'<>\\)]+/g,
      function (url) {
        return rewriteLegacyAssetUrl(
          url
        );
      }
    );
  }
  function normalizeYear(value) {
    const match =
      String(
        value == null
          ? ""
          : value
      ).match(/[1-5]/);

    return (
      match
        ? match[0]
        : ""
    );
  }

  function moduleAudioBase(
    year,
    module
  ) {
    const normalizedYear =
      normalizeYear(year);

    const normalizedModule =
      String(
        Number(module) || 1
      )
        .padStart(2, "0");

    if (!normalizedYear) {
      return AUDIO_ROOT;
    }

    return (
      AUDIO_ROOT +
      normalizedYear +
      "_ANO/M" +
      normalizedModule +
      "/"
    );
  }

  const ASSETS =
    Object.freeze({

      version:
        VERSION,

      repository:
        "augustoborgessousa93/Assets-DuduQ",

      paths:
        Object.freeze({
          base:
            BASE,
          images:
            IMAGE_BASE,
          sounds:
            SOUND_BASE,
          templates:
            TEMPLATE_BASE,
          audios:
            AUDIO_ROOT
        }),

      branding:
        Object.freeze({
          companyLogo:
            IMAGE_BASE +
            "LOGO%20DA%20EMPRESA_COLORIDO.png",

          duduqLogo:
            IMAGE_BASE +
            "LOGO%20DUDUQ.png",

          eduqPlayLogo:
            IMAGE_BASE +
            "Logo%20EduQ%20Play.png"
        }),

      mascots:
        Object.freeze({
          idle:
            IMAGE_BASE +
            "DUDUQ_IDLE.png",

          correct:
            IMAGE_BASE +
            "DUDUQ_ACERTO.png",

          error:
            IMAGE_BASE +
            "DUDUQ_ERRO.png",

          transition:
            IMAGE_BASE +
            "DUDUQ_IDLE.png",

          complete:
            IMAGE_BASE +
            "Duduq_Li%C3%A7%C3%A3o%20concluida.png"
        }),

      sounds:
        Object.freeze({
          "bubble-pop":
            SOUND_BASE +
            "bubble-pop.mp3",

          click:
            SOUND_BASE +
            "click.mp3",

          pop:
            SOUND_BASE +
            "pop.mp3",

          correct:
            SOUND_BASE +
            "correct.mp3",

          ding:
            SOUND_BASE +
            "ding.mp3",

          error:
            SOUND_BASE +
            "error.mp3",

          "feedback-correct-voice":
            SOUND_BASE +
            "feedback_correto.mp3",

          "feedback-error-voice":
            SOUND_BASE +
            "Ops_feedback_erro.mp3",

          "intro-company-swoosh":
            SOUND_BASE +
            "swoosh.mp3",

          "intro-mission-music":
            SOUND_BASE +
            "happy-fun-EduQ_Play.mp3",

          "transition-swoosh":
            SOUND_BASE +
            "swoosh-sound-effect--transitions.mp3",

          win:
            SOUND_BASE +
            "you%20win.mp3"
        }),

      backgrounds:
        Object.freeze({
          "1":
            TEMPLATE_BASE +
            "1%C2%BA%20ano%20-whispering-woods.png",

          "2":
            TEMPLATE_BASE +
            "2%C2%BA%20ano%20-chroma-canyons.png",

          "3":
            TEMPLATE_BASE +
            "3%C2%BA%20ano%20-clockwork-valley.png",

          "4":
            TEMPLATE_BASE +
            "4%C2%BA%20ano%20-papercraft-campus.png",

          "5":
            TEMPLATE_BASE +
            "5%C2%BA%20ano%20-sky-lab.png"
        }),

      content:
        Object.freeze({
          english:
            Object.freeze({

              year1:
                Object.freeze({
                  module01:
                    Object.freeze({
                      greeting:
                        IMAGE_BASE +
                        "Hello.png",

                      goodbye:
                        IMAGE_BASE +
                        "Bye.png",

                      morning:
                        IMAGE_BASE +
                        "Good%20Morning.png",

                      afternoon:
                        IMAGE_BASE +
                        "Good%20Afternoon.png",

                      night:
                        IMAGE_BASE +
                        "Good%20Night.png",

                      boy:
                        IMAGE_BASE +
                        "Boy.png",

                      girl:
                        IMAGE_BASE +
                        "Girl.png",

                      selfintro:
                        IMAGE_BASE +
                        "My%20name.png",

                      rain:
                        IMAGE_BASE +
                        "Rain.png",

                      nervous:
                        IMAGE_BASE +
                        "nervous.png",

                      fishGirl:
                        IMAGE_BASE +
                        "Fish_Girl.png",

                      wheelchairBoy:
                        IMAGE_BASE +
                        "wheelchair_boy.png"
                    })
                }),

              year2:
                Object.freeze({
                  module01:
                    Object.freeze({
                      greeting:
                        IMAGE_BASE +
                        "Hello.png",

                      goodbye:
                        IMAGE_BASE +
                        "Bye.png",

                      morning:
                        IMAGE_BASE +
                        "Good%20Morning.png",

                      afternoon:
                        IMAGE_BASE +
                        "Good%20Afternoon.png",

                      night:
                        IMAGE_BASE +
                        "Good%20Night.png",

                      rain:
                        IMAGE_BASE +
                        "Rain.png",

                      nervous:
                        IMAGE_BASE +
                        "nervous.png",

                      fishGirl:
                        IMAGE_BASE +
                        "Fish_Girl.png",

                      wheelchairBoy:
                        IMAGE_BASE +
                        "wheelchair_boy.png"
                    })
                })
            })
        })
    });

  function applyYear(value) {
    const year =
      normalizeYear(value);

    if (
      !year ||
      !ASSETS.backgrounds[year] ||
      !document.body
    ) {
      return false;
    }

    document.documentElement
      .setAttribute(
        "data-duduq-ano-ativo",
        year
      );

    document.body.style.backgroundImage =
      'url("' +
      ASSETS.backgrounds[year] +
      '")';

    document.body.style.backgroundPosition =
      "center top";

    document.body.style.backgroundSize =
      "cover";

    document.body.style.backgroundRepeat =
      "no-repeat";

    document.body.style.backgroundAttachment =
      "fixed";

    return true;
  }

  function getYear() {
    return (
      document.documentElement
        .getAttribute(
          "data-duduq-ano-ativo"
        ) ||
      null
    );
  }

  function getAsset(
    type,
    name
  ) {
    if (!ASSETS[type]) {
      return null;
    }

    return (
      ASSETS[type][name] ||
      null
    );
  }

  function getSound(name) {
    return (
      ASSETS.sounds[name] ||
      null
    );
  }

  function getContentAsset(
    subject,
    year,
    module,
    name
  ) {
    const subjectKey =
      String(
        subject || ""
      )
        .trim()
        .toLowerCase();

    const yearKey =
      "year" +
      String(
        year || ""
      )
        .replace(
          /\D/g,
          ""
        );

    const moduleKey =
      "module" +
      String(
        module || ""
      )
        .replace(
          /\D/g,
          ""
        )
        .padStart(
          2,
          "0"
        );

    return (
      ASSETS.content
        ?.[subjectKey]
        ?.[yearKey]
        ?.[moduleKey]
        ?.[name] ||
      null
    );
  }

  /*
   * =======================================================
   * NORMALIZAÇÃO DO CONTEÚDO JÁ PUBLICADO
   * =======================================================
   *
   * Os módulos antigos são clonados porque moduleDefinition
   * pode estar congelado com Object.freeze().
   */

  function cloneAndRewrite(
    value,
    seen
  ) {
    if (
      typeof value === "string"
    ) {
      return rewriteLegacyAssetUrl(
        value
      );
    }

    if (
      value === null ||
      typeof value !== "object"
    ) {
      return value;
    }

    if (
      value instanceof Date
    ) {
      return new Date(
        value.getTime()
      );
    }

    const cache =
      seen ||
      new WeakMap();

    if (
      cache.has(value)
    ) {
      return cache.get(
        value
      );
    }

    if (
      Array.isArray(value)
    ) {
      const result = [];
      cache.set(
        value,
        result
      );

      value.forEach(
        function (item) {
          result.push(
            cloneAndRewrite(
              item,
              cache
            )
          );
        }
      );

      return result;
    }

    const result = {};
    cache.set(
      value,
      result
    );

    Object.keys(value)
      .forEach(
        function (key) {
          result[key] =
            cloneAndRewrite(
              value[key],
              cache
            );
        }
      );

    return result;
  }

  function normalizeModule(
    moduleDefinition
  ) {
    if (
      !moduleDefinition ||
      typeof moduleDefinition !==
        "object"
    ) {
      return moduleDefinition;
    }

    const normalized =
      cloneAndRewrite(
        moduleDefinition
      );

    const year =
      normalized.year;

    const module =
      normalized.module;

    if (
      normalized.audioPolicy &&
      typeof normalized.audioPolicy ===
        "object"
    ) {
      normalized.audioPolicy.base =
        moduleAudioBase(
          year,
          module
        );
    }

    if (
      normalized.intro &&
      typeof normalized.intro ===
        "object"
    ) {
      normalized.intro.companyLogo =
        ASSETS.branding
          .companyLogo;

      if (
        !normalized.intro
          .collectionLogo ||
        normalized.intro
          .collectionLogo
          .includes(
            "Logo%20EduQ%20Play.png"
          )
      ) {
        normalized.intro.collectionLogo =
          ASSETS.branding
            .eduqPlayLogo;
      }
    }

    return Object.freeze(
      normalized
    );
  }

  function normalizeLoadedContent() {
    const content =
      window.DUDUQ_CONTENT;

    if (
      !content ||
      typeof content !==
        "object"
    ) {
      return false;
    }

    let changed =
      false;

    Object.keys(content)
      .forEach(
        function (subjectKey) {
          const subject =
            content[subjectKey];

          if (
            !subject ||
            typeof subject !==
              "object"
          ) {
            return;
          }

          Object.keys(subject)
            .forEach(
              function (yearKey) {
                const yearObject =
                  subject[yearKey];

                if (
                  !yearObject ||
                  typeof yearObject !==
                    "object"
                ) {
                  return;
                }

                Object.keys(
                  yearObject
                )
                  .forEach(
                    function (
                      moduleKey
                    ) {
                      const current =
                        yearObject[
                          moduleKey
                        ];

                      if (
                        !current ||
                        typeof current !==
                          "object"
                      ) {
                        return;
                      }

                      try {
                        yearObject[
                          moduleKey
                        ] =
                          normalizeModule(
                            current
                          );

                        changed =
                          true;
                      } catch (
                        error
                      ) {
                        console.warn(
                          "[DuduQ Assets] Não foi possível normalizar " +
                            subjectKey +
                            "/" +
                            yearKey +
                            "/" +
                            moduleKey +
                            ".",
                          error
                        );
                      }
                    }
                  );
              }
            );
        }
      );

    return changed;
  }

  /*
   * =======================================================
   * COMPATIBILIDADE DOS RUNTIMES EMBUTIDOS
   * =======================================================
   *
   * Os adapters carregam DUDUQ_*.html via fetch().
   * Alguns runtimes ainda contêm a antiga árvore de assets.
   * Somente essas respostas HTML são reescritas.
   */

  const RUNTIME_PATTERN =
    /(?:^|\/)DUDUQ_(?:BUBBLE_POP|DRAG_DROP|MATCHING|MEMORY_QUEST|SMART_SENTENCE|TARGET_SHOOTER|WORD_SLASH)\.html(?:[?#]|$)/i;

  function getRequestUrl(
    input
  ) {
    if (
      typeof input ===
        "string"
    ) {
      return input;
    }

    if (
      input &&
      typeof input.url ===
        "string"
    ) {
      return input.url;
    }

    return "";
  }

  function installRuntimeFetchBridge() {
    if (
      typeof window.fetch !==
        "function" ||
      window.fetch
        .__duduqAssetPathBridge
    ) {
      return false;
    }

    const nativeFetch =
      window.fetch.bind(
        window
      );

    const bridgedFetch =
      function (
        input,
        init
      ) {
        const requestUrl =
          getRequestUrl(
            input
          );

        const request =
          nativeFetch(
            input,
            init
          );

        if (
          !RUNTIME_PATTERN.test(
            requestUrl
          )
        ) {
          return request;
        }

        return request.then(
          function (
            response
          ) {
            if (
              !response ||
              !response.ok
            ) {
              return response;
            }

            return response
              .text()
              .then(
                function (
                  originalHtml
                ) {
                  const updatedHtml =
                    rewriteText(
                      originalHtml
                    );

                  const headers =
                    new Headers(
                      response.headers
                    );

                  headers.delete(
                    "content-length"
                  );

                  headers.delete(
                    "content-encoding"
                  );

                  return new Response(
                    updatedHtml,
                    {
                      status:
                        response.status,
                      statusText:
                        response.statusText,
                      headers:
                        headers
                    }
                  );
                }
              );
          }
        );
      };

    Object.defineProperty(
      bridgedFetch,
      "__duduqAssetPathBridge",
      {
        value:
          true,
        enumerable:
          false
      }
    );

    Object.defineProperty(
      bridgedFetch,
      "__duduqNativeFetch",
      {
        value:
          nativeFetch,
        enumerable:
          false
      }
    );

    window.fetch =
      bridgedFetch;

    return true;
  }

  window.DUDUQ_ASSETS =
    ASSETS;

  window.DuduQAssets =
    Object.freeze({
      version:
        VERSION,

      assets:
        ASSETS,

      setYear:
        applyYear,

      getYear:
        getYear,

      get:
        getAsset,

      getSound:
        getSound,

      getContent:
        getContentAsset,

      rewriteUrl:
        rewriteLegacyAssetUrl,

      rewriteText:
        rewriteText,

      normalizeContent:
        normalizeLoadedContent,

      getAudioBase:
        moduleAudioBase
    });

  installRuntimeFetchBridge();

  const params =
    new URLSearchParams(
      window.location.search
    );

  const requestedYear =
    params.get(
      "ano"
    ) ||
    params.get(
      "year"
    ) ||
    params.get(
      "serie"
    ) ||
    params.get(
      "série"
    ) ||
    document.documentElement
      .getAttribute(
        "data-duduq-ano"
      ) ||
    window.DUDUQ_ANO;

  if (
    requestedYear
  ) {
    applyYear(
      requestedYear
    );
  }

  /*
   * Este listener é registrado antes do Host e antes do
   * listener final dos players. Quando DOMContentLoaded
   * ocorrer, module-01.js já terá sido executado.
   */
  window.addEventListener(
    "DOMContentLoaded",
    function () {
      normalizeLoadedContent();
    }
  );

  /*
   * Segurança adicional para integrações que carreguem o
   * conteúdo muito próximo do evento DOMContentLoaded.
   */
  window.addEventListener(
    "load",
    function () {
      normalizeLoadedContent();
    }
  );

  try {
    window.dispatchEvent(
      new CustomEvent(
        "duduq:assets-ready",
        {
          detail: {
            version:
              VERSION
          }
        }
      )
    );
  } catch (_) {}

  console.info(
    "[DuduQ Assets] v" +
      VERSION +
      " — nova árvore de assets + compatibilidade legada carregadas."
  );

})();
