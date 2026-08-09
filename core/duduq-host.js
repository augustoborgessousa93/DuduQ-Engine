/* =========================================================
   DUDUQ CORE — HOST
   Orquestrador central das mecânicas e módulos DuduQ.
   Versão 1.3.0
   ========================================================= */

(function () {
  "use strict";

  if (window.DuduQ?.version === "1.3.0") {
    return;
  }

  const VERSION = "1.3.0";
  const mechanics = new Map();

  let activeSession = null;

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

  function asString(value, fallback = "") {
    if (
      value === null ||
      value === undefined
    ) {
      return fallback;
    }

    const text =
      String(value).trim();

    return (
      text ||
      fallback
    );
  }

  function clamp(
    value,
    minimum,
    maximum
  ) {
    return Math.min(
      maximum,
      Math.max(
        minimum,
        value
      )
    );
  }

  function resolveContainer(value) {
    if (
      value instanceof Element
    ) {
      return value;
    }

    if (
      typeof value === "string"
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
      "[DuduQ Host] Container da atividade não encontrado."
    );
  }

  function clearContainer(container) {
    while (
      container.firstChild
    ) {
      container.removeChild(
        container.firstChild
      );
    }
  }

  function createElement(
    tag,
    styles = {}
  ) {
    const element =
      document.createElement(
        tag
      );

    Object.assign(
      element.style,
      styles
    );

    return element;
  }

  function normalizeMechanicId(value) {
    return String(
      value || ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /_/g,
        "-"
      )
      .replace(
        /\s+/g,
        "-"
      );
  }

  function dispatch(
    name,
    detail
  ) {
    try {
      window.dispatchEvent(
        new CustomEvent(
          name,
          {
            detail
          }
        )
      );
    } catch (_) {}
  }

  function applyYearBackground(
    year
  ) {
    try {
      window.DuduQAssets
        ?.setYear
        ?.(year);
    } catch (_) {}
  }

  function hideCompletion() {
    try {
      window.DuduQCompletion
        ?.hide
        ?.();
    } catch (_) {}
  }

  function destroyMountedMechanic(
    session
  ) {
    if (
      !session ||
      typeof session.destroyCurrent !==
        "function"
    ) {
      return;
    }

    const destroy =
      session.destroyCurrent;

    session.destroyCurrent =
      null;

    try {
      destroy();
    } catch (error) {
      console.warn(
        "[DuduQ Host] Erro durante destroy() da mecânica:",
        error
      );
    }
  }

  /* =======================================================
     REGISTRO DE MECÂNICAS
     ======================================================= */

  function registerMechanic(
    definition
  ) {
    if (
      !isObject(
        definition
      )
    ) {
      throw new Error(
        "[DuduQ Host] A definição da mecânica precisa ser um objeto."
      );
    }

    const id =
      normalizeMechanicId(
        definition.id
      );

    if (!id) {
      throw new Error(
        "[DuduQ Host] A mecânica precisa possuir um id."
      );
    }

    if (
      typeof definition.mount !==
      "function"
    ) {
      throw new Error(
        `[DuduQ Host] A mecânica "${id}" precisa fornecer uma função mount().`
      );
    }

    const mechanic =
      Object.freeze({
        id,

        version:
          String(
            definition.version ||
            "1.0.0"
          ),

        mount:
          definition.mount,

        validate:
          typeof definition.validate ===
          "function"
            ? definition.validate
            : null,

        metadata:
          isObject(
            definition.metadata
          )
            ? Object.freeze({
                ...definition.metadata
              })
            : Object.freeze({})
      });

    mechanics.set(
      id,
      mechanic
    );

    return mechanic;
  }

  function unregisterMechanic(
    id
  ) {
    return mechanics.delete(
      normalizeMechanicId(
        id
      )
    );
  }

  function getMechanic(
    id
  ) {
    return (
      mechanics.get(
        normalizeMechanicId(
          id
        )
      ) ||
      null
    );
  }

  function hasMechanic(
    id
  ) {
    return mechanics.has(
      normalizeMechanicId(
        id
      )
    );
  }

  function listMechanics() {
    return Array.from(
      mechanics.values()
    ).map(
      (mechanic) => ({
        id:
          mechanic.id,

        version:
          mechanic.version,

        metadata:
          mechanic.metadata
      })
    );
  }

  /* =======================================================
     NORMALIZAÇÃO DO MÓDULO
     ======================================================= */

  function normalizeStep(
    step,
    index
  ) {
    if (
      !isObject(
        step
      )
    ) {
      throw new Error(
        `[DuduQ Host] A etapa ${index + 1} precisa ser um objeto.`
      );
    }

    const mechanic =
      normalizeMechanicId(
        step.mechanic ||
        step.mechanicId ||
        step.type
      );

    if (!mechanic) {
      throw new Error(
        `[DuduQ Host] A etapa ${index + 1} não possui uma mecânica.`
      );
    }

    return {
      ...step,

      id:
        asString(
          step.id,
          `step-${index + 1}`
        ),

      mechanic,

      payload:
        step.payload !==
        undefined
          ? step.payload
          : step.content !==
            undefined
            ? step.content
            : {},

      options:
        isObject(
          step.options
        )
          ? {
              ...step.options
            }
          : {}
    };
  }

  function normalizeModule(
    input
  ) {
    if (
      !isObject(
        input
      )
    ) {
      throw new Error(
        "[DuduQ Host] O módulo precisa ser um objeto."
      );
    }

    const steps =
      Array.isArray(
        input.steps
      )
        ? input.steps.map(
            normalizeStep
          )
        : [];

    if (
      steps.length ===
      0
    ) {
      throw new Error(
        "[DuduQ Host] O módulo precisa possuir pelo menos uma etapa."
      );
    }

    return {
      ...input,

      id:
        asString(
          input.id,
          `module-${Date.now()}`
        ),

      year:
        input.year ??
        input.grade ??
        null,

      subject:
        asString(
          input.subject,
          ""
        ),

      module:
        input.module ??
        input.unit ??
        null,

      title:
        asString(
          input.title,
          ""
        ),

      steps,

      container:
        input.container ??
        "#root"
    };
  }

  /* =======================================================
     PROGRESSO GLOBAL
     O HOST É A FONTE OFICIAL DO PROGRESSO.
     ======================================================= */

  function buildProgress(
    session,
    options = {}
  ) {
    if (!session) {
      return null;
    }

    const totalSteps =
      session.module
        .steps
        .length;

    const completed =
      options.completed ===
        true ||
      session.completed ===
        true;

    let currentStepIndex =
      Number.isFinite(
        options.currentStepIndex
      )
        ? options.currentStepIndex
        : session.stepIndex;

    if (
      totalSteps >
      0
    ) {
      currentStepIndex =
        clamp(
          currentStepIndex,
          0,
          totalSteps - 1
        );
    } else {
      currentStepIndex =
        0;
    }

    let completedSteps;

    if (completed) {
      completedSteps =
        totalSteps;
    } else if (
      Number.isFinite(
        options.completedSteps
      )
    ) {
      completedSteps =
        clamp(
          Math.round(
            options.completedSteps
          ),
          0,
          totalSteps
        );
    } else {
      completedSteps =
        clamp(
          currentStepIndex,
          0,
          totalSteps
        );
    }

    const fraction =
      totalSteps >
      0
        ? clamp(
            completedSteps /
              totalSteps,
            0,
            1
          )
        : 0;

    const percent =
      Math.round(
        fraction *
        100
      );

    const currentStep =
      totalSteps >
      0
        ? currentStepIndex +
          1
        : 0;

    const remainingSteps =
      Math.max(
        0,
        totalSteps -
          completedSteps
      );

    return Object.freeze({
      source:
        "duduq-host",

      scope:
        "module",

      moduleId:
        session.module.id,

      currentStepIndex,

      currentStep,

      totalSteps,

      completedSteps,

      remainingSteps,

      fraction,

      percent,

      completed,

      label:
        completed
          ? `${completedSteps} de ${totalSteps} etapas concluídas`
          : `Etapa ${currentStep} de ${totalSteps}`
    });
  }

  function getProgress() {
    if (
      !activeSession
    ) {
      return null;
    }

    return buildProgress(
      activeSession,
      {
        completed:
          activeSession.completed ===
          true
      }
    );
  }

  function buildStepContext(
    session,
    step
  ) {
    const progress =
      buildProgress(
        session
      );

    return {
      engineVersion:
        VERSION,

      moduleId:
        session.module.id,

      year:
        session.module.year,

      subject:
        session.module.subject,

      module:
        session.module.module,

      stepId:
        step.id,

      stepIndex:
        session.stepIndex,

      totalSteps:
        session.module
          .steps
          .length,

      /*
       * Nome oficial.
       */
      progress,

      /*
       * Alias temporário durante
       * a migração das mecânicas.
       */
      globalProgress:
        progress,

      assets:
        window.DuduQAssets ||
        window.DUDUQ_ASSETS ||
        null,

      sound:
        window.DuduQSound ||
        null
    };
  }

  /* =======================================================
     ERROS DE EXECUÇÃO
     ======================================================= */

  function renderRuntimeError(
    session,
    message,
    error = null
  ) {
    destroyMountedMechanic(
      session
    );

    hideCompletion();

    clearContainer(
      session.container
    );

    const box =
      createElement(
        "div",
        {
          width:
            "min(720px, 92vw)",

          margin:
            "48px auto",

          boxSizing:
            "border-box",

          padding:
            "28px",

          borderRadius:
            "24px",

          background:
            "rgba(255,255,255,0.96)",

          color:
            "#17375e",

          fontFamily:
            "system-ui, sans-serif",

          boxShadow:
            "0 18px 44px rgba(25,61,96,0.18)",

          textAlign:
            "center"
        }
      );

    const title =
      createElement(
        "h2",
        {
          margin:
            "0 0 10px",

          color:
            "#0567c9",

          fontSize:
            "28px"
        }
      );

    title.textContent =
      "Não foi possível abrir esta etapa";

    const text =
      createElement(
        "p",
        {
          margin:
            "0",

          fontSize:
            "17px",

          lineHeight:
            "1.45"
        }
      );

    text.textContent =
      message;

    box.appendChild(
      title
    );

    box.appendChild(
      text
    );

    session.container
      .appendChild(
        box
      );

    console.error(
      "[DuduQ Host]",
      message,
      error || ""
    );

    dispatch(
      "duduq:error",
      {
        engineVersion:
          VERSION,

        moduleId:
          session.module.id,

        stepIndex:
          session.stepIndex,

        message,

        error
      }
    );
  }

  /* =======================================================
     EXECUÇÃO DAS ETAPAS
     ======================================================= */

  function renderCurrentStep(
    session
  ) {
    if (
      !session ||
      session !==
        activeSession
    ) {
      return;
    }

    if (
      session.stepIndex >=
      session.module
        .steps
        .length
    ) {
      finishModule(
        session
      );

      return;
    }

    hideCompletion();

    destroyMountedMechanic(
      session
    );

    clearContainer(
      session.container
    );

    const step =
      session.module
        .steps[
          session.stepIndex
        ];

    const mechanic =
      getMechanic(
        step.mechanic
      );

    session.stepCompleted =
      false;

    if (
      !mechanic
    ) {
      renderRuntimeError(
        session,
        `A mecânica "${step.mechanic}" não está registrada.`
      );

      return;
    }

    if (
      mechanic.validate
    ) {
      let valid =
        false;

      try {
        valid =
          mechanic.validate(
            step.payload,
            step.options
          ) !==
          false;
      } catch (error) {
        renderRuntimeError(
          session,
          `A validação da mecânica "${step.mechanic}" apresentou um erro.`,
          error
        );

        return;
      }

      if (
        !valid
      ) {
        renderRuntimeError(
          session,
          `O conteúdo da etapa "${step.id}" não é compatível com a mecânica "${step.mechanic}".`
        );

        return;
      }
    }

    const context =
      buildStepContext(
        session,
        step
      );

    dispatch(
      "duduq:step-start",
      {
        engineVersion:
          VERSION,

        moduleId:
          session.module.id,

        stepId:
          step.id,

        stepIndex:
          session.stepIndex,

        mechanicId:
          mechanic.id,

        progress:
          context.progress
      }
    );

    try {
      const destroy =
        mechanic.mount({
          container:
            session.container,

          payload:
            step.payload,

          options:
            step.options,

          context,

          onComplete(
            result
          ) {
            completeCurrentStep(
              session,
              result
            );
          }
        });

      session.destroyCurrent =
        typeof destroy ===
        "function"
          ? destroy
          : null;
    } catch (error) {
      renderRuntimeError(
        session,
        `Não foi possível iniciar a mecânica "${step.mechanic}".`,
        error
      );
    }
  }

  function completeCurrentStep(
    session,
    result = null
  ) {
    if (
      !session ||
      session !==
        activeSession ||
      session.completed
    ) {
      return false;
    }

    if (
      session.stepCompleted
    ) {
      return false;
    }

    const step =
      session.module
        .steps[
          session.stepIndex
        ];

    if (
      !step
    ) {
      return false;
    }

    session.stepCompleted =
      true;

    session.results.push({
      stepId:
        step.id,

      mechanicId:
        step.mechanic,

      stepIndex:
        session.stepIndex,

      result:
        result ??
        null
    });

    const completedSteps =
      clamp(
        session.stepIndex +
          1,
        0,
        session.module
          .steps
          .length
      );

    const progressAfterStep =
      buildProgress(
        session,
        {
          completedSteps
        }
      );

    dispatch(
      "duduq:step-complete",
      {
        engineVersion:
          VERSION,

        moduleId:
          session.module.id,

        stepId:
          step.id,

        stepIndex:
          session.stepIndex,

        mechanicId:
          step.mechanic,

        result:
          result ??
          null,

        progress:
          progressAfterStep
      }
    );

    destroyMountedMechanic(
      session
    );

    session.stepIndex +=
      1;

    session.stepCompleted =
      false;

    if (
      session.stepIndex >=
      session.module
        .steps
        .length
    ) {
      finishModule(
        session
      );
    } else {
      renderCurrentStep(
        session
      );
    }

    return true;
  }

  function next(
    result = null
  ) {
    if (
      !activeSession
    ) {
      return false;
    }

    return completeCurrentStep(
      activeSession,
      result
    );
  }

  /* =======================================================
     CONCLUSÃO PREMIUM CENTRALIZADA
     ======================================================= */

  function buildCompletionMessage(
    module
  ) {
    const subject =
      asString(
        module.subject,
        "atividade"
      );

    if (
      module.module !==
        null &&
      module.module !==
        undefined &&
      String(
        module.module
      ).trim() !==
        ""
    ) {
      return (
        `Módulo ${module.module} de ${subject} concluído com sucesso.`
      );
    }

    if (
      module.title
    ) {
      return (
        `${module.title} concluído com sucesso.`
      );
    }

    return (
      `${subject} concluído com sucesso.`
    );
  }

  function playCompletionSound() {
    try {
      window.DuduQSound
        ?.play
        ?.(
          "win",
          {
            volume:
              0.64,

            minGapMs:
              1800
          }
        );
    } catch (_) {}
  }

  /* =======================================================
     FALLBACK
     Só aparece se o DuduQCompletion não carregar.
     ======================================================= */

  function renderCompletionFallback(
    session,
    progress
  ) {
    clearContainer(
      session.container
    );

    const wrap =
      createElement(
        "section",
        {
          width:
            "100%",

          minHeight:
            "100vh",

          boxSizing:
            "border-box",

          display:
            "grid",

          placeItems:
            "center",

          padding:
            "28px"
        }
      );

    const card =
      createElement(
        "div",
        {
          width:
            "min(680px, 92vw)",

          boxSizing:
            "border-box",

          padding:
            "40px 32px",

          borderRadius:
            "30px",

          background:
            "rgba(255,255,255,0.97)",

          border:
            "2px solid rgba(193,213,232,0.92)",

          boxShadow:
            "0 22px 52px rgba(26,67,105,0.20)",

          textAlign:
            "center",

          fontFamily:
            "system-ui, sans-serif",

          color:
            "#17375e"
        }
      );

    const mascotSrc =
      window
        .DUDUQ_ASSETS
        ?.mascots
        ?.complete;

    if (
      mascotSrc
    ) {
      const mascot =
        document.createElement(
          "img"
        );

      mascot.src =
        mascotSrc;

      mascot.alt =
        "DuduQ celebrando a conclusão.";

      Object.assign(
        mascot.style,
        {
          width:
            "160px",

          height:
            "160px",

          objectFit:
            "contain",

          display:
            "block",

          margin:
            "0 auto 8px"
        }
      );

      card.appendChild(
        mascot
      );
    }

    const title =
      createElement(
        "h1",
        {
          margin:
            "0 0 12px",

          color:
            "#0567c9",

          fontSize:
            "44px",

          lineHeight:
            "1.05"
        }
      );

    title.textContent =
      "Missão concluída!";

    const message =
      createElement(
        "p",
        {
          margin:
            "0 0 18px",

          color:
            "#52677e",

          fontSize:
            "19px",

          fontWeight:
            "700",

          lineHeight:
            "1.4"
        }
      );

    message.textContent =
      buildCompletionMessage(
        session.module
      );

    const badge =
      createElement(
        "div",
        {
          display:
            "inline-block",

          margin:
            "0 0 20px",

          padding:
            "11px 18px",

          borderRadius:
            "999px",

          background:
            "#eaf5ff",

          color:
            "#07539e",

          fontWeight:
            "800"
        }
      );

    badge.textContent =
      progress.label;

    const button =
      createElement(
        "button",
        {
          display:
            "block",

          minWidth:
            "230px",

          minHeight:
            "56px",

          margin:
            "0 auto",

          padding:
            "12px 26px",

          borderRadius:
            "18px",

          border:
            "2px solid #00458f",

          background:
            "#0870d2",

          color:
            "#ffffff",

          fontSize:
            "16px",

          fontWeight:
            "900",

          cursor:
            "pointer"
        }
      );

    button.type =
      "button";

    button.textContent =
      "JOGAR NOVAMENTE";

    button.addEventListener(
      "click",
      restart
    );

    card.appendChild(
      title
    );

    card.appendChild(
      message
    );

    card.appendChild(
      badge
    );

    card.appendChild(
      button
    );

    wrap.appendChild(
      card
    );

    session.container
      .appendChild(
        wrap
      );
  }

  /* =======================================================
     FINALIZAÇÃO DO MÓDULO
     ======================================================= */

  function finishModule(
    session
  ) {
    if (
      !session ||
      session !==
        activeSession ||
      session.completed
    ) {
      return;
    }

    destroyMountedMechanic(
      session
    );

    session.completed =
      true;

    session.stepCompleted =
      false;

    const progress =
      buildProgress(
        session,
        {
          completed:
            true
        }
      );

    clearContainer(
      session.container
    );

    const completionOptions = {
      container:
        session.container,

      title:
        "Missão concluída!",

      message:
        buildCompletionMessage(
          session.module
        ),

      progress,

      mascotSrc:
        window
          .DUDUQ_ASSETS
          ?.mascots
          ?.complete ||
        null,

      mascotAlt:
        "DuduQ celebrando a conclusão.",

      confetti:
        true,

      starCount:
        28,

      showAchievement:
        true,

      primaryAction: {
        label:
          "JOGAR NOVAMENTE",

        ariaLabel:
          "Jogar o módulo novamente",

        onClick:
          restart
      }
    };

    if (
      window.DuduQCompletion
        ?.show
    ) {
      try {
        window.DuduQCompletion
          .show(
            completionOptions
          );
      } catch (error) {
        console.error(
          "[DuduQ Host] Falha ao abrir DuduQCompletion. Usando fallback.",
          error
        );

        renderCompletionFallback(
          session,
          progress
        );
      }
    } else {
      renderCompletionFallback(
        session,
        progress
      );
    }

    playCompletionSound();

    dispatch(
      "duduq:module-complete",
      {
        engineVersion:
          VERSION,

        moduleId:
          session.module.id,

        year:
          session.module.year,

        subject:
          session.module.subject,

        module:
          session.module.module,

        results:
          session.results.slice(),

        progress
      }
    );
  }

  /* =======================================================
     INÍCIO
     ======================================================= */

  function start(
    input
  ) {
    destroy();

    const module =
      normalizeModule(
        input
      );

    const container =
      resolveContainer(
        module.container
      );

    applyYearBackground(
      module.year
    );

    hideCompletion();

    clearContainer(
      container
    );

    const session = {
      module,

      container,

      stepIndex:
        0,

      stepCompleted:
        false,

      completed:
        false,

      results:
        [],

      destroyCurrent:
        null,

      startedAt:
        Date.now()
    };

    activeSession =
      session;

    const progress =
      buildProgress(
        session
      );

    dispatch(
      "duduq:module-start",
      {
        engineVersion:
          VERSION,

        moduleId:
          module.id,

        year:
          module.year,

        subject:
          module.subject,

        module:
          module.module,

        totalSteps:
          module.steps.length,

        progress
      }
    );

    renderCurrentStep(
      session
    );

    return getSession();
  }

  /* =======================================================
     REINICIAR
     ======================================================= */

  function restart() {
    if (
      !activeSession
    ) {
      return false;
    }

    const session =
      activeSession;

    destroyMountedMechanic(
      session
    );

    hideCompletion();

    session.stepIndex =
      0;

    session.stepCompleted =
      false;

    session.completed =
      false;

    session.results =
      [];

    session.startedAt =
      Date.now();

    applyYearBackground(
      session.module.year
    );

    clearContainer(
      session.container
    );

    const progress =
      buildProgress(
        session
      );

    dispatch(
      "duduq:module-restart",
      {
        engineVersion:
          VERSION,

        moduleId:
          session.module.id,

        year:
          session.module.year,

        subject:
          session.module.subject,

        module:
          session.module.module,

        progress
      }
    );

    renderCurrentStep(
      session
    );

    return true;
  }

  /* =======================================================
     DESTRUIR
     ======================================================= */

  function destroy() {
    if (
      !activeSession
    ) {
      hideCompletion();

      return false;
    }

    const session =
      activeSession;

    destroyMountedMechanic(
      session
    );

    hideCompletion();

    activeSession =
      null;

    return true;
  }

  /* =======================================================
     SESSÃO PÚBLICA
     ======================================================= */

  function getSession() {
    if (
      !activeSession
    ) {
      return null;
    }

    return {
      engineVersion:
        VERSION,

      moduleId:
        activeSession
          .module
          .id,

      year:
        activeSession
          .module
          .year,

      subject:
        activeSession
          .module
          .subject,

      module:
        activeSession
          .module
          .module,

      stepIndex:
        activeSession
          .stepIndex,

      totalSteps:
        activeSession
          .module
          .steps
          .length,

      completed:
        activeSession
          .completed,

      results:
        activeSession
          .results
          .slice(),

      progress:
        getProgress()
    };
  }

  /* =======================================================
     API PÚBLICA
     ======================================================= */

  window.DuduQ =
    Object.freeze({
      version:
        VERSION,

      registerMechanic,

      unregisterMechanic,

      getMechanic,

      hasMechanic,

      listMechanics,

      start,

      next,

      restart,

      destroy,

      getSession,

      getProgress
    });

  dispatch(
    "duduq:host-ready",
    {
      version:
        VERSION
    }
  );

  console.info(
    "[DuduQ] Host carregado:",
    VERSION
  );
})();
