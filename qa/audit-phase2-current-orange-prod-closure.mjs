#!/usr/bin/env node
/** Truthful production-facing media reconciliation (read-only):
 * immutable 2891-file orange release vs previously approved QA overlay.
 * Never writes to compiled site, contracts, source inventory or production.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {collectQuestionMediaUsages} from './media-binding-usage-guard.mjs';
const root=path.resolve('qa/production-orange-immutable');
const out='qa/results/phase2-prod-current-source-closure.json';
const sha=b=>createHash('sha256').update(b).digest('hex');
const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const rows=(await readFile(path.join(root,'.duduq-pages-manifest'),'utf8')).trimEnd().split(/\r?\n/);
assert.equal(rows.length,2891,'PROD_TAG_EXPECTED_2891_ENTRIES');
const hashMap=new Map();
for(const line of rows){
 const i=line.lastIndexOf(' '),rel=line.slice(0,i),expected=line.slice(i+1);
 assert(i>0&&/^[a-f0-9]{64}$/.test(expected)&&!hashMap.has(rel),'INVALID_MANIFEST:'+line.slice(0,90));
 assert(!rel.startsWith('/')&&!rel.split('/').includes('..'),'UNSAFE_MANIFEST_PATH');
 assert.equal(sha(await readFile(path.join(root,rel))),expected,'PUBLISHED_ARCHIVE_FILE_CHANGED:'+rel);
 hashMap.set(rel,expected);
}
const regPath='content/english/media/media-registry.json';
const registry=JSON.parse(await readFile(path.join(root,regPath),'utf8'));
assert(registry.entries?.length>=1100,'MEDIA_ENTRIES_INCOMPLETE');
const byId=new Map(registry.entries.map(e=>[e.mediaId,e]));
assert.equal(byId.size,registry.entries.length,'DUPLICATE_REGISTRY_MEDIA_ID');
const usages=new Map(),contractSha={},contractCount=new Set();
const modules=new Set();
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const module='Y'+y+'M'+String(m).padStart(2,'0');
 const rel='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const bytes=await readFile(path.join(root,rel)),data=JSON.parse(bytes);
 assert.equal(data.items.length,20,'MODULE_NOT_20:'+module);
 contractSha[rel]=sha(bytes);
 assert.equal(contractSha[rel],hashMap.get(rel),'CONTRACT_HASH_DIVERGENT:'+module);
 for(const q of data.items){assert(!contractCount.has(q.item_id),'DUPLICATE_QUESTION');contractCount.add(q.item_id);collectQuestionMediaUsages(q,usages);}
 modules.add(module);
}
assert.equal(modules.size,30);assert.equal(contractCount.size,600);
const imageRefs=[],missing=[],pathNotInManifest=[];
const uniqueIds=new Set(),allPaths=new Set(),shaMismatch=[];
let totalOccurrences=0;
for(const [id,links] of usages){
 totalOccurrences+=links.length;
 const e=byId.get(id);
 if(!e){missing.push({mediaId:id,questions:[...new Set(links.map(l=>l.questionId))]});continue;}
 uniqueIds.add(id);
 if(e.kind!=='image')continue;
 if(!String(e.urlOrPath||'').startsWith('content/english/'))continue;
 const file=e.urlOrPath;allPaths.add(file);
 if(!hashMap.has(file))pathNotInManifest.push({mediaId:id,file});
 else if(e.sha256&&/^[a-f0-9]{64}$/i.test(e.sha256)&&e.sha256!==hashMap.get(file))shaMismatch.push({mediaId:id,file});
 imageRefs.push({id,path:file,temporary:e.temporary??null,kind:e.kind,
  auditStatus:e.humanResolutionStatus??null,integration:e.integrationStatus??null,
  semantic:e.semantic??null,questions:[...new Set(links.map(l=>l.questionId))].sort(),
  missingLeafSemantics:links.filter(l=>!norm(l.semanticTarget)).length,
  leafConflict:links.some(l=>norm(l.semanticTarget)&&norm(e.semantic)&&norm(l.semanticTarget)!==norm(e.semantic)),
  source:e.provenance?.sourcePath??null,sourceCommit:e.provenance?.sourceCommit??null});
}
assert.equal(missing.length,0,'USED_MEDIA_IDS_ABSENT:'+JSON.stringify(missing.slice(0,8)));
assert.equal(pathNotInManifest.length,0,'REFERENCED_PNG_SVG_MISSING:'+JSON.stringify(pathNotInManifest.slice(0,6)));
assert.equal(shaMismatch.length,0,'SOURCE_MEDIA_HASH_CONFLICT');
const srcB=JSON.parse(await readFile('qa/results/phase2-source-153-qa-original.json','utf8'));
assert.equal(srcB.newMediaIds,153,'WRONG_153_BATCH');
const sourceComparison=[],statusCounts={exactPublished:0,differentOfficial:0,stillProvisional:0,missingRegistry:0,differentOther:0};
for(const item of srcB.bindings){
 const e=byId.get(item.mediaId);
 const same=!!e&&e.urlOrPath===item.destination&&e.sha256===item.sha256;
 const status=same?'exactPublished':!e?'missingRegistry':
 String(e.urlOrPath||'').toLowerCase().endsWith('.svg')?'stillProvisional':
 String(e.urlOrPath||'').includes('/assets-duduq/')?'differentOfficial':'differentOther';
 statusCounts[status]++;
 sourceComparison.push({mediaId:item.mediaId,concept:item.concept,questionIds:item.questionIds,
  candidate:item.destination,published:e?.urlOrPath??null,status,
  candidateSha:item.sha256,prodSha:e?.sha256??null,missingLeafSemantics:item.missingLeafSemantics,
  realOccurrences:usages.get(item.mediaId)?.length??0,
  questionSetMatches:JSON.stringify([...new Set((usages.get(item.mediaId)||[]).map(l=>l.questionId))].sort())===
  JSON.stringify([...item.questionIds].sort())});
}
assert.equal(sourceComparison.length,153);
const groups={};
for(const x of imageRefs){
 const classification=x.path.endsWith('.svg')?'svg_provisional':
 x.path.endsWith('.png')&&x.path.includes('/assets-duduq/')?'official_assets_duduq':
 x.path.endsWith('.png')?'png_other':'other';
 groups[classification]??={ids:0,uniqueFiles:new Set(),questions:new Set(),missingLeafSemanticIds:0,qaPending:0};
 const g=groups[classification];g.ids++;g.uniqueFiles.add(x.path);
 for(const q of x.questions)g.questions.add(q);
 if(x.missingLeafSemantics>0)g.missingLeafSemanticIds++;
 if(x.auditStatus==='PEDAGOGICAL_QA_PENDING')g.qaPending++;
}
const summary=Object.fromEntries(Object.entries(groups).map(([k,g])=>[k,{
 mediaIds:g.ids,distinctFiles:g.uniqueFiles.size,questions:g.questions.size,
 missingLeafSemanticIds:g.missingLeafSemanticIds,pedagogicalQaPendingMediaIds:g.qaPending}]));
const subset37=sourceComparison.filter(x=>
 x.missingLeafSemantics===0&&x.questionIds.length===1
);
const orange=subset37.filter(x=>x.concept==='orange');
const exceptOrange=subset37.filter(x=>x.concept!=='orange');
const semanticConflicts=imageRefs.filter(x=>x.leafConflict);
const afternoon=imageRefs.filter(x=>/afternoon|tarde|entardecer/.test(norm(x.semantic)+' '+norm(x.id)));
const missingOfficialSource=imageRefs.filter(x=>x.temporary===true&&x.path.endsWith('.svg'));
const result={
 schemaVersion:'DUDUQ_PHASE2_REAL_ORANGE_PRODUCTION_REGISTRY_RECONCILIATION_V1',
 mode:'QA_READONLY_NO_DEPLOY',archivePinnedTag:'duduq-phase2-orange-fruit-color-corrected-20261103',
 productionDeploymentId:'709a2477-4cfe-4330-b633-7293a35dc1ee',
 productionReleaseCommit:'acccef36c8a3029d98e5efef1923b0b6fdad36e1',
 archiveExpectedSHA256:'cf049f8c7a5f3d02696f7997b6dd1e31ec7b28942f6c77b96af656e72b5a1800',
 packageHashesVerified:rows.length,verifiedModules:modules.size,verifiedQuestionContracts:contractCount.size,
 referencedMediaIds:uniqueIds.size,questionMediaOccurrences:totalOccurrences,
 registryEntries:registry.entries.length,missingMedia:missing.length,missingFiles:pathNotInManifest.length,
 sourceHashMismatches:shaMismatch.length,
 imageSummary:summary,source153Comparison:statusCounts,
 explicitlySemanticSingleQuestionSourceBindings:subset37.length,
 explicit37SourceGroups:Object.fromEntries([...new Set(subset37.map(x=>x.concept))].sort()
  .map(k=>[k,{ids:subset37.filter(x=>x.concept===k).length,statusCounts:subset37.filter(x=>x.concept===k)
   .reduce((a,x)=>(a[x.status]=(a[x.status]||0)+1,a),{})}])),
 orangeSubset:orange.map(x=>({mediaId:x.mediaId,status:x.status,prodPath:x.published})),
 nonOrangeExplicitSubset:exceptOrange,
 semanticConflicts:semanticConflicts.slice(0,100),
 explicitSemanticConflictsTotal:semanticConflicts.length,
 afternoonBindings:afternoon,
 provisionalSvgCount:missingOfficialSource.length,
 provisionalSvgSamples:missingOfficialSource.slice(0,35),
 source153ComparisonRows:sourceComparison,
 claimBoundaries:{
 mediaTransportAndContractIntegrityVerified:true,
 semanticReviewOfAll600:false,
 allMechanicsRealGameplayVerified:false,
 userApprovedFullRelease:false,
 fullProductComplete:false,
 productionDeployedByThisWorkflow:false}
};
await mkdir('qa/results',{recursive:true});
await writeFile(out,JSON.stringify(result,null,2)+'\n');
console.log('ACTUAL_ORANGE_PRODUCTION_MEDIA_CLOSURE='+JSON.stringify({
 status:'READ_ONLY_SOURCE_RECONCILIATION_PASS',
 release:result.productionDeploymentId,files:result.packageHashesVerified,
 contracts:result.verifiedQuestionContracts,
 imageSummary:result.imageSummary,source153Comparison:result.source153Comparison,
 explicit37SourceGroups:result.explicit37SourceGroups,
 conflicts:result.explicitSemanticConflictsTotal,
 afternoon:result.afternoonBindings,
 provisionalSvgCount:result.provisionalSvgCount,
 productionDeployed:false}));
