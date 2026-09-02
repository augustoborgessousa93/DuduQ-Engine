import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const CASES = [1,2,3,4,5].map((year) => ({ year, module: 1 }));

async function installTtsStub(page) {
  await page.addInitScript(() => {
    const synth = {
      speaking:false,pending:false,paused:false,getVoices:()=>[],
      cancel(){ this.speaking=false; },pause(){},resume(){},
      speak(utterance){
        this.speaking=true;
        try { utterance?.onstart?.({ type:"start" }); } catch {}
        queueMicrotask(() => {
          this.speaking=false;
          try { utterance?.onend?.({ type:"end" }); } catch {}
        });
      }
    };
    try { Object.defineProperty(globalThis,"speechSynthesis",{value:synth,configurable:true}); }
    catch { globalThis.speechSynthesis=synth; }
  });
}

function dragContract(question) {
  const payload = question?.payload || {};
  const items = (payload.items || question?.alternatives || [])
    .map((value) => ({ id:String(value?.id || ""), required:value?.required, targetId:value?.targetId || null }))
    .filter((value) => value.id);
  const targets = (payload.targets || question?.metadata?.targets || [])
    .map((value) => ({ id:String(value?.id || ""), capacity:Number(value?.capacity || 1) }))
    .filter((value) => value.id);
  const type = String(question?.answer?.type || "").toLowerCase();
  let pairs = [];
  if (Array.isArray(payload.items) && payload.items.some((item) => item?.targetId)) {
    pairs = payload.items
      .filter((item) => item?.required !== false && item?.targetId)
      .map((item) => ({ source:String(item.id), target:String(item.targetId) }));
  } else if (type === "pairs" && Array.isArray(question?.answer?.value)) {
    pairs = question.answer.value
      .map((value) => ({ source:String(value?.source || value?.itemId || ""), target:String(value?.target || value?.targetId || "") }))
      .filter((value) => value.source && value.target);
  }
  const correctSources = new Set(pairs.map((value) => value.source));
  let wrong = null;
  const distractor = items.find((item) => !correctSources.has(item.id));
  if (distractor && pairs[0]) wrong = { source:distractor.id, target:pairs[0].target };
  else if (pairs[0] && targets.length > 1) {
    const otherTarget = targets.find((target) => target.id !== pairs[0].target);
    if (otherTarget) wrong = { source:pairs[0].source, target:otherTarget.id };
  }
  const values = [...(payload.items || []), ...(payload.targets || []), ...(question?.alternatives || [])];
  return {
    pairs,
    wrong,
    media:Boolean(question?.image?.src || question?.media?.image?.src || values.some((value) => value?.image?.src || value?.imageUrl || value?.imageAsset || value?.imageAssetKey || value?.imageSrc)),
    audio:Boolean(question?.audio?.enabled || question?.audio?.text || question?.audio?.src || question?.metadata?.instructionAudio?.enabled || values.some((value) => value?.spokenText || value?.audioDescription || value?.audio?.enabled))
  };
}

async function realDragDrop(page, year, module) {
  return page.evaluate(({year,module}) => {
    function walk(value, seen = new Set()) {
      if (!value || typeof value !== "object" || seen.has(value)) return null;
      seen.add(value);
      if (Array.isArray(value.activities) && Number(value.year) === year && Number(value.module) === module) return value;
      for (const child of Object.values(value)) {
        const found = walk(child, seen);
        if (found) return found;
      }
      return null;
    }
    const found = walk(window.DUDUQ_CONTENT || {});
    if (!found) return null;
    const questions = [];
    for (const activity of found.activities || []) {
      for (const question of activity.questions || []) {
        const mechanic = String(activity.mechanic || question?.delivery?.mechanic || question?.renderer || "").toLowerCase().replace(/_/g,"-");
        if (mechanic === "drag-drop") questions.push(question);
      }
    }
    return { questions };
  }, {year,module});
}

async function destroyMount(page) {
  await page.evaluate(() => {
    try { window.__R148_DESTROY__?.(); } catch {}
    document.getElementById("r148-host")?.remove();
  });
}

