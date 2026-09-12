import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const out='test-results/visual-experience-2';
await fs.mkdir(out,{recursive:true});
const report={battery:2,mechanic:'target-shooter',base:'00c1ba10042eb91fbc98d86f1cb8f33f640263ef',startedAt:new Date().toISOString(),cases:[],screenshots:[],limitations:[],status:'RUNNING'};
const base=process.env.BASE_URL||'http://127.0.0.1:8765';
const browser=await chromium.launch({headless:true});
const dimensions=[[1366,900],[1200,800],[1071,549],[865,549],[768,700],[768,1024],[390,700],[390,844]];
const evidenceSizes=new Set(['1366x900','768x1024','390x844']);
const failure=(result,message)=>result.failures.push(message);

async function capture(page,name){
  await page.screenshot({path:`${out}/${name}.png`,animations:'disabled'});
  report.screenshots.push(`${name}.png`);
}

async function frameFor(page,variant){
  await page.locator('#root iframe').waitFor({timeout:45000});
  const frame=await (await page.locator('#root iframe').elementHandle()).contentFrame();
  await frame.locator('.duduq-ts-target').first().waitFor({timeout:45000});
  if(variant==='after') await frame.waitForFunction(()=>document.documentElement.dataset.vxReady==='true',{}, {timeout:15000});
  await frame.waitForFunction(()=>Array.from(document.images).every(img=>img.complete),{}, {timeout:20000});
  return frame;
}

async function inspect(frame){
  return frame.evaluate(()=>{
    const w=innerWidth,h=innerHeight;
    const visible=element=>{const r=element.getBoundingClientRect(),s=getComputedStyle(element);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';};
    const controls=[...document.querySelectorAll('button')].filter(visible).filter(e=>!e.disabled);
    const clipped=controls.filter(e=>{const r=e.getBoundingClientRect();return r.left< -2||r.right>w+2||r.top< -2||r.bottom>h+2;}).map(e=>e.getAttribute('aria-label')||e.textContent.trim());
    const images=[...document.images].filter(visible).map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {src:e.currentSrc,natural:[e.naturalWidth,e.naturalHeight],rendered:[r.width,r.height],fit:s.objectFit,transform:s.transform,lowRes:e.naturalWidth<r.width*devicePixelRatio*.8||e.naturalHeight<r.height*devicePixelRatio*.8};});
    const roots=[...document.querySelectorAll('.duduq-engine-root,.duduq-engine-shell,.duduq-engine-stage')].map(e=>({class:e.className,transform:getComputedStyle(e).transform,zoom:getComputedStyle(e).zoom}));
    const arena=document.querySelector('.duduq-ts-arena')?.getBoundingClientRect();
    return {width:w,height:h,dpr:devicePixelRatio,overflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-w,clipped,images,roots,arena:arena&&{width:arena.width,height:arena.height},focusable:controls.length,motion:matchMedia('(prefers-reduced-motion: reduce)').matches};
  });
}

function regressions(candidate,baseline){
  if(!baseline) return {addedClipped:candidate.clipped,overflowDelta:Math.max(0,candidate.overflow)};
  return {
    addedClipped:candidate.clipped.filter(name=>!baseline.clipped.includes(name)),
    overflowDelta:candidate.overflow-baseline.overflow
  };
}

async function baselineGeometry(width,height,dpr){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:dpr});
  try{
    await page.goto(`${base}/test/visual-experience-2/target.html?visual=before`,{waitUntil:'domcontentloaded'});
    const frame=await frameFor(page,'before');
    return await inspect(frame);
  }finally{await page.close();}
}

