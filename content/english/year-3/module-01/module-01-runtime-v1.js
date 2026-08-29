/* DUDUQ English Year 3 — Module 01 runtime v1
   Thin registration layer: source + plan + factory -> DUDUQ_CONTENT.
*/
(function () {
  "use strict";

  if (!window.DuduQYear3Factory?.registerModule) {
    throw new Error("[DuduQ Year3 M01] Year3 factory not loaded.");
  }

  const definition = window.DuduQYear3Factory.registerModule(1, "module01v1");

  if (!definition || !Array.isArray(definition.activities) || definition.activities.length !== 15) {
    throw new Error("[DuduQ Year3 M01] Invalid module definition.");
  }

  window.DUDUQ_YEAR3_M01_RUNTIME = Object.freeze({
    version: "1.0.0",
    sourceVersion: "2.2",
    factoryVersion: window.DuduQYear3Factory.version,
    moduleId: definition.id,
    activities: definition.activities.length,
    mechanics: definition.mechanics.slice()
  });
})();
