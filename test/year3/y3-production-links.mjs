import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE=(process.env.BASE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const home='/content/english/year-3/index.html';
const modules=Array.from({length:6},(_,i)=>`/content/english/year-3/module-${String(i+1).padStart(2,'0')}/index.html`);
const routes=[home,...modules];

for(const route of routes){
  const response=await fetch(BASE+route,{redirect:'manual'});
  assert.equal(response.status,200,`${route}: HTTP ${response.status}`);
}
console.log('YEAR3_HTTP_ROUTES = 7/7 PASS');

const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1366,height:768}});
  await page.goto(BASE+home,{waitUntil:'domcontentloaded',timeout:45_000});
  const hrefs=await page.locator('a.test-button').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
  assert.deepEqual(hrefs,Array.from({length:6},(_,i)=>`./module-${String(i+1).padStart(2,'0')}/index.html`),'HOME module href map');
  for(let i=0;i<6;i++){
    await page.goto(BASE+home,{waitUntil:'domcontentloaded',timeout:45_000});
    const target=modules[i];
    await Promise.all([
      page.waitForURL(url=>url.pathname===target,{timeout:45_000}),
      page.locator('a.test-button').nth(i).click()
    ]);
    assert.equal(new URL(page.url()).pathname,target,`M${String(i+1).padStart(2,'0')}: wrong route`);
    const title=await page.title();
    assert.match(title,new RegExp(`Year 3 .* Module ${String(i+1).padStart(2,'0')}$`),`M${String(i+1).padStart(2,'0')}: wrong module identity: ${title}`);
  }
  console.log('YEAR3_HOME_NAVIGATION = 6/6 PASS');
}finally{
  await browser.close();
}
