import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const PIN = "f0f8bed8e8c24fad4eae204bf4a5cc84a8d8263f";
const OUT = path.resolve("test-results/systemic/year1-m02-official");
const VIEWPORTS = [
  { name: "desktop-1366x768", width: 1366, height: 768 },
  { name: "fullhd-1920x1080", width: 1920, height: 1080 },
  { name: "tablet-768x1024", width: 768, height: 1024 },
  { name: "mobile-390x844", width: 390, height: 844, mobile: true }
];
const EXPECTED = [
  ["EN1-M2-01","A",["one","two","three"],"target-shooter"],
  ["EN1-M2-02","B",["one","two","three"],"drag-drop"],
  ["EN1-M2-03","B",["two","three","four"],"target-shooter"],
  ["EN1-M2-04","B",["three","four","five"],"drag-drop"],
  ["EN1-M2-05","B",["four","five","six"],"target-shooter"],
  ["EN1-M2-06","B",["five","six","seven"],"drag-drop"],
  ["EN1-M2-07","B",["six","seven","eight"],"target-shooter"],
  ["EN1-M2-08","B",["seven","eight","nine"],"drag-drop"],
  ["EN1-M2-09","B",["eight","nine","ten"],"target-shooter"],
  ["EN1-M2-10","C",["eight","nine","ten"],"drag-drop"],
  ["EN1-M2-11","A",["six – seven – eight","six – eight – seven","seven – six – eight"],"drag-drop"],
  ["EN1-M2-12","A",["3 – 10","10 – 3","3 – 9"],"drag-drop"]
];
function assert(condition, message) { if (!condition) throw new Error(message); }
async function waitStableStep(page, step, timeout = 20_000) {
  await page.waitForFunction((expected) => {
    const s = window.DuduQ?.getSession?.(); const iframe = document.querySelector("iframe");
    return Boolean(s && s.stepIndex === expected && s.transitioning === false && s.completed === false && iframe && (iframe.srcdoc || iframe.getAttribute("src")) && window.DuduQTransition?.getState?.() === "idle");
  }, step, { timeout });
}
async function waitFeedback(page, state, timeout = 5_000) {
  await page.waitForFunction((expected) => document.querySelector("iframe")?.contentDocument?.querySelector(".duduq-engine-feedback")?.getAttribute("data-state") === expected, state, { timeout });
}
async function waitTSReady(page, timeout = 10_000) {
  await page.waitForFunction(() => {
    const doc = document.querySelector("iframe")?.contentDocument;
    const targets = [...(doc?.querySelectorAll(".duduq-ts-target") || [])];
    const controls = [...(doc?.querySelectorAll("button,[role='button']") || [])].filter((button) => /áudio|audio|ouvir|som|instruction/i.test(String(button.getAttribute("aria-label") || button.textContent || "")));
    const busy = controls.some((button) => Boolean(button.disabled) || /reprodução|playing/i.test(String(button.getAttribute("aria-label") || "")));
    return Boolean(doc?.querySelector(".duduq-ts-root") && targets.length === 3 && targets.every((target) => !target.disabled) && !busy);
  }, null, { timeout });
}
async function waitDDReady(page, timeout = 10_000) {
  await page.waitForFunction(() => {
    const doc = document.querySelector("iframe")?.contentDocument;
    const items = [...(doc?.querySelectorAll(".duduq-dd2-bank-items .duduq-dd2-item") || [])];
    return Boolean(doc?.querySelector(".duduq-dd2-root") && doc?.querySelector(".duduq-dd2-target[data-dd2-target-id]") && items.length === 3 && items.every((item) => !item.disabled));
  }, null, { timeout });
}
async function waitNextOrComplete(page, previous, total, timeout = 20_000) {
  await page.waitForFunction(({ previous, total }) => {
    const s = window.DuduQ?.getSession?.(); if (!s || s.transitioning) return false;
    if (s.completed) return s.progress?.percent === 100 && previous === total - 1;
    const iframe = document.querySelector("iframe");
    return Boolean(s.stepIndex === previous + 1 && s.stepIndex < total && iframe && (iframe.srcdoc || iframe.getAttribute("src")) && window.DuduQTransition?.getState?.() === "idle");
  }, { previous, total }, { timeout });
}
async function observeCardAudio(page, itemId) {
  await page.evaluate((id) => {
    const doc = document.querySelector("iframe")?.contentDocument;
    const card = doc?.querySelector(`.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="${id}"]`);
    if (!card) throw new Error(`Card ${id} ausente para latch de áudio.`);
    const latch = { seen: card.getAttribute("data-audio-playing") === "true", observer: null };
    const observer = new MutationObserver(() => { if (card.getAttribute("data-audio-playing") === "true") latch.seen = true; });
    observer.observe(card, { attributes: true, attributeFilter: ["data-audio-playing"] }); latch.observer = observer; window.__DUDUQ_M02_AUDIO_LATCH__ = latch;
  }, itemId);
}
async function finishCardAudioObservation(page) {
  await page.waitForFunction(() => window.__DUDUQ_M02_AUDIO_LATCH__?.seen === true, null, { timeout: 2_000 });
  await page.waitForFunction(() => !document.querySelector("iframe")?.contentDocument?.querySelector(".duduq-dd2-item[data-audio-playing='true']"), null, { timeout: 6_000 });
  await page.evaluate(() => { window.__DUDUQ_M02_AUDIO_LATCH__?.observer?.disconnect?.(); delete window.__DUDUQ_M02_AUDIO_LATCH__; });
}

