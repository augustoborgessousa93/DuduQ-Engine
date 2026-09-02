import { chromium } from "playwright";

const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
const MECHANICS=["drag-drop","target-shooter","matching","bubble-pop","word-slash","memory-quest","smart-sentence"];
const assert=(c,m)=>{if(!c)throw new Error(m)};

function emptyCount(){return Object.fromEntries(MECHANICS.map(m=>[m,0]));}
function mergeCount(dst,src){for(const m of MECHANICS)dst[m]=(dst[m]||0)+(src[m]||0);return dst;}

const browser=await chromium.launch({headless:true});
const rows=[];
const totals=emptyCount();
const years={};
try{
  for(let year=1;year<=5;year++){
    years[year]=emptyCount();
    for(let module=1;module<=6;module++){
      const page=await browser.newPage({viewport:{width:1366,height:768}});
      const pageErrors=[];const critical404=[];
      page.on("pageerror",e=>pageErrors.push(String(e?.message||e)));
      page.on("response",r=>{if(r.status()===404){const u=r.url();if(u.includes("/engine/")||u.includes(`/content/english/year-${year}/`))critical404.push(u)}});
      try{
        const mm=String(module).padStart(2,"0");
        const response=await page.goto(`${BASE}/content/english/year-${year}/module-${mm}/?qa=mechanic-inventory`,{waitUntil:"domcontentloaded",timeout:35000});
        assert(response?.ok(),`Y${year} M${mm}: HTTP ${response?.status()}`);
        await page.waitForFunction(()=>window.DUDUQ_ENGINE_READY===true,null,{timeout:35000});
        const data=await page.evaluate(({year,module,mechanics})=>{
          function findModule(root,seen=new Set()){
            if(!root||typeof root!=="object"||seen.has(root))return null;seen.add(root);
            if(Array.isArray(root.activities)&&Number(root.year)===year&&Number(root.module)===module)return root;
            for(const value of Object.values(root)){const found=findModule(value,seen);if(found)return found;}
            return null;
          }
          const mod=findModule(window.DUDUQ_CONTENT||{});
          if(!mod)return {missing:true};
          const counts=Object.fromEntries(mechanics.map(m=>[m,0]));
          const modalities={audio:0,image:0,reading:0,sequence:0,pairs:0,single:0,classification:0,capacityGt1:0};
          const mismatches=[];const unknown=[];const details=[];
          for(const activity of mod.activities||[]){
            for(const q of activity.questions||[]){
              const mechanic=String(activity.mechanic||q?.delivery?.mechanic||q?.renderer||"").toLowerCase().replace(/_/g,"-");
              if(mechanics.includes(mechanic))counts[mechanic]++;else unknown.push({id:q?.id||"",mechanic});
              const qMechanic=String(q?.delivery?.mechanic||q?.renderer||mechanic).toLowerCase().replace(/_/g,"-");
              if(activity.mechanic&&qMechanic&&String(activity.mechanic).toLowerCase().replace(/_/g,"-")!==qMechanic)mismatches.push({id:q?.id||"",activity:activity.mechanic,question:qMechanic});
              const payload=q?.payload||{};const targets=[...(payload.targets||[]),...(q?.metadata?.targets||[])];
              const items=[...(payload.items||[]),...(q?.alternatives||[])];
              if(q?.audio?.enabled||q?.audio?.text||q?.audio?.src||q?.metadata?.instructionAudio?.enabled||items.some(i=>i?.audio?.enabled||i?.spokenText||i?.audioDescription))modalities.audio++;
              if(q?.image?.enabled||q?.image?.src||q?.media?.image?.src||items.some(i=>i?.image?.src||i?.imageUrl||i?.imageAsset||i?.imageAssetKey)||targets.some(t=>t?.image?.src||t?.imageUrl||t?.imageAsset||t?.imageAssetKey||t?.imageSrc))modalities.image++;
              const answerType=String(q?.answer?.type||"").toLowerCase();
              const strategy=String(payload.strategy||"").toLowerCase();const mode=String(payload.mode||"").toLowerCase();
              if(answerType==="sequence"||strategy==="sequence"||q?.metadata?.layout==="sequence")modalities.sequence++;
              if(answerType==="pairs")modalities.pairs++;
              if(answerType==="single"||mode==="single-choice")modalities.single++;
              if(strategy==="classification"||mode==="classification")modalities.classification++;
              if(targets.some(t=>Number(t?.capacity||1)>1))modalities.capacityGt1++;
              if(q?.metadata?.readingEssential===true||q?.metadata?.functionalReading===true||q?.metadata?.contextualReading===true||q?.pedagogyPolicy?.readingDefault)modalities.reading++;
              details.push({id:q?.id||"",mechanic,answerType,mode,strategy});
            }
          }
          return {missing:false,title:mod.title||"",version:mod.version||"",activities:(mod.activities||[]).length,questions:details.length,counts,modalities,mismatches,unknown,manifest:{revision:window.DUDUQ_ENGINE_MANIFEST?.revision||null,core:window.DUDUQ_ENGINE_MANIFEST?.core?.release||null},details};
        },{year,module,mechanics:MECHANICS});
        assert(!data.missing,`Y${year} M${mm}: conteúdo não encontrado`);
        mergeCount(totals,data.counts);mergeCount(years[year],data.counts);
        rows.push({year,module,title:data.title,version:data.version,activities:data.activities,questions:data.questions,mechanics:data.counts,modalities:data.modalities,mismatches:data.mismatches,unknown:data.unknown,pageErrors,critical404,revision:data.manifest.revision,core:data.manifest.core});
      }finally{await page.close();}
    }
  }
}finally{await browser.close();}

const ranked=Object.entries(totals).sort((a,b)=>b[1]-a[1]);
const problems=rows.flatMap(r=>[
  ...r.pageErrors.map(v=>({year:r.year,module:r.module,type:"pageError",detail:v})),
  ...r.critical404.map(v=>({year:r.year,module:r.module,type:"critical404",detail:v})),
  ...r.mismatches.map(v=>({year:r.year,module:r.module,type:"mechanicMismatch",detail:v})),
  ...r.unknown.map(v=>({year:r.year,module:r.module,type:"unknownMechanic",detail:v}))
]);
console.log(JSON.stringify({status:problems.length?"REVIEW":"PASS",modules:rows.length,totalItems:rows.reduce((n,r)=>n+r.questions,0),totals,ranked,years,problems,rows},null,2));
assert(rows.length===30,`esperados 30 módulos, obtidos ${rows.length}`);
