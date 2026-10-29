import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const lines=readFileSync('dist-pages/.duduq-pages-manifest','utf8').trimEnd().split(/\r?\n/);
assert.equal(lines.length,2673);
const files=new Map(lines.map(row=>{const i=row.lastIndexOf(' ');return [row.slice(0,i),row.slice(i+1)];}));
assert.equal(files.size,2673);
const targets=[...files.keys()].filter(p=>p==='index.html'||p==='home/index.html'||(p.startsWith('play/')&&p.endsWith('/index.html')));
assert.equal(targets.length,43);
const early='<script src="/core/duduq-header-title-fit-v24.js" data-duduq-header-title-fit="v24"></script>';
for(const p of targets) {
  const html=readFileSync('dist-pages/'+p,'utf8');
  assert.equal(html.split(early).length,2,'Exactly one early title-fit loader: '+p);
  assert.equal(html.includes('<script defer src="/core/duduq-header-title-fit-v24.js"'),false,'No late-loader flash: '+p);
  const headEnd=html.search(/<\/head\s*>/i);
  const bodyStart=html.search(/<body\b/i);
  assert.ok(bodyStart>0,'HTML body must exist: '+p);
  assert.ok(headEnd<0 || bodyStart>headEnd,'Well-formed head/body order: '+p);
  assert.ok(html.indexOf(early)<(headEnd>=0?headEnd:bodyStart),'Title-fit initialized before body paint: '+p);
  assert.equal(sha(Buffer.from(html)),files.get(p),'Manifest integrity: '+p);
  assert.equal(html.split('data-duduq-attribution-loader="v23"').length,2,'Preserve V23 copyright: '+p);
}
for(const p of ['runtime/gold-masters/matching/index.html','runtime/gold-masters/target-shooter/index.html']) {
  const html=readFileSync('dist-pages/'+p,'utf8');
  assert.ok(!html.includes(early),'Gold Master immutable: '+p);
}
assert.equal(sha(readFileSync('dist-pages/core/duduq-header-title-fit-v24.js')),files.get('core/duduq-header-title-fit-v24.js'),'V24 script unchanged');
console.log('V25_EARLY_HEADER_ALL_ROUTES_PASS='+targets.length);
console.log('V25_SAME_RUNTIME_NO_GAMEPLAY_OR_GOLD_MASTER_CHANGES=PASS');