await fs.rm(OUT, { recursive: true, force: true }); await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true }); const cases = [];
try {
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, hasTouch: Boolean(viewport.mobile), isMobile: Boolean(viewport.mobile) });
    const pageErrors = []; const critical404 = []; if (viewport.mobile) await page.emulateMedia({ reducedMotion: "reduce" });
    page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
    page.on("response", (response) => { if (response.status() !== 404) return; const url = response.url(); if (url.includes("/engine/") || url.includes("/content/english/year-1/module-02/") || url.includes("asset-catalog/runtime-index.js")) critical404.push(url); });
    try {
      const response = await page.goto(`${BASE}/content/english/year-1/module-02/?qa=official-y1-m02-r146-${viewport.name}`, { waitUntil: "domcontentloaded", timeout: 35_000 });
      assert(response?.ok(), `${viewport.name}: M02 HTTP ${response?.status()}.`); await page.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, { timeout: 35_000 });
      const audit = await page.evaluate(() => {
        const moduleDefinition = window.DUDUQ_CONTENT?.english?.year1?.module02; const questions = (moduleDefinition?.activities || []).flatMap((activity) => activity?.questions || []); const manifest = window.DUDUQ_ENGINE_MANIFEST || {}; const assetKeys = [];
        for (const q of questions) { for (const item of q?.metadata?.targetShooter?.items || []) if (item.imageAsset) assetKeys.push(item.imageAsset); for (const target of q?.payload?.targets || []) if (target.imageAsset) assetKeys.push(target.imageAsset); }
        const uniqueAssets = [...new Set(assetKeys)];
        return { version: moduleDefinition?.version, profile: moduleDefinition?.pedagogyPolicy?.profile, readingDefault: moduleDefinition?.pedagogyPolicy?.readingDefault, autonomousReading: moduleDefinition?.pedagogyPolicy?.autonomousEnglishReadingRequired, spec: moduleDefinition?.pedagogyPolicy?.specification, contentSpec: moduleDefinition?.pedagogyPolicy?.contentSpecification, factoryCore: moduleDefinition?.factory?.core,
          ids: questions.map((q) => q.id), questions: questions.map((q) => ({ id:q.id, answer:q.answer?.value, alternatives:(q.alternatives||[]).map((a)=>a.text), mechanic:q.delivery?.mechanic, sourceSkill:q.metadata?.sourceSkill, skill:q.skill?.description, readingEssential:q.metadata?.readingEssential, literacyDemand:q.metadata?.literacyDemand, instructionFallback:q.metadata?.instructionAudioFallback, target:q.metadata?.targetShooter||null, payload:q.payload||null, contextQuantity:q.metadata?.dragDropChoice?.contextQuantity||null, visualSet:q.metadata?.dragDropChoice?.visualSet||"", noProceduralAsset:q.metadata?.dragDropChoice?.noProceduralAsset })),
          activityCount: moduleDefinition?.activities?.length||0, activityTitles:(moduleDefinition?.activities||[]).map((a)=>a.title), raw:JSON.stringify(moduleDefinition), assetKeys:uniqueAssets, resolvedAssets:Object.fromEntries(uniqueAssets.map((key)=>[key,window.DuduQAssets?.resolveImageDetails?.(key)||null])), manifestRevision:manifest.revision, manifestCore:manifest.core?.release, ts:manifest.mechanics?.["target-shooter"]?.release, dd:manifest.mechanics?.["drag-drop"]?.release, requiredMechanics:[...(window.DUDUQ_GAME_CONFIG?.requiredMechanics||[])], registered:window.DuduQ?.listMechanics?.()||[], scripts:Array.from(document.scripts).map((s)=>s.src).filter(Boolean), runtimeCommit:window.DuduQAssets?.canonicalCatalog?.runtimeCommit||"" };
      });
      assert(audit.version === "2.3.0-homolog-r146", `${viewport.name}: versão M02 ${audit.version}.`); assert(audit.ids.length === 12 && new Set(audit.ids).size === 12, `${viewport.name}: IDs M02 inválidos.`); assert(audit.ids.join(",") === EXPECTED.map((e)=>e[0]).join(","), `${viewport.name}: ordem/IDs oficiais divergiram.`);
      for (const [id,answer,alternatives,mechanic] of EXPECTED) { const q=audit.questions.find((entry)=>entry.id===id); assert(q?.answer===answer,`${viewport.name}: gabarito ${id} divergente.`); assert(JSON.stringify(q?.alternatives)===JSON.stringify(alternatives),`${viewport.name}: alternativas ${id} divergiram.`); assert(q?.mechanic===mechanic&&q?.skill&&q?.sourceSkill,`${viewport.name}: skill/mecânica/rastreabilidade ${id} inválida.`); }
      assert(audit.profile === "Y1_EARLY_LITERACY" && audit.readingDefault === "R0", `${viewport.name}: perfil/R0 divergente.`); assert(audit.autonomousReading === false, `${viewport.name}: leitura autônoma exigida.`); assert(audit.spec === "DUDUQ_FACTORY_PEDAGOGICAL_SPECIFICATION_v1.2" && audit.contentSpec.includes("v2.3"), `${viewport.name}: fontes normativas divergentes.`); assert(audit.questions.every((q)=>q.readingEssential===false&&q.literacyDemand==="R0"), `${viewport.name}: demanda de leitura fora de R0.`); assert(audit.questions.every((q)=>q.instructionFallback?.enabled&&q.instructionFallback?.language==="pt-BR"), `${viewport.name}: instrução narrável ausente.`);
      assert(audit.factoryCore === "1.0.11" && audit.manifestRevision === 146 && audit.manifestCore === "1.0.11", `${viewport.name}: Canary/Core divergente.`); assert(audit.ts === "1.0.21" && audit.dd === "2.0.24", `${viewport.name}: releases TS/DD divergentes.`); assert(audit.requiredMechanics.join(",") === "target-shooter,drag-drop", `${viewport.name}: requiredMechanics divergente.`); const registeredIds=audit.registered.map((m)=>m.id); assert(audit.requiredMechanics.every((id)=>registeredIds.includes(id)),`${viewport.name}: mecânica requerida ausente.`); assert(audit.registered.find((m)=>m.id==="drag-drop")?.version==="2.0.24",`${viewport.name}: DD registrado não é 2.0.24.`); assert(audit.activityCount===12&&audit.activityTitles.every((title)=>title==="NUMBERS"),`${viewport.name}: atividades/tópico divergentes.`); assert(audit.scripts.some((src)=>src.includes("/engine/duduq-player-v1.js")),`${viewport.name}: Player ausente.`); assert(audit.scripts.some((src)=>src.includes("/engine/duduq-loader-v1.js")),`${viewport.name}: Loader ausente.`); assert(audit.scripts.some((src)=>src.includes("/engine/releases/core/1.0.11/duduq-host.js")),`${viewport.name}: Host ausente.`); assert(audit.scripts.some((src)=>src.includes("/engine/releases/core/1.0.11/duduq-router.js")),`${viewport.name}: Router ausente.`); assert(audit.scripts.some((src)=>src.includes("/engine/releases/mechanics/drag-drop/2.0.24/drag-drop.js")),`${viewport.name}: DD adapter 2.0.24 ausente.`);
      for (const q of audit.questions) { if (q.mechanic === "target-shooter") { assert(q.target?.items?.length===3&&q.target?.difficulty?.targetSize>=150,`${viewport.name}: ${q.id} TS precisão/itens inválidos.`); assert(q.target?.difficulty?.timerMode==="none"&&q.target?.difficulty?.timeLimitMs===0,`${viewport.name}: ${q.id} timer punitivo.`); } else { assert(q.payload?.mode==="single-choice"&&q.payload?.items?.length===3&&q.payload?.targets?.length===1,`${viewport.name}: ${q.id} DD single-choice inválido.`); const required=q.payload.items.filter((item)=>item.required!==false), distractors=q.payload.items.filter((item)=>item.required===false); assert(required.length===1&&required[0].id===q.answer&&required[0].targetId===q.payload.targets[0].id,`${viewport.name}: ${q.id} gabarito DD inválido.`); assert(distractors.length===2&&distractors.every((item)=>!item.targetId),`${viewport.name}: ${q.id} distrator DD inválido.`); } }
      assert(audit.runtimeCommit === PIN, `${viewport.name}: pin canônico divergente.`); assert(!audit.raw.includes("data:image")&&!/gap-preview|procedural|legacy-fallback/i.test(audit.raw),`${viewport.name}: preview/procedural/fallback detectado.`); assert(audit.assetKeys.length===10,`${viewport.name}: esperado catálogo dos dez numerais, obtido ${audit.assetKeys.length}.`); for (const key of audit.assetKeys) { const resolved=audit.resolvedAssets[key]; assert(resolved?.url&&resolved?.file&&resolved?.catalogRuntimeCommit===PIN,`${viewport.name}: asset ${key} sem provenance canônica.`); } for (const expectedQuantity of [2,4,6,8,10]) { const q=audit.questions.find((entry)=>entry.contextQuantity===expectedQuantity); assert(q&&q.visualSet.split("●").length-1===expectedQuantity&&q.noProceduralAsset===true,`${viewport.name}: conjunto visual ${expectedQuantity} inválido.`); }
      const intro=page.locator(".duduq-intro-start-button"); await intro.waitFor({state:"visible",timeout:30_000}); await intro.click(); await waitStableStep(page,0,35_000); const initial=await page.evaluate(()=>window.DuduQ?.getSession?.()); assert(initial?.totalSteps===12,`${viewport.name}: totalSteps ${initial?.totalSteps}, esperado 12.`);
      for (let step=0; step<EXPECTED.length; step+=1) { const [id,answer,,mechanic]=EXPECTED[step]; await waitStableStep(page,step); if (mechanic==="target-shooter") { await waitTSReady(page); const wrong=["A","B","C"].find((candidate)=>candidate!==answer); const frame=page.frameLocator("iframe"); const wrongTarget=frame.locator(`.duduq-ts-target[aria-label="Lançar estrela no alvo ${wrong}"]`).first(); if (step===0&&viewport.name==="desktop-1366x768") { await wrongTarget.focus(); await page.keyboard.press("Enter"); } else await wrongTarget.click({force:true}); await waitFeedback(page,"retry",3_000); const retryState=await page.evaluate(()=>window.DuduQ?.getSession?.()); assert(retryState?.stepIndex===step&&!retryState.completed,`${viewport.name}: ${id} distrator TS avançou.`); await waitTSReady(page); await frame.locator(`.duduq-ts-target[aria-label="Lançar estrela no alvo ${answer}"]`).first().click({force:true}); await waitFeedback(page,"success",5_000); } else { await waitDDReady(page); const frame=page.frameLocator("iframe"); const wrong=["A","B","C"].find((candidate)=>candidate!==answer); const wrongCard=frame.locator(`.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="${wrong}"]`).first(); const hasAudio=await wrongCard.getAttribute("data-has-audio")==="true"; if (hasAudio) { await observeCardAudio(page,wrong); await wrongCard.click({force:true}); await finishCardAudioObservation(page); } else await wrongCard.click({force:true}); await frame.locator(".duduq-dd2-zone").first().click({force:true}); await waitFeedback(page,"retry",4_000); const retryState=await page.evaluate(()=>window.DuduQ?.getSession?.()); assert(retryState?.stepIndex===step&&!retryState.completed,`${viewport.name}: ${id} distrator DD avançou.`); await waitDDReady(page); const correctCard=frame.locator(`.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="${answer}"]`).first(); await correctCard.click({force:true}); if (await correctCard.getAttribute("data-has-audio")==="true") await page.waitForFunction(()=>!document.querySelector("iframe")?.contentDocument?.querySelector(".duduq-dd2-item[data-audio-playing='true']"),null,{timeout:6_000}); await frame.locator(".duduq-dd2-zone").first().click({force:true}); await waitFeedback(page,"success",5_000); } await waitNextOrComplete(page,step,EXPECTED.length); }
      const finalState=await page.evaluate(()=>({session:window.DuduQ?.getSession?.(),text:String(document.body?.innerText||"").replace(/\s+/g," ").trim(),docWidth:document.documentElement.scrollWidth,viewportWidth:window.innerWidth,iframe:(()=>{const iframe=document.querySelector("iframe"),doc=iframe?.contentDocument;return{exists:Boolean(iframe),scrollWidth:doc?.documentElement?.scrollWidth||0,clientWidth:doc?.documentElement?.clientWidth||0};})()}));
      assert(finalState.session?.completed===true&&finalState.session?.progress?.percent===100,`${viewport.name}: Completion/progress inválido.`); assert(/Missão concluída/i.test(finalState.text),`${viewport.name}: UI de conclusão ausente.`); assert(finalState.docWidth<=finalState.viewportWidth+2,`${viewport.name}: overflow horizontal no documento.`); assert(!finalState.iframe.exists||finalState.iframe.scrollWidth<=finalState.iframe.clientWidth+2,`${viewport.name}: overflow horizontal no iframe.`); assert(pageErrors.length===0,`${viewport.name}: pageerror ${pageErrors.join(" | ")}`); assert(critical404.length===0,`${viewport.name}: 404 crítico ${critical404.join(" | ")}`);
      const criteria={content:"PASS",pedagogy:"PASS",mechanic:"PASS",assets:"PASS",audio:"PASS",visual:"PASS",responsive:"PASS",accessibility:"PASS",integration:"PASS",regression:"PASS"}; cases.push({viewport:viewport.name,criteria,progress:100,pageErrors,critical404}); console.log(`M02 PASS 10/10 ${viewport.name}`);
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
const report={contract:"DUDUQ_YEAR1_M02_OFFICIAL_HOMOLOGATION_R146",status:cases.length===4?"PASS":"FAIL",module:"M02",canary:146,core:"1.0.11",targetShooter:"1.0.21",dragDrop:"2.0.24",cases}; await fs.writeFile(path.join(OUT,"report.json"),JSON.stringify(report,null,2)); assert(cases.length===4,`Expected 4 viewports, got ${cases.length}.`); console.log("DUDUQ_YEAR1_M02_OFFICIAL_HOMOLOGATION_R146 PASS 4/4 10/10");