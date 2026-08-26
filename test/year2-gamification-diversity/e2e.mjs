import { chromium } from "playwright";
import fs from "node:fs";
import process from "node:process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const HARNESS = `${BASE_URL}/test/year2-gamification-diversity/index.html`;
const RESULTS = "test-results/year2-gamification-diversity";
fs.mkdirSync(RESULTS, { recursive: true });

function assert(condition, message){
  if(!condition) throw new Error(message);
}

function sameDistribution(actual, expected){
  const actualKeys = Object.keys(actual || {}).sort();
  const expectedKeys = Object.keys(expected || {}).sort();
  if(JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) return false;
  return expectedKeys.every(key => actual[key] === expected[key]);
}

async function waitEnabled(locator, timeout = 8_000){
  const deadline = Date.now() + timeout;
  while(Date.now() < deadline){
    if(await locator.isEnabled().catch(()=>false)) return;
    await new Promise(resolve => setTimeout(resolve, 60));
  }
  throw new Error(`Controle permaneceu desabilitado por mais de ${timeout}ms.`);
}

async function loadModule(page, moduleNumber){
  const pad = String(moduleNumber).padStart(2,"0");
  const key = `module${pad}v23multimodal`;
  await page.goto(`${HARNESS}?module=${moduleNumber}`, {waitUntil:"domcontentloaded", timeout:30_000});
  await page.waitForFunction(
    ({key}) => Boolean(window.DUDUQ_CONTENT?.english?.year2?.[key]),
    {key},
    {timeout:25_000}
  );
  return {pad,key};
}

async function inspectAllModulePayloads(browser){
  const expected = {
    "01":{"matching":2,"drag-drop":3,"target-shooter":7,"bubble-pop":2,"word-slash":1},
    "02":{"matching":8,"drag-drop":7},
    "03":{"matching":8,"drag-drop":7},
    "04":{"matching":8,"drag-drop":7},
    "05":{"matching":8,"drag-drop":7},
    "06":{"matching":7,"drag-drop":6,"target-shooter":2}
  };

  for(let moduleNumber=1; moduleNumber<=6; moduleNumber+=1){
    const page = await browser.newPage();
    const {pad,key} = await loadModule(page,moduleNumber);
    const snapshot = await page.evaluate(({key}) => {
      const module = window.DUDUQ_CONTENT.english.year2[key];
      const questions = module.activities.flatMap(activity => activity.questions.map(question => ({
        id: question.id,
        mechanic: activity.mechanic,
        deliveryMechanic: question.delivery?.mechanic,
        matching: question.metadata?.matching ? {
          pairCount: question.metadata.matching.pairs?.length,
          leftCount: question.metadata.matching.leftItems?.length,
          rightCount: question.metadata.matching.rightItems?.length,
          rightLabels: question.metadata.matching.rightItems?.map(item => item.label),
          rightSpoken: question.metadata.matching.rightItems?.map(item => item.spokenText),
          allowRightDistractors: question.metadata.matching.behavior?.allowRightDistractors
        } : null
      })));
      return {
        id: module.id,
        version: module.version,
        distribution: module.mechanicDistribution,
        audit: module.audit?.gamificationDiversity,
        questions,
        diversityVersion: window.DuduQYear2GamificationDiversity?.version
      };
    }, {key});

    assert(snapshot.questions.length===15, `M${pad}: esperado 15 itens, recebido ${snapshot.questions.length}.`);
    assert(sameDistribution(snapshot.distribution, expected[pad]), `M${pad}: distribuição inesperada ${JSON.stringify(snapshot.distribution)}; esperado ${JSON.stringify(expected[pad])}.`);
    assert(snapshot.audit?.contentLock==="PASS_BY_CONSTRUCTION", `M${pad}: content lock ausente.`);
    assert(snapshot.audit?.matchingCandidate==="1.0.24", `M${pad}: candidato Matching incorreto.`);
    assert(snapshot.diversityVersion, `M${pad}: adapter de diversidade não carregou.`);

    const matchingQuestions = snapshot.questions.filter(question => question.mechanic==="matching");
    assert(matchingQuestions.length===expected[pad].matching, `M${pad}: contagem Matching divergente.`);
    for(const question of matchingQuestions){
      assert(question.deliveryMechanic==="matching", `${question.id}: delivery não aponta para Matching.`);
      assert(question.matching?.pairCount===1, `${question.id}: Matching deve ter exatamente 1 par correto.`);
      assert(question.matching?.leftCount===1, `${question.id}: Matching deve ter exatamente 1 estímulo.`);
      assert(question.matching?.rightCount===4, `${question.id}: Matching deve manter as 4 alternativas editoriais.`);
      assert(question.matching?.allowRightDistractors===true, `${question.id}: allowRightDistractors não foi propagado.`);
      assert(JSON.stringify(question.matching.rightLabels)==='["A","B","C","D"]', `${question.id}: labels pré-resposta não estão neutros A/B/C/D.`);
      assert(question.matching.rightSpoken.every(Boolean), `${question.id}: algum card perdeu spokenText editorial.`);
    }
    await page.close();
  }
}

