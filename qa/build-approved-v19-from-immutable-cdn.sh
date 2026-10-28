#!/usr/bin/env bash
# Source: pinned Cloudflare V19, reference SHA-256 manifest; QA or official release.
set -Eeuo pipefail
export CI=true
export EXPECTED_ARTIFACT_SHA256=CED5F33E2DCD0DB33D66B7602162FA3520AA88A9F605B655A3E160726567F71E
node --check qa/import-v19-immutable-cdn.mjs
node qa/import-v19-immutable-cdn.mjs
node qa/verify-artifact.mjs
echo '695E973CC8F9F36FE09A42827334AB8C22887B58BD5F41CA1C51576ACB3866C1  functions/play/english/_middleware.js' | sha256sum --check
node --input-type=module <<'NODE'
import {readFileSync} from 'node:fs';
let activities=0,modules=0;
const mechanics={};
for(let year=1;year<=5;year++)for(let n=1;n<=6;n++){
 const month=String(n).padStart(2,'0'),root='dist-pages/play/english/year-'+year+'/module-'+month+'/';
 const page=readFileSync(root+'index.html','utf8');
 if(!page.includes('<html'))throw Error('MODULE_ROUTE_INVALID:'+root);
 const p='dist-pages/content/english/year-'+year+'/module-'+month+'/questions.json';
 const data=JSON.parse(readFileSync(p,'utf8'));
 const mod='Y'+year+'M'+month;
 if(data.items?.length!==20 || data.moduleId!==mod)throw Error('MODULE_CURRICULUM_INVALID:'+mod);
 for(const item of data.items){
  if(!item.item_id?.startsWith(mod+'-'))throw Error('CURRICULUM_ID_INVALID:'+mod);
  const k=item.mechanicId||'unknown';
  mechanics[k]=(mechanics[k]||0)+1;activities++;
 }
 modules++;
}
if(modules!==30 || activities!==600)throw Error('MODULE_COUNT_MISMATCH');
console.log('DUDUQ_V19_ALL_MODULES=PASS:'+modules+':'+activities);
console.log('DUDUQ_V19_MECHANICS_INVENTORY='+JSON.stringify(mechanics));
NODE
echo "DUDUQ_V19_FULL_RELEASE_READY=PASS:$EXPECTED_ARTIFACT_SHA256"
