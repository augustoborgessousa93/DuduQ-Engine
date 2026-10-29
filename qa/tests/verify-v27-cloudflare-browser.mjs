import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root='http://127.0.0.1:4175';
const out='qa/results/cloudflare-eraser-browser-screenshots';
const reportPath='qa/results/cloudflare-eraser-browser-qa.json';
const expectedHash='aa9e4f93e83c0769d97f781be2ceee8bb9cf11950e668130cb5e5aba3bb5a5c2';
const cases=[
  {qid:'Y1M04-Q015',viewport:{width:1366,height:768}},
  {qid:'Y1M04-Q015',viewport:{width:390,height:844}},
  {qid:'Y1M04-Q020',viewport:{width:1366,height:768}},
  {qid:'Y1M04-Q020',viewport:{width:390,height:844}}
];
const report={schemaVersion:'DUDUQ_ERASER_V2_RENDERED_QA_V1',source:'isolated V26 + reviewed V2 overlay',expectedHash,production:false,humanPedagogicalApproval:false,checks:[]};
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  for(const test of cases){
    const page=await browser.newPage({viewport:test.viewport,deviceScaleFactor:1});
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e.message||e)));
    const url=root+'/play/target-shooter/?duduqModule=Y1M04&duduqItem='+test.qid+'&qaSeed=20261029';
    const result={questionId:test.qid,viewport:test.viewport,url,pass:false};
    try{
      await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
      const locator=page.locator('.target-shooter-target__animal[src*="cf-y1m04-eraser-v2-"]');
      await locator.waitFor({state:'visible',timeout:30000});
      await page.waitForFunction(() => {
        const img=document.querySelector('.target-shooter-target__animal[src*="cf-y1m04-eraser-v2-"]');
        return img && img.complete && img.naturalWidth===1920 && img.naturalHeight===1920;
      },{timeout:30000});
      const info=await locator.evaluate(img=>{
        const r=img.getBoundingClientRect(),cs=getComputedStyle(img);
        return {src:img.src,alt:img.alt,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,
          bounds:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom},
          visible:cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity)>0};
      });
      if(!info.src.includes(expectedHash.slice(0,12)))throw Error('INCORRECT_ASSET_HASH_URL');
      if(info.alt.toLowerCase().trim()!=='eraser')throw Error('INCORRECT_ERASER_ALT:'+info.alt);
      if(!info.visible||info.bounds.width<24||info.bounds.height<24)throw Error('ERASER_TOO_SMALL_OR_HIDDEN');
      if(info.bounds.right<0||info.bounds.x>test.viewport.width||info.bounds.bottom<0||info.bounds.y>test.viewport.height)
        throw Error('ERASER_OFFSCREEN');
      const res=await page.request.get(info.src,{timeout:30000});
      if(res.status()!==200)throw Error('ERASER_HTTP_'+res.status());
      const actual=createHash('sha256').update(await res.body()).digest('hex');
      if(actual!==expectedHash)throw Error('ERASER_NETWORK_SHA_MISMATCH');
      const fatal=errors.filter(e=>/PRODUCTION_MEDIA_UNAVAILABLE|CANONICAL_MECHANIC_NOT_FOUND|MODULE_CONTRACT_INVALID/.test(e));
      if(fatal.length)throw Error('RUNTIME_FATAL:'+fatal.join('|').slice(0,500));
      result.asset=info;result.networkSha256=actual;result.pageErrors=errors.slice(0,8);
      result.pass=true;
      await page.screenshot({path:path.join(out,test.qid+'-'+test.viewport.width+'x'+test.viewport.height+'.png'),fullPage:true});
    }catch(e){result.error=String(e?.stack||e).slice(0,1500);await page.screenshot({path:path.join(out,test.qid+'-'+test.viewport.width+'x'+test.viewport.height+'-FAIL.png'),fullPage:true}).catch(()=>{});}
    finally{report.checks.push(result);await page.close();}
  }
}finally{await browser.close();}
report.passed=report.checks.length===4&&report.checks.every(x=>x.pass);
await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,checks:report.checks.map(x=>({questionId:x.questionId,viewport:x.viewport,pass:x.pass,error:x.error||null})),pedagogicalQa:'PENDING',production:'UNTOUCHED'}));
if(!report.passed)process.exitCode=1;
