/* =========================================================
   DUDUQ CORE — ASSETS
   Fonte central de mascotes, sons, backgrounds e conteúdo.
 
   Versão 1.2.0
 
   Conteúdo oficial adicionado:
   - English — Year 1 — Module 01
   - HELLO / GOODBYE / GOOD MORNING / GOOD AFTERNOON
   - GOOD NIGHT / BOY / GIRL / MY NAME
   ========================================================= */
 
(function () {
  "use strict";
 
  const VERSION = "1.2.0";
 
  if (
    window.DuduQAssets &&
    window.DuduQAssets.version === VERSION
  ) {
    return;
  }
 
  const BASE =
    "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/";
 
  const ASSETS =
    Object.freeze({
 
      version: VERSION,
 
      repository:
        "augustoborgessousa93/Assets-DuduQ",
 
      mascots:
        Object.freeze({
          idle: BASE + "DUDUQ_IDLE.png",
          correct: BASE + "DUDUQ_ACERTO.png",
          error: BASE + "DUDUQ_ERRO.png",
          transition: BASE + "DUDUQ_IDLE.png",
          complete: BASE + "Duduq_Li%C3%A7%C3%A3o%20concluida.png"
        }),
 
      sounds:
        Object.freeze({
          "bubble-pop": BASE + "bubble-pop.mp3",
          click: BASE + "click.mp3",
          pop: BASE + "pop.mp3",
          correct: BASE + "correct.mp3",
          ding: BASE + "ding.mp3",
          error: BASE + "error.mp3",
          "intro-company-swoosh": BASE + "swoosh.mp3",
          "intro-mission-music": BASE + "happy-fun-EduQ_Play.mp3",
          "transition-swoosh": BASE + "swoosh-sound-effect--transitions.mp3",
          win: BASE + "you%20win.mp3"
        }),
 
      backgrounds:
        Object.freeze({
          "1": BASE + "1%C2%BA%20ano%20-whispering-woods.png",
          "2": BASE + "2%C2%BA%20ano%20-chroma-canyons.png",
          "3": BASE + "3%C2%BA%20ano%20-clockwork-valley.png",
          "4": BASE + "4%C2%BA%20ano%20-papercraft-campus.png",
          "5": BASE + "5%C2%BA%20ano%20-sky-lab.png"
        }),
 
      content:
        Object.freeze({
          english:
            Object.freeze({
              year1:
                Object.freeze({
                  module01:
                    Object.freeze({
                      greeting: BASE + "Hello.png",
                      goodbye: BASE + "Bye.png",
                      morning: BASE + "Good%20Morning.png",
                      afternoon: BASE + "Good%20Afternoon.png",
                      night: BASE + "Good%20Night.png",
                      boy: BASE + "Boy.png",
                      girl: BASE + "Girl.png",
                      selfintro: BASE + "My%20name.png"
                    })
                })
            })
        })
    });
 
  function normalizeYear(value) {
    const match =
      String(value == null ? "" : value)
        .match(/[1-5]/);
 
    return match ? match[0] : "";
  }
 
  function applyYear(value) {
    const year = normalizeYear(value);
 
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
      'url("' + ASSETS.backgrounds[year] + '")';
 
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
        .getAttribute("data-duduq-ano-ativo") ||
      null
    );
  }
 
  function getAsset(type, name) {
    if (!ASSETS[type]) return null;
 
    return ASSETS[type][name] || null;
  }
 
  function getSound(name) {
    return ASSETS.sounds[name] || null;
  }
 
  function getContentAsset(
    subject,
    year,
    module,
    name
  ) {
    const subjectKey =
      String(subject || "")
        .trim()
        .toLowerCase();
 
    const yearKey =
      "year" +
      String(year || "")
        .replace(/\D/g, "");
 
    const moduleKey =
      "module" +
      String(module || "")
        .replace(/\D/g, "")
        .padStart(2, "0");
 
    return (
      ASSETS.content
        ?.[subjectKey]
        ?.[yearKey]
        ?.[moduleKey]
        ?.[name] ||
      null
    );
  }
 
  window.DUDUQ_ASSETS = ASSETS;
 
  window.DuduQAssets =
    Object.freeze({
      version: VERSION,
      assets: ASSETS,
      setYear: applyYear,
      getYear: getYear,
      get: getAsset,
      getSound: getSound,
      getContent: getContentAsset
    });
 
  const params =
    new URLSearchParams(
      window.location.search
    );
 
  const requestedYear =
    params.get("ano") ||
    params.get("year") ||
    params.get("serie") ||
    params.get("série") ||
    document.documentElement
      .getAttribute("data-duduq-ano") ||
    window.DUDUQ_ANO;
 
  if (requestedYear) {
    applyYear(requestedYear);
  }
 
  try {
    window.dispatchEvent(
      new CustomEvent(
        "duduq:assets-ready",
        {
          detail: {
            version: VERSION
          }
        }
      )
    );
  } catch (_) {}
 
})();
