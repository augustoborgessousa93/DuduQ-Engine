import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
const exists = (p) => fs.existsSync(path.join(root,p));
const count = (text,re) => [...text.matchAll(re)].length;

const rows=[];
function add(row){rows.push(row)}

for (const module of [5,6]) {
  const id=`M0${module}`;
  const dir=`content/english/year-1/module-0${module}`;
  const index=read(`${dir}/index.html`);
  const content=read(`${dir}/module-0${module}.js`);
  const legacyMechanicLabels=[...new Set([...content.matchAll(/"mechanic"\s*:\s*"([^"]+)"/g)].map(m=>m[1]))].sort();
  const builderSignals={targetShooter:/targetQuestion\s*\(/.test(content),dragDrop:/sequenceQuestion\s*\(/.test(content),smartSentenceRuntime:/smartSentenceQuestion\s*\(/.test(content)};
  add({id,year:1,module,location:dir,contentVersion:(content.match(/const VERSION = "([^"]+)"/)||[])[1]||'unknown',pedagogy:/PEDAGOGY v1\.0/i.test(content)?'v1.0 legacy':'unknown',canaryLegacy:(content.match(/Engine baseline: Canary ([^\n]+)/)||[])[1]?.trim()||'unknown',entrypoint:/systemic-loader-v1/.test(index)?'systemic-loader-v1':'other',runtimeSurfaceGuard:/duduq-runtime-surface-guard-v1/.test(index),directPayloadBridge:/duduq-router-direct-payload-compat-v1/.test(index),dataImageOccurrences:count(content,/data:image/gi),proceduralHelpers:['svgAsset','countDots','colorBlock','bodyPreview','simplePet','pairSizePreview','simpleSchoolCount','iconPreview','numeralPreview','dayScene','greetingScene'].filter(n=>content.includes(`function ${n}`)),gapPreviewOccurrences:count(content,/gap-preview/gi),legacyMechanicLabels,builderSignals,audioPlannedOccurrences:count(content,/plannedSrc/gi),emptyAudioSrcOccurrences:count(content,/"src"\s*:\s*""/g)});
}

for (let module=1; module<=6; module++) {
  const id=`M${String(module+6).padStart(2,'0')}`;
  const dir=`content/english/year-2/module-0${module}`;
  const index=read(`${dir}/index.html`);
  const v23=`${dir}/module-0${module}-v23-multimodal.js`;
  const content=exists(v23)?read(v23):'';
  const scripts=[...index.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]);
  add({id,year:2,module,location:dir,contentVersion:/sourceVersion\s*:\s*"2\.3"/.test(index)?'v2.3':'unknown',pedagogy:/factorySpec\s*:\s*"1\.2"/.test(index)?'Factory 1.2':'unknown',entrypoint:'public-v23',dynamicPlayerLoader:/Date\.now\(\)/.test(index)&&/duduq-player-v1\.js/.test(index)&&/duduq-loader-v1\.js/.test(index),scriptCount:scripts.length,routerCompatScripts:scripts.filter(s=>/router-compat/.test(s)),bridgeScripts:scripts.filter(s=>/bridge/.test(s)),hotfixScripts:scripts.filter(s=>/hotfix|patch/.test(s)),dataImageOccurrences:count(content,/data:image/gi),mechanics:[...new Set([...content.matchAll(/mechanic\s*:\s*"([^"]+)"/g)].map(m=>m[1]))].sort(),ttsProvisional:/ttsProvisional\s*:\s*true/.test(index)});
}

const scaleCandidate='scale/shared-engine-year3-bootstrap';
const report={
  contract:'DUDUQ_GLOBAL_M04_M30_PREP_STATIC_AUDIT_V4',
  rows,
  sharedBlockers:[{
    id:'SHARED_COMPACT_MECHANIC_SURFACE_R146',
    classification:'BLOCKER_GLOBAL',
    affects:'compact runtime homologation where the shared mechanic frame resolves to 150px',
    evidence:{m04OfficialRun:33455363921,m01VsM04DiagnosticRun:33455904240,tabletM01VisibleTargetShooterTargets:0,tabletM04VisibleTargetShooterTargets:0,mobileM01VisibleTargetShooterTargets:0,mobileM04VisibleTargetShooterTargets:0},
    localWorkaroundAuthorized:false,
    resolution:'shared-infrastructure candidate + frozen-module regressions + Canary promotion before resuming M04 freeze'
  }],
  qaPolicy:{viewportSharding:{requiredWhenPractical:true,failFast:false,viewports:['desktop-1366x768','fullhd-1920x1080','tablet-768x1024','mobile-390x844'],aggregateRequires:'4/4 10/10'}},
  year3:{materializedOnFoundation:false,policyBranch:'feat/year3-v23-multimodal',implementationCandidates:[{branch:scaleCandidate,expectedModules:6,materializedEntrypoints:true},{branch:'scale/year3-shared-engine-foundation',expectedModules:6,materializedEntrypoints:false,sourceRuntimeSplit:true}],authorityStatus:'RECONCILE_BEFORE_FILA_A'},
  year4:{githubLocationFound:true,candidateBranch:scaleCandidate,expectedModules:6,declaredSource:'DUDUQ_Ingles_1ao5_Revisao_Alfabetizacao_Multimodal_v2.3',contractTest:'test/scale/year4-v23-functional-reading-contract.mjs',smokeTest:'test/scale/year4-all-modules-smoke.mjs',status:'SOURCE_CANDIDATE_LOCATED_RECONCILE_BEFORE_FILA_A'},
  year5:{githubLocationFound:true,candidateBranch:scaleCandidate,expectedModules:6,declaredSource:'DUDUQ_Ingles_1ao5_Revisao_Alfabetizacao_Multimodal_v2.3',contractTest:'test/scale/year5-v23-integrated-functional-contract.mjs',smokeTest:'test/scale/year5-all-modules-smoke.mjs',status:'SOURCE_CANDIDATE_LOCATED_RECONCILE_BEFORE_FILA_A'}
};

fs.mkdirSync(path.join(root,'test-results/systemic/global-prep'),{recursive:true});
fs.writeFileSync(path.join(root,'test-results/systemic/global-prep/report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
