#!/usr/bin/env node
/**
 * QA-only candidate for Target Shooter 390px mobile horizontal containment.
 * Edits ONLY the compiled review HTML and its integrity-manifest hash.
 * Never writes source questions, media registry, Gold Masters, or releases.
 * The existing real-browser Y1M04/Y1M05 gate must independently prove it.
 */
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';

const apply=process.argv.includes('--apply');
const root=process.cwd();
const relative='play/target-shooter/index.html';
if(apply&&process.env.DUDUQ_QA_ONLY!=='1')throw Error('QA_ONLY_OVERLAY_REQUIRES_EXPLICIT_ENV_GATE');
const htmlPath=path.join(root,'dist-pages',relative);
const integrityPath=path.join(root,'dist-pages/.duduq-pages-manifest');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const [originalHtml,originalIntegrity]=await Promise.all([readFile(htmlPath),readFile(integrityPath)]);
const html=originalHtml.toString('utf8'),manifest=originalIntegrity.toString('utf8');
const lines=manifest.trimEnd().split(/\r?\n/);
const matches=lines.map((line,i)=>({line,i})).filter(x=>x.line.startsWith(relative+' '));
if(matches.length!==1)throw Error('COMPILED_TARGET_SHOOTER_NOT_UNIQUELY_HASH_BOUND');
const target=matches[0],currentSha=target.line.slice(relative.length+1);
if(!/^[0-9a-f]{64}$/.test(currentSha)||currentSha!==sha(originalHtml))
  throw Error('COMPILED_TARGET_SHOOTER_HASH_MISMATCH');
const marker='data-duduq-review="target-shooter-mobile-hitbox-reflow-v2"';
if(!/<\/head>/i.test(html)||html.includes(marker))
  throw Error('MOBILE_CONTAINMENT_ALREADY_APPLIED_OR_INVALID_HTML');

// This exact QA stylesheet is also used by the independent Chromium probe.
const cssPath=path.join(root,'qa/overlays/target-shooter-mobile-hitbox-reflow-v2.css');
const css=await readFile(cssPath,'utf8');
if(!css.includes('target-shooter-target--dog')||!css.includes('target-shooter-target--fish'))
 throw Error('INVALID_SHARED_QA_CSS');
const style=`<style ${marker}>\n${css}\n</style>\n`;
const nextHtml=html.replace(/<\/head>/i,style+'</head>');
const nextSha=sha(Buffer.from(nextHtml));
lines[target.i]=relative+' '+nextSha;
const nextIntegrity=lines.join('\n')+'\n';
const plan={status:apply?'QA_COMPILED_HTML_OVERLAY_APPLIED':'READ_ONLY_PLAN',
  file:relative,sourceSha256:currentSha,candidateSha256:nextSha,
  integrityChanged:true,sourceModified:false,goldMastersModified:false,
  productionDeployed:false,scope:'mobile-viewport-max-520-only',qaCssSha256:sha(Buffer.from(css)),
  gates:'existing independent Y1M04/Y1M05 Chromium gameplay and geometry must pass'};
if(!apply){console.log(JSON.stringify(plan));process.exit(0);}
try{
  await writeFile(htmlPath,nextHtml);
  await writeFile(integrityPath,nextIntegrity);
  if(sha(await readFile(htmlPath))!==nextSha||
     !(await readFile(integrityPath,'utf8')).includes(relative+' '+nextSha+'\n'))
    throw Error('MOBILE_CONTAINMENT_WRITE_VERIFY_FAILED');
}catch(error){
  await writeFile(htmlPath,originalHtml);
  await writeFile(integrityPath,originalIntegrity);
  throw error;
}
console.log(JSON.stringify(plan));
