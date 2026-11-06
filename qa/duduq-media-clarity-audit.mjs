#!/usr/bin/env node
/**
 * DUDUQ Phase 2: candidate-only semantic/distractor audit & visual review.
 * No edits to pedagogical JSON, correct answers, Gold Masters, JS mechanics or source PNGs.
 * The sizing adapter is applied only to the disposable Cloudflare PREVIEW copy.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import path from 'node:path';
assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_ONLY_GUARD');
assert.equal(process.env.DUDUQ_VISUAL_REVIEW,'1','VISUAL_REVIEW_GUARD');
const root=path.resolve('qa/fast-bilingual-immutable-candidate');
const dist=path.resolve('dist-pages');
assert(root!==dist);
const registry=JSON.parse(readFileSync(path.join(root,'content/english/media/media-registry.json'),'utf8'));
const report=JSON.parse(readFileSync('qa/results/phase2-fast-bilingual-bulk-applied.json','utf8'));
const byId=new Map(registry.entries.map(e=>[e.mediaId,e]));
assert.equal(byId.size,registry.entries.length,'MEDIA_ID_DUPLICATE');
const appliedById=new Map(report.applied.map(e=>[e.mediaId,e]));
const sha=b=>createHash('sha256').update(b).digest('hex');
const helloId='IMG-Y1M01-GREETING-GENERIC-001';
const byeId='IMG-Y1M01-FAREWELL-GENERIC-001';
const hello=appliedById.get(helloId),bye=appliedById.get(byeId);
assert(hello&&bye,'GREETING_OR_FAREWELL_NOT_APPLIED');
assert.equal(hello.sourcePath,'Imagens Ilustrativa/criancas_se_cumprimentando_children_greeting_hello.png',
 'HELLO_MUST_BE_HANDSHAKE_NOT_GENERIC_WAVE');
assert.equal(bye.sourcePath,'Imagens Ilustrativa/two_people_waving_goodbye_see_you.png',
 'GOODBYE_MUST_SHOW_PERSON_LEAVING');
assert.notEqual(hello.sourceGitBlob,bye.sourceGitBlob,'HELLO_AND_GOODBYE_SAME_IMAGE');
const htmlSafe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const questions=[],collision=[],missing=[],perModule=new Map(),byImage=new Map();
let imageChoiceCount=0;
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const rel='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const q=JSON.parse(readFileSync(path.join(root,rel),'utf8'));
 assert.equal(q.items.length,20,'NOT_20_PER_MODULE:'+rel);
 for(const item of q.items){
  const questionId=item.item_id;
  const seen=new Map();
  const opts=Array.isArray(item.options)?item.options:[];
  for(const opt of opts){
   if(!opt.mediaId)continue;
   imageChoiceCount++;
   const e=byId.get(opt.mediaId);
   if(!e){missing.push({questionId,mediaId:opt.mediaId});continue}
   if(!e.sha256||!e.urlOrPath?.endsWith('.png'))continue;
   const key=e.sha256;
   const prev=seen.get(key);
   if(prev&&prev.optionId!==opt.optionId&&prev.mediaId!==opt.mediaId){
    collision.push({questionId,mechanic:item.mechanicId,
      sourceHash:key,sourcePath:e.urlOrPath,
      first:{optionId:prev.optionId,label:prev.label,correct:prev.correct,mediaId:prev.mediaId},
      second:{optionId:opt.optionId,label:opt.label,correct:opt.correct,mediaId:opt.mediaId},
      newlyMapped:appliedById.has(prev.mediaId)||appliedById.has(opt.mediaId),
      correctVsIncorrect:Boolean(prev.correct)!==Boolean(opt.correct)});
   }else seen.set(key,opt);
   const reuse=byImage.get(key)||{path:e.urlOrPath,questions:new Set(),concepts:new Set(),ids:new Set()};
   reuse.questions.add(questionId);reuse.ids.add(opt.mediaId);
   reuse.concepts.add(appliedById.get(opt.mediaId)?.concept||e.semantic||opt.label||'');
   byImage.set(key,reuse);
   const module=questionId.slice(0,5);
   if(!perModule.has(module))perModule.set(module,new Set());
   perModule.get(module).add(key);
  }
  questions.push(questionId);
 }
}
assert.equal(questions.length,600,'NOT_600_QUESTIONS');
const newCollisions=collision.filter(x=>x.newlyMapped&&x.correctVsIncorrect);
assert.equal(newCollisions.length,0,'NEWLY_MAPPED_CORRECT_AND_DISTRACTOR_SAME_PNG');
const pairs=[];
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const rel='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const d=JSON.parse(readFileSync(path.join(root,rel)));
 for(const item of d.items){
  const opts=(item.options||[]).filter(o=>o.mediaId===helloId||o.mediaId===byeId);
  if(opts.length>1){pairs.push({questionId:item.item_id,mechanic:item.mechanicId,
    greetingPresent:opts.some(o=>o.mediaId===helloId),farewellPresent:opts.some(o=>o.mediaId===byeId)})}
 }
}
assert(pairs.some(p=>p.questionId==='Y1M01-Q001'),'HELLO_GOODBYE_CONTRAST_MISSING_Q001');
const group=new Map();
for(const item of report.applied){
 const k=item.sourceGitBlob,entry=byId.get(item.mediaId);
 if(!entry||!entry.urlOrPath)continue;
 if(!group.has(k))group.set(k,{sha:k,path:entry.urlOrPath,source:item.sourcePath,
  concepts:new Set(),mediaIds:new Set(),questions:new Set(),size:item.sourceSize||0});
 const g=group.get(k);g.concepts.add(item.concept);g.mediaIds.add(item.mediaId);
 for(const q of item.questionIds||[])g.questions.add(q);
}
const catalog=[...group.values()].map(g=>({...g,concepts:[...g.concepts].sort(),
 mediaIds:[...g.mediaIds].sort(),questions:[...g.questions].sort()}))
 .sort((a,b)=>b.questions.length-a.questions.length||a.source.localeCompare(b.source));
const reuseAlerts=[...byImage.entries()].filter(([,v])=>v.questions.size>=8)
 .map(([hash,v])=>({hash,path:v.path,questionCount:v.questions.size,
  concepts:[...v.concepts],mediaIds:[...v.ids]}))
 .sort((a,b)=>b.questionCount-a.questionCount).slice(0,60);
const audit={
 schema:'DUDUQ_VISUAL_DISTRACTOR_AUDIT_V1',mode:'QA_PREVIEW_ONLY',
 pngsInOfficialInventory:488,contracts:600,optionImageReferences:imageChoiceCount,
 uniqueMappedOfficialPNGs:catalog.length,affectedQuestions:report.appliedQuestionIds.length,
 mappedMediaIds:report.appliedMediaIds,remainingHolds:report.heldCount,
 greetingContrast:{hello:hello.sourcePath,goodbye:bye.sourcePath,helloHash:hello.sourceGitBlob,
  goodbyeHash:bye.sourceGitBlob,questionsContrastingBoth:pairs.map(x=>x.questionId)},
 newlyMappedCorrectDistractorImageCollision:newCollisions.length,
 ambiguousDuplicateImageOptions:collision,
 missingOptionMedia:missing,
 repetitionWarnings:reuseAlerts,
 modulesUsingMappedPngs:[...perModule.entries()].map(([id,hashes])=>({id,distinctImages:hashes.size})),
 images:catalog,
 unreviewedHolds:report.exceptions,
 pedagogicalApproved:false,allGameplayCertified:false,productionDeployed:false
};
mkdirSync('qa/results',{recursive:true});
writeFileSync('qa/results/duduq-media-clarity-audit.json',JSON.stringify(audit,null,2)+'\n');
const card=g=>'<article><img loading="lazy" src="/'+htmlSafe(g.path)+'" alt="'+
 htmlSafe(g.concepts.join(' / '))+'"/><div class="body"><strong>'+
 htmlSafe(g.concepts.join(' · '))+'</strong><small>'+
 htmlSafe(g.source.replace(/^Imagens Ilustrativa\//,''))+'</small><small>'+
 g.questions.length+' questões · '+g.mediaIds.length+' mediaIds</small><div class="refs">'+
 htmlSafe(g.questions.slice(0,12).join(' · '))+'</div></div></article>';
const page='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>DUDUQ · Revisão pedagógica de imagens</title><style>'+
 ':root{font:15px/1.5 Nunito,Arial,sans-serif;color:#213b55;background:#eff5ff}*{box-sizing:border-box}'+
 'body{margin:0;padding:24px;max-width:1450px;margin-inline:auto}h1{margin:.3em 0}.meta{margin-bottom:22px;color:#496480}'+
 '.filters{position:sticky;top:0;background:#eff5ff;padding:10px 0;z-index:2}input{width:100%;max-width:650px;padding:13px;border:2px solid #acc9e7;border-radius:12px;font:inherit}'+
 '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(245px,1fr));gap:16px}article{background:#fff;border:1px solid #dce7f4;border-radius:18px;overflow:hidden;box-shadow:0 3px 14px #10478113}'+
 'article img{width:100%;height:210px;object-fit:contain;padding:12px;background:#f7faff}'+
 '.body{display:grid;gap:4px;padding:14px}strong{font-size:17px}small{color:#46617c;overflow-wrap:anywhere}.refs{font-size:11px;color:#657b90;max-height:70px;overflow:auto}'+
 '.notice{padding:13px;border-left:4px solid #e6a72b;background:#fffaf0;margin-bottom:20px}'+
 '</style></head><body><h1>Revisão das imagens oficiais · DUDUQ</h1>'+
 '<p class="meta">'+audit.mappedMediaIds+' associações candidatas · '+
 catalog.length+' PNGs distintos · '+audit.remainingHolds+' vínculos pendentes</p>'+
 '<p class="notice"><b>Versão de revisão, não homologada.</b> Clique no módulo do jogo para conferir como os distratores aparecem. A produção ainda não foi alterada.</p>'+
 '<div class="filters"><input id="filter" type="search" placeholder="Filtrar conceito, arquivo ou questão (ex.: Y1M01-Q001)" autocomplete="off"></div>'+
 '<div class="grid" id="cards">'+catalog.map(card).join('')+'</div>'+
 '<script>document.getElementById("filter").addEventListener("input",e=>{const q=e.target.value.toLowerCase();for(const card of document.querySelectorAll("#cards article")){card.hidden=!card.textContent.toLowerCase().includes(q)}});</script></body></html>';
writeFileSync('qa/results/duduq-media-clarity-review.html',page);
const productionFit=process.argv.includes('--production-media-fit');
if(productionFit||process.argv.includes('--decorate-preview')){
 assert(existsSync(dist),'PREVIEW_DIST_MISSING');
 const css='.target-shooter-target__animal{scale:1.08;object-fit:contain}\n'+
 '.bubble-pop-screen img[src*="/content/english/assets/images/assets-duduq/"]{scale:1.04;object-fit:contain}\n'+
 '@media(max-width:520px){.target-shooter-target__animal{scale:1.065}}\n';
 const cssPath=path.join(dist,'core/duduq-media-balanced-scale.css');
 mkdirSync(path.dirname(cssPath),{recursive:true});writeFileSync(cssPath,css);
 const link='<link rel="stylesheet" href="/core/duduq-media-balanced-scale.css" data-duduq-media-fit="qa-preview-only">';
 for(const mech of ['target-shooter','bubble-pop']){
  const file=path.join(dist,'play',mech,'index.html');
  assert(existsSync(file),'MISSING_MECHANIC_HTML:'+mech);
  let html=readFileSync(file,'utf8');
  assert(html.includes('</head>'),'HTML_HEAD_MISSING:'+mech);
  assert(!html.includes('data-duduq-media-fit'),'ALREADY_PATCHED:'+mech);
  html=html.replace('</head>',link+'</head>');
  writeFileSync(file,html);
 }
 if(!productionFit){
  const dest=path.join(dist,'media-review');mkdirSync(dest,{recursive:true});
  writeFileSync(path.join(dest,'index.html'),page);
  writeFileSync(path.join(dest,'audit.json'),JSON.stringify(audit,null,2)+'\n');
 }
}
console.log('MEDIA_CLARITY_QA='+JSON.stringify({
 mappedMediaIds:audit.mappedMediaIds,distinctOriginals:catalog.length,
 duplicateDifferentOptions:collision.length,correctVsDistractorNewCollisions:newCollisions.length,
 qWithGreetingContrast:pairs.length,
 held:audit.remainingHolds,scaledMechanics:['target-shooter','bubble-pop'],
 productionDeployed:false
}));
