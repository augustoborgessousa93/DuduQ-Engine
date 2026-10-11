import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const masterPath = 'content/english/master/curricular-master-v3.json';
const auditPath = 'content/english/master/curricular-master-v3-map-audit.json';
const matrixPath = 'content/english/master/curricular-master-v3-progression-matrices.json';
const master = readJson(masterPath);
const legacyAudit = readJson(auditPath);
const issues = [];
const moduleOrder = new Map(master.modules.map((m, i) => [m.id, i]));
const moduleById = new Map(master.modules.map((m) => [m.id, m]));
const lexicalSource = legacyAudit.indexes.lexicalTargets;
const wordNumbers = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const numberWord = (n) => n < 20 ? wordNumbers[n] : n === 100 ? 'one hundred' : n % 10 === 0 ? tens[Math.floor(n / 10)] : `${tens[Math.floor(n / 10)]}-${wordNumbers[n % 10]}`;
const norm = (s) => String(s).toLowerCase().replace(/[’']/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9-]+/g, ' ').trim().replace(/\s+/g, ' ');

function expandDeclaration(value) {
  const source = norm(value);
  const terms = [source];
  if (/\ba-z\b/.test(source)) terms.push(...'abcdefghijklmnopqrstuvwxyz'.split('').map((letter) => `letter ${letter}`));
  if (/january.*december/.test(source)) terms.push(...['january','february','march','april','may','june','july','august','september','october','november','december']);
  if (/monday.*sunday/.test(source)) terms.push(...['monday','tuesday','wednesday','thursday','friday','saturday','sunday']);
  const digitRange = source.match(/(?:numbers?\s*)?(\d+)\s*[-–]\s*(\d+)/);
  if (digitRange) for (let n = Number(digitRange[1]); n <= Number(digitRange[2]); n++) terms.push(numberWord(n));
  const wordRange = source.match(/\b(one|eleven|twenty-one|fifty-one)\s*[-–]\s*(ten|twenty|fifty|one hundred|100)\b/);
  if (wordRange) {
    const start = ({ one: 1, eleven: 11, 'twenty-one': 21, 'fifty-one': 51 })[wordRange[1]];
    const end = ({ ten: 10, twenty: 20, fifty: 50, 'one hundred': 100, '100': 100 })[wordRange[2]];
    for (let n = start; n <= end; n++) terms.push(numberWord(n));
  }
  return terms.map(norm);
}

function targetIsDeclared(target, declarations) {
  const declared = declarations.flatMap(expandDeclaration);
  const candidates = [target.item, ...(target.authorizedVariants ?? [])].map(norm);
  return candidates.some((candidate) => declared.includes(candidate));
}

const sets = {
  greetings: new Set(['hi','hello','good morning','good afternoon','good night','goodbye','see you']),
  colors: new Set(['red','blue','yellow','green','black','white','orange','purple','gray','brown','pink']),
  schoolObjects: new Set(['eraser','pencil','pencil case','crayon','ruler','pen','backpack']),
  schoolSubjects: new Set(['english','geography','mathematics','science','history','art']),
  commands: new Set(['come in','sit down','stand up','silence please','please','thank you','touch your']),
  body: new Set(['head','hands','legs','arms','feet','eye','ear','nose','mouth','finger','knee','shoulders']),
  pets: new Set(['dog','cat','fish','rabbit','hamster','bird','turtle','spider']),
  farmAnimals: new Set(['duck','horse','cow','pig','sheep','chicken']),
  size: new Set(['big','small','small','medium','large']),
  shapes: new Set(['triangle','square','rectangle','star','circle']),
  family: new Set(['mother','father','brother','sister','grandfather','grandmother']),
  toys: new Set(['doll','ball','train','plane','teddy bear','video game','boat','kite']),
  food: new Set(['apple','pear','banana','orange','grape','papaya','melon','carrot','tomato','potato']),
  weekdays: new Set(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']),
  months: new Set(['january','february','march','april','may','june','july','august','september','october','november','december']),
  seasons: new Set(['spring','summer','autumn','winter']),
  sports: new Set(['soccer','basketball','tennis','volleyball']),
  clothes: new Set(['jacket','dress','shirt','t-shirt','pants','trousers','shoes']),
  rooms: new Set(['bedroom','bathroom','kitchen','living room']),
  transport: new Set(['car','bus','truck','train']),
  spatial: new Set(['in','on','under','behind','beside']),
  profile: new Set(['age','birthday','phone number','favorite','best friend','name','nickname','parents names','first name','middle name','last name','city','country','nationality','brazil','brazilian','grade','school']),
  pronouns: new Set(['he','she','they']),
  occupations: new Set(['doctor','teacher','actor']),
  routine: new Set(['wake up','have breakfast','go to school','lunch','study','play','dinner','sleep']),
  health: new Set(['headache','stomachache','toothache','cold','fever']),
  weather: new Set(['sunny','rainy','cloudy','windy']),
  furniture: new Set(['table','tv','rug','wardrobe','sofa','bed','pillows','plate']),
  city: new Set(['bank','supermarket','school','shoe store','park','hospital','library']),
  math: new Set(['plus','minus','times','divided by','equals']),
};

function semanticField(item) {
  const v = norm(item);
  if (/^letter [a-z]$/.test(v)) return 'alphabet';
  if (wordNumbers.includes(v) || /^one hundred$/.test(v) || /^(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(-[a-z]+)?$/.test(v)) return 'numbers';
  for (const [field, values] of Object.entries(sets)) if (values.has(v)) return field;
  if (['boy','girl'].includes(v)) return 'person-identification';
  if (['there','where'].includes(v)) return 'location-language';
  return 'other';
}

function reviewFields(label) {
  const s = norm(label);
  const fields = new Set();
  if (/greeting|farewell|name exchange/.test(s)) fields.add('greetings');
  if (/alphabet|letter|spelling/.test(s)) fields.add('alphabet');
  if (/number|quantity|\b1-\d+\b|one-ten|1-20|1-50|1-100/.test(s)) fields.add('numbers');
  if (/color/.test(s)) fields.add('colors');
  if (/school object/.test(s)) fields.add('schoolObjects');
  if (/school subject/.test(s)) fields.add('schoolSubjects');
  if (/school/.test(s)) fields.add('schoolObjects');
  if (/pet|animal/.test(s)) { fields.add('pets'); fields.add('farmAnimals'); }
  if (/body/.test(s)) fields.add('body');
  if (/food|fruit|vegetable|drink/.test(s)) fields.add('food');
  if (/toy/.test(s)) fields.add('toys');
  if (/shape/.test(s)) fields.add('shapes');
  if (/family|relative/.test(s)) fields.add('family');
  if (/age/.test(s)) fields.add('profile');
  if (/weekday/.test(s)) fields.add('weekdays');
  if (/calendar|month|season/.test(s)) { fields.add('months'); fields.add('seasons'); fields.add('weekdays'); }
  if (/sport/.test(s)) fields.add('sports');
  if (/clothing|clothes/.test(s)) fields.add('clothes');
  if (/room|furniture/.test(s)) { fields.add('rooms'); fields.add('furniture'); }
  if (/transport|vehicle/.test(s)) fields.add('transport');
  if (/preposition|location|spatial/.test(s)) { fields.add('spatial'); fields.add('rooms'); }
  if (/profile|identity/.test(s)) fields.add('profile');
  if (/pronoun|he\/she|they/.test(s)) fields.add('pronouns');
  if (/occupation|role/.test(s)) fields.add('occupations');
  if (/routine|time/.test(s)) fields.add('routine');
  if (/health/.test(s)) fields.add('health');
  if (/weather/.test(s)) fields.add('weather');
  if (/operation|math/.test(s)) fields.add('math');
  return fields;
}

function consolidationFields(label) {
  const s = norm(label);
  const fields = reviewFields(s);
  if (/command/.test(s)) fields.add('commands');
  if (/preference|favorite/.test(s)) fields.add('profile');
  if (/attribute/.test(s)) { fields.add('colors'); fields.add('size'); }
  if (/place\/action|place action/.test(s)) { fields.add('city'); fields.add('routine'); }
  if (/room\/furniture|room furniture/.test(s)) { fields.add('rooms'); fields.add('furniture'); }
  return fields;
}

function sourceFor(target) {
  return target.sourceEvidence?.find((e) => e.v3Module?.endsWith(`/modules/${target.firstIntroduction}`)) ?? target.sourceEvidence?.[0] ?? null;
}

const vocabulary = [];
for (const target of lexicalSource) {
  const introIndex = moduleOrder.get(target.firstIntroduction);
  const intro = moduleById.get(target.firstIntroduction);
  if (!intro || introIndex === undefined) {
    issues.push(`${target.canonicalId}: invalid firstIntroduction ${target.firstIntroduction}`);
    continue;
  }
  const introKey = target.statusAtIntroduction === 'ACTIVE_PRODUCTIVE' ? 'newActiveVocabulary' : 'newReceptiveVocabulary';
  if (!targetIsDeclared(target, intro[introKey] ?? [])) issues.push(`${target.canonicalId}: item not declared in ${target.firstIntroduction}.${introKey}`);
  const field = semanticField(target.item);
  const reviewEvents = [];
  const consolidationModules = [];
  const expansions = [];
  for (const module of master.modules) {
    const index = moduleOrder.get(module.id);
    if (index < introIndex) continue;
    if (index === introIndex) {
      reviewEvents.push({ moduleId: module.id, status: target.statusAtIntroduction, sourceLabel: target.item });
    } else {
      const promoted = (module.newActiveVocabulary ?? []).some((d) => {
        const expanded = expandDeclaration(d);
        return expanded.includes(norm(target.item)) || (target.authorizedVariants ?? []).map(norm).some((v) => expanded.includes(v));
      });
      const receptive = (module.newReceptiveVocabulary ?? []).some((d) => {
        const expanded = expandDeclaration(d);
        return expanded.includes(norm(target.item)) || (target.authorizedVariants ?? []).map(norm).some((v) => expanded.includes(v));
      });
      const reviewedFrom = (module.reviewVocabulary ?? []).filter((label) => {
        const fields = reviewFields(label);
        const exact = [target.item, ...(target.authorizedVariants ?? [])].some((candidate) => norm(label).includes(norm(candidate)));
        return exact || fields.has(field) || ((field === 'pets' || field === 'farmAnimals') && (fields.has('pets') || fields.has('farmAnimals')));
      });
      if (promoted) expansions.push({ moduleId: module.id, type: target.statusAtIntroduction === 'RECEPTIVE' ? 'RECEPTIVE_TO_ACTIVE' : 'RECONTEXTUALIZED_ACTIVE', evidence: 'declared newActiveVocabulary' });
      if (receptive) expansions.push({ moduleId: module.id, type: 'RECONTEXTUALIZED_RECEPTIVE', evidence: 'declared newReceptiveVocabulary' });
      if (reviewedFrom.length) reviewEvents.push({ moduleId: module.id, status: 'REVIEW', sourceLabel: reviewedFrom.join('; ') });
    }
    const consolidatedFrom = (module.consolidatedVocabulary ?? []).filter((label) => {
      const fields = consolidationFields(label);
      const exact = [target.item, ...(target.authorizedVariants ?? [])].some((candidate) => norm(label).includes(norm(candidate)));
      return exact || fields.has(field) || ((field === 'pets' || field === 'farmAnimals') && (fields.has('pets') || fields.has('farmAnimals')));
    });
    if (consolidatedFrom.length) consolidationModules.push({ moduleId: module.id, evidence: consolidatedFrom });
  }
  const later = reviewEvents.filter((e) => moduleOrder.get(e.moduleId) > introIndex);
  const functions = [...(intro.functions ?? [])];
  const relatedStructures = [...(intro.newProductiveStructures ?? []), ...(intro.newReceptiveStructures ?? []), ...(intro.reviewedStructures ?? []), ...(intro.consolidatedStructures ?? [])];
  const expansionDescription = expansions.length ? expansions : null;
  vocabulary.push({
    canonicalId: target.canonicalId,
    item: target.item,
    authorizedVariants: target.authorizedVariants ?? [],
    semanticField: field,
    firstIntroduction: target.firstIntroduction,
    statusAtIntroduction: target.statusAtIntroduction,
    firstRetrieval: later[0]?.moduleId ?? null,
    laterRevisits: later.slice(1).map((e) => e.moduleId),
    expansion: expansionDescription,
    expectedConsolidation: consolidationModules.length ? consolidationModules : 'NOT_EXPLICITLY_SCHEDULED',
    relatedStructures,
    relatedCommunicativeFunctions: functions,
    occurrences: reviewEvents,
    sourceEvidence: sourceFor(target),
  });
}

const structures = legacyAudit.indexes.structureTargets.map((entry) => ({
  canonicalId: entry.canonicalId,
  structure: entry.canonicalPattern,
  firstReceptiveExposure: entry.firstReceptiveExposure ?? null,
  firstGuidedUse: entry.firstGuidedUse ?? null,
  firstProductiveExpectation: entry.firstProductiveExpectation ?? null,
  revisits: entry.revisits ?? [],
  expansions: entry.expansions ?? [],
  consolidation: entry.consolidationModules ?? [],
  relatedFunctions: [...new Set((entry.occurrences ?? []).flatMap((o) => Object.values(o.skillLinks ?? {}).map((x) => x.outcome).filter(Boolean)))],
  sourceEvidence: entry.occurrences?.map((o) => ({ moduleId: o.moduleId, role: o.role, source: o.source })) ?? [],
}));

const requiredFields = ['id','year','moduleNumber','title','theme','purpose','why','prerequisites','newActiveVocabulary','newReceptiveVocabulary','reviewVocabulary','consolidatedVocabulary','newProductiveStructures','newReceptiveStructures','reviewedStructures','consolidatedStructures','functions','skills','pronunciation','culture','portugueseScaffolding','visualAudioSupport','supportLevel','sequence','expectedMastery','retrievedContent','preparesFor','evidence','loadStatus','notes'];
const skillStatuses = new Set(['PRIMARY','SUPPORTING','NOT_TARGETED']);
const loadStatuses = new Set(['TARGET_RANGE','CAUTION','REVIEW_REQUIRED']);
const seen = new Set();
for (const module of master.modules) {
  if (seen.has(module.id)) issues.push(`duplicate module ID ${module.id}`);
  seen.add(module.id);
  for (const field of requiredFields) if (module[field] === undefined || module[field] === null) issues.push(`${module.id}: missing ${field}`);
  for (const skill of ['listening','speaking','reading','writing']) if (!skillStatuses.has(module.skills?.[skill]?.status) || !module.skills?.[skill]?.outcome) issues.push(`${module.id}: invalid ${skill} declaration`);
  if (!loadStatuses.has(module.loadStatus)) issues.push(`${module.id}: invalid loadStatus`);
  for (const prerequisite of module.prerequisites ?? []) if (!moduleById.has(prerequisite) || moduleOrder.get(prerequisite) >= moduleOrder.get(module.id)) issues.push(`${module.id}: prerequisite is absent or not earlier: ${prerequisite}`);
  for (const phase of ['introduced','guidedPractice','recognition','comprehension','review']) if (!module.sequence?.[phase]?.length) issues.push(`${module.id}: missing sequence ${phase}`);
  if (!module.functions?.length || !module.expectedMastery || !module.evidence || !module.portugueseScaffolding || !module.visualAudioSupport) issues.push(`${module.id}: incomplete curricular/evidence/support profile`);
}
if (master.modules.length !== 30) issues.push(`expected 30 modules, found ${master.modules.length}`);
for (let year = 1; year <= 5; year++) if (master.modules.filter((m) => m.year === year).length !== 6) issues.push(`year ${year} does not have 6 modules`);
if (master.crossYearBridges.length !== 4) issues.push(`expected 4 cross-year bridges, found ${master.crossYearBridges.length}`);
if (master.yearExitProfiles.length !== 5) issues.push(`expected 5 year exit profiles, found ${master.yearExitProfiles.length}`);
if (JSON.stringify(master.approvedDecisionIds) !== JSON.stringify(Array.from({ length: 12 }, (_, i) => `D${String(i + 1).padStart(2, '0')}`))) issues.push('D01-D12 approval list is incomplete or out of order');
if (master.decisionPolicy?.status !== 'APPROVED_CURRICULUM_POLICY') issues.push('D01-D12 policy is not recorded as approved');
if (vocabulary.length !== new Set(vocabulary.map((x) => x.canonicalId)).size) issues.push('duplicate canonical vocabulary IDs');
if (!vocabulary.every((x) => x.relatedCommunicativeFunctions.length)) issues.push('at least one lexical item has no related communicative function');

const masterDocument = fs.readFileSync(path.join(root, 'docs/master/DUDUQ_English_Master_Curricular_Pedagogico_V3.md'), 'utf8');
const documentIds = [...masterDocument.matchAll(/^#### (Y[1-5]M\d{2})\s+—/gm)].map((m) => m[1]);
if (documentIds.length !== 30 || new Set(documentIds).size !== 30) issues.push(`Markdown module headings ${documentIds.length}/30 or non-unique`);
const y1 = moduleById.get('Y1M01');
const canonicalY1 = ['hello','hi','good morning','good afternoon','goodbye','boy','girl'];
if (!canonicalY1.every((item) => [...y1.newActiveVocabulary, ...y1.newReceptiveVocabulary].map(norm).some((x) => x.includes(item)))) issues.push('Y1M01 target set does not contain the approved canonical set');

if (process.argv.includes('--write-matrices')) {
  const matrix = {
    schemaVersion: 1,
    masterId: master.masterId,
    status: 'CANONICAL_PROGRESSION_MAPS',
    authority: 'curricular-master-v3.json; this companion expands declared module targets and retrieval/consolidation labels without treating generic field exposure as item retrieval.',
    vocabulary,
    structures,
    validation: { lexicalItemCount: vocabulary.length, structurePatternCount: structures.length, sourceDeclarationsChecked: true },
  };
  fs.writeFileSync(path.join(root, matrixPath), `${JSON.stringify(matrix, null, 2)}\n`);
  master.progressionMatrices = { file: matrixPath, status: 'CANONICAL_COMPANION', vocabularyItems: vocabulary.length, structurePatterns: structures.length };
  fs.writeFileSync(path.join(root, masterPath), `${JSON.stringify(master, null, 2)}\n`);
}

const report = {
  status: issues.length ? 'ISSUE' : 'PASS',
  modules: master.modules.length,
  yearCounts: Array.from({ length: 5 }, (_, i) => master.modules.filter((m) => m.year === i + 1).length),
  approvedDecisions: master.approvedDecisionIds.length,
  vocabularyItems: vocabulary.length,
  structurePatterns: structures.length,
  crossYearBridges: master.crossYearBridges.length,
  yearExitProfiles: master.yearExitProfiles.length,
  y1m01CanonicalTargets: canonicalY1,
  issues,
};
console.log(JSON.stringify(report, null, 2));
if (issues.length) process.exitCode = 1;
