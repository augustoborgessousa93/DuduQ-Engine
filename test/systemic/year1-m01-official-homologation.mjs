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

function flattenQuestions(moduleDefinition) {
  return (moduleDefinition?.activities || []).flatMap((activity) => activity?.questions || []);
}

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const cases = [];

try {
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport });
    const pageErrors = [];
    const critical404 = [];

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
        `${BASE}/content/english/year-1/module-01/?qa=official-y1-m01-${viewport.name}`,
        { waitUntil: "domcontentloaded", timeout: 35_000 }
      );
      assert(response?.ok(), `${viewport.name}: M01 HTTP ${response?.status()}.`);
      await page.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, { timeout: 35_000 });

      const audit = await page.evaluate((expected) => {
        const moduleDefinition = window.DUDUQ_CONTENT?.english?.year1?.module01;
        const questions = (moduleDefinition?.activities || []).flatMap((activity) => activity?.questions || []);
        const ids = questions.map((q) => q.id);
        const mechanics = (moduleDefinition?.activities || []).map((activity) => activity.mechanic);
        const assetKeys = [];
        for (const question of questions) {
          for (const item of question?.metadata?.targetShooter?.items || []) {
            if (item.imageAsset) assetKeys.push(item.imageAsset);
          }
          for (const side of ["leftItems", "rightItems"]) {
            for (const item of question?.metadata?.matching?.[side] || []) {
              if (item.imageAsset) assetKeys.push(item.imageAsset);
            }
          }
        }
        const uniqueAssetKeys = [...new Set(assetKeys)];
        const resolvedAssets = Object.fromEntries(
          uniqueAssetKeys.map((key) => [key, window.DuduQAssets?.resolveImageDetails?.(key) || null])
        );
        const scripts = Array.from(document.scripts).map((script) => script.src).filter(Boolean);
        const q09 = questions.find((q) => q.id === "EN1-M1-09");
        const matchingLocales = (q09?.metadata?.matching?.rightItems || []).map((item) => item.speechLocale);
        const interactiveAudioItems = questions.flatMap((q) => [
          ...(q?.metadata?.matching?.leftItems || []),
          ...(q?.metadata?.matching?.rightItems || [])
        ]).filter((item) => item.spokenText);
        return {
          exists: Boolean(moduleDefinition),
          version: moduleDefinition?.version || "",
          title: moduleDefinition?.title || "",
          profile: moduleDefinition?.pedagogyPolicy?.profile || "",
          readingDefault: moduleDefinition?.pedagogyPolicy?.readingDefault || "",
          readingMax: moduleDefinition?.pedagogyPolicy?.readingMax || "",
          spec: moduleDefinition?.pedagogyPolicy?.specification || "",
          contentSpec: moduleDefinition?.pedagogyPolicy?.contentSpecification || "",
          autonomousReading: moduleDefinition?.pedagogyPolicy?.autonomousEnglishReadingRequired,
          smartSentenceScored: moduleDefinition?.pedagogyPolicy?.smartSentenceScored,
          factoryEngine: moduleDefinition?.factory?.engine || "",
          factoryCore: moduleDefinition?.factory?.core || "",
          activities: moduleDefinition?.activities?.length || 0,
          activityTitles: (moduleDefinition?.activities || []).map((activity) => activity.title),
          mechanics,
          ids,
          duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
          questions: questions.map((q) => ({
            id: q.id,
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
            matchingRightCount: q.metadata?.matching?.rightItems?.length || 0,
            matchingPairCount: q.metadata?.matching?.pairs?.length || 0
          })),
          rawHasPreview: JSON.stringify(moduleDefinition).includes('"status":"preview"'),
          rawHasDataImage: JSON.stringify(moduleDefinition).includes("data:image"),
          assetKeys: uniqueAssetKeys,
          resolvedAssets,
          q09Locales: matchingLocales,
          allAudioItemsHaveLocale: interactiveAudioItems.every((item) => Boolean(item.speechLocale)),
          manifestRevision: window.DUDUQ_ENGINE_MANIFEST?.revision,
          manifestCore: window.DUDUQ_ENGINE_MANIFEST?.core?.release || "",
          requiredMechanics: [...(window.DUDUQ_GAME_CONFIG?.requiredMechanics || [])],
          registeredMechanics: window.DuduQ?.listMechanics?.().map((item) => item.id) || [],
          scripts,
          canonicalRuntimeCommit: window.DuduQAssets?.canonicalCatalog?.runtimeCommit || ""
        };
      }, EXPECTED);

      assert(audit.exists, `${viewport.name}: módulo M01 ausente.`);
      assert(audit.version === "2.3.0-homolog-r145", `${viewport.name}: versão do conteúdo ${audit.version}.`);
      assert(audit.profile === "Y1_EARLY_LITERACY", `${viewport.name}: perfil pedagógico incorreto.`);
      assert(audit.readingDefault === "R0", `${viewport.name}: leitura padrão não é R0.`);
      assert(audit.autonomousReading === false, `${viewport.name}: leitura autônoma não pode ser requisito.`);
      assert(audit.smartSentenceScored === false, `${viewport.name}: Smart Sentence pontuado é proibido no perfil Y1.`);
      assert(audit.spec === "DUDUQ_FACTORY_PEDAGOGICAL_SPECIFICATION_v1.2", `${viewport.name}: Factory spec incorreta.`);
      assert(audit.contentSpec.includes("v2.3"), `${viewport.name}: fonte de conteúdo v2.3 ausente.`);
      assert(audit.factoryEngine === "Canary R145" && audit.factoryCore === "1.0.11", `${viewport.name}: provenance runtime incorreta.`);
      assert(audit.manifestRevision === 145 && audit.manifestCore === "1.0.11", `${viewport.name}: runtime não está em R145/Core 1.0.11.`);
      assert(audit.canonicalRuntimeCommit === PIN, `${viewport.name}: catálogo canônico não está pinado no commit homologado.`);
      assert(audit.requiredMechanics.join(",") === "target-shooter,matching", `${viewport.name}: requiredMechanics inesperado ${audit.requiredMechanics.join(",")}.`);
      assert(audit.requiredMechanics.every((id) => audit.registeredMechanics.includes(id)), `${viewport.name}: mecânica obrigatória não registrada.`);
      assert(audit.mechanics.every((id) => id === "target-shooter" || id === "matching"), `${viewport.name}: mecânica fora do perfil homologado em M01.`);
      assert(audit.activityTitles.every((title) => title === "GREETINGS"), `${viewport.name}: tópico visual não é GREETINGS em todas as atividades.`);
      assert(audit.duplicateIds.length === 0, `${viewport.name}: IDs duplicados ${audit.duplicateIds.join(",")}.`);
      assert(audit.ids.length === expected.length, `${viewport.name}: esperadas ${expected.length} questões, recebidas ${audit.ids.length}.`);
      assert(audit.ids.join(",") === expected.map((entry) => entry[0]).join(","), `${viewport.name}: ordem/IDs oficiais divergiram.`);

      for (const [id, answer, alternatives] of expected) {
        const actual = audit.questions.find((q) => q.id === id);
        assert(actual, `${viewport.name}: questão oficial ausente ${id}.`);
        assert(actual.answer === answer, `${viewport.name}: resposta de ${id} divergente (${actual.answer}/${answer}).`);
        assert(JSON.stringify(actual.alternatives) === JSON.stringify(alternatives), `${viewport.name}: alternativas de ${id} divergiram.`);
        assert(actual.readingEssential === false && actual.literacyDemand === "R0", `${viewport.name}: ${id} exige leitura indevida.`);
        assert(actual.screenTitle === "GREETINGS", `${viewport.name}: ${id} sem tópico semântico.`);
        assert(actual.hasFeedback, `${viewport.name}: ${id} sem feedback de acerto/erro.`);
        if (actual.delivery === "target-shooter") {
          assert(actual.targetSize >= 150, `${viewport.name}: ${id} exige precisão motora excessiva.`);
          assert(actual.targetTimer === "none" && actual.targetTimeLimit === 0, `${viewport.name}: ${id} não pode ter timer punitivo.`);
        }
        if (actual.delivery === "matching") {
          assert(actual.matchingRightCount === 3 && actual.matchingPairCount === 1, `${viewport.name}: ${id} deve ter 3 opções auditivas e 1 resposta inequívoca.`);
        }
      }

      assert(audit.rawHasPreview === false, `${viewport.name}: payload ainda contém asset preview.`);
      assert(audit.rawHasDataImage === false, `${viewport.name}: payload ainda contém asset procedural data:image.`);
      assert(audit.assetKeys.length >= 10, `${viewport.name}: cobertura de assets canônicos insuficiente.`);
      for (const key of audit.assetKeys) {
        const details = audit.resolvedAssets[key];
        assert(details?.url && details?.file, `${viewport.name}: asset '${key}' não resolvido.`);
        assert(details.catalogRuntimeCommit === PIN, `${viewport.name}: asset '${key}' perdeu provenance canônica.`);
        assert(details.strategy === "canonical-key" || details.strategy === "canonical-alias", `${viewport.name}: asset '${key}' usou estratégia ${details.strategy}.`);
      }
      assert(audit.q09Locales.length === 3 && audit.q09Locales.every((locale) => locale === "pt-BR"), `${viewport.name}: opções auditivas de EN1-M1-09 precisam estar em pt-BR.`);
      assert(audit.allAudioItemsHaveLocale, `${viewport.name}: item auditivo sem locale explícito.`);
      assert(audit.scripts.some((src) => src.includes("/engine/duduq-player-v1.js")), `${viewport.name}: Player ausente.`);
      assert(audit.scripts.some((src) => src.includes("/engine/duduq-loader-v1.js")), `${viewport.name}: Loader ausente.`);
      assert(audit.scripts.some((src) => src.includes("/engine/releases/core/1.0.11/duduq-host.js")), `${viewport.name}: Host 1.0.11 ausente.`);
      assert(audit.scripts.some((src) => src.includes("/engine/releases/core/1.0.11/duduq-router.js")), `${viewport.name}: Router 1.0.11 ausente.`);

      const start = page.locator(".duduq-intro-start-button");
      await start.waitFor({ state: "visible", timeout: 30_000 });
      await start.click();
      await page.waitForFunction(() => {
        const session = window.DuduQ?.getSession?.();
        const iframe = document.querySelector("iframe");
        return Boolean(
          session && session.stepIndex === 0 && !session.transitioning &&
          iframe && (iframe.srcdoc || iframe.getAttribute("src")) &&
          window.DuduQTransition?.getState?.() === "idle"
        );
      }, null, { timeout: 35_000 });

      await page.waitForFunction(() => {
        const iframe = document.querySelector("iframe");
        const doc = iframe?.contentDocument;
        return Boolean(doc?.querySelector(".duduq-ts-root") && doc.querySelectorAll(".duduq-ts-target").length >= 3);
      }, null, { timeout: 20_000 });

      const firstView = await page.evaluate(() => {
        const iframe = document.querySelector("iframe");
        const doc = iframe?.contentDocument;
        const targets = doc ? [...doc.querySelectorAll(".duduq-ts-target")] : [];
        const images = doc ? [...doc.images] : [];
        const interactive = doc ? [...doc.querySelectorAll("button,[role='button']")] : [];
        const targetRects = targets.map((target) => {
          const rect = target.getBoundingClientRect();
          return { width: rect.width, height: rect.height, disabled: target.disabled, tabIndex: target.tabIndex };
        });
        return {
          heading: String(doc?.querySelector(".duduq-engine-heading h1,h1")?.textContent || "").trim(),
          instruction: String(doc?.querySelector(".duduq-ts-instruction h2,.duduq-ts-instruction")?.textContent || "").replace(/\s+/g, " ").trim(),
          targetCount: targets.length,
          targetRects,
          brokenImages: images.filter((img) => img.currentSrc && (!img.complete || img.naturalWidth < 1)).map((img) => img.currentSrc),
          bodyWidth: doc?.body?.scrollWidth || 0,
          clientWidth: doc?.documentElement?.clientWidth || 0,
          interactiveLabels: interactive.map((el) => el.getAttribute("aria-label") || el.textContent || "").map((s) => String(s).trim()).filter(Boolean),
          hasAudioControl: interactive.some((el) => /áudio|audio|ouvir|som/i.test(String(el.getAttribute("aria-label") || el.textContent || ""))),
          rootReducedMotion: doc?.querySelector(".duduq-ts-root")?.getAttribute("data-reduced-motion") || ""
        };
      });

      assert(firstView.heading === "GREETINGS", `${viewport.name}: header exibiu '${firstView.heading}' em vez de GREETINGS.`);
      assert(firstView.instruction.length > 0, `${viewport.name}: instrução não apareceu.`);
      assert(firstView.targetCount === 3, `${viewport.name}: primeira questão não exibiu 3 alternativas.`);
      assert(firstView.targetRects.every((rect) => rect.width >= 44 && rect.height >= 44), `${viewport.name}: touch target abaixo de 44px.`);
      assert(firstView.targetRects.every((rect) => rect.tabIndex >= 0), `${viewport.name}: alvo sem acesso por teclado.`);
      assert(firstView.brokenImages.length === 0, `${viewport.name}: imagem quebrada ${firstView.brokenImages.join(" | ")}.`);
      assert(Math.max(0, firstView.bodyWidth - firstView.clientWidth) <= 6, `${viewport.name}: overflow horizontal no Target Shooter.`);
      assert(firstView.hasAudioControl, `${viewport.name}: áudio repetível não está exposto na atividade.`);
      assert(pageErrors.length === 0, `${viewport.name}: pageerror antes da interação: ${pageErrors.join(" | ")}`);
      assert(critical404.length === 0, `${viewport.name}: 404 crítico antes da interação: ${critical404.join(" | ")}`);

      const readyScreenshot = path.join(OUT, `m01-${viewport.name}-target-ready.png`);
      await page.screenshot({ path: readyScreenshot, fullPage: false });

      // Acessibilidade/fullscreen: a API deve existir e entrar/sair sem quebrar a atividade.
      assert(await page.evaluate(() => typeof window.DuduQFullscreen?.toggle === "function"), `${viewport.name}: API de fullscreen ausente.`);
      await page.evaluate(() => window.DuduQFullscreen.toggle());
      await page.waitForFunction(() => Boolean(document.fullscreenElement), null, { timeout: 5_000 });
      await page.evaluate(async () => { if (document.fullscreenElement) await document.exitFullscreen(); });
      await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 5_000 });

      // Mecânica real: um erro não pode avançar a etapa; a tentativa correta deve avançar.
      const frame = page.frameLocator("iframe");
      const wrongTarget = frame.locator(".duduq-ts-target").filter({ has: frame.locator('img[alt="Cena de despedida e saída"]') }).first();
      await wrongTarget.waitFor({ state: "visible", timeout: 10_000 });
      await wrongTarget.click({ force: true });
      await page.waitForTimeout(350);
      const afterWrong = await page.evaluate(() => window.DuduQ.getSession());
      assert(afterWrong.stepIndex === 0 && afterWrong.completed === false, `${viewport.name}: erro avançou indevidamente a etapa.`);

      const correctTarget = frame.locator(".duduq-ts-target").filter({ has: frame.locator('img[alt="Cena de chegada e cumprimento"]') }).first();
      await correctTarget.waitFor({ state: "visible", timeout: 10_000 });
      await correctTarget.click({ force: true });
      await page.waitForFunction(() => {
        const session = window.DuduQ?.getSession?.();
        return Boolean(session && !session.transitioning && session.stepIndex === 1);
      }, null, { timeout: 12_000 });

      await page.waitForFunction(() => {
        const iframe = document.querySelector("iframe");
        const doc = iframe?.contentDocument;
        return Boolean(doc?.querySelector(".duduq-matching-root"));
      }, null, { timeout: 15_000 });

      const matchingView = await page.evaluate(() => {
        const iframe = document.querySelector("iframe");
        const doc = iframe?.contentDocument;
        const buttons = doc ? [...doc.querySelectorAll("button,[role='button']")] : [];
        const images = doc ? [...doc.images] : [];
        return {
          root: Boolean(doc?.querySelector(".duduq-matching-root")),
          heading: String(doc?.querySelector(".duduq-engine-heading h1,h1")?.textContent || "").trim(),
          buttons: buttons.length,
          audioControls: buttons.filter((el) => /áudio|audio|ouvir|som/i.test(String(el.getAttribute("aria-label") || el.textContent || ""))).length,
          focusableButtons: buttons.filter((el) => el.tabIndex >= 0).length,
          brokenImages: images.filter((img) => img.currentSrc && (!img.complete || img.naturalWidth < 1)).map((img) => img.currentSrc),
          bodyWidth: doc?.body?.scrollWidth || 0,
          clientWidth: doc?.documentElement?.clientWidth || 0
        };
      });
      assert(matchingView.root, `${viewport.name}: Matching não montou na etapa 2.`);
      assert(matchingView.heading === "GREETINGS", `${viewport.name}: Matching perdeu tópico GREETINGS.`);
      assert(matchingView.buttons >= 3 && matchingView.focusableButtons >= 3, `${viewport.name}: Matching sem controles acessíveis suficientes.`);
      assert(matchingView.audioControls >= 3, `${viewport.name}: Matching não expôs as 3 opções auditivas.`);
      assert(matchingView.brokenImages.length === 0, `${viewport.name}: imagem quebrada no Matching.`);
      assert(Math.max(0, matchingView.bodyWidth - matchingView.clientWidth) <= 6, `${viewport.name}: overflow horizontal no Matching.`);
      await page.screenshot({ path: path.join(OUT, `m01-${viewport.name}-matching-ready.png`), fullPage: false });

      // Integração e regressão do próprio módulo: todas as demais atividades devem validar/montar,
      // progredir monotonicamente e alcançar Completion sem JS blocker ou 404 crítico.
      const progress = [];
      let session = await page.evaluate(() => window.DuduQ.getSession());
      progress.push(session.progress?.percent ?? 0);
      while (!session.completed) {
        const current = session.stepIndex;
        const accepted = await page.evaluate((stepIndex) => window.DuduQ.next({ qa: "official-y1-m01", stepIndex }), current);
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
        progress,
        status: "PASS"
      });
      console.log(`PASS Y1 M01 ${viewport.name}`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

const report = {
  contract: "DUDUQ_YEAR1_M01_OFFICIAL_HOMOLOGATION_V1",
  module: "M01",
  status: cases.length === VIEWPORTS.length ? "PASS" : "FAIL",
  criteria: [
    "CONTENT",
    "PEDAGOGY",
    "MECHANIC",
    "ASSETS",
    "AUDIO",
    "VISUAL",
    "RESPONSIVENESS",
    "ACCESSIBILITY",
    "INTEGRATION",
    "REGRESSION"
  ],
  canary: { revision: 145, core: "1.0.11" },
  canonicalRuntimeCommit: PIN,
  cases
};

await fs.writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
assert(cases.length === VIEWPORTS.length, `Expected ${VIEWPORTS.length} M01 cases, got ${cases.length}.`);
console.log(JSON.stringify({ contract: report.contract, module: report.module, status: report.status, viewports: cases.length }, null, 2));
