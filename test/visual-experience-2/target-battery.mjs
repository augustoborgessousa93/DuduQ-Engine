import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const out='test-results/visual-experience-2';
await fs.mkdir(out,{recursive:true});
const report={battery:1,mission:"target-stabilization-20260912",mechanic:'target-shooter',base:'00c1ba10042eb91fbc98d86f1cb8f33f640263ef',startedAt:new Date().toISOString(),cases:[],screenshots:[],limitations:[],status:'RUNNING'};
const base=process.env.BASE_URL||'http://127.0.0.1:8765';
const browser=await chromium.launch({headless:true});
const dimensions=[[1366,900],[1200,800],[1071,549],[865,549],[768,700],[768,1024],[390,700],[390,844]];
const evidenceSizes=new Set(['1366x900','1071x549','865x549','768x700','390x700','390x844']);
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
  await frame.waitForFunction(()=>{
    const boot=document.querySelector('#duduq-boot');
    return !boot || boot.hidden || getComputedStyle(boot).display==='none' ||
      getComputedStyle(boot).visibility==='hidden' || getComputedStyle(boot).pointerEvents==='none';
  },{}, {timeout:15000});
  await frame.evaluate(()=>document.fonts.ready);
  return frame;
}

async function inspect(frame){
  return frame.evaluate(()=>{
    const w=innerWidth,h=innerHeight;
    const visible=element=>{const r=element.getBoundingClientRect(),s=getComputedStyle(element);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';};
    const controls=[...document.querySelectorAll('button')].filter(visible).filter(e=>!e.disabled);
    const clipped=controls.filter(e=>{const r=e.getBoundingClientRect();
      if(r.left< -2||r.right>w+2||r.top< -2||r.bottom>h+2)return true;
      for(let p=e.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),a=p.getBoundingClientRect();
        if(/hidden|clip|auto|scroll/.test(s.overflowX)&& (r.left<a.left-2||r.right>a.right+2))return true;
        if(/hidden|clip|auto|scroll/.test(s.overflowY)&& (r.top<a.top-2||r.bottom>a.bottom+2))return true;
      }return false;
    }).map(e=>e.getAttribute('aria-label')||e.textContent.trim());
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
      const frame=await frameFor(page,'before');
      await capture(page,`target-before-${width}x${height}-initial`);
      const stage=JSON.parse(await frame.locator('#targetShooterConfig').textContent()).stages[0];
      const bad=stage.items.find(i=>!stage.rule.values.includes(i.id));
      await frame.getByRole('button',{name:`Lançar estrela no alvo ${bad.id}`,exact:true}).click();
      await frame.locator('.duduq-engine-feedback[data-state="retry"]').waitFor();
      await capture(page,`target-before-${width}x${height}-retry`);
      report.baselineRetry??={};
      report.baselineRetry[`${width}x${height}`]=await inspect(frame);
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
      result.checks.mount=true; result.checks.ready=true;
      const g=result.geometry;
      const reg=regressions(g,result.baselineGeometry);
      result.responsiveRegression=reg;
      if(g.overflow>2) failure(result,`Horizontal overflow regression: ${reg.overflowDelta}px`);
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
      const startCount=await page.evaluate(()=>window.VX_EVIDENCE.events.filter(e=>e.type==='duduq:step-start').length);

      await frame.getByRole('button',{name:`Lançar estrela no alvo ${bad.id}`,exact:true}).click();
      await frame.locator('.duduq-engine-feedback[data-state="retry"]').waitFor({timeout:10000});
      result.checks.wrongDoesNotComplete=await completeCount()===initialCount;
      result.checks.wrongDoesNotAdvance=await page.evaluate(n=>window.VX_EVIDENCE.events.filter(e=>e.type==='duduq:step-start').length===n,startCount);
      if(!result.checks.wrongDoesNotAdvance) failure(result,'Wrong answer advanced Host step');
      if(!result.checks.wrongDoesNotComplete) failure(result,'Wrong answer completed Host step');
      await capture(page,`target-after-${key}-retry`);
      result.retryGeometry=await inspect(frame);
      const retryReg=regressions(result.retryGeometry,g);
      if(retryReg.addedClipped.length) failure(result,`Retry introduced clipped controls: ${retryReg.addedClipped.join(', ')}`);

      await frame.getByRole('button',{name:`Lançar estrela no alvo ${good.id}`,exact:true}).click();
      // Completion belongs to the parent. Do not touch the outgoing iframe.
      await page.waitForFunction(({complete,start})=>{
        const events=window.VX_EVIDENCE.events;
        return events.filter(e=>e.type==='duduq:step-complete').length>=complete+1 &&
          events.filter(e=>e.type==='duduq:step-start').length>=start+1;
      },{complete:initialCount,start:startCount},{timeout:15000});
      frame=await frameFor(page,'after');
      result.events=await page.evaluate(()=>window.VX_EVIDENCE.events);
      result.checks.singleCompletion=result.events.filter(e=>e.type==='duduq:step-complete').length===initialCount+1;
      result.checks.hostAdvance=result.events.filter(e=>e.type==='duduq:step-start').length===startCount+1;
      if(!result.checks.singleCompletion) failure(result,'Duplicate completion');
      if(!result.checks.hostAdvance) failure(result,'Host advance count must equal one');
      await capture(page,`target-after-${key}-advanced`);
      result.checks.functional=true;
    }catch(error){failure(result,error.message);await capture(page,`target-after-${key}-failure`).catch(()=>{});}
    finally{await page.close();}
    result.classifications=result.failures.map(message=>({message,category:
      /outside viewport|clipped|Collapsed|overflow|scaling|Raster/.test(message)?'PRODUCT_RESPONSIVE_BLOCKER':
      /Timeout|Unloaded|Baseline unavailable/.test(message)?'ENVIRONMENT_LIMITATION':'HARNESS_BUG'}));
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
      report.resize.push({arena:candidate.arena,width,overflow:candidate.overflow,baselineOverflow:baseline.overflow,addedClipped:reg.addedClipped,overflowDelta:reg.overflowDelta});
    }
    report.reducedMotion=await frameAfter.locator('.duduq-ts-target').first().evaluate(e=>getComputedStyle(e).animationName==='none');
    report.performance=await frameAfter.evaluate(()=>({activeAnimations:document.getAnimations().filter(a=>a.playState==='running').length}));
  }catch(error){report.limitations.push(`Resize/reduced-motion: ${error.message}`);}
  finally{await sweepAfter.close();await sweepBefore.close();}
}finally{
  report.status=report.cases.length===11&&report.cases.every(c=>c.status==='PASS')&&report.reducedMotion&&report.resize?.length===13&&report.resize.every(r=>r.overflow<=2&&!r.addedClipped.length&&r.arena?.height>=64)?'PASS':'NO-GO';
  report.finishedAt=new Date().toISOString();
  await fs.writeFile(`${out}/target-report.json`,JSON.stringify(report,null,2));
  await browser.close();
  console.log(JSON.stringify({status:report.status,cases:report.cases.map(c=>({key:c.key,status:c.status,failures:c.failures})),limitations:report.limitations},null,2));
}
if(report.status!=='PASS') process.exitCode=1;