/* DuduQ Visual Experience 2.0 — opt-in Target Shooter pilot.
 * Decorates the public adapter; does not change answers, timers or Host events.
 * Load after target-shooter/1.0.21 and before mounting the first activity.
 */
(function () {
  'use strict';
  const host = window.DuduQ;
  const original = host?.getMechanic('target-shooter');
  if (!original || original.metadata?.visualExperience === '2-pilot') return;
  const source = document.currentScript.src;
  const stylesheet = new URL('./theme.css', source).href;

  function attach(doc) {
    if (!doc?.head || doc.getElementById('duduq-vx2-theme')) return () => {};
    const link = doc.createElement('link');
    link.id = 'duduq-vx2-theme';
    link.rel = 'stylesheet';
    link.href = stylesheet;
    link.onload = () => { doc.documentElement.dataset.vxReady = 'true'; };
    link.onerror = () => { doc.documentElement.dataset.vxReady = 'error'; };
    doc.documentElement.dataset.duduqVx = '2';
    doc.head.append(link);
    const view = doc.defaultView;
    let scheduled = 0;
    function update() {
      scheduled = 0;
      // Observe existing rendered states, never infer a correct answer.
      const playing = !!doc.querySelector('[data-playing="true"]');
      const feedback = doc.querySelector('.duduq-engine-feedback')?.dataset.state;
      const complete = !!doc.querySelector('.duduq-engine-complete');
      const pending = !!doc.querySelector('.duduq-ts-target[data-state="pending"]');
      const hit = !!doc.querySelector('.duduq-ts-target[data-state="hit"]');
      const miss = !!doc.querySelector('.duduq-ts-target[data-state="miss"]');
      const state = complete ? 'complete' : feedback === 'success' ? 'correct' :
        feedback === 'retry' || miss ? 'retry' : playing ? 'listen' : pending ? 'thinking' : hit ? 'happy' : 'idle';
      if (doc.documentElement.dataset.vxState !== state) doc.documentElement.dataset.vxState = state;
      const arena = doc.querySelector('.duduq-ts-arena');
      if (arena) {
        const count = String(arena.querySelectorAll('.duduq-ts-target').length);
        if (arena.dataset.vxCount !== count) arena.dataset.vxCount = count;
      }
    }
    const observer = new view.MutationObserver(() => {
      if (!scheduled) scheduled = view.requestAnimationFrame(update);
    });
    observer.observe(doc.body, {subtree:true, childList:true, attributes:true,
      attributeFilter:['data-state','data-playing']});
    update();
    return () => {
      observer.disconnect();
      if (scheduled) view.cancelAnimationFrame(scheduled);
      link.onload = link.onerror = null;
      link.remove();
      delete doc.documentElement.dataset.duduqVx;
      delete doc.documentElement.dataset.vxReady;
      delete doc.documentElement.dataset.vxState;
    };
  }

  host.registerMechanic({
    ...original,
    metadata: {...original.metadata, visualExperience:'2-pilot'},
    mount(args) {
      const destroyOriginal = original.mount(args);
      const iframe = args.container.querySelector('iframe');
      let detach = () => {};
      function onLoad() { detach(); detach = attach(iframe.contentDocument); }
      if (iframe) {
        iframe.addEventListener('load', onLoad);
        if (iframe.contentDocument?.querySelector('.duduq-ts-root')) onLoad();
      }
      return () => {
        iframe?.removeEventListener('load', onLoad);
        detach();
        if (typeof destroyOriginal === 'function') destroyOriginal();
      };
    }
  });
})();
