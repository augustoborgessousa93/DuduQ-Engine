/* =========================================================
   DUDUQ CORE — ASSETS
   Fonte central de mascotes, sons e backgrounds.

   Versão 1.1.0

   Novos sons:
   - intro-company-swoosh
   - intro-mission-music
   - transition-swoosh
   ========================================================= */

(function () {
  "use strict";

  const VERSION =
    "1.1.0";


  if (
    window.DuduQAssets &&
    window.DuduQAssets.version === VERSION
  ) {
    return;
  }


  /* =======================================================
     REPOSITÓRIO CENTRAL DE ASSETS
     ======================================================= */

  const BASE =
    "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/";


  /* =======================================================
     CATÁLOGO
     ======================================================= */

  const ASSETS =
    Object.freeze({

      version:
        VERSION,

      repository:
        "augustoborgessousa93/Assets-DuduQ",


      /* ===================================================
         MASCOTES
         =================================================== */

      mascots:
        Object.freeze({

          idle:
            BASE +
            "DUDUQ_IDLE.png",

          correct:
            BASE +
            "DUDUQ_ACERTO.png",

          error:
            BASE +
            "DUDUQ_ERRO.png",

          transition:
            BASE +
            "DUDUQ_IDLE.png",

          complete:
            BASE +
            "Duduq_Li%C3%A7%C3%A3o%20concluida.png"

        }),


      /* ===================================================
         SONS

         Convenção:
         - interação da mecânica
         - feedback
         - interface
         - intro
         - transição
         - conclusão
         =================================================== */

      sounds:
        Object.freeze({

          /* -----------------------------------------------
             INTERAÇÕES
             ----------------------------------------------- */

          "bubble-pop":
            BASE +
            "bubble-pop.mp3",

          click:
            BASE +
            "click.mp3",

          pop:
            BASE +
            "pop.mp3",


          /* -----------------------------------------------
             FEEDBACK
             ----------------------------------------------- */

          correct:
            BASE +
            "correct.mp3",

          ding:
            BASE +
            "ding.mp3",

          error:
            BASE +
            "error.mp3",


          /* -----------------------------------------------
             INTRO — LOGO DA EMPRESA

             Swoosh curto na apresentação inicial
             da marca da empresa.
             ----------------------------------------------- */

          "intro-company-swoosh":
            BASE +
            "swoosh.mp3",


          /* -----------------------------------------------
             INTRO — EDUQ PLAY

             Música leve da cena principal da coleção,
             durante Mission / Ready.
             ----------------------------------------------- */

          "intro-mission-music":
            BASE +
            "happy-fun-EduQ_Play.mp3",


          /* -----------------------------------------------
             TRANSIÇÃO ENTRE MECÂNICAS

             Swoosh sincronizado com o slide horizontal.
             Não representa vitória nem conclusão.
             ----------------------------------------------- */

          "transition-swoosh":
            BASE +
            "swoosh-sound-effect--transitions.mp3",


          /* -----------------------------------------------
             CONCLUSÃO REAL DO MÓDULO
             ----------------------------------------------- */

          win:
            BASE +
            "you%20win.mp3"

        }),


      /* ===================================================
         BACKGROUNDS POR ANO
         =================================================== */

      backgrounds:
        Object.freeze({

          "1":
            BASE +
            "1%C2%BA%20ano%20-whispering-woods.png",

          "2":
            BASE +
            "2%C2%BA%20ano%20-chroma-canyons.png",

          "3":
            BASE +
            "3%C2%BA%20ano%20-clockwork-valley.png",

          "4":
            BASE +
            "4%C2%BA%20ano%20-papercraft-campus.png",

          "5":
            BASE +
            "5%C2%BA%20ano%20-sky-lab.png"

        })

    });


  /* =======================================================
     ANO
     ======================================================= */

  function normalizeYear(
    value
  ) {

    const match =
      String(
        value == null
          ? ""
          : value
      ).match(
        /[1-5]/
      );


    return match
      ? match[0]
      : "";

  }


  function applyYear(
    value
  ) {

    const year =
      normalizeYear(
        value
      );


    if (
      !year ||
      !ASSETS.backgrounds[year] ||
      !document.body
    ) {

      return false;

    }


    document
      .documentElement
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
      document
        .documentElement
        .getAttribute(
          "data-duduq-ano-ativo"
        ) ||
      null
    );

  }


  /* =======================================================
     BUSCA GENÉRICA DE ASSET
     ======================================================= */

  function getAsset(
    type,
    name
  ) {

    if (
      !ASSETS[type]
    ) {

      return null;

    }


    return (
      ASSETS[type][name] ||
      null
    );

  }


  /* =======================================================
     BUSCA DIRETA DE SOM
     ======================================================= */

  function getSound(
    name
  ) {

    return (
      ASSETS
        .sounds
        [name] ||
      null
    );

  }


  /* =======================================================
     API GLOBAL LEGADA
     ======================================================= */

  window.DUDUQ_ASSETS =
    ASSETS;


  /* =======================================================
     API PÚBLICA
     ======================================================= */

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
        getSound

    });


  /* =======================================================
     APLICAÇÃO AUTOMÁTICA DO ANO
     ======================================================= */

  const params =
    new URLSearchParams(
      window.location.search
    );


  const requestedYear =
    params.get("ano") ||
    params.get("year") ||
    params.get("serie") ||
    params.get("série") ||
    document
      .documentElement
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


  /* =======================================================
     READY
     ======================================================= */

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

})();
