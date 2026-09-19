import fs from 'node:fs';
import {chromium} from 'playwright';

const BASE=(process.env.BASE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const GOLDEN_ID='EN3-M1-03';
const EXPECTED_SMART_TOTAL=35;
const viewports=[
  {name:'desktop-1366x768',width:1366,height:768},
  {name:'desktop-browser-1366x640',width:1366,height:640},
  {name:'tablet-768x1024',width:768,height:1024},
  {name:'mobile-390x844',width:390,height:844}
];

function assert(ok,message){if(!ok)throw new Error(message)}
function norm(value){return String(value||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR')}

async function waitModule(page,moduleNumber){
  const tag=String(moduleNumber).padStart(2,'0');
  await page.goto(`${BASE}/content/english/year-3/module-${tag}/index.html?smart-standard=1`,{waitUntil:'domcontentloaded',timeout:45_000});
  await page.waitForFunction(tag=>Boolean(window.DUDUQ_ENGINE_READY&&window.DuduQ&&window.DUDUQ_CONTENT?.english?.year3?.[`module${tag}`]),tag,{timeout:45_000});
  await page.evaluate(()=>{try{window.DuduQIntro?.hide?.({immediate:true,reason:'smart-standard'})}catch(_){} try{window.DuduQTransition?.hideImmediate?.()}catch(_){}});
}

async function smartIds(page,moduleNumber){
  const tag=String(moduleNumber).padStart(2,'0');
  return page.evaluate(tag=>window.DUDUQ_CONTENT.english.year3[`module${tag}`].activities.filter(a=>a.mechanic==='smart-sentence').map(a=>a.questions?.[0]?.id).filter(Boolean),tag);
}

async function mountSmart(page,moduleNumber,id,{trackCompletion=false}={}){
  const tag=String(moduleNumber).padStart(2,'0');
  const info=await page.evaluate(({tag,moduleNumber,id,trackCompletion})=>{
    const module=window.DUDUQ_CONTENT.english.year3[`module${tag}`];
    const activity=module.activities.find(a=>a.questions?.[0]?.id===id);
    if(!activity)throw new Error(`activity missing ${id}`);
    if(activity.mechanic!=='smart-sentence')throw new Error(`${id}: expected smart-sentence, got ${activity.mechanic}`);
    if(trackCompletion){
      window.__Y3_SMART_STANDARD_COMPLETIONS__=0;
      if(!window.__Y3_SMART_STANDARD_COMPLETION_LISTENER__){
        window.__Y3_SMART_STANDARD_COMPLETION_LISTENER__=true;
        window.addEventListener('message',event=>{if(event?.data?.type==='DUDUQ_SMART_SENTENCE_COMPLETE')window.__Y3_SMART_STANDARD_COMPLETIONS__+=1});
      }
    }
    try{window.DuduQIntro?.hide?.({immediate:true,reason:'smart-standard'})}catch(_){}
    try{window.DuduQTransition?.hideImmediate?.()}catch(_){}
    window.DuduQ.destroy();
    window.DuduQ.start({
      id:`y3-smart-standard-${id}`,title:`Y3 Smart Standard ${id}`,year:3,subject:'english',module:moduleNumber,container:'#root',
      steps:[{id:`probe-${id}`,mechanic:'smart-sentence',payload:{id:`payload-${id}`,title:activity.title,subject:'english',year:3,module:moduleNumber,questions:activity.questions}}]
    });
    const q=activity.questions[0];
    return {instruction:q.instruction,answerText:q.metadata?.smartSentence?.answer||q.answer?.text||'',sourceStatement:q.metadata?.sourceStatement||''};
  },{tag,moduleNumber,id,trackCompletion});

  await page.waitForFunction(()=>Boolean(document.querySelector('#root iframe')?.contentDocument?.querySelector('.duduq-smart-ts-stage')),null,{timeout:30_000});
  await page.waitForFunction(()=>Boolean(document.querySelector('#root iframe')?.contentDocument?.getElementById('duduq-y3-smart-golden-standard')),null,{timeout:10_000});
  await page.waitForTimeout(120);
  const iframe=page.locator('#root iframe');
  const handle=await iframe.elementHandle();
  const frame=await handle.contentFrame();
  assert(frame,`${id}: Smart Sentence iframe missing`);
  return {frame,info};
}

async function visualProof(frame){
  return frame.evaluate(()=>{
    const one=s=>document.querySelector(s);
    const css=(el,keys)=>{const s=getComputedStyle(el);return Object.fromEntries(keys.map(k=>[k,s[k]]));};
    const box=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,cx:r.left+r.width/2,cy:r.top+r.height/2};};
    const stage=one('.duduq-smart-ts-stage');
    const stimulus=one('.duduq-smart-ts-stimulus');
    const image=one('.duduq-smart-ts-image');
    const dialogue=one('.duduq-smart-ts-dialogue');
    const workspace=one('.duduq-smart-ts-workspace');
    const bankWrap=one('.duduq-smart-ts-bank-wrap');
    const bank=one('.duduq-smart-ts-bank');
    const token=one('.duduq-smart-ts-token,.duduq-smart-ts-choice');
    const actions=one('.duduq-smart-ts-actions');
    const clear=one('.duduq-smart-ts-clear');
    const confirm=one('.duduq-smart-ts-confirm');
    const audio=one('.duduq-ts-audio-button');
    const style=one('#duduq-y3-smart-golden-standard');
    if(!stage||!workspace||!bankWrap||!bank||!token||!actions||!clear||!confirm||!audio||!style)throw new Error('Smart standard required element missing');
    const follows=(a,b)=>Boolean(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING);
    const stimulusVisible=Boolean(stimulus&&!stimulus.hidden&&getComputedStyle(stimulus).display!=='none');
    const imageVisible=Boolean(image&&getComputedStyle(image).display!=='none'&&box(image).width>0&&box(image).height>0);
    const stageBox=box(stage),workBox=box(workspace),bankBox=box(bankWrap),actionsBox=box(actions),audioBox=box(audio);
    const imageBox=imageVisible?box(image):null;
    const stimulusBox=stimulusVisible?box(stimulus):null;
    return {
      marker:style.dataset.reference,
      documentMarker:document.documentElement.dataset.duduqY3SmartStandard||'',
      hierarchy:{
        stimulusBeforeWorkspace:!stimulusVisible||follows(stimulus,workspace),
        dialogueBeforeWorkspace:!dialogue||dialogue.hidden||getComputedStyle(dialogue).display==='none'||follows(dialogue,workspace),
        workspaceBeforeBank:follows(workspace,bankWrap),
        bankBeforeActions:follows(bankWrap,actions)
      },
      signatures:{
        stage:css(stage,['gap','alignItems','justifyContent','paddingTop','paddingBottom']),
        workspace:css(workspace,['minHeight','paddingTop','paddingRight','paddingBottom','paddingLeft','borderTopWidth','borderTopColor','borderRadius','backgroundColor','boxShadow']),
        bank:css(bank,['minHeight','gap','alignItems','justifyContent']),
        token:css(token,['minHeight','paddingTop','paddingRight','paddingBottom','paddingLeft','borderTopWidth','borderTopColor','borderRadius','backgroundImage','color','boxShadow','fontFamily','fontSize','fontWeight']),
        actions:css(actions,['display','gap','alignItems','justifyContent','marginTop','paddingBottom','transform']),
        clear:css(clear,['minHeight','borderTopWidth','borderTopColor','borderRadius','backgroundColor','color','boxShadow','fontFamily','fontSize','fontWeight']),
        confirm:css(confirm,['minHeight','borderTopWidth','borderTopColor','borderRadius','backgroundImage','color','boxShadow','fontFamily','fontSize','fontWeight'])
      },
      boxes:{stage:stageBox,workspace:workBox,bank:bankBox,actions:actionsBox,audio:audioBox,stimulus:stimulusBox,image:imageBox},
      imageObjectFit:imageVisible?getComputedStyle(image).objectFit:null,
      imageCentered:imageVisible&&stimulusBox?Math.abs(imageBox.cx-stimulusBox.cx)<=2:true,
      instructionVisible:(document.body.innerText||'').trim().length>0,
      outerOverflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth,document.body.scrollWidth-document.body.clientWidth),
      viewport:{width:innerWidth,height:innerHeight},
      clearVisible:box(clear).width>0&&box(clear).height>0,
      confirmVisible:box(confirm).width>0&&box(confirm).height>0,
      audioVisible:audioBox.width>0&&audioBox.height>0,
      actionsInsideViewport:actionsBox.left>=-1&&actionsBox.right<=innerWidth+1,
      workspaceInsideViewport:workBox.left>=-1&&workBox.right<=innerWidth+1
    };
  });
}

