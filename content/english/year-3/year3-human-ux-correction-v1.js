/* DUDUQ English Year 3 — final focal human-acceptance UX correction.
   Scope ONLY:
   A) Smart Sentence supportive visual audit/application.
   B) M02 EN3-M2-01..07 Target Shooter direct-shoot presentation.
   Source files, answer IDs, mechanic distribution, shared releases, Core and Host stay unchanged.
*/
(function(root){
  "use strict";

  const original=root?.DuduQYear3Factory;
  if(!original||original.__humanUxCorrectionWrapped)return;

  const VERSION="1.0.0-human-ux-final-focal";
  const SMART_IDS=new Set([
    "EN3-M1-01","EN3-M1-02","EN3-M1-03","EN3-M1-04","EN3-M1-10","EN3-M1-11","EN3-M1-13","EN3-M1-14","EN3-M1-15",
    "EN3-M2-08","EN3-M2-09","EN3-M2-10","EN3-M2-14",
    "EN3-M3-05","EN3-M3-06","EN3-M3-07","EN3-M3-09","EN3-M3-14",
    "EN3-M4-06","EN3-M4-07","EN3-M4-08","EN3-M4-13","EN3-M4-14",
    "EN3-M5-06","EN3-M5-08","EN3-M5-09","EN3-M5-11","EN3-M5-13","EN3-M5-15",
    "EN3-M6-06","EN3-M6-07","EN3-M6-08","EN3-M6-13","EN3-M6-14","EN3-M6-15"
  ]);
  const DIRECT_TARGET_IDS=new Set(["EN3-M2-01","EN3-M2-02","EN3-M2-03","EN3-M2-04","EN3-M2-05","EN3-M2-06","EN3-M2-07"]);
  const SMALL=Object.freeze({zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19});
  const TENS=Object.freeze({twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90});

  function text(v,f=""){const s=String(v??"").trim();return s||f}
  function moduleTag(n){return `module${String(n||0).padStart(2,"0")}`}
  function canonical(query){
    const q=text(query);
    if(!q)return null;
    const found=root.DuduQAssets?.resolveImageDetails?.(q)||null;
    return found?.url?{query:q,key:text(found.key,q),url:found.url}:null;
  }
  function speechAudio(value){
    const spoken=text(value);
    return spoken?{enabled:true,text:spoken,spokenText:spoken,language:"en-US",speechLocale:"en-US",repeatable:true,fallback:"speech-synthesis"}:null;
  }
  function englishNumber(value){
    const raw=text(value).toLowerCase().replace(/[^a-z0-9-]+/g," ").trim();
    if(/^\d+$/.test(raw))return Number(raw);
    const tokens=raw.split(/[\s-]+/).filter(Boolean);
    if(tokens.length===1){if(Object.hasOwn(SMALL,tokens[0]))return SMALL[tokens[0]];if(Object.hasOwn(TENS,tokens[0]))return TENS[tokens[0]];}
    if(tokens.length===2&&Object.hasOwn(TENS,tokens[0])&&Object.hasOwn(SMALL,tokens[1]))return TENS[tokens[0]]+SMALL[tokens[1]];
    return null;
  }

  function smartCurrentVisual(ss){
    if(ss?.image?.src)return {kind:"canonical",value:ss.image.src};
    if(ss?.placeholderVisual)return {kind:"placeholder",value:ss.placeholderVisual.value||""};
    return null;
  }

  function applySmartVisual(source,q){
    if(q?.delivery?.mechanic!=="smart-sentence"||!q.metadata?.smartSentence)return null;
    const visualQuery=text(source?.visualQuery);
    const eligible=SMART_IDS.has(q.id)&&Boolean(visualQuery);
    const ss=q.metadata.smartSentence;
    const before=smartCurrentVisual(ss);
    let current=before;
    let decision=eligible?"ASSET_PENDING":"NOT_APPROPRIATE";
    let reason=eligible?"Source visualQuery is an intentional pedagogical context/scaffold; it may support audio→image/context→word/frase without changing the scored answer.":"No approved supportive-visual policy for this Smart Sentence.";

    if(eligible&&before?.kind==="canonical")decision="KEEP";
    else if(eligible&&before?.kind==="placeholder"){
      decision="ASSET_PENDING";
      reason="Existing TEMP_VISUAL_PLACEHOLDER is preserved; canonical supportive visual remains pending and no new placeholder is created.";
    }else if(eligible){
      const found=canonical(visualQuery);
      if(found){
        const alt=`Apoio visual contextual: ${visualQuery}`;
        ss.image={src:found.url,assetKey:found.key,alt};
        ss.imageAlt=alt;
        q.metadata.imageRequirement={required:true,concept:visualQuery,canonicalStatus:"CANONICAL_ASSET_OK",resolvedKey:found.key,supportiveOnly:true,scoredEvidence:false};
        current={kind:"canonical",value:found.url};
        decision="APPLY";
      }
    }

    const applied=Boolean(current?.kind==="canonical");
    ss.supportiveVisual=applied;
    ss.scoredEvidence=false;
    q.metadata.supportiveVisual=applied;
    q.metadata.scoredEvidence=false;
    const audit=Object.freeze({
      id:q.id,module:q.module,currentVisual:before?"YES":"NO",visualQuery:visualQuery||"none",eligible:eligible?"YES":"NO",
      decision,reason,answerLeakage:"SAFE",supportiveVisual:applied,scoredEvidence:false,
      visualStatus:current?.kind==="canonical"?"CANONICAL_ASSET_OK":current?.kind==="placeholder"?"TEMP_VISUAL_PLACEHOLDER":"VISUAL_ASSET_PENDING"
    });
    q.metadata.smartVisualAudit=audit;
    return audit;
  }

  function applyDirectTarget(source,q){
    if(!DIRECT_TARGET_IDS.has(q?.id)||q?.delivery?.mechanic!=="target-shooter"||!q.metadata?.targetShooter)return null;
    const sourceAlternatives=Array.isArray(source?.alternatives)?source.alternatives:[];
    const correctId=text(source?.answer?.id);
    const correct=sourceAlternatives.find(a=>text(a.id)===correctId);
    if(!correct)throw new Error(`[DuduQ Y3 Human UX] ${q.id}: source correct alternative missing.`);
    const sourceSpoken=text(correct.audioText,correct.text);
    const existingById=new Map((q.metadata.targetShooter.items||[]).map(item=>[text(item.id),item]));
    const items=sourceAlternatives.map(a=>{
      const numeral=englishNumber(text(a.text));
      if(numeral===null)throw new Error(`[DuduQ Y3 Human UX] ${q.id}: cannot convert ${a.text} to numeral.`);
      const prior=existingById.get(text(a.id))||{};
      return {...prior,id:a.id,label:String(numeral),alt:`Numeral ${numeral}`,spokenText:"",speechLocale:"en-US",audioDescription:""};
    });

    q.metadata.targetShooter={
      ...q.metadata.targetShooter,
      audioText:sourceSpoken,
      promptVisual:"",
      promptVisualMedia:null,
      mode:"audio-to-choice",
      shape:"balloon",
      correctIds:[correctId],
      items
    };
    q.alternatives=sourceAlternatives.map(a=>{
      const numeral=englishNumber(text(a.text));
      return {id:a.id,text:String(numeral),audioText:"",metadata:{sourceText:text(a.text),speechText:"",speechLanguage:"en-US"}};
    });
    q.media={audio:speechAudio(sourceSpoken)};
    q.statement="Ouça e escolha.";
    q.instruction="Ouça e escolha.";
    q.metadata.studentInstruction="Ouça e escolha.";
    q.metadata.sourceAlternatives=sourceAlternatives.map(a=>text(a.text));
    q.metadata.sourceAnswer=correctId;
    q.metadata.technicalContract=q.metadata.technicalContract||{};
    delete q.metadata.technicalContract.optionAudio;
    delete q.metadata.technicalContract.stimulusVisual;
    delete q.metadata.technicalContract.resolvedGate;
    q.metadata.technicalContract.humanUxResolution="TARGET_1_0_23_EXISTING_DIRECT_SHOOT_CAPABILITY";
    const audit=Object.freeze({
      id:q.id,module:q.module,sourceDirection:"numeral-to-audio",previousRuntimeMode:"visual-to-audio",
      directShootEligible:true,decision:"DIRECT_SHOOT",justification:"Audio inglês como estímulo e numeral visual no balão preservam habilidade e source answer ID while restoring official direct-shoot interaction.",
      runtimeAdapterMode:"audio-to-choice",runtimePresentationMode:"audio-to-visual-direct-shoot",audioText:sourceSpoken,
      balloonLabels:items.map(item=>item.label),sourceAnswerId:correctId,sourceAlternatives:sourceAlternatives.map(a=>text(a.text)),confirmRequired:false
    });
    q.metadata.targetDirectShootAudit=audit;
    q.metadata.humanUxDirectShoot=true;
    return audit;
  }

  function apply(spec,built){
    const sourceById=new Map((spec?.items||[]).map(item=>[item.id,item]));
    const smart=[];
    const target=[];
    for(const activity of built?.activities||[]){
      const q=activity?.questions?.[0];
      if(!q)continue;
      const source=sourceById.get(q.id);
      if(!source)throw new Error(`[DuduQ Y3 Human UX] source missing: ${q.id}`);
      const s=applySmartVisual(source,q);if(s)smart.push(s);
      const t=applyDirectTarget(source,q);if(t)target.push(t);
    }
    root.DUDUQ_Y3_HUMAN_UX_AUDIT=root.DUDUQ_Y3_HUMAN_UX_AUDIT||{};
    root.DUDUQ_Y3_HUMAN_UX_AUDIT[moduleTag(built?.module)]=Object.freeze({
      version:VERSION,module:built?.module,smart:Object.freeze(smart),target:Object.freeze(target)
    });
    return built;
  }

  root.DuduQYear3Factory=Object.freeze({
    ...original,
    version:`${original.version}+human-ux-final`,
    __humanUxCorrectionWrapped:true,
    humanUxCorrectionVersion:VERSION,
    publish(spec){return apply(spec,original.publish(spec));}
  });
})(typeof globalThis!=="undefined"?globalThis:this);
