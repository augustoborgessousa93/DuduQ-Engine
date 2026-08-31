import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const VIEWPORTS = [
  { name: "desktop", width: 1366, height: 768 },
  { name: "mobile", width: 390, height: 844 }
];
const OFFICIAL_ENTRYPOINT_MODULES = new Set([2, 3]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
const report = [];

try {
  for (const viewport of VIEWPORTS) {
    for (let moduleNumber = 2; moduleNumber <= 6; moduleNumber += 1) {
      const page = await browser.newPage({ viewport });
      const pageErrors = [];
      const consoleErrors = [];
      page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      try {
        /*
         * Módulos já oficialmente homologados que dependem de bridge fail-closed
         * de bootstrap devem ser exercitados pelo entrypoint público real. A bridge
         * existe antes do Loader, amplia a compatibilidade somente no dispatch
         * síncrono duduq:engine-ready e restaura o perfil canônico na microtask.
         * M02 e M03 já estão homologados; M04-M06 permanecem no harness universal
         * até suas homologações próprias.
         */
        const url = OFFICIAL_ENTRYPOINT_MODULES.has(moduleNumber)
          ? `${BASE}/content/english/year-1/module-${String(moduleNumber).padStart(2, "0")}/?qa=universal-loader-compat`
          : `${BASE}/test/systemic/year1-loader-compat.html?module=${moduleNumber}`;
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await page.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, { timeout: 30_000 });

        const moduleState = await page.evaluate((moduleNumber) => {
          const key = `module${String(moduleNumber).padStart(2, "0")}`;
          const module = window.DUDUQ_CONTENT?.english?.year1?.[key];
          const routerChecks = [];
          for (const activity of module?.activities || []) {
            for (let questionIndex = 0; questionIndex < (activity.questions || []).length; questionIndex += 1) {
              const question = activity.questions[questionIndex];
              const answerValue = String(question?.answer?.value ?? "");
              const items = Array.isArray(question?.payload?.items) ? question.payload.items : [];
              const targets = Array.isArray(question?.payload?.targets) ? question.payload.targets : [];
              const required = items.filter((item) => item?.required !== false);
              const targetIds = new Set(targets.map((target) => String(target?.id ?? "")).filter(Boolean));
              const directSingleEligible = Boolean(
                String(activity?.mechanic || "") === "drag-drop" &&
                String(question?.delivery?.mechanic || "") === "drag-drop" &&
                String(question?.answer?.type || "").toLowerCase() === "single" &&
                String(question?.payload?.mode || "").toLowerCase() === "single-choice" &&
                items.length >= 2 && targets.length === 1 &&
                required.length === 1 && String(required[0]?.id ?? "") === answerValue &&
                Boolean(required[0]?.targetId) && targetIds.has(String(required[0].targetId))
              );
              const decision = window.DuduQRouter?.select?.(question, {
                index: questionIndex,
                defaults: { subject: module.subject, year: module.year, module: module.module }
              });
              routerChecks.push({
                questionId: question?.id || "",
                declared: activity.mechanic || "",
                selected: decision?.selected?.mechanicId || "",
                directSingleEligible,
                rejections: (decision?.candidates || [])
                  .filter((candidate) => !candidate.eligible)
                  .map((candidate) => ({ mechanicId: candidate.mechanicId, rejections: candidate.rejections }))
              });
            }
          }
          const scriptSources = Array.from(document.scripts).map((script) => String(script.src || ""));
          const bridgeIndex = scriptSources.findIndex((src) => src.includes("/engine/duduq-router-direct-payload-compat-v1.js"));
          const loaderIndex = scriptSources.findIndex((src) => src.includes("/engine/duduq-loader-v1.js"));
          return {
            exists: Boolean(module),
            activityCount: Array.isArray(module?.activities) ? module.activities.length : 0,
            mechanics: Array.from(new Set((module?.activities || []).map((activity) => activity?.mechanic).filter(Boolean))),
            routerChecks,
            bootstrapBridge: String(window.__DUDUQ_ROUTER_DIRECT_PAYLOAD_COMPAT_V1__ || ""),
            bridgeBeforeLoader: bridgeIndex >= 0 && loaderIndex >= 0 && bridgeIndex < loaderIndex,
            requiredMechanics: Array.isArray(window.DUDUQ_GAME_CONFIG?.requiredMechanics) ? [...window.DUDUQ_GAME_CONFIG.requiredMechanics] : [],
            registeredMechanics: ["drag-drop", "target-shooter"].filter((mechanicId) => window.DuduQ?.hasMechanic?.(mechanicId) === true),
            rootText: String(document.querySelector("#root")?.textContent || "").trim(),
            documentWidth: document.documentElement.scrollWidth
          };
        }, moduleNumber);

        assert(moduleState.exists, `Y1 M${moduleNumber}: conteúdo não carregou via Loader.`);
        assert(moduleState.activityCount > 0, `Y1 M${moduleNumber}: sem atividades.`);
        assert(moduleState.mechanics.every((mechanic) => ["drag-drop", "target-shooter"].includes(mechanic)), `Y1 M${moduleNumber}: mecânica fora do contrato atual: ${moduleState.mechanics.join(", ")}`);
        const directSingles = moduleState.routerChecks.filter((check) => check.directSingleEligible);
        if (directSingles.length > 0) {
          assert(moduleState.bootstrapBridge, `Y1 M${moduleNumber}: payload direto single-choice sem bridge de bootstrap.`);
        }
        if (OFFICIAL_ENTRYPOINT_MODULES.has(moduleNumber)) {
          assert(moduleState.bridgeBeforeLoader, `Y1 M${moduleNumber}: bridge bootstrap não precede o Loader no entrypoint real.`);
          assert(moduleState.requiredMechanics.slice().sort().join(",") === "drag-drop,target-shooter", `Y1 M${moduleNumber}: requiredMechanics divergentes: ${moduleState.requiredMechanics.join(", ")}`);
          assert(moduleState.registeredMechanics.slice().sort().join(",") === "drag-drop,target-shooter", `Y1 M${moduleNumber}: DD/TS não registrados: ${moduleState.registeredMechanics.join(", ")}`);
        }
        const routerMismatches = moduleState.routerChecks.filter((check) => !check.directSingleEligible && check.declared !== check.selected);
        assert(routerMismatches.length === 0, `Y1 M${moduleNumber}: Router divergiu da Factory: ${JSON.stringify(routerMismatches)}`);
        assert(!/^Erro:/i.test(moduleState.rootText), `Y1 M${moduleNumber}: Player reportou ${moduleState.rootText}`);
        assert(moduleState.documentWidth <= viewport.width + 6, `Y1 M${moduleNumber}: overflow antes do início (${moduleState.documentWidth} > ${viewport.width}).`);

        const start = page.locator(".duduq-intro-start-button");
        await start.waitFor({ state: "visible", timeout: 30_000 });
        await start.click();

        await page.waitForFunction(() => {
          const root = document.querySelector("#root");
          if (/^Erro:/i.test(String(root?.textContent || "").trim())) return true;
          return Array.from(document.querySelectorAll("iframe")).some((frame) => {
            const rect = frame.getBoundingClientRect();
            const style = getComputedStyle(frame);
            const doc = frame.contentDocument;
            return rect.width > 40 && rect.height > 40 &&
              style.display !== "none" && style.visibility !== "hidden" &&
              Boolean(frame.srcdoc) && Boolean(doc?.documentElement) && Boolean(doc?.body);
          });
        }, null, { timeout: 30_000 });

        await page.waitForTimeout(900);
        const runtimeState = await page.evaluate(() => ({
          rootText: String(document.querySelector("#root")?.textContent || "").trim(),
          frames: Array.from(document.querySelectorAll("iframe")).map((frame) => {
            const rect = frame.getBoundingClientRect();
            const doc = frame.contentDocument;
            return {
              title: frame.title || "",
              hasSrcdoc: Boolean(frame.srcdoc),
              srcdocLength: String(frame.srcdoc || "").length,
              width: rect.width,
              height: rect.height,
              documentTitle: doc?.title || "",
              hasRoot: Boolean(doc?.querySelector?.("#root")),
              bodyTextLength: String(doc?.body?.textContent || "").trim().length
            };
          }),
          documentWidth: document.documentElement.scrollWidth,
          documentHeight: document.documentElement.scrollHeight
        }));

        assert(!/^Erro:/i.test(runtimeState.rootText), `Y1 M${moduleNumber}: erro após iniciar: ${runtimeState.rootText}`);
        const liveFrames = runtimeState.frames.filter((frame) => frame.hasSrcdoc && frame.srcdocLength > 1000 && frame.width > 40 && frame.height > 40 && frame.hasRoot);
        assert(liveFrames.length > 0, `Y1 M${moduleNumber}: runtime srcdoc não ficou ativo: ${JSON.stringify(runtimeState.frames)}`);
        assert(runtimeState.documentWidth <= viewport.width + 6, `Y1 M${moduleNumber}: overflow após início (${runtimeState.documentWidth} > ${viewport.width}).`);
        assert(pageErrors.length === 0, `Y1 M${moduleNumber}: pageerror: ${pageErrors.join(" | ")}`);
        assert(consoleErrors.filter((message) => !/Failed to load resource/i.test(message)).length === 0, `Y1 M${moduleNumber}: console error: ${consoleErrors.join(" | ")}`);

        report.push({
          viewport: viewport.name,
          module: moduleNumber,
          mechanics: moduleState.mechanics,
          requiredMechanics: moduleState.requiredMechanics,
          registeredMechanics: moduleState.registeredMechanics,
          bootstrapBridge: moduleState.bootstrapBridge,
          bridgeBeforeLoader: moduleState.bridgeBeforeLoader,
          routerChecks: moduleState.routerChecks,
          runtime: liveFrames
        });
      } finally {
        await page.close();
      }
    }
  }

  console.log(JSON.stringify({ status: "PASS", contract: "YEAR1_UNIVERSAL_LOADER_COMPAT", report }, null, 2));
} finally {
  await browser.close();
}
