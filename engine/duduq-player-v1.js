/* =========================================================
   DUDUQ UNIVERSAL PLAYER v1.0.0
   Golden Master v1
   Derivado do player aprovado dos módulos sentinela.
   ========================================================= */

(function () {
  "use strict";


    window.addEventListener(
      "duduq:engine-ready",
      function () {
        const gameConfig =
          window.DUDUQ_GAME_CONFIG || {};

        const root =
          document.getElementById("root");

        /* ===============================================
           VERIFICAÇÕES DO CORE
           =============================================== */

        const requiredGlobals = [
          ["DuduQIntro", "DuduQ Intro"],
          ["DuduQWorldFusion", "DuduQ World Fusion"],
          ["DuduQSchema", "DuduQ Schema"],
          ["DuduQContentAudio", "DuduQ Content Audio"],
          ["DuduQCompletion", "DuduQ Completion"],
          ["DuduQTransition", "DuduQ Transition"],
          ["DuduQ", "DuduQ Host"],
          ["DuduQProgressUI", "DuduQ Progress UI"],
          ["DuduQRouter", "DuduQ Router"]
        ];

        for (
          const [
            globalName,
            label
          ] of requiredGlobals
        ) {
          if (!window[globalName]) {
            root.textContent =
              `Erro: ${label} não foi carregado.`;

            return;
          }
        }

        /* ===============================================
           VERIFICAÇÕES DAS MECÂNICAS PUBLICADAS
           =============================================== */

        const requiredMechanics =
          Array.isArray(gameConfig.requiredMechanics)
            ? gameConfig.requiredMechanics
            : Object.keys(
                window.DUDUQ_ENGINE_MANIFEST?.mechanics || {}
              );

        for (
          const mechanicId
          of requiredMechanics
        ) {
          if (
            !window.DuduQ
              .hasMechanic(
                mechanicId
              )
          ) {
            root.textContent =
              `Erro: a mecânica "${mechanicId}" não foi registrada.`;

            return;
          }
        }

        /* ===============================================
           CONTEÚDO OFICIAL
           =============================================== */

        const moduleDefinition =
          (
            Array.isArray(gameConfig.modulePath)
              ? gameConfig.modulePath
              : []
          ).reduce(
            function (current, key) {
              return current?.[key];
            },
            window.DUDUQ_CONTENT
          );

        if (!moduleDefinition) {
          root.textContent =
            `Erro: o conteúdo ${gameConfig.label || "DuduQ"} não foi carregado.`;

          return;
        }

        if (
          !Array.isArray(
            moduleDefinition.activities
          ) ||
          moduleDefinition
            .activities
            .length === 0
        ) {
          root.textContent =
            "Erro: o módulo não possui atividades.";

          return;
        }

        /* ===============================================
           FIRST LOAD — PREPARAÇÃO DO CENÁRIO

           O problema da tela azul só acontece no primeiro
           acesso porque o background remoto ainda não está
           no cache. A Transition universal possui uma cor
           azul-base segura para trocas normais, mas esse
           fallback não combina com a saída branca da Intro.

           Aqui o cenário do ano é carregado e decodificado
           enquanto a Intro ainda está em exibição.
           =============================================== */

        const moduleYearKey =
          String(
            moduleDefinition.year ?? ""
          ).match(/[1-5]/)?.[0] || "";

        const moduleBackgroundSrc =
          (
            window.DuduQAssets
              ?.assets
              ?.backgrounds
              ?.[moduleYearKey]
          ) ||
          (
            window.DUDUQ_ASSETS
              ?.backgrounds
              ?.[moduleYearKey]
          ) ||
          "";

        function prepareFirstWorldBackground() {
          if (
            !moduleYearKey ||
            !moduleBackgroundSrc
          ) {
            return Promise.resolve(false);
          }

          /*
           * Aplicamos o URL imediatamente ao documento principal.
           * A Intro cobre a tela, então essa preparação não aparece
           * para o aluno.
           */
          try {
            window.DuduQAssets
              ?.setYear
              ?.(moduleYearKey);
          } catch (_) {}

          try {
            document.documentElement
              .style
              .setProperty(
                "--duduq-world-image",
                `url("${moduleBackgroundSrc}")`
              );
          } catch (_) {}

          /*
           * A ponte recebe o mesmo URL antes do download terminar.
           * Assim ela não depende de descobrir a imagem somente
           * depois do DuduQ.start().
           */
          try {
            const transitionRoot =
              window.DuduQTransition
                ?.ensureRoot
                ?.();

            transitionRoot
              ?.style
              ?.setProperty(
                "--duduq-transition-world-image",
                `url("${moduleBackgroundSrc}")`
              );
          } catch (_) {}

          return new Promise(
            function (resolve) {
              let settled = false;
              let timeoutId = null;

              const image =
                new Image();

              image.decoding =
                "async";

              function finish(ok) {
                if (settled) return;

                settled = true;

                if (timeoutId !== null) {
                  window.clearTimeout(
                    timeoutId
                  );
                }

                try {
                  window.DuduQWorldFusion
                    ?.refresh
                    ?.();
                } catch (_) {}

                try {
                  window.DuduQTransition
                    ?.primeWorldBridge
                    ?.();
                } catch (_) {}

                /*
                 * Dois paints estáveis antes de liberar a Intro.
                 */
                window.requestAnimationFrame(
                  function () {
                    window.requestAnimationFrame(
                      function () {
                        resolve(Boolean(ok));
                      }
                    );
                  }
                );
              }

              image.onload =
                function () {
                  const decoded =
                    typeof image.decode ===
                    "function"
                      ? image
                          .decode()
                          .catch(
                            function () {}
                          )
                      : Promise.resolve();

                  Promise.resolve(decoded)
                    .finally(
                      function () {
                        finish(true);
                      }
                    );
                };

              image.onerror =
                function () {
                  finish(false);
                };

              image.src =
                moduleBackgroundSrc;

              if (
                image.complete &&
                image.naturalWidth > 0
              ) {
                window.setTimeout(
                  function () {
                    image.onload?.();
                  },
                  0
                );
              }

              /*
               * Segurança: a Intro não fica presa se houver
               * falha real de rede. Nesse caso, o CSS 1.5.0
               * mantém um fallback claro, nunca azul escuro.
               */
              timeoutId =
                window.setTimeout(
                  function () {
                    finish(false);
                  },
                  6000
                );
            }
          );
        }

        const firstWorldReady =
          prepareFirstWorldBackground();

        /* ===============================================
           CONTEÚDO -> STEPS DO HOST

           O conteúdo publicado declara a mecânica desejada.
           O Router continua sendo usado como VALIDADOR:
           todas as questões precisam ser compatíveis com
           a mecânica declarada antes de iniciar a missão.
           =============================================== */

        const steps = [];

        for (
          let activityIndex = 0;
          activityIndex <
            moduleDefinition
              .activities
              .length;
          activityIndex += 1
        ) {
          const activity =
            moduleDefinition
              .activities[
                activityIndex
              ];

          const questions =
            Array.isArray(
              activity.questions
            )
              ? activity.questions
              : [];

          if (
            !activity.id ||
            !activity.title ||
            !activity.mechanic ||
            questions.length === 0
          ) {
            root.textContent =
              `Erro: atividade ${activityIndex + 1} incompleta no módulo.`;

            return;
          }

          const decisions =
            questions.map(
              function (
                question,
                questionIndex
              ) {
                const decision =
                  window.DuduQRouter
                    .select(
                      question,
                      questionIndex,
                      {
                        subject:
                          moduleDefinition
                            .subject,

                        year:
                          moduleDefinition
                            .year,

                        module:
                          moduleDefinition
                            .module
                      }
                    );

                return {
                  question,
                  decision
                };
              }
            );

          const invalidDecision =
            decisions.find(
              function (entry) {
                return (
                  !entry
                    .decision
                    ?.selected ||
                  entry
                    .decision
                    .selected
                    .mechanicId !==
                    activity.mechanic
                );
              }
            );

          if (invalidDecision) {
            console.error(
              "[DuduQ Content] Atividade incompatível com a mecânica declarada:",
              {
                activity,
                decision:
                  invalidDecision
                    .decision,
                question:
                  invalidDecision
                    .question
              }
            );

            root.textContent =
              `Erro: "${activity.title}" não é compatível com "${activity.mechanic}".`;

            return;
          }

          steps.push({
            id: activity.id,
            mechanic:
              activity.mechanic,

            payload: {
              id:
                `${activity.id}-payload`,

              title:
                activity.title,

              subject:
                moduleDefinition
                  .subject,

              year:
                moduleDefinition
                  .year,

              module:
                moduleDefinition
                  .module,

              questions
            },

            options: {
              contentVersion:
                moduleDefinition
                  .version,

              skill:
                activity.skill ||
                null
            }
          });
        }

        console.info(
          "[DuduQ Content Production]",
          {
            module:
              moduleDefinition.id,

            version:
              moduleDefinition.version,

            activities:
              steps.length,

            mechanics:
              steps.map(
                function (step) {
                  return step.mechanic;
                }
              )
          }
        );

        /* ===============================================
           INICIA O MÓDULO
           =============================================== */

        function startModule() {
          window.DuduQ.start({
            id:
              moduleDefinition.id,

            title:
              moduleDefinition.title,

            year:
              moduleDefinition.year,

            subject:
              moduleDefinition
                .subject,

            module:
              moduleDefinition
                .module,

            container:
              "#root",

            steps
          });
        }

        /* ===============================================
           HANDOFF INTRO -> PRIMEIRA ATIVIDADE

           A primeira mecânica é montada atrás da Intro.
           Logo em seguida, a ponte visual oficial cobre
           a Intro, que só então é removida. O reveal
           aguarda o iframe + World Fusion + paints
           estáveis antes de mostrar o conteúdo.
           =============================================== */


        /* ===============================================
           PRIMEIRO ÁUDIO — RESPIRO APÓS A INTRO

           O runtime pode solicitar o autoplay poucos milissegundos
           depois de montar a primeira questão. Travamos somente essa
           primeira fala e a liberamos após o reveal + um pequeno
           tempo de leitura visual da tela.
           =============================================== */

        let initialSpeechReleaseTimer = null;

        function lockInitialInstructionSpeech() {
          if (initialSpeechReleaseTimer !== null) {
            window.clearTimeout(initialSpeechReleaseTimer);
            initialSpeechReleaseTimer = null;
          }

          document.documentElement.setAttribute(
            "data-duduq-initial-speech-gate",
            "locked"
          );
        }

        function releaseInitialInstructionSpeech(delayMs = 420) {
          if (initialSpeechReleaseTimer !== null) {
            window.clearTimeout(initialSpeechReleaseTimer);
          }

          initialSpeechReleaseTimer = window.setTimeout(
            function () {
              document.documentElement.removeAttribute(
                "data-duduq-initial-speech-gate"
              );

              try {
                window.dispatchEvent(
                  new CustomEvent(
                    "duduq:initial-speech-release"
                  )
                );
              } catch (_) {}

              initialSpeechReleaseTimer = null;
            },
            Math.max(0, Number(delayMs) || 0)
          );
        }

        async function startModuleWithIntroHandoff() {
          const introApi =
            window.DuduQIntro;

          const transition =
            window.DuduQTransition;

          const introElement =
            introApi
              ?.getInstance
              ?.()
              ?.element;

          introElement
            ?.classList
            ?.add(
              "is-transition-handoff"
            );

          const transitionRoot =
            transition
              ?.ensureRoot
              ?.();

          transitionRoot
            ?.classList
            ?.add(
              "is-intro-soft"
            );

          /*
           * DuduQ.start() é chamado primeiro porque o Host
           * limpa qualquer Transition anterior durante start().
           * Como a Intro está acima do #root, a mecânica nasce
           * escondida atrás dela no mesmo task.
           *
           * Antes de montar, travamos somente o primeiro autoplay.
           */
          lockInitialInstructionSpeech();
          startModule();

          if (
            !transition?.cover ||
            !transition?.reveal
          ) {
            transitionRoot
              ?.classList
              ?.remove(
                "is-intro-soft"
              );

            introElement
              ?.classList
              ?.remove(
                "is-transition-handoff"
              );

            return;
          }

          try {
            const covered =
              await transition.cover({
                coverDurationMs: 340,
                soundEnabled: false
              });

            if (!covered) {
              releaseInitialInstructionSpeech(320);
              return;
            }

            /*
             * A ponte já está completamente estabelecida.
             * A Intro sai protegida e a primeira atividade
             * entra com reveal mais lento e mais suave.
             */
            introApi
              ?.hide
              ?.({
                immediate: true,
                reason: "start-handoff"
              });

            await transition.reveal({
              revealDurationMs: 520,
              stablePaintFrames: 2,
              revealHoldFraction: .20,
              soundEnabled: false
            });

            /* A tela já está aberta. Damos um respiro curto para
               a criança localizar visualmente o enunciado antes da fala. */
            releaseInitialInstructionSpeech(420);
          } catch (error) {
            console.error(
              "[DuduQ Intro Soft] Falha na transição:",
              error
            );

            introApi
              ?.hide
              ?.({
                immediate: true,
                reason: "start-handoff-fallback"
              });

            transition
              ?.hideImmediate
              ?.();

            releaseInitialInstructionSpeech(280);
          } finally {
            transitionRoot
              ?.classList
              ?.remove(
                "is-intro-soft"
              );

            introElement
              ?.classList
              ?.remove(
                "is-transition-handoff"
              );
          }
        }


        /* ===============================================
           INTRO — RECUPERAÇÃO SONORA R17

           O Core Sound já tenta tocar o swoosh na fase de
           branding e a música na fase mission. Este reforço:
           - repete a tentativa após o asset estar pronto;
           - reforça a música quando MISSÃO PRONTA aparece;
           - no clique INICIAR MISSÃO, usa a ativação real do
             usuário para tocar o swoosh de transição.

           Observação: navegadores podem bloquear qualquer
           áudio audível antes do primeiro gesto do usuário.
           =============================================== */

        function installIntroSoundRecovery() {
          const sound =
            window.DuduQSound;

          if (!sound) return;

          let retryBrandingTimer = null;
          let retryMissionTimer = null;

          function replayBrandingIfNeeded() {
            if (
              sound.isPlaying(
                "intro-company-swoosh"
              )
            ) {
              return;
            }

            sound.play(
              "intro-company-swoosh",
              {
                volume: 0.58,
                minGapMs: 0
              }
            );
          }

          function replayMissionIfNeeded() {
            if (
              sound.isPlaying(
                "intro-mission-music"
              )
            ) {
              return;
            }

            sound.playLoop(
              "intro-mission-music",
              {
                volume: 0.24,
                fadeInMs: 520,
                minGapMs: 0
              }
            );
          }

          document.addEventListener(
            "duduq:intro-phase",
            function (event) {
              const phase =
                event?.detail?.phase || "";

              if (phase === "branding") {
                if (retryBrandingTimer !== null) {
                  window.clearTimeout(
                    retryBrandingTimer
                  );
                }

                retryBrandingTimer =
                  window.setTimeout(
                    replayBrandingIfNeeded,
                    220
                  );

                return;
              }

              if (phase === "mission") {
                if (retryMissionTimer !== null) {
                  window.clearTimeout(
                    retryMissionTimer
                  );
                }

                retryMissionTimer =
                  window.setTimeout(
                    replayMissionIfNeeded,
                    260
                  );
              }
            }
          );

          document.addEventListener(
            "duduq:intro-ready",
            function () {
              window.setTimeout(
                replayMissionIfNeeded,
                100
              );
            }
          );

          document.addEventListener(
            "duduq:intro-start",
            function () {
              /*
               * Este evento nasce diretamente do clique no
               * botão INICIAR MISSÃO. Portanto é o ponto mais
               * confiável para áudio audível em navegadores
               * com política restrita de autoplay.
               */
              sound.stop(
                "click"
              );

              sound.play(
                "transition-swoosh",
                {
                  volume: 0.48,
                  minGapMs: 0
                }
              );
            }
          );
        }

        installIntroSoundRecovery();

        /* ===============================================
           DUDUQ GOLDEN RUNTIME POLICY 003

           Politica central aplicada dentro de qualquer iframe
           de mecanica do Golden Master:
           - feedback possui linha propria e nunca e cortado;
           - fullscreen recalcula o runtime;
           - resize e fullscreen reenviam resize para React;
           - uma unica regra global para todas as mecanicas.
           =============================================== */

        function installGoldenRuntimePolicy003() {
          const observedFrames =
            new WeakSet();

          const runtimeCss = `
html,
body,
#root {
  width: 100% !important;
  height: 100% !important;
  min-height: 100dvh !important;
}

body {
  overflow: hidden !important;
}

.duduq-engine-root {
  box-sizing: border-box !important;
  width: 100% !important;
  height: 100dvh !important;
  min-height: 100dvh !important;
  overflow: hidden !important;
}

.duduq-engine-shell {
  box-sizing: border-box !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
  display: grid !important;
  grid-template-rows:
    auto
    minmax(0, 1fr)
    auto !important;
  align-content: stretch !important;
  row-gap: clamp(8px, 1.25dvh, 14px) !important;
  overflow: hidden !important;
}

.duduq-engine-stage {
  min-height: 0 !important;
  max-height: none !important;
  overflow: hidden !important;
}

.duduq-engine-feedback {
  box-sizing: border-box !important;
  position: relative !important;
  z-index: 60 !important;
  width: min(920px, calc(100% - 24px)) !important;
  height: auto !important;
  min-height: clamp(88px, 10.5dvh, 116px) !important;
  max-height: none !important;
  margin: 0 auto !important;
  padding:
    4px
    0
    max(8px, env(safe-area-inset-bottom)) !important;
  overflow: visible !important;
}

.duduq-engine-feedback-card,
.duduq-engine-feedback[data-state="success"]
  .duduq-engine-feedback-card,
.duduq-engine-feedback[data-state="retry"]
  .duduq-engine-feedback-card {
  box-sizing: border-box !important;
  width: 100% !important;
  height: auto !important;
  min-height: 78px !important;
  max-height: none !important;
  overflow: visible !important;
}

@media (min-height: 820px) and (min-width: 900px) {
  .duduq-engine-shell {
    row-gap: clamp(12px, 1.5dvh, 18px) !important;
  }

  .duduq-engine-feedback {
    min-height: 108px !important;
  }

  .duduq-engine-feedback-card,
  .duduq-engine-feedback[data-state="success"]
    .duduq-engine-feedback-card,
  .duduq-engine-feedback[data-state="retry"]
    .duduq-engine-feedback-card {
    min-height: 88px !important;
  }
}

@media (max-height: 700px) and (min-width: 721px) {
  .duduq-engine-shell {
    row-gap: 8px !important;
  }

  .duduq-engine-feedback {
    min-height: 82px !important;
    padding-bottom: 6px !important;
  }

  .duduq-engine-feedback-card,
  .duduq-engine-feedback[data-state="success"]
    .duduq-engine-feedback-card,
  .duduq-engine-feedback[data-state="retry"]
    .duduq-engine-feedback-card {
    min-height: 70px !important;
  }
}
`;

          function apply(frame) {
            if (
              !frame ||
              frame.tagName !== "IFRAME"
            ) {
              return;
            }

            try {
              const doc =
                frame.contentDocument;

              if (!doc?.head) {
                return;
              }

              let style =
                doc.getElementById(
                  "duduq-golden-runtime-policy-003"
                );

              if (!style) {
                style =
                  doc.createElement("style");

                style.id =
                  "duduq-golden-runtime-policy-003";

                style.textContent =
                  runtimeCss;

                doc.head.appendChild(style);
              }

              doc.documentElement
                .setAttribute(
                  "data-duduq-golden-runtime",
                  "003"
                );

              try {
                frame.contentWindow
                  ?.dispatchEvent(
                    new Event("resize")
                  );
              } catch (_) {}
            } catch (_) {
              /*
               * A mecanica oficial e same-origin.
               * Se algum iframe externo aparecer, ignoramos.
               */
            }
          }

          function watchFrame(frame) {
            if (
              !frame ||
              observedFrames.has(frame)
            ) {
              return;
            }

            observedFrames.add(frame);

            frame.addEventListener(
              "load",
              function () {
                window.requestAnimationFrame(
                  function () {
                    apply(frame);
                  }
                );
              }
            );

            apply(frame);
          }

          function refreshAll() {
            root
              ?.querySelectorAll("iframe")
              ?.forEach(watchFrame);

            root
              ?.querySelectorAll("iframe")
              ?.forEach(apply);
          }

          const observer =
            new MutationObserver(
              function (records) {
                records.forEach(
                  function (record) {
                    record.addedNodes
                      ?.forEach(
                        function (node) {
                          if (
                            node?.nodeType !== 1
                          ) {
                            return;
                          }

                          if (
                            node.tagName === "IFRAME"
                          ) {
                            watchFrame(node);
                          }

                          node
                            .querySelectorAll
                            ?.("iframe")
                            ?.forEach(watchFrame);
                        }
                      );
                  }
                );
              }
            );

          observer.observe(
            root,
            {
              childList: true,
              subtree: true
            }
          );

          window.addEventListener(
            "resize",
            function () {
              window.requestAnimationFrame(
                refreshAll
              );
            },
            { passive: true }
          );

          document.addEventListener(
            "fullscreenchange",
            function () {
              window.setTimeout(
                refreshAll,
                40
              );
            }
          );

          refreshAll();
        }


        /* ===============================================
           INTRO SOUND RECOVERY 003

           Autoplay audivel pode ser bloqueado pelo navegador.
           Quando isso ocorrer, guardamos a fase e usamos o
           primeiro gesto real do usuario para recuperar o som
           SEM reproduzir efeitos fora de contexto.
           =============================================== */

        function installIntroSoundRecovery003() {
          const sound =
            window.DuduQSound;

          if (!sound) return;

          let phase =
            "branding";

          let blocked =
            false;

          document.addEventListener(
            "duduq:intro-phase",
            function (event) {
              phase =
                event?.detail?.phase ||
                phase;
            }
          );

          window.addEventListener(
            "duduq:sound-blocked",
            function (event) {
              const name =
                event?.detail?.name ||
                "";

              if (
                name ===
                  "intro-company-swoosh" ||
                name ===
                  "intro-mission-music"
              ) {
                blocked = true;
              }
            }
          );

          function recover() {
            if (!blocked) return;

            const instance =
              window.DuduQIntro
                ?.getInstance
                ?.();

            if (
              !instance ||
              !instance.element
            ) {
              return;
            }

            blocked = false;

            if (
              phase === "mission" ||
              phase === "ready"
            ) {
              sound.playLoop(
                "intro-mission-music",
                {
                  volume: 0.24,
                  fadeInMs: 260,
                  minGapMs: 0
                }
              );
            } else {
              sound.play(
                "intro-company-swoosh",
                {
                  volume: 0.58,
                  minGapMs: 0
                }
              );
            }
          }

          document.addEventListener(
            "pointerdown",
            recover,
            true
          );

          document.addEventListener(
            "keydown",
            recover,
            true
          );
        }

        installGoldenRuntimePolicy003();
        installIntroSoundRecovery003();


        /* ===============================================
           INTRO — INÍCIO DIRETO

           A experiência visual começa imediatamente.
           O Core Sound continua tentando reproduzir o áudio
           de branding automaticamente, sem inserir tela, botão
           ou etapa intermediária antes da Intro.
           =============================================== */

        /* ===============================================
           INTRO CINEMATOGRÁFICA
           =============================================== */

        root.innerHTML = "";

        const intro =
          moduleDefinition.intro ||
          {};

        function launchCinematicIntro() {
          window.DuduQIntro.show({
          companyKicker:
            intro.companyKicker ||
            "UMA CRIAÇÃO DE",

          companyWidth:
            intro.companyWidth ||
            820,

          collectionLogo:
            intro.collectionLogo ||
            "",

          collectionName:
            intro.collectionName ||
            "EduQ Play",

          collectionAlt:
            intro.collectionAlt ||
            "EduQ Play",

          collectionWidth:
            intro.collectionWidth ||
            760,

          year:
            moduleDefinition.year,

          subject:
            moduleDefinition
              .subject,

          module:
            moduleDefinition
              .module,

          loadingLabel:
            intro.loadingLabel ||
            "PREPARANDO SUA MISSÃO",

          readyLabel:
            intro.readyLabel ||
            "MISSÃO PRONTA",

          startLabel:
            intro.startLabel ||
            "INICIAR MISSÃO",

          hint:
            intro.hint ||
            "Tudo pronto para começar!",

          minDurationMs:
            intro.minDurationMs ??
            2200,

          brandingDurationMs:
            intro.brandingDurationMs ??
            3000,

          switchingDurationMs:
            intro.switchingDurationMs ??
            760,

          missionMinDurationMs:
            intro.missionMinDurationMs ??
            1200,

          /*
           * A Intro só libera MISSÃO PRONTA depois que o
           * primeiro cenário foi preparado (ou caiu no
           * timeout seguro com fallback claro).
           */
          readyPromise:
            firstWorldReady,

          sparkCount:
            intro.sparkCount ??
            14,

          onStart:
            startModuleWithIntroHandoff
          });
        }

        launchCinematicIntro();
      }
    );
  

})();

