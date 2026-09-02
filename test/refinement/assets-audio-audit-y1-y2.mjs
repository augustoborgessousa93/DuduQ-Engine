import { chromium } from "playwright";

const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
const findings=[];const modules=[];const add=(type,year,module,id,detail)=>findings.push({type,year,module,id,detail});const text=v=>String(v??"").trim();
function visit(value,fn,path="root",seen=new Set()){
  if(value==null)return;if(typeof value!=="object"){fn(value,path);return}if(seen.has(value))return;seen.add(value);
  if(Array.isArray(value)){value.forEach((v,i)=>visit(v,fn,`${path}[${i}]`,seen));return}for(const [k,v] of Object.entries(value))visit(v,fn,`${path}.${k}`,seen);
}
function imageEntries(q){
  const out=[];
  function collect(obj,base){
    if(!obj||typeof obj!=="object")return;
    const src=text(obj.src||obj.imageUrl||obj.imageSrc||(typeof obj.image==="string"?obj.image:""));
    const key=text(obj.imageAsset||obj.imageAssetKey);const alt=text(obj.alt||(obj.image&&typeof obj.image==="object"?obj.image.alt:""));
    if(src||key)out.push({base,src,key,alt});
  }
  collect(q?.image,"q.image");collect(q?.media?.image,"q.media.image");
  (q?.alternatives||[]).forEach((x,i)=>collect(x,`alternative[${i}]`));
  (q?.payload?.items||[]).forEach((x,i)=>collect(x,`payload.items[${i}]`));
  (q?.payload?.targets||[]).forEach((x,i)=>collect(x,`payload.targets[${i}]`));
  (q?.metadata?.targets||[]).forEach((x,i)=>collect(x,`metadata.targets[${i}]`));
  (q?.metadata?.targetShooter?.items||[]).forEach((x,i)=>collect(x,`targetShooter.items[${i}]`));
  return out;
}
function audioEntries(q){
  const out=[];const put=(obj,base,role)=>{if(!obj||typeof obj!=="object")return;const src=text(obj.src),spoken=text(obj.spokenText||obj.text),lang=text(obj.speechLocale||obj.language);if(src||spoken)out.push({base,role,src,spoken,lang})};
  put(q?.audio,"q.audio","content");put(q?.metadata?.stimulusAudio,"metadata.stimulusAudio","content");put(q?.metadata?.instructionAudio,"metadata.instructionAudio","instruction");put(q?.metadata?.instructionAudioFallback,"metadata.instructionAudioFallback","instruction");
  if(text(q?.metadata?.targetShooter?.audioText))out.push({base:"targetShooter.audioText",role:"content",src:"",spoken:text(q.metadata.targetShooter.audioText),lang:"en-US"});
  (q?.alternatives||[]).forEach((x,i)=>{put(x?.audio,`alternative[${i}].audio`,"content");if(text(x?.spokenText))out.push({base:`alternative[${i}]`,role:"content",src:"",spoken:text(x.spokenText),lang:text(x.speechLocale)})});
  (q?.payload?.items||[]).forEach((x,i)=>{put(x?.audio,`payload.items[${i}].audio`,"content");if(text(x?.spokenText))out.push({base:`payload.items[${i}]`,role:"content",src:"",spoken:text(x.spokenText),lang:text(x.speechLocale)})});
  (q?.payload?.targets||[]).forEach((x,i)=>{put(x?.audio,`payload.targets[${i}].audio`,"content");if(text(x?.spokenText))out.push({base:`payload.targets[${i}]`,role:"content",src:"",spoken:text(x.spokenText),lang:text(x.speechLocale)})});
  return out;
}
function hasVisual(q){return imageEntries(q).length>0||Boolean(q?.metadata?.visualResolution||q?.metadata?.visualStatus||q?.metadata?.visualComposition||q?.metadata?.m03VisualComposition)}

