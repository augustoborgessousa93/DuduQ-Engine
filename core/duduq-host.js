/* =========================================================
   DUDUQ CORE — HOST
   Orquestrador central das mecânicas e módulos DuduQ.
   Versão 1.3.0
   ========================================================= */

(function () {
  "use strict";

  if (
    window.DuduQ?.version ===
    "1.3.0"
  ) {
    return;
  }

  const VERSION =
    "1.3.0";

  const mechanics =
    new Map();

  let activeSession =
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

    const text =
      String(value).trim();

    return (
      text ||
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

  function normalizeMechanicId(
    value
  ) {
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

  /* =======================================================
     REGISTRO DE MECÂNICAS
     ======================================================= */

  function registerMechanic(
    definition
  ) {
    if (
      !isObject(definition)
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
         
