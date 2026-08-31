import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const ROOT = process.cwd();
const CANARY_PATH = path.join(ROOT, "engine/channels/canary-v1.json");
const OUT = path.resolve("test-results/systemic/m01-core-1.0.12-candidate");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function candidateManifest(stable) {
  const copy = structuredClone(stable);
  copy.core.release = "1.0.12-candidate";
  for (const item of copy.core.styles || []) {
    item.href = String(item.href).replaceAll("/core/1.0.11/", "/core/1.0.12-candidate/");
    item.release = "1.0.12-candidate";
  }
  for (const item of copy.core.preMechanicScripts || []) {
    if (String(item.src || "").includes("/engine/releases/core/1.0.11/")) {
      item.src = String(item.src).replaceAll("/core/1.0.11/", "/core/1.0.12-candidate/");
      item.release = "1.0.12-candidate";
    }
  }
  copy.core.router = {
    ...copy.core.router,
    src: String(copy.core.router?.src || "").replaceAll("/core/1.0.11/", "/core/1.0.12-candidate/"),
    release: "1.0.12-candidate"
  };
  copy.status = "qa-core-1.0.12-candidate-router-drag-drop-data-single";
  return copy;
}

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });
const stableCanary = JSON.parse(await fs.readFile(CANARY_PATH, "utf8"));
const manifest = candidateManifest(stableCanary);

assert(stableCanary.revision === 145 && stableCanary.core?.release === "1.0.11", "Rollback baseline R145/Core 1.0.11 não está intacto.");
assert(manifest.mechanics?.["drag-drop"]?.release === "2.0.22", "QA alterou a versão de Drag & Drop.");
assert(manifest.mechanics?.["target-shooter"]?.release === "1.0.21", "QA alterou a versão de Target Shooter.");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const pageErrors = [];
const critical404 = [];
page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
page.on("response", (response) => {
  if (response.status() !== 404) return;
  const url = response.url();
  if (url.includes("/engine/") || url.includes("/content/english/year-1/module-01/")) critical404.push(url);
});