function sameSignature(actual,golden,label){
  for(const section of Object.keys(golden)){
    for(const [key,value] of Object.entries(golden[section])){
      assert(actual[section][key]===value,`${label}: ${section}.${key} differs actual=${actual[section][key]} golden=${value}`);
    }
  }
}

async function settleVisualState(page,frame){
  await page.mouse.move(1,1);
  await frame.evaluate(async()=>{
    try{document.activeElement?.blur?.()}catch(_){}
    const selectors=['.duduq-smart-ts-clear','.duduq-smart-ts-confirm','.duduq-smart-ts-token','.duduq-smart-ts-choice'];
    const elements=selectors.flatMap(selector=>[...document.querySelectorAll(selector)]);
    for(const el of elements){try{el.blur?.()}catch(_){}}
    const sample=()=>elements.map(el=>{
      const s=getComputedStyle(el);
      return [s.boxShadow,s.transform,s.filter,s.backgroundColor,s.backgroundImage,s.borderTopColor].join('|');
    }).join('\n');
    await new Promise(resolve=>{
      let previous='';
      let stableFrames=0;
      let frames=0;
      const tick=()=>{
        const current=sample();
        stableFrames=current===previous?stableFrames+1:0;
        previous=current;
        frames+=1;
        if(stableFrames>=2||frames>=120){resolve();return;}
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  });
}

async function goldenFunctional(page,frame,answerText,viewportName){
  const audio=frame.locator('.duduq-ts-audio-button');
  await audio.waitFor({state:'visible',timeout:10_000});
  assert(await audio.isEnabled(),`${viewportName}: golden audio disabled`);
  await audio.click().catch(()=>{});

  const selectable=frame.locator('.duduq-smart-ts-token,.duduq-smart-ts-choice');
  assert(await selectable.count()>0,`${viewportName}: golden alternatives missing`);
  const clear=frame.locator('.duduq-smart-ts-clear');
  const confirm=frame.locator('.duduq-smart-ts-confirm');
  await selectable.first().click();
  await frame.waitForFunction(()=>{const b=document.querySelector('.duduq-smart-ts-clear');return Boolean(b&&!b.disabled);},null,{timeout:5_000});
  await clear.click();
  await frame.waitForFunction(()=>{const b=document.querySelector('.duduq-smart-ts-confirm');return Boolean(b&&b.disabled);},null,{timeout:5_000});

  const candidate=selectable.filter({hasText:answerText}).first();
  assert(await candidate.count()===1,`${viewportName}: golden correct alternative not found: ${answerText}`);
  await candidate.click();
  await frame.waitForFunction(()=>{const b=document.querySelector('.duduq-smart-ts-confirm');return Boolean(b&&!b.disabled);},null,{timeout:5_000});
  await confirm.click();
  await page.waitForFunction(()=>window.__Y3_SMART_STANDARD_COMPLETIONS__===1,null,{timeout:15_000});
  await page.waitForTimeout(250);
  const completions=await page.evaluate(()=>window.__Y3_SMART_STANDARD_COMPLETIONS__);
  assert(completions===1,`${viewportName}: golden Host completion expected 1, got ${completions}`);
}

const browser=await chromium.launch({headless:true});
try{
  let globalCount=null;
  fs.mkdirSync('test-results/year3-smart-standard',{recursive:true});

  for(const viewport of viewports){
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height}});
    const page=await context.newPage();

    await waitModule(page,1);
    const goldenMount=await mountSmart(page,1,GOLDEN_ID,{trackCompletion:true});
    await settleVisualState(page,goldenMount.frame);
    const golden=await visualProof(goldenMount.frame);
    assert(golden.marker===GOLDEN_ID,`${viewport.name}: golden style marker missing`);
    assert(golden.documentMarker===GOLDEN_ID,`${viewport.name}: golden document marker missing`);
    assert(golden.imageCentered,`${viewport.name}: golden stimulus image not centered`);
    assert(golden.outerOverflow<=1,`${viewport.name}: golden horizontal overflow ${golden.outerOverflow}`);
    assert(golden.workspaceInsideViewport&&golden.actionsInsideViewport,`${viewport.name}: golden workspace/actions clipped`);
    await goldenFunctional(page,goldenMount.frame,goldenMount.info.answerText,viewport.name);

    const goldenSignature=golden.signatures;
    let viewportCount=0;
    for(let moduleNumber=1;moduleNumber<=6;moduleNumber+=1){
      await waitModule(page,moduleNumber);
      const ids=await smartIds(page,moduleNumber);
      viewportCount+=ids.length;
      for(const id of ids){
        const mounted=await mountSmart(page,moduleNumber,id);
        await settleVisualState(page,mounted.frame);
        const proof=await visualProof(mounted.frame);
        const label=`${viewport.name}/${id}`;
        assert(proof.marker===GOLDEN_ID,`${label}: standard layer missing`);
        assert(proof.documentMarker===GOLDEN_ID,`${label}: standard document marker missing`);
        assert(proof.hierarchy.stimulusBeforeWorkspace,`${label}: stimulus/workspace hierarchy changed`);
        assert(proof.hierarchy.dialogueBeforeWorkspace,`${label}: dialogue/workspace hierarchy changed`);
        assert(proof.hierarchy.workspaceBeforeBank,`${label}: workspace/bank hierarchy changed`);
        assert(proof.hierarchy.bankBeforeActions,`${label}: bank/actions hierarchy changed`);
        assert(proof.clearVisible&&proof.confirmVisible,`${label}: LIMPAR/CONFIRMAR not visible`);
        assert(proof.audioVisible,`${label}: header audio not visible`);
        assert(proof.imageCentered,`${label}: stimulus image not centered`);
        if(proof.boxes.image)assert(proof.imageObjectFit==='contain',`${label}: stimulus image object-fit ${proof.imageObjectFit}`);
        assert(proof.outerOverflow<=1,`${label}: horizontal overflow ${proof.outerOverflow}`);
        assert(proof.workspaceInsideViewport,`${label}: workspace clipped horizontally`);
        assert(proof.actionsInsideViewport,`${label}: actions clipped horizontally`);
        sameSignature(proof.signatures,goldenSignature,label);
      }
    }
    if(globalCount==null)globalCount=viewportCount;
    assert(viewportCount===globalCount,`${viewport.name}: Smart count changed ${viewportCount}/${globalCount}`);
    assert(viewportCount===EXPECTED_SMART_TOTAL,`${viewport.name}: expected ${EXPECTED_SMART_TOTAL} Smart Sentence activities, got ${viewportCount}`);
    await page.screenshot({path:`test-results/year3-smart-standard/summary-${viewport.name}.png`,fullPage:true}).catch(()=>{});
    console.log(`SMART_SENTENCE_STANDARD ${viewport.name} = PASS — ${viewportCount}/${EXPECTED_SMART_TOTAL}`);
    await context.close();
  }

  console.log(`SMART_SENTENCE_GOLDEN_REFERENCE = ${GOLDEN_ID}`);
  console.log('SMART_SENTENCE_VISUAL_STANDARD = APPLIED');
  console.log('SMART_SENTENCE_RESPONSIVENESS = PASS');
  console.log('SMART_SENTENCE_CLEAR_CONFIRM_FUNCTION = PASS');
  console.log('SMART_SENTENCE_HOST_COMPLETION = PASS');
  console.log('SMART_SENTENCE_STANDARDIZATION = PASS');
}finally{
  await browser.close();
}
