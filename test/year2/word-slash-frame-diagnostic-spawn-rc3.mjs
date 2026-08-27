import { chromium } from "playwright";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const MODULE_URL = `${BASE_URL}/content/english/year-2/module-01/index.html?qa=word-slash-spawn-rc3`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
page.setDefaultTimeout(15_000);
page.setDefaultNavigationTimeout(20_000);

page.on("console", (message) => {
  const text = message.text();
  if (text.includes("WSDBG")) console.log(`[BROWSER] ${text}`);
});
page.on("pageerror", (error) => console.log(`[PAGEERROR] ${error.message}`));
page.on("requestfailed", (request) => console.log(`[REQUESTFAILED] ${request.url()} ${request.failure()?.errorText || ""}`));

await page.route("**/engine/duduq-player-v1.js*", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/javascript; charset=utf-8",
    body: "window.__DUDUQ_QA_PLAYER_SUPPRESSED__=true;"
  });
});

await page.goto(MODULE_URL, { waitUntil: "domcontentloaded", timeout: 20_000 });
await page.waitForFunction(() => Boolean(
  window.DUDUQ_CONTENT?.english?.year2?.module01v23multimodal?.mechanicsRegressionAudit &&
  window.DuduQ?.hasMechanic?.("word-slash")
), null, { timeout: 20_000 });

const start = await page.evaluate(() => {
  try { window.DuduQIntro?.hide?.({ immediate: true, reason: "qa-word-slash-spawn-rc3" }); } catch (_) {}
  try { window.DuduQTransition?.hideImmediate?.(); } catch (_) {}
  try { window.DuduQ?.destroy?.(); } catch (_) {}
  document.documentElement.removeAttribute("data-duduq-initial-speech-gate");

  const upstreamFetch = window.fetch.bind(window);
  window.fetch = async function wordSlashSpawnDiagnosticFetch(input, init) {
    const response = await upstreamFetch(input, init);
    const url = typeof input === "string" ? input : String(input?.url || response.url || "");
    if (!/\/DUDUQ_WORD_SLASH\.html(?:\?|$)/i.test(url)) return response;

    let html = await response.text();
    const replacements = [
      [
        "const spawnObject = useCallback((preferredId) => {",
        "const spawnObject = useCallback((preferredId) => { try{console.log('WSDBG spawn-enter '+JSON.stringify({preferredId,interactionDisabled,completion:completionRef.current,objectCount:objectsRef.current.length,maxObjects:question.difficulty.maxObjects}))}catch(_){};"
      ],
      [
        "const arenaWidth = arena.clientWidth;\n      const arenaHeight = arena.clientHeight;",
        "const arenaWidth = arena.clientWidth;\n      const arenaHeight = arena.clientHeight; try{console.log('WSDBG arena '+JSON.stringify({arenaWidth,arenaHeight,sourceId:source?.id,sourceType:source?.type,sourceLabel:source?.label}))}catch(_){};"
      ],
      [
        "const metrics = cardMetrics(source, arenaWidth);",
        "const metrics = cardMetrics(source, arenaWidth); try{console.log('WSDBG metrics '+JSON.stringify(metrics))}catch(_){};"
      ],
      [
        "const lane = chooseLane(arenaWidth, metrics.width, current, random);",
        "const lane = chooseLane(arenaWidth, metrics.width, current, random); try{console.log('WSDBG lane '+JSON.stringify(lane))}catch(_){};"
      ],
      [
        "objectsRef.current = [...current, instance];\n      setObjects([...objectsRef.current]);",
        "try{console.log('WSDBG before-setObjects '+JSON.stringify({instanceId:instance.instanceId,x:instance.x,y:instance.y,gravity:instance.gravity,velocityX:instance.velocityX,velocityY:instance.velocityY,durationMs:instance.durationMs}))}catch(_){}; objectsRef.current = [...current, instance];\n      setObjects([...objectsRef.current]); try{console.log('WSDBG after-setObjects '+objectsRef.current.length)}catch(_){};"
      ],
      [
        "if (!initialSpawnedRef.current) {\n        initialSpawnedRef.current = true;",
        "if (!initialSpawnedRef.current) { try{console.log('WSDBG initial-effect '+JSON.stringify({interactionDisabled,ids:presentation.initialObjectIds || [],spawnEveryMs:question.difficulty.spawnEveryMs,spawnFactor:gradeSpeedProfile.spawnFactor}))}catch(_){};\n        initialSpawnedRef.current = true;"
      ],
      [
        "const physicsTick = useCallback((now) => {",
        "const physicsTick = useCallback((now) => { if(!window.__DUDUQ_WS_PHYSICS_LOGGED__){window.__DUDUQ_WS_PHYSICS_LOGGED__=true;try{console.log('WSDBG physics-start '+JSON.stringify({now,objects:objectsRef.current.length}))}catch(_){}}"
      ]
    ];

    const patchReport = [];
    for (const [from, to] of replacements) {
      const found = html.includes(from);
      patchReport.push({ marker: from.slice(0, 52), found });
      if (found) html = html.replace(from, to);
    }
    console.log("WSDBG parent-patch-report " + JSON.stringify(patchReport));

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  };

  const built = window.DUDUQ_CONTENT.english.year2.module01v23multimodal;
  const activity = (built.activities || []).find((entry) =>
    (entry.questions || []).some((question) => question.id === "EN2-M1-08")
  );
  if (!activity) throw new Error("EN2-M1-08 activity not found.");
  const question = JSON.parse(JSON.stringify(activity.questions.find((entry) => entry.id === "EN2-M1-08")));
  const mechanic = question.delivery?.mechanic || activity.mechanic;
  window.DuduQ.destroy();
  const started = window.DuduQ.start({
    id: "qa-word-slash-spawn-EN2-M1-08",
    title: "QA EN2-M1-08",
    year: built.year,
    subject: built.subject,
    module: built.module,
    container: "#root",
    steps: [{
      id: "qa-EN2-M1-08",
      mechanic,
      payload: {
        id: "qa-EN2-M1-08-payload",
        title: activity.title || "EN2-M1-08",
        subject: built.subject,
        year: built.year,
        module: built.module,
        questions: [question]
      },
      options: { contentVersion: built.version, skill: activity.skill || null }
    }]
  });
  return { started: Boolean(started), mechanic };
});

console.log("[RC3] start " + JSON.stringify(start));

// The external workflow timeout is intentional: if the renderer locks during
// the first spawn, console checkpoints emitted immediately before the lock are
// still preserved in the Actions log.
await page.waitForTimeout(4_000).catch(() => {});

try {
  const state = await Promise.race([
    page.evaluate(() => {
      const frame = document.querySelector("#root iframe");
      const doc = frame?.contentDocument;
      return {
        srcdocLength: String(frame?.srcdoc || "").length,
        wsRoot: doc?.querySelectorAll(".duduq-ws-root").length || 0,
        wsObjects: doc?.querySelectorAll(".duduq-ws-object").length || 0
      };
    }),
    new Promise((resolve) => setTimeout(() => resolve({ stateRead: "timeout" }), 1200))
  ]);
  console.log("[RC3] final " + JSON.stringify(state));
} catch (error) {
  console.log("[RC3] final-error " + error.message);
}

await Promise.race([page.close().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 800))]);
await Promise.race([browser.close().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 800))]);