try {
  await page.route("**/engine/channels/canary-v1.json**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify(manifest)
    });
  });

  const response = await page.goto(`${BASE}/content/english/year-1/module-01/?qa=core-1.0.12-candidate`, {
    waitUntil: "domcontentloaded",
    timeout: 35_000
  });
  assert(response?.ok(), `M01 HTTP ${response?.status()}.`);
  await page.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, { timeout: 35_000 });

  const contract = await page.evaluate(() => {
    const moduleDefinition = window.DUDUQ_CONTENT?.english?.year1?.module01;
    const questions = (moduleDefinition?.activities || []).flatMap((activity) => activity?.questions || []);
    const dragQuestions = questions.filter((question) => question?.delivery?.mechanic === "drag-drop");
    return {
      manifestRevision: window.DUDUQ_ENGINE_MANIFEST?.revision,
      manifestCore: window.DUDUQ_ENGINE_MANIFEST?.core?.release,
      routerVersion: window.DuduQRouter?.version,
      dragRelease: window.DUDUQ_ENGINE_MANIFEST?.mechanics?.["drag-drop"]?.release,
      ids: questions.map((question) => question.id),
      decisions: dragQuestions.map((question) => {
        const decision = window.DuduQRouter.select(question);
        return {
          id: question.id,
          answerType: question.answer?.type,
          selected: decision.selected?.mechanicId || null,
          structured: decision.analysis?.hasStructuredDragDropPayload,
          requiredCount: decision.analysis?.structuredDragDropPayload?.requiredItemCount,
          items: (question.payload?.items || []).map((item) => ({
            id: item.id,
            required: item.required,
            targetId: item.targetId || null,
            spokenText: item.spokenText || "",
            speechLocale: item.speechLocale || ""
          })),
          targets: (question.payload?.targets || []).map((target) => target.id)
        };
      })
    };
  });

  assert(contract.manifestRevision === 145, `QA deveria preservar revision 145 antes da promoção, recebeu ${contract.manifestRevision}.`);
  assert(contract.manifestCore === "1.0.12-candidate", `Core candidato não carregou: ${contract.manifestCore}.`);
  assert(contract.routerVersion === "1.0.1", `Router candidato não carregou: ${contract.routerVersion}.`);
  assert(contract.dragRelease === "2.0.22", `Drag & Drop mudou para ${contract.dragRelease}.`);
  assert(contract.ids.length === 12 && contract.ids[0] === "EN1-M1-01" && contract.ids[11] === "EN1-M1-12", "Banco editorial de 12 IDs foi alterado no QA.");
  assert(contract.decisions.length > 0, "M01 não contém questões Drag & Drop para validar.");
  for (const decision of contract.decisions) {
    assert(decision.answerType === "single", `${decision.id}: answer.type editorial deixou de ser single.`);
    assert(decision.structured === true, `${decision.id}: payload data-driven não foi reconhecido.`);
    assert(decision.selected === "drag-drop", `${decision.id}: Router selecionou ${decision.selected || "null"}.`);
    assert(decision.requiredCount === 1, `${decision.id}: esperado exatamente um item obrigatório.`);
    assert(decision.items.length === 3, `${decision.id}: esperado 3 cards auditivos.`);
    assert(decision.items.filter((item) => item.required === false).length === 2, `${decision.id}: distratores required=false não foram preservados.`);
    assert(decision.items.filter((item) => item.required !== false).every((item) => item.targetId && decision.targets.includes(item.targetId)), `${decision.id}: item obrigatório sem targetId válido.`);
    assert(decision.items.every((item) => item.spokenText && item.speechLocale), `${decision.id}: card auditivo sem spokenText/locale.`);
  }

  const q02 = contract.decisions.find((entry) => entry.id === "EN1-M1-02");
  assert(q02, "EN1-M1-02 não foi encontrada entre as questões Drag & Drop.");
  assert(q02.items.find((item) => item.id === "C")?.required === true, "EN1-M1-02 perdeu o item correto C como obrigatório.");
  assert(q02.items.find((item) => item.id === "A")?.required === false && q02.items.find((item) => item.id === "B")?.required === false, "EN1-M1-02 perdeu distratores A/B required=false.");

  const intro = page.locator(".duduq-intro-start-button");
  await intro.waitFor({ state: "visible", timeout: 30_000 });
  await page.screenshot({ path: path.join(OUT, "intro-ready.png"), fullPage: false });
  await intro.click();

  await page.waitForFunction(() => {
    const session = window.DuduQ?.getSession?.();
    const doc = document.querySelector("iframe")?.contentDocument;
    return Boolean(session && session.stepIndex === 0 && !session.transitioning && doc?.querySelector(".duduq-ts-root"));
  }, null, { timeout: 35_000 });

  const firstFrame = page.frameLocator("iframe");
  const correctTarget = firstFrame.locator('.duduq-ts-target[aria-label="Lançar estrela no alvo B"]').first();
  await correctTarget.waitFor({ state: "visible", timeout: 10_000 });
  await correctTarget.click({ force: true });

  await page.waitForFunction(() => {
    const session = window.DuduQ?.getSession?.();
    const doc = document.querySelector("iframe")?.contentDocument;
    return Boolean(session && session.stepIndex === 1 && !session.transitioning && doc?.querySelector(".duduq-udd-root"));
  }, null, { timeout: 20_000 });

  const mounted = await page.evaluate(() => {
    const doc = document.querySelector("iframe")?.contentDocument;
    const items = doc ? [...doc.querySelectorAll(".duduq-udd-item[data-dd-item-id]")] : [];
    const audioButtons = doc ? [...doc.querySelectorAll(".duduq-udd-item-audio")] : [];
    const target = doc?.querySelector(".duduq-udd-target[data-dd-target-id]");
    const bodyText = String(doc?.body?.innerText || "");
    return {
      itemIds: items.map((item) => item.getAttribute("data-dd-item-id")),
      audioCount: audioButtons.length,
      targetId: target?.getAttribute("data-dd-target-id") || "",
      errorText: /erro ao preparar|falha ao preparar|não foi possível abrir/i.test(bodyText),
      brokenImages: doc ? [...doc.images].filter((img) => img.currentSrc && (!img.complete || img.naturalWidth < 1)).map((img) => img.currentSrc) : []
    };
  });
  assert(mounted.itemIds.length === 3 && ["A", "B", "C"].every((id) => mounted.itemIds.includes(id)), `EN1-M1-02 não montou os 3 cards: ${mounted.itemIds.join(",")}.`);
  assert(mounted.audioCount === 3, `EN1-M1-02 montou ${mounted.audioCount} controles de áudio em vez de 3.`);
  assert(mounted.targetId === "EN1-M1-02-answer-target", `Target inesperado: ${mounted.targetId}.`);
  assert(mounted.errorText === false, "Distratores required=false causaram erro de preparação/runtime.");
  assert(mounted.brokenImages.length === 0, `Imagem quebrada no Drag & Drop: ${mounted.brokenImages.join(" | ")}.`);

  // Prova de áudio acionável sem remover os cards.
  const ddFrame = page.frameLocator("iframe");
  const firstAudio = ddFrame.locator(".duduq-udd-item-audio").first();
  await firstAudio.waitFor({ state: "visible", timeout: 5_000 });
  await firstAudio.click({ force: true });
  await page.waitForTimeout(180);
  assert(await ddFrame.locator(".duduq-udd-item-audio").count() === 3, "Cards auditivos desapareceram após reprodução.");

  // Resposta real da EN1-M1-02: selecionar C, mover ao contexto e confirmar.
  const correctItem = ddFrame.locator('.duduq-udd-item[data-dd-item-id="C"]').first();
  await correctItem.waitFor({ state: "visible", timeout: 5_000 });
  await correctItem.click({ force: true });
  const targetHead = ddFrame.locator(".duduq-udd-target-head").first();
  await targetHead.waitFor({ state: "visible", timeout: 5_000 });
  await targetHead.click({ force: true });

  const confirm = ddFrame.locator(".duduq-udd-primary").first();
  await confirm.waitFor({ state: "visible", timeout: 5_000 });
  await page.waitForFunction(() => {
    const doc = document.querySelector("iframe")?.contentDocument;
    const button = doc?.querySelector(".duduq-udd-primary");
    return Boolean(button && !button.disabled);
  }, null, { timeout: 8_000 });
  await confirm.click({ force: true });

  await page.waitForFunction(() => {
    const session = window.DuduQ?.getSession?.();
    return Boolean(session && session.stepIndex >= 2 && !session.transitioning);
  }, null, { timeout: 15_000 });

  const after = await page.evaluate(() => window.DuduQ?.getSession?.());
  assert(after.stepIndex >= 2, `EN1-M1-02 não registrou resposta/progressão: stepIndex=${after.stepIndex}.`);
  assert(pageErrors.length === 0, `pageerror: ${pageErrors.join(" | ")}`);
  assert(critical404.length === 0, `404 crítico: ${critical404.join(" | ")}`);
  await page.screenshot({ path: path.join(OUT, "en1-m1-02-complete.png"), fullPage: false });

  const report = {
    contract: "DUDUQ_M01_CORE_1_0_12_CANDIDATE_INTEGRATION_V1",
    status: "PASS",
    baseline: { revision: 145, core: "1.0.11" },
    candidate: { core: "1.0.12-candidate", router: "1.0.1" },
    dragDrop: "2.0.22",
    targetShooter: "1.0.21",
    dragQuestionCount: contract.decisions.length,
    en1m102: {
      mountedCards: mounted.itemIds,
      audioControls: mounted.audioCount,
      distractorsRequiredFalse: 2,
      responseRegistered: true,
      progressedToStep: after.stepIndex
    },
    pageErrors,
    critical404
  };
  await fs.writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await page.close();
  await browser.close();
}
