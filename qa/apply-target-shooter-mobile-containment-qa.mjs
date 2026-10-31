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
const marker='data-duduq-review="target-shooter-mobile-containment-v1"';
if(!/<\/head>/i.test(html)||html.includes(marker))
  throw Error('MOBILE_CONTAINMENT_ALREADY_APPLIED_OR_INVALID_HTML');

// The stage remains authored and approved at 1366x768. In portrait mobile,
// reduce its VISUAL and HIT-AREA scale together around its center, rather than
// clipping image boundaries or changing the target/order/content geometry.
// The CSS individual 'scale' composes with the Gold Master 'transform'.
const style=`<style ${marker}>
/* Isolated QA candidate: not a Gold Master edit, not a release approval. */
@container game (max-width: 430px) and (min-height: 421px) {
  #game.target-shooter-screen .target-shooter-arena {
    scale: .78;
    top: 76px;
  }
}
@container game (max-width: 359px) and (min-height: 421px) {
  #game.target-shooter-screen .target-shooter-arena {
    scale: .65;
    top: 105px;
  }
}
</style>
`;
const nextHtml=html.replace(/<\/head>/i,style+'</head>');
const nextSha=sha(Buffer.from(nextHtml));
lines[target.i]=relative+' '+nextSha;
const nextIntegrity=lines.join('\n')+'\n';
const plan={status:apply?'QA_COMPILED_HTML_OVERLAY_APPLIED':'READ_ONLY_PLAN',
  file:relative,sourceSha256:currentSha,candidateSha256:nextSha,
  integrityChanged:true,sourceModified:false,goldMastersModified:false,
  productionDeployed:false,scope:'portrait-mobile-only',
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
