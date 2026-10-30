#!/usr/bin/env node
/**
 * Restore question-scoped DESTINATION/TARGET option identifiers omitted by
 * initial stimulus-only matching. Never guess from filenames. Uses only
 * *already hash-verified* staged PNGs in the compiled QA preview registry.
 * Does not alter game mechanics, source questions, production or Gold Masters.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {isExactPedagogicalConcept} from '../scripts/duduq-exact-semantic-match.mjs';

const ROOT=process.cwd(),DIST=path.join(ROOT,'dist-pages');
const manifestFile=path.join(DIST,'.duduq-pages-manifest');
const registryRel='content/english/media/media-registry.json';
const sha=buf=>createHash('sha256').update(buf).digest('hex');
const manifest=new Map();
const original=await readFile(manifestFile,'utf8');
for(const line of original.trimEnd().split(/\r?\n/)){
  const m=/^(.*) ([a-f0-9]{64})$/.exec(line);
  if(!m||manifest.has(m[1]))throw Error('INVALID_PAGES_MANIFEST');
  manifest.set(m[1],m[2]);
}
if(!manifest.has(registryRel))throw Error('REGISTRY_NOT_IN_PINNED_ARTIFACT');
const originalRegistry=await readFile(path.join(DIST,registryRel));
assert.equal(sha(originalRegistry),manifest.get(registryRel),'UNPINNED_REGISTRY');
const registry=JSON.parse(originalRegistry.toString('utf8'));
const ri=new Map(registry.entries.map((x,i)=>[x.mediaId,{x,i}]));
assert.equal(ri.size,registry.entries.length);
const SCOPE=['Y1M02','Y1M03','Y1M04','Y1M06'];
const sourceMap=new Map();
for(const e of registry.entries){
  const prov=e?.provenance,qa=e?.replacementAudit;
  if(prov?.sourceRepository!=='augustoborgessousa93/Assets-DuduQ'||
    prov.sourceCommit!=='658d94f08031820cfea5258a6f4e7c24f278df92'||
    !e.urlOrPath?.startsWith('content/english/assets/images/assets-duduq-review/'))continue;
  const mod=qa?.scope||qa?.questionId?.slice(0,5);
  if(!SCOPE.includes(mod)||!e.semantic)continue;
  const k=mod+'|'+String(e.semantic).toLowerCase().trim();
  if(sourceMap.has(k) && sourceMap.get(k).sha256!==e.sha256)
    throw Error('CONFLICTING_ALREADY_IMPORTED_ART_FOR_SAME_CONCEPT:'+k);
  if(!/^[a-f0-9]{64}$/.test(e.sha256))throw Error('INVALID_PROVENANCE_SHA');
  const buf=await readFile(path.join(DIST,e.urlOrPath));
  assert.equal(sha(buf),e.sha256,'PREVIOUSLY_IMPORTED_FILE_WAS_MODIFIED');
  assert.equal(manifest.get(e.urlOrPath),e.sha256,'PREVIOUS_FILE_NOT_IN_MANIFEST');
  sourceMap.set(k,e);
}
const occurrences=new Map();
let seen=0;
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const mm=String(m).padStart(2,'0'),mod='Y'+y+'M'+mm;
 const rel='content/english/year-'+y+'/module-'+mm+'/questions.json';
 const buf=await readFile(path.join(DIST,rel));
 assert.equal(sha(buf),manifest.get(rel),'MODIFIED_QUESTION_CONTRACT:'+mod);
 const doc=JSON.parse(buf.toString('utf8'));
 assert.equal(doc.moduleId,mod);
 assert.equal(doc.items?.length,20);
 for(const q of doc.items){
  seen++;
  function traverse(n){
    if(!n||typeof n!=='object')return;
    if(!Array.isArray(n)){
      const keys=['assetId','mediaId','image_ref','imageRef'];
      for(const id of new Set(keys.map(k=>n[k]).filter(v=>typeof v==='string' && v.startsWith('IMG-')))){
        if(!occurrences.has(id))occurrences.set(id,[]);
        occurrences.get(id).push({questionId:q.item_id,moduleId:mod,
          semanticTarget:String(n.semanticTarget??'').trim(),
          mustInclude:String(n.mustInclude??'').trim(),
          role:String(n.role??'').trim()});
      }
    }
    for(const v of Object.values(n))if(v&&typeof v==='object')traverse(v);
  }
  traverse(q);
 }
}
assert.equal(seen,600);
const report={schemaVersion:'DUDUQ_DESTINATION_IMAGE_REPAIR_V1',scope:SCOPE,
 reviewOnly:true,productionUntouched:true,questionsChecked:seen,
 sourceAssets:sourceMap.size,applied:[],skipped:[],visualQA:'PENDING',pedagogicalQA:'PENDING'};
for(const [id,records] of occurrences){
 const match=/^IMG-(Y1M0[2346])-Q(\d{3})-/.exec(id);
 if(!match)continue;
 const module=match[1],question='Y1M'+module.slice(3)+'-Q'+match[2];
 const existing=ri.get(id)?.x;
 if(!existing||existing.temporary!==true||existing.kind!=='image'||existing.provenance){
   continue;
 }
 if(!records.some(x=>x.moduleId===module&&x.questionId===question)||
    records.some(x=>x.moduleId!==module||x.questionId!==question)){
   report.skipped.push({id,reason:'CROSS_QUESTION_OR_MODULE_SHARING'});continue;
 }
 const semantics=[...new Set(records.map(r=>r.semanticTarget.toLowerCase()).filter(Boolean))];
 if(semantics.length!==1 || !isExactPedagogicalConcept(semantics[0],existing.semantic)){
   report.skipped.push({id,reason:'MISSING_OR_CONFLICTING_CONCEPT'});continue;
 }
 const concept=semantics[0],asset=sourceMap.get(module+'|'+concept);
 if(!asset) {report.skipped.push({id,concept,reason:'NO_VERIFIED_EXACT_ASSET_IN_PREVIEW'});continue;}
 const incompatible=records.some(x=>x.mustInclude&&!isExactPedagogicalConcept(x.mustInclude,concept));
 if(incompatible){report.skipped.push({id,concept,reason:'COMPOSITE_OR_DIFFERENT_REQUIRED_VISUAL'});continue;}
 const expectedPath=/^(content\/english\/assets\/images\/year-1\/provisional-semantic-v1\/|content\/english\/assets\/images\/temporary\/)/;
 if(!expectedPath.test(existing.urlOrPath||'')){
   report.skipped.push({id,concept,reason:'SOURCE_WAS_NOT_PROVISIONAL_IMAGE'});continue;
 }
 const clone={...existing,
  temporary:true,status:'APPROVED',kind:'image',
  integrationStatus:'CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING',
  humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',
  urlOrPath:asset.urlOrPath,sha256:asset.sha256,
  assets:[{path:asset.urlOrPath,sha256:asset.sha256}],
  provenance:{...asset.provenance},
  replacementAudit:{questionId:question,scope:module,previewOnly:true,
   recoveredDestinationId:true,previousPath:existing.urlOrPath}};
 registry.entries[ri.get(id).i]=clone;
 report.applied.push({id,question,concept,path:asset.urlOrPath,hash:asset.sha256});
}
if(!report.applied.length)throw Error('NO_UNPATCHED_DESTINATION_IDS_FOUND');
const bytes=Buffer.from(JSON.stringify(registry,null,2)+'\n');
await writeFile(path.join(DIST,registryRel),bytes);
manifest.set(registryRel,sha(bytes));
const next=[...manifest].map(([p,s])=>p+' '+s).join('\n')+'\n';
await writeFile(manifestFile,next);
for(const [p,s] of manifest)assert.equal(sha(await readFile(path.join(DIST,p))),s,'INTEGRITY_CHECK_FAILED:'+p);
report.byModule=Object.fromEntries(SCOPE.map(mod=>[mod,report.applied.filter(e=>e.question.startsWith(mod+'-')).length]));
report.recoveredCount=report.applied.length;
report.manifestSha256=sha(Buffer.from(next));
await mkdir('qa/results',{recursive:true});
await writeFile('qa/results/assets-duduq-destination-recovery.json',JSON.stringify(report,null,2)+'\n');
console.log('DUDUQ_DESTINATION_MEDIA_RECOVERY='+JSON.stringify({recovered:report.recoveredCount,
 byModule:report.byModule,skipped:report.skipped.length,production:'UNTOUCHED',status:'REVIEW_ONLY'}));
