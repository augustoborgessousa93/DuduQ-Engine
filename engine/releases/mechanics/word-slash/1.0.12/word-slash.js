/* DUDUQ WORD SLASH 1.0.12 — instruction parity by shared World Fusion profile */
(function () {
  "use strict";

  if (!window.DuduQ) {
    console.error("[DuduQ Word Slash] duduq-host.js precisa ser carregado antes.");
    return;
  }

  const ID = "word-slash";
  const VERSION = "1.0.12";
  const RUNTIME = "/engine/releases/mechanics/word-slash/1.0.12/DUDUQ_WORD_SLASH.html";

  const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
  const text = (v, f = "") => {
    const s = v == null ? "" : String(v).trim();
    return s || f;
  };
  const num = (v, f, min, max) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : f;
  };
  const questionsOf = (p) =>
    Array.isArray(p) ? p :
    Array.isArray(p?.questions) ? p.questions :
    Array.isArray(p?.items) ? p.items :
    isObj(p) ? [p] : [];
  const normalizeQuestion = (q, i) =>
    window.DuduQSchema?.normalizeQuestion
      ? window.DuduQSchema.normalizeQuestion(q, i, {})
      : q;
  const upperInstruction = (v, f) =>
    text(v, f).toLocaleUpperCase("pt-BR");

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

  function resolveYear(context, first) {
    return Math.max(
      1,
      Math.min(5, Number(context?.year ?? first?.year ?? 1) || 1)
    );
  }

  function build(payload, qs, context) {
    const assets = Object.create(null);
    const stages = qs.map((q, i) => {
      const c = wsConfig(q);
      const year = context?.year ?? q?.year ?? 1;
      const d = {...defaults(year), ...(isObj(c.difficulty) ? c.difficulty : {})};
      const qid = text(q.id, `word-slash-stage-${i+1}`);
      const target = {
        label: text(c.target.label, "TARGET"),
        value: text(c.target.value),
        spokenText: text(c.target.spokenText || c.target.value || c.target.label)
      };
      if (Array.isArray(c.target.acceptCategories)) {
        target.acceptCategories = c.target.acceptCategories.map((x) => text(x)).filter(Boolean);
      }
      if (c.target.hideValue === true) target.hideValue = true;

      const objects = c.objects.map((raw, j) => {
        const o = isObj(raw) ? raw : {};
        const oid = text(o.id, `${qid}-object-${j+1}`);
        const src = text(o.imageSrc || o.image?.src);
        let key = text(o.imageAssetKey);
        if (src) {
          key = key || `ws-${qid}-${oid}`;
          assets[key] = src;
        }
        const out = {
          id: oid,
          type: text(o.type, key ? "image" : o.colorHex ? "color" : "word"),
          label: text(o.label),
          value: text(o.value, o.label || o.alt || oid),
          category: text(o.category),
          weight: num(o.weight, 1, 1, 20)
        };
        if (key) {
          out.imageAssetKey = key;
          out.alt = text(o.alt, o.label || o.value || oid);
        }
        if (o.colorHex) out.colorHex = text(o.colorHex);
        return out;
      });

      return {
        id: qid,
        title: text(q?.metadata?.screenTitle || q?.metadata?.title || q?.statement, "Word Slash"),
        instruction: upperInstruction(q?.instruction, "CORTE SOMENTE OS ELEMENTOS CORRETOS."),
        audioText: text(c.audioText || q?.audio?.text || q?.media?.audio?.text || q?.instruction),
        mode: text(c.mode, "correct-word"),
        target,
        goal: Math.round(num(c.goal, 3, 1, 20)),
        difficulty: {
          speedMinMs: Math.round(num(d.speedMinMs,3600,1200,12000)),
          speedMaxMs: Math.round(num(d.speedMaxMs,4600,1400,14000)),
          maxObjects: Math.round(num(d.maxObjects,4,2,10)),
          spawnEveryMs: Math.round(num(d.spawnEveryMs,860,300,3000)),
          timeLimitSeconds: Math.round(num(d.timeLimitSeconds,38,15,120)),
          correctProbability: num(d.correctProbability,.5,.14,.85)
        },
        objects
      };
    });

    const first = qs[0] || {};
    const year = resolveYear(context, first);
    return {
      year,
      config: {
        schemaVersion: 1,
        mechanic: ID,
        version: "1.0.0",
        title: text(payload?.title || first?.metadata?.screenTitle, "Word Slash"),
        settings: {
          interfaceLocale: "pt-BR",
          speechLocale: "en-US",
          targetGrade: year,
          extraTimeSeconds: 12,
          wrongPenalty: 0
        },
        stages
      },
      assets
    };
  }

  function safeJson(v) {
    return JSON.stringify(v, null, 2)
      .replace(/</g, "\\u003c")
      .replace(/`/g, "\\`")
      .replace(/\$\{/g, "\\${");
  }

  function required(html, from, to, label) {
    if (!html.includes(from)) {
      throw new Error(`[DuduQ Word Slash 1.0.12] Marcador ausente: ${label}.`);
    }
    return html.replace(from, to);
  }

  function injectConfig(html, config) {
    const head = 'var WORD_SLASH_ACTIVITY_JSON = String.raw`';
    const tail = '`;\n\n  var WORD_SLASH_CONFIG = JSON.parse(WORD_SLASH_ACTIVITY_JSON);';
    const a = html.indexOf(head);
    if (a < 0) throw new Error("JSON marker ausente");
    const start = a + head.length;
    const end = html.indexOf(tail, start);
    if (end < 0) throw new Error("JSON tail ausente");
    return html.slice(0, start) + safeJson(config) + html.slice(end);
  }

  function injectAssets(html, assets) {
    const from = 'var WORD_SLASH_ASSETS = {\n    ...DRAG_DROP_UNIVERSAL_ASSETS\n  };';
    const to = `var WORD_SLASH_ASSETS = {
    ...DRAG_DROP_UNIVERSAL_ASSETS,
    ...${safeJson(assets)}
  };`;
    return required(html, from, to, "assets");
  }

  function completionBridge(html) {
    const from = "autoPlayInstruction: true,\n        gamificationPolicy:";
    const to = 'autoPlayInstruction: true,\n        hostedByDuduQ: true,\n        onLessonComplete: () => window.parent.postMessage({type:"DUDUQ_WORD_SLASH_COMPLETE"}, "*"),\n        gamificationPolicy:';
    return required(html, from, to, "completion bridge");
  }

  /* Target Shooter estampa o ano no <html>. O World Fusion usa esse dado
     para ativar data-duduq-literacy-early e a tipografia pedagógica final
     de 1º–3º ano. A Word Slash passa a seguir o mesmo fluxo. */
  function stampYear(html, year) {
    if (year == null) return html;
    return html.replace(/<html([^>]*)>/i, function (_, attrs) {
      return `<html${attrs} data-duduq-ano="${String(year)}" data-duduq-ano-ativo="${String(year)}">`;
    });
  }

  function rootFix(html) {
    const oldReplay = '    const replayTarget = useCallback(() => {\n      const spokenText = question.target.spokenText || question.target.value || question.audioText || question.instruction;\n      audio.playText(`word-slash:${question.id}:target`, spokenText, "en-US");\n    }, [audio, question]);';
    const newReplay = '    const replayTarget = useCallback(() => {\n      audio.playInstruction(true);\n    }, [audio]);';
    html = required(html, oldReplay, newReplay, "fluxo playInstruction");
    html = required(
      html,
      '"data-playing": audio.activeAudioKey === `word-slash:${question.id}:target` ? "true" : "false",',
      '"data-playing": audio.isPlaying ? "true" : "false",',
      "estado isPlaying"
    );
    html = required(
      html,
      '"aria-label": "Ouvir novamente o alvo em inglês"',
      '"aria-label": audio.isPlaying ? "Áudio em reprodução" : "Ouvir instrução"',
      "aria áudio"
    );
    html = required(
      html,
      '              "🔊"\n            )',
      `              h("svg", {viewBox:"0 0 24 24",width:23,height:23,"aria-hidden":"true",focusable:"false",style:{display:"block",color:"currentColor"}},
                h("path",{d:"M11 5 6.5 9H3v6h3.5L11 19V5Z",fill:"currentColor"}),
                h("path",{d:"M15 8.5c1.3 1.8 1.3 5.2 0 7",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round"}),
                h("path",{d:"M18 6c2.7 3.4 2.7 8.6 0 12",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round"})
              )
            )`,
      "SVG do áudio"
    );

    html = required(
      html,
      '  .duduq-ws-audio-shell {\n    position: relative;\n    width: 48px;\n    height: 48px;\n    display: grid;\n    place-items: center;\n  }',
      '  .duduq-ws-audio-shell {\n    position: relative;\n    width: 44px;\n    height: 44px;\n    display: grid;\n    place-items: center;\n    isolation: isolate;\n  }',
      "audio shell 44"
    );
    html = required(
      html,
      '  .duduq-ws-audio {\n    position: relative;\n    z-index: 2;\n    width: 48px;\n    height: 48px;\n    display: grid;\n    place-items: center;\n    padding: 0;\n    border: 2px solid var(--ws-primary-depth);\n    border-radius: 999px;\n    background: linear-gradient(180deg,#1471CF 0%,var(--ws-primary) 100%);\n    color: #fff;\n    box-shadow: 0 4px 0 var(--ws-primary-depth), 0 8px 15px rgba(0,86,179,.15);\n    font-size: 21px;\n    cursor: pointer;\n    transition: transform 120ms ease, box-shadow 120ms ease, filter 120ms ease;\n  }',
      '  .duduq-ws-audio {\n    position: relative;\n    z-index: 2;\n    width: 44px;\n    height: 44px;\n    display: grid;\n    place-items: center;\n    padding: 0;\n    border: 2px solid #064A92;\n    border-radius: 999px;\n    background: linear-gradient(180deg,#218BEA 0%,#0B70D5 70%,#0864BF 100%);\n    color: #fff;\n    box-shadow: 0 4px 0 #064A92,0 8px 15px rgba(9,103,201,.18),inset 0 2px 0 rgba(255,255,255,.42);\n    cursor: pointer;\n    transition: transform 90ms ease,filter 140ms ease,box-shadow 90ms ease,background 180ms ease,border-color 180ms ease,color 180ms ease;\n  }',
      "audio CSS nativo"
    );
    html = required(
      html,
      '  .duduq-ws-audio[data-playing="true"] {\n    border-color: #359500;\n    background: linear-gradient(180deg,#70E90E 0%,#58CC02 62%,#49B900 100%);\n    box-shadow: 0 4px 0 #2F8A00, 0 0 0 5px rgba(88,204,2,.14), 0 9px 17px rgba(57,156,0,.18);\n  }',
      '  .duduq-ws-audio[data-playing="true"] {\n    border-color:#359500;\n    background:linear-gradient(180deg,#70E90E 0%,#58CC02 62%,#49B900 100%);\n    color:#1B5E20;\n    box-shadow:0 5px 0 #2F8A00,0 10px 20px rgba(57,156,0,.22),inset 0 2px 0 rgba(255,255,255,.38);\n    filter:none;\n  }',
      "playing CSS nativo"
    );

    return html;
  }

  function visualSkin(html) {
    const css = `<style id="duduq-word-slash-1-0-12-target-parity">
/* A tipografia NÃO é redefinida nesta camada. World Fusion é a única
   autoridade final, igual ao Target Shooter. */
html body #root .duduq-engine-stage .duduq-ws-surface{
  width:100%!important;max-width:none!important;min-height:0!important;
  display:flex!important;flex-direction:column!important;align-items:center!important;
  margin:0 auto!important;padding:2px!important;gap:12px!important;row-gap:12px!important;
}
html body #root .duduq-engine-stage .duduq-ws-instruction{
  width:calc(100% - 12px)!important;max-width:1110px!important;min-height:62px!important;
  margin:0 auto!important;grid-template-columns:38px minmax(0,1fr) 44px!important;
  gap:7px!important;padding:7px 9px 10px!important;border:2px solid #D8E0E8!important;
  border-radius:999px!important;background:rgba(255,255,255,.97)!important;
  box-shadow:0 3px 0 rgba(161,188,199,.64),0 7px 14px rgba(43,89,110,.055),inset 0 1px 0 #fff!important;
}
html body #root .duduq-engine-stage .duduq-ws-instruction::before{
  content:""!important;width:38px!important;height:38px!important;display:block!important;
  border:0!important;background:transparent!important;box-shadow:none!important;font-size:0!important;
}
html body #root .duduq-engine-stage .duduq-ws-dashboard{
  min-height:36px!important;margin:0!important;display:flex!important;
  align-items:center!important;justify-content:center!important;gap:10px!important;
}
html body #root .duduq-engine-stage .duduq-ws-stat{
  min-height:36px!important;height:36px!important;padding:0 13px!important;
  display:inline-flex!important;align-items:center!important;gap:6px!important;
  border:2px solid #B7C9DC!important;border-radius:999px!important;
  background:rgba(255,255,255,.97)!important;color:#16375B!important;
  box-shadow:0 3px 0 #B8C5D6,0 6px 12px rgba(43,89,110,.05),inset 0 1px 0 #fff!important;
  font-family:Nunito,ui-rounded,system-ui,sans-serif!important;font-size:14px!important;
  font-weight:900!important;line-height:1!important;
}
html body #root .duduq-engine-stage .duduq-ws-stat strong{
  color:#075AB8!important;font-size:17px!important;line-height:1!important;font-weight:900!important;
}
html body #root .duduq-engine-stage .duduq-ws-arena{
  position:relative!important;width:100%!important;
  height:clamp(440px,59vh,620px)!important;
  min-height:clamp(280px,47vh,430px)!important;
  max-height:none!important;flex:1 1 auto!important;
  margin:0!important;overflow:hidden!important;
  border:2px solid #A9D2EE!important;border-radius:32px!important;
  background:
    radial-gradient(circle at 13% 15%,rgba(255,255,230,.68) 0 3.5%,rgba(255,255,255,.18) 7%,transparent 14%),
    linear-gradient(180deg,#83d4ff 0%,#bdeaff 46%,#eaf8ff 72%,#eefdf1 100%)!important;
  box-shadow:0 7px 0 #abc6d9,0 20px 38px rgba(55,99,140,.12),
    inset 0 2px 0 rgba(255,255,255,.96),inset 0 -18px 38px rgba(63,158,82,.06)!important;
  touch-action:manipulation!important;user-select:none!important;isolation:isolate!important;
}
html body #root .duduq-engine-stage .duduq-ws-arena::before{
  content:""!important;position:absolute!important;z-index:0!important;
  inset:-3% -5% 24% -5%!important;border-radius:0!important;pointer-events:none!important;
  background:
    radial-gradient(ellipse at 12% 32%,rgba(255,255,255,.74) 0 6%,rgba(255,255,255,.48) 7% 10%,transparent 11%),
    radial-gradient(ellipse at 19% 27%,rgba(255,255,255,.64) 0 5%,transparent 6%),
    radial-gradient(ellipse at 76% 22%,rgba(255,255,255,.72) 0 6%,rgba(255,255,255,.45) 7% 11%,transparent 12%),
    radial-gradient(ellipse at 84% 28%,rgba(255,255,255,.60) 0 5%,transparent 6%),
    radial-gradient(ellipse at 53% 46%,rgba(255,255,255,.30) 0 4%,transparent 5%),
    linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,0))!important;
  opacity:.80!important;transform:translate3d(0,0,0);
  animation:duduq-ws-target-clouds 38s ease-in-out infinite alternate;
}
html body #root .duduq-engine-stage .duduq-ws-arena::after{
  content:""!important;position:absolute!important;z-index:1!important;
  left:-6%!important;right:-6%!important;bottom:-16%!important;height:43%!important;
  border-radius:48% 52% 0 0 / 18% 18% 0 0!important;pointer-events:none!important;
  background:
    radial-gradient(ellipse at 12% 12%,rgba(255,238,112,.20) 0 1.2%,transparent 1.5%),
    radial-gradient(ellipse at 38% 24%,rgba(255,255,255,.13) 0 1.2%,transparent 1.5%),
    radial-gradient(ellipse at 70% 16%,rgba(255,238,112,.18) 0 1.1%,transparent 1.4%),
    repeating-linear-gradient(102deg,rgba(26,126,46,.10) 0 2px,transparent 2px 10px),
    linear-gradient(180deg,#b8ee8f 0%,#8ed86f 32%,#68c356 68%,#4ca845 100%)!important;
  background-size:180px 120px,220px 130px,210px 130px,26px 100%,100% 100%!important;
  box-shadow:inset 0 10px 0 rgba(255,255,255,.26),inset 0 22px 24px rgba(255,255,255,.08),
    0 -8px 26px rgba(45,149,69,.08)!important;
  transform-origin:50% 100%;animation:duduq-ws-target-grass 6.8s ease-in-out infinite alternate;
}
html body #root .duduq-engine-stage .duduq-ws-background-layer{
  z-index:1!important;opacity:.72!important;background:none!important;pointer-events:none!important;
}
html body #root .duduq-engine-stage .duduq-ws-background-layer::after{
  content:none!important;display:none!important;
}
html body #root .duduq-engine-stage .duduq-ws-background-layer::before{
  content:""!important;position:absolute!important;z-index:1!important;
  left:1.5%!important;right:1.5%!important;bottom:1.5%!important;height:31%!important;
  pointer-events:none!important;opacity:.72!important;
  background-image:
    repeating-linear-gradient(100deg,transparent 0 27px,rgba(47,152,68,.34) 28px 31px,transparent 32px 58px),
    radial-gradient(circle at 12% 78%,#fffdf5 0 3px,#f2c94c 3px 5px,transparent 6px),
    radial-gradient(circle at 27% 83%,#f8d7df 0 3px,#f4c95d 3px 5px,transparent 6px),
    radial-gradient(circle at 70% 80%,#eee8ff 0 3px,#f2cf58 3px 5px,transparent 6px),
    radial-gradient(circle at 87% 76%,#fffdf5 0 3px,#efc54a 3px 5px,transparent 6px)!important;
  background-repeat:repeat-x,no-repeat,no-repeat,no-repeat,no-repeat!important;
  background-position:center bottom!important;
  transform-origin:50% 100%;animation:duduq-ws-target-meadow 7.6s ease-in-out infinite alternate;
}
html body #root .duduq-engine-stage .duduq-ws-object-layer{z-index:2!important}
html body #root .duduq-engine-stage .duduq-ws-fragment-layer{z-index:3!important}
html body #root .duduq-engine-stage .duduq-ws-particle-layer{z-index:4!important}
html body #root .duduq-engine-stage .duduq-ws-canvas{z-index:5!important}
html body #root .duduq-engine-stage .duduq-ws-feedback-layer{z-index:6!important}
html body #root .duduq-engine-stage .duduq-ws-flash-layer{z-index:7!important}
html body #root .duduq-engine-stage .duduq-ws-status{
  position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;
  overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important;
}
html body #root .duduq-engine-stage .duduq-ws-hint{display:none!important}
@keyframes duduq-ws-target-clouds{
  from{transform:translate3d(-.7%,0,0)}
  to{transform:translate3d(.7%,.25%,0)}
}
@keyframes duduq-ws-target-grass{
  from{transform:translate3d(0,0,0) scaleX(1.001);filter:saturate(.98)}
  to{transform:translate3d(.18%,0,0) scaleX(.999);filter:saturate(1.02)}
}
@keyframes duduq-ws-target-meadow{
  from{transform:translate3d(-.08%,0,0) skewX(-.18deg)}
  to{transform:translate3d(.08%,0,0) skewX(.18deg)}
}
@media(max-width:640px){
  html body #root .duduq-engine-stage .duduq-ws-surface{gap:12px!important;padding:2px!important}
  html body #root .duduq-engine-stage .duduq-ws-instruction{
    width:calc(100% - 12px)!important;min-height:62px!important;
    grid-template-columns:38px minmax(0,1fr) 44px!important;gap:7px!important;padding:7px 9px 10px!important;
  }
  html body #root .duduq-engine-stage .duduq-ws-arena{
    height:clamp(520px,70vh,650px)!important;min-height:520px!important;border-radius:25px!important;
  }
  html body #root .duduq-engine-stage .duduq-ws-arena::before{opacity:.68!important}
  html body #root .duduq-engine-stage .duduq-ws-arena::after{height:39%!important;bottom:-12%!important}
  html body #root .duduq-engine-stage .duduq-ws-background-layer::before{height:27%!important;opacity:.60!important}
}
@media(max-width:380px){
  html body #root .duduq-engine-stage .duduq-ws-arena{min-height:560px!important}
}
@media(max-width:520px) and (max-height:520px){
  html body #root .duduq-engine-stage .duduq-ws-root,
  html body #root .duduq-engine-stage .duduq-ws-surface{height:auto!important;min-height:100%!important;overflow:visible!important}
  html body #root .duduq-engine-stage .duduq-ws-arena{height:580px!important;min-height:580px!important}
}
@media(prefers-reduced-motion:reduce){
  html body #root .duduq-engine-stage .duduq-ws-arena::before,
  html body #root .duduq-engine-stage .duduq-ws-arena::after,
  html body #root .duduq-engine-stage .duduq-ws-background-layer::before{
    animation:none!important;transform:none!important;
  }
}
</style>`;

    return html.includes("</body>")
      ? html.replace("</body>", css + "\n</body>")
      : html;
  }

  function syncChrome(doc, context, title) {
    if (!doc?.documentElement) return;

    if (context?.year != null) {
      doc.documentElement.setAttribute("data-duduq-ano-ativo", String(context.year));
      doc.documentElement.setAttribute("data-duduq-ano", String(context.year));
    }

    const heading = doc.querySelector(".duduq-engine-heading h1");
    if (heading && heading.textContent !== title) heading.textContent = title;

    const i = Number.isFinite(context?.stepIndex) ? context.stepIndex : 0;
    const total = Number.isFinite(context?.totalSteps) ? Math.max(1, context.totalSteps) : 1;
    const strong = doc.querySelector(".duduq-progress-copy strong");
    if (strong) strong.textContent = `Etapa ${Math.min(i + 1, total)} de ${total}`;
  }

  function validate(payload) {
    try {
      const qs = questionsOf(payload);
      if (!qs.length) return false;
      qs.map(normalizeQuestion).forEach(wsConfig);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  function mount({container, payload, context = {}, onComplete}) {
    const qs = questionsOf(payload).map(normalizeQuestion);
    if (!container || !qs.length) throw new Error("[DuduQ Word Slash] Payload/container inválido.");
    qs.forEach(wsConfig);

    container.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "duduq-mechanic-frame";
    Object.assign(wrap.style, {
      width:"100%", height:"100%", minHeight:"0", overflow:"hidden", position:"relative"
    });

    const frame = document.createElement("iframe");
    frame.title = "DuduQ — Word Slash";
    frame.setAttribute("allow", "autoplay; fullscreen");
    frame.setAttribute("allowfullscreen", "");
    Object.assign(frame.style, {
      width:"100%", height:"100%", minHeight:"0", border:"0", display:"block", background:"transparent"
    });
    wrap.appendChild(frame);
    container.appendChild(wrap);

    let dead = false;
    let done = false;
    let observer = null;
    const title = text(payload?.title || qs[0]?.metadata?.screenTitle, "Word Slash");

    const msg = (e) => {
      if (
        e.source === frame.contentWindow &&
        e.data?.type === "DUDUQ_WORD_SLASH_COMPLETE" &&
        !done
      ) {
        done = true;
        onComplete?.({type:"complete", completed:true, mechanic:ID});
      }
    };
    window.addEventListener("message", msg);

    frame.addEventListener("load", () => {
      try {
        syncChrome(frame.contentDocument, context, title);
        observer = new MutationObserver(() =>
          syncChrome(frame.contentDocument, context, title)
        );
        observer.observe(frame.contentDocument.body, {
          childList:true, subtree:true, characterData:true
        });
      } catch (_) {}
    });

    const base =
      (window.DUDUQ_ENGINE_BASE
        ? String(window.DUDUQ_ENGINE_BASE).replace(/\/$/, "")
        : ".") +
      RUNTIME +
      `?engineAdapter=${VERSION}`;

    fetch(base)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((html) => {
        if (dead) return;
        const built = build(payload, qs, context);
        let out = injectConfig(html, built.config);
        out = injectAssets(out, built.assets);
        out = completionBridge(out);
        out = rootFix(out);
        out = visualSkin(out);
        out = stampYear(out, built.year);
        frame.srcdoc = out;
      })
      .catch((e) => {
        console.error("[DuduQ Word Slash 1.0.12]", e);
        if (!dead) container.textContent = "Erro ao preparar a atividade Word Slash.";
      });

    return () => {
      dead = true;
      observer?.disconnect();
      window.removeEventListener("message", msg);
      try { frame.src = "about:blank"; } catch (_) {}
      wrap.remove();
    };
  }

  window.DuduQ.registerMechanic({
    id: ID,
    version: VERSION,
    validate,
    mount,
    metadata: {
      name: "Word Slash",
      category: "reconhecimento-rapido",
      active: true,
      acceptsSchema: "1.0.0",
      globalProgress: true,
      literacyFriendly: true,
      supportsMedia: ["text","image","color","audio-instruction"],
      gradeRange: {minimum:1, maximum:5},
      routerProfile: {
        name: "Word Slash",
        active: true,
        baseScore: 84,
        answerTypes: ["single","multiple"],
        answerTypeWeights: {single:34, multiple:32},
        minAlternatives: 2,
        maxAlternatives: 10,
        supports: {
          questionImage:false,
          optionImageUrl:true,
          optionImageAssetKey:true,
          questionAudio:true,
          optionAudio:false
        },
        metadata: {
          category:"reconhecimento-rapido",
          earlyLiteracy:true,
          speedBased:true,
          supportsCategories:true,
          runtimeRootFix:"year-stamp-world-fusion-typography-parity-1.0.12"
        },
        tags:["word","image","category","listening","speed"]
      }
    }
  });
})();
