import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const manifestPath = 'dist-pages/.duduq-pages-manifest';
const original = readFileSync(manifestPath);
const v24 = readFileSync('qa/results/v24-header-title-manifest.txt');
if (!original.equals(v24)) throw Error('V25_FROZEN_V24_MANIFEST_MISMATCH');
const lines = original.toString('utf8').trimEnd().split(/\r?\n/);
if (lines.length !== 2673) throw Error('V25_EXPECTED_2673_ASSETS:' + lines.length);
const entries = new Map();
for (let i=0; i<lines.length; i++) {
  const at=lines[i].lastIndexOf(' ');
  const name=lines[i].slice(0,at),sha=lines[i].slice(at+1);
  if(at<1 || entries.has(name) || !/^[a-f0-9]{64}$/.test(sha)) throw Error('V25_INVALID_MANIFEST:'+name);
  entries.set(name,{index:i,sha});
}
const targets=[...entries.keys()].filter(p=>p==='index.html'||p==='home/index.html'||(p.startsWith('play/')&&p.endsWith('/index.html')));
if(targets.length!==43) throw Error('V25_OFFICIAL_ROUTES_COUNT:'+targets.length);
const late='<script defer src="/core/duduq-header-title-fit-v24.js" data-duduq-header-title-fit="v24"></script>';
const early='<script src="/core/duduq-header-title-fit-v24.js" data-duduq-header-title-fit="v24"></script>';
for (const p of targets) {
  if(p.startsWith('runtime/gold-masters/')) throw Error('V25_GOLD_MASTER_FORBIDDEN:'+p);
  const originalHtml=readFileSync('dist-pages/'+p);
  if(hash(originalHtml)!==entries.get(p).sha) throw Error('V25_UNAPPROVED_HTML_DRIFT:'+p);
  let html=originalHtml.toString('utf8');
  if(html.split(late).length!==2) throw Error('V25_EXPECTS_ONE_LATE_LOADER:'+p);
  const heads=[...html.matchAll(/<\/head\s*>/gi)];
  const bodyStarts=[...html.matchAll(/<body\b/gi)];
  if(heads.length>1 || bodyStarts.length!==1) throw Error('V25_HTML_LANDMARKS_INVALID:'+p);
  html=html.replace(late,'');
  // Legacy transition pages omit </head>; a script before <body> still belongs to the implicit head.
  const landmark=heads.length?/<\/head\s*>/i:/<body\b/i;
  const match=html.match(landmark);
  if(!match) throw Error('V25_EARLY_INSERT_POINT_MISSING:'+p);
  html=html.slice(0,match.index)+'    '+early+'\n'+html.slice(match.index);
  if(html.split(early).length!==2) throw Error('V25_DUPLICATE_LOADER:'+p);
  writeFileSync('dist-pages/'+p,html);
  lines[entries.get(p).index]=p+' '+hash(Buffer.from(html));
}
const output=Buffer.from(lines.join('\n')+'\n');
writeFileSync(manifestPath,output);
mkdirSync('qa/results',{recursive:true});
writeFileSync('qa/results/v25-early-header-manifest.txt',output);
console.log('V25_TITLE_FIT_BEFORE_FIRST_PAINT=PASS:43');
console.log('V25_GOLD_MASTERS_UNCHANGED=PASS');
console.log('V25_EARLY_SCRIPT_IN_HEAD=PASS');
console.log('V25_MANIFEST=PASS:'+hash(output).toUpperCase()+':2673');
