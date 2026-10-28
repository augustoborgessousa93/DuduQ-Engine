/**
 * DUDUQ Fit — Cloudflare Pages Function scoped to /play/english/*.
 * Single opt-in edge change: game URLs remain identical in EduQ Play.
 * Real iframe embeds retain the fixed 1366x768 proportional Fit transform;\n * top-level browser navigations use the native full-bleed intro layout.
 * CAUTION: use preview first. Do not deploy without functional tests against real game.
 */
const MODULE_ROUTE = /^\/play\/english\/year-[1-5]\/module-0[1-6]\/?$/;
const INNER_PARAM = '__duduq_fit_inner';
const FIT_PARAM = '__duduq_fit';

function renderFitPage(pathAndSearch) {
  // This route is created from a same-origin URL and cannot be attacker-supplied.
  const encodedPath = JSON.stringify(pathAndSearch).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>DUDUQ English</title>
<style>
  *,*::before,*::after{box-sizing:border-box}
  html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#eaf6ff}
  #fit-viewport{position:fixed;inset:0;overflow:hidden;contain:layout size;isolation:isolate}
  #fit-game{position:absolute;top:0;left:0;display:block;width:1366px;height:768px;
            border:0;margin:0;padding:0;transform-origin:0 0;background:#eaf6ff}
</style>
</head>
<body>
<div id="fit-viewport"><iframe id="fit-game" title="DUDUQ English" 
  allow="autoplay; fullscreen" allowfullscreen loading="eager"
  referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
<script>
(()=>{
  'use strict';
  const LOGICAL_W=1366,LOGICAL_H=768;
  const frame=document.getElementById('fit-game');
  const viewport=document.getElementById('fit-viewport');
  frame.src=${encodedPath};
  let lastW=-1,lastH=-1;
  function fit(){
    const w=viewport.clientWidth,h=viewport.clientHeight;
    if(w<=0||h<=0||(w===lastW&&h===lastH))return;
    lastW=w;lastH=h;
    const s=Math.min(w/LOGICAL_W,h/LOGICAL_H);
    const x=(w-LOGICAL_W*s)/2;
    const y=(h-LOGICAL_H*s)/2;
    frame.style.transform='translate3d('+x+'px,'+y+'px,0) scale('+s+')';
    viewport.dataset.scale=s.toFixed(8);
  }
  new ResizeObserver(fit).observe(viewport);
  addEventListener('resize',fit,{passive:true});
  if(window.visualViewport)visualViewport.addEventListener('resize',fit,{passive:true});
  fit();
})();
</script>
</body>
</html>`;
}

export async function onRequest(context) {
  const request = context.request;
  if (request.method !== 'GET') return context.next();
  const url = new URL(request.url);
  if (!MODULE_ROUTE.test(url.pathname) || url.searchParams.has(INNER_PARAM)) {
    return context.next();
  }
  // Full-browser navigation must enter the native, full-bleed intro screen.
  // The public link keeps __duduq_fit=1 for embeds and compatibility, but a
  // top-level browser tab is NOT an iframe and must never be letterboxed.
  // Preserve the proportional 1366x768 Fit frame for real iframe embeds.
  const destination = request.headers.get('Sec-Fetch-Dest');
  if (destination === 'document') return context.next();

  // Some QA/legacy callers omit Fetch Metadata. Preserve their explicit opt-in.
  const isIframe = destination === 'iframe';
  const isExplicitFit = url.searchParams.get(FIT_PARAM) === '1';
  if (!isIframe && !isExplicitFit) return context.next();

  const child = new URL(url);
  child.searchParams.delete(FIT_PARAM);
  child.searchParams.set(INNER_PARAM,'1');
  const res = new Response(renderFitPage(child.pathname + child.search), {
    status:200,
    headers:{
      'Content-Type':'text/html; charset=utf-8',
      'Cache-Control':'no-store',
      'X-DUDUQ-Fit':'1',
      'X-Content-Type-Options':'nosniff'
    }
  });
  return res;
}
