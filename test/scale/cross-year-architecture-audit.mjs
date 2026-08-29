import fs from "node:fs";
import path from "node:path";

function assert(condition,message){if(!condition)throw new Error(message);}
function read(file){return fs.readFileSync(file,"utf8");}
function exists(file){return fs.existsSync(file);}
function walk(dir){
  if(!exists(dir))return [];
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...walk(full));
    else out.push(full.replaceAll("\\","/"));
  }
  return out;
}
function channelOf(index){
  const match=index.match(/channel\s*:\s*["']([^"']+)["']/);
  return match?.[1]||"manual";
}
function mechanicsFrom(source){
  const known=["target-shooter","matching","drag-drop","bubble-pop","smart-sentence","memory-quest","word-slash"];
  return known.filter(id=>source.includes(id));
}

const root="content/english";
const patchName=/(hotfix|bridge|patch|layout|polish|compact|renderer|compat|autoplay|guard|balance|typography|instructions|gate)/i;
const report={
  status:"BASELINE",
  intent:"cross-year shared-mechanics migration readiness",
  years:{},
  global:{modules:0,indexes:0,localStructuralCandidates:0},
  invariants:{scalePromotionDisabled:false}
};

for(let year=1;year<=5;year+=1){
  const yearDir=`${root}/year-${year}`;
  assert(exists(yearDir),`Year ${year}: diretório ausente.`);
  const files=walk(yearDir);
  const moduleReport=[];
  const candidateFiles=files.filter(file=>file.endsWith(".js")&&patchName.test(path.basename(file)));

  for(let moduleNumber=1;moduleNumber<=6;moduleNumber+=1){
    const mm=String(moduleNumber).padStart(2,"0");
    const moduleDir=`${yearDir}/module-${mm}`;
    const indexPath=`${moduleDir}/index.html`;
    assert(exists(moduleDir),`Year ${year} M${mm}: diretório ausente.`);
    assert(exists(indexPath),`Year ${year} M${mm}: index.html ausente.`);
    const index=read(indexPath);
    const moduleFiles=walk(moduleDir);
    const jsSource=moduleFiles.filter(file=>file.endsWith(".js")).map(read).join("\n");
    const channel=channelOf(index);
    const directCore=/\.\.\/\.\.\/\.\.\/\.\.\/core\/duduq-|\/core\/duduq-/i.test(index);
    const universalLoader=/engine\/duduq-loader-v1\.js/i.test(index);
    const universalPlayer=/engine\/duduq-player-v1\.js/i.test(index);
    const inlineHostBootstrap=/DuduQ\.start\s*\(\s*\{/m.test(index);
    const sharedAliases=/scale-smart-visual-aliases-v1\.js/.test(index);
    const sharedCompat=/scale-content-compat-v1\.js/.test(index);
    const localCandidates=moduleFiles.filter(file=>file.endsWith(".js")&&patchName.test(path.basename(file))).map(file=>path.basename(file));
    const mechanics=Array.from(new Set([...mechanicsFrom(index),...mechanicsFrom(jsSource)]));

    moduleReport.push({
      module:moduleNumber,
      channel,
      directCore,
      universalPlayer,
      universalLoader,
      inlineHostBootstrap,
      sharedAliases,
      sharedCompat,
      mechanics,
      jsFiles:moduleFiles.filter(file=>file.endsWith(".js")).length,
      localStructuralCandidates:localCandidates
    });
    report.global.modules+=1;
    report.global.indexes+=1;
  }

  const channels=Array.from(new Set(moduleReport.map(item=>item.channel)));
  const directCoreModules=moduleReport.filter(item=>item.directCore).map(item=>item.module);
  const sharedModules=moduleReport.filter(item=>item.sharedAliases&&item.sharedCompat).map(item=>item.module);
  report.years[year]={
    modules:6,
    channels,
    directCoreModules,
    sharedModules,
    localStructuralCandidateCount:candidateFiles.length,
    localStructuralCandidates:candidateFiles.map(file=>file.replace(`${yearDir}/`,"")),
    mechanics:Array.from(new Set(moduleReport.flatMap(item=>item.mechanics))),
    moduleReport
  };
  report.global.localStructuralCandidates+=candidateFiles.length;
}

const scale=JSON.parse(read("engine/channels/scale-v1.json"));
report.invariants.scalePromotionDisabled=scale?.policy?.productionPromotionAllowed===false;
report.invariants.scaleReleasesImmutable=scale?.policy?.releasesImmutable===true;
report.invariants.scaleChannel=scale?.channel||"";
report.invariants.scaleRevision=scale?.revision??null;

assert(report.global.modules===30,"Esperados 30 módulos entre Years 1–5.");
assert(report.global.indexes===30,"Esperados 30 public entries entre Years 1–5.");
assert(report.invariants.scalePromotionDisabled,"scale-v1 não pode promover produção nesta fase.");
for(const year of [3,4,5]){
  const channels=report.years[year].channels;
  assert(channels.length===1&&channels[0]==="scale-v1",`Year ${year}: todos os módulos devem permanecer no scale-v1.`);
  assert(report.years[year].directCoreModules.length===0,`Year ${year}: não deve voltar ao bootstrap manual do Core.`);
}

report.recommendation={
  phase1:"baseline Year1/Year2 public entries before migration",
  phase2:"move reusable local behaviors into shared scale layers",
  phase3:"route Years 1–5 through the same experimental shared channel",
  phase4:"apply mechanic/responsive/audio/smart-image fixes once across all years"
};

console.log(JSON.stringify(report,null,2));
console.log("PASS — arquitetura Years 1–5 inventariada; diferenças legadas são reportadas sem alterar conteúdo/release.");
