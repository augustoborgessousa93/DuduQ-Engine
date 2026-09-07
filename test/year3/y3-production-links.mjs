import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE=(process.env.BASE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const home='/content/english/year-3/index.html';
const modules=Array.from({length:6},(_,i)=>`/content/english/year-3/module-${String(i+1).padStart(2,'0')}/index.html`);
const routes=[home,...modules];
const normalized=route=>route.endsWith('/index.html')?route.slice(0,-'index.html'.length):route;

for(const route of routes){
  const response=await fetch(BASE+route);
  assert.equal(response.status,200,`${route}: final HTTP ${response.status}`);
  const finalPath=new URL(response.url).pathname;
  assert.ok(finalPath===route||finalPath===normalized(route),`${route}: unexpected final path ${finalPath}`);
}
console.log('YEAR3_HTTP_ROUTES = 7/7 PASS (canonical redirects followed)');

const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1366,height:768}});
  await page.goto(BASE+home,{waitUntil:'domcontentloaded',timeout:45_000});
  const hrefs=await page.locator('a.test-button').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
  assert.deepEqual(hrefs,Array.from({length:6},(_,i)=>`./module-${String(i+1).padStart(2,'0')}/index.html`),'HOME module href map');
  for(let i=0;i<6;i++){
    await page.goto(BASE+home,{waitUntil:'domcontentloaded',timeout:45_000});
    const target=modules[i];
    const expectedPaths=new Set([target,normalized(target)]);
    await Promise.all([
      page.waitForURL(url=>expectedPaths.has(url.pathname),{timeout:45_000}),
      page.locator('a.test-button').nth(i).click()
    ]);
    const finalPath=new URL(page.url()).pathname;
    assert.ok(expectedPaths.has(finalPath),`M${String(i+1).padStart(2,'0')}: wrong route ${finalPath}`);
    const title=await page.title();
    assert.match(title,new RegExp(`Year 3 .* Module ${String(i+1).padStart(2,'0')}$`),`M${String(i+1).padStart(2,'0')}: wrong module identity: ${title}`);
  }
  console.log('YEAR3_HOME_NAVIGATION = 6/6 PASS');
}finally{
  await browser.close();
}
