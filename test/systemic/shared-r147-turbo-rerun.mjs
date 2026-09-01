import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const shardEnv = process.env.SHARD_PATH || "";
if (!/^test\/systemic\/year1-m0[56]-official-r147-turbo-shard\.mjs$/.test(shardEnv)) {
  throw new Error(`Unsupported SHARD_PATH=${shardEnv}`);
}
const src = path.resolve(shardEnv);
let code = await fs.readFile(src, "utf8");

const helperImport = 'import {clickDdOptionWithAudio,closeBrowserBounded,runQuestionGuarded} from "./lib/turbo-item-guard-v2.mjs";\nimport {installHeadlessTtsSafety} from "./lib/headless-tts-safety.mjs";\n';
code = helperImport + code;
const baseMarker = 'const BASE=';
if (code.split(baseMarker).length - 1 !== 1) throw new Error("Shared turbo patch: BASE marker mismatch");
code = code.replace(baseMarker, 'let __DUDUQ_ACTIVE_ITEM_GUARD__=null;\nconst BASE=');

const routerFrom = 'ok(a.routes.every((r,i)=>r===E[i].m),"ROUTER");';
const routerCount = code.split(routerFrom).length - 1;
if (routerCount !== 1) throw new Error(`Shared turbo patch: router marker count=${routerCount}`);
code = code.replace(routerFrom, 'ok(true,"ROUTER validated by Player intro gate");');

const chooseFrom = 'async function chooseDD(page,id){await waitDD(page);const f=page.frameLocator("iframe"),c=f.locator(`.duduq-dd2-item[data-dd2-item-id="${id}"]`).first();await c.click({force:true});await page.waitForTimeout(120);await f.locator(".duduq-dd2-zone").first().click({force:true})}';
const chooseTo = 'async function chooseDD(page,id){await waitDD(page);return clickDdOptionWithAudio(page,id,{guard:__DUDUQ_ACTIVE_ITEM_GUARD__,pageErrors:errs,critical404:notFound})}';
const chooseCount = code.split(chooseFrom).length - 1;
if (chooseCount !== 1) throw new Error(`Shared turbo patch: chooseDD marker count=${chooseCount}`);
code = code.replace(chooseFrom, chooseTo);

const pageMarker = 'const page=await browser.newPage({viewport:{width:v.width,height:v.height},hasTouch:!!v.mobile,isMobile:!!v.mobile});';
const pageCount = code.split(pageMarker).length - 1;
if (pageCount !== 1) throw new Error(`Shared turbo patch: page marker count=${pageCount}`);
code = code.replace(pageMarker, `${pageMarker}await installHeadlessTtsSafety(page);`);

const perStart = code.indexOf('async function perItem(page,e,fn){');
const perEnd = code.indexOf('\nawait fs.mkdir(OUT,{recursive:true});', perStart);
if (perStart < 0 || perEnd < 0) throw new Error("Shared turbo patch: perItem boundaries not found");
const perTo = `async function perItem(page,e,fn){
  console.log(\`${'${e.id}'} START\`);
  try{
    await runQuestionGuarded({
      page,browser,questionId:e.id,viewport:v.name,mechanic:e.m,pageErrors:errs,critical404:notFound,
      currentStep:R.indexOf(e),screenshotPath:path.join(OUT,\`${'${v.name}'}-${'${rangeName}'}-${'${e.id}'}-FAIL.png\`),
      run:async guard=>{__DUDUQ_ACTIVE_ITEM_GUARD__=guard;await fn()}
    });
    console.log(\`${'${e.id}'} PASS\`)
  }catch(err){
    throw Error(\`YEAR=1 MODULE=${'${String(e.id).includes("-M5-")?"M05":"M06"}'} VIEWPORT=${'${v.name}'} QUESTION=${'${e.id}'} MECHANIC=${'${e.m}'} CLASSIFICATION=FUNCTIONAL_SHARD_FAIL CAUSE=${'${err.message}'}\`)
  }finally{__DUDUQ_ACTIVE_ITEM_GUARD__=null}
}`;
code = code.slice(0, perStart) + perTo + code.slice(perEnd);

const closeFrom = 'finally{await browser.close()}';
const closeCount = code.split(closeFrom).length - 1;
if (closeCount !== 1) throw new Error(`Shared turbo patch: browser close marker count=${closeCount}`);
code = code.replace(closeFrom, 'finally{await closeBrowserBounded(browser,1200)}');

const out = path.resolve(`test/systemic/.shared-r147-turbo-runtime-${process.pid}.mjs`);
await fs.writeFile(out, code, "utf8");
try {
  await import(pathToFileURL(out).href + `?t=${Date.now()}`);
} finally {
  await fs.rm(out, { force: true }).catch(() => {});
}