async function mountDragDrop(page, question, year, module) {
  await page.evaluate(({question,year,module}) => {
    window.__R148_RESULTS__ = [];
    window.__R148_DONE__ = [];
    if (!window.__R148_LISTENER__) {
      addEventListener("message", (event) => {
        if (event.data?.type === "DUDUQ_DRAG_DROP_RESULT") window.__R148_RESULTS__.push(event.data.payload);
      });
      window.__R148_LISTENER__ = true;
    }
    document.getElementById("r148-host")?.remove();
    const host = document.createElement("div");
    host.id = "r148-host";
    host.style.cssText = "position:fixed;inset:0;z-index:999999;background:#fff";
    document.body.appendChild(host);
    const mechanic = window.DuduQ?.getMechanic?.("drag-drop");
    if (!mechanic || mechanic.version !== "2.0.25") throw new Error("DD 2.0.25 não registrado");
    let input = question;
    if (!mechanic.validate(input) && question?.payload) {
      input = {
        id:question.id,
        title:question.metadata?.activityTitle || question.metadata?.screenTitle || "DRAG DROP",
        instruction:question.instruction || question.statement || "",
        payload:question.payload
      };
    }
    if (!mechanic.validate(input)) throw new Error(`DD real rejeitado ${question?.id || "sem-id"}`);
    window.__R148_DESTROY__ = mechanic.mount({
      container:host,
      payload:input,
      context:{subject:"english",year,module,stepId:question.id || "sanity",stepIndex:0,totalSteps:1},
      onComplete:(result) => window.__R148_DONE__.push(result)
    });
  }, {question,year,module});
  await page.locator("#r148-host iframe").waitFor({state:"attached",timeout:12000});
  const frame = page.frameLocator("#r148-host iframe");
  await frame.locator(".duduq-dd2-root").waitFor({state:"visible",timeout:12000});
  assert(await frame.locator(".duduq-dd2-root").getAttribute("data-dd225-smart-snap") === "true", `Y${year}: smart snap inativo`);
  assert(await frame.locator(".duduq-dd2-root").getAttribute("data-dd225-instant-validation") === "false", `Y${year}: instant validation ativo`);
  return frame;
}

async function realConsumerBehavior(page, question, year, module) {
  const contract = dragContract(question);
  assert(contract.pairs.length > 0 && contract.wrong, `Y${year} ${question.id}: contrato insuficiente`);
  console.log(`SANITY Y${year} M${module} ${question.id}`);
  let frame = await mountDragDrop(page, question, year, module);
  const makeControls = () => ({
    item:(id) => frame.locator(`[data-dd2-item-id="${id}"]`).first(),
    zone:(id) => frame.locator(`[data-dd2-target-id="${id}"] .duduq-dd2-zone`).first()
  });
  let controls = makeControls();
  const place = async (source,target) => {
    await controls.item(source).click({force:true});
    await controls.zone(target).click({force:true});
  };

  await place(contract.wrong.source, contract.wrong.target);
  assert(await page.evaluate(() => window.__R148_RESULTS__.length) === 0, `Y${year}: drop avaliou`);
  await page.waitForTimeout(250);
  let retry = "N/A_INCOMPLETE_PLACEMENT";
  let confirm = frame.locator(".duduq-dd2-confirm");
  if (await confirm.count() && await confirm.isVisible()) {
    await confirm.click({force:true});
    await page.waitForFunction(() => window.__R148_RESULTS__.length === 1, null, {timeout:7000});
    assert((await page.evaluate(() => window.__R148_RESULTS__[0]))?.isCorrect === false, `Y${year}: retry inválido`);
    retry = "PASS";
    await page.waitForTimeout(900);
  } else {
    await destroyMount(page);
    frame = await mountDragDrop(page, question, year, module);
    controls = makeControls();
    confirm = frame.locator(".duduq-dd2-confirm");
  }

  for (const pair of contract.pairs) {
    await controls.item(pair.source).click({force:true});
    await controls.zone(pair.target).click({force:true});
  }
  const before = await page.evaluate(() => window.__R148_RESULTS__.length);
  await confirm.waitFor({state:"visible",timeout:5000});
  await confirm.click({force:true});
  await page.waitForFunction((count) => window.__R148_RESULTS__.length > count, before, {timeout:7000});
  assert((await page.evaluate(() => window.__R148_RESULTS__.at(-1)))?.isCorrect === true, `Y${year}: success ausente`);
  await page.waitForFunction(() => window.__R148_DONE__.length > 0, null, {timeout:7000});
  if (contract.media && await frame.locator("img").count()) {
    assert(await frame.locator("img").evaluateAll((images) => images.some((image) => image.naturalWidth > 0 && image.naturalHeight > 0)), `Y${year}: imagem não renderizou`);
  }
  await destroyMount(page);
  return {question:question.id,retry,confirm:"PASS",success:"PASS",media:contract.media,audio:contract.audio};
}

