/* =========================================================
   DUDUQ CORE — HOST
   Orquestrador central das mecânicas e módulos DuduQ.
   Versão 1.0.0
   ========================================================= */

(function () {
  "use strict";

  if (
    window.DuduQ &&
    window.DuduQ.version === "1.0.0"
  ) {
    return;
  }

  const VERSION = "1.0.0";

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

  function resolveContainer(value) {
    if (value instanceof Element) {
      return value;
    }

    if (typeof value === "string") {
      const element =
        document.querySelector(value);

      if (element) {
        return element;
      }
    }

    const root =
      document.getElementById("root");

    if (root) {
      return root;
    }

    throw new Error(
      "[DuduQ Host] Container da atividade não encontrado."
    );
  }

  function normalizeMechanicId(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/_/g, "-")
      .replace(/\s+/g, "-");
  }

  function clearContainer(container) {
    while (container.firstChild) {
      container.removeChild(
        container.firstChild
      );
    }
  }

  /* =======================================================
     REGISTRO DE MECÂNICAS
     ======================================================= */

  function registerMechanic(definition) {
    if (!isObject(definition)) {
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

    const mechanic = Object.freeze({
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
        isObject(definition.metadata)
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

  function unregisterMechanic(id) {
    return mechanics.delete(
      normalizeMechanicId(id)
    );
  }

  function getMechanic(id) {
    return (
      mechanics.get(
        normalizeMechanicId(id)
      ) || null
    );
  }

  function hasMechanic(id) {
    return mechanics.has(
      normalizeMechanicId(id)
    );
  }

  function listMechanics() {
    return Array.from(
      mechanics.values()
    ).map((mechanic) => ({
      id:
        mechanic.id,

      version:
        mechanic.version,

      metadata:
        mechanic.metadata
    }));
  }

  /* =======================================================
     CONFIGURAÇÃO DO MÓDULO
     ======================================================= */

  function normalizeStep(
    step,
    index
  ) {
    if (!isObject(step)) {
      throw new Error(
        `[DuduQ Host] Etapa ${index + 1} inválida.`
      );
    }

    const mechanicId =
      normalizeMechanicId(
        step.mechanic ||
        step.mechanicId ||
        step.renderer
      );

    if (!mechanicId) {
      throw new Error(
        `[DuduQ Host] Etapa ${index + 1} não informa a mecânica.`
      );
    }

    return {
      id:
        String(
          step.id ||
          `step-${index + 1}`
        ),

      mechanicId,

      payload:
        step.payload ??
        step.questions ??
        step.content ??
        {},

      options:
        isObject(step.options)
          ? step.options
          : {},

      metadata:
        isObject(step.metadata)
          ? step.metadata
          : {}
    };
  }

  function normalizeModule(config) {
    if (!isObject(config)) {
      throw new Error(
        "[DuduQ Host] Configuração do módulo inválida."
      );
    }

    const steps =
      Array.isArray(config.steps)
        ? config.steps.map(
            normalizeStep
          )
        : [];

    if (
      steps.length === 0 &&
      (
        config.mechanic ||
        config.mechanicId
      )
    ) {
      steps.push(
        normalizeStep(
          {
            id:
              config.id ||
              "step-1",

            mechanic:
              config.mechanic ||
              config.mechanicId,

            payload:
              config.payload ||
              config.questions ||
              config.content ||
              {},

            options:
              config.options ||
              {}
          },
          0
        )
      );
    }

    if (steps.length === 0) {
      throw new Error(
        "[DuduQ Host] O módulo não possui etapas."
      );
    }

    return {
      id:
        String(
          config.id ||
          "duduq-module"
        ),

      year:
        config.year ??
        config.ano ??
        null,

      subject:
        config.subject ||
        config.discipline ||
        config.disciplina ||
        null,

      module:
        config.module ||
        config.modulo ||
        null,

      container:
        config.container ||
        "#root",

      steps,

      metadata:
        isObject(config.metadata)
          ? config.metadata
          : {}
    };
  }

  /* =======================================================
     SESSÃO
     ======================================================= */

  function destroyActiveMechanic(
    session
  ) {
    if (
      !session ||
      !session.cleanup
    ) {
      return;
    }

    try {
      session.cleanup();
    } catch (error) {
      console.warn(
        "[DuduQ Host] Erro ao desmontar mecânica:",
        error
      );
    }

    session.cleanup = null;
  }

  function renderCurrentStep(
    session
  ) {
    const step =
      session.module.steps[
        session.currentStepIndex
      ];

    if (!step) {
      finishModule(session);
      return;
    }

    const mechanic =
      getMechanic(
        step.mechanicId
      );

    if (!mechanic) {
      throw new Error(
        `[DuduQ Host] A mecânica "${step.mechanicId}" não está registrada.`
      );
    }

    if (
      mechanic.validate
    ) {
      const result =
        mechanic.validate(
          step.payload,
          step
        );

      if (result === false) {
        throw new Error(
          `[DuduQ Host] Conteúdo incompatível com a mecânica "${step.mechanicId}".`
        );
      }
    }

    destroyActiveMechanic(
      session
    );

    clearContainer(
      session.container
    );

    const context = {
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
        session.currentStepIndex,

      totalSteps:
        session.module.steps.length,

      assets:
        window.DuduQAssets ||
        null,

      sound:
        window.DuduQSound ||
        null
    };

    const result =
      mechanic.mount({
        container:
          session.container,

        payload:
          step.payload,

        options:
          step.options,

        metadata:
          step.metadata,

        context,

        onComplete:
          function (result) {
            nextStep(
              result
            );
          }
      });

    if (
      typeof result ===
      "function"
    ) {
      session.cleanup =
        result;
    } else if (
      result &&
      typeof result.destroy ===
      "function"
    ) {
      session.cleanup =
        function () {
          result.destroy();
        };
    } else {
      session.cleanup =
        null;
    }

    window.dispatchEvent(
      new CustomEvent(
        "duduq:step-start",
        {
          detail: {
            moduleId:
              session.module.id,

            stepId:
              step.id,

            mechanic:
              mechanic.id,

            stepIndex:
              session.currentStepIndex,

            totalSteps:
              session.module.steps.length
          }
        }
      )
    );
  }

  function nextStep(result) {
    if (!activeSession) {
      return;
    }

    const completedStep =
      activeSession.module.steps[
        activeSession.currentStepIndex
      ];

    window.dispatchEvent(
      new CustomEvent(
        "duduq:step-complete",
        {
          detail: {
            moduleId:
              activeSession.module.id,

            stepId:
              completedStep?.id ||
              null,

            result:
              result ?? null
          }
        }
      )
    );

    activeSession.currentStepIndex +=
      1;

    if (
      activeSession.currentStepIndex >=
      activeSession.module.steps.length
    ) {
      finishModule(
        activeSession
      );

      return;
    }

    renderCurrentStep(
      activeSession
    );
  }

  function finishModule(session) {
    destroyActiveMechanic(
      session
    );

    window.dispatchEvent(
      new CustomEvent(
        "duduq:module-complete",
        {
          detail: {
            moduleId:
              session.module.id,

            year:
              session.module.year,

            subject:
              session.module.subject,

            module:
              session.module.module
          }
        }
      )
    );

    if (
      window.DuduQSound
    ) {
      window.DuduQSound.play(
        "win"
      );
    }

    session.completed =
      true;
  }

  /* =======================================================
     INICIALIZAÇÃO
     ======================================================= */

  function start(config) {
    const module =
      normalizeModule(
        config
      );

    const container =
      resolveContainer(
        module.container
      );

    if (
      activeSession
    ) {
      destroyActiveMechanic(
        activeSession
      );
    }

    if (
      module.year &&
      window.DuduQAssets
    ) {
      window.DuduQAssets.setYear(
        module.year
      );
    }

    activeSession = {
      module,
      container,
      currentStepIndex: 0,
      cleanup: null,
      completed: false
    };

    renderCurrentStep(
      activeSession
    );

    window.dispatchEvent(
      new CustomEvent(
        "duduq:module-start",
        {
          detail: {
            moduleId:
              module.id,

            year:
              module.year,

            subject:
              module.subject,

            module:
              module.module,

            totalSteps:
              module.steps.length
          }
        }
      )
    );

    return activeSession;
  }

  function restart() {
    if (!activeSession) {
      return false;
    }

    destroyActiveMechanic(
      activeSession
    );

    activeSession.currentStepIndex =
      0;

    activeSession.completed =
      false;

    renderCurrentStep(
      activeSession
    );

    return true;
  }

  function destroy() {
    if (!activeSession) {
      return;
    }

    destroyActiveMechanic(
      activeSession
    );

    clearContainer(
      activeSession.container
    );

    activeSession = null;
  }

  function getSession() {
    return activeSession;
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

      next:
        nextStep,

      restart,

      destroy,

      getSession
    });

  window.dispatchEvent(
    new CustomEvent(
      "duduq:ready",
      {
        detail: {
          version:
            VERSION
        }
      }
    )
  );
})();
