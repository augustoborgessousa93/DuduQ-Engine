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

async function waitForStableStep(page, expected, timeout = 15_000) {
  await page.waitForFunction((step) => {
    const session = window.DuduQ?.getSession?.();
    const iframe = document.querySelector("iframe");
    return Boolean(
      session &&
      !session.transitioning &&
      session.stepIndex === step &&
      !session.completed &&
      iframe &&
      (iframe.srcdoc || iframe.getAttribute("src")) &&
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

    if (viewport.name === "mobile-390x844") {
      await page.emulateMedia({ reducedMotion: "reduce" });
    }

    page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
    page.on("response", (response) => {
      if (response.status() !== 404) return;
      const url = response.url();
      if (
        url.includes("/engine/") ||
        url.includes("/content/english/year-1/module-01/") ||
        url.includes("asset-catalog/runtime-index.js")
      ) critical404.push(url);
    });

    try {
      const response = await page.goto(
        `${BASE}/content/english/year-1/module-01/?qa=official-y1-m01-r146-${viewport.name}`,
        { waitUntil: "domcontentloaded", timeout: 35_000 }
      );
      assert(response?.ok(), `${viewport.name}: M01 HTTP ${response?.status()}.`);
      await page.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, { timeout: 35_000 });

      const audit = await page.evaluate(() => {
        const moduleDefinition = window.DUDUQ_CONTENT?.english?.year1?.module01;
        const questions = (moduleDefinition?.activities || []).flatMap((activity) => activity?.questions || []);
        const ids = questions.map((q) => q.id);
        const mechanics = (moduleDefinition?.activities || []).map((activity) => activity.mechanic);
        const assetKeys = [];
        const semanticAssets = [];
        const audioItems = [];

        for (const question of questions) {
          for (const item of question?.metadata?.targetShooter?.items || []) {
            if (item.imageAsset) {
              assetKeys.push(item.imageAsset);
              semanticAssets.push({ questionId: question.id, key: item.imageAsset, alt: item.alt || "", optionId: item.id });
            }
          }
          for (const target of question?.payload?.targets || []) {
            if (target.imageAsset) {
              assetKeys.push(target.imageAsset);
              semanticAssets.push({ questionId: question.id, key: target.imageAsset, alt: target.alt || target.image?.alt || "", optionId: "context" });
            }
          }
          for (const item of question?.payload?.items || []) {
            if (item.spokenText) {
              audioItems.push({
                questionId: question.id,
                id: item.id,
                spokenText: item.spokenText,
                speechLocale: item.speechLocale,
                label: item.label,
                required: item.required,
                targetId: item.targetId || null
              });
            }
          }
        }

        const uniqueAssetKeys = [...new Set(assetKeys)];
        const resolvedAssets = Object.fromEntries(
          uniqueAssetKeys.map((key) => [key, window.DuduQAssets?.resolveImageDetails?.(key) || null])
        );
        const scripts = Array.from(document.scripts).map((script) => script.src).filter(Boolean);
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
          mechanics,
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
            screenTitle: q.metadata?.screenTitle,
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
          rawHasPreview: JSON.stringify(moduleDefinition).includes('"status":"preview"'),
          rawHasDataImage: JSON.stringify(moduleDefinition).includes("data:image"),
          rawHasLegacyFallback: /legacy-fallback|procedural/i.test(JSON.stringify(moduleDefinition)),
          assetKeys: uniqueAssetKeys,
          semanticAssets,
          resolvedAssets,
          audioItems,
          manifestRevision: manifest.revision,
          manifestCore: manifest.core?.release || "",
          manifestDragDrop: manifest.mechanics?.["drag-drop"]?.release || "",
          manifestTargetShooter: manifest.mechanics?.["target-shooter"]?.release || "",
          requiredMechanics: [...(window.DUDUQ_GAME_CONFIG?.requiredMechanics || [])],
          registeredMechanics: window.DuduQ?.listMechanics?.() || [],
          scripts,
          canonicalRuntimeCommit: window.DuduQAssets?.canonicalCatalog?.runtimeCommit || ""
        };
      });

      // 1. CONTEÚDO
      assert(audit.exists, `${viewport.name}: módulo M01 ausente.`);
      assert(audit.version === "2.3.0-homolog-r145", `${viewport.name}: versão editorial do conteúdo ${audit.version}.`);
      assert(audit.ids.length === EXPECTED.length, `${viewport.name}: esperadas 12 questões, recebidas ${audit.ids.length}.`);
      assert(audit.duplicateIds.length === 0, `${viewport.name}: IDs duplicados ${audit.duplicateIds.join(",")}.`);
      assert(audit.ids.join(",") === EXPECTED.map((entry) => entry[0]).join(","), `${viewport.name}: ordem/IDs oficiais divergiram.`);
      for (const [id, answer, alternatives] of EXPECTED) {
        const actual = audit.questions.find((q) => q.id === id);
        assert(actual, `${viewport.name}: questão oficial ausente ${id}.`);
        assert(actual.answer === answer, `${viewport.name}: resposta de ${id} divergente (${actual.answer}/${answer}).`);
        assert(JSON.stringify(actual.alternatives) === JSON.stringify(alternatives), `${viewport.name}: alternativas de ${id} divergiram.`);
        assert(actual.skill.length > 0 && actual.sourceSkill.length > 0, `${viewport.name}: habilidade/rastreabilidade ausente em ${id}.`);
        assert(actual.hasFeedback, `${viewport.name}: ${id} sem feedback de acerto/erro.`);
      }

      // 2. PEDAGOGIA
      assert(audit.profile === "Y1_EARLY_LITERACY", `${viewport.name}: perfil pedagógico incorreto.`);
      assert(audit.readingDefault === "R0", `${viewport.name}: leitura padrão não é R0.`);
      assert(audit.autonomousReading === false, `${viewport.name}: leitura autônoma não pode ser requisito.`);
      assert(audit.smartSentenceScored === false, `${viewport.name}: Smart Sentence pontuado é proibido no perfil Y1.`);
      assert(audit.spec === "DUDUQ_FACTORY_PEDAGOGICAL_SPECIFICATION_v1.2", `${viewport.name}: Factory spec incorreta.`);
      assert(audit.contentSpec.includes("v2.3"), `${viewport.name}: fonte de conteúdo v2.3 ausente.`);
      assert(audit.questions.every((q) => q.readingEssential === false && q.literacyDemand === "R0"), `${viewport.name}: há questão fora do perfil R0.`);
      assert(audit.questions.every((q) => q.instructionFallback?.enabled && q.instructionFallback?.language === "pt-BR"), `${viewport.name}: instrução essencial sem fallback de áudio pt-BR.`);

      // 3. MECÂNICA + 9. INTEGRAÇÃO — contrato estático e Canary real.
      assert(audit.factoryCore === "1.0.11", `${viewport.name}: provenance Core incorreta.`);
      assert(audit.manifestRevision === 146 && audit.manifestCore === "1.0.11", `${viewport.name}: runtime não está em R146/Core 1.0.11.`);
      assert(audit.manifestDragDrop === "2.0.24", `${viewport.name}: Drag & Drop Canary ${audit.manifestDragDrop}.`);
      assert(audit.manifestTargetShooter === "1.0.21", `${viewport.name}: Target Shooter Canary ${audit.manifestTargetShooter}.`);
      assert(audit.requiredMechanics.join(",") === "target-shooter,drag-drop", `${viewport.name}: requiredMechanics inesperado ${audit.requiredMechanics.join(",")}.`);
      const registeredIds = audit.registeredMechanics.map((entry) => entry.id);
      assert(audit.requiredMechanics.every((id) => registeredIds.includes(id)), `${viewport.name}: mecânica obrigatória não registrada.`);
      assert(audit.registeredMechanics.find((entry) => entry.id === "drag-drop")?.version === "2.0.24", `${viewport.name}: DD registrado não é 2.0.24.`);
      assert(audit.mechanics.every((id) => id === "target-shooter" || id === "drag-drop"), `${viewport.name}: mecânica fora do contrato M01.`);
      assert(audit.activityTitles.every((title) => title === "GREETINGS"), `${viewport.name}: tópico visual não é GREETINGS.`);
      assert(audit.scripts.some((src) => src.includes("/engine/duduq-player-v1.js")), `${viewport.name}: Player ausente.`);
      assert(audit.scripts.some((src) => src.includes("/engine/duduq-loader-v1.js")), `${viewport.name}: Loader ausente.`);
      assert(audit.scripts.some((src) => src.includes("/engine/releases/core/1.0.11/duduq-host.js")), `${viewport.name}: Host 1.0.11 ausente.`);
      assert(audit.scripts.some((src) => src.includes("/engine/releases/core/1.0.11/duduq-router.js")), `${viewport.name}: Router 1.0.11 ausente.`);
      assert(audit.scripts.some((src) => src.includes("/engine/releases/mechanics/drag-drop/2.0.24/drag-drop.js")), `${viewport.name}: adapter DD 2.0.24 não carregou.`);

      for (const question of audit.questions) {
        if (question.delivery === "target-shooter") {
          assert(question.targetItems.length === 3, `${viewport.name}: ${question.id} deve ter 3 alvos visuais.`);
          assert(question.targetSize >= 150, `${viewport.name}: ${question.id} exige precisão motora excessiva.`);
          assert(question.targetTimer === "none" && question.targetTimeLimit === 0, `${viewport.name}: ${question.id} não pode ter timer punitivo.`);
          const urls = question.targetItems.map((item) => item.image || item.imageUrl).filter(Boolean);
          assert(new Set(urls).size === urls.length, `${viewport.name}: ${question.id} reutiliza o mesmo visual em alternativas diferentes.`);
        }
        if (question.delivery === "drag-drop") {
          assert(question.dragMode === "single-choice", `${viewport.name}: ${question.id} não usa payload.mode=single-choice.`);
          assert(question.dragItems.length === 3, `${viewport.name}: ${question.id} deve preservar 3 opções auditivas.`);
          assert(question.dragTargets.length === 1 && question.dragTargets[0].capacity === 1, `${viewport.name}: ${question.id} deve possuir um único destino de capacidade 1.`);
          const required = question.dragItems.filter((item) => item.required !== false);
          const distractors = question.dragItems.filter((item) => item.required === false);
          assert(required.length === 1 && required[0].id === question.answer && required[0].targetId === question.dragTargets[0].id, `${viewport.name}: ${question.id} perdeu o gabarito único.`);
          assert(distractors.length === 2 && distractors.every((item) => !item.targetId), `${viewport.name}: ${question.id} possui distrator com targetId.`);
          assert(question.dragItems.every((item, index) => item.label === String(index + 1)), `${viewport.name}: ${question.id} expõe leitura inglesa em vez de cards numerados.`);
          assert(question.dragItems.every((item) => item.spokenText && item.speechLocale), `${viewport.name}: ${question.id} possui opção sem áudio/locale.`);
          assert(question.dragTargets[0].imageAsset, `${viewport.name}: ${question.id} perdeu o contexto visual canônico.`);
        }
      }

      // 4. ASSETS
      assert(audit.canonicalRuntimeCommit === PIN, `${viewport.name}: catálogo canônico não está pinado.`);
      assert(audit.rawHasPreview === false, `${viewport.name}: payload contém asset preview.`);
      assert(audit.rawHasDataImage === false, `${viewport.name}: payload contém data:image.`);
      assert(audit.rawHasLegacyFallback === false, `${viewport.name}: payload contém fallback legado/procedural.`);
      assert(audit.assetKeys.length >= 10, `${viewport.name}: cobertura de assets canônicos insuficiente.`);
      assert(audit.semanticAssets.every((entry) => entry.alt.trim().length > 0), `${viewport.name}: asset sem descrição semântica.`);
      for (const key of audit.assetKeys) {
        const details = audit.resolvedAssets[key];
        assert(details?.url && details?.file, `${viewport.name}: asset '${key}' não resolvido.`);
        assert(details.catalogRuntimeCommit === PIN, `${viewport.name}: asset '${key}' perdeu provenance canônica.`);
        assert(details.strategy === "canonical-key" || details.strategy === "canonical-alias", `${viewport.name}: asset '${key}' usou estratégia ${details.strategy}.`);
      }

      // 5. ÁUDIO
      const q09Audios = audit.audioItems.filter((item) => item.questionId === "EN1-M1-09");
      assert(q09Audios.length === 3 && q09Audios.every((item) => item.speechLocale === "pt-BR"), `${viewport.name}: EN1-M1-09 precisa de 3 opções auditivas em pt-BR.`);
      assert(audit.audioItems.every((item) => item.spokenText && item.speechLocale), `${viewport.name}: item auditivo sem texto/locale.`);

      // Início do fluxo real.
      const start = page.locator(".duduq-intro-start-button");
      await start.waitFor({ state: "visible", timeout: 30_000 });
      await start.click();
      await waitForStableStep(page, 0, 35_000);
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
          brokenImages: images.filter((img) => img.currentSrc && (!img.complete || img.naturalWidth < 1)).map((img) => img.currentSrc),
          overflowX: Math.max(0, (doc?.body?.scrollWidth || 0) - (doc?.documentElement?.clientWidth || 0)),
          background: doc ? getComputedStyle(doc.body).backgroundColor : "",
          reducedMotion: root?.getAttribute("data-reduced-motion") || ""
        };
      });
      assert(tsView.heading === "GREETINGS", `${viewport.name}: Target Shooter perdeu tópico GREETINGS.`);
      assert(tsView.instruction.length > 0, `${viewport.name}: instrução do Target Shooter ausente.`);
      assert(tsView.rects.every((r) => r.width >= 44 && r.height >= 44 && r.tabIndex >= 0), `${viewport.name}: Target Shooter falhou touch/teclado.`);
      assert(tsView.audioControls >= 1, `${viewport.name}: Target Shooter sem áudio repetível.`);
      assert(tsView.brokenImages.length === 0, `${viewport.name}: imagem quebrada no Target Shooter.`);
      assert(tsView.overflowX <= 6, `${viewport.name}: overflow horizontal no Target Shooter.`);
      assert(tsView.background && tsView.background !== "rgba(0, 0, 0, 0)", `${viewport.name}: background ausente.`);
      if (viewport.name === "mobile-390x844") assert(tsView.reducedMotion === "true", `${viewport.name}: reduced-motion não propagou ao Target Shooter.`);

      assert(await page.evaluate(() => typeof window.DuduQFullscreen?.toggle === "function"), `${viewport.name}: API de fullscreen ausente.`);
      await page.evaluate(() => window.DuduQFullscreen.toggle());
      await page.waitForFunction(() => Boolean(document.fullscreenElement), null, { timeout: 5_000 });
      await page.evaluate(async () => { if (document.fullscreenElement) await document.exitFullscreen(); });
      await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 5_000 });

      // Target Shooter — espera determinística; jamais voltar para wait(450).
      const frame = page.frameLocator("iframe");
      const wrongTarget = frame.locator('.duduq-ts-target[aria-label="Lançar estrela no alvo A"]').first();
      await wrongTarget.waitFor({ state: "visible", timeout: 10_000 });
      await page.waitForFunction(() => {
        const doc = document.querySelector("iframe")?.contentDocument;
        const target = doc?.querySelector('.duduq-ts-target[aria-label="Lançar estrela no alvo A"]');
        return Boolean(target && !target.disabled);
      }, null, { timeout: 8_000 });
      await wrongTarget.click({ force: true });
      await waitForFeedback(page, "retry", 2_500);
      const tsWrong = await page.evaluate(() => ({
        session: window.DuduQ?.getSession?.(),
        feedback: document.querySelector("iframe")?.contentDocument?.querySelector(".duduq-engine-feedback")?.getAttribute("data-state") || ""
      }));
      assert(tsWrong.session?.stepIndex === 0 && tsWrong.session?.completed === false, `${viewport.name}: erro no Target Shooter avançou a etapa.`);
      assert(tsWrong.feedback === "retry", `${viewport.name}: Target Shooter não apresentou retry.`);

      const correctTarget = frame.locator('.duduq-ts-target[aria-label="Lançar estrela no alvo B"]').first();
      await correctTarget.waitFor({ state: "visible", timeout: 10_000 });
      await correctTarget.click({ force: true });
      await waitForStableStep(page, 1, 15_000);

      // Drag & Drop 2.0.24 single-choice — runtime real do M01.
      await waitForDDReady(page);
      const ddView = await page.evaluate(() => {
        const doc = document.querySelector("iframe")?.contentDocument;
        const root = doc?.querySelector(".duduq-dd2-root");
        const items = doc ? [...doc.querySelectorAll(".duduq-dd2-bank-items .duduq-dd2-item")] : [];
        const targets = doc ? [...doc.querySelectorAll(".duduq-dd2-target[data-dd2-target-id]")] : [];
        const images = doc ? [...doc.images] : [];
        return {
          root: Boolean(root),
          heading: String(doc?.querySelector(".duduq-engine-heading h1,h1")?.textContent || "").trim(),
          itemTexts: items.map((el) => String(el.textContent || "").replace(/\s+/g, " ").trim()),
          itemTabIndexes: items.map((el) => el.tabIndex),
          itemRects: items.map((el) => { const r = el.getBoundingClientRect(); return { width: r.width, height: r.height }; }),
          audioCount: items.filter((el) => el.getAttribute("data-has-audio") === "true").length,
          targetCount: targets.length,
          targetImageCount: targets.filter((target) => Boolean(target.querySelector(".duduq-dd2-target-media"))).length,
          confirmVisible: Boolean(doc?.querySelector(".duduq-dd2-confirm")),
          brokenImages: images.filter((img) => img.currentSrc && (!img.complete || img.naturalWidth < 1)).map((img) => img.currentSrc),
          overflowX: Math.max(0, (doc?.body?.scrollWidth || 0) - (doc?.documentElement?.clientWidth || 0)),
          reducedMotion: root?.getAttribute("data-reduced-motion") || ""
        };
      });
      assert(ddView.root, `${viewport.name}: Drag & Drop DD2 não montou.`);
      assert(ddView.heading === "GREETINGS", `${viewport.name}: Drag & Drop perdeu tópico GREETINGS.`);
      assert(ddView.itemTexts.length === 3 && ["1", "2", "3"].every((label) => ddView.itemTexts.includes(label)), `${viewport.name}: DD não preservou os 3 cards numéricos.`);
      assert(ddView.audioCount === 3, `${viewport.name}: DD não expôs áudio nas 3 alternativas.`);
      assert(ddView.itemTabIndexes.every((value) => value >= 0), `${viewport.name}: DD sem acesso por teclado nos cards.`);
      assert(ddView.itemRects.every((r) => r.width >= 44 && r.height >= 44), `${viewport.name}: DD possui alvo menor que 44px.`);
      assert(ddView.targetCount === 1 && ddView.targetImageCount === 1, `${viewport.name}: DD perdeu o único contexto visual.`);
      assert(ddView.confirmVisible === false, `${viewport.name}: single-choice não deve exigir CONFIRMAR.`);
      assert(ddView.brokenImages.length === 0, `${viewport.name}: imagem quebrada no DD.`);
      assert(ddView.overflowX <= 6, `${viewport.name}: overflow horizontal no DD.`);
      if (viewport.name === "mobile-390x844") assert(ddView.reducedMotion === "true", `${viewport.name}: reduced-motion não propagou ao DD.`);

      const ddFrame = page.frameLocator("iframe");

      // Áudio/replay observável nas três alternativas.
      for (const id of ["A", "B", "C"]) {
        const item = ddFrame.locator(`.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="${id}"]`).first();
        await item.waitFor({ state: "visible", timeout: 5_000 });
        await item.click({ force: true });
        await page.waitForFunction((itemId) => {
          const doc = document.querySelector("iframe")?.contentDocument;
          return Boolean(doc?.querySelector(`.duduq-dd2-item[data-dd2-item-id="${itemId}"][data-audio-playing="true"]`));
        }, id, { timeout: 1_500 });
        await page.waitForFunction(() => {
          const doc = document.querySelector("iframe")?.contentDocument;
          return !doc?.querySelector(".duduq-dd2-item[data-audio-playing='true']");
        }, null, { timeout: 6_000 });
      }

      // Fluxo obrigatório real: distrator A → retry → mesma questão → destino liberado → correto C → success → progresso.
      const wrongItem = ddFrame.locator('.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="A"]').first();
      const targetZone = ddFrame.locator(".duduq-dd2-zone").first();
      await wrongItem.click({ force: true });
      await targetZone.waitFor({ state: "visible", timeout: 5_000 });
      await targetZone.click({ force: true });
      await waitForFeedback(page, "retry", 3_000);

      const ddWrong = await page.evaluate(() => {
        const doc = document.querySelector("iframe")?.contentDocument;
        const session = window.DuduQ?.getSession?.();
        return {
          session,
          feedback: doc?.querySelector(".duduq-engine-feedback")?.getAttribute("data-state") || "",
          confirmVisible: Boolean(doc?.querySelector(".duduq-dd2-confirm"))
        };
      });
      assert(ddWrong.session?.stepIndex === 1 && ddWrong.session?.completed === false, `${viewport.name}: distrator DD avançou/concluiu.`);
      assert(ddWrong.feedback === "retry", `${viewport.name}: distrator DD não produziu retry.`);
      assert(ddWrong.confirmVisible === false, `${viewport.name}: single-choice exibiu CONFIRMAR após erro.`);

      await page.waitForFunction(() => {
        const doc = document.querySelector("iframe")?.contentDocument;
        const bankWrong = doc?.querySelector('.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="A"]');
        const zoneWrong = doc?.querySelector('.duduq-dd2-zone .duduq-dd2-item[data-dd2-item-id="A"]');
        const correct = doc?.querySelector('.duduq-dd2-item[data-dd2-item-id="C"]');
        const cards = [...(doc?.querySelectorAll(".duduq-dd2-bank .duduq-dd2-item") || [])];
        return Boolean(bankWrong && !zoneWrong && correct && !correct.disabled && cards.length === 3 && cards.every((item) => !item.disabled));
      }, null, { timeout: 3_500 });
      const afterRetry = await page.evaluate(() => ({
        stepIndex: window.DuduQ?.getSession?.()?.stepIndex,
        zoneCount: document.querySelector("iframe")?.contentDocument?.querySelectorAll(".duduq-dd2-zone .duduq-dd2-item").length || 0
      }));
      assert(afterRetry.stepIndex === 1 && afterRetry.zoneCount === 0, `${viewport.name}: retry não preservou a questão/liberou o destino.`);

      const correctAfterRetry = ddFrame.locator('.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="C"]').first();
      await correctAfterRetry.click({ force: true });
      await targetZone.click({ force: true });
      await waitForFeedback(page, "success", 5_000);
      await waitForStableStep(page, 2, 15_000);

      // Correto direto no M01 real: Q03 = alternativa A.
      await waitForDDReady(page);
      const directFrame = page.frameLocator("iframe");
      const directCorrect = directFrame.locator('.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="A"]').first();
      const directZone = directFrame.locator(".duduq-dd2-zone").first();
      await directCorrect.click({ force: true });
      await directZone.click({ force: true });
      await waitForFeedback(page, "success", 5_000);
      await waitForStableStep(page, 3, 15_000);

      // 10. REGRESSÃO proporcional: restante do M01 deve progredir até Completion.
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
      assert(pageErrors.length === 0, `${viewport.name}: pageerror: ${pageErrors.join(" | ")}`);
      assert(critical404.length === 0, `${viewport.name}: 404 crítico: ${critical404.join(" | ")}`);

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
        progress,
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
