import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const PIN = "f0f8bed8e8c24fad4eae204bf4a5cc84a8d8263f";
const OUT = path.resolve("test-results/systemic/year1-m01-official");
const VIEWPORTS = [
  { name: "desktop-1366x768", width: 1366, height: 768 },
  { name: "fullhd-1920x1080", width: 1920, height: 1080 },
  { name: "tablet-768x1024", width: 768, height: 1024 },
  { name: "mobile-390x844", width: 390, height: 844 }
];
const EXPECTED = [
  ["EN1-M1-01", "B", ["Goodbye", "Hello", "Good morning"]],
  ["EN1-M1-02", "C", ["Good afternoon", "Goodbye", "Good morning"]],
  ["EN1-M1-03", "A", ["Good afternoon", "Good morning", "Goodbye"]],
  ["EN1-M1-04", "B", ["ao chegar", "ao se despedir", "ao dizer a idade"]],
  ["EN1-M1-05", "C", ["Goodbye!", "Good afternoon!", "I’m Leo."]],
  ["EN1-M1-06", "A", ["boy", "girl", "hello"]],
  ["EN1-M1-07", "B", ["boy", "girl", "goodbye"]],
  ["EN1-M1-08", "C", ["Goodbye!", "Good night!", "Hi!"]],
  ["EN1-M1-09", "A", ["Dizendo o próprio nome", "Despedindo-se", "Dizendo boa tarde"]],
  ["EN1-M1-10", "B", ["Hello!", "Bye!", "Good morning!"]],
  ["EN1-M1-11", "A", ["See you!", "Good afternoon!", "Hi!"]],
  ["EN1-M1-12", "A", ["Hi, Mia!", "Bye, Mia!", "See you, Mia!"]]
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForHostStep(page, expected, timeout = 15_000) {
  await page.waitForFunction((step) => {
    const session = window.DuduQ?.getSession?.();
    const iframe = document.querySelector("iframe");
    return Boolean(
      session && !session.transitioning && session.stepIndex === step && !session.completed &&
      iframe && (iframe.srcdoc || iframe.getAttribute("src")) &&
      window.DuduQTransition?.getState?.() === "idle"
    );
  }, expected, { timeout });
}

async function waitForFeedback(page, state, timeout = 5_000) {
  await page.waitForFunction((expected) => {
    const doc = document.querySelector("iframe")?.contentDocument;
    return doc?.querySelector(".duduq-engine-feedback")?.getAttribute("data-state") === expected;
  }, state, { timeout });
}

async function waitForDDReady(page, timeout = 20_000) {
  await page.waitForFunction(() => {
    const doc = document.querySelector("iframe")?.contentDocument;
    const root = doc?.querySelector(".duduq-dd2-root");
    const items = [...(doc?.querySelectorAll(".duduq-dd2-bank-items .duduq-dd2-item") || [])];
    const target = doc?.querySelector(".duduq-dd2-target[data-dd2-target-id]");
    return Boolean(root && target && items.length === 3 && items.every((item) => !item.disabled));
  }, null, { timeout });
}

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const cases = [];
let fatalError = null;

try {
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport });
    const pageErrors = [];
    const critical404 = [];
    if (viewport.name === "mobile-390x844") await page.emulateMedia({ reducedMotion: "reduce" });

    page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
    page.on("response", (response) => {
      if (response.status() !== 404) return;
      const url = response.url();
      if (url.includes("/engine/") || url.includes("/content/english/year-1/module-01/") || url.includes("asset-catalog/runtime-index.js")) {
        critical404.push(url);
      }
    });

    try {
      const response = await page.goto(`${BASE}/content/english/year-1/module-01/?qa=official-y1-m01-r146-${viewport.name}`, {
        waitUntil: "domcontentloaded",
        timeout: 35_000
      });
      assert(response?.ok(), `${viewport.name}: M01 HTTP ${response?.status()}.`);
      await page.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, { timeout: 35_000 });

      const audit = await page.evaluate(() => {
        const moduleDefinition = window.DUDUQ_CONTENT?.english?.year1?.module01;
        const questions = (moduleDefinition?.activities || []).flatMap((activity) => activity?.questions || []);
        const ids = questions.map((q) => q.id);
        const assetKeys = [];
        const semanticAssets = [];
        const audioItems = [];

        for (const question of questions) {
          for (const item of question?.metadata?.targetShooter?.items || []) {
            if (!item.imageAsset) continue;
            assetKeys.push(item.imageAsset);
            semanticAssets.push({ key: item.imageAsset, alt: item.alt || "" });
          }
          for (const target of question?.payload?.targets || []) {
            if (!target.imageAsset) continue;
            assetKeys.push(target.imageAsset);
            semanticAssets.push({ key: target.imageAsset, alt: target.alt || target.image?.alt || "" });
          }
          for (const item of question?.payload?.items || []) {
            if (!item.spokenText) continue;
            audioItems.push({ questionId: question.id, id: item.id, spokenText: item.spokenText, speechLocale: item.speechLocale });
          }
        }

        const uniqueAssetKeys = [...new Set(assetKeys)];
        const manifest = window.DUDUQ_ENGINE_MANIFEST || {};
        return {
          exists: Boolean(moduleDefinition),
          version: moduleDefinition?.version || "",
          profile: moduleDefinition?.pedagogyPolicy?.profile || "",
          readingDefault: moduleDefinition?.pedagogyPolicy?.readingDefault || "",
          autonomousReading: moduleDefinition?.pedagogyPolicy?.autonomousEnglishReadingRequired,
          smartSentenceScored: moduleDefinition?.pedagogyPolicy?.smartSentenceScored,
          spec: moduleDefinition?.pedagogyPolicy?.specification || "",
          contentSpec: moduleDefinition?.pedagogyPolicy?.contentSpecification || "",
          factoryCore: moduleDefinition?.factory?.core || "",
          activities: moduleDefinition?.activities?.length || 0,
          activityTitles: (moduleDefinition?.activities || []).map((activity) => activity.title),
          mechanics: (moduleDefinition?.activities || []).map((activity) => activity.mechanic),
          ids,
          duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
          questions: questions.map((q) => ({
            id: q.id,
            skill: q.skill?.description || "",
            sourceSkill: q.metadata?.sourceSkill || "",
            answer: q.answer?.value,
            alternatives: (q.alternatives || []).map((a) => a.text),
            readingEssential: q.metadata?.readingEssential,
            literacyDemand: q.metadata?.literacyDemand,
            delivery: q.delivery?.mechanic,
            hasFeedback: Boolean(q.feedback?.correct && q.feedback?.incorrect),
            targetSize: q.metadata?.targetShooter?.difficulty?.targetSize || null,
            targetTimer: q.metadata?.targetShooter?.difficulty?.timerMode || null,
            targetTimeLimit: q.metadata?.targetShooter?.difficulty?.timeLimitMs ?? null,
            targetItems: q.metadata?.targetShooter?.items || [],
            dragMode: q.payload?.mode || "",
            dragItems: q.payload?.items || [],
            dragTargets: q.payload?.targets || [],
            instructionFallback: q.metadata?.instructionAudioFallback || null
          })),
          raw: JSON.stringify(moduleDefinition),
          assetKeys: uniqueAssetKeys,
          semanticAssets,
          resolvedAssets: Object.fromEntries(uniqueAssetKeys.map((key) => [key, window.DuduQAssets?.resolveImageDetails?.(key) || null])),
          audioItems,
          manifestRevision: manifest.revision,
          manifestCore: manifest.core?.release || "",
          manifestDragDrop: manifest.mechanics?.["drag-drop"]?.release || "",
          manifestTargetShooter: manifest.mechanics?.["target-shooter"]?.release || "",
          requiredMechanics: [...(window.DUDUQ_GAME_CONFIG?.requiredMechanics || [])],
          registeredMechanics: window.DuduQ?.listMechanics?.() || [],
          scripts: Array.from(document.scripts).map((script) => script.src).filter(Boolean),
          canonicalRuntimeCommit: window.DuduQAssets?.canonicalCatalog?.runtimeCommit || ""
        };
      });

      // 1. CONTEÚDO
      assert(audit.exists, `${viewport.name}: módulo M01 ausente.`);
      assert(audit.version === "2.3.0-homolog-r145", `${viewport.name}: versão editorial ${audit.version}.`);
      assert(audit.ids.length === 12 && audit.duplicateIds.length === 0, `${viewport.name}: IDs inválidos/duplicados.`);
      assert(audit.ids.join(",") === EXPECTED.map((entry) => entry[0]).join(","), `${viewport.name}: ordem/IDs oficiais divergiram.`);
      for (const [id, answer, alternatives] of EXPECTED) {
        const question = audit.questions.find((entry) => entry.id === id);
        assert(question?.answer === answer, `${viewport.name}: gabarito ${id} divergente.`);
        assert(JSON.stringify(question?.alternatives) === JSON.stringify(alternatives), `${viewport.name}: alternativas ${id} divergiram.`);
        assert(question?.skill && question?.sourceSkill && question?.hasFeedback, `${viewport.name}: rastreabilidade/feedback ausente em ${id}.`);
      }

      // 2. PEDAGOGIA
      assert(audit.profile === "Y1_EARLY_LITERACY" && audit.readingDefault === "R0", `${viewport.name}: perfil Y1/R0 divergente.`);
      assert(audit.autonomousReading === false && audit.smartSentenceScored === false, `${viewport.name}: demanda de leitura incompatível.`);
      assert(audit.spec === "DUDUQ_FACTORY_PEDAGOGICAL_SPECIFICATION_v1.2" && audit.contentSpec.includes("v2.3"), `${viewport.name}: especificações oficiais divergentes.`);
      assert(audit.questions.every((q) => q.readingEssential === false && q.literacyDemand === "R0"), `${viewport.name}: questão fora de R0.`);
      assert(audit.questions.every((q) => q.instructionFallback?.enabled && q.instructionFallback?.language === "pt-BR"), `${viewport.name}: fallback auditivo de instrução ausente.`);

      // 3. MECÂNICA + 9. INTEGRAÇÃO
      assert(audit.factoryCore === "1.0.11", `${viewport.name}: provenance Core divergente.`);
      assert(audit.manifestRevision === 146 && audit.manifestCore === "1.0.11", `${viewport.name}: Canary real não é R146/Core 1.0.11.`);
      assert(audit.manifestDragDrop === "2.0.24" && audit.manifestTargetShooter === "1.0.21", `${viewport.name}: releases das mecânicas divergentes.`);
      assert(audit.requiredMechanics.join(",") === "target-shooter,drag-drop", `${viewport.name}: requiredMechanics divergente.`);
      const registeredIds = audit.registeredMechanics.map((entry) => entry.id);
      assert(audit.requiredMechanics.every((id) => registeredIds.includes(id)), `${viewport.name}: mecânica requerida não registrada.`);
      assert(audit.registeredMechanics.find((entry) => entry.id === "drag-drop")?.version === "2.0.24", `${viewport.name}: DD registrado não é 2.0.24.`);
      assert(audit.mechanics.every((id) => id === "target-shooter" || id === "drag-drop"), `${viewport.name}: mecânica fora do contrato.`);
      assert(audit.activityTitles.every((title) => title === "GREETINGS"), `${viewport.name}: tópico não é GREETINGS.`);
      assert(audit.scripts.some((src) => src.includes("/engine/duduq-player-v1.js")), `${viewport.name}: Player ausente.`);
      assert(audit.scripts.some((src) => src.includes("/engine/duduq-loader-v1.js")), `${viewport.name}: Loader ausente.`);
      assert(audit.scripts.some((src) => src.includes("/engine/releases/core/1.0.11/duduq-host.js")), `${viewport.name}: Host 1.0.11 ausente.`);
      assert(audit.scripts.some((src) => src.includes("/engine/releases/core/1.0.11/duduq-router.js")), `${viewport.name}: Router 1.0.11 ausente.`);
      assert(audit.scripts.some((src) => src.includes("/engine/releases/mechanics/drag-drop/2.0.24/drag-drop.js")), `${viewport.name}: adapter DD 2.0.24 ausente.`);

      for (const question of audit.questions) {
        if (question.delivery === "target-shooter") {
          assert(question.targetItems.length === 3 && question.targetSize >= 150, `${viewport.name}: ${question.id} alvo/precisão inválidos.`);
          assert(question.targetTimer === "none" && question.targetTimeLimit === 0, `${viewport.name}: ${question.id} possui timer punitivo.`);
          const urls = question.targetItems.map((item) => item.image || item.imageUrl).filter(Boolean);
          assert(new Set(urls).size === urls.length, `${viewport.name}: ${question.id} duplica visual nas alternativas.`);
        }
        if (question.delivery === "drag-drop") {
          assert(question.dragMode === "single-choice", `${viewport.name}: ${question.id} não usa single-choice.`);
          assert(question.dragItems.length === 3 && question.dragTargets.length === 1 && question.dragTargets[0].capacity === 1, `${viewport.name}: ${question.id} contrato 3-opções/1-destino inválido.`);
          const required = question.dragItems.filter((item) => item.required !== false);
          const distractors = question.dragItems.filter((item) => item.required === false);
          assert(required.length === 1 && required[0].id === question.answer && required[0].targetId === question.dragTargets[0].id, `${viewport.name}: ${question.id} gabarito single-choice inválido.`);
          assert(distractors.length === 2 && distractors.every((item) => !item.targetId), `${viewport.name}: ${question.id} distrator com targetId.`);
          assert(question.dragItems.every((item, index) => item.label === String(index + 1) && item.spokenText && item.speechLocale), `${viewport.name}: ${question.id} card não é numérico/auditivo.`);
          assert(question.dragTargets[0].imageAsset, `${viewport.name}: ${question.id} contexto visual ausente.`);
        }
      }

      // 4. ASSETS
      assert(audit.canonicalRuntimeCommit === PIN, `${viewport.name}: pin canônico divergente.`);
      assert(!audit.raw.includes('"status":"preview"') && !audit.raw.includes("data:image") && !/legacy-fallback|procedural/i.test(audit.raw), `${viewport.name}: asset não canônico/fallback no payload.`);
      assert(audit.assetKeys.length >= 10 && audit.semanticAssets.every((entry) => entry.alt.trim()), `${viewport.name}: cobertura/semântica de assets insuficiente.`);
      for (const key of audit.assetKeys) {
        const details = audit.resolvedAssets[key];
        assert(details?.url && details?.file && details.catalogRuntimeCommit === PIN, `${viewport.name}: asset '${key}' não resolvido/provenance inválida.`);
        assert(details.strategy === "canonical-key" || details.strategy === "canonical-alias", `${viewport.name}: estratégia inesperada para '${key}'.`);
      }

      // 5. ÁUDIO
      const q09Audios = audit.audioItems.filter((item) => item.questionId === "EN1-M1-09");
      assert(q09Audios.length === 3 && q09Audios.every((item) => item.speechLocale === "pt-BR"), `${viewport.name}: EN1-M1-09 áudio pt-BR inválido.`);
      assert(audit.audioItems.every((item) => item.spokenText && item.speechLocale), `${viewport.name}: opção auditiva sem texto/locale.`);

      // Fluxo real começa no Target Shooter.
      const start = page.locator(".duduq-intro-start-button");
      await start.waitFor({ state: "visible", timeout: 30_000 });
      await start.click();
      await waitForHostStep(page, 0, 35_000);
      await page.waitForFunction(() => {
        const doc = document.querySelector("iframe")?.contentDocument;
        return Boolean(doc?.querySelector(".duduq-ts-root") && doc.querySelectorAll(".duduq-ts-target").length === 3);
      }, null, { timeout: 20_000 });

      // 6. VISUAL + 7. RESPONSIVIDADE + 8. ACESSIBILIDADE — Target Shooter.
      const tsView = await page.evaluate(() => {
        const doc = document.querySelector("iframe")?.contentDocument;
        const root = doc?.querySelector(".duduq-ts-root");
        const targets = doc ? [...doc.querySelectorAll(".duduq-ts-target")] : [];
        const buttons = doc ? [...doc.querySelectorAll("button,[role='button']")] : [];
        const images = doc ? [...doc.images] : [];
        return {
          heading: String(doc?.querySelector(".duduq-engine-heading h1,h1")?.textContent || "").trim(),
          instruction: String(doc?.querySelector(".duduq-ts-instruction")?.textContent || "").replace(/\s+/g, " ").trim(),
          rects: targets.map((el) => { const r = el.getBoundingClientRect(); return { width: r.width, height: r.height, tabIndex: el.tabIndex }; }),
          audioControls: buttons.filter((el) => /áudio|audio|ouvir|som|instruction/i.test(String(el.getAttribute("aria-label") || el.textContent || ""))).length,
          brokenImages: images.filter((img) => img.currentSrc && (!img.complete || img.naturalWidth < 1)).length,
          overflowX: Math.max(0, (doc?.body?.scrollWidth || 0) - (doc?.documentElement?.clientWidth || 0)),
          background: doc ? getComputedStyle(doc.body).backgroundColor : "",
          reducedMotion: root?.getAttribute("data-reduced-motion") || ""
        };
      });
      assert(tsView.heading === "GREETINGS" && tsView.instruction, `${viewport.name}: TS perdeu título/instrução.`);
      assert(tsView.rects.every((r) => r.width >= 44 && r.height >= 44 && r.tabIndex >= 0), `${viewport.name}: TS touch/teclado inválido.`);
      assert(tsView.audioControls >= 1 && tsView.brokenImages === 0 && tsView.overflowX <= 6, `${viewport.name}: TS áudio/imagem/overflow inválido.`);
      assert(tsView.background && tsView.background !== "rgba(0, 0, 0, 0)", `${viewport.name}: TS background ausente.`);
      if (viewport.name === "mobile-390x844") assert(tsView.reducedMotion === "true", `${viewport.name}: reduced-motion TS não propagou.`);

      assert(await page.evaluate(() => typeof window.DuduQFullscreen?.toggle === "function"), `${viewport.name}: fullscreen API ausente.`);
      await page.evaluate(() => window.DuduQFullscreen.toggle());
      await page.waitForFunction(() => Boolean(document.fullscreenElement), null, { timeout: 5_000 });
      await page.evaluate(async () => { if (document.fullscreenElement) await document.exitFullscreen(); });
      await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 5_000 });

      // Target Shooter — espera determinística, incluindo prontidão auditiva; sem wait fixo.
      const frame = page.frameLocator("iframe");
      const wrongTarget = frame.locator('.duduq-ts-target[aria-label="Lançar estrela no alvo A"]').first();
      await wrongTarget.waitFor({ state: "visible", timeout: 10_000 });
      await page.waitForFunction(() => {
        const doc = document.querySelector("iframe")?.contentDocument;
        const target = doc?.querySelector('.duduq-ts-target[aria-label="Lançar estrela no alvo A"]');
        const audioControls = [...(doc?.querySelectorAll("button,[role='button']") || [])].filter((button) =>
          /áudio|audio|ouvir|som|instruction/i.test(String(button.getAttribute("aria-label") || button.textContent || ""))
        );
        const audioBusy = audioControls.some((button) =>
          Boolean(button.disabled) || /reprodução|playing/i.test(String(button.getAttribute("aria-label") || ""))
        );
        const session = window.DuduQ?.getSession?.();
        return Boolean(
          target && !target.disabled && audioControls.length >= 1 && !audioBusy &&
          session?.stepIndex === 0 && !session?.transitioning && !session?.completed &&
          window.DuduQTransition?.getState?.() === "idle"
        );
      }, null, { timeout: 8_000 });
      await wrongTarget.click({ force: true });
      await waitForFeedback(page, "retry", 2_500);
      const tsWrong = await page.evaluate(() => ({
        stepIndex: window.DuduQ?.getSession?.()?.stepIndex,
        completed: window.DuduQ?.getSession?.()?.completed,
        feedback: document.querySelector("iframe")?.contentDocument?.querySelector(".duduq-engine-feedback")?.getAttribute("data-state") || ""
      }));
      assert(tsWrong.stepIndex === 0 && tsWrong.completed === false && tsWrong.feedback === "retry", `${viewport.name}: TS retry/progressão inválidos.`);

      const correctTarget = frame.locator('.duduq-ts-target[aria-label="Lançar estrela no alvo B"]').first();
      await correctTarget.waitFor({ state: "visible", timeout: 10_000 });
      await correctTarget.click({ force: true });
      await waitForHostStep(page, 1, 15_000);

      // Drag & Drop 2.0.24 single-choice — Q02/Q03 são estágios da mesma atividade Host.
      await waitForDDReady(page);
      const ddView = await page.evaluate(() => {
        const doc = document.querySelector("iframe")?.contentDocument;
        const root = doc?.querySelector(".duduq-dd2-root");
        const items = doc ? [...doc.querySelectorAll(".duduq-dd2-bank-items .duduq-dd2-item")] : [];
        const targets = doc ? [...doc.querySelectorAll(".duduq-dd2-target[data-dd2-target-id]")] : [];
        const images = doc ? [...doc.images] : [];
        return {
          heading: String(doc?.querySelector(".duduq-engine-heading h1,h1")?.textContent || "").trim(),
          itemTexts: items.map((el) => String(el.textContent || "").replace(/\s+/g, " ").trim()),
          itemTabIndexes: items.map((el) => el.tabIndex),
          itemRects: items.map((el) => { const r = el.getBoundingClientRect(); return { width: r.width, height: r.height }; }),
          audioCount: items.filter((el) => el.getAttribute("data-has-audio") === "true").length,
          targetCount: targets.length,
          targetImageCount: targets.filter((target) => Boolean(target.querySelector(".duduq-dd2-target-media"))).length,
          targetImageSrc: targets[0]?.querySelector("img")?.currentSrc || "",
          confirmVisible: Boolean(doc?.querySelector(".duduq-dd2-confirm")),
          brokenImages: images.filter((img) => img.currentSrc && (!img.complete || img.naturalWidth < 1)).length,
          overflowX: Math.max(0, (doc?.body?.scrollWidth || 0) - (doc?.documentElement?.clientWidth || 0)),
          reducedMotion: root?.getAttribute("data-reduced-motion") || ""
        };
      });
      assert(ddView.heading === "GREETINGS" && ddView.itemTexts.length === 3 && ["1", "2", "3"].every((label) => ddView.itemTexts.includes(label)), `${viewport.name}: DD visual/título/cards inválidos.`);
      assert(ddView.audioCount === 3 && ddView.itemTabIndexes.every((value) => value >= 0) && ddView.itemRects.every((r) => r.width >= 44 && r.height >= 44), `${viewport.name}: DD áudio/acessibilidade inválidos.`);
      assert(ddView.targetCount === 1 && ddView.targetImageCount === 1 && ddView.targetImageSrc, `${viewport.name}: DD contexto visual inválido.`);
      assert(ddView.confirmVisible === false && ddView.brokenImages === 0 && ddView.overflowX <= 6, `${viewport.name}: DD confirmar/imagem/overflow inválidos.`);
      if (viewport.name === "mobile-390x844") assert(ddView.reducedMotion === "true", `${viewport.name}: reduced-motion DD não propagou.`);

      const ddFrame = page.frameLocator("iframe");
      for (const id of ["A", "B", "C"]) {
        const item = ddFrame.locator(`.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="${id}"]`).first();
        await item.click({ force: true });
        await page.waitForFunction((itemId) => {
          const doc = document.querySelector("iframe")?.contentDocument;
          return Boolean(doc?.querySelector(`.duduq-dd2-item[data-dd2-item-id="${itemId}"][data-audio-playing="true"]`));
        }, id, { timeout: 1_500 });
        await page.waitForFunction(() => !document.querySelector("iframe")?.contentDocument?.querySelector(".duduq-dd2-item[data-audio-playing='true']"), null, { timeout: 6_000 });
      }

      // Fluxo obrigatório: distrator A → retry → mesma questão → destino liberado → correto C → success.
      const targetZone = ddFrame.locator(".duduq-dd2-zone").first();
      await ddFrame.locator('.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="A"]').first().click({ force: true });
      await targetZone.click({ force: true });
      await waitForFeedback(page, "retry", 3_000);
      const wrongState = await page.evaluate(() => ({
        session: window.DuduQ?.getSession?.(),
        confirmVisible: Boolean(document.querySelector("iframe")?.contentDocument?.querySelector(".duduq-dd2-confirm"))
      }));
      assert(wrongState.session?.stepIndex === 1 && wrongState.session?.completed === false && !wrongState.confirmVisible, `${viewport.name}: distrator DD avançou/concluiu/exibiu confirmar.`);

      await page.waitForFunction(() => {
        const doc = document.querySelector("iframe")?.contentDocument;
        const bankWrong = doc?.querySelector('.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="A"]');
        const zoneWrong = doc?.querySelector('.duduq-dd2-zone .duduq-dd2-item[data-dd2-item-id="A"]');
        const correct = doc?.querySelector('.duduq-dd2-item[data-dd2-item-id="C"]');
        const cards = [...(doc?.querySelectorAll(".duduq-dd2-bank .duduq-dd2-item") || [])];
        return Boolean(bankWrong && !zoneWrong && correct && !correct.disabled && cards.length === 3 && cards.every((item) => !item.disabled));
      }, null, { timeout: 3_500 });
      const retryState = await page.evaluate(() => ({
        stepIndex: window.DuduQ?.getSession?.()?.stepIndex,
        zoneCount: document.querySelector("iframe")?.contentDocument?.querySelectorAll(".duduq-dd2-zone .duduq-dd2-item").length || 0
      }));
      assert(retryState.stepIndex === 1 && retryState.zoneCount === 0, `${viewport.name}: retry não preservou questão/liberou destino.`);

      await ddFrame.locator('.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="C"]').first().click({ force: true });
      await targetZone.click({ force: true });
      await waitForFeedback(page, "success", 5_000);

      // Q02 concluída: a atividade permanece no Host step 1 e o runtime troca para Q03.
      await page.waitForFunction((previousSrc) => {
        const doc = document.querySelector("iframe")?.contentDocument;
        const nextSrc = doc?.querySelector('.duduq-dd2-target[data-dd2-target-id] img')?.currentSrc || "";
        const items = [...(doc?.querySelectorAll(".duduq-dd2-bank-items .duduq-dd2-item") || [])];
        const session = window.DuduQ?.getSession?.();
        return Boolean(session?.stepIndex === 1 && !session?.completed && nextSrc && nextSrc !== previousSrc && items.length === 3 && items.every((item) => !item.disabled));
      }, ddView.targetImageSrc, { timeout: 12_000 });

      // Correto direto real na Q03 = A. Só então a atividade fecha e o Host progride.
      const directFrame = page.frameLocator("iframe");
      await directFrame.locator('.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="A"]').first().click({ force: true });
      await directFrame.locator(".duduq-dd2-zone").first().click({ force: true });
      await waitForFeedback(page, "success", 5_000);
      await waitForHostStep(page, 2, 15_000);

      // 10. REGRESSÃO proporcional: completar o restante sem reauditar outro módulo.
      const progress = [];
      let session = await page.evaluate(() => window.DuduQ.getSession());
      progress.push(session.progress?.percent ?? 0);
      while (!session.completed) {
        const current = session.stepIndex;
        const accepted = await page.evaluate((stepIndex) => window.DuduQ.next({ qa: "official-y1-m01-r146", stepIndex }), current);
        assert(accepted === true, `${viewport.name}: Host recusou progressão na etapa ${current + 1}.`);
        await page.waitForFunction(({ previous, total }) => {
          const state = window.DuduQ?.getSession?.();
          if (!state || state.transitioning) return false;
          if (state.completed) return state.progress?.percent === 100;
          const iframe = document.querySelector("iframe");
          return state.stepIndex > previous && state.stepIndex < total && iframe && (iframe.srcdoc || iframe.getAttribute("src"));
        }, { previous: current, total: session.totalSteps }, { timeout: 12_000 });
        session = await page.evaluate(() => window.DuduQ.getSession());
        progress.push(session.progress?.percent ?? -1);
      }

      assert(session.progress?.percent === 100, `${viewport.name}: progresso final ${session.progress?.percent}.`);
      assert(progress.every((value, index) => index === 0 || value >= progress[index - 1]), `${viewport.name}: progresso regrediu ${progress.join(" -> ")}.`);
      const completionText = await page.evaluate(() => String(document.body?.innerText || "").replace(/\s+/g, " "));
      assert(/Missão concluída/i.test(completionText), `${viewport.name}: Completion não apareceu.`);
      assert(pageErrors.length === 0, `${viewport.name}: pageerror ${pageErrors.join(" | ")}`);
      assert(critical404.length === 0, `${viewport.name}: 404 crítico ${critical404.join(" | ")}`);

      await page.screenshot({ path: path.join(OUT, `m01-${viewport.name}-completion.png`), fullPage: false });
      cases.push({
        viewport: viewport.name,
        content: "PASS",
        pedagogy: "PASS",
        mechanic: "PASS",
        assets: "PASS",
        audio: "PASS",
        visual: "PASS",
        responsiveness: "PASS",
        accessibility: "PASS",
        integration: "PASS",
        regression: "PASS",
        questions: audit.ids.length,
        activities: audit.activities,
        dragDrop: audit.manifestDragDrop,
        status: "PASS"
      });
      console.log(`PASS Y1 M01 ${viewport.name}`);
    } catch (error) {
      const message = String(error?.stack || error?.message || error);
      cases.push({ viewport: viewport.name, status: "FAIL", error: message, pageErrors, critical404 });
      fatalError = error;
      console.error(`FAIL Y1 M01 ${viewport.name}: ${message}`);
      break;
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

const report = {
  contract: "DUDUQ_YEAR1_M01_OFFICIAL_HOMOLOGATION_R146_SINGLE_CHOICE",
  module: "M01",
  status: fatalError ? "FAIL" : cases.length === VIEWPORTS.length ? "PASS" : "FAIL",
  criteria: ["CONTENT", "PEDAGOGY", "MECHANIC", "ASSETS", "AUDIO", "VISUAL", "RESPONSIVENESS", "ACCESSIBILITY", "INTEGRATION", "REGRESSION"],
  canary: { revision: 146, core: "1.0.11", dragDrop: "2.0.24", targetShooter: "1.0.21" },
  canonicalRuntimeCommit: PIN,
  cases
};
await fs.writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
if (fatalError) throw fatalError;
assert(cases.length === VIEWPORTS.length, `Expected ${VIEWPORTS.length} M01 cases, got ${cases.length}.`);
console.log(JSON.stringify({ contract: report.contract, module: report.module, status: report.status, viewports: cases.length }, null, 2));
