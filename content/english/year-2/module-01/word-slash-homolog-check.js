/* DUDUQ — QA local de homologação Word Slash / 2º ano / M01 */
(function () {
  "use strict";

  const PILOT_ID = "EN2-M1-08";
  const EXPECTED_IDS = Array.from({ length: 15 }, function (_, index) {
    return "EN2-M1-" + String(index + 1).padStart(2, "0");
  });
  const startedAt = Date.now();
  const timeoutMs = 15000;

  function questionsOf(moduleDefinition) {
    const out = [];
    (moduleDefinition?.activities || []).forEach(function (activity) {
      (activity?.questions || []).forEach(function (question) {
        out.push({ activity: activity, question: question });
      });
    });
    return out;
  }

  function assert(results, condition, code, detail) {
    results.push({
      code: code,
      pass: Boolean(condition),
      detail: detail || ""
    });
  }

  function run(moduleDefinition) {
    const results = [];
    const entries = questionsOf(moduleDefinition);
    const ids = entries.map(function (entry) { return entry.question.id; });
    const pilotEntries = entries.filter(function (entry) {
      return entry.question.id === PILOT_ID;
    });
    const wordSlashEntries = entries.filter(function (entry) {
      return entry.question?.delivery?.mechanic === "word-slash";
    });
    const pilot = pilotEntries[0]?.question || null;
    const config = pilot?.metadata?.wordSlash || null;
    const objectValues = Array.isArray(config?.objects)
      ? config.objects.map(function (item) { return item.value; })
      : [];

    assert(results, moduleDefinition?.version === "1.3.2-homolog-word-slash", "module-version", moduleDefinition?.version);
    assert(results, entries.length === 15, "question-count", "esperado=15 atual=" + entries.length);
    assert(results, new Set(ids).size === 15, "unique-question-ids", ids.join(","));
    assert(results, EXPECTED_IDS.every(function (id) { return ids.includes(id); }), "official-ids-preserved", ids.join(","));
    assert(results, pilotEntries.length === 1, "pilot-single-instance", "ocorrencias=" + pilotEntries.length);
    assert(results, wordSlashEntries.length === 1, "word-slash-no-quota", "ocorrencias=" + wordSlashEntries.length);
    assert(results, wordSlashEntries[0]?.question?.id === PILOT_ID, "word-slash-only-pilot", wordSlashEntries[0]?.question?.id || "ausente");
    assert(results, pilot?.delivery?.mechanic === "word-slash", "pilot-mechanic", pilot?.delivery?.mechanic || "ausente");
    assert(results, pilot?.delivery?.allowAudio === true, "pilot-audio-enabled", String(pilot?.delivery?.allowAudio));
    assert(results, pilot?.delivery?.allowImage === false, "pilot-no-image-dependency", String(pilot?.delivery?.allowImage));
    assert(results, config?.target?.value === "C" && config?.target?.spokenText === "C", "target-letter-c", JSON.stringify(config?.target || null));
    assert(results, config?.target?.hideValue === true, "target-hidden", String(config?.target?.hideValue));
    assert(results, objectValues.length === 3 && ["A", "B", "C"].every(function (v) { return objectValues.includes(v); }), "three-symbol-alternatives", objectValues.join(","));
    assert(results, config?.goal === 2, "short-goal", String(config?.goal));
    assert(results, Number(config?.difficulty?.speedMinMs) >= 6500, "slow-min-speed", String(config?.difficulty?.speedMinMs));
    assert(results, Number(config?.difficulty?.speedMaxMs) >= 8000, "slow-max-speed", String(config?.difficulty?.speedMaxMs));
    assert(results, Number(config?.difficulty?.maxObjects) <= 3, "low-object-density", String(config?.difficulty?.maxObjects));
    assert(results, Number(config?.difficulty?.timeLimitSeconds) >= 60, "extended-time", String(config?.difficulty?.timeLimitSeconds));
    assert(results, moduleDefinition?.audioCatalog?.[PILOT_ID]?.mechanic === "word-slash", "audio-catalog-synced", moduleDefinition?.audioCatalog?.[PILOT_ID]?.mechanic || "ausente");
    assert(results, pilot?.metadata?.homologation?.readingDemand === "R0-R1", "reading-demand-gate", pilot?.metadata?.homologation?.readingDemand || "ausente");

    const failed = results.filter(function (item) { return !item.pass; });
    const report = Object.freeze({
      id: "YEAR2_M01_WORD_SLASH_EN2-M1-08",
      baseRevision: 143,
      generatedAt: new Date().toISOString(),
      passed: failed.length === 0,
      total: results.length,
      failures: failed.length,
      results: results
    });

    window.DUDUQ_HOMOLOG_QA = report;
    document.documentElement.dataset.duduqHomologQa = report.passed ? "pass" : "fail";

    if (report.passed) {
      console.info("[DuduQ Homolog QA] PASS", report);
    } else {
      console.error("[DuduQ Homolog QA] FAIL", report);
    }

    try {
      window.dispatchEvent(new CustomEvent("duduq:homolog-qa", { detail: report }));
    } catch (_) {}

    return report;
  }

  function waitForModule() {
    const moduleDefinition = window.DUDUQ_CONTENT?.english?.year2?.module01;

    if (moduleDefinition?.activities?.length) {
      run(moduleDefinition);
      return;
    }

    if (Date.now() - startedAt > timeoutMs) {
      const report = Object.freeze({
        id: "YEAR2_M01_WORD_SLASH_EN2-M1-08",
        baseRevision: 143,
        generatedAt: new Date().toISOString(),
        passed: false,
        total: 1,
        failures: 1,
        results: [{ code: "module-load-timeout", pass: false, detail: "module01 não ficou disponível em 15 s" }]
      });
      window.DUDUQ_HOMOLOG_QA = report;
      document.documentElement.dataset.duduqHomologQa = "fail";
      console.error("[DuduQ Homolog QA] FAIL", report);
      return;
    }

    setTimeout(waitForModule, 100);
  }

  waitForModule();
})();