try{
  for(const [width,height] of dimensions.filter(([w,h])=>evidenceSizes.has(`${w}x${h}`))){
    const page=await browser.newPage({viewport:{width,height}});
    try{
      await page.goto(`${base}/test/visual-experience-2/target.html?visual=before`,{waitUntil:'domcontentloaded'});
      await frameFor(page,'before');
      await capture(page,`target-before-${width}x${height}-initial`);
    }catch(error){report.limitations.push(`Before ${width}x${height}: ${error.message}`);}
    await page.close();
  }

  const scenarios=[...dimensions.map(([width,height])=>({width,height,dpr:1})),...[[1366,900],[768,1024],[390,844]].map(([width,height])=>({width,height,dpr:2}))];
  for(const {width,height,dpr} of scenarios){
    const key=`${width}x${height}-dpr${dpr}`;
    const result={key,failures:[],checks:{},errors:[]};
    report.cases.push(result);

    try{result.baselineGeometry=await baselineGeometry(width,height,dpr);}catch(error){failure(result,`Baseline unavailable: ${error.message}`);}

    const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:dpr});
    page.on('pageerror',e=>result.errors.push(e.message));
    try{
      await page.goto(`${base}/test/visual-experience-2/target.html`,{waitUntil:'domcontentloaded'});
      let frame=await frameFor(page,'after');
      result.geometry=await inspect(frame);
      const g=result.geometry;
      const reg=regressions(g,result.baselineGeometry);
      result.responsiveRegression=reg;
      if(reg.overflowDelta>2) failure(result,`Horizontal overflow regression: ${reg.overflowDelta}px`);
      if(reg.addedClipped.length) failure(result,`New controls outside viewport: ${reg.addedClipped.join(', ')}`);
      if(!g.arena||g.arena.width<200||g.arena.height<50) failure(result,'Collapsed arena');
      if(g.images.some(i=>!i.natural[0])) failure(result,'Unloaded image');
      if(g.images.some(i=>i.fit!=='contain')) failure(result,'Image not rendered with contain');
      if(g.roots.some(r=>r.transform!=='none'||!['1','normal'].includes(r.zoom))) failure(result,'Global scaling');
      result.checks.highDpi=g.images.every(i=>!i.lowRes);
      if(dpr===2&&!result.checks.highDpi) failure(result,'Raster source below DPR2 displayed size');
      await capture(page,`target-after-${key}-initial`);

      const audio=frame.locator('.duduq-ts-audio-button');
      await audio.focus();
      result.checks.keyboardFocus=await audio.evaluate(e=>document.activeElement===e&&getComputedStyle(e).outlineStyle!=='none');
      if(!result.checks.keyboardFocus) failure(result,'Visible keyboard focus missing');
      await audio.click();
      result.checks.audioRequested=true;
      result.checks.audioPlaying=await audio.getAttribute('data-playing')==='true';
      if(!result.checks.audioPlaying) report.limitations.push(`${key}: native audio playback state was not observed; no audibility claim.`);
      await capture(page,`target-after-${key}-interaction`);
      await frame.waitForFunction(()=>document.querySelector('.duduq-ts-audio-button')?.disabled===false,{}, {timeout:15000});

      const config=await frame.locator('#targetShooterConfig').textContent();
      const stage=JSON.parse(config).stages[0];
      const good=stage.items.find(i=>stage.rule.values.includes(i.id));
      const bad=stage.items.find(i=>!stage.rule.values.includes(i.id));
      assert(good&&bad,'Need real correct and incorrect alternatives');
      const completeCount=()=>page.evaluate(()=>window.VX_EVIDENCE.events.filter(e=>e.type==='duduq:step-complete').length);
      const initialCount=await completeCount();

      await frame.getByRole('button',{name:`Lançar estrela no alvo ${bad.id}`,exact:true}).click();
      await frame.locator('.duduq-engine-feedback[data-state="retry"]').waitFor({timeout:10000});
      result.checks.wrongDoesNotComplete=await completeCount()===initialCount;
      if(!result.checks.wrongDoesNotComplete) failure(result,'Wrong answer completed Host step');
      await capture(page,`target-after-${key}-retry`);
      result.retryGeometry=await inspect(frame);
      const retryReg=regressions(result.retryGeometry,g);
      if(retryReg.addedClipped.length) failure(result,`Retry introduced clipped controls: ${retryReg.addedClipped.join(', ')}`);

      await frame.getByRole('button',{name:`Lançar estrela no alvo ${good.id}`,exact:true}).click();
      await frame.locator('.duduq-engine-feedback[data-state="success"]').waitFor({timeout:10000});
      await capture(page,`target-after-${key}-correct`);
      result.correctGeometry=await inspect(frame);
      const successReg=regressions(result.correctGeometry,g);
      if(successReg.addedClipped.length) failure(result,`Success introduced clipped controls: ${successReg.addedClipped.join(', ')}`);

      const advance=frame.locator('.duduq-engine-feedback-action');
      await advance.click();
      await page.waitForFunction(n=>window.VX_EVIDENCE.events.filter(e=>e.type==='duduq:step-complete').length===n+1,initialCount,{timeout:15000});
      frame=await frameFor(page,'after');
      result.checks.singleCompletion=await completeCount()===initialCount+1;
      result.checks.hostAdvance=await frame.locator('.duduq-ts-target').count()>0;
      if(!result.checks.singleCompletion) failure(result,'Duplicate completion');
      if(!result.checks.hostAdvance) failure(result,'Host did not advance to a playable Target step');
      result.checks.functional=true;
    }catch(error){failure(result,error.message);await capture(page,`target-after-${key}-failure`).catch(()=>{});}
    finally{await page.close();}
    result.status=result.failures.length?'FAIL':'PASS';
  }

  const sweepAfter=await browser.newPage({viewport:{width:1366,height:700},reducedMotion:'reduce'});
  const sweepBefore=await browser.newPage({viewport:{width:1366,height:700},reducedMotion:'reduce'});
  try{
    await sweepAfter.goto(`${base}/test/visual-experience-2/target.html`,{waitUntil:'domcontentloaded'});
    await sweepBefore.goto(`${base}/test/visual-experience-2/target.html?visual=before`,{waitUntil:'domcontentloaded'});
    const frameAfter=await frameFor(sweepAfter,'after');
    const frameBefore=await frameFor(sweepBefore,'before');
    report.resize=[];
    for(const width of [390,430,480,540,600,700,768,865,960,1071,1200,1280,1366]){
      await sweepAfter.setViewportSize({width,height:700});
      await sweepBefore.setViewportSize({width,height:700});
      await frameAfter.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await frameBefore.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const candidate=await inspect(frameAfter);
      const baseline=await inspect(frameBefore);
      const reg=regressions(candidate,baseline);
      report.resize.push({width,overflow:candidate.overflow,baselineOverflow:baseline.overflow,addedClipped:reg.addedClipped,overflowDelta:reg.overflowDelta});
    }
    report.reducedMotion=await frameAfter.locator('.duduq-ts-target').first().evaluate(e=>getComputedStyle(e).animationName==='none');
    report.performance=await frameAfter.evaluate(()=>({activeAnimations:document.getAnimations().filter(a=>a.playState==='running').length}));
  }catch(error){report.limitations.push(`Resize/reduced-motion: ${error.message}`);}
  finally{await sweepAfter.close();await sweepBefore.close();}
}finally{
  report.status=report.cases.length===11&&report.cases.every(c=>c.status==='PASS')&&report.reducedMotion&&report.resize?.length===13&&report.resize.every(r=>r.overflowDelta<=2&&!r.addedClipped.length)?'PASS':'NO-GO';
  report.finishedAt=new Date().toISOString();
  await fs.writeFile(`${out}/target-report.json`,JSON.stringify(report,null,2));
  await browser.close();
  console.log(JSON.stringify({status:report.status,cases:report.cases.map(c=>({key:c.key,status:c.status,failures:c.failures})),limitations:report.limitations},null,2));
}
if(report.status!=='PASS') process.exitCode=1;