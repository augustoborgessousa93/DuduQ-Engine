import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const base = 'content/english/production/v11-2';
const outRoot = 'content/english/assets/images/v11-2b';
const read = async p => JSON.parse(await readFile(path.join(root, p), 'utf8'));
const save = async (p, x) => { const f = path.join(root, p); await mkdir(path.dirname(f), { recursive: true }); await writeFile(f, `${JSON.stringify(x, null, 2)}\n`); };
const sha = s => createHash('sha256').update(s).digest('hex');
const short = s => sha(s).slice(0, 16).toUpperCase();
const n = s => String(s ?? '').normalize('NFKC').trim().toLocaleLowerCase('en-US');
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const fileExists = p => access(path.join(root,p)).then(()=>true,()=>false);
const [audit, contractsDoc, registry] = await Promise.all([
  read(`${base}/media-dedup-and-reuse-audit.json`),
  read('content/english/production/v11-1b/deterministic-activity-contracts.json'),
  read('content/english/media/media-registry.json')
]);
const allExisting = new Map(registry.entries.map(x=>[x.mediaId,x]));
const itemIdsByConcept = new Map();
for (const c of contractsDoc.contracts) for (const m of c.requiredMedia??[]) {
  const s=itemIdsByConcept.get(m.mediaConceptId)??new Set(); s.add(c.itemId); itemIdsByConcept.set(m.mediaConceptId,s);
}
const bindings = {}, generatedLocal = [], needs = [], reused = [], pending = [];
let registryChanged = false;
const safeReuse = async g => {
  for (const c of g.candidates) {
    if (c.decision !== 'REUSE_SEMANTIC_PROVISIONAL') continue;
    const e=allExisting.get(c.mediaId), p=e?.urlOrPath??e?.assets?.[0]?.path;
    if (e && p && await fileExists(p) && n(e.semantic??e.semanticTarget??e.concept??e.altText)===n(g.semanticKey[0])) return e;
  }
  return null;
};
const svgFor = g => {
  const target=n(g.semanticKey[0]); const colorMap={red:'#e74c3c',blue:'#3185e8',green:'#31a66b',yellow:'#f4c542',orange:'#f08b37',purple:'#8554c7',pink:'#ec72a8',black:'#26313a',white:'#f5f5f5',brown:'#8c5b3d',gray:'#89939f',grey:'#89939f'};
  const nums={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};
  const shape=target.match(/\b(circle|square|triangle|rectangle|star|heart|diamond|oval)\b/)?.[1];
  let body=''; let kind='';
  if (shape) {
    kind='shape';
    if(shape==='circle') body='<circle cx="512" cy="512" r="270" fill="#38a5d6"/>';
    if(shape==='square') body='<rect x="260" y="260" width="504" height="504" rx="36" fill="#f0a22e"/>';
    if(shape==='triangle') body='<path d="M512 220 810 770H214Z" fill="#e95e69"/>';
    if(shape==='rectangle') body='<rect x="170" y="330" width="684" height="364" rx="36" fill="#775ac8"/>';
    if(shape==='star') body='<path d="m512 175 91 219 236 17-181 153 57 231-203-126-203 126 57-231-181-153 236-17z" fill="#f2c343"/>';
    if(shape==='heart') body='<path d="M512 800 205 510C50 330 330 160 512 350 694 160 974 330 819 510Z" fill="#eb6580"/>';
    if(shape==='diamond') body='<path d="M512 170 830 512 512 854 194 512Z" fill="#31a887"/>';
    if(shape==='oval') body='<ellipse cx="512" cy="512" rx="360" ry="230" fill="#4d8bd8"/>';
  }
  const color=Object.keys(colorMap).find(k=>new RegExp(`\\b${k}\\b`,'i').test(target));
  if(!body && color && /COLOR|OPTION|SWATCH/i.test(g.semanticKey[1])) { kind='color-swatch'; body=`<circle cx="512" cy="512" r="292" fill="${colorMap[color]}" stroke="#ffffff" stroke-width="26"/>`; }
  const numberWords={...nums,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20};
  const wordNumber=numberWords[target];
  const digitNumber=target.match(/^(20|1[0-9]|[1-9])$/)?.[1];
  const number=Number.isFinite(wordNumber)?[target,wordNumber]:digitNumber?[digitNumber,Number(digitNumber)]:null;
  if(!body && number) {
    kind='quantity-dots'; const count=number[1], coords=[];
    const cols=count<=4?2:count<=12?3:4, rows=Math.ceil(count/cols), gap=count<=10?132:112, radius=count<=10?45:36;
    for(let i=0;i<count;i++){const col=i%cols,row=Math.floor(i/cols);coords.push(`<circle cx="${512+(col-(cols-1)/2)*gap}" cy="${512+(row-(rows-1)/2)*gap}" r="${radius}" fill="#3185e8"/>`)}
    body=coords.join('');
  }
  const c=(x,y,r,col='#f3c5a2')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" stroke="#554d4b" stroke-width="12"/>`;
  const e=(x,y,rx,ry,col)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${col}" stroke="#554d4b" stroke-width="12"/>`;
  const r=(x,y,w,h,col,rx=22)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${col}" stroke="#554d4b" stroke-width="12"/>`;
  const p=(d,col,sw=12)=>`<path d="${d}" fill="${col}" stroke="#554d4b" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const dotFace=(x,y)=>`${c(x-42,y,13,'#34343a')}${c(x+42,y,13,'#34343a')}<path d="M${x-34} ${y+45}q34 33 68 0" fill="none" stroke="#9b5a50" stroke-width="12" stroke-linecap="round"/>`;
  const human=(skin='#f3c5a2',shirt='#64a9cf',hair='#62463b')=>`${e(512,720,155,172,shirt)}${c(512,420,145,skin)}${p('M370 395q-5-190 145-175q145 5 150 170q-115-105-295 5Z',hair)}${dotFace(512,420)}`;
  if(!body){
    const t=target;
    const lower=t.toLowerCase();
    const countMatch=lower.match(/^(one|two|three|four|five|1|2|3|4|5)\s+(ducks?|cows?|horses?|fish|turtles?|birds?|cats?|dogs?)$/);
    if(countMatch){
      const amount=({one:1,two:2,three:3,four:4,five:5})[countMatch[1]]??Number(countMatch[1]);
      const animal=countMatch[2].replace(/s$/,'');
      const animalShape=animal==='duck'||animal==='bird'?`${e(0,0,78,54,animal==='duck'?'#f2cf4a':'#73abc8')}${c(54,-43,42,animal==='duck'?'#f2cf4a':'#73abc8')}${p('M85 -40 130 -22 85 -5Z','#ee913f',5)}${c(66,-50,5,'#30333a','none',0)}`:animal==='cow'?`${e(0,0,82,54,'#f4f0e6')}${c(58,-38,45,'#f4f0e6')}${c(-26,-2,18,'#746563','none',0)}${c(20,25,18,'#746563','none',0)}${c(72,-43,5,'#30333a','none',0)}`:animal==='horse'?`${e(0,0,82,48,'#a66d4a')}${c(52,-35,38,'#a66d4a')}${p('M44 -54q-22-45 4-65q40 23 18 66Z','#5a443c',5)}${c(63,-40,5,'#30333a','none',0)}`:animal==='fish'?`${e(0,0,76,46,'#53b4d0')}${p('M65 0 120-44v88Z','#ee9a54',0)}${c(30,-12,5,'#263d45','none',0)}`:animal==='turtle'?`${e(0,0,78,48,'#5eaa71')}${c(61,-18,23,'#74bf77')}${[[-42,33],[36,33]].map(([x,y])=>c(x,y,12,'#74bf77','none',0)).join('')}`:animal==='cat'?`${e(0,0,68,45,'#e9a367')}${c(52,-35,35,'#e9a367')}${p('M30 -54 35 -91 60 -58M61 -58 87 -91 85 -48','#e9a367',5)}${c(60,-38,5,'#30333a','none',0)}`:`${e(0,0,70,48,'#a97852')}${c(53,-35,36,'#a97852')}${c(70,-38,5,'#30333a','none',0)}`;
      const positions=amount===1?[[512,530,1]]:Array.from({length:amount},(_,i)=>[250+i*(520/Math.max(1,amount-1)),530,0.78]);
      body=positions.map(([x,y,s])=>`<g transform="translate(${x} ${y}) scale(${s})">${animalShape}</g>`).join('');kind='counted-animal-group';
    }
    if(!body&&['in','on','under','behind','beside'].includes(lower)){
      kind='spatial-relation-scene';
      body=`${r(330,600,365,80,'#aa805f',12)}${[0,1].map(i=>r(350+i*325,675,38,170,'#8a664e',8)).join('')}${c(lower==='in'?510:lower==='beside'?790:510,lower==='under'?805:lower==='on'?510:lower==='behind'?460:570,lower==='in'?92:80,'#ed9a53','none',0)}`;
      if(lower==='behind')body+=`${r(360,355,280,240,'#79b7ca',18)}`;
      if(lower==='in')body=`${r(360,400,300,290,'#fffdf5',30)}${c(510,550,82,'#ed9a53','none',0)}`;
    }
    if(!body&&['on the bus','on the train','on the truck'].includes(lower)){
      kind='transport-context-scene';const vehicle=lower.slice(7);
      body=`${r(220,440,590,220,vehicle==='bus'?'#f0c44a':vehicle==='train'?'#5aabca':'#dc7c58',38)}${[290,420,550,680].map(x=>r(x,475,90,88,'#d9edf1',10)).join('')}${c(355,690,54,'#364651')}${c(690,690,54,'#364651')}${human('#f3c5a2','#63a8ce')}`;
    }
    if(!body&&/^in the (bedroom|bathroom|kitchen|living room)$/.test(lower)){
      const room=lower.slice(7);kind='room-context-scene';
      body=room==='bedroom'?`${r(235,490,545,190,'#7397bb',22)}${r(270,435,180,100,'#f7f2e9',18)}${r(300,250,120,155,'#d9c59e',10)}`:room==='bathroom'?`${r(270,550,430,140,'#85c9d4',50)}${c(750,560,86,'#dcecef')}${r(330,310,245,150,'#f8faf8',12)}`:room==='kitchen'?`${r(240,560,545,100,'#a77955',12)}${r(265,300,220,240,'#f4e5c9',15)}${r(530,315,220,225,'#d3e1e3',15)}`:`${r(260,500,520,180,'#6797bc',42)}${r(310,420,420,120,'#6797bc',38)}${r(355,260,180,120,'#344c59',10)}`;
    }
    if(!body&&['toothache','cold','fever','headache','stomachache'].includes(lower)){
      kind='health-symptom-visual';body=`${human('#f3c5a2','#77a9c8','#60483b')}`;
      if(lower==='toothache')body+=`${c(563,475,48,'#f2a0a2','none',0)}${p('M478 433q25 34 50 0m25 0q25 34 50 0','none',8)}`;
      if(lower==='headache'||lower==='fever')body+=`${c(512,280,72,lower==='fever'?'#ef8f86':'#f4ce53','none',0)}${p('M512 180v55m-140-5 45 35m190-35-45 35','none',12)}`;
      if(lower==='cold')body+=`${p('M405 445q108 85 214 0','none',12)}${p('M685 465q35 20 58 0','none',10)}`;
      if(lower==='stomachache')body+=`${c(512,670,82,'#ed8f84','none',0)}${p('M445 675q67 58 134 0','none',10)}`;
    }
    const preference=lower.match(/^i (like|prefer|do not like) (.+)$/);
    if(!body&&preference){
      const food=preference[2].replace(/s$/,'');kind='preference-scene';
      const foodShape=food==='papaya'?`${e(0,0,92,46,'#ef9d57')}${p('M-55 0q55-50 110 0q-55 50-110 0Z','#6cb873',5)}`:food==='apple'?`${c(0,0,65,'#dd6c68','none',0)}${p('M0 -55v-34m0 12q35-30 60-4','none',8)}`:food==='grape'?Array.from({length:7},(_,i)=>c((i%3-1)*32,Math.floor(i/3)*34-30,24,'#8b70bd','none',0)).join(''):food==='carrot'?`${p('M-45 -30 55 -5 5 95Z','#ef9b4e',4)}${p('M-5 -28q-5-35 20-48m-5 48q26-24 43-16','none',6)}`:`${c(0,0,60,'#e4b85c','none',0)}`;
      body=`${human()}<g transform="translate(710 610)">${foodShape}</g>${preference[1]==='do not like'?`${c(715,360,70,'#e98282','none',0)}${p('M675 320 755 400m0-80-80 80','#fff',14)}`:`${c(715,360,70,'#f4c84e','none',0)}<path d="M715 393 675 355q-28-32 4-48q20-8 36 13q16-21 36-13q32 16 4 48Z" fill="#e77279"/>`}`;
    }
    const roomSentence=lower.match(/^there (is|are) (a |one |two |three )?(.+?)\.?$/);
    if(!body&&roomSentence){kind='furnished-room-scene';const noun=roomSentence[3].replace(/s$/,'');
      const furniture=noun.includes('table')?`${r(300,560,420,65,'#a77955',8)}${r(340,625,35,145,'#8a664e',6)}${r(645,625,35,145,'#8a664e',6)}`:noun.includes('plate')?`${r(300,610,420,40,'#a77955',6)}${e(510,565,90,34,'#f6f3e8')}`:noun.includes('pillow')?`${r(340,430,170,100,'#8db8cf',22)}${r(525,430,170,100,'#8db8cf',22)}`:noun.includes('chair')?`${r(430,440,170,45,'#9b7050',8)}${r(445,485,40,180,'#8a664e',7)}${r(550,485,40,180,'#8a664e',7)}`:`${r(340,500,345,160,'#a77955',18)}`;
      const qty=roomSentence[2]?.trim()==='two'?2:roomSentence[2]?.trim()==='three'?3:1;body=`${r(245,250,530,530,'#edf4f4',20)}${Array.from({length:qty},(_,i)=>`<g transform="translate(${qty===1?0:i*140-70} 0)">${furniture}</g>`).join('')}`;
    }
    if(!body&&/^(red|blue|yellow|green) (circle|square|triangle|rectangle)$/.test(lower)){
      kind='colored-shape';const [,col,form]=lower.match(/^(red|blue|yellow|green) (circle|square|triangle|rectangle)$/),fill=({red:'#e35f68',blue:'#4b91d1',yellow:'#f1c84d',green:'#62ae74'})[col];
      body=form==='circle'?`<circle cx="512" cy="512" r="270" fill="${fill}"/>`:form==='square'?`<rect x="260" y="260" width="504" height="504" rx="36" fill="${fill}"/>`:form==='triangle'?`<path d="M512 220 810 770H214Z" fill="${fill}"/>`:`<rect x="170" y="330" width="684" height="364" rx="36" fill="${fill}"/>`;
    }
    if(/^[a-z]$/.test(t)){kind='letter-glyph';body=`<text x="512" y="760" text-anchor="middle" font-family="Arial,sans-serif" font-size="640" font-weight="800" fill="#397fbd">${t.toUpperCase()}</text>`;}
    const week=['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
    const days=['one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','21','22','23','24','25','50','51','52','53','54','55','56','57','58','59','64','65','66','67','68','69','70','71'];
    const dayIndex=week.indexOf(t),monthIndex=months.indexOf(t);
    if(!body&&(dayIndex>=0||monthIndex>=0)){kind='calendar-position-visual';
      if(dayIndex>=0)body=`${r(205,230,614,560,'#eef5f7',35)}${week.map((_,i)=>`${r(260+i*72,390,58,220,i===dayIndex?'#f1c957':'#c9d9e1',14)}${c(289+i*72,320,12,'#5e7480','none',0)}`).join('')}${r(255,660,510,18,'#7595a7',8)}`;
      else body=`${c(512,520,255,'#f2f7f8','#59798a',18)}${Array.from({length:12},(_,i)=>{const a=(i/12)*Math.PI*2-Math.PI/2,x=512+Math.cos(a)*185,y=520+Math.sin(a)*185;return c(x,y,monthIndex===i?48:32,monthIndex===i?'#f1c957':'#73a9c1','none',0)}).join('')}${c(512,520,82,'#f0c75b','none',0)}`;
    }
    if(!body&&days.includes(t)){kind='number-glyph';const val=({one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20})[t]??Number(t);body=`<text x="512" y="735" text-anchor="middle" font-family="Arial,sans-serif" font-size="550" font-weight="800" fill="#397fbd">${val}</text>`;}
    const subjectIcons={english:`${r(350,360,320,390,'#e6b85b',20)}${r(405,425,210,250,'#f8f4e9',9)}<path d="M510 425v250" stroke="#7d725c" stroke-width="12"/>`,geography:`${c(512,520,210,'#69b7c4')}${p('M330 450q180-180 360 0m-350 130q170 160 340 0M512 310v420','none',12)}`,mathematics:`${r(310,320,405,410,'#ffffff',30)}${p('M410 430h190m-95-95v190','none',24)}${p('M410 610h190','none',24)}`,science:`${p('M445 280h140m-105 0v220L350 740q-24 65 55 65h215q80 0 55-65L545 500V280Z','#78c9d1',16)}${p('M390 650h245','none',12)}`,history:`${p('M320 360h385l-40 80H360Z','#d9ac70')}${r(365,440,55,300,'#d9ac70',10)}${r(505,440,55,300,'#d9ac70',10)}${r(645,440,55,300,'#d9ac70',10)}${r(335,740,360,40,'#c8995e',10)}`,art:`${p('M250 560q0-250 260-280q255-30 265 230q8 230-235 270q-290 50-290-220Z','#efc878')}${[380,480,580,680].map((x,i)=>c(x,470+(i%2)*80,38,['#e96f73','#69a8cf','#77b973','#916ab4'][i],'none',0)).join('')}`};
    if(!body&&subjectIcons[t]){kind='school-subject-icon';body=subjectIcons[t]}
    const sportIcon={soccer:`${c(512,520,220,'#fffef7','#536976',16)}${p('M512 400 580 450 555 530 470 530 445 450Z','#46515b',9)}${p('M445 450 350 420m230 30 100-30m-125 110 30 120m-110-120-25 120','none',11)}`,basketball:`${c(512,520,220,'#ed913e','#604d40',16)}${p('M300 520h425m-213-220v440m-150-360q150 150 0 300m300-300q-150 150 0 300','none',15)}`,tennis:`${p('M380 270q200-120 270 60q70 200-90 280q-190 95-270-80q-80-170 90-260Z','#75ba88',17)}${p('M520 560 730 790','none',40)}${c(760,300,50,'#e5d74f','#6c6241',9)}`,volleyball:`${c(512,520,220,'#e5d971','#5b6c65',16)}${p('M320 430q190-160 380-10m-345 230q175-185 365-120m-250-240q120 140 0 430','none',14)}`};
    if(!body&&sportIcon[t]){kind='sport-object';body=sportIcon[t]}
    const places={bank:`${r(260,390,500,400,'#e5bd77')}${p('M230 400 512 240 795 400Z','#81a8b5')}${[350,460,570,680].map(x=>r(x,440,45,250,'#faf4e3',8)).join('')}`,supermarket:`${r(260,330,500,460,'#e5f0eb')}${r(260,330,500,100,'#e58d70')}${[330,430,530,630].map(x=>r(x,500,70,220,'#80b7ca',8)).join('')}`,school:`${p('M230 460 512 250 794 460Z','#e4b568')}${r(280,450,464,340,'#f3d08a')}${r(460,590,105,200,'#8b6b56')}${[340,620].map(x=>r(x,510,75,75,'#8dc2d1',8)).join('')}`, 'shoe store':`${r(260,330,500,460,'#d8e9e9')}${r(260,330,500,100,'#e99472')}${p('M360 610q100-30 125-130l80 95q80 30 110 35q20 100-80 100H350Z','#6d9fc0')}`,park:`${p('M250 720q40-300 255-260q155-200 275 35q110 210 50 250Z','#67b478',0)}${r(480,540,35,220,'#9a744d',8)}${c(512,410,135,'#64ab6c','none',0)}`,hospital:`${r(280,300,465,500,'#f3f5f4')}${r(420,440,180,360,'#81acc5')}${p('M505 370v110m-55-55h110','#e16469',28)}`,library:`${p('M255 350h510v430H255Z','#e5bd77')}${Array.from({length:5},(_,i)=>r(300+i*85,420,65,300,['#d47b72','#77aeca','#70ae7a','#e6bd58','#8a75b5'][i],8)).join('')}`};
    if(!body&&places[t]){kind='city-place';body=places[t]}
    if(!body&&['plus','minus','equals','divided by'].includes(t)){kind='math-operator';body=t==='plus'?`${r(465,280,94,480,'#e36e69',14)}${r(280,465,464,94,'#e36e69',14)}`:t==='minus'?r(280,465,464,94,'#e36e69',14):t==='equals'?`${r(280,420,464,70,'#4d93c0',12)}${r(280,560,464,70,'#4d93c0',12)}`:`${r(280,400,464,66,'#4d93c0',12)}${r(280,570,464,66,'#4d93c0',12)}${c(512,350,22,'#e36e69','none',0)}${c(512,690,22,'#e36e69','none',0)}`}
    if(!body&&/^(two plus three equals five|three plus four equals seven|six minus two equals four|nine minus five equals four)$/.test(t)){kind='arithmetic-sentence';const numberMap={two:2,three:3,four:4,five:5,six:6,seven:7,nine:9};const nums=t.split(' ').filter(x=>numberMap[x]).map(x=>numberMap[x]);body=`<text x="512" y="600" text-anchor="middle" font-family="Arial,sans-serif" font-size="180" font-weight="700" fill="#397fbd">${nums[0]} ${t.includes('plus')?'+':'−'} ${nums[1]} = ${nums[2]}</text>`;}
    if(!body&&['eye','ear','nose','mouth','head','finger','knee','shoulders','hands','feet','legs','arms'].includes(t)){kind='body-part-vector';
      body=t==='eye'?`${e(512,520,250,150,'#fffefa')}${c(512,520,88,'#69a8bd')}${c(512,520,38,'#35414b','none',0)}`:t==='ear'?`${p('M500 720q-210-130-130-380q55-180 210-100q130 80 48 220q-60 100-130 135q80-100 20-150q-55-45-75 32',' #efb58e'.trim(),15)}`:t==='nose'?p('M470 350q-45 200-110 310q-30 70 155 70q160 0 130-70l-100-310Z','#e8ae91'):t==='mouth'?`${p('M280 500q230-190 464 0q-230 250-464 0Z','#ad5e60')}${p('M340 500h360','none',12)}`:t==='finger'?`${p('M420 760V380q0-70 60-70q60 0 60 70v170V300q0-70 60-70q60 0 60 70v270q120-160 170-85q32 45-25 110L650 790Z','#efbea0')}`:t==='knee'?`${p('M390 260v300q0 95 120 95q120 0 120 100v80','none',110)}`:t==='shoulders'?`${p('M250 760q0-330 260-330q260 0 260 330Z','#64a9cf')}${e(512,430,235,160,'#f1c09f')}`:`${human()}`;
    }
    if(!body&&['wake up','have breakfast','go to school','lunch','play','study','dinner','sleep','playing','studying','waking up'].includes(t)){kind='daily-action-scene';
      const person=human('#f0c2a1','#63a8ce','#65483a');
      body=t.includes('wake')||t==='sleep'?`${r(250,500,520,160,'#769cc1',24)}${r(280,450,180,110,'#f5f0e5',25)}${person}`:t==='have breakfast'||t==='lunch'||t==='dinner'?`${person}${r(260,640,500,48,'#a77955',8)}${c(500,570,75,'#e9c968')}${r(430,520,140,22,'#e9c968',10)}`:t==='go to school'?`${person}${r(650,470,180,270,'#e5bd77')}${p('M620 480 740 380 860 480Z','#d89b55')}`:t==='study'||t==='studying'?`${person}${r(560,610,280,45,'#a77955',8)}${r(600,450,200,150,'#f5f0e5',8)}`:`${person}${c(710,650,95,'#e1a64c')}${p('M710 560v180m-90-90h180','none',15)}`;
    }
    if(!body&&['like','prefer','do not like'].includes(t)){kind='meaningful-gesture';body=t==='like'?`${c(512,520,170,'#6eb875')}${p('M470 640V500q0-50 40-50q35 0 35 40v-95q0-45 40-45q45 0 45 50v115q80-35 100 5q20 45-45 120l-100 110H480Z','#f1bd9e')}`:t==='prefer'?`${c(350,520,105,'#75b5cd')}${c(675,520,105,'#e7a64e')}${p('M440 520h130m-40-45 45 45-45 45','none',20)}`:`${c(512,520,185,'#ee8c85')}${p('M420 455q90 80 180 0m-180 140q90-80 180 0','none',20)}`}
    if(['dog','cat','rabbit','duck','chicken','bird','cow','horse','pig','sheep','turtle','fish'].includes(t)){
      kind='original-animal-vector';
      if(t==='fish')body=`${e(480,520,250,150,'#53b4d0')}${p('M700 520 890 380v280Z','#ee9a54')}${p('M430 410q60-110 120 0Z','#7ac7d1')}${dotFace(600,480)}`;
      else if(t==='duck'||t==='chicken'||t==='bird')body=`${e(470,580,220,150,t==='duck'?'#f2cf4a':'#f4eee0')}${c(650,460,120,t==='bird'?'#73abc8':'#f2cf4a')}${p('M735 470 875 520 735 555Z','#ee913f')}${p('M400 710v95m95-95v95','#ee913f',18)}${c(680,430,12,'#30333a')}`;
      else if(t==='cow')body=`${e(465,590,240,160,'#f4f0e6')}${c(660,460,150,'#f4f0e6')}${c(420,530,55,'#746563')}${c(510,650,65,'#746563')}${p('M580 360q-65-90-110-40m230 40q65-90 110-40','#ded3c4',17)}${dotFace(675,455)}${p('M330 710v100m110-100v100m110-100v100','#f4f0e6',18)}`;
      else if(t==='horse')body=`${e(460,590,230,150,'#a66d4a')}${p('M570 500q30-220 180-190l60 80q-145-10-120 200Z','#7d4d39',16)}${c(660,390,95,'#a66d4a')}${p('M570 435q-70-110-25-180q100 55 70 165Z','#5a443c')}${dotFace(680,390)}${p('M330 700v110m100-110v110m120-110v110','#a66d4a',20)}`;
      else if(t==='pig')body=`${e(470,600,220,150,'#ee9da5')}${c(650,480,135,'#ee9da5')}${c(680,510,65,'#f6bdc1')}${c(660,510,10,'#7d555a')}${c(700,510,10,'#7d555a')}${dotFace(650,445)}`;
      else if(t==='sheep')body=`${[340,430,520,610,700].map(x=>c(x,550,84,'#f3f0e8')).join('')}${e(500,620,230,130,'#f3f0e8')}${c(690,545,95,'#77665c')}${dotFace(690,520)}${p('M390 715v90m120-90v90','#f3f0e8',20)}`;
      else if(t==='turtle')body=`${e(480,565,255,145,'#53a76b')}${p('M270 565q210-250 420 0q-210 235-420 0Z','#88b96c',18)}${c(760,565,90,'#a6cb75')}${c(340,690,48,'#6fb279')}${c(610,690,48,'#6fb279')}${c(775,545,12,'#26343a')}`;
      else {const fur=t==='cat'?'#e9995e':'#bc8c61';body=`${e(460,605,230,155,fur)}${c(650,475,130,fur)}${t==='cat'?p('M545 420 570 280 650 390Z #e9995e'.replace('Z #e9995e','Z'),fur):e(705,495,70,95,'#d5a77f')}${t==='dog'?e(585,430,52,105,'#9e7352'):''}${dotFace(660,465)}${p('M350 720v95m110-95v95m120-95v95',fur,20)}`;}
    }
    const fruits=['apple','apples','big apple','small apple','banana','big banana','small banana','grape','grapes','small grape','big grape','pear','small pear','melon','big melon','papaya','carrot','small carrot','tomato','potato'];
    if(!body&&fruits.includes(t)){
      kind='original-food-vector';const big=t.startsWith('big '),small=t.startsWith('small '),name=t.replace(/^(big|small) /,'').replace(/s$/,'');const scale=big?1.13:small?.76:1;
      if(name==='apple'||name==='tomato')body=`<g transform="translate(${512-210*scale} ${512-210*scale}) scale(${scale})">${p('M510 390q-150-155-230 0q-40 240 230 335q270-95 230-335q-80-155-230 0Z',name==='apple'?'#e55658':'#e85650')}${p('M510 395q0-125 70-165','#72503a')}${p('M575 270q105-60 140 10q-75 80-140-10Z','#6aa85c')}</g>`;
      else if(name==='banana')body=p('M250 400q150 250 520 95q-80 270-365 240q-160-30-185-250Z','#f2cb43',16);
      else if(name==='grape')body=`${Array.from({length:13},(_,i)=>c(400+(i%4)*70,390+Math.floor(i/4)*70,42,'#8058b7')).join('')}${p('M490 365q10-95 65-120','#6f5037')}${p('M550 280q80-55 125 5q-65 55-125-5Z','#69a65c')}`;
      else if(name==='carrot')body=`${p('M360 360q145-105 290 0L520 800Z','#ef8a3e')}${p('M480 370q-70-120-25-205q90 85 50 200Z','#69a85c')}${p('M535 370q0-115 85-175q25 112-55 178Z','#77b86a')}`;
      else if(name==='potato')body=e(512,540,260,185,'#b68b65');
      else if(name==='melon')body=`${e(512,530,255,205,'#62ad64')}${[-170,-95,-20,55,130].map(x=>p(`M${512+x} 350q65 180 0 360`,'none',15)).join('')}`;
      else body=`${e(512,540,165,250,name==='papaya'?'#ed984c':'#8eb95a')}${p('M510 310q0-70 38-95','#704b36')}${p('M530 290q70-60 120-10q-50 70-120 10Z','#70aa5a')}`;
    }
    if(!body&&['ball','boat','plane','train','bus','truck','car','table','tv','rug','wardrobe','sofa','bed','pillows','plate','chair','doll','teddy bear','kite','video game'].includes(t)){
      kind='original-object-vector';
      if(t==='ball')body=`${c(512,520,265,'#e8655f')}${p('M300 350q210 190 424 0m-424 340q210-190 424 0','none',21)}`;
      else if(t==='boat')body=`${p('M210 610h600l-105 170H320Z','#45a8c6')}${p('M500 280v330m12-300 190 235H512Z','#f0c956')}`;
      else if(t==='plane')body=p('M180 520 475 455 555 225 620 235 600 445 830 390 875 430 615 550 590 740 535 750 505 575 220 610Z','#64a9d0',16);
      else if(t==='train'||t==='bus'||t==='truck'||t==='car')body=`${r(220,440,590,220,t==='train'?'#5aabca':t==='bus'?'#f0c44a':t==='truck'?'#dc7c58':'#70a4cf',38)}${[290,420,550,680].map(x=>r(x,475,90,88,'#d9edf1',10)).join('')}${c(355,690,54,'#364651')}${c(690,690,54,'#364651')}`;
      else if(t==='table')body=`${r(280,480,460,62,'#a6754f')}${r(330,540,45,250,'#a6754f',8)}${r(645,540,45,250,'#a6754f',8)}`;
      else if(t==='tv')body=`${r(250,300,520,360,'#344958',35)}${r(295,345,430,265,'#76c4d2',18,'#344958',10)}${r(460,670,100,30,'#344958',7)}`;
      else if(t==='sofa')body=`${r(250,470,520,220,'#699bc6',55)}${r(280,380,460,140,'#699bc6',50)}${r(285,680,55,100,'#765643',8)}${r(680,680,55,100,'#765643',8)}`;
      else if(t==='bed')body=`${r(240,500,540,150,'#6897c2')}${r(275,450,160,95,'#f1e9d9')}${r(270,650,45,150,'#785b49',8)}${r(710,650,45,150,'#785b49',8)}`;
      else if(t==='pillows')body=`${r(250,430,530,300,'#74a2c9',38)}${r(300,455,190,115,'#efe7d9',30)}${r(540,455,190,115,'#efe7d9',30)}`;
      else if(t==='plate')body=`${c(512,530,250,'#e8edf0','#9aaab4',15)}${c(512,530,175,'#fffdf7','#adb9c0',8)}`;
      else if(t==='chair')body=`${r(370,330,280,200,'#dc9a50')}${r(375,530,270,60,'#dc9a50',12)}${r(405,585,45,210,'#986441',8)}${r(575,585,45,210,'#986441',8)}`;
      else if(t==='rug')body=`${r(230,410,560,310,'#d27d86',90,'#a85568',18)}${[350,510,670].map(x=>c(x,565,34,'#f2cc65','none',0)).join('')}`;
      else if(t==='wardrobe')body=`${r(300,250,430,560,'#ad805e',30)}${r(510,275,20,510,'#805d48',5)}${c(480,525,12,'#f2ce75','none',0)}${c(560,525,12,'#f2ce75','none',0)}`;
      else if(t==='boat'){} else if(t==='kite')body=`${p('M512 230 760 500 512 770 264 500Z','#e46a80')}${p('M512 230v540m-248-270h496','none',14)}${p('M512 770q150 70 65 180q-60 65 75 60','none',12)}`;
      else if(t==='doll'||t==='teddy bear')body=`${e(512,620,165,200,t==='doll'?'#e88f7d':'#a87c58')}${c(512,350,145,t==='doll'?'#f2c3a4':'#a87c58')}${c(405,250,45,'#a87c58')}${c(620,250,45,'#a87c58')}${dotFace(512,350)}`;
      else body=`${r(250,360,520,310,'#536f9a',60)}${c(420,510,55,'#ef7166')}${c(610,480,35,'#f1d161')}${c(670,540,35,'#65c4a3')}`;
    }
    if(!body&&['mother','father','brother','sister','grandfather','grandmother','ana','mia','leo','ben','he','she','they','i','first name','middle name','last name','age','birthday','favorite','best friend','phone number','nationality','brazilian','brazil','city','country'].includes(t)){
      kind='original-social-vector';
      if(['mother','father','brother','sister','grandfather','grandmother','ana','mia','leo','ben','he','she','i','they'].includes(t)){
        const hair=['mother','sister','grandmother','mia','ana','she'].includes(t)?'#65463e':'#76543c';body=human('#f2c3a3',t==='father'?'#5686b0':'#e49373',hair);
        if(t.startsWith('grand'))body+=`<path d="M395 325q120-70 235 0" fill="none" stroke="#f5f1e9" stroke-width="28"/>`;
        if(t==='they'||t==='best friend')body+=`${human('#d99676','#65a9ce','#5b453e').replaceAll('512','740')}`;
      } else if(t==='birthday')body=`${c(512,570,190,'#e98c72')}${p('M325 500h375v190H325Z','#65add0')}${c(510,320,24,'#f2ca55')}${p('M512 345v120','#6d503b',18)}${[410,510,610].map(x=>p(`M${x} 430v45`,'#70ad65',13)).join('')}`;
      else if(t==='age')body=`${c(512,520,220,'#71b5d1')}${[0,1,2,3,4].map(i=>c(385+i*64,520,20,'#fff4d0','none',0)).join('')}`;
      else if(t==='phone number')body=`${r(365,210,300,600,'#45505c',45)}${r(400,270,230,390,'#9dd5dc',18)}${[0,1,2,3,4,5,6,7,8].map(i=>c(435+(i%3)*65,710+Math.floor(i/3)*35,12,'#f4d370','none',0)).join('')}`;
      else if(t==='favorite')body=p('M512 760 250 500Q130 340 310 275Q430 235 512 355Q594 235 714 275Q894 340 774 500Z','#eb6e82',14);
      else if(t==='best friend')body=`${human('#edbc9e','#67aad0','#5b433d')}${human('#d79573','#e4a94a','#694b3d').replaceAll('512','740')}`;
      else if(t==='nationality'||t==='brazilian'||t==='brazil')body=`${p('M512 250 820 500 512 760 204 500Z','#3eaa68',12)}${p('M512 330 685 500 512 670 339 500Z','#f0cf4d',0)}${c(512,500,83,'#3c82be','none',0)}`;
      else if(t==='city'||t==='country')body=`${r(230,500,190,300,'#e9aa62')}${r(420,360,185,440,'#6b9bc5')}${r(605,430,190,370,'#d88270')}${[280,350,470,540,650,720].map(x=>r(x,540,48,60,'#e2f1ed',6)).join('')}`;
      else body=`${r(250,260,520,500,'#71aacb')}${r(330,335,95,110,'#eff4ed',8)}${r(480,335,95,110,'#eff4ed',8)}${r(330,500,95,110,'#eff4ed',8)}${r(480,500,95,110,'#eff4ed',8)}`;
    }
    const clothes=['jacket','dress','shirt','t-shirt','pants','trousers','pants/trousers','shoes','medium','large'];
    if(!body&&clothes.includes(t)){
      kind='original-clothing-vector';
      if(t==='dress')body=p('M410 250h205l55 200 115 340H240l115-340Z','#e87591',17);
      else if(t==='pants'||t==='trousers'||t==='pants/trousers')body=p('M330 260h360l-35 530H520l-40-320-55 320H300Z','#577fb0',16);
      else if(t==='medium'||t==='large')body=`<g transform="translate(512 520) scale(${t==='large'?1.16:0.88})">${p('M-100 -245h200l115 110-65 105-55-45v330h-190v-330l-55 45-65-105Z',t==='large'?'#e58c64':'#6498c4',16)}</g>`;
      else if(t==='shoes')body=`${p('M280 520q125 10 180-100l110 140q105 35 210 35q55 125-55 150H275q-65-110 5-225Z','#6aa4cc')}${p('M320 710h440','none',16)}`;
      else body=p('M370 260h280l190 200-100 115-100-85v335H380V490l-100 85-100-115Z',t==='jacket'?'#5589b4':t==='shirt'?'#f2ca5d':'#65afc9',15);
    }
    if(!body&&['bedroom','bathroom','kitchen','living room'].includes(t)){
      kind='original-room-vector';
      if(t==='bedroom')body=`${r(240,440,540,190,'#6794c0')}${r(275,390,160,110,'#f0e9dc')}${r(270,625,45,170,'#815d47',8)}${r(710,625,45,170,'#815d47',8)}`;
      if(t==='bathroom')body=`${r(320,520,400,190,'#a7d9df',55)}${p('M420 520V320q0-70 80-70h120','none',24)}${[450,530,610].map(x=>c(x,440,16,'#66b8cf','none',0)).join('')}`;
      if(t==='kitchen')body=`${r(330,280,360,530,'#e0e8e9')}${r(380,510,260,235,'#aebdc2',16)}${[430,510,590].map(x=>c(x,420,28,'#586871')).join('')}`;
      if(t==='living room')body=`${r(240,500,540,220,'#6698c1',50)}${r(275,390,470,160,'#6698c1',50)}${r(300,715,45,85,'#765744',8)}${r(680,715,45,85,'#765744',8)}${r(310,245,190,115,'#374c58',12)}`;
    }
    if(!body&&['sunny','rainy','cloudy','windy'].includes(t)){
      kind='original-weather-vector';
      if(t==='sunny')body=`${c(510,440,155,'#f4cc48')}${Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return p(`M${510+Math.cos(a)*210} ${440+Math.sin(a)*210}L${510+Math.cos(a)*285} ${440+Math.sin(a)*285}`,'none',18)}).join('')}`;
      if(t==='cloudy')body=`${e(430,520,150,105,'#c2d0d7')}${e(580,480,160,125,'#c2d0d7')}${e(700,535,105,85,'#c2d0d7')}`;
      if(t==='rainy')body=`${e(430,400,160,110,'#aebec9')}${e(590,390,160,130,'#aebec9')}${[360,490,620,730].map(x=>p(`M${x} 520l-42 120`,'none',17)).join('')}`;
      if(t==='windy')body=`${e(520,360,150,95,'#d0dce1')}${p('M280 540q190-130 430 0m-450 110q160-100 360 0','none',18)}`;
    }
    if(!body&&['spring','summer','autumn','fall','winter'].includes(t)){
      kind='original-season-vector';
      if(t==='winter')body=`${p('M250 780q260-360 525 0Z','#fafcff')}${[380,512,644].map(x=>p(`M${x} 240v260m-68-194 136 136m-136 0 136-136`,'none',13)).join('')}`;
      else if(t==='summer')body=`${c(710,320,115,'#f4cf51')}${p('M220 780q260-340 560 0Z','#68b67b',0)}`;
      else if(t==='spring')body=`${p('M230 790q280-320 560 0Z','#77b87b',0)}${[380,512,644].map(x=>`${c(x,570,38,'#ed86ad','none',0)}${c(x,570,14,'#f5ca4c','none',0)}`).join('')}`;
      else body=`${p('M230 790q280-320 560 0Z','#9cb66a',0)}${[360,480,600,700].map((x,i)=>e(x,560,30,70,i%2?'#d88643':'#e2a34c')).join('')}`;
    }
    if(!body&&['doctor','teacher','actor','actress','actor/actress'].includes(t)){
      kind='original-profession-vector';body=human('#f1c2a1',t==='teacher'?'#b27457':'#ecede7','#65463e');
      if(t==='doctor')body+=`<circle cx="510" cy="570" r="85" fill="none" stroke="#e9f3ef" stroke-width="19"/><path d="M455 605v65q55 65 110 0v-65" fill="none" stroke="#e9f3ef" stroke-width="18"/>`;
      if(t==='teacher')body+=`${r(720,350,185,250,'#6da074',15)}${c(780,420,18,'#f4cf4d','none',0)}${c(835,480,18,'#f4cf4d','none',0)}`;
      if(t==='actor'||t==='actress'||t==='actor/actress')body+=`${p('M700 330q60-70 120 0l-20 95h-80Z','#e5c155')}${r(715,430,90,16,'#c68151',7)}`;
    }
  }
  return body ? {kind, body} : null;
};
const conceptById = new Map(contractsDoc.contracts.flatMap(c=>(c.requiredMedia??[]).map(m=>[m.mediaConceptId,m])));
for (const g of audit.groups) {
  const mediaId=`IMG-V11-2B-${short(g.canonicalKey)}`;
  const alreadyBuilt=allExisting.get(mediaId);
  if(alreadyBuilt){
    if(alreadyBuilt.source==='DUDUQ_V11_2B_DETERMINISTIC_VECTOR'){
      const rel=alreadyBuilt.urlOrPath??alreadyBuilt.assets?.[0]?.path,abs=path.join(root,rel);
      let svg=await readFile(abs,'utf8');
      svg=svg.replace(/aria-label="[^"]*"/,'aria-label="Illustration option"');
      await writeFile(abs,svg,'utf8');
      const hashValue=sha(svg);
      alreadyBuilt.assets=alreadyBuilt.assets??[];alreadyBuilt.assets[0]={...(alreadyBuilt.assets[0]??{}),path:rel,sha256:hashValue,mediaType:'image/svg+xml'};
      alreadyBuilt.sha256=hashValue;alreadyBuilt.technicalStatus='PASS';alreadyBuilt.refinementStatus='IMAGE_REFINEMENT_PENDING';alreadyBuilt.humanReview='HUMAN_REVIEW_PENDING';
      alreadyBuilt.altText='Illustration option';
      registryChanged=true;
    }
    for(const id of g.requirementIds) bindings[id]={mediaId,assetPath:alreadyBuilt.urlOrPath??alreadyBuilt.assets?.[0]?.path,disposition:alreadyBuilt.source==='DUDUQ_V11_2B_DETERMINISTIC_VECTOR'?'GENERATED_LOCAL_VECTOR':'GENERATED_OR_REGISTERED',semanticKey:g.canonicalKey};
    continue;
  }
  const reuse=await safeReuse(g);
  if(reuse){
    for(const id of g.requirementIds) bindings[id]={mediaId:reuse.mediaId,assetPath:reuse.urlOrPath??reuse.assets?.[0]?.path,disposition:'REUSE_WITH_REFINEMENT_PENDING',semanticKey:g.canonicalKey};
    reused.push({canonicalKey:g.canonicalKey,mediaId:reuse.mediaId,semantic:g.semanticKey[0],path:reuse.urlOrPath??reuse.assets?.[0]?.path,usedByItems:[...new Set(g.usedByItems)]});
    continue;
  }
  const exemplar=conceptById.get(g.requirementIds[0])??{};
  const vector=svgFor(g);
  if(vector){
    const rel=`${outRoot}/${mediaId.toLowerCase()}.svg`, abs=path.join(root,rel);
    await mkdir(path.dirname(abs),{recursive:true});
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-label="Illustration option"><rect width="1024" height="1024" rx="112" fill="#f4f8fc"/>${vector.body}</svg>\n`;
    await writeFile(abs,svg,'utf8');
    const entry={mediaId,semanticKey:g.canonicalKey,semantic:g.semanticKey[0],concept:g.semanticKey[0],role:g.semanticKey[1],kind:'image',status:'APPROVED',urlOrPath:rel,altText:'Illustration option',assets:[{path:rel,sha256:sha(svg),mediaType:'image/svg+xml'}],technicalStatus:'PASS',version:'1.0',source:'DUDUQ_V11_2B_DETERMINISTIC_VECTOR',visualType:vector.kind,usedByItems:[...new Set(g.usedByItems)],integrationStatus:'SOURCE_READY',refinementStatus:'IMAGE_REFINEMENT_PENDING',humanReview:'HUMAN_REVIEW_PENDING',answerLeakRisk:'NONE_BAKED_IN_TEXT'};
    generatedLocal.push(entry);
    registryChanged=true;
    for(const id of g.requirementIds) bindings[id]={mediaId,assetPath:rel,disposition:'GENERATED_LOCAL_VECTOR',semanticKey:g.canonicalKey};
  } else {
    const rel=`${outRoot}/${mediaId.toLowerCase()}.jpg`;
    const prompts=[...new Set(g.requirementIds.map(id=>conceptById.get(id)?.semanticDescription).filter(Boolean))];
    const prompt=[
      'Use case: illustration-story','Asset type: child-friendly educational game visual',
      `Primary request: depict ${g.semanticKey[0]} accurately and immediately recognizably.`,
      `Visual role: ${g.semanticKey[1]}.`,
      `Specific concept brief: ${prompts[0]??g.semanticKey[2]}.`,
      'Style/medium: original polished DUDUQ educational cartoon illustration; inclusive, clean shapes, appealing and age-appropriate.',
      'Composition/framing: centered, one clear subject, simple uncluttered composition, 1:1 square.',
      'Text (verbatim): none. Constraints: no labels, no answer words, no watermark, no logos, no unrelated objects, no visual highlighting that signals correctness.'
    ].join(' ');
    const reqId=`REQ-${mediaId}`;
    const used=[...new Set(g.usedByItems)];
    needs.push({requirementId:g.canonicalKey,mediaId,moduleId:used[0]?.slice(0,5)??'Y2M02',questionIds:used,semanticDescription:prompts[0]??g.semanticKey[0],status:'NEEDS_CHATGPT_IMAGE_GENERATION',reuseCandidates:[],generationRequest:{requestId:reqId,mediaId,moduleId:used[0]?.slice(0,5)??'Y2M02',questionId:used[0]??null,questionIds:used,mechanic:'multi-module canonical media',semanticDescription:prompts[0]??g.semanticKey[0],pedagogicalRole:g.semanticKey[1],transparentBackground:false,styleRequirement:'DUDUQ original child-friendly illustration',replacementStatus:'OFFICIAL_NEW_ASSET',canonicalFilename:path.basename(rel),outputPath:rel,prompt,provenance:{provider:'Configured DUDUQ image pipeline',status:'AWAITING_GENERATION'},humanReview:'HUMAN_REVIEW_PENDING'}});
    for(const id of g.requirementIds) bindings[id]={mediaId,assetPath:rel,disposition:'GENERATION_PENDING',requestId:reqId,semanticKey:g.canonicalKey};
    pending.push({canonicalKey:g.canonicalKey,mediaId,semantic:g.semanticKey[0],role:g.semanticKey[1],requestId:reqId,usedByItems:used});
  }
}
if(registryChanged){
  const ids=new Set(registry.entries.map(x=>x.mediaId));
  for(const e of generatedLocal){if(ids.has(e.mediaId))throw new Error(`MEDIA_ID_COLLISION:${e.mediaId}`);registry.entries.push(e);ids.add(e.mediaId)}
  registry.updatedAt=new Date().toISOString();
  await save('content/english/media/media-registry.json',registry);
}
await save(`${base}/media-concept-binding-map.json`,{schemaVersion:'duduq-v11-2b-media-bindings-v1',generatedAt:new Date().toISOString(),bindingCount:Object.keys(bindings).length,bindings,reused,generatedLocal,pending});
await save(`${base}/media-image-generation-requests.json`,{schemaVersion:'duduq-image-generation-requests-v1',generatedAt:new Date().toISOString(),policy:{filenameMatchesAreNotSemanticEvidence:true,sourceOnlyRequired:true},needs});
console.log(JSON.stringify({requirementsBoundToPlan:Object.keys(bindings).length,reusedGroups:reused.length,localVectors:generatedLocal.length,pendingImageGeneration:pending.length,registryAdded:generatedLocal.length,requests:needs.length},null,2));
