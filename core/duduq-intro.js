/* =========================================================
   DUDUQ CORE — INTRO
   Launch Screen universal premium AAA+
   Versão 1.0.0

   Responsabilidades:
   - abertura cinematográfica
   - logo da empresa
   - logo / nome da coleção
   - ano, disciplina e módulo
   - loading gamer
   - CTA "INICIAR MISSÃO"
   - sincronização opcional com carregamento real
   - transição elegante para o jogo
   ========================================================= */

(function () {
  "use strict";


  /* =======================================================
     VERSÃO
     ======================================================= */

  const VERSION =
    "1.0.0";


  if (
    window.DuduQIntro &&
    window.DuduQIntro.version === VERSION
  ) {
    return;
  }


  /* =======================================================
     ASSETS PADRÃO
     ======================================================= */

  const DEFAULT_COMPANY_LOGO =
    "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/LOGO%20DA%20EMPRESA_COLORIDO.png";


  /* =======================================================
     CONFIGURAÇÃO PADRÃO
     ======================================================= */

  const DEFAULTS = Object.freeze({

    companyKicker:
      "UMA CRIAÇÃO DE",

    companyLogo:
      DEFAULT_COMPANY_LOGO,

    companyAlt:
      "Logo da empresa",

    companyName:
      "",

    collectionLogo:
      "",

    collectionAlt:
      "Logo da coleção",

    collectionName:
      "DuduQ",

    year:
      "",

    subject:
      "",

    module:
      "",

    loadingLabel:
      "PREPARANDO SUA MISSÃO",

    readyLabel:
      "MISSÃO PRONTA",

    startLabel:
      "INICIAR MISSÃO",

    hint:
      "Tudo pronto para começar!",

    minDurationMs:
      1850,

    exitDurationMs:
      470,

    autoReady:
      true,

    sparkCount:
      14,

    companyWidth:
      220,

    collectionWidth:
      590,

    container:
      null,

    readyPromise:
      null,

    onReady:
      null,

    onStart:
      null,

    onClose:
      null

  });


  /* =======================================================
     ESTADO
     ======================================================= */

  let activeInstance =
    null;

  let instanceCounter =
    0;


  /* =======================================================
     UTILITÁRIOS
     ======================================================= */

  function clamp(
    value,
    min,
    max
  ) {

    return Math.min(
      max,
      Math.max(
        min,
        value
      )
    );

  }


  function wait(ms) {

    return new Promise(
      function (resolve) {

        window.setTimeout(
          resolve,
          Math.max(
            0,
            Number(ms) || 0
          )
        );

      }
    );

  }


  function safeText(value) {

    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return String(value).trim();

  }


  function createElement(
    tagName,
    className,
    text
  ) {

    const element =
      document.createElement(
        tagName
      );

    if (className) {
      element.className =
        className;
    }

    if (
      text !== undefined &&
      text !== null
    ) {
      element.textContent =
        String(text);
    }

    return element;

  }


  function resolveContainer(value) {

    if (
      value instanceof Element
    ) {
      return value;
    }

    if (
      typeof value === "string" &&
      value.trim()
    ) {

      const found =
        document.querySelector(
          value
        );

      if (found) {
        return found;
      }

    }

    return (
      document.body ||
      document.documentElement
    );

  }


  function now() {

    if (
      window.performance &&
      typeof window.performance.now ===
        "function"
    ) {

      return window.performance.now();

    }

    return Date.now();

  }


  /* =======================================================
     NORMALIZAÇÃO — ANO
     ======================================================= */

  function formatYear(value) {

    const raw =
      safeText(value);

    if (!raw) {
      return "";
    }

    const numericMatch =
      raw.match(
        /^\s*(\d+)\s*$/
      );

    if (numericMatch) {

      return (
        numericMatch[1] +
        "º ANO"
      );

    }

    if (
      /ano/i.test(raw)
    ) {
      return raw.toUpperCase();
    }

    return raw.toUpperCase();

  }


  /* =======================================================
     NORMALIZAÇÃO — MÓDULO
     ======================================================= */

  function formatModule(value) {

    const raw =
      safeText(value);

    if (!raw) {
      return "";
    }

    const numericMatch =
      raw.match(
        /^\s*(\d+)\s*$/
      );

    if (numericMatch) {

      return (
        "MÓDULO " +
        numericMatch[1]
      );

    }

    if (
      /m[oó]dulo/i.test(raw)
    ) {
      return raw.toUpperCase();
    }

    return raw.toUpperCase();

  }


  /* =======================================================
     NORMALIZAÇÃO — DISCIPLINA
     ======================================================= */

  function formatSubject(value) {

    const raw =
      safeText(value);

    return raw
      ? raw.toUpperCase()
      : "";

  }


  /* =======================================================
     PRELOAD DE IMAGEM
     Não bloqueia para sempre caso o asset falhe.
     ======================================================= */

  function preloadImage(src) {

    return new Promise(
      function (resolve) {

        if (!src) {

          resolve({
            ok: false,
            src: ""
          });

          return;

        }


        let finished =
          false;


        const finish =
          function (ok) {

            if (finished) {
              return;
            }

            finished =
              true;

            resolve({
              ok: ok,
              src: src
            });

          };


        try {

          const image =
            new Image();


          image.onload =
            function () {

              finish(true);

            };


          image.onerror =
            function () {

              finish(false);

            };


          image.src =
            src;


          if (image.complete) {

            window.setTimeout(
              function () {

                finish(
                  image.naturalWidth > 0
                );

              },
              0
            );

          }


          window.setTimeout(
            function () {

              finish(
                image.complete &&
                image.naturalWidth > 0
              );

            },
            4500
          );

        } catch (_) {

          finish(false);

        }

      }
    );

  }


  /* =======================================================
     EVENTOS GLOBAIS
     ======================================================= */

  function emit(
    name,
    detail
  ) {

    try {

      document.dispatchEvent(
        new CustomEvent(
          name,
          {
            detail:
              detail || {}
          }
        )
      );

    } catch (_) {}

  }


  /* =======================================================
     SPARK / PARTÍCULA
     ======================================================= */

  function createSpark(index) {

    const spark =
      createElement(
        "span",
        "duduq-intro-spark",
        "★"
      );


    const colors = [
      "#ffc928",
      "#42a7f5",
      "#ffe67a",
      "#73caff"
    ];


    /*
     * Distribuição nas bordas para não
     * competir com as logos no centro.
     */

    const side =
      index % 2 === 0
        ? "left"
        : "right";


    const horizontal =
      3 +
      Math.random() * 22;


    const vertical =
      7 +
      Math.random() * 80;


    const size =
      10 +
      Math.random() * 17;


    const delay =
      300 +
      Math.random() * 1600;


    const duration =
      3800 +
      Math.random() * 2100;


    spark.style[side] =
      horizontal + "%";


    spark.style.top =
      vertical + "%";


    spark.style.setProperty(
      "--duduq-intro-spark-size",
      size.toFixed(1) + "px"
    );


    spark.style.setProperty(
      "--duduq-intro-spark-delay",
      delay.toFixed(0) + "ms"
    );


    spark.style.setProperty(
      "--duduq-intro-spark-duration",
      duration.toFixed(0) + "ms"
    );


    spark.style.setProperty(
      "--duduq-intro-spark-color",
      colors[
        index % colors.length
      ]
    );


    return spark;

  }


  /* =======================================================
     ATMOSFERA
     ======================================================= */

  function buildAtmosphere(
    root,
    options
  ) {

    const atmosphere =
      createElement(
        "div",
        "duduq-intro-atmosphere"
      );


    atmosphere.setAttribute(
      "aria-hidden",
      "true"
    );


    for (
      let index = 0;
      index < 3;
      index += 1
    ) {

      atmosphere.appendChild(
        createElement(
          "span",
          "duduq-intro-orb"
        )
      );

    }


    const sparkCount =
      clamp(
        Number(
          options.sparkCount
        ) || 0,
        0,
        28
      );


    for (
      let index = 0;
      index < sparkCount;
      index += 1
    ) {

      atmosphere.appendChild(
        createSpark(index)
      );

    }


    root.appendChild(
      atmosphere
    );


    return atmosphere;

  }


  /* =======================================================
     MARCA DA EMPRESA
     ======================================================= */

  function buildCompany(
    stage,
    options
  ) {

    const wrapper =
      createElement(
        "div",
        "duduq-intro-company"
      );


    if (
      options.companyKicker
    ) {

      wrapper.appendChild(
        createElement(
          "p",
          "duduq-intro-kicker",
          options.companyKicker
        )
      );

    }


    if (
      options.companyLogo
    ) {

      const logo =
        createElement(
          "img",
          "duduq-intro-company-logo"
        );


      logo.src =
        options.companyLogo;


      logo.alt =
        options.companyAlt ||
        options.companyName ||
        "Logo da empresa";


      logo.decoding =
        "async";


      logo.draggable =
        false;


      logo.addEventListener(
        "error",
        function () {

          logo.remove();

        },
        {
          once: true
        }
      );


      wrapper.appendChild(
        logo
      );

    }


    stage.appendChild(
      wrapper
    );


    return wrapper;

  }


  /* =======================================================
     HERO DA COLEÇÃO
     ======================================================= */

  function buildCollection(
    stage,
    options
  ) {

    const wrapper =
      createElement(
        "div",
        "duduq-intro-collection"
      );


    const fallbackName =
      createElement(
        "h1",
        "duduq-intro-collection-name",
        options.collectionName ||
        "DuduQ"
      );


    let logo =
      null;


    if (
      options.collectionLogo
    ) {

      logo =
        createElement(
          "img",
          "duduq-intro-collection-logo"
        );


      logo.src =
        options.collectionLogo;


      logo.alt =
        options.collectionAlt ||
        options.collectionName ||
        "Logo da coleção";


      logo.decoding =
        "async";


      logo.draggable =
        false;


      fallbackName.hidden =
        true;


      logo.addEventListener(
        "error",
        function () {

          logo.remove();

          fallbackName.hidden =
            false;

        },
        {
          once: true
        }
      );


      wrapper.appendChild(
        logo
      );

    }


    wrapper.appendChild(
      fallbackName
    );


    wrapper.appendChild(
      createElement(
        "span",
        "duduq-intro-collection-shine"
      )
    );


    stage.appendChild(
      wrapper
    );


    return {
      wrapper:
        wrapper,

      logo:
        logo,

      fallbackName:
        fallbackName
    };

  }


  /* =======================================================
     CHIP DE METADADO
     ======================================================= */

  function createMetaChip(
    text,
    primary
  ) {

    const chip =
      createElement(
        "span",
        "duduq-intro-meta-chip" +
        (
          primary
            ? " duduq-intro-meta-chip--primary"
            : ""
        ),
        text
      );


    return chip;

  }


  /* =======================================================
     META — ANO / DISCIPLINA / MÓDULO
     ======================================================= */

  function buildMeta(
    stage,
    options
  ) {

    const wrapper =
      createElement(
        "div",
        "duduq-intro-meta"
      );


    const year =
      formatYear(
        options.year
      );


    const subject =
      formatSubject(
        options.subject
      );


    const module =
      formatModule(
        options.module
      );


    if (year) {

      wrapper.appendChild(
        createMetaChip(
          year,
          true
        )
      );

    }


    if (subject) {

      wrapper.appendChild(
        createMetaChip(
          subject,
          false
        )
      );

    }


    if (module) {

      wrapper.appendChild(
        createMetaChip(
          module,
          false
        )
      );

    }


    /*
     * Mantemos o espaço estrutural apenas
     * quando existe algum metadado.
     */

    if (
      !year &&
      !subject &&
      !module
    ) {

      wrapper.style.display =
        "none";

    }


    stage.appendChild(
      wrapper
    );


    return wrapper;

  }


  /* =======================================================
     LOADING
     ======================================================= */

  function buildLoading(
    stage,
    options
  ) {

    const wrapper =
      createElement(
        "div",
        "duduq-intro-loading"
      );


    const head =
      createElement(
        "div",
        "duduq-intro-loading-head"
      );


    const label =
      createElement(
        "p",
        "duduq-intro-loading-label",
        options.loadingLabel
      );


    const percent =
      createElement(
        "span",
        "duduq-intro-loading-percent",
        "0%"
      );


    head.appendChild(
      label
    );


    head.appendChild(
      percent
    );


    const track =
      createElement(
        "div",
        "duduq-intro-loading-track"
      );


    track.setAttribute(
      "role",
      "progressbar"
    );


    track.setAttribute(
      "aria-label",
      options.loadingLabel
    );


    track.setAttribute(
      "aria-valuemin",
      "0"
    );


    track.setAttribute(
      "aria-valuemax",
      "100"
    );


    track.setAttribute(
      "aria-valuenow",
      "0"
    );


    const fill =
      createElement(
        "div",
        "duduq-intro-loading-fill"
      );


    track.appendChild(
      fill
    );


    wrapper.appendChild(
      head
    );


    wrapper.appendChild(
      track
    );


    stage.appendChild(
      wrapper
    );


    return {
      wrapper:
        wrapper,

      label:
        label,

      percent:
        percent,

      track:
        track,

      fill:
        fill
    };

  }


  /* =======================================================
     CTA
     ======================================================= */

  function buildActions(
    stage,
    options
  ) {

    const wrapper =
      createElement(
        "div",
        "duduq-intro-actions"
      );


    const button =
      createElement(
        "button",
        "duduq-intro-start-button"
      );


    button.type =
      "button";


    button.setAttribute(
      "aria-label",
      options.startLabel
    );


    /*
     * O botão é uma interação real.
     * Isso também permite ao navegador
     * liberar áudio a partir do gesto.
     */


    const icon =
      createElement(
        "span",
        "duduq-intro-start-icon",
        "▶"
      );


    icon.setAttribute(
      "aria-hidden",
      "true"
    );


    const label =
      createElement(
        "span",
        "",
        options.startLabel
      );


    button.appendChild(
      icon
    );


    button.appendChild(
      label
    );


    wrapper.appendChild(
      button
    );


    let hint =
      null;


    if (
      options.hint
    ) {

      hint =
        createElement(
          "p",
          "duduq-intro-hint",
          options.hint
        );


      wrapper.appendChild(
        hint
      );

    }


    stage.appendChild(
      wrapper
    );


    return {
      wrapper:
        wrapper,

      button:
        button,

      label:
        label,

      icon:
        icon,

      hint:
        hint
    };

  }


  /* =======================================================
     MONTA A INTRO
     ======================================================= */

  function render(options) {

    const root =
      createElement(
        "section",
        "duduq-intro"
      );


    root.id =
      "duduq-intro-" +
      (++instanceCounter);


    root.setAttribute(
      "role",
      "dialog"
    );


    root.setAttribute(
      "aria-modal",
      "true"
    );


    root.setAttribute(
      "aria-label",
      "Abertura da missão"
    );


    root.style.setProperty(
      "--duduq-intro-company-width",
      Number(
        options.companyWidth
      ) +
      "px"
    );


    root.style.setProperty(
      "--duduq-intro-collection-width",
      Number(
        options.collectionWidth
      ) +
      "px"
    );


    const atmosphere =
      buildAtmosphere(
        root,
        options
      );


    const stage =
      createElement(
        "div",
        "duduq-intro-stage"
      );


    const company =
      buildCompany(
        stage,
        options
      );


    const collection =
      buildCollection(
        stage,
        options
      );


    const meta =
      buildMeta(
        stage,
        options
      );


    const loading =
      buildLoading(
        stage,
        options
      );


    const actions =
      buildActions(
        stage,
        options
      );


    root.appendChild(
      stage
    );


    return {

      root:
        root,

      atmosphere:
        atmosphere,

      stage:
        stage,

      company:
        company,

      collection:
        collection,

      meta:
        meta,

      loading:
        loading,

      actions:
        actions

    };

  }


  /* =======================================================
     PROGRESSO
     ======================================================= */

  function setInstanceProgress(
    instance,
    value
  ) {

    if (
      !instance ||
      instance.destroyed
    ) {
      return;
    }


    const normalized =
      clamp(
        Number(value) || 0,
        0,
        100
      );


    instance.progress =
      normalized;


    const visualValue =
      normalized.toFixed(1) + "%";


    instance.refs.loading.fill.style.setProperty(
      "--duduq-intro-progress",
      visualValue
    );


    /*
     * A variável precisa ficar no próprio
     * fill porque é onde o CSS lê o valor.
     */

    instance.refs.loading.fill.style.width =
      visualValue;


    instance.refs.loading.percent.textContent =
      Math.round(
        normalized
      ) + "%";


    instance.refs.loading.track.setAttribute(
      "aria-valuenow",
      String(
        Math.round(
          normalized
        )
      )
    );

  }


  /* =======================================================
     LOADING GAMER AUTOMÁTICO
     Caminha rápido no começo e desacelera perto de 90%.
     ======================================================= */

  function startFakeProgress(
    instance
  ) {

    const startTime =
      now();


    setInstanceProgress(
      instance,
      4
    );


    instance.progressTimer =
      window.setInterval(
        function () {

          if (
            instance.destroyed ||
            instance.ready
          ) {

            window.clearInterval(
              instance.progressTimer
            );

            return;
          }


          const elapsed =
            now() -
            startTime;


          let target;


          if (
            elapsed < 420
          ) {

            target =
              36;

          } else if (
            elapsed < 850
          ) {

            target =
              61;

          } else if (
            elapsed < 1350
          ) {

            target =
              78;

          } else {

            target =
              91.5;

          }


          const difference =
            target -
            instance.progress;


          let increment =
            Math.max(
              0.35,
              difference * 0.14
            );


          increment +=
            Math.random() *
            0.55;


          const next =
            Math.min(
              target,
              instance.progress +
              increment
            );


          setInstanceProgress(
            instance,
            next
          );

        },
        95
      );

  }


  /* =======================================================
     READY
     ======================================================= */

  function markInstanceReady(
    instance
  ) {

    if (
      !instance ||
      instance.destroyed ||
      instance.ready
    ) {
      return false;
    }


    instance.ready =
      true;


    if (
      instance.progressTimer
    ) {

      window.clearInterval(
        instance.progressTimer
      );

      instance.progressTimer =
        null;

    }


    setInstanceProgress(
      instance,
      100
    );


    instance.refs.loading.label.textContent =
      instance.options.readyLabel;


    instance.refs.loading.track.setAttribute(
      "aria-label",
      instance.options.readyLabel
    );


    /*
     * Pequeno intervalo para o usuário
     * ver a barra completar antes do CTA.
     */

    instance.readyTimer =
      window.setTimeout(
        function () {

          if (
            instance.destroyed
          ) {
            return;
          }


          instance.refs.root.classList.add(
            "is-ready"
          );


          emit(
            "duduq:intro-ready",
            {
              id:
                instance.id,

              version:
                VERSION,

              options:
                instance.options
            }
          );


          if (
            typeof instance.options.onReady ===
            "function"
          ) {

            try {

              instance.options.onReady({
                id:
                  instance.id,

                intro:
                  window.DuduQIntro
              });

            } catch (error) {

              console.error(
                "[DuduQ Intro] Erro em onReady:",
                error
              );

            }

          }

        },
        310
      );


    return true;

  }


  /* =======================================================
     RESTAURA BODY
     ======================================================= */

  function restoreBody(
    instance
  ) {

    if (
      !instance ||
      !document.body
    ) {
      return;
    }


    document.body.style.overflow =
      instance.previousBodyOverflow;

  }


  /* =======================================================
     LIMPEZA DE TIMERS
     ======================================================= */

  function clearTimers(
    instance
  ) {

    if (!instance) {
      return;
    }


    if (
      instance.progressTimer
    ) {

      window.clearInterval(
        instance.progressTimer
      );

      instance.progressTimer =
        null;

    }


    if (
      instance.readyTimer
    ) {

      window.clearTimeout(
        instance.readyTimer
      );

      instance.readyTimer =
        null;

    }


    if (
      instance.exitTimer
    ) {

      window.clearTimeout(
        instance.exitTimer
      );

      instance.exitTimer =
        null;

    }

  }


  /* =======================================================
     FINALIZA INSTÂNCIA
     ======================================================= */

  function finalizeInstance(
    instance,
    reason
  ) {

    if (
      !instance ||
      instance.destroyed
    ) {
      return;
    }


    instance.destroyed =
      true;


    clearTimers(
      instance
    );


    restoreBody(
      instance
    );


    if (
      instance.refs.root &&
      instance.refs.root.parentNode
    ) {

      instance.refs.root.parentNode.removeChild(
        instance.refs.root
      );

    }


    const result = {

      id:
        instance.id,

      reason:
        reason || "closed",

      version:
        VERSION

    };


    if (
      typeof instance.options.onClose ===
      "function"
    ) {

      try {

        instance.options.onClose(
          result
        );

      } catch (error) {

        console.error(
          "[DuduQ Intro] Erro em onClose:",
          error
        );

      }

    }


    emit(
      "duduq:intro-hidden",
      result
    );


    if (
      typeof instance.resolve ===
      "function"
    ) {

      instance.resolve(
        result
      );

      instance.resolve =
        null;

    }


    if (
      activeInstance === instance
    ) {

      activeInstance =
        null;

    }

  }


  /* =======================================================
     CLIQUE EM INICIAR
     ======================================================= */

  function startMission(
    instance
  ) {

    if (
      !instance ||
      instance.destroyed ||
      !instance.ready ||
      instance.leaving
    ) {
      return;
    }


    instance.leaving =
      true;


    instance.refs.actions.button.disabled =
      true;


    instance.refs.root.classList.add(
      "is-leaving"
    );


    emit(
      "duduq:intro-start",
      {
        id:
          instance.id,

        version:
          VERSION,

        options:
          instance.options
      }
    );


    /*
     * O callback roda imediatamente após
     * o clique para permitir que a primeira
     * mecânica seja montada POR BAIXO da intro
     * enquanto a saída cinematográfica acontece.
     */

    if (
      typeof instance.options.onStart ===
      "function"
    ) {

      try {

        instance.options.onStart({
          id:
            instance.id,

          intro:
            window.DuduQIntro
        });

      } catch (error) {

        console.error(
          "[DuduQ Intro] Erro em onStart:",
          error
        );

      }

    }


    instance.exitTimer =
      window.setTimeout(
        function () {

          finalizeInstance(
            instance,
            "start"
          );

        },
        Math.max(
          350,
          Number(
            instance.options.exitDurationMs
          ) || 470
        )
      );

  }


  /* =======================================================
     GATES DE CARREGAMENTO
     ======================================================= */

  function prepareReadiness(
    instance
  ) {

    const options =
      instance.options;


    const minimumGate =
      wait(
        options.minDurationMs
      );


    const imageGates = [];


    if (
      options.companyLogo
    ) {

      imageGates.push(
        preloadImage(
          options.companyLogo
        )
      );

    }


    if (
      options.collectionLogo
    ) {

      imageGates.push(
        preloadImage(
          options.collectionLogo
        )
      );

    }


    const assetsGate =
      Promise.all(
        imageGates
      );


    let externalGate =
      Promise.resolve();


    if (
      options.readyPromise &&
      typeof options.readyPromise.then ===
        "function"
    ) {

      externalGate =
        Promise.resolve(
          options.readyPromise
        )
        .catch(
          function (error) {

            /*
             * Não deixamos a intro congelada
             * eternamente por causa de uma Promise
             * externa rejeitada.
             */

            console.warn(
              "[DuduQ Intro] readyPromise rejeitada:",
              error
            );

            return null;

          }
        );

    }


    Promise.all([
      minimumGate,
      assetsGate,
      externalGate
    ])
    .then(
      function () {

        if (
          instance.destroyed
        ) {
          return;
        }


        /*
         * readyPromise, quando fornecida,
         * é considerada autorização explícita.
         */

        if (
          options.autoReady !== false ||
          options.readyPromise
        ) {

          markInstanceReady(
            instance
          );

        }

      }
    );

  }


  /* =======================================================
     SHOW
     Retorna Promise que resolve quando a intro termina.
     ======================================================= */

  function show(
    options = {}
  ) {

    /*
     * Só pode existir uma intro global por vez.
     */

    if (
      activeInstance
    ) {

      finalizeInstance(
        activeInstance,
        "replaced"
      );

    }


    const merged =
      Object.assign(
        {},
        DEFAULTS,
        options || {}
      );


    merged.companyLogo =
      safeText(
        merged.companyLogo
      );


    merged.collectionLogo =
      safeText(
        merged.collectionLogo
      );


    merged.collectionName =
      safeText(
        merged.collectionName
      ) ||
      "DuduQ";


    merged.companyKicker =
      safeText(
        merged.companyKicker
      );


    merged.loadingLabel =
      safeText(
        merged.loadingLabel
      ) ||
      "PREPARANDO SUA MISSÃO";


    merged.readyLabel =
      safeText(
        merged.readyLabel
      ) ||
      "MISSÃO PRONTA";


    merged.startLabel =
      safeText(
        merged.startLabel
      ) ||
      "INICIAR MISSÃO";


    merged.minDurationMs =
      clamp(
        Number(
          merged.minDurationMs
        ) || 1850,
        600,
        10000
      );


    merged.exitDurationMs =
      clamp(
        Number(
          merged.exitDurationMs
        ) || 470,
        250,
        1500
      );


    merged.sparkCount =
      clamp(
        Number(
          merged.sparkCount
        ) || 14,
        0,
        28
      );


    merged.companyWidth =
      clamp(
        Number(
          merged.companyWidth
        ) || 220,
        90,
        500
      );


    merged.collectionWidth =
      clamp(
        Number(
          merged.collectionWidth
        ) || 590,
        180,
        900
      );


    const container =
      resolveContainer(
        merged.container
      );


    const refs =
      render(
        merged
      );


    const instance =
      {

        id:
          refs.root.id,

        options:
          merged,

        refs:
          refs,

        container:
          container,

        progress:
          0,

        ready:
          false,

        leaving:
          false,

        destroyed:
          false,

        progressTimer:
          null,

        readyTimer:
          null,

        exitTimer:
          null,

        resolve:
          null,

        previousBodyOverflow:
          document.body
            ? document.body.style.overflow
            : ""

      };


    activeInstance =
      instance;


    if (
      document.body
    ) {

      document.body.style.overflow =
        "hidden";

    }


    container.appendChild(
      refs.root
    );


    refs.actions.button.addEventListener(
      "click",
      function () {

        startMission(
          instance
        );

      }
    );


    startFakeProgress(
      instance
    );


    prepareReadiness(
      instance
    );


    emit(
      "duduq:intro-shown",
      {
        id:
          instance.id,

        version:
          VERSION,

        options:
          merged
      }
    );


    return new Promise(
      function (resolve) {

        instance.resolve =
          resolve;

      }
    );

  }


  /* =======================================================
     API — SET PROGRESS
     Permite integração futura com preload real.
     ======================================================= */

  function setProgress(value) {

    if (
      !activeInstance ||
      activeInstance.destroyed
    ) {
      return false;
    }


    /*
     * Antes de READY, reservamos os 100%
     * para markReady().
     */

    const maximum =
      activeInstance.ready
        ? 100
        : 96;


    setInstanceProgress(
      activeInstance,
      clamp(
        Number(value) || 0,
        0,
        maximum
      )
    );


    return true;

  }


  /* =======================================================
     API — MARK READY
     ======================================================= */

  function markReady() {

    if (
      !activeInstance
    ) {
      return false;
    }


    return markInstanceReady(
      activeInstance
    );

  }


  /* =======================================================
     API — HIDE
     ======================================================= */

  function hide(
    options = {}
  ) {

    if (
      !activeInstance
    ) {
      return false;
    }


    const instance =
      activeInstance;


    const immediate =
      options &&
      options.immediate === true;


    const reason =
      safeText(
        options.reason
      ) ||
      "hidden";


    if (immediate) {

      finalizeInstance(
        instance,
        reason
      );

      return true;

    }


    if (
      instance.leaving
    ) {
      return true;
    }


    instance.leaving =
      true;


    instance.refs.root.classList.add(
      "is-leaving"
    );


    instance.exitTimer =
      window.setTimeout(
        function () {

          finalizeInstance(
            instance,
            reason
          );

        },
        instance.options.exitDurationMs
      );


    return true;

  }


  /* =======================================================
     API — GET INSTANCE
     ======================================================= */

  function getInstance() {

    if (
      !activeInstance
    ) {
      return null;
    }


    return Object.freeze({

      id:
        activeInstance.id,

      version:
        VERSION,

      progress:
        activeInstance.progress,

      ready:
        activeInstance.ready,

      leaving:
        activeInstance.leaving,

      options:
        activeInstance.options,

      element:
        activeInstance.refs.root

    });

  }


  /* =======================================================
     API — IS ACTIVE
     ======================================================= */

  function isActive() {

    return Boolean(
      activeInstance &&
      !activeInstance.destroyed
    );

  }


  /* =======================================================
     API PÚBLICA
     ======================================================= */

  window.DuduQIntro =
    Object.freeze({

      version:
        VERSION,

      show:
        show,

      hide:
        hide,

      destroy:
        hide,

      setProgress:
        setProgress,

      markReady:
        markReady,

      getInstance:
        getInstance,

      isActive:
        isActive

    });


  /* =======================================================
     LOG
     ======================================================= */

  console.info(
    "[DuduQ Intro] v" +
    VERSION +
    " carregado."
  );

})();