async function bootM02Matching(page){
  const errors=[];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if(message.type()==="error") errors.push(message.text());
  });

  await loadModule(page,2);
  await page.waitForFunction(() => window.DuduQMatching124RightDistractors?.ready === true, null, {timeout:20_000});

  const start = page.locator(".duduq-intro-start-button");
  if(await start.isVisible({timeout:8_000}).catch(()=>false)) await start.click();

  const frame = page.frameLocator('iframe[title="DuduQ — Matching"]');
  const leftCards = frame.locator('.duduq-matching-column[data-side="left"] .duduq-matching-card');
  const rightShells = frame.locator('.duduq-matching-column[data-side="right"] .duduq-matching-card-shell');
  await leftCards.first().waitFor({state:"visible",timeout:30_000});
  await rightShells.first().waitFor({state:"visible",timeout:10_000});
  await waitEnabled(leftCards.first());

  assert(errors.length===0, `M02 boot produziu erros: ${errors.join(" | ")}`);
  return {frame,leftCards,rightShells};
}

function shellByLetter(frame, letter){
  return frame.locator('.duduq-matching-column[data-side="right"] .duduq-matching-card-shell').filter({hasText:letter}).first();
}

async function connectByTap(frame, letter){
  const left = frame.locator('.duduq-matching-column[data-side="left"] .duduq-matching-card').first();
  const right = shellByLetter(frame,letter).locator('.duduq-matching-card').first();
  await waitEnabled(left);
  await waitEnabled(right);
  await left.click();
  await right.click();
}

async function desktopInteraction(browser){
  const context = await browser.newContext({viewport:{width:1366,height:768}});
  const page = await context.newPage();
  const {frame,leftCards,rightShells} = await bootM02Matching(page);

  assert(await leftCards.count()===1, `Desktop M02: esperado 1 estímulo esquerdo, recebido ${await leftCards.count()}.`);
  assert(await rightShells.count()===4, `Desktop M02: esperado 4 alternativas, recebido ${await rightShells.count()}.`);

  for(const letter of ["A","B","C","D"]){
    const shell = shellByLetter(frame,letter);
    await shell.waitFor({state:"visible",timeout:4_000});
    const audio = shell.locator('.duduq-matching-item-audio');
    assert(await audio.count()===1, `Desktop ${letter}: card deveria possuir áudio individual.`);
    const box = await shell.boundingBox();
    assert(box && box.width>=170 && box.height>=58, `Desktop ${letter}: card pequeno demais.`);
  }

  const confirm = frame.locator('.duduq-matching-primary');
  assert(await confirm.isDisabled(), "Desktop: CONFIRMAR deveria iniciar desabilitado.");

  const audioB = shellByLetter(frame,"B").locator('.duduq-matching-item-audio');
  await audioB.click();
  assert(await confirm.isDisabled(), "Ouvir uma alternativa não pode criar conexão nem habilitar CONFIRMAR.");

  await connectByTap(frame,"A");
  assert(!(await confirm.isDisabled()), "Desktop: conexão incorreta A deveria habilitar CONFIRMAR sem revelar gabarito.");
  await confirm.click();

  const retry = frame.locator('.duduq-engine-feedback[data-state="retry"]');
  await retry.waitFor({state:"visible",timeout:3_000});
  await page.screenshot({path:`${RESULTS}/m02-desktop-wrong.png`,fullPage:true});

  await frame.locator('.duduq-matching-primary').waitFor({state:"visible",timeout:4_000});
  const retryConfirm = frame.locator('.duduq-matching-primary');
  assert(await retryConfirm.isDisabled(), "Desktop: após retry sem conexão, CONFIRMAR deveria voltar desabilitado.");

  await connectByTap(frame,"B");
  assert(!(await retryConfirm.isDisabled()), "Desktop: conexão correta B não habilitou CONFIRMAR.");
  await retryConfirm.click();
  const success = frame.locator('.duduq-engine-feedback[data-state="success"]');
  await success.waitFor({state:"visible",timeout:3_000});
  await page.screenshot({path:`${RESULTS}/m02-desktop-correct.png`,fullPage:true});

  await context.close();
}

async function mobileLayout(browser){
  const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page = await context.newPage();
  const {frame,rightShells} = await bootM02Matching(page);
  assert(await rightShells.count()===4, "Mobile M02: quatro alternativas não renderizaram.");

  const frameElement = page.locator('iframe[title="DuduQ — Matching"]');
  const frameBox = await frameElement.boundingBox();
  assert(frameBox && frameBox.x>=-2 && frameBox.x+frameBox.width<=392, "Mobile: iframe Matching criou overflow horizontal.");

  for(const letter of ["A","B","C","D"]){
    const shell = shellByLetter(frame,letter);
    const box = await shell.boundingBox();
    assert(box && box.width>=120 && box.height>=54, `Mobile ${letter}: card pequeno demais.`);
    const audioBox = await shell.locator('.duduq-matching-item-audio').boundingBox();
    assert(audioBox && audioBox.width>=28 && audioBox.height>=28, `Mobile ${letter}: áudio individual pequeno demais.`);
  }

  await connectByTap(frame,"B");
  const confirm = frame.locator('.duduq-matching-primary');
  assert(!(await confirm.isDisabled()), "Mobile: conexão correta não habilitou CONFIRMAR.");
  const confirmBox = await confirm.boundingBox();
  assert(confirmBox && confirmBox.y+confirmBox.height <= frameBox.y+frameBox.height+2, "Mobile: CONFIRMAR ficou recortado no iframe.");
  await page.screenshot({path:`${RESULTS}/m02-mobile-selected.png`,fullPage:true});

  await context.close();
}

const browser = await chromium.launch({headless:true});
try{
  await inspectAllModulePayloads(browser);
  await desktopInteraction(browser);
  await mobileLayout(browser);
  console.log("YEAR2_GAMIFICATION_DIVERSITY_E2E_OK");
}finally{
  await browser.close();
}
