/* DUDUQ English Year 3 — Smart Sentence visual standardization.
   Golden reference: EN3-M1-03.
   Presentation-only layer: no content, answer, mechanic, Host, Core or audio logic changes.
*/
(function(root){
  "use strict";

  const VERSION="1.0.0";
  const GOLDEN_REFERENCE="EN3-M1-03";
  const STYLE_ID="duduq-y3-smart-golden-standard";
  const FRAME_SELECTOR='iframe[title="DuduQ — Smart Sentence"]';

  const CSS=`
/* Year 3 Smart Sentence — EN3-M1-03 golden visual architecture. */
.duduq-smart-ts-stage{
  --y3-smart-standard-width:900px;
  --y3-smart-standard-gap:clamp(8px,1.05vh,12px);
  gap:var(--y3-smart-standard-gap)!important;
  align-items:center!important;
  justify-content:flex-start!important;
  padding-top:clamp(6px,.8vh,10px)!important;
  padding-bottom:clamp(28px,3.5vh,40px)!important;
}
.duduq-smart-ts-stimulus,
.duduq-smart-ts-dialogue,
.duduq-smart-ts-workspace,
.duduq-smart-ts-bank-wrap,
.duduq-smart-ts-actions,
.duduq-smart-ts-choice-grid{
  width:min(var(--y3-smart-standard-width),100%)!important;
  max-width:100%!important;
  min-width:0!important;
}
.duduq-smart-ts-stimulus{
  min-height:0!important;
  margin:0!important;
  align-items:center!important;
  justify-content:center!important;
}
.duduq-smart-ts-stimulus[hidden]{display:none!important;}
.duduq-smart-ts-image{
  display:block!important;
  width:clamp(96px,10.5vw,132px)!important;
  height:clamp(96px,10.5vw,132px)!important;
  max-width:100%!important;
  object-fit:contain!important;
  object-position:center!important;
  margin-inline:auto!important;
  filter:drop-shadow(0 5px 7px rgba(31,65,99,.10))!important;
}
.duduq-smart-ts-dialogue{
  gap:7px!important;
  margin:0!important;
}
.duduq-smart-ts-dialogue-line{
  min-height:46px!important;
  padding:8px 12px!important;
  border-radius:16px!important;
}
.duduq-smart-ts-workspace{
  min-height:clamp(104px,13vh,132px)!important;
  padding:clamp(12px,1.5vw,18px)!important;
  gap:clamp(7px,1vw,11px)!important;
  border:2px solid #A9D2EE!important;
  border-radius:24px!important;
  background:rgba(255,255,255,.94)!important;
  box-shadow:0 5px 0 #B4CADB,0 12px 22px rgba(55,99,140,.10),inset 0 1px 0 rgba(255,255,255,.96)!important;
}
.duduq-smart-ts-template{
  width:100%!important;
  gap:clamp(7px,1vw,11px)!important;
  font-size:clamp(23px,3vw,38px)!important;
  line-height:1.2!important;
  text-align:center!important;
}
.duduq-smart-ts-slot{
  min-height:54px!important;
  border-radius:16px!important;
}
.duduq-smart-ts-bank-wrap{
  display:grid!important;
  gap:10px!important;
  margin:0!important;
}
.duduq-smart-ts-bank{
  width:100%!important;
  min-height:68px!important;
  gap:clamp(10px,1.3vw,14px)!important;
  align-items:center!important;
  justify-content:center!important;
}
.duduq-smart-ts-token,
.duduq-smart-ts-choice{
  min-height:54px!important;
  padding:9px 16px!important;
  border:2px solid #A9D2EE!important;
  border-radius:18px!important;
  background:linear-gradient(180deg,#FFFFFF 0%,#F7FBFF 100%)!important;
  color:#16375B!important;
  box-shadow:0 4px 0 #B4CADB,0 9px 16px rgba(55,99,140,.10),inset 0 1px 0 #fff!important;
  font-family:Fredoka,Nunito,ui-rounded,system-ui,sans-serif!important;
  font-size:clamp(17px,2vw,23px)!important;
  font-weight:900!important;
  line-height:1.1!important;
}
.duduq-smart-ts-choice-grid{
  grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr))!important;
  gap:12px!important;
}
.duduq-smart-ts-actions{
  min-height:72px!important;
  display:flex!important;
  flex-wrap:wrap!important;
  align-items:center!important;
  justify-content:center!important;
  gap:18px!important;
  margin-top:12px!important;
  padding:10px 0 18px!important;
  transform:none!important;
  overflow:visible!important;
}
.duduq-smart-ts-clear{
  min-width:132px!important;
  min-height:56px!important;
  padding:0 24px!important;
  border:2px solid #A9D2EE!important;
  border-radius:18px!important;
  background:#fff!important;
  color:#526D84!important;
  box-shadow:0 4px 0 #B4CADB,0 8px 14px rgba(55,99,140,.08),inset 0 1px 0 #fff!important;
  font-family:Fredoka,Nunito,ui-rounded,system-ui,sans-serif!important;
  font-size:17px!important;
  font-weight:900!important;
  line-height:1!important;
  text-transform:uppercase!important;
}
/* CONFIRMAR keeps the previously approved Matching visual-parity skin. */
.duduq-smart-ts-confirm{
  flex:0 1 220px!important;
  max-width:100%!important;
}
.duduq-smart-ts-hint-card{
  width:min(760px,100%)!important;
  margin:0!important;
}
@media(max-width:720px){
  .duduq-smart-ts-stage{
    --y3-smart-standard-gap:8px;
    padding-top:4px!important;
    padding-bottom:18px!important;
  }
  .duduq-smart-ts-image{width:clamp(82px,19vw,104px)!important;height:clamp(82px,19vw,104px)!important;}
  .duduq-smart-ts-workspace{min-height:96px!important;padding:10px 9px!important;border-radius:20px!important;}
  .duduq-smart-ts-template{font-size:clamp(20px,6vw,30px)!important;}
  .duduq-smart-ts-bank{min-height:62px!important;gap:9px!important;}
  .duduq-smart-ts-token,.duduq-smart-ts-choice{min-height:48px!important;padding:7px 12px!important;font-size:clamp(16px,4.5vw,19px)!important;}
  .duduq-smart-ts-actions{min-height:64px!important;gap:12px!important;margin-top:8px!important;padding:8px 0 14px!important;}
  .duduq-smart-ts-clear{min-width:118px!important;min-height:50px!important;padding-inline:18px!important;font-size:16px!important;}
  .duduq-smart-ts-confirm{flex-basis:190px!important;}
}
@media(max-width:420px){
  .duduq-smart-ts-stage{--y3-smart-standard-gap:7px;}
  .duduq-smart-ts-image{width:82px!important;height:82px!important;}
  .duduq-smart-ts-workspace{min-height:90px!important;padding:8px 7px!important;border-radius:18px!important;}
  .duduq-smart-ts-bank{gap:8px!important;}
  .duduq-smart-ts-token,.duduq-smart-ts-choice{min-height:46px!important;padding:7px 10px!important;font-size:clamp(15px,4.8vw,18px)!important;}
  .duduq-smart-ts-actions{width:100%!important;display:grid!important;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr)!important;gap:10px!important;}
  .duduq-smart-ts-clear,.duduq-smart-ts-confirm{width:100%!important;min-width:0!important;max-width:none!important;}
  .duduq-smart-ts-clear{min-height:48px!important;font-size:15px!important;}
}
@media(min-width:900px) and (max-height:650px){
  .duduq-smart-ts-stage{--y3-smart-standard-gap:6px;padding-top:2px!important;padding-bottom:12px!important;}
  .duduq-smart-ts-image{width:82px!important;height:82px!important;}
  .duduq-smart-ts-workspace{min-height:86px!important;padding:8px 10px!important;}
  .duduq-smart-ts-bank{min-height:56px!important;gap:8px!important;}
  .duduq-smart-ts-token,.duduq-smart-ts-choice{min-height:46px!important;padding:6px 11px!important;font-size:17px!important;}
  .duduq-smart-ts-actions{min-height:58px!important;margin-top:4px!important;padding:5px 0 10px!important;gap:14px!important;}
  .duduq-smart-ts-clear{min-height:50px!important;}
}
`;

  function inject(frame){
    try{
      const doc=frame&&frame.contentDocument;
      if(!doc||!doc.head)return false;
      doc.documentElement.dataset.duduqY3SmartStandard=GOLDEN_REFERENCE;
      const existing=doc.getElementById(STYLE_ID);
      if(existing)return true;
      const style=doc.createElement("style");
      style.id=STYLE_ID;
      style.dataset.reference=GOLDEN_REFERENCE;
      style.dataset.version=VERSION;
      style.textContent=CSS;
      doc.head.appendChild(style);
      return true;
    }catch(_){return false;}
  }

  function prepareFrame(frame){
    if(!frame)return;
    if(!frame.__duduqY3SmartStandardLoadBound){
      frame.__duduqY3SmartStandardLoadBound=true;
      frame.addEventListener("load",()=>{inject(frame);setTimeout(()=>inject(frame),40);},{passive:true});
    }
    inject(frame);
  }

  function scan(){
    if(!root||!root.document)return;
    root.document.querySelectorAll(FRAME_SELECTOR).forEach(prepareFrame);
  }

  function install(){
    if(!root||!root.document)return false;
    scan();
    if(!root.__DUDUQ_Y3_SMART_STANDARD_OBSERVER__){
      const observer=new MutationObserver(scan);
      observer.observe(root.document.documentElement,{subtree:true,childList:true});
      root.__DUDUQ_Y3_SMART_STANDARD_OBSERVER__=observer;
    }
    root.DUDUQ_Y3_SMART_STANDARD=Object.freeze({
      version:VERSION,
      goldenReference:GOLDEN_REFERENCE,
      styleId:STYLE_ID,
      scope:"year-3-smart-sentence-visual-only"
    });
    return true;
  }

  install();
})(typeof globalThis!=="undefined"?globalThis:this);