async function playerFlow(page, year) {
  const start = page.locator(".duduq-intro-start-button");
  await start.waitFor({state:"visible",timeout:30000});
  await start.click({force:true});
  await page.waitForFunction(() => {
    const session = window.DuduQ?.getSession?.();
    const iframe = document.querySelector("iframe");
    return Boolean(session && !session.transitioning && iframe?.srcdoc && window.DuduQTransition?.getState?.() === "idle");
  }, null, {timeout:35000});
  const initial = await page.evaluate(() => window.DuduQ.getSession());
  const total = Number(initial?.totalSteps || 0);
  assert(total > 0, `Y${year}: Player sem steps`);
  const deadline = Date.now() + 70000;
  let guard = 0;
  while (Date.now() < deadline && guard++ < total + 2) {
    const before = await page.evaluate(() => window.DuduQ.getSession());
    if (before?.completed) break;
    const accepted = await page.evaluate(() => window.DuduQ.next({qa:"r148-sanity-v5"}));
    assert(accepted !== false, `Y${year}: next rejeitado`);
    await page.waitForFunction((index) => {
      const session = window.DuduQ?.getSession?.();
      return Boolean(session && !session.transitioning && (session.completed || session.stepIndex !== index) && window.DuduQTransition?.getState?.() === "idle");
    }, before.stepIndex, {timeout:12000});
  }
  const final = await page.evaluate(() => window.DuduQ.getSession());
  assert(final?.completed === true && Number(final?.progress?.percent || 0) >= 100, `Y${year}: completion/progress ausente`);
  return {totalSteps:total,progress:final.progress};
}

const CLASSIFICATION_FIXTURE = {
  id:"class",
  title:"CLASSIFICATION",
  instruction:"Classifique.",
  behavior:{shuffleItems:false,shuffleTargets:false},
  payload:{
    mode:"classification",
    strategy:"classification",
    items:[
      {id:"A",label:"APPLE",targetId:"left",required:true},
      {id:"B",label:"DOG",targetId:"right",required:true},
      {id:"C",label:"CAT",targetId:"right",required:true}
    ],
    targets:[
      {id:"left",label:"FRUIT",capacity:2,kind:"category"},
      {id:"right",label:"ANIMALS",capacity:2,kind:"category"}
    ]
  }
};

async function classificationFixture(page) {
  console.log("SANITY FIXTURE CLASSIFICATION");
  assert(await page.evaluate((fixture) => window.DuduQ?.getMechanic?.("drag-drop")?.validate?.(fixture) === true, CLASSIFICATION_FIXTURE), "classification validate=false");
  const frame = await mountDragDrop(page, CLASSIFICATION_FIXTURE, 0, 0);
  const itemCount = await frame.locator("[data-dd2-item-id]").count();
  const targetCount = await frame.locator("[data-dd2-target-id]").count();
  assert(itemCount >= 3, `classification items=${itemCount}`);
  assert(targetCount >= 2, `classification targets=${targetCount}`);

  // O consumidor publicado de classificação é N/A. No fixture, comprovamos o contrato
  // suportado sem inventar um fluxo de retry específico para multi-capacity click placement.
  await frame.locator('[data-dd2-item-id="A"]').first().click({force:true});
  await frame.locator('[data-dd2-target-id="left"] .duduq-dd2-zone').first().click({force:true});
  await page.waitForTimeout(250);
  assert(await page.evaluate(() => window.__R148_RESULTS__.length) === 0, "classification drop avaliou antes de Confirmar");
  await destroyMount(page);
  return {status:"PASS",consumer:"N/A",retry:"N/A_FIXTURE_MULTI_CAPACITY",items:itemCount,targets:targetCount,dropDoesNotEvaluate:"PASS"};
}

