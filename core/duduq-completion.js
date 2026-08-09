/* =========================================================
   DUDUQ CORE — COMPLETION
   Componente central de conclusão de módulos e atividades.
   Versão 1.0.0
   ========================================================= */

(function () {
  "use strict";

  if (
    window.DuduQCompletion?.version ===
    "1.0.0"
  ) {
    return;
  }

  const VERSION =
    "1.0.0";

  let activeInstance =
    null;

  /* =======================================================
     UTILITÁRIOS
     ======================================================= */

  function isObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  function asString(
    value,
    fallback = ""
  ) {
    if (
      value === null ||
      value === undefined
    ) {
      return fallback;
    }

    const result =
      String(value).trim();

    return (
      result ||
      fallback
    );
  }

  function resolveContainer(
    value
  ) {
    if (
      value instanceof Element
    ) {
      return value;
    }

    if (
      typeof value ===
      "string"
    ) {
      const element =
        document.querySelector(
          value
        );

      if (element) {
        return element;
      }
    }

    const root =
      document.getElementById(
        "root"
      );

    if (root) {
      return root;
    }

    throw new Error(
      "[DuduQ Completion] Container não encontrado."
    );
  }

  function clearContainer(
    container
  ) {
    while (
      container.firstChild
    ) {
      container.removeChild(
        container.firstChild
      );
    }
  }

  function prefersReducedMotion() {
    try {
      return (
        window.matchMedia &&
        window
          .matchMedia(
            "(prefers-reduced-motion: reduce)"
          )
          .matches
      );
    } catch (_) {
      return false;
    }
  }

  function resolveMascot(
    options = {}
  ) {
    if (
      options.mascotSrc
    ) {
      return options.mascotSrc;
    }

    try {
      return (
        window.DuduQAssets
          ?.assets
          ?.mascots
          ?.complete ||
        window.DUDUQ_ASSETS
          ?.mascots
          ?.complete ||
        null
      );
    } catch (_) {
      return null;
    }
  }

  function resolveProgressLabel(
    progress
  ) {
    if (
      typeof progress ===
      "string"
    ) {
      return progress;
    }

    if (
      !isObject(progress)
    ) {
      return "";
    }

    if (
      progress.label
    ) {
      return asString(
        progress.label
      );
    }

    const total =
      Number(
        progress.totalSteps
      );

    const completed =
      Number(
        progress.completedSteps
      );

    if (
      Number.isFinite(total) &&
      total > 0 &&
      Number.isFinite(
        completed
      )
    ) {
      return (
        `${completed} de ${total} etapas concluídas`
      );
    }

    return "";
  }

  function safeAction(
    callback
  ) {
    if (
      typeof callback !==
      "function"
    ) {
      return;
    }

    try {
      callback();
    } catch (error) {
      console.error(
        "[DuduQ Completion] Erro ao executar ação:",
        error
      );
    }
  }

  /* =======================================================
     CONFETE DE ESTRELAS
     ======================================================= */

  function createStarConfetti(
    parent,
    options = {}
  ) {
    if (
      prefersReducedMotion() ||
      options.confetti ===
        false
    ) {
      return null;
    }

    const layer =
      document.createElement(
        "div"
      );

    layer.className =
      "duduq-completion-confetti";

    layer.setAttribute(
      "aria-hidden",
      "true"
    );

    const requestedCount =
      Number(
        options.starCount
      );

    const starCount =
      Number.isFinite(
        requestedCount
      )
        ? Math.max(
            8,
            Math.min(
              40,
              Math.round(
                requestedCount
              )
            )
          )
        : 26;

    for (
      let index = 0;
      index < starCount;
      index += 1
    ) {
      const star =
        document.createElement(
          "span"
        );

      star.className =
        "duduq-completion-star";

      star.textContent =
        "★";

      const x =
        Math.round(
          Math.random() *
            100
        );

      const drift =
        Math.round(
          Math.random() *
            120 -
            60
        );

      const rotation =
        Math.round(
          Math.random() *
            360
        );

      const delay =
        Math.round(
          Math.random() *
            500
        );

      const duration =
        Math.round(
          1450 +
          Math.random() *
            1000
        );

      const size =
        Math.round(
          12 +
          Math.random() *
            16
        );

      star.style.setProperty(
        "--duduq-star-x",
        `${x}%`
      );

      star.style.setProperty(
        "--duduq-star-drift",
        `${drift}px`
      );

      star.style.setProperty(
        "--duduq-star-rotation",
        `${rotation}deg`
      );

      star.style.setProperty(
        "--duduq-star-delay",
        `${delay}ms`
      );

      star.style.setProperty(
        "--duduq-star-duration",
        `${duration}ms`
      );

      star.style.setProperty(
        "--duduq-star-size",
        `${size}px`
      );

      star.dataset.variant =
        String(
          (index % 3) + 1
        );

      layer.appendChild(
        star
      );
    }

    parent.appendChild(
      layer
    );

    return layer;
  }

  /* =======================================================
     BOTÕES
     ======================================================= */

  function createActionButton(
    action,
    type
  ) {
    if (
      !isObject(action)
    ) {
      return null;
    }

    const label =
      asString(
        action.label
      );

    if (!label) {
      return null;
    }

    const button =
      document.createElement(
        "button"
      );

    button.type =
      "button";

    button.className =
      [
        "duduq-completion-button",
        `duduq-completion-button--${type}`
      ].join(" ");

    button.textContent =
      label;

    button.setAttribute(
      "aria-label",
      asString(
        action.ariaLabel,
        label
      )
    );

    button.addEventListener(
      "click",
      function () {
        safeAction(
          action.onClick
        );
      }
    );

    return button;
  }

  /* =======================================================
     CRIAÇÃO DA TELA
     ======================================================= */

  function show(
    options = {}
  ) {
    const container =
      resolveContainer(
        options.container
      );

    hide();

    clearContainer(
      container
    );

    const screen =
      document.createElement(
        "section"
      );

    screen.className =
      "duduq-completion";

    screen.setAttribute(
      "role",
      "dialog"
    );

    screen.setAttribute(
      "aria-modal",
      "true"
    );

    const titleId =
      "duduq-completion-title";

    const messageId =
      "duduq-completion-message";

    screen.setAttribute(
      "aria-labelledby",
      titleId
    );

    screen.setAttribute(
      "aria-describedby",
      messageId
    );

    /* -----------------------------------------------------
       CONFETE
       ----------------------------------------------------- */

    const confetti =
      createStarConfetti(
        screen,
        options
      );

    /* -----------------------------------------------------
       CARD
       ----------------------------------------------------- */

    const card =
      document.createElement(
        "div"
      );

    card.className =
      "duduq-completion-card";

    /* -----------------------------------------------------
       HALO / BRILHO DO MASCOTE
       ----------------------------------------------------- */

    const hero =
      document.createElement(
        "div"
      );

    hero.className =
      "duduq-completion-hero";

    const mascotSrc =
      resolveMascot(
        options
      );

    if (
      mascotSrc
    ) {
      const mascot =
        document.createElement(
          "img"
        );

      mascot.className =
        "duduq-completion-mascot";

      mascot.src =
        mascotSrc;

      mascot.alt =
        asString(
          options.mascotAlt,
          "DuduQ celebrando a conclusão."
        );

      mascot.decoding =
        "async";

      hero.appendChild(
        mascot
      );
    }

    card.appendChild(
      hero
    );

    /* -----------------------------------------------------
       PEQUENO SELO DE CONQUISTA
       ----------------------------------------------------- */

    if (
      options.showAchievement !==
      false
    ) {
      const achievement =
        document.createElement(
          "div"
        );

      achievement.className =
        "duduq-completion-achievement";

      achievement.setAttribute(
        "aria-hidden",
        "true"
      );

      const achievementStar =
        document.createElement(
          "span"
        );

      achievementStar.className =
        "duduq-completion-achievement-star";

      achievementStar.textContent =
        "★";

      achievement.appendChild(
        achievementStar
      );

      card.appendChild(
        achievement
      );
    }

    /* -----------------------------------------------------
       TÍTULO
       ----------------------------------------------------- */

    const title =
      document.createElement(
        "h1"
      );

    title.id =
      titleId;

    title.className =
      "duduq-completion-title";

    title.textContent =
      asString(
        options.title,
        "Missão concluída!"
      );

    card.appendChild(
      title
    );

    /* -----------------------------------------------------
       MENSAGEM
       ----------------------------------------------------- */

    const message =
      document.createElement(
        "p"
      );

    message.id =
      messageId;

    message.className =
      "duduq-completion-message";

    message.textContent =
      asString(
        options.message,
        "Atividade concluída com sucesso."
      );

    card.appendChild(
      message
    );

    /* -----------------------------------------------------
       PROGRESSO
       ----------------------------------------------------- */

    const progressLabel =
      resolveProgressLabel(
        options.progress
      );

    if (
      progressLabel
    ) {
      const progress =
        document.createElement(
          "div"
        );

      progress.className =
        "duduq-completion-progress";

      const progressIcon =
        document.createElement(
          "span"
        );

      progressIcon.className =
        "duduq-completion-progress-icon";

      progressIcon.textContent =
        "✓";

      progressIcon.setAttribute(
        "aria-hidden",
        "true"
      );

      const progressText =
        document.createElement(
          "span"
        );

      progressText.className =
        "duduq-completion-progress-text";

      progressText.textContent =
        progressLabel;

      progress.appendChild(
        progressIcon
      );

      progress.appendChild(
        progressText
      );

      card.appendChild(
        progress
      );
    }

    /* -----------------------------------------------------
       AÇÕES
       ----------------------------------------------------- */

    const actions =
      document.createElement(
        "div"
      );

    actions.className =
      "duduq-completion-actions";

    const primaryAction =
      createActionButton(
        options.primaryAction ||
        {
          label:
            "JOGAR NOVAMENTE"
        },
        "primary"
      );

    if (
      primaryAction
    ) {
      actions.appendChild(
        primaryAction
      );
    }

    const secondaryAction =
      createActionButton(
        options.secondaryAction,
        "secondary"
      );

    if (
      secondaryAction
    ) {
      actions.appendChild(
        secondaryAction
      );
    }

    if (
      actions.children.length >
      0
    ) {
      card.appendChild(
        actions
      );
    }

    /* -----------------------------------------------------
       ASSINATURA VISUAL OPCIONAL
       ----------------------------------------------------- */

    if (
      options.footerText
    ) {
      const footer =
        document.createElement(
          "p"
        );

      footer.className =
        "duduq-completion-footer";

      footer.textContent =
        asString(
          options.footerText
        );

      card.appendChild(
        footer
      );
    }

    screen.appendChild(
      card
    );

    container.appendChild(
      screen
    );

    /* -----------------------------------------------------
       FOCO
       ----------------------------------------------------- */

    if (
      primaryAction
    ) {
      window.setTimeout(
        function () {
          try {
            primaryAction.focus({
              preventScroll:
                true
            });
          } catch (_) {}
        },
        prefersReducedMotion()
          ? 0
          : 650
      );
    }

    const instance = {
      container,
      screen,
      card,
      confetti,

      destroy:
        function () {
          if (
            screen.parentNode
          ) {
            screen.parentNode.removeChild(
              screen
            );
          }

          if (
            activeInstance ===
            instance
          ) {
            activeInstance =
              null;
          }
        }
    };

    activeInstance =
      instance;

    window.dispatchEvent(
      new CustomEvent(
        "duduq:completion-show",
        {
          detail: {
            version:
              VERSION,

            title:
              title.textContent,

            progress:
              options.progress ||
              null
          }
        }
      )
    );

    return instance;
  }

  /* =======================================================
     OCULTAR / DESTRUIR
     ======================================================= */

  function hide() {
    if (
      !activeInstance
    ) {
      return false;
    }

    const instance =
      activeInstance;

    activeInstance =
      null;

    try {
      instance.destroy();
    } catch (_) {}

    return true;
  }

  function getInstance() {
    return activeInstance;
  }

  /* =======================================================
     API PÚBLICA
     ======================================================= */

  window.DuduQCompletion =
    Object.freeze({
      version:
        VERSION,

      show,

      hide,

      destroy:
        hide,

      getInstance
    });

  window.dispatchEvent(
    new CustomEvent(
      "duduq:completion-ready",
      {
        detail: {
          version:
            VERSION
        }
      }
    )
  );

  console.info(
    "[DuduQ] Completion carregado:",
    VERSION
  );
})();