const browser=await chromium.launch({headless:true});
try{
  for(let year=1;year<=2;year++)for(let module=1;module<=6;module++){
    const page=await browser.newPage({viewport:{width:1366,height:768}});const pageErrors=[];const critical404=[];
    page.on("pageerror",e=>pageErrors.push(String(e?.message||e)));
    page.on("response",r=>{if(r.status()===404){const u=r.url();if(u.includes("/engine/")||u.includes(`/content/english/year-${year}/`))critical404.push(u)}});
    try{
      const mm=String(module).padStart(2,"0");const res=await page.goto(`${BASE}/content/english/year-${year}/module-${mm}/?qa=assets-audio-audit`,{waitUntil:"domcontentloaded",timeout:35000});if(!res?.ok()){add("critical404",year,module,"MODULE",`HTTP ${res?.status()}`);continue}
      await page.waitForFunction(()=>window.DUDUQ_ENGINE_READY===true,null,{timeout:35000});
      const mod=await page.evaluate(({year,module})=>{function walk(v,seen=new Set()){if(!v||typeof v!=="object"||seen.has(v))return null;seen.add(v);if(Array.isArray(v.activities)&&Number(v.year)===year&&Number(v.module)===module)return v;for(const child of Object.values(v)){const f=walk(child,seen);if(f)return f}return null}return walk(window.DUDUQ_CONTENT||{})},{year,module});if(!mod){add("brokenAsset",year,module,"MODULE","conteúdo não localizado");continue}
      const qs=[];for(const a of mod.activities||[])for(const q of a.questions||[])qs.push(q);modules.push({year,module,title:mod.title||"",items:qs.length});
      for(const q of qs){
        const id=text(q?.id)||"UNKNOWN";const media=text(q?.metadata?.sourceMedia).toLowerCase();const images=imageEntries(q),audios=audioEntries(q);
        for(const im of images){
          if(/^data:image/i.test(im.src))add("wrongAsset",year,module,id,`${im.base}: data:image não permitido como asset final`);
          if(/^data:image\/svg\+xml/i.test(im.src))add("wrongAsset",year,module,id,`${im.base}: SVG procedural/data URI`);
          if(im.src&&!im.alt)add("wrongAsset",year,module,id,`${im.base}: imagem sem alt`);
          if(/^https?:\/\/raw\.githubusercontent\.com\/augustoborgessousa93\/Assets-DuduQ\/main\//i.test(im.src))add("assetGovernance",year,module,id,`${im.base}: asset aponta para main não pinado`);
        }
        if(/imagem|image/.test(media)&&/(obrigat|required)/.test(media)&&!hasVisual(q))add("brokenAsset",year,module,id,"imagem obrigatória ausente");
        if(/áudio|audio/.test(media)&&/(obrigat|required)/.test(media)&&audios.filter(a=>a.role==="content").length===0)add("missingAudio",year,module,id,"áudio obrigatório sem src/spokenText/TTS text");
        for(const a of audios){
          if(a.role==="content"&&a.lang&&a.lang.toLowerCase()!=="en-us")add("wrongAudio",year,module,id,`${a.base}: locale=${a.lang}; esperado en-US`);
          if(a.role==="instruction"&&a.lang&&a.lang.toLowerCase()!=="pt-br")add("wrongAudio",year,module,id,`${a.base}: locale=${a.lang}; esperado pt-BR`);
        }
        const instr=q?.metadata?.instructionAudio||q?.metadata?.instructionAudioFallback;if(!instr)add("missingAudio",year,module,id,"instrução essencial sem áudio/fallback pt-BR explícito");
        const strings=[];visit(q,(v,p)=>{if(typeof v==="string")strings.push({v,p})});
        for(const s of strings){if(/^blob:/i.test(s.v))add("wrongAsset",year,module,id,`${s.p}: blob URL não persistente`)}
      }
      for(const e of pageErrors)add("pageError",year,module,"MODULE",e);for(const u of critical404)add("critical404",year,module,"MODULE",u);
    }finally{await page.close()}
  }
}finally{await browser.close()}

const counts=Object.fromEntries(["brokenAsset","wrongAsset","assetGovernance","missingAudio","wrongAudio","critical404","pageError"].map(t=>[t,findings.filter(f=>f.type===t).length]));
console.log(JSON.stringify({status:"AUDIT_COMPLETE",modules:modules.length,items:modules.reduce((n,m)=>n+m.items,0),counts,findings,modules},null,2));if(modules.length!==12)throw new Error(`audit incompleto ${modules.length}/12`);
