import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=data=>createHash('sha256').update(data).digest('hex');
const rows=readFileSync('dist-pages/.duduq-pages-manifest','utf8').trimEnd().split(/\r?\n/);
assert.equal(rows.length,2673);
const entries=new Map(rows.map(s=>{const k=s.lastIndexOf(' ');return[s.slice(0,k),s.slice(k+1)];}));
assert.equal(entries.size,2673);
const routes=[...entries.keys()].filter(p=>p==='index.html'||p==='home/index.html'||(p.startsWith('play/')&&p.endsWith('/index.html')));
assert.equal(routes.length,43);
const marker='<style id="duduq-v26-topic-first-paint">';
const loader='<script src="/core/duduq-header-title-fit-v24.js" data-duduq-header-title-fit="v24"></script>';
for(const p of routes){
 const html=readFileSync('dist-pages/'+p,'utf8');
 assert.equal(html.split(marker).length,2,'single critical CSS: '+p);
 assert.equal(html.split(loader).length,2,'single early script: '+p);
 const body=html.search(/<body\b/i);
 assert.ok(body>html.indexOf(marker)&&html.indexOf(loader)>html.indexOf(marker),'CSS precedes script and body: '+p);
 assert.ok(html.includes('[data-topic-en="Choices Around Me: Food, School and Preferences"]'),'Y3M06 title fallback: '+p);
 assert.ok(html.includes('content:"Choices Around Me"!important'),'visible concise title before JS: '+p);
 assert.equal(hash(Buffer.from(html)),entries.get(p),'manifest hash: '+p);
 assert.equal(html.split('data-duduq-attribution-loader="v23"').length,2,'copyright preserved: '+p);
}
for(const p of ['runtime/gold-masters/matching/index.html','runtime/gold-masters/target-shooter/index.html']){
 assert.ok(!readFileSync('dist-pages/'+p,'utf8').includes(marker),'Gold Master intact: '+p);
}
console.log('V26_CRITICAL_CSS_PRESENT_BEFORE_BODY=PASS:43');
console.log('V26_TITLE_SHORT_BEFORE_JS=PASS');
console.log('V26_GOLD_MASTERS_IMMUTABLE=PASS');
