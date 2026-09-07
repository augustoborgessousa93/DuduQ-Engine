import fs from 'node:fs';
import { chromium } from 'playwright';
const BASE=process.env.BASE_URL||'http://127.0.0.1:4173';
function assert(ok,msg){if(!ok)throw new Error(msg)}
const browser=await chromium.launch({headless:true});
const modules=[];
try{
  for(let moduleNumber=1;moduleNumber<=6;moduleNumber++){
    const tag=String(moduleNumber).padStart(2,'0');
    const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e)));
    const response=await page.goto(`${BASE}/content/english/year-3/module-${tag}/index.html?final-r151=1`,{waitUntil:'domcontentloaded',timeout:45_000});
    assert(response?.ok(),`M${tag}: HTTP ${response?.status()}`);
    await page.waitForFunction(tag=>Boolean(window.DUDUQ_ENGINE_READY&&window.DUDUQ_CONTENT?.english?.year3?.[`module${tag}`]),tag,{timeout:45_000});
    const snapshot=await page.evaluate(tag=>{
      const m=window.DUDUQ_CONTENT.english.year3[`module${tag}`];
      return {module:m.module,version:m.version,activities:m.activities.length,implementationStatus:m.implementationStatus,contentStatus:m.contentStatus,mechanicStatus:m.mechanicStatus,technicalStatus:m.technicalStatus,technicalBlockers:m.technicalBlockers,visualStatus:m.visualStatus,publicationStatus:m.publicationStatus,assetImplementationGate:m.assetImplementationGate,canonicalAssetGate:m.canonicalAssetGate,pendingCanonicalAssets:m.pendingCanonicalAssets||[],revision:window.DUDUQ_ENGINE_MANIFEST?.revision,core:window.DUDUQ_ENGINE_MANIFEST?.core?.release,targetShooter:window.DUDUQ_ENGINE_MANIFEST?.mechanics?.['target-shooter']?.release};
    },tag);
    assert(snapshot.activities===15,`M${tag}: ${snapshot.activities}/15`);
    assert(snapshot.implementationStatus==='PASS'&&snapshot.contentStatus==='PASS'&&snapshot.mechanicStatus==='PASS'&&snapshot.technicalStatus==='PASS'&&snapshot.technicalBlockers===0,`M${tag}: implementation ${JSON.stringify(snapshot)}`);
    assert(snapshot.revision===151&&snapshot.core==='1.0.12'&&snapshot.targetShooter==='1.0.23',`M${tag}: engine ${JSON.stringify(snapshot)}`);
    assert(errors.length===0,`M${tag}: page errors ${errors.join(' | ')}`);
    modules.push(snapshot);await context.close();
  }
}finally{await browser.close()}

const pending=modules.flatMap(m=>m.pendingCanonicalAssets.map(item=>({...item,module:m.module}))).sort((a,b)=>a.module-b.module||String(a.id).localeCompare(String(b.id)));
assert(modules.reduce((sum,m)=>sum+m.activities,0)===90,'Year 3 must contain 90 activities');
assert(pending.length>0,'Year 3 must remain publication NO-GO while placeholder visuals exist');
assert(modules.slice(2).every(m=>m.visualStatus==='PLACEHOLDER'&&/^NO-GO/.test(m.publicationStatus)),`M03-M06 visual/publication status ${JSON.stringify(modules.slice(2))}`);

const unique=new Map();for(const item of pending)unique.set(`${item.module}:${item.id}`,item);
const consolidated=[...unique.values()];
fs.mkdirSync('test-results/year3',{recursive:true});
fs.writeFileSync('test-results/year3/pending-canonical-assets.json',JSON.stringify({schemaVersion:1,year:3,status:'PENDING',count:consolidated.length,items:consolidated},null,2)+'\n');
fs.writeFileSync('test-results/year3/year3-status.json',JSON.stringify({schemaVersion:1,year:3,implementationStatus:'PASS',publicationStatus:'NO-GO — CANONICAL ASSETS PENDING',canaryRevision:151,core:'1.0.12',targetShooter:'1.0.23',activities:90,modules:modules.map(m=>({module:m.module,version:m.version,activities:m.activities,implementationStatus:m.implementationStatus,visualStatus:m.visualStatus,publicationStatus:m.publicationStatus,pendingCanonicalAssets:m.pendingCanonicalAssets.length})),pendingCanonicalAssets:consolidated.length},null,2)+'\n');

console.log(`YEAR3_PENDING_CANONICAL_ASSETS = ${consolidated.length}`);
for(const item of consolidated)console.log(`PENDING M${String(item.module).padStart(2,'0')} ${item.id} -> ${item.expectedCanonicalAsset} (${item.placeholder})`);
console.log('YEAR3_IMPLEMENTATION_STATUS = PASS');
console.log(`YEAR3_PUBLICATION_STATUS = NO-GO — ${consolidated.length} CANONICAL ASSETS PENDING`);
console.log('YEAR3_IMPLEMENTATION_COMPLETE');
console.log('READY_FOR_USER_TEST_WITH_PLACEHOLDERS');
