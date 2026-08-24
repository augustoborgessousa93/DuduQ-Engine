/* DUDUQ Year2 M01-12 — homologation-only isolated QA module */
(function () {
  "use strict";

  const year2 = window.DUDUQ_CONTENT?.english?.year2;
  const source = year2?.module01v22homolog;

  if (!year2 || !source) {
    throw new Error("[DuduQ M01-12 QA] M01 v2.2 homologado precisa estar carregado antes do módulo isolado.");
  }

  const sourceActivity = (source.activities || []).find((activity) =>
    (activity.questions || []).some((question) => question.id === "EN2-M1-12")
  );
  const sourceQuestion = sourceActivity?.questions?.find((question) => question.id === "EN2-M1-12");

  if (!sourceActivity || !sourceQuestion) {
    throw new Error("[DuduQ M01-12 QA] EN2-M1-12 não foi encontrado no runtime M01 v2.2.");
  }

  const activity = Object.freeze({
    ...sourceActivity,
    id: "en2-m1-12-drag-drop",
    title: "Greetings & The Alphabet — EN2-M1-12",
    topic: "First listen gate",
    mechanic: "drag-drop",
    questions: Object.freeze([sourceQuestion])
  });

  year2.module01v22m112homolog = Object.freeze({
    ...source,
    id: "english-year-2-module-01-m1-12-v22-v12-homolog",
    title: "EN2-M1-12 — First Listen Gate",
    description: "Candidata isolada exclusivamente para QA do gate de primeira escuta do EN2-M1-12.",
    estimatedMinutes: 1,
    mechanicDistribution: Object.freeze({ "drag-drop": 1 }),
    blockedItems: Object.freeze([]),
    activities: Object.freeze([activity]),
    audit: Object.freeze({
      ...(source.audit || {}),
      sourceItems: 1,
      executableItems: 1,
      blockedItems: 0,
      firstListenQaOnly: true,
      productionUntouched: true,
      commercialReady: false
    })
  });
})();