/* DUDUQ GOLDEN RUNTIME POLICY 007 — VIEWPORT FIT */
(function () {
  "use strict";

  if (window.__DUDUQ_GOLDEN_POLICY_007__) return;
  window.__DUDUQ_GOLDEN_POLICY_007__ = true;

  const STYLE_ID = "duduq-golden-runtime-policy-007";
  const OLD_IDS = [
    "duduq-golden-runtime-policy-003",
    "duduq-golden-runtime-policy-004",
    "duduq-golden-runtime-policy-006"
  ];

  const CSS = `
html,
body,
#root {
  box-sizing: border-box !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
  margin: 0 !important;
}

body {
  overflow: hidden !important;
}

.duduq-engine-root {
  box-sizing: border-box !important;
  width: 100% !important;
  height: 100dvh !important;
  min-height: 0 !important;
  max-height: 100dvh !important;
  padding:
    7px
    8px
    max(7px, env(safe-area-inset-bottom)) !important;
  overflow: hidden !important;
}

.duduq-engine-shell {
  box-sizing: border-box !important;
  width: min(1320px, 100%) !important;
  height: 100% !important;
  min-height: 0 !important;
  max-height: 100% !important;
  margin: 0 auto !important;
  display: grid !important;
  grid-template-rows:
    auto
    minmax(0, 1fr)
    auto !important;
  align-content: stretch !important;
  align-items: stretch !important;
  row-gap: 6px !important;
  overflow: hidden !important;
}

.duduq-engine-header {
  box-sizing: border-box !important;
  margin: 0 !important;
  flex-shrink: 0 !important;
}

.duduq-engine-stage {
  box-sizing: border-box !important;
  width: 100% !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: 100% !important;
  margin: 0 !important;
  align-self: stretch !important;
  overflow: hidden !important;
}

/* O feedback ocioso não consome layout. */
.duduq-engine-feedback[data-state="idle"],
.duduq-engine-feedback:empty {
  box-sizing: border-box !important;
  position: static !important;
  width: 0 !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  margin: 0 auto !important;
  padding: 0 !important;
  border: 0 !important;
  overflow: hidden !important;
}

/* Feedback ativo ocupa a terceira linha e sempre cabe no iframe. */
.duduq-engine-feedback:not([data-state="idle"]):not(:empty) {
  box-sizing: border-box !important;
  position: static !important;
  inset: auto !important;
  z-index: 90 !important;
  width: min(900px, calc(100% - 28px)) !important;
  height: 74px !important;
  min-height: 74px !important;
  max-height: 74px !important;
  margin: 0 auto !important;
  padding:
    3px
    0
    max(4px, env(safe-area-inset-bottom)) !important;
  transform: none !important;
  overflow: hidden !important;
}

.duduq-engine-feedback:not([data-state="idle"]):not(:empty)
  .duduq-engine-feedback-card {
  box-sizing: border-box !important;
  width: 100% !important;
  height: 66px !important;
  min-height: 66px !important;
  max-height: 66px !important;
  margin: 0 !important;
  overflow: hidden !important;
}

/* Quando o feedback entra, a stage encolhe de verdade. */
.duduq-engine-shell:has(
  .duduq-engine-feedback:not([data-state="idle"]):not(:empty)
) {
  grid-template-rows:
    auto
    minmax(0, 1fr)
    74px !important;
}

.duduq-engine-shell:has(
  .duduq-engine-feedback:not([data-state="idle"]):not(:empty)
) .duduq-engine-stage {
  height: auto !important;
  min-height: 0 !important;
  max-height: 100% !important;
  overflow: hidden !important;
}

html[data-duduq-fullscreen="true"] .duduq-engine-root {
  padding:
    6px
    8px
    max(8px, env(safe-area-inset-bottom)) !important;
}

html[data-duduq-fullscreen="true"]
  .duduq-engine-feedback:not([data-state="idle"]):not(:empty) {
  width: min(940px, calc(100% - 32px)) !important;
}

@media (min-width: 900px) and (max-height: 700px) {
  .duduq-engine-root {
    padding-top: 5px !important;
  }

  .duduq-engine-shell {
    row-gap: 5px !important;
  }

  .duduq-engine-feedback:not([data-state="idle"]):not(:empty) {
    height: 68px !important;
    min-height: 68px !important;
    max-height: 68px !important;
  }

  .duduq-engine-feedback:not([data-state="idle"]):not(:empty)
    .duduq-engine-feedback-card {
    height: 61px !important;
    min-height: 61px !important;
    max-height: 61px !important;
  }

  .duduq-engine-shell:has(
    .duduq-engine-feedback:not([data-state="idle"]):not(:empty)
  ) {
    grid-template-rows:
      auto
      minmax(0, 1fr)
      68px !important;
  }
}
`;

  const seen = new WeakSet();

  function fullscreenActive() {
    return Boolean(document.fullscreenElement);
  }

  function sync(frame) {
    if (!frame || frame.tagName !== "IFRAME") return;

    try {
      const doc = frame.contentDocument;
      if (!doc?.head || !doc.documentElement) return;

      OLD_IDS.forEach(function (id) {
        doc.getElementById(id)?.remove?.();
      });

      let style = doc.getElementById(STYLE_ID);
      if (!style) {
        style = doc.createElement("style");
        style.id = STYLE_ID;
        doc.head.appendChild(style);
      }

      if (style.textContent !== CSS) {
        style.textContent = CSS;
      }

      doc.documentElement.setAttribute(
        "data-duduq-fullscreen",
        fullscreenActive() ? "true" : "false"
      );

      try {
        frame.contentWindow?.dispatchEvent(new Event("resize"));
      } catch (_) {}
    } catch (_) {}
  }

  function watch(frame) {
    if (!frame || seen.has(frame)) return;
    seen.add(frame);

    frame.addEventListener("load", function () {
      requestAnimationFrame(function () {
        sync(frame);
      });
    });

    sync(frame);
  }

  function refresh() {
    const root = document.getElementById("root");
    if (!root) return;

    root.querySelectorAll("iframe").forEach(watch);
    root.querySelectorAll("iframe").forEach(sync);
  }

  const observer = new MutationObserver(function (records) {
    records.forEach(function (record) {
      record.addedNodes.forEach(function (node) {
        if (!(node instanceof Element)) return;
        if (node.tagName === "IFRAME") watch(node);
        node.querySelectorAll?.("iframe").forEach(watch);
      });
    });
  });

  function install() {
    const root = document.getElementById("root");
    if (!root) return;

    observer.observe(root, {
      childList: true,
      subtree: true
    });

    refresh();
  }

  document.addEventListener("fullscreenchange", function () {
    requestAnimationFrame(function () {
      requestAnimationFrame(refresh);
    });
  });

  window.addEventListener(
    "resize",
    function () {
      requestAnimationFrame(refresh);
    },
    { passive: true }
  );

  window.addEventListener("duduq:engine-ready", install);

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      install,
      { once: true }
    );
  } else {
    install();
  }
})();
