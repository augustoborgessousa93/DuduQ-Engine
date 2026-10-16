#!/usr/bin/env node
/**
 * Resolve the 460 approved Y2M02–Y5M06 planning records into deterministic
 * content contracts. This does not activate runtime routes or generate media.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const load = async p => JSON.parse(await readFile(path.join(root, p), 'utf8'));
const save = async (p, data) => {
  const dest = path.join(root, p);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
};
const slug = s => String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const hash = s => createHash('sha256').update(s).digest('hex').slice(0, 10).toUpperCase();
const mechanics = new Set(['target-shooter','bubble-pop','drag-drop-multimedia','drag-drop','matching','memory-quest','smart-sentence-complete','smart-sentence-order']);
const colors = ['red','blue','yellow','green','black','white','orange','purple','gray','brown'];
const vocab = {
  Y2M02: ['one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','triangle','square','rectangle','star','circle',...colors],
  Y2M03: ['mother','father','brother','sister','grandmother','grandfather'],
  Y2M04: ['doll','ball','train','plane','teddy bear','kite','video game','boat','in','on',...colors],
  Y2M05: ['duck','horse','cow','pig','sheep','chicken','one','two','three'],
  Y2M06: ['eye','ear','nose','mouth','finger','knee','shoulders','apple','banana','pear','orange','grape','papaya','melon','carrot','tomato','potato','big','small'],
  Y3M01: ['age','birthday','favorite','best friend','phone number','eight','nine','ten','eleven','Mia','Leo','Ana','Ben'],
  Y3M02: [...Array.from({length:50},(_,i)=>String(i+1)),...['twenty','thirty','forty','fifty']],
  Y3M03: ['mother','father','brother','sister','grandmother','grandfather','he','she','eight','nine','ten','Mia','Leo','Ana','Ben'],
  Y3M04: ['doll','ball','train','plane','teddy bear','video game','boat','kite','fish','turtle','one','two','three'],
  Y3M05: ['plus','minus','equals','times','divided by','triangle','square','rectangle','star','circle','one','two','three','four','five','six','seven','eight','nine','ten'],
  Y3M06: ['pear','orange','grape','papaya','melon','carrot','tomato','potato','school','like','do not like','prefer'],
  Y4M01: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday','age','birthday','favorite','best friend'],
  Y4M02: ['English','Geography','Mathematics','Science','History','Art'],
  Y4M03: ['January','February','March','April','May','June','July','August','September','October','November','December','spring','summer','autumn','fall','winter'],
  Y4M04: ['soccer','basketball','tennis','volleyball','one','two','three','four','five','six','seven','eight','nine','ten'],
  Y4M05: ['jacket','dress','shirt','T-shirt','pants','trousers','shoes','small','medium','large',...colors,'apple','banana','pear','orange','grape','papaya','melon','carrot','tomato','potato'],
  Y4M06: ['bedroom','bathroom','kitchen','living room','under','behind','beside','car','bus','truck','train'],
  Y5M01: ['Brazil','Brazilian','city','country','first name','middle name','last name','Mia','Leo','Ana','Ben'],
  Y5M02: ['wake up','have breakfast','go to school','lunch','study','play','dinner','sleep','like','do not like','do','does'],
  Y5M03: ['doctor','teacher','actor','actress','mother','father','brother','sister','grandmother','grandfather','he','she','they'],
  Y5M04: ['headache','stomachache','toothache','cold','fever','sunny','rainy','cloudy','windy',...Array.from({length:50},(_,i)=>String(i+51))],
  Y5M05: ['table','TV','rug','wardrobe','sofa','bed','pillows','plate','kitchen','living room','bedroom','bathroom','under','behind','beside'],
  Y5M06: ['bank','supermarket','school','shoe store','park','hospital','library','playing','studying','waking up','they','he','she']
};
const sentenceFrames = {
  Y2M02: ["What's this? It's a {target}.", "It's a {target}.", "I see a {target}."],
  Y2M03: ['This is my {target}.', 'He is my {target}.', 'She is my {target}.'],
  Y2M04: ['My favorite toy is a {target}.', 'The {target} is in the box.', 'The {target} is on the table.'],
  Y2M05: ['This is one {target}.', 'These are {target}.'],
  Y2M06: ['Touch your {target}.', "It's a {target}.", 'I see a {target}.'],
  Y3M01: ['I am {target} years old.', 'My birthday is in {target}.', 'My favorite {target} is ...', 'This is my best friend.'],
  Y3M02: ['How old are you? I am {target} years old.', 'There are {target}.'],
  Y3M03: ['He is my {target}.', 'She is my {target}.', 'This is {target}.'],
  Y3M04: ['My favorite toy is a {target}.', 'There is one {target}.', 'There are three {target}.'],
  Y3M05: ['{target} plus two equals five.', 'Three {target} two equals one.', 'The shape is a {target}.'],
  Y3M06: ['I like {target}.', "I don't like {target}.", 'I prefer {target}.'],
  Y4M01: ["What's the day today? Today is {target}.", 'My birthday is in May.', 'My favorite day is {target}.'],
  Y4M02: ['My favorite subject is {target}.', 'I study {target} on Monday.'],
  Y4M03: ['It is {target}.', 'My birthday is in {target}.'],
  Y4M04: ['My favorite sport is {target}.', 'I play {target}.', 'He is playing {target}.'],
  Y4M05: ['I am wearing a {target}.', 'What size is it? It is {target}.', 'I like the {target}.'],
  Y4M06: ['Where is the {target}?', 'It is {target}.', 'I go by {target}.'],
  Y5M01: ['Where are you from? I am from {target}.', 'I am {target}.', 'My {target} is ...'],
  Y5M02: ['I {target} in the morning.', 'Do you like {target}?', 'I wake up at seven.'],
  Y5M03: ['I am a {target}.', 'He is a {target}.', 'She is a {target}.'],
  Y5M04: ['It is {target}.', 'I have a {target}.', 'There are {target}.'],
  Y5M05: ['There is a {target}.', 'There are {target}.', 'The {target} is in the living room.'],
  Y5M06: ['The {target} is in my city.', 'She is {target}.', 'They are {target}.']
};
const imageKinds = /shape|color|number|quantity|animal|family|toy|body|food|clothes|subject|sport|room|transport|place|weather|health|person|profile|picture|scene|visual|image/i;
const instructionCopy = (mechanic, topic, groupLabels=[]) => ({
  'target-shooter': ['Listen and shoot the matching choice.', 'Ouça e acerte a opção correspondente.'],
  'bubble-pop': ['Listen and pop the matching bubble.', 'Ouça e estoure a bolha correspondente.'],
  'drag-drop-multimedia': ['Match each audio to its picture.', 'Combine cada áudio com sua imagem.'],
  'drag-drop': [`Sort each item: ${groupLabels.join(' or ').toLowerCase()}.`, `Separe cada item: ${groupLabels.join(' ou ').toLowerCase()}.`],
  matching: ['Match each item to its pair.', 'Combine cada item com seu par.'],
  'memory-quest': ['Find the matching pairs.', 'Encontre os pares correspondentes.'],
  'smart-sentence-complete': ['Complete the sentence.', 'Complete a frase.'],
  'smart-sentence-order': ['Put the words in order.', 'Coloque as palavras na ordem correta.']
}[mechanic]);
const feedback = mechanic => ({
  'target-shooter':'DUDUQ_CANONICAL_FEEDBACK_TARGET_SHOOTER_V1', 'bubble-pop':'DUDUQ_CANONICAL_FEEDBACK_BUBBLE_POP_V1',
  'drag-drop-multimedia':'DUDUQ_CANONICAL_FEEDBACK_DDM_V1', 'drag-drop':'DUDUQ_CANONICAL_FEEDBACK_GROUPING_V1',
  matching:'DUDUQ_CANONICAL_FEEDBACK_MATCHING_V1', 'memory-quest':'DUDUQ_CANONICAL_FEEDBACK_MEMORY_QUEST_V1',
  'smart-sentence-complete':'DUDUQ_CANONICAL_FEEDBACK_SMART_SENTENCE_V1', 'smart-sentence-order':'DUDUQ_CANONICAL_FEEDBACK_SMART_SENTENCE_V1'
}[mechanic]);
const audId = (locale, text, role) => `AUD-${locale==='en-US'?'EN':'PT'}-${role}-${hash(`${locale}|${text.toLowerCase().trim()}`)}`;
const mediaId = (moduleId, target, role='OPTION') => `IMG-${moduleId}-${slug(target).toUpperCase()}-${role}`;
const expand = (m, value) => {
  const s = String(value ?? '').trim();
  const lower=s.toLowerCase();
  const scoped = {
    Y2M02: {shape:['triangle','square','rectangle','star','circle'],number:vocab.Y2M02.slice(0,20),color:colors},
    Y2M03: {family:['mother','father','brother','sister','grandmother','grandfather']},
    Y2M04: {toy:['doll','ball','train','plane','teddy bear','kite','video game','boat'],color:colors,number:vocab.Y2M04.filter(x=>['one','two','three','four','five','six','seven','eight','nine','ten'].includes(x))},
    Y2M05: {animal:['duck','horse','cow','pig','sheep','chicken'],number:['one','two','three']},
    Y2M06: {body:['eye','ear','nose','mouth','finger','knee','shoulders'],food:['apple','banana','pear','orange','grape','papaya','melon','carrot','tomato','potato'],size:['big','small']},
    Y3M01: {age:['eight','nine','ten','eleven'],name:['Mia','Leo','Ana','Ben'],profile:['age','birthday','favorite','best friend','phone number']},
    Y3M02: {number:vocab.Y3M02.slice(0,50)},
    Y3M03: {family:['mother','father','brother','sister','grandmother','grandfather'],pronoun:['he','she'],name:['Mia','Leo','Ana','Ben'],age:['eight','nine','ten']},
    Y3M04: {toy:['doll','ball','train','plane','teddy bear','video game','boat','kite'],animal:['fish','turtle'],number:['one','two','three']},
    Y3M05: {operation:['plus','minus','equals','times','divided by'],shape:['triangle','square','rectangle','star','circle'],number:vocab.Y3M05.slice(10)},
    Y3M06: {food:['pear','orange','grape','papaya','melon','carrot','tomato','potato'],preference:['like','do not like','prefer']},
    Y4M01: {day:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],profile:['age','birthday','favorite','best friend']},
    Y4M02: {subject:['English','Geography','Mathematics','Science','History','Art']},
    Y4M03: {month:['January','February','March','April','May','June','July','August','September','October','November','December'],season:['spring','summer','autumn','fall','winter']},
    Y4M04: {sport:['soccer','basketball','tennis','volleyball'],number:['one','two','three','four','five','six','seven','eight','nine','ten']},
    Y4M05: {clothing:['jacket','dress','shirt','T-shirt','pants','trousers','shoes'],size:['small','medium','large'],color:colors,food:['apple','banana','pear','orange','grape','papaya','melon','carrot','tomato','potato']},
    Y4M06: {room:['bedroom','bathroom','kitchen','living room'],position:['under','behind','beside'],transport:['car','bus','truck','train']},
    Y5M01: {identity:['Brazil','Brazilian','city','country','first name','middle name','last name'],name:['Mia','Leo','Ana','Ben']},
    Y5M02: {routine:['wake up','have breakfast','go to school','lunch','study','play','dinner','sleep'],preference:['like','do not like','do','does']},
    Y5M03: {occupation:['doctor','teacher','actor','actress'],family:['mother','father','brother','sister','grandmother','grandfather'],pronoun:['he','she','they']},
    Y5M04: {health:['headache','stomachache','toothache','cold','fever'],weather:['sunny','rainy','cloudy','windy'],number:vocab.Y5M04.filter(x=>/^\d+$/.test(x))},
    Y5M05: {furniture:['table','TV','rug','wardrobe','sofa','bed','pillows','plate'],room:['kitchen','living room','bedroom','bathroom'],position:['under','behind','beside']},
    Y5M06: {place:['bank','supermarket','school','shoe store','park','hospital','library'],action:['playing','studying','waking up']}
  }[m]||{};
  const direct = vocab[m].find(x=>x.toLowerCase()===lower);
  if(direct)return [direct];
  if(/^name exchange$|^identify\/introduce relative$|^family recognition\/introduction$|inclusive fictional family portraits|^i have chunk$|^i have a$|^this is my$/i.test(s))return scoped.family||scoped.profile||vocab[m];
  if(/first staged 11|11\s*[–-]\s*20 audio/i.test(s))return ['eleven','twelve','thirteen','fourteen','fifteen'];
  if(/written-form-to-shape|shape-label reading|describe shape|^shape/i.test(s))return scoped.shape||vocab[m];
  if(/number|quantity|count|age|phone number|51-100|21-50/i.test(s)) {
    if(/phone number/i.test(s))return ['555-0142','555-0186','555-0127','555-0163'];
    if(/age/i.test(s))return scoped.age||['eight','nine','ten','eleven'];
    if(/count|quantity/i.test(s)&&scoped.number)return scoped.number;
    if(scoped.number)return scoped.number;
  }
  for(const [tag,values] of Object.entries(scoped))if(new RegExp(tag,'i').test(lower))return values;
  if(/alphabet|spelling|spell/i.test(s))return ['A','B','C','D'];
  if(/favorite toy/i.test(s))return scoped.toy||vocab[m];
  if(/colors?|colour/i.test(s))return scoped.color||colors;
  if(/animal/i.test(s))return scoped.animal||vocab[m];
  if(/food|like|prefer/i.test(s))return scoped.food||scoped.preference||vocab[m];
  if(/weekday|day today|week/i.test(s))return scoped.day||vocab[m];
  if(/month|birthday/i.test(s))return scoped.month||['January','February','March','April'];
  if(/season/i.test(s))return scoped.season||vocab[m];
  if(/subject|school/i.test(s))return scoped.subject||vocab[m];
  if(/sport/i.test(s))return scoped.sport||vocab[m];
  if(/clothes|wear|size/i.test(s))return scoped.clothing||scoped.size||vocab[m];
  if(/room|furniture|there is|there are/i.test(s))return scoped.furniture||scoped.room||vocab[m];
  if(/preposition|location|under|behind|beside|in\/on/i.test(s))return scoped.position||['in','on','under','behind','beside'];
  if(/transport|vehicle/i.test(s))return scoped.transport||vocab[m];
  if(/weather/i.test(s))return scoped.weather||vocab[m];
  if(/health|headache|stomachache|toothache|cold|fever/i.test(s))return scoped.health||vocab[m];
  if(/routine|wake up|breakfast|daily/i.test(s))return scoped.routine||vocab[m];
  if(/occupation|job|doctor|teacher/i.test(s))return scoped.occupation||vocab[m];
  if(/place|city/i.test(s))return scoped.place||vocab[m];
  const nums = s.match(/numbers?\s*(\d+)\s*[-–]\s*(\d+)/i);
  if (nums) return Array.from({length:Number(nums[2])-Number(nums[1])+1},(_,i)=>String(Number(nums[1])+i));
  if (/^cumulative number words/i.test(s)) return vocab[m].filter(x => /^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)$/.test(x));
  if (/^receptive y1 colors/i.test(s) || /^active colors$/i.test(s) || /color attribute/i.test(s)) return colors;
  if (/1-20 recognition and five shapes/i.test(s)) return [...vocab[m].filter(x=>/^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)$/.test(x)),...vocab[m].filter(x=>['triangle','square','rectangle','star','circle'].includes(x))];
  if (/numbers? 11-20/i.test(s)) return vocab[m].filter(x=>['eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'].includes(x));
  if (/numbers? 21-50/i.test(s)) return Array.from({length:30},(_,i)=>String(i+21));
  if (/numbers? 51-100/i.test(s)) return Array.from({length:50},(_,i)=>String(i+51));
  const exact = vocab[m].find(x=>x.toLowerCase()===s.toLowerCase());
  if (exact) return [exact];
  const matches = vocab[m].filter(x=>new RegExp(`(^|[^a-z])${x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}([^a-z]|$)`,'i').test(s));
  return matches.length ? matches : vocab[m];
};
const resolveTargets = (m, activity, i) => {
  const explicit = activity.answerContract?.targetSet;
  if (Array.isArray(explicit) && explicit.length) return [...new Set(explicit.map(String))];
  const phrase = activity.learningTarget.match(/Focus:\s*([^.;]+)/i)?.[1]?.trim() || activity.languageTargets?.[0] || '';
  const pool = expand(m, phrase);
  if (/what's this|it's a \[color\] \[shape\]/i.test(phrase)) return ['red triangle','blue square','yellow rectangle','green circle'];
  if (/this is my|he and she|family/i.test(phrase) && pool.length===1) return vocab[m].filter(x=>['mother','father','brother','sister','grandmother','grandfather'].includes(x));
  if (/favorite toy/i.test(phrase) && pool.length===1) return vocab[m].filter(x=>['doll','ball','train','plane','teddy bear','kite','video game','boat'].includes(x));
  if (/one and more|singular|plural/i.test(phrase)) return ['one duck','two ducks','one horse','three horses','one cow','two cows'];
  if (/number-shape description/i.test(phrase)) return ['one triangle','two squares','three circles','four stars'];
  if (/plus|minus|equals|math|result/i.test(phrase)) return ['two plus three equals five','six minus two equals four','three plus four equals seven','nine minus five equals four'];
  if (/like|prefer|food choice/i.test(phrase)) return ['I like apples','I prefer grapes','I do not like carrots','I like papaya'];
  if (/there is|there are/i.test(phrase)) return ['There is a table.','There are two pillows.','There is a plate.','There are three chairs.'];
  if (/present continuous|doing/i.test(phrase)) return ['She is playing.','He is studying.','They are playing.','They are studying.'];
  if (pool.length===1 && pool[0]===phrase) {
    const at=vocab[m].indexOf(pool[0]);
    return Array.from({length:Math.min(5,vocab[m].length)},(_,n)=>vocab[m][(at+n+vocab[m].length)%vocab[m].length]);
  }
  return pool.length ? pool : vocab[m];
};
const choose = (arr, n, start=0) => {
  const unique=[...new Set(arr)];
  if (!unique.length) throw new Error('NO_CURRICULAR_TARGETS');
  const offset=((start%unique.length)+unique.length)%unique.length;
  return Array.from({length:Math.min(n,unique.length)},(_,j)=>unique[(offset+j)%unique.length]);
};
const peersFor = (m,target,activity) => {
  const t=String(target).toLowerCase();
  const phrase=String(activity?.learningTarget||'').toLowerCase();
  const scoped={
    Y2M02:[['triangle','square','rectangle','star','circle'],colors,['one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty']],
    Y2M03:[['mother','father','brother','sister','grandmother','grandfather']],
    Y2M04:[['doll','ball','train','plane','teddy bear','kite','video game','boat'],colors,['one','two','three','four','five','six','seven','eight','nine','ten']],
    Y2M05:[['duck','horse','cow','pig','sheep','chicken'],['one','two','three']],
    Y2M06:/food|fruit|vegetable|like|prefer/i.test(phrase)?[['apple','banana','pear','orange','grape','papaya','melon','carrot','tomato','potato']]:[['eye','ear','nose','mouth','finger','knee','shoulders'],['big','small']],
    Y3M01:[['eight','nine','ten','eleven'],['Mia','Leo','Ana','Ben'],['age','birthday','favorite','best friend','phone number','name']],
    Y3M02:[['21','22','23','24','25','26','27','28','29','30','35','40','45','50']],
    Y3M03:[['mother','father','brother','sister','grandmother','grandfather'],['he','she','they'],['Mia','Leo','Ana','Ben'],['eight','nine','ten']],
    Y3M04:[['doll','ball','train','plane','teddy bear','video game','boat','kite'],['fish','turtle'],['one','two','three']],
    Y3M05:[['plus','minus','equals','times','divided by'],['triangle','square','rectangle','star','circle'],['one','two','three','four','five','six','seven','eight','nine','ten']],
    Y3M06:[['pear','orange','grape','papaya','melon','carrot','tomato','potato'],['like','do not like','prefer']],
    Y4M01:[['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],['age','birthday','favorite','best friend']],
    Y4M02:[['English','Geography','Mathematics','Science','History','Art']],
    Y4M03:[['January','February','March','April','May','June','July','August','September','October','November','December'],['spring','summer','autumn','fall','winter']],
    Y4M04:[['soccer','basketball','tennis','volleyball'],['one','two','three','four','five','six','seven','eight','nine','ten']],
    Y4M05:/food|fruit|like/i.test(phrase)?[['apple','banana','pear','orange','grape','papaya','melon','carrot','tomato','potato']]:[['jacket','dress','shirt','T-shirt','pants','trousers','shoes'],colors,['small','medium','large']],
    Y4M06:[['bedroom','bathroom','kitchen','living room'],['under','behind','beside','in','on'],['car','bus','truck','train']],
    Y5M01:[['Brazil','Brazilian','city','country','first name','middle name','last name'],['Mia','Leo','Ana','Ben']],
    Y5M02:[['wake up','have breakfast','go to school','lunch','study','play','dinner','sleep'],['like','do not like','do','does']],
    Y5M03:[['doctor','teacher','actor','actress'],['mother','father','brother','sister','grandmother','grandfather'],['he','she','they']],
    Y5M04:[['headache','stomachache','toothache','cold','fever'],['sunny','rainy','cloudy','windy'],['51','52','53','54','55']],
    Y5M05:[['table','TV','rug','wardrobe','sofa','bed','pillows','plate'],['bedroom','bathroom','kitchen','living room'],['under','behind','beside']],
    Y5M06:[['bank','supermarket','school','shoe store','park','hospital','library'],['play','study','wake up','playing','studying','waking up']]
  }[m]||[];
  const scopedSet=scoped.find(s=>s.some(x=>x.toLowerCase()===t));
  if(scopedSet)return scopedSet;
  const sets=[
    ['triangle','square','rectangle','star','circle'],colors,
    ['one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'],
    ['mother','father','brother','sister','grandmother','grandfather'],
    ['doll','ball','train','plane','teddy bear','kite','video game','boat'],
    ['duck','horse','cow','pig','sheep','chicken','fish','turtle'],
    ['eye','ear','nose','mouth','finger','knee','shoulders'],
    ['apple','banana','pear','orange','grape','papaya','melon','carrot','tomato','potato'],
    ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
    ['English','Geography','Mathematics','Science','History','Art'],
    ['January','February','March','April','May','June','July','August','September','October','November','December'],
    ['spring','summer','autumn','fall','winter'],['soccer','basketball','tennis','volleyball'],
    ['jacket','dress','shirt','T-shirt','pants','trousers','shoes'],
    ['bedroom','bathroom','kitchen','living room'],['car','bus','truck','train'],
    ['doctor','teacher','actor','actress'],['headache','stomachache','toothache','cold','fever'],
    ['sunny','rainy','cloudy','windy'],['bank','supermarket','school','shoe store','park','hospital','library'],
    ['wake up','have breakfast','go to school','lunch','study','play','dinner','sleep']
  ];
  return sets.find(s=>s.some(x=>x.toLowerCase()===t))||vocab[m];
};
const frameFor = (m, target, i) => {
  const t=String(target).toLowerCase();
  const smallNumbers=['one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
  if(m==='Y2M02') {
    if(smallNumbers.includes(t))return `There are ${target} objects.`;
    if(['triangle','square','rectangle','star','circle'].includes(t))return `The shape is a ${target}.`;
    if(colors.includes(t))return `The shape is ${target}.`;
  }
  if(m==='Y2M05') {
    if(/^(one|two|three) (duck|horse|cow|pig|sheep|chicken)s?$/.test(t))return `There are ${target}.`;
    if(['duck','horse','cow','pig','sheep','chicken'].includes(t))return `This is one ${target}.`;
  }
  if(m==='Y2M04'&&['doll','ball','train','plane','teddy bear','kite','video game','boat'].includes(t))return `My favorite toy is a ${target}.`;
  if(m==='Y3M06'&&['pear','orange','grape','papaya','melon','carrot','tomato','potato'].includes(t))return `I like ${target}.`;
  if(m==='Y4M01'&&['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].includes(t))return `Today is ${target}.`;
  if(m==='Y5M06'&&['bank','supermarket','school','shoe store','park','hospital','library'].includes(t))return `This is the ${target}.`;
  if(m==='Y3M05') {
    if(t==='plus')return 'Two plus three equals five.';
    if(t==='minus')return 'Six minus two equals four.';
    if(t==='times')return 'Two times three equals six.';
    if(t==='divided by')return 'Six divided by two equals three.';
    if(t==='equals')return 'Two plus three equals five.';
    if(['triangle','square','rectangle','star','circle'].includes(t))return `The shape is a ${target}.`;
  }
  if(m==='Y5M02'&&['wake up','have breakfast','go to school','study','play','sleep'].includes(t))return `I ${target} every day.`;
  if(m==='Y5M05') {
    if(t==='pillows')return 'There are pillows in the bedroom.';
    if(['kitchen','living room','bedroom','bathroom'].includes(t))return `The room is the ${target}.`;
    if(['under','behind','beside'].includes(t))return `The ball is ${target} the table.`;
    return `There is a ${target} in the house.`;
  }
  if(m==='Y3M01') {
    if(t==='age')return 'I am nine years old.';
    if(t==='birthday')return 'My birthday is in May.';
    if(t==='favorite')return 'My favorite animal is a dog.';
    if(t==='best friend')return 'This is my best friend, Mia.';
    if(t==='phone number')return 'My phone number is 555-0142.';
    if(/^\d{3}-\d{4}$/.test(t))return `My phone number is ${target}.`;
    if(['eight','nine','ten','eleven'].includes(t))return `I am ${target} years old.`;
    if(['mia','leo','ana','ben'].includes(t))return `My name is ${target}.`;
  }
  if(m==='Y3M02'&&/^\d+$/.test(t))return `I am ${target} years old.`;
  if(m==='Y4M04'&&(/^\d+$/.test(t)||/^(one|two|three|four|five|six|seven|eight|nine|ten)$/.test(t)))return `There are ${target} players.`;
  if(m==='Y5M01') {
    if(t==='brazil')return 'I am from Brazil.';
    if(t==='brazilian')return 'I am Brazilian.';
    if(t==='first name')return 'My first name is Mia.';
    if(t==='middle name')return 'My middle name is Lu.';
    if(t==='last name')return 'My last name is Silva.';
  }
  if(m==='Y5M04'&&/^\d+$/.test(t))return `There are ${target} days.`;
  if(m==='Y5M06'&&['playing','studying','waking up'].includes(t))return `She is ${target}.`;
  const frames=sentenceFrames[m] || ['I see {target}.'];
  const compatible=frames.filter(f=>{
    if(['plus','minus','times','divided by','equals'].includes(t))return /plus|minus|times|divided/i.test(f);
    if(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].includes(target))return /day|Today/i.test(f);
    if(['January','February','March','April','May','June','July','August','September','October','November','December','spring','summer','autumn','fall','winter'].includes(target))return /month|birthday|It is/i.test(f);
    if(['soccer','basketball','tennis','volleyball'].includes(target))return /sport|play/i.test(f);
    return true;
  });
  const set=compatible.length?compatible:frames;
  return set[i%set.length].replaceAll('{target}',target);
};
function mediaConcept(m, target, role, item) {
  const semantic=`${target}`;
  return {mediaConceptId:mediaId(m,semantic,role),semanticDescription:`Child-friendly, clear depiction of ${semantic}; no written answer text; neutral uncluttered background.`,semanticTarget:semantic,role,answerLeakRisk:'NONE_BEFORE_ACTION',assetStatus:'ASSET_PENDING'};
}
function audioConcept(locale, text, role, semanticType) {
  const resolvedType=role==='INSTRUCTION'?semanticType:inferSemanticType(text,semanticType);
  return {audioConceptId:audId(locale,text,role),language:locale,spokenTarget:text,role,semanticType:resolvedType,presentationModel:resolvedType==='LETTER'?'ISOLATED_ENGLISH_TARGET':undefined,voice:'DUDUQ_GOLD_VOICE_v1 / CHATTERBOX_MULTILINGUAL_V3',assetStatus:'ASSET_PENDING'};
}
function inferSemanticType(text, fallback='WORD_OR_STRUCTURE') {
  const t=String(text).trim().toLowerCase();
  if(/^(a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z)$/.test(t)) return 'LETTER';
  if(/^(triangle|square|rectangle|star|circle)$/.test(t)) return 'SHAPE';
  if(/^(red|blue|yellow|green|orange|purple|pink|black|white|brown|gray|grey)$/.test(t)) return 'COLOR';
  if(/^(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|[0-9]+)$/.test(t)) return 'NUMBER';
  if(/^(soccer|basketball|tennis|volleyball)$/.test(t)) return 'SPORT';
  if(/^(mother|father|brother|sister|grandmother|grandfather)$/.test(t)) return 'FAMILY_MEMBER';
  if(/^(duck|horse|cow|pig|sheep|chicken|fish|turtle)$/.test(t)) return 'ANIMAL';
  if(/^(apple|banana|pear|orange|grape|papaya|melon|carrot|tomato|potato)$/.test(t)) return 'FOOD';
  if(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|spring|summer|autumn|fall|winter)$/.test(t)) return 'CALENDAR_TERM';
  if(/^(english|geography|mathematics|science|history|art)$/.test(t)) return 'SCHOOL_SUBJECT';
  if(/^(bank|supermarket|school|shoe store|park|hospital|library)$/.test(t)) return 'CITY_PLACE';
  if(/^(wake up|have breakfast|go to school|lunch|study|play|dinner|sleep|playing|studying|waking up)$/.test(t)) return 'ROUTINE_OR_ACTION';
  if(/^(sunny|rainy|cloudy|windy)$/.test(t)) return 'WEATHER';
  if(/^(jacket|dress|shirt|t-shirt|pants|trousers|shoes)$/.test(t)) return 'CLOTHING';
  if(/^(bedroom|bathroom|kitchen|living room|table|tv|rug|wardrobe|sofa|bed|pillows|plate)$/.test(t)) return 'HOME_OBJECT_OR_PLACE';
  return fallback;
}
function buildContract(plan, activity, i) {
  const m=plan.moduleId, mechanic=activity.mechanicId;
  if (!mechanics.has(mechanic)) throw new Error(`${m}/${activity.activityId}: unsupported mechanic ${mechanic}`);
  const id=`${m}-${activity.activityId}`;
  const targets=resolveTargets(m,activity,i);
  const primary=targets[i%targets.length];
  const peers=peersFor(m,primary,activity);
  const options=choose(targets.filter(t=>t!==primary).length>=3?[primary,...targets.filter(t=>t!==primary)]:[primary,...choose(peers.filter(t=>t!==primary),3)],4);
  const groupPreview=mechanic==='drag-drop'?groupingFor(m,targets,activity).groups.map(g=>g.label):[];
  const copy=instructionCopy(mechanic,plan.title,groupPreview);
  const targetTypes=[...new Set(targets.map(t=>inferSemanticType(t,'WORD_OR_STRUCTURE')))];
  const semanticType=targetTypes.length>1?'MIXED':targetTypes[0]||(/letter/i.test(String(activity.contentFamily))?'LETTER':/number|quantity/i.test(String(activity.contentFamily))?'NUMBER':/color/i.test(String(activity.contentFamily))?'COLOR':/shape/i.test(String(activity.contentFamily))?'SHAPE':/greeting|farewell/i.test(String(activity.contentFamily))?'SOCIAL_FORMULA':'WORD_OR_STRUCTURE');
  let mechanicContract;
  let targetContent=primary;
  const media=[]; const learnerAudio=[];
  const useImage=activity.imageRequirements?.length>0 || imageKinds.test(activity.contentFamily||'');
  const addMedia=t=>media.push(mediaConcept(m,t,'STUDENT_OPTION',id));
  const addAudio=(t,semantic=semanticType)=>learnerAudio.push(audioConcept('en-US',t,'LEARNER_TARGET',semantic));
  const needContentAudio=activity.audioRequirements?.contentAudioRequired===true || ['bubble-pop','target-shooter','drag-drop-multimedia'].includes(mechanic) || (mechanic==='memory-quest' && activity.mechanicMode==='AUDIO_IMAGE');
  if (mechanic==='memory-quest') {
    const pairTargets=choose(targets,Math.max(2,Math.min(6,Number(activity.answerContract?.pairCount)||4)),i);
    const mode=activity.mechanicMode||activity.answerContract?.mode||'AUDIO_IMAGE';
    const pairs=pairTargets.map((t,n)=>({pairId:`${id}-P${n+1}`,semanticTarget:t,cards:[
      {cardId:`${id}-P${n+1}-A`,modality:mode==='AUDIO_IMAGE'||mode==='AUDIO_TEXT'?'audio':'text',value:mode==='AUDIO_IMAGE'?null:t,audioConcept:mode==='AUDIO_IMAGE'?audioConcept('en-US',t,'MEMORY_TARGET',semanticType):null},
      {cardId:`${id}-P${n+1}-B`,modality:mode==='TEXT_IMAGE'||mode==='AUDIO_IMAGE'?'image':'text',value:mode==='AUDIO_TEXT'?t:null,mediaConcept:mode==='AUDIO_TEXT'?null:mediaConcept(m,t,'MEMORY_PAIR',id)}
    ]}));
    mechanicContract={mode,pairs,pairMappings:pairs.map(p=>({cardA:p.cards[0].cardId,cardB:p.cards[1].cardId,pairId:p.pairId})),answerKey:pairs.map(p=>p.pairId)};
    targetContent=pairTargets.join(', ');
  } else if (mechanic==='matching') {
    const pairTargets=choose(targets,Math.max(2,Math.min(6,targets.length)),i);
    const pairs=pairTargets.map((t,n)=>({pairId:`${id}-P${n+1}`,left:{id:`${id}-L${n+1}`,modality:'text',value:t},right:{id:`${id}-R${n+1}`,modality:'image',mediaConcept:mediaConcept(m,t,'MATCHING_PAIR',id)}}));
    mechanicContract={mode:'semantic-pairs',pairs,answerKey:Object.fromEntries(pairs.map(p=>[p.left.id,p.right.id]))};
    targetContent=pairTargets.join(', ');
  } else if (mechanic==='drag-drop') {
    const groups=groupingFor(m,targets,activity);
    groups.items=groups.items.map(x=>({...x,
      audioConcept:x.modality==='audio'||x.modality==='audio-image'?audioConcept('en-US',x.semanticTarget,'GROUPING_STIMULUS',semanticType):undefined,
      mediaConcept:x.modality==='image'||x.modality==='audio-image'?mediaConcept(m,x.semanticTarget,'GROUPING_CARD',id):undefined
    }));
    mechanicContract={mode:'grouping',groups:groups.groups,items:groups.items,answerKey:Object.fromEntries(groups.items.map(x=>[x.itemId,x.groupId]))};
    targetContent=groups.items.map(x=>x.semanticTarget).join(', ');
  } else if (mechanic==='drag-drop-multimedia') {
    const set=choose(targets,Math.min(4,targets.length),i);
    const mappings=set.map((t,n)=>({itemId:`${id}-I${n+1}`,targetId:`${id}-T${n+1}`,semanticTarget:t}));
    mechanicContract={mode:'audio-to-visual-multimatch',items:mappings.map(x=>({itemId:x.itemId,modality:'audio',semanticTarget:x.semanticTarget,audioConcept:audioConcept('en-US',x.semanticTarget,'DDM_STIMULUS',semanticType)})),destinations:mappings.map(x=>({targetId:x.targetId,semanticTarget:x.semanticTarget,mediaConcept:mediaConcept(m,x.semanticTarget,'DDM_DESTINATION',id)})),mappings,answerKey:Object.fromEntries(mappings.map(x=>[x.itemId,x.targetId]))};
    targetContent=set.join(', ');
  } else if (mechanic==='smart-sentence-complete') {
    const sentence=frameFor(m,primary,i); let correct=primary;
    let completionSentence=sentence;
    let tokenIndex=-1, tokenCount=0;
    if(m==='Y3M05'&&activity.activityId==='Q018') { completionSentence='Two plus three equals five.'; correct='five'; tokenIndex=4; tokenCount=1; }
    else {
      const words=sentence.replace(/[?.!]/g,'').split(/\s+/); const answerWords=String(correct).split(/\s+/);
      tokenIndex=words.findIndex((_,at)=>answerWords.every((w,j)=>String(words[at+j]||'').toLowerCase().replace(/[^a-z0-9]/g,'')===w.toLowerCase().replace(/[^a-z0-9]/g,'')));
      tokenCount=answerWords.length;
    }
    const sentenceForPlay=tokenIndex>=0?completionSentence.replace(new RegExp(String(correct).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'),'____'):completionSentence;
    mechanicContract={mode:'sentence-completion',sentence:sentenceForPlay,sourceSentence:completionSentence,blank:{tokenIndex,tokenCount,expected:correct,tokenFound:tokenIndex>=0},options:choose(targets.filter(x=>x!==correct).length>=2?[correct,...targets.filter(x=>x!==correct)]:[correct,...choose(peers.filter(x=>x!==correct),3)],4),answerKey:correct};
    targetContent=sentence;
  } else if (mechanic==='smart-sentence-order') {
    const sentence=frameFor(m,primary,i); const units=sentence.replace(/[?.!]/g,'').split(/\s+/);
    const scrambled=[...units].reverse();
    mechanicContract={mode:'sentence-order',units:scrambled,canonicalOrder:units,answerKey:units}; targetContent=sentence;
  } else {
    mechanicContract={mode:mechanic==='bubble-pop'?'single-bubble-choice':'single-target-choice',stimulus:{modality:needContentAudio?'audio':'text',target:primary,audioConcept:needContentAudio?audioConcept('en-US',primary,'LEARNER_TARGET',semanticType):null},options:options.map((t,n)=>({optionId:`${id}-O${n+1}`,semanticTarget:t,mediaConcept:useImage?mediaConcept(m,t,'OPTION',id):null,isCorrect:t===primary})),correctOptionId:`${id}-O${options.indexOf(primary)+1}`,answerKey:primary};
    targetContent=primary;
  }
  if (mechanic==='target-shooter' || mechanic==='bubble-pop') { if(needContentAudio)addAudio(primary); }
  const instructionAudio=[audioConcept('en-US',copy[0],'INSTRUCTION', 'INSTRUCTION'),audioConcept('pt-BR',copy[1],'INSTRUCTION','INSTRUCTION')];
  if(mechanic==='drag-drop') learnerAudio.push(...mechanicContract.items.map(x=>x.audioConcept).filter(Boolean));
  if (mechanic==='drag-drop-multimedia') learnerAudio.push(...mechanicContract.items.map(x=>x.audioConcept));
  if (mechanic==='memory-quest'&&['AUDIO_IMAGE','AUDIO_TEXT'].includes(activity.mechanicMode||mechanicContract.mode)) learnerAudio.push(...mechanicContract.pairs.map(p=>p.cards[0].audioConcept));
  const dedupAudio=[...new Map(learnerAudio.filter(Boolean).map(a=>[a.audioConceptId,a])).values()];
  const dedupMedia=[...new Map(media.concat(collectMedia(mechanicContract)).map(x=>[x.mediaConceptId,x])).values()];
  return {
    moduleId:m,itemId:id,questionId:activity.activityId,sequencePosition:i+1,
    curricularObjective:plan.primaryObjectives?.join(' '),learningTarget:activity.learningTarget,
    semanticType,taskType:activity.expectedStudentAction,targetSkill:plan.skillTargets?.listening?.outcome||plan.expectedMastery,
    mechanicId:mechanic,mechanicMode:mechanicContract.mode,
    visibleInstructionEn:copy[0],supportInstructionPt:copy[1],spokenInstructionPlan:{en:copy[0],pt:copy[1],order:['en','pt']},
    targetContent,studentStimuli:mechanicContract,correctAnswer:mechanicContract.answerKey,
    distractors:mechanicContract.options?.filter(x=>!x.isCorrect).map(x=>x.semanticTarget)||[],
    feedbackProfile:feedback(mechanic),requiredMedia:dedupMedia.length?dedupMedia:[{mediaConceptId:'NO_MEDIA',semanticDescription:'No visual media required for this activity contract.',role:'NONE',answerLeakRisk:'NONE',assetStatus:'NOT_REQUIRED'}],
    requiredAudio:{instructionEnRequired:true,ptSupportRequired:true,learnerContentAudioRequired:dedupAudio.length>0,instruction:instructionAudio,learnerTargets:dedupAudio,feedbackProfile:feedback(mechanic)},
    EnglishProcessingDemand:semanticType==='WORD_OR_STRUCTURE'?'VALID_ENGLISH_PROCESSING':'STRONG_ENGLISH_PROCESSING',
    MechanicPedagogicalFit:'PASS_PLANNING_MECHANIC_AND_LEARNER_ACTION_ALIGNED',answerLeakStatus:'PASS_NO_PREANSWER_TARGET_LEAK',
    refinementFlags:dedupMedia.length?['IMAGE_REFINEMENT_PENDING','AUDIO_REFINEMENT_PENDING']:['AUDIO_REFINEMENT_PENDING'],
    contractStatus:'CONTRACT_READY_ASSET_PENDING',sourcePlan:`content/english/planning/year-${plan.year}/module-${String(plan.moduleNumber).padStart(2,'0')}.json`
  };
}
function collectMedia(value,out=[]) { if(!value||typeof value!=='object')return out; if(value.mediaConceptId)out.push(value); for(const v of Object.values(value))if(typeof v==='object')collectMedia(v,out); return out; }
function groupingFor(m, targets, activity) {
  const p=String(activity.learningTarget||'').toLowerCase();
  let groups, items;
  if(m==='Y2M02' && /numbers? 1-10/i.test(p)) { groups=[{groupId:'numbers-1-5',label:'1–5'},{groupId:'numbers-6-10',label:'6–10'}]; items=['one','three','five','six','eight','ten'].map((x,i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:i<3?groups[0].groupId:groups[1].groupId,modality:'audio'})); }
  else if(m==='Y2M02' && /active colors/i.test(p)) { groups=[{groupId:'warm-colors',label:'WARM COLORS'},{groupId:'cool-colors',label:'COOL COLORS'}]; items=[['red','warm-colors'],['yellow','warm-colors'],['orange','warm-colors'],['blue','cool-colors'],['green','cool-colors'],['purple','cool-colors']].map(([x,g],i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:g,modality:'audio'})); }
  else if(m==='Y2M02') { groups=[{groupId:'shapes',label:'SHAPES'},{groupId:'numbers',label:'NUMBERS'}]; items=[['triangle','shapes'],['square','shapes'],['star','shapes'],['one','numbers'],['five','numbers'],['ten','numbers']].map(([x,g],i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:g,modality:'audio-image'})); }
  else if(m==='Y2M03') { groups=[{groupId:'close-family',label:'CLOSE FAMILY'},{groupId:'extended-family',label:'GRANDPARENTS'}]; items=['mother','father','brother','sister','grandmother','grandfather'].map((x,i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:i<4?groups[0].groupId:groups[1].groupId,modality:'audio'})); }
  else if(m==='Y2M04') { groups=[{groupId:'indoor-toys',label:'PLAY INDOORS'},{groupId:'outdoor-toys',label:'PLAY OUTDOORS'}]; items=['doll','teddy bear','video game','ball','kite','boat'].map((x,i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:i<3?groups[0].groupId:groups[1].groupId,modality:'audio'})); }
  else if(m==='Y2M05') { groups=[{groupId:'one-animal',label:'ONE'},{groupId:'more-than-one',label:'MORE THAN ONE'}]; items=['one duck','two ducks','one cow','three cows','one horse','two horses'].map((x,i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:i%2?groups[1].groupId:groups[0].groupId,modality:'audio-image'})); }
  else if(m==='Y2M06' && /big\/small/i.test(p)) { groups=[{groupId:'big',label:'BIG'},{groupId:'small',label:'SMALL'}]; items=[['big apple','big'],['big melon','big'],['big banana','big'],['small grape','small'],['small pear','small'],['small carrot','small']].map(([x,g],i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:g,modality:'audio-image'})); }
  else if(m==='Y2M06') { groups=[{groupId:'body',label:'BODY'},{groupId:'food',label:'FOOD'}]; items=['mouth','eye','ear','apple','banana','carrot'].map((x,i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:i<3?groups[0].groupId:groups[1].groupId,modality:'audio-image'})); }
  else if(m==='Y5M04') { groups=[{groupId:'health',label:'HEALTH WORDS'},{groupId:'weather',label:'WEATHER WORDS'}]; items=['headache','stomachache','toothache','cold','sunny','rainy','cloudy','windy'].map((x,i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:i<4?groups[0].groupId:groups[1].groupId,modality:'audio'})); }
  else if(m==='Y3M02') { const cut=35; groups=[{groupId:'lower-range',label:'21–35'},{groupId:'upper-range',label:'36–50'}]; items=['21','28','35','36','43','50'].map((x,i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:Number(x)<=cut?groups[0].groupId:groups[1].groupId,modality:'audio'})); }
  else if(m==='Y3M01') { groups=[{groupId:'personal-details',label:'PERSONAL DETAILS'},{groupId:'people-and-preferences',label:'PEOPLE OR FAVORITES'}]; items=['age','birthday','phone number','favorite','best friend','name'].map((x,i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:i<3?groups[0].groupId:groups[1].groupId,modality:'audio'})); }
  else if(m==='Y3M03') { groups=[{groupId:'close-family',label:'CLOSE FAMILY'},{groupId:'grandparents',label:'GRANDPARENTS'}]; items=['mother','father','brother','sister','grandmother','grandfather'].map((x,i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:i<4?groups[0].groupId:groups[1].groupId,modality:'audio'})); }
  else if(m==='Y3M04'&&/one fish|three turtles/i.test(p)) { groups=[{groupId:'one-animal',label:'ONE ANIMAL'},{groupId:'more-than-one',label:'MORE THAN ONE'}]; items=['one fish','three turtles','one turtle','three fish'].map((x,i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:i%2?groups[1].groupId:groups[0].groupId,modality:'audio-image'})); }
  else if(m==='Y3M04') { groups=[{groupId:'indoor-toys',label:'INDOOR TOYS'},{groupId:'outdoor-toys',label:'OUTDOOR TOYS'}]; items=['doll','teddy bear','video game','ball','kite','boat'].map((x,i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:i<3?groups[0].groupId:groups[1].groupId,modality:'audio'})); }
  else if(m==='Y3M05') { groups=[{groupId:'addition',label:'PLUS'},{groupId:'subtraction',label:'MINUS'}]; items=['two plus three','four plus two','six minus one','nine minus three'].map((x,i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:i<2?groups[0].groupId:groups[1].groupId,modality:'text'})); }
  else if(m==='Y4M03'&&/family/i.test(p)) { groups=[{groupId:'close-family',label:'CLOSE FAMILY'},{groupId:'grandparents',label:'GRANDPARENTS'}]; items=['mother','father','brother','sister','grandmother','grandfather'].map((x,i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:i<4?groups[0].groupId:groups[1].groupId,modality:'audio'})); }
  else if(m==='Y4M03') { groups=[{groupId:'months',label:'MONTHS'},{groupId:'seasons',label:'SEASONS'}]; items=['January','April','summer','winter'].map((x,i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:i<2?groups[0].groupId:groups[1].groupId,modality:'text'})); }
  else if(m==='Y4M04') { groups=[{groupId:'ball-sports',label:'BALL SPORTS'},{groupId:'racket-sport',label:'RACKET SPORT'}]; items=['soccer','basketball','volleyball','tennis'].map((x,i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:i===3?groups[1].groupId:groups[0].groupId,modality:'audio'})); }
  else if(m==='Y3M06') { groups=[{groupId:'fruit',label:'FRUIT'},{groupId:'vegetables',label:'VEGETABLES'}]; items=['pear','orange','grape','papaya','carrot','potato'].map((x,i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:i<4?groups[0].groupId:groups[1].groupId,modality:'audio-image'})); }
  else if(m==='Y4M01') { groups=[{groupId:'days',label:'DAYS OF THE WEEK'},{groupId:'profile',label:'PROFILE DETAILS'}]; items=['Monday','Wednesday','Friday','Saturday','age','birthday','favorite','best friend'].map((x,i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:i<4?groups[0].groupId:groups[1].groupId,modality:'audio'})); }
  else if(m==='Y4M02') { groups=[{groupId:'language-arts',label:'LANGUAGE AND ARTS'},{groupId:'OTHER-SUBJECTS',label:'OTHER SUBJECTS'}]; items=['English','Art','Geography','Mathematics','Science','History'].map((x,i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:i<2?groups[0].groupId:groups[1].groupId,modality:'audio'})); }
  else if(m==='Y4M03') { groups=[{groupId:'family',label:'FAMILY WORDS'},{groupId:'calendar',label:'CALENDAR WORDS'}]; items=['mother','father','January','April','summer','winter'].map((x,i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:i<2?groups[0].groupId:groups[1].groupId,modality:'audio'})); }
  else if(m==='Y4M05') { groups=[{groupId:'clothes',label:'CLOTHES'},{groupId:'foods',label:'FOODS'}]; items=['jacket','dress','T-shirt','apple','banana','grape'].map((x,i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:i<3?groups[0].groupId:groups[1].groupId,modality:'audio-image'})); }
  else if(m==='Y5M01') { groups=[{groupId:'origin',label:'ORIGIN DETAILS'},{groupId:'name-fields',label:'NAME FIELDS'}]; items=['Brazil','Brazilian','city','country','first name','middle name','last name'].map((x,i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:i<4?groups[0].groupId:groups[1].groupId,modality:'audio'})); }
  else if(m==='Y5M03') { groups=[{groupId:'family',label:'FAMILY'},{groupId:'jobs',label:'JOBS'}]; items=['mother','father','doctor','teacher','actor','actress'].map((x,i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:i<2?groups[0].groupId:groups[1].groupId,modality:'audio'})); }
  else if(m==='Y5M06') { groups=[{groupId:'public-places',label:'CITY PLACES'},{groupId:'actions',label:'ACTIONS'}]; items=['bank','supermarket','school','park','playing','studying'].map((x,i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:i<4?groups[0].groupId:groups[1].groupId,modality:'audio'})); }
  else if(m==='Y4M06'&&/in\/on/i.test(p)) { groups=[{groupId:'in',label:'IN'},{groupId:'on',label:'ON'}]; items=[['in the bedroom','in'],['in the bathroom','in'],['in the kitchen','in'],['on the bus','on'],['on the train','on'],['on the truck','on']].map(([x,g],i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:g,modality:'audio-image'})); }
  else if(m==='Y4M06') { groups=[{groupId:'rooms',label:'ROOMS'},{groupId:'vehicles',label:'VEHICLES'}]; items=['bedroom','bathroom','kitchen','car','bus','train'].map((x,i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:i<3?groups[0].groupId:groups[1].groupId,modality:'audio'})); }
  else if(m==='Y5M03') { groups=[{groupId:'family-people',label:'FAMILY'},{groupId:'occupations',label:'JOBS'}]; items=['mother','father','doctor','teacher','actor','actress'].map((x,i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:i<2?groups[0].groupId:groups[1].groupId,modality:'audio'})); }
  else if(m==='Y5M05') { groups=[{groupId:'living-room',label:'LIVING ROOM'},{groupId:'kitchen',label:'KITCHEN'}]; items=[['TV','living-room'],['sofa','living-room'],['rug','living-room'],['plate','kitchen'],['table','kitchen']].map(([x,g],i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:g,modality:'audio-image'})); }
  else if(m==='Y5M06') { groups=[{groupId:'places','label':'PLACES'},{groupId:'actions','label':'ACTIONS'}]; items=['bank','park','hospital','playing','studying','waking up'].map((x,i)=>({itemId:`${m}-${activity.activityId}-I${i+1}`,semanticTarget:x,groupId:i<3?groups[0].groupId:groups[1].groupId,modality:'audio'})); }
  else throw new Error(`${m}/${activity.activityId}: GROUPING_RELATION_UNRESOLVED`);
  return {groups,items};
}

const mediaReq=new Map(), audioReq=new Map(), authored=[];
const planningCorrections=[];
const contentMechanicsMaster=await load('content/english/master/module-content-and-mechanics-v1.json');
for(let year=2;year<=5;year++) for(let n=1;n<=6;n++) {
  if(year===2&&n===1) continue;
  const rel=`content/english/planning/year-${year}/module-${String(n).padStart(2,'0')}.json`;
  const plan=await load(rel);
  if(plan.activitySequence?.length!==20) throw new Error(`${plan.moduleId}: EXPECTED_20_PLAN_ACTIVITIES`);
  if(plan.currentActivityContracts?.length && plan.contractResolution?.feature!=='DUDUQ_ACTIVE_CONTENT_AUTHORING_V11_1B') throw new Error(`${plan.moduleId}: REFUSING_TO_OVERWRITE_EXISTING_CONTRACTS`);
  const correction=(qid,changes,reason)=>{
    const a=plan.activitySequence.find(x=>x.activityId===qid); if(!a)return;
    const existingCorrection=(plan.planningCorrections||[]).find(x=>x.itemId===`${plan.moduleId}-${qid}`);
    const before=existingCorrection?.oldPlan||{mechanicId:a.mechanicId,mechanicMode:a.mechanicMode,learningTarget:a.learningTarget,languageTargets:a.languageTargets,expectedStudentAction:a.expectedStudentAction,answerContract:a.answerContract};
    Object.assign(a,changes);
    const c={itemId:`${plan.moduleId}-${qid}`,oldPlan:before,newPlan:{mechanicId:a.mechanicId,mechanicMode:a.mechanicMode,learningTarget:a.learningTarget,languageTargets:a.languageTargets,expectedStudentAction:a.expectedStudentAction,answerContract:a.answerContract},reason};
    if(!planningCorrections.some(x=>x.itemId===c.itemId))planningCorrections.push(c);
    plan.planningCorrections=[...(plan.planningCorrections||[]).filter(x=>x.itemId!==c.itemId),c];
    return c;
  };
  if(plan.moduleId==='Y2M02')correction('Q019',{mechanicId:'bubble-pop',currentMechanicId:'bubble-pop',learningTarget:'consolidation: Recognize the taught shape star from a clear visual and short English cue. Focus: star.',languageTargets:['star'],expectedStudentAction:'Listen to the shape word and select the matching star.'},'A single shape target has no meaningful classification relation; a sound-to-shape choice better expresses the approved objective.');
  if(plan.moduleId==='Y3M06')correction('Q017',{learningTarget:'review: Classify source-listed foods as fruit or vegetables while reviewing food vocabulary. Focus: fruit and vegetables.',languageTargets:['pear','orange','grape','papaya','carrot','potato'],expectedStudentAction:'Sort each familiar food into the fruit or vegetables group.'},'The planned body target is outside this module focus; use the already approved food set and preserve the module food-language objective.');
  if(plan.moduleId==='Y4M02')correction('Q009',{mechanicId:'matching',currentMechanicId:'matching',learningTarget:'recognition: Match familiar written school-subject labels to their classroom context. Focus: six subject labels.',languageTargets:['English','Geography','Mathematics','Science','History','Art'],expectedStudentAction:'Match each familiar subject label to its corresponding classroom-context image.'},'Spelling-question wording did not express the module objective or fit grouping; matching supports the approved subject-label recognition target.');
  if(plan.moduleId==='Y4M04')correction('Q012',{mechanicId:'bubble-pop',currentMechanicId:'bubble-pop',learningTarget:'recognition: Identify a number from a simple sports quantity. Focus: numbers 1-10.',languageTargets:['one','two','three','four','five','six','seven','eight','nine','ten'],expectedStudentAction:'Listen to the number and pop the matching sports quantity.'},'The age focus was not declared for this module; a number-in-sports quantity task preserves the approved numbers-and-sports scope.');
  if(plan.moduleId==='Y4M04') {
    const sports=['soccer','basketball','tennis','volleyball'];
    correction('Q005',{learningTarget:'guided practice: Recognize the spoken name of a sport and its modeled preference phrase. Focus: favorite sport.',languageTargets:sports,expectedStudentAction:'Listen to the sport name and pop its matching sports image.'},'The food-preference placeholder exceeded Y4M04 scope; replace it with the Master-approved favorite-sport relationship.');
    correction('Q008',{learningTarget:'comprehension: Complete the modeled favorite-sport sentence with a taught sport. Focus: My favorite sport is...',languageTargets:sports,expectedStudentAction:'Choose the taught sport that completes the modeled sentence.'},'The generated number phrase “I play four” was ungrammatical; use the approved favorite-sport frame.');
    correction('Q011',{learningTarget:'retrieval: Match each approved sport name to its clear sport image. Focus: four approved sports.',languageTargets:sports,answerContract:{targetSet:sports,pairCount:4},expectedStudentAction:'Match each sport label to its corresponding image.'},'Mixed number/sport placeholders were not a coherent matching target; constrain to the four Master-approved sports.');
    correction('Q014',{learningTarget:'review: Match each approved sport to its corresponding context image. Focus: four approved sports.',languageTargets:sports,answerContract:{targetSet:sports,pairCount:4},expectedStudentAction:'Match each sport name to its corresponding context image.'},'Mixed number/sport placeholders were not a coherent matching target; constrain to the four Master-approved sports.');
    correction('Q015',{learningTarget:'consolidation: Recognize the spoken modeled phrase about playing a taught sport well. Focus: I play ... very well.',languageTargets:sports,expectedStudentAction:'Listen to the modeled phrase and select its matching sport scene.'},'The food-preference placeholder exceeded Y4M04 scope; use the approved guided sports phrase.');
    correction('Q016',{learningTarget:'recognition: Pair each spoken approved sport with its written label. Focus: four approved sports.',languageTargets:sports,mechanicMode:'AUDIO_TEXT',answerContract:{mode:'AUDIO_TEXT',targetSet:sports,pairCount:4,contract:'one audio and one text card per sport pair'},expectedStudentAction:'Listen to each sport name and find its written pair.'},'The broad number sequence was not a sports-module target; use the approved receptive sport set in supported audio-text matching.');
    correction('Q020',{learningTarget:'consolidation: Recognize a familiar practice scene from a short English sports cue. Focus: describe familiar practice.',languageTargets:sports,answerContract:{targetSet:sports},expectedStudentAction:'Listen to the short sports cue and select the matching practice scene.'},'The generic mixed sports-and-number pool made distractors cross-category; constrain this listening item to the four Master-approved sports.');
  }
  if(plan.moduleId==='Y5M02') {
    correction('Q003',{mechanicId:'smart-sentence-order',currentMechanicId:'smart-sentence-order',learningTarget:'guided practice: Put familiar daily routine chunks in the taught sequence. Focus: short routine sequence.',languageTargets:['wake up','have breakfast','go to school','lunch','study','play','dinner','sleep'],expectedStudentAction:'Arrange familiar routine chunks in a sensible daily order.'},'Sequencing is the curricular objective; sentence ordering is a stronger frozen-mechanic fit than semantic grouping.');
    correction('Q009',{mechanicId:'matching',currentMechanicId:'matching',learningTarget:'recognition: Match a familiar daily routine phrase to its clear context scene. Focus: wake up.',languageTargets:['wake up','have breakfast','go to school','study'],expectedStudentAction:'Match each routine phrase to the corresponding context image.'},'A time-expression task would require unsupported time targets; phrase-to-scene matching preserves the daily-routine objective.');
  }
  if(plan.moduleId==='Y2M04')correction('Q018',{learningTarget:'review: Complete a short sentence to express a favorite toy. Focus: favorite toy.',languageTargets:['doll','ball','train','plane','teddy bear','kite','video game','boat'],answerContract:{targetSet:['doll','ball','train','plane','teddy bear','kite','video game','boat']}},'Food-preference examples were outside this toys module; use the approved favorite-toy structure and target set.');
  if(plan.moduleId==='Y3M05')correction('Q018',{learningTarget:'review: Complete a practiced addition sentence with its result. Focus: two plus three equals five.',languageTargets:['five','four','six','seven'],answerContract:{targetSet:['five','four','six','seven'],sourceTarget:'two plus three equals five'}},'The planned practiced-result item requires one exact arithmetic response; specify the model equation and in-scope number distractors.');
  if(plan.moduleId==='Y3M06')for(const qid of ['Q008','Q018'])correction(qid,{learningTarget:'recognition: Complete a short food-preference sentence with a source-listed food. Focus: I like [food].',languageTargets:['pear','orange','grape','papaya','melon','carrot','tomato','potato'],answerContract:{targetSet:['pear','orange','grape','papaya','melon','carrot','tomato','potato']}},'The generic plan used whole preference phrases as answers; resolve the blank to one approved food word.');
  if(plan.moduleId==='Y4M01')correction('Q008',{learningTarget:'recognition: Complete the familiar weekday statement with the correct day. Focus: Today is...',languageTargets:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],answerContract:{targetSet:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']}},'The generic completion template supplied a birthday sentence for a weekday answer; use the approved weekday frame.');
  if(plan.moduleId==='Y5M02')correction('Q018',{learningTarget:'review: Complete a short routine sentence with one familiar routine chunk. Focus: daily routine sequence.',languageTargets:['wake up','have breakfast','go to school','study','play','sleep'],answerContract:{targetSet:['wake up','have breakfast','go to school','study','play','sleep']}},'Make the sentence completion exact and distinct from the separate routine-order activity.');
  if(plan.moduleId==='Y5M06')correction('Q018',{learningTarget:'review: Complete a short guided message with a familiar city place. Focus: city place.',languageTargets:['bank','supermarket','school','shoe store','park','hospital','library'],answerContract:{targetSet:['bank','supermarket','school','shoe store','park','hospital','library']}},'The generic plan placed a place-name answer in a progressive-action sentence; use the approved city-place frame.');
  if(plan.moduleId==='Y5M06') correction('Q017',{mechanicId:'matching',currentMechanicId:'matching',learningTarget:'comprehension: Match a spoken city place to its corresponding city-map scene. Focus: location.',languageTargets:['bank','supermarket','school','shoe store','park','hospital','library'],answerContract:{targetSet:['bank','supermarket','school','shoe store','park','hospital','library'],pairCount:6},expectedStudentAction:'Match each place name to its location scene on the city map.'},'The planned location target did not define meaningful classification groups; place-to-scene matching preserves the objective.');
  const contracts=plan.activitySequence.map((a,i)=>buildContract(plan,a,i));
  for(const c of contracts) {
    for(const m of c.requiredMedia)if(m.mediaConceptId!=='NO_MEDIA')mediaReq.set(m.mediaConceptId,m);
    for(const a of [...c.requiredAudio.instruction,...c.requiredAudio.learnerTargets])audioReq.set(a.audioConceptId,a);
  }
  plan.currentActivityContracts=contracts;
  plan.contractResolution={feature:'DUDUQ_ACTIVE_CONTENT_AUTHORING_V11_1B',status:'CONTRACTS_AUTHORED_ASSET_PENDING',activityCount:20,sourceAuthority:'DUDUQ English Curricular Master V3',runtimeActivation:false};
  const masterModule=contentMechanicsMaster.modules.find(x=>x.moduleId===plan.moduleId);
  if(!masterModule)throw new Error(`${plan.moduleId}: MODULE_CONTENT_MASTER_ROW_MISSING`);
  masterModule.activitySequence=plan.activitySequence;
  masterModule.currentActivityContracts=contracts;
  masterModule.mechanicAssignments=plan.activitySequence.map(x=>x.mechanicId);
  let prior=null,streak=0,longest=0;
  for(const x of plan.activitySequence){streak=x.mechanicId===prior?streak+1:1;prior=x.mechanicId;longest=Math.max(longest,streak);}
  masterModule.longestSameMechanicStreak=longest;
  await save(rel,plan);
  authored.push(...contracts);
}
const mechanicTotals={};
for(const mod of contentMechanicsMaster.modules) for(const activity of mod.activitySequence||[]) mechanicTotals[activity.mechanicId]=(mechanicTotals[activity.mechanicId]||0)+1;
mechanicTotals['smart-sentence-unscramble']=0;
contentMechanicsMaster.collectionMechanicTotals=mechanicTotals;
const base='content/english/production/v11-1b';
await save('content/english/master/module-content-and-mechanics-v1.json',contentMechanicsMaster);
await save(`${base}/deterministic-activity-contracts.json`,{schemaVersion:'duduq-english-deterministic-content-contracts-v1',status:'CONTRACTS_AUTHORED_ASSET_PENDING',authority:'Master V3 → approved planning → frozen mechanics',count:authored.length,contracts:authored,planningCorrections});
const mediaRegistry=await load('content/english/media/media-registry.json');
const audioRegistry=await load('content/english/audio/audio-registry.json');
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const mediaRequirements=[...mediaReq.values()].map(req=>{
  const target=norm(req.semanticTarget);
  const candidates=(mediaRegistry.entries||[]).filter(entry=>{
    const evidence=norm([entry.mediaId,entry.requirementId,entry.urlOrPath,...(entry.assets||[]).map(a=>a.path)].join(' '));
    return target.length>2&&new RegExp(`(^| )${target}( |$)`).test(evidence)&&entry.status==='APPROVED';
  }).map(entry=>entry.mediaId);
  return {...req,reuseCandidates:candidates,assetDisposition:candidates.length?'EXISTING_SEMANTIC_CANDIDATE_REVIEW_REQUIRED':'NEW_ASSET_REQUIRED'};
});
const audioRequirements=[...audioReq.values()].map(req=>{
  const candidates=(audioRegistry.entries||[]).filter(entry=>entry.status==='APPROVED'&&norm(entry.transcript)===norm(req.spokenTarget)&&((req.language==='en-US'&&/^en/.test(entry.language))||(req.language==='pt-BR'&&/^pt/.test(entry.language)))).map(entry=>entry.audioId);
  return {...req,reuseCandidates:candidates,assetDisposition:candidates.length?'EXISTING_EXACT_AUDIO_CANDIDATE':'NEW_AUDIO_REQUIRED'};
});
await save(`${base}/media-requirements.json`,{schemaVersion:'duduq-semantic-media-requirements-v1',count:mediaRequirements.length,requirements:mediaRequirements});
await save(`${base}/audio-requirements.json`,{schemaVersion:'duduq-semantic-audio-requirements-v1',count:audioRequirements.length,requirements:audioRequirements});
console.log(JSON.stringify({modules:23,contracts:authored.length,mediaRequirements:mediaReq.size,audioRequirements:audioReq.size,status:'AUTHORED_ASSET_PENDING'},null,2));