const browser = await chromium.launch({headless:true});
const report = [];
try {
  for (const testCase of CASES) {
    const page = await browser.newPage({viewport:{width:1366,height:768}});
    await installTtsStub(page);
    const pageErrors = [];
    const critical404 = [];
    page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
    page.on("response", (response) => {
      if (response.status() !== 404) return;
      const url = response.url();
      if (url.includes("/engine/") || url.includes(`/content/english/year-${testCase.year}/`)) critical404.push(url);
    });
    try {
      const mm = String(testCase.module).padStart(2,"0");
      const response = await page.goto(`${BASE}/content/english/year-${testCase.year}/module-${mm}/?qa=r148-v5`, {waitUntil:"domcontentloaded",timeout:35000});
      assert(response?.ok(), `Y${testCase.year}: HTTP ${response?.status()}`);
      await page.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, {timeout:35000});
      const boot = await page.evaluate(() => ({
        revision:window.DUDUQ_ENGINE_MANIFEST?.revision,
        core:window.DUDUQ_ENGINE_MANIFEST?.core?.release,
        dragDrop:window.DUDUQ_ENGINE_MANIFEST?.mechanics?.["drag-drop"]?.release,
        registered:window.DuduQ?.getMechanic?.("drag-drop")?.version
      }));
      assert(boot.revision === 148 && boot.core === "1.0.12" && boot.dragDrop === "2.0.25" && boot.registered === "2.0.25", `Y${testCase.year}: boot ${JSON.stringify(boot)}`);
      const module = await realDragDrop(page, testCase.year, testCase.module);
      const question = module?.questions?.find((value) => dragContract(value).pairs.length && dragContract(value).wrong);
      assert(question, `Y${testCase.year}: consumidor DD real adequado ausente`);
      const behavior = await realConsumerBehavior(page, question, testCase.year, testCase.module);
      const flow = await playerFlow(page, testCase.year);
      assert(pageErrors.length === 0, `Y${testCase.year}: pageError ${pageErrors.join(" | ")}`);
      assert(critical404.length === 0, `Y${testCase.year}: critical404 ${critical404.join(" | ")}`);
      report.push({year:testCase.year,behavior,flow});
    } finally {
      await page.close();
    }
  }

  const fixturePage = await browser.newPage({viewport:{width:1366,height:768}});
  await installTtsStub(fixturePage);
  try {
    await fixturePage.goto(`${BASE}/content/english/year-1/module-01/?qa=classification-fixture`, {waitUntil:"domcontentloaded",timeout:35000});
    await fixturePage.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, {timeout:35000});
    report.push({classificationFixture:await classificationFixture(fixturePage)});
  } finally {
    await fixturePage.close();
  }

  const sequencePage = await browser.newPage({viewport:{width:1366,height:768}});
  await installTtsStub(sequencePage);
  try {
    await sequencePage.goto(`${BASE}/content/english/year-1/module-06/?qa=sequence-real`, {waitUntil:"domcontentloaded",timeout:35000});
    await sequencePage.waitForFunction(() => window.DUDUQ_ENGINE_READY === true, null, {timeout:35000});
    const module = await realDragDrop(sequencePage, 1, 6);
    const question = module?.questions?.find((value) => String(value?.answer?.type || "").toLowerCase() === "sequence" || String(value?.payload?.strategy || "").toLowerCase() === "sequence" || value?.metadata?.layout === "sequence");
    assert(question, "sequence consumer real ausente");
    assert(await sequencePage.evaluate((value) => window.DuduQ?.getMechanic?.("drag-drop")?.validate?.(value) === true, question), "sequence consumer real rejeitado");
    report.push({sequence:{question:question.id,status:"PASS"}});
  } finally {
    await sequencePage.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({status:"PASS",revision:148,core:"1.0.12",dragDrop:"2.0.25",classificationConsumer:"N/A",report},null,2));
