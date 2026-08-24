/* DUDUQ WORD SLASH 1.0.9 — standalone root fix: audio + typography */
(function () {
  "use strict";
  if (!window.DuduQ) { console.error("[DuduQ Word Slash] duduq-host.js precisa ser carregado antes."); return; }

  const ID = "word-slash";
  const VERSION = "1.0.9";
  const RUNTIME = "/engine/releases/mechanics/word-slash/1.0.9/DUDUQ_WORD_SLASH.html";

  const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
  const text = (v, f = "") => { const s = v == null ? "" : String(v).trim(); return s || f; };
  const num = (v, f, min, max) => { const n = Number(v); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : f; };
  const questionsOf = (p) => Array.isArray(p) ? p : Array.isArray(p?.questions) ? p.questions : Array.isArray(p?.items) ? p.items : isObj(p) ? [p] : [];
  const normalizeQuestion = (q, i) => window.DuduQSchema?.normalizeQuestion ? window.DuduQSchema.normalizeQuestion(q, i, {}) : q;

  function wsConfig(q) {
    const c = q?.metadata?.wordSlash;
    if (!isObj(c) || !Array.isArray(c.objects) || c.objects.length < 2 || !isObj(c.target)) {
      throw new Error(`[DuduQ Word Slash] Questão ${q?.id || "sem-id"} inválida para Word Slash.`);
    }
    return c;
  }

  function defaults(year) {
    const y = Math.max(1, Math.min(5, Number(year) || 1));
    return ({
      1:{speedMinMs:3600,speedMaxMs:4600,maxObjects:4,spawnEveryMs:860,timeLimitSeconds:38,correctProbability:.50},
      2:{speedMinMs:3400,speedMaxMs:4400,maxObjects:4,spawnEveryMs:820,timeLimitSeconds:38,correctProbability:.52},
      3:{speedMinMs:3200,speedMaxMs:4200,maxObjects:5,spawnEveryMs:760,timeLimitSeconds:40,correctProbability:.54},
      4:{speedMinMs:3000,speedMaxMs:4000,maxObjects:5,spawnEveryMs:700,timeLimitSeconds:42,correctProbability:.56},
      5:{speedMinMs:2800,speedMaxMs:3800,maxObjects:6,spawnEveryMs:650,timeLimitSeconds:44,correctProbability:.58}
    })[y];
  }

  function build(payload, qs, context) {
    const assets = Object.create(null);
    const stages = qs.map((q, i) => {
      const c = wsConfig(q);
      const year = context?.year ?? q?.year ?? 1;
      const d = {...defaults(year), ...(isObj(c.difficulty) ? c.difficulty : {})};
      const qid = text(q.id, `word-slash-stage-${i+1}`);
      const target = {
        label: text(c.target.label, "TARGET"), value: text(c.target.value),
        spokenText: text(c.target.spokenText || c.target.value || c.target.label)
      };
      if (Array.isArray(c.target.acceptCategories)) target.acceptCategories = c.target.acceptCategories.map((x)=>text(x)).filter(Boolean);
      if (c.target.hideValue === true) target.hideValue = true;
      const objects = c.objects.map((raw, j) => {
        const o = isObj(raw) ? raw : {};
        const oid = text(o.id, `${qid}-object-${j+1}`);
        const src = text(o.imageSrc || o.image?.src);
        let key = text(o.imageAssetKey);
        if (src) { key = key || `ws-${qid}-${oid}`; assets[key] = src; }
        const out = {
          id: oid, type: text(o.type, key ? "image" : o.colorHex ? "color" : "word"),
          label: text(o.label), value: text(o.value, o.label || o.alt || oid), category: text(o.category),
          weight: num(o.weight, 1, 1, 20)
        };
        if (key) { out.imageAssetKey = key; out.alt = text(o.alt, o.label || o.value || oid); }
        if (o.colorHex) out.colorHex = text(o.colorHex);
        return out;
      });
      return {
        id: qid,
        title: text(q?.metadata?.screenTitle || q?.metadata?.title || q?.statement, "Word Slash"),
        instruction: text(q?.instruction, "Corte somente os elementos corretos."),
        audioText: text(c.audioText || q?.audio?.text || q?.media?.audio?.text || q?.instruction),
        mode: text(c.mode, "correct-word"), target,
        goal: Math.round(num(c.goal, 3, 1, 20)),
        difficulty: {
          speedMinMs:Math.round(num(d.speedMinMs,3600,1200,12000)), speedMaxMs:Math.round(num(d.speedMaxMs,4600,1400,14000)),
          maxObjects:Math.round(num(d.maxObjects,4,2,10)), spawnEveryMs:Math.round(num(d.spawnEveryMs,860,300,3000)),
          timeLimitSeconds:Math.round(num(d.timeLimitSeconds,38,15,120)), correctProbability:num(d.correctProbability,.5,.14,.85)
        }, objects
      };
    });
    const first = qs[0] || {};
    const year = Math.max(1, Math.min(5, Number(context?.year ?? first?.year ?? 1) || 1));
    return { config:{ schemaVersion:1, mechanic:ID, version:"1.0.0", title:text(payload?.title || first?.metadata?.screenTitle, "Word Slash"),
      settings:{interfaceLocale:"pt-BR",speechLocale:"en-US",targetGrade:year,extraTimeSeconds:12,wrongPenalty:0}, stages }, assets };
  }

  function safeJson(v) { return JSON.stringify(v, null, 2).replace(/</g,"\\u003c").replace(/`/g,"\\`").replace(/\$\{/g,"\\${"); }
  function required(html, from, to, label) {
    if (!html.includes(from)) throw new Error(`[DuduQ Word Slash 1.0.9] Marcador ausente: ${label}.`);
    return html.replace(from, to);
  }
  function injectConfig(html, config) {
    const head = 'var WORD_SLASH_ACTIVITY_JSON = String.raw`';
    const tail = '`;\n\n  var WORD_SLASH_CONFIG = JSON.parse(WORD_SLASH_ACTIVITY_JSON);';
    const a = html.indexOf(head); if (a < 0) throw new Error("JSON marker ausente");
    const start = a + head.length, end = html.indexOf(tail, start); if (end < 0) throw new Error("JSON tail ausente");
    return html.slice(0,start) + safeJson(config) + html.slice(end);
  }
  function injectAssets(html, assets) {
    const from='var WORD_SLASH_ASSETS = {\n    ...DRAG_DROP_UNIVERSAL_ASSETS\n  };';
    return required(html, from, `var WORD_SLASH_ASSETS = {\n    ...DRAG_DROP_UNIVERSAL_ASSETS,\n    ...${safeJson(assets)}\n  };`, "assets");
  }
  function completionBridge(html) {
    const from="autoPlayInstruction: true,\n        gamificationPolicy:";
    const to='autoPlayInstruction: true,\n        hostedByDuduQ: true,\n        onLessonComplete: () => window.parent.postMessage({type:"DUDUQ_WORD_SLASH_COMPLETE"}, "*"),\n        gamificationPolicy:';
    return required(html, from, to, "completion bridge");
  }

  function rootFix(html) {
    const oldReplay='    const replayTarget = useCallback(() => {\n      const spokenText = question.target.spokenText || question.target.value || question.audioText || question.instruction;\n      audio.playText(`word-slash:${question.id}:target`, spokenText, "en-US");\n    }, [audio, question]);';
    const newReplay='    const replayTarget = useCallback(() => {\n      audio.playInstruction(true);\n    }, [audio]);';
    html = required(html, oldReplay, newReplay, "fluxo playInstruction");
    html = required(html, '"data-playing": audio.activeAudioKey === `word-slash:${question.id}:target` ? "true" : "false",', '"data-playing": audio.isPlaying ? "true" : "false",', "estado isPlaying");
    html = required(html, '"aria-label": "Ouvir novamente o alvo em inglês"', '"aria-label": audio.isPlaying ? "Áudio em reprodução" : "Ouvir instrução"', "aria áudio");
    html = required(html, '              "🔊"\n            )', `              h("svg", {viewBox:"0 0 24 24",width:23,height:23,"aria-hidden":"true",focusable:"false",style:{display:"block",color:"currentColor"}},\n                h("path",{d:"M11 5 6.5 9H3v6h3.5L11 19V5Z",fill:"currentColor"}),\n                h("path",{d:"M15 8.5c1.3 1.8 1.3 5.2 0 7",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round"}),\n                h("path",{d:"M18 6c2.7 3.4 2.7 8.6 0 12",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round"})\n              )\n            )`, "SVG do áudio");

    html = required(html, '  .duduq-ws-audio-shell {\n    position: relative;\n    width: 48px;\n    height: 48px;\n    display: grid;\n    place-items: center;\n  }', '  .duduq-ws-audio-shell {\n    position: relative;\n    width: 44px;\n    height: 44px;\n    display: grid;\n    place-items: center;\n    isolation: isolate;\n  }', "audio shell 44");
    html = required(html, '  .duduq-ws-audio {\n    position: relative;\n    z-index: 2;\n    width: 48px;\n    height: 48px;\n    display: grid;\n    place-items: center;\n    padding: 0;\n    border: 2px solid var(--ws-primary-depth);\n    border-radius: 999px;\n    background: linear-gradient(180deg,#1471CF 0%,var(--ws-primary) 100%);\n    color: #fff;\n    box-shadow: 0 4px 0 var(--ws-primary-depth), 0 8px 15px rgba(0,86,179,.15);\n    font-size: 21px;\n    cursor: pointer;\n    transition: transform 120ms ease, box-shadow 120ms ease, filter 120ms ease;\n  }', '  .duduq-ws-audio {\n    position: relative;\n    z-index: 2;\n    width: 44px;\n    height: 44px;\n    display: grid;\n    place-items: center;\n    padding: 0;\n    border: 2px solid #064A92;\n    border-radius: 999px;\n    background: linear-gradient(180deg,#218BEA 0%,#0B70D5 70%,#0864BF 100%);\n    color: #fff;\n    box-shadow: 0 4px 0 #064A92,0 8px 15px rgba(9,103,201,.18),inset 0 2px 0 rgba(255,255,255,.42);\n    cursor: pointer;\n    transition: transform 90ms ease,filter 140ms ease,box-shadow 90ms ease,background 180ms ease,border-color 180ms ease,color 180ms ease;\n  }', "audio CSS nativo");
    html = required(html, '  .duduq-ws-audio[data-playing="true"] {\n    border-color: #359500;\n    background: linear-gradient(180deg,#70E90E 0%,#58CC02 62%,#49B900 100%);\n    box-shadow: 0 4px 0 #2F8A00, 0 0 0 5px rgba(88,204,2,.14), 0 9px 17px rgba(57,156,0,.18);\n  }', '  .duduq-ws-audio[data-playing="true"] {\n    border-color:#359500;\n    background:linear-gradient(180deg,#70E90E 0%,#58CC02 62%,#49B900 100%);\n    color:#1B5E20;\n    box-shadow:0 5px 0 #2F8A00,0 10px 20px rgba(57,156,0,.22),inset 0 2px 0 rgba(255,255,255,.38);\n    filter:none;\n  }', "playing CSS nativo");
    return html;
  }

  function visualSkin(html) {
    const css=`<style id="duduq-word-slash-1-0-9-visual-skin">
html body #root .duduq-engine-stage .duduq-ws-surface{width:100%!important;max-width:none!important;margin:0 auto!important;padding:0 8px 16px!important;gap:12px!important}
html body #root .duduq-engine-stage .duduq-ws-instruction{width:min(1110px,calc(100% - 96px))!important;min-height:66px!important;margin:0 auto!important;grid-template-columns:48px minmax(0,1fr) 48px!important;gap:12px!important;padding:8px 14px 10px!important;border:2px solid #D8E0E8!important;border-radius:999px!important;background:rgba(255,255,255,.97)!important;box-shadow:0 3px 0 rgba(161,188,199,.64),0 7px 14px rgba(43,89,110,.055),inset 0 1px 0 #fff!important}
html body #root .duduq-engine-stage .duduq-ws-instruction::before{content:""!important;width:48px!important;height:48px!important;display:block!important;border:0!important;background:transparent!important;box-shadow:none!important;font-size:0!important}
html body #root .duduq-engine-stage .duduq-ws-dashboard{min-height:36px!important;margin:0!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:10px!important}
html body #root .duduq-engine-stage .duduq-ws-stat{min-height:36px!important;height:36px!important;padding:0 13px!important;display:inline-flex!important;align-items:center!important;gap:6px!important;border:2px solid #B7C9DC!important;border-radius:999px!important;background:rgba(255,255,255,.97)!important;color:#16375B!important;box-shadow:0 3px 0 #B8C5D6,0 6px 12px rgba(43,89,110,.05),inset 0 1px 0 #fff!important;font-size:14px!important;font-weight:900!important;line-height:1!important}
html body #root .duduq-engine-stage .duduq-ws-stat strong{color:#075AB8!important;font-size:17px!important;line-height:1!important}
html body #root .duduq-engine-stage .duduq-ws-arena{width:calc(100% - 16px)!important;min-height:clamp(292px,40vh,350px)!important;height:clamp(292px,40vh,350px)!important;max-height:350px!important;margin:0 auto!important;border:2px solid rgba(176,205,224,.78)!important;border-radius:28px!important;background:radial-gradient(circle at 18% 14%,rgba(255,255,255,.92) 0 3%,rgba(255,255,255,.28) 19%,transparent 38%),radial-gradient(circle at 82% 76%,rgba(177,230,242,.18) 0 13%,transparent 36%),linear-gradient(145deg,rgba(255,255,255,.82),rgba(245,251,255,.72) 38%,rgba(227,244,250,.58))!important;box-shadow:0 3px 0 rgba(166,192,201,.62),0 10px 24px rgba(44,89,109,.055),inset 0 1px 0 rgba(255,255,255,.98)!important;backdrop-filter:blur(10px) saturate(1.08);overflow:hidden!important}
html body #root .duduq-engine-stage .duduq-ws-background-layer{background:linear-gradient(112deg,transparent 0 18%,rgba(255,255,255,.28) 22%,transparent 31%),radial-gradient(circle at 20% 24%,rgba(255,255,255,.42) 0 1px,transparent 2px)!important;background-size:100% 100%,30px 30px!important;opacity:.72!important}
@media(max-width:720px){html body #root .duduq-engine-stage .duduq-ws-surface{padding:0 6px 12px!important;gap:10px!important}html body #root .duduq-engine-stage .duduq-ws-instruction{width:calc(100% - 12px)!important;min-height:62px!important;grid-template-columns:38px minmax(0,1fr) 44px!important;gap:7px!important;padding:7px 9px 10px!important}html body #root .duduq-engine-stage .duduq-ws-instruction::before{width:38px!important;height:38px!important}html body #root .duduq-engine-stage .duduq-ws-stat{min-height:34px!important;height:34px!important;padding:0 11px!important}html body #root .duduq-engine-stage .duduq-ws-arena{width:calc(100% - 8px)!important;min-height:clamp(280px,43vh,330px)!important;height:clamp(280px,43vh,330px)!important;max-height:330px!important;border-radius:24px!important}}
</style>`;
    return html.includes("</body>") ? html.replace("</body>",css+"\n</body>") : html;
  }

  function syncChrome(doc, context, title) {
    if (!doc) return;
    const h=doc.querySelector(".duduq-engine-heading h1"); if(h) h.textContent=title;
    const i=Number.isFinite(context?.stepIndex)?context.stepIndex:0, total=Number.isFinite(context?.totalSteps)?Math.max(1,context.totalSteps):1;
    const s=doc.querySelector(".duduq-progress-copy strong"); if(s) s.textContent=`Etapa ${Math.min(i+1,total)} de ${total}`;
  }

  function validate(payload) { try { const qs=questionsOf(payload); if(!qs.length)return false; qs.map(normalizeQuestion).forEach(wsConfig); return true; } catch(e){console.error(e);return false;} }

  function mount({container,payload,context={},onComplete}) {
    const qs=questionsOf(payload).map(normalizeQuestion); if(!container||!qs.length) throw new Error("[DuduQ Word Slash] Payload/container inválido."); qs.forEach(wsConfig);
    container.innerHTML="";
    const wrap=document.createElement("div"); wrap.className="duduq-mechanic-frame"; Object.assign(wrap.style,{width:"100%",height:"100%",minHeight:"0",overflow:"hidden",position:"relative"});
    const frame=document.createElement("iframe"); frame.title="DuduQ — Word Slash"; frame.setAttribute("allow","autoplay; fullscreen"); frame.setAttribute("allowfullscreen",""); Object.assign(frame.style,{width:"100%",height:"100%",minHeight:"0",border:"0",display:"block",background:"transparent"}); wrap.appendChild(frame); container.appendChild(wrap);
    let dead=false,done=false,observer=null; const title=text(payload?.title||qs[0]?.metadata?.screenTitle,"Word Slash");
    const msg=(e)=>{if(e.source===frame.contentWindow&&e.data?.type==="DUDUQ_WORD_SLASH_COMPLETE"&&!done){done=true;onComplete?.({type:"complete",completed:true,mechanic:ID});}}; window.addEventListener("message",msg);
    frame.addEventListener("load",()=>{try{syncChrome(frame.contentDocument,context,title);observer=new MutationObserver(()=>syncChrome(frame.contentDocument,context,title));observer.observe(frame.contentDocument.body,{childList:true,subtree:true,characterData:true});}catch(_){}});
    const base=(window.DUDUQ_ENGINE_BASE?String(window.DUDUQ_ENGINE_BASE).replace(/\/$/,""):".")+RUNTIME+`?engineAdapter=${VERSION}`;
    fetch(base).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.text();}).then(html=>{
      if(dead)return; const built=build(payload,qs,context); let out=injectConfig(html,built.config); out=injectAssets(out,built.assets); out=completionBridge(out); out=rootFix(out); out=visualSkin(out); frame.srcdoc=out;
    }).catch(e=>{console.error("[DuduQ Word Slash 1.0.9]",e);if(!dead)container.textContent="Erro ao preparar a atividade Word Slash.";});
    return ()=>{dead=true;observer?.disconnect();window.removeEventListener("message",msg);try{frame.src="about:blank";}catch(_){} wrap.remove();};
  }

  window.DuduQ.registerMechanic({id:ID,version:VERSION,validate,mount,metadata:{name:"Word Slash",category:"reconhecimento-rapido",active:true,acceptsSchema:"1.0.0",globalProgress:true,literacyFriendly:true,supportsMedia:["text","image","color","audio-instruction"],gradeRange:{minimum:1,maximum:5},routerProfile:{name:"Word Slash",active:true,baseScore:84,answerTypes:["single","multiple"],answerTypeWeights:{single:34,multiple:32},minAlternatives:2,maxAlternatives:10,supports:{questionImage:false,optionImageUrl:true,optionImageAssetKey:true,questionAudio:true,optionAudio:false},metadata:{category:"reconhecimento-rapido",earlyLiteracy:true,speedBased:true,supportsCategories:true,runtimeRootFix:"audio-font-1.0.9"},tags:["word","image","category","listening","speed"]}}});
})();