import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const v3Path = 'content/english/master/curricular-master-v3.json';
const v3 = JSON.parse(await readFile(path.join(root, v3Path), 'utf8'));
if (v3.status !== 'CURRENT' && !String(v3.status).startsWith('CURRENT')) throw new Error(`Curricular Master V3 is not current: ${v3.status}`);

// Fit is a curricular recommendation, not a production mechanic assignment.
// Format: moduleId, Memory Quest fit, mode, phase, MQ rationale, Complete fit,
// Order fit, Complete rationale, Order rationale, risk/prerequisite.
const profiles = [
  ['Y1M01','HIGH','AUDIO_IMAGE','RECOGNITION','Oral greeting/name meanings are best connected to familiar social scenes; avoid print as a prerequisite.','MEDIUM','NOT_RECOMMENDED','A modeled greeting/name chunk can be completed with audio, image and a word bank; this is supported recognition, not independent writing.','Year 1 writing is optional trace/copy; no sentence-order evidence is expected.','Do not add a 21st question; use only as a human-approved substitution.'],
  ['Y1M02','HIGH','AUDIO_IMAGE','GUIDED_PRACTICE','A spoken number can pair with a concrete quantity, supporting the listen-count objective.','MEDIUM','NOT_RECOMMENDED','A How many? / number-object chunk may be completed orally or with a model.','Number sequence is not English sentence-order mastery; Year 1 writing is not independent.','Teach numbers in batches of at most five; do not expose the whole range at once.'],
  ['Y1M03','HIGH','AUDIO_IMAGE','RECOGNITION','Spoken core colors map directly to visible color attributes; receptive colors stay receptive.','MEDIUM','NOT_RECOMMENDED','It’s [color] can be completed from an image and model without requiring spelling.','Word ordering is not a V3 target; use only if a later reviewed chunk explicitly warrants it.','Preserve active/receptive color distinction and avoid color stereotypes.'],
  ['Y1M04','HIGH','AUDIO_IMAGE','GUIDED_PRACTICE','Spoken school-object labels can map to their real-world images; colors/numbers provide retrieval.','MEDIUM','NOT_RECOMMENDED','Where is my…? / Here it is! can be completed as a fixed modeled exchange.','No independent word-order demand appears in Year 1 writing expectations.','Do not turn location relations into unsupported grammar explanation.'],
  ['Y1M05','LOW',null,'NOT_RECOMMENDED','The objective is to hear and physically respond to body/command language; cards would displace the movement response.','LOW','NOT_RECOMMENDED','Imperatives are action chunks best demonstrated through movement, not blank completion.','Sentence ordering is not targeted and would add print without a curricular need.','Prefer direct listening-plus-action; do not force a mechanic.'],
  ['Y1M06','HIGH','AUDIO_IMAGE','REVIEW','Animal words and size contrasts are concrete oral/visual targets; keep the set scoped to active animals.','HIGH','NOT_RECOMMENDED','It is a… / I have a… chunks support guided completion with animal imagery and a model.','Year 1 writing remains optional copy/trace; sentence ordering is not expected.','Keep hamster/spider receptive and honor the separate active/receptive lists.'],
  ['Y2M01','MEDIUM','AUDIO_TEXT','RECOGNITION','Letter-name audio paired with taught letter forms can support recognition in small batches.','HIGH','NOT_RECOMMENDED','A familiar name/spelling prompt can be completed from a model and taught letter set.','Alphabet sequence is not sentence ordering; avoid using Order to impose independent print composition.','Stage A–Z in batches; only taught letters and fictional names.'],
  ['Y2M02','HIGH','AUDIO_IMAGE','RECOGNITION','Heard numbers/shapes map cleanly to numeral/shape referents with familiar color retrieval.','HIGH','MEDIUM','It’s a [color] [shape] is a concrete, modelable chunk suitable for a word-bank completion.','A familiar short shape phrase may be ordered with audio/image support, but reading remains supported.','Keep 11–20 in batches and do not turn math into unsupported English writing.'],
  ['Y2M03','HIGH','AUDIO_IMAGE','REVIEW','Family terms and fictional-member portraits support semantic listening and review of names/I have.','HIGH','MEDIUM','This is my… is a short reusable frame for a fictional family member.','A familiar chunk can be ordered with visual/audio modeling; it is not free writing.','Use inclusive fictional family representation; protect privacy.'],
  ['Y2M04','MEDIUM','TEXT_IMAGE','REVIEW','Familiar toy labels may be paired with objects; location/preposition meaning needs contextual scenes beyond simple pairs.','HIGH','MEDIUM','My favorite toy is… supports guided completion from familiar toy choices.','The familiar frame may be reconstructed with labels and a model, not as generalized syntax.','Keep in/on receptive and avoid treating position-only pairs as mastery.'],
  ['Y2M05','HIGH','AUDIO_IMAGE','RECOGNITION','Farm animal audio-to-image pairs fit the named lexical set and retrieval of pet vocabulary.','HIGH','MEDIUM','This is my… / These are my… can be completed as guided chunks using one/more animal cues.','Order may reconstruct only a familiar modeled chunk; avoid teaching grammar terminology.','Use source-named animals only and preserve singular/plural as guided contrast.'],
  ['Y2M06','MEDIUM','AUDIO_IMAGE','REVIEW','Audio/image pairing can retrieve a deliberately staged body or food group, but must not collapse both into one overloaded set.','MEDIUM','NOT_RECOMMENDED','A color/food chunk may be completed only after the separate food group is taught.','High load and no order-writing target make Order a poor default here.','Separate body and food sequences; only apple/banana active in this module.'],
  ['Y3M01','MEDIUM','AUDIO_IMAGE','REVIEW','A name/age detail may pair with a fictional profile scene, but the main purpose is social exchange, not isolated matching.','HIGH','MEDIUM','Age/name/friend chunks lend themselves to supported profile completion.','Reconstruct a short familiar exchange only after learners have heard and used it.','No real identifying data; app selection is not speaking evidence.'],
  ['Y3M02','HIGH','AUDIO_IMAGE','RECOGNITION','Spoken numbers and quantities/age scenes directly support number discrimination and concrete quantity.','HIGH','MEDIUM','I am … years old can be completed from a fictional age card and model.','Order is suitable only for the highly familiar fixed age frame, with numeral/audio support.','Stage number names in batches and do not infer broad number-word decoding.'],
  ['Y3M03','HIGH','AUDIO_IMAGE','RECOGNITION','Family-member descriptions pair naturally with fictional people and support he/she referent recognition.','HIGH','MEDIUM','He/She is my… can be completed with fictional family images and a model.','Order only a short familiar chunk; reading is supported, not independent.','Avoid gender/family stereotypes and private real-world data.'],
  ['Y3M04','HIGH','AUDIO_IMAGE','REVIEW','Familiar toy/animal/count descriptions can be linked to concrete images for retrieval and comparison.','HIGH','MEDIUM','Favorite/count chunks can be completed from familiar content with a frame.','Order may support a learned count/preference chunk but should not replace connected listening.','No new vocabulary is defined here; prevent filler-item additions.'],
  ['Y3M05','LOW',null,'NOT_RECOMMENDED','The learning evidence is hearing/saying an operation and simple result; static semantic pairs are a weaker fit than equation interaction.','MEDIUM','LOW','A spoken equation frame can be completed with numeric/operator support when it directly serves the English phrase.','Number/operator sequence is not a reason by itself to use sentence ordering.','Do not confuse math-answer correctness with English language evidence.'],
  ['Y3M06','HIGH','AUDIO_IMAGE','REVIEW','Food/school preference vocabulary can pair with contextual referents for retrieval across a changed context.','HIGH','MEDIUM','I like / I prefer chunks can be completed from a supported choice set.','Order may reconstruct a familiar preference chunk; avoid overloading the contrastive frame.','Use only the staged source foods and keep all choices semantically plausible.'],
  ['Y4M01','HIGH','TEXT_IMAGE','REVIEW','Weekday labels map to a calendar/profile position, directly supporting primary calendar reading.','HIGH','HIGH','Today is… supports a familiar calendar-linked completion.','Calendar reading is primary and the fixed weekday chunk is familiar enough for supported ordering.','Use calendar context; ordering does not assess independent writing by itself.'],
  ['Y4M02','HIGH','TEXT_IMAGE','RECOGNITION','Subject labels paired with school-context visuals support primary reading of familiar labels.','HIGH','MEDIUM','A favorite-subject response can be completed with the modeled frame.','Order a short known preference chunk only; do not make subject vocabulary a sentence-writing test.','Use only the six V3 subjects; avoid unsupported school schedules.'],
  ['Y4M03','HIGH','TEXT_IMAGE','REVIEW','Month/season labels can connect to contextual calendar/season imagery and primary reading.','HIGH','MEDIUM','It is [month/season] is a clear modeled chunk for guided completion.','Order only familiar calendar chunks with visual support.','Represent seasons contextually; avoid assuming one climate experience.'],
  ['Y4M04','MEDIUM','AUDIO_IMAGE','RECOGNITION','Named sports can pair with clear activity scenes, but sports are receptive and the objective is listening/preference, not a card game.','MEDIUM','LOW','A favorite-sport response can be completed with the four-label set and a model.','Do not order the receptive progressive preview as if it were a productive grammar target.','Use only soccer, basketball, tennis, volleyball; avoid extra sports and formal grammar labels.'],
  ['Y4M05','MEDIUM','TEXT_IMAGE','REVIEW','Clothing labels may pair with garments for lexical review, while color/size exchanges need richer task context.','MEDIUM','LOW','A familiar color response can be completed with a model and fictional clothing image.','Size is receptive and word-order instruction is not a target.','Keep size words receptive; do not imply size-based value or body judgment.'],
  ['Y4M06','HIGH','TEXT_IMAGE','RECOGNITION','Room/object labels can pair with a labeled map location, supporting primary reading and familiar location retrieval.','HIGH','HIGH','Where is…? / It’s… can be completed using a map and a known frame.','Map/label reading and familiar location chunks support guided ordering without free composition.','Distinguish in/on review from new under/behind/beside; no artificial equal mastery.'],
  ['Y5M01','MEDIUM','TEXT_IMAGE','REVIEW','A fictional profile/map label can support reading; nationality must remain contextual, not a flag-label match.','HIGH','HIGH','Where are you from? / I am from… is a guided fictional-profile chunk.','The familiar profile exchange can be ordered with supported reading and no claim of CEFR level.','Use Brazil/Brazilian as source-named core; avoid stereotypes and real personal data.'],
  ['Y5M02','HIGH','AUDIO_IMAGE','REVIEW','Food/routine words connect to concrete routine contexts and support listening/timetable retrieval.','HIGH','HIGH','Do you like…? and I wake up at… can be completed from a model and fictional routine choices.','Sequence only familiar chunks/timetable language; do not require paragraph writing.','Do not treat phrase-scene extension as a current Memory Quest requirement.'],
  ['Y5M03','MEDIUM','TEXT_IMAGE','RECOGNITION','Role labels can pair with varied, non-stereotyped fictional contexts, but short role descriptions are richer than isolated pairs.','HIGH','MEDIUM','I am a/an… or He/She is… can be completed as a guided fictional-character chunk.','Order only a familiar singular frame; plural remains gated by evidence.','Use only doctor, teacher, actor/actress; images must not stereotype occupations.'],
  ['Y5M04','LOW',null,'NOT_RECOMMENDED','Health/weather language needs context and safe interpretation; simple pair cards risk turning health words into diagnosis.','MEDIUM','LOW','It is [weather] may be completed with calendar support when that specific chunk is the objective.','Do not order health vocabulary or infer productive has; the module prioritizes supported comprehension.','No medical advice or diagnosis; separate weather from health targets.'],
  ['Y5M05','MEDIUM','TEXT_IMAGE','REVIEW','Room/furniture labels may be retrieved on a room plan, but existence/location relations require sentence or map comprehension.','HIGH','MEDIUM','There is… can be completed with a labeled room plan and word bank.','Order a familiar there is/location chunk with support; no independent paragraph writing.','There are remains receptive before guided use; avoid overclaiming preposition control.'],
  ['Y5M06','MEDIUM','AUDIO_IMAGE','REVIEW','Place/action audio can connect to scenes, but the core objective is contextual listening on a city map/caption.','HIGH','MEDIUM','A singular present-progressive chunk can be completed as guided language, without grammar terminology.','Order only a familiar modeled chunk after receptive exposure; do not require unscripted production.','Only play, study, wake up are source-named verbs; plural pattern follows evidence.']
];

const validFit = new Set(['HIGH','MEDIUM','LOW','NOT_RECOMMENDED']);
const byId = new Map(v3.modules.map((module) => [module.id, module]));
const records = profiles.map(([id, mqFit, mqMode, mqPhase, mqRationale, completeFit, orderFit, completeRationale, orderRationale, risk]) => {
  const module = byId.get(id);
  if (!module) throw new Error(`Module missing from V3: ${id}`);
  if (!validFit.has(mqFit) || !validFit.has(completeFit) || !validFit.has(orderFit)) throw new Error(`Invalid fit for ${id}`);
  return {
    moduleId: id,
    year: module.year,
    moduleNumber: module.moduleNumber,
    title: module.title,
    curricularTargets: {
      vocabularyActive: module.newActiveVocabulary,
      vocabularyReceptive: module.newReceptiveVocabulary,
      vocabularyReview: module.reviewVocabulary,
      productiveStructures: module.newProductiveStructures,
      receptiveStructures: module.newReceptiveStructures,
      communicativePurpose: module.purpose,
      skills: module.skills
    },
    memoryQuest: {
      fit: mqFit,
      preferredMode: mqMode,
      recommendedPhase: mqPhase,
      rationale: mqRationale,
      risksAndPrerequisites: risk
    },
    smartSentenceComplete: {
      status: 'PRODUCTION_CANONICAL_LOCKED',
      fit: completeFit,
      recommendedPhase: completeFit === 'NOT_RECOMMENDED' || completeFit === 'LOW' ? 'NOT_RECOMMENDED' : 'GUIDED_PRACTICE',
      pedagogicalRole: 'guided completion of a familiar language chunk; never proof of independent writing by itself',
      rationale: completeRationale,
      risksAndPrerequisites: risk
    },
    smartSentenceOrder: {
      status: 'PRODUCTION_CANONICAL_LOCKED',
      fit: orderFit,
      recommendedPhase: orderFit === 'HIGH' || orderFit === 'MEDIUM' ? 'GUIDED_PRACTICE' : 'NOT_RECOMMENDED',
      pedagogicalRole: 'reconstruct a familiar chunk when reading load and prior oral familiarity support it',
      rationale: orderRationale,
      risksAndPrerequisites: risk
    }
  };
});

if (v3.modules.length !== 30 || records.length !== 30 || new Set(records.map((record) => record.moduleId)).size !== 30) throw new Error('Expected exactly 30 unique V3 module records.');
const output = {
  schemaVersion: '1.0',
  matrixId: 'DUDUQ_ENGLISH_MECHANIC_CURRICULAR_ELIGIBILITY_V1',
  status: 'CURRICULAR_RECOMMENDATION_NOT_MECHANIC_ASSIGNMENT',
  authority: 'docs/master/DUDUQ_English_Master_Curricular_Pedagogico_V3.md',
  authorityStatus: v3.status,
  activityContentAuthority: 'docs/master/DUDUQ_ENGLISH_MASTER_ACTIVITY_CONTENT_STANDARD_V1.md',
  instructionAuthority: 'docs/master/DUDUQ_ENGLISH_MASTER_INSTRUCTION_STANDARD_V1_2.md',
  productionMechanics: {
    memoryQuest: 'NOT_PRODUCTION_AUTHORIZED; current route does not meet multimodal semantic contract.',
    smartSentenceComplete: 'PRODUCTION_CANONICAL_LOCKED',
    smartSentenceOrder: 'PRODUCTION_CANONICAL_LOCKED',
    smartSentenceUnscramble: 'BLOCKED'
  },
  principle: 'CURRICULUM → LEARNING TARGET → ACTIVITY TYPE → MECHANIC; never MECHANIC → INVENT CONTENT.',
  fitDefinitions: {
    HIGH: 'Directly serves a V3 learning target with a natural, developmentally appropriate modality relation.',
    MEDIUM: 'Useful only for a scoped/review portion or with explicit support; another activity type may serve the main objective better.',
    LOW: 'Weak alignment or meaningful risk of displacing a better activity type; not a default recommendation.',
    NOT_RECOMMENDED: 'No suitable current curricular role without inventing content or changing the learning demand.'
  },
  smartSentencePolicy: {
    complete: 'Guided completion of a known chunk; supports recognition/guided production and does not imply independent writing mastery.',
    order: 'Use only for familiar language with developmentally appropriate reading load; do not use because the mechanic exists.',
    unscramble: 'BLOCKED; excluded from all module eligibility.'
  },
  modules: records
};

const jsonPath = 'content/english/master/mechanic-curricular-eligibility-v1.json';
const mdPath = 'docs/curriculum/DUDUQ_ENGLISH_MECHANIC_CURRICULAR_ELIGIBILITY_V1.md';
const fitMode = (entry) => `${entry.fit}${entry.preferredMode ? ` (${entry.preferredMode})` : ''}`;
const table = records.map((record) => `| ${record.moduleId} | ${record.title} | ${fitMode(record.memoryQuest)} | ${record.smartSentenceComplete.fit} | ${record.smartSentenceOrder.fit} | ${record.memoryQuest.rationale} |`).join('\n');
const markdown = `# DUDUQ English — Mechanic Curricular Eligibility V1\n\n**Status:** curricular recommendation only; not a mechanic assignment or module-content change.  \n**Authority:** [Curricular Master V3](../master/DUDUQ_English_Master_Curricular_Pedagogico_V3.md) (${v3.status}); [Activity Content Master](../master/DUDUQ_ENGLISH_MASTER_ACTIVITY_CONTENT_STANDARD_V1.md); [Instruction Master V1.2](../master/DUDUQ_ENGLISH_MASTER_INSTRUCTION_STANDARD_V1_2.md).\n\n> **CURRICULUM → LEARNING TARGET → ACTIVITY TYPE → MECHANIC**  \n> Never **MECHANIC → INVENT CONTENT**.\n\n## Interpretation\n\nMemory Quest ratings identify whether semantic multimodal pairing would serve the V3 objective; they do not authorize using the mechanic. Smart Sentence Complete and Order remain the already-locked mechanics, with these ratings governing curricular fit only. Complete means guided completion of a familiar chunk, not independent writing evidence. Order requires prior oral familiarity and age-appropriate reading load. Unscramble remains **BLOCKED** and is absent from all module choices.\n\nMemory Quest current modes are audio↔image, text↔image, and audio↔text. Phrase↔scene is a future-eligible extension only. For early years, use 3–4 pairs as a DUDUQ planning guideline; the current visual shell can lay out up to six pairs, but 5–6 requires viewport, duration and learner testing. These are product recommendations, not universal scientific limits.\n\n## 30-module eligibility matrix\n\n| Module | V3 module | Memory Quest fit / mode | Smart Sentence Complete | Smart Sentence Order | Curricular rationale |\n|---|---|---|---|---|---|\n${table}\n\n## Memory Quest implementation audit and homologation status\n\nThe local route owner is [play/memory-quest/](../../play/memory-quest/), with \`memory-quest.js\`, CSS and HTML. The current JS hardcodes twelve component cards to the same \`pairKey: rabbit\` and label, flips identical rabbit-facing art, and does not consume mode-specific semantic pair contracts. It therefore cannot provide the three cross-modal modes or verify semantic equality. Registry status remains \`HUMAN_REVIEW_REQUIRED\`; it has no Gold Master source, approved modes, or located human visual/gameplay approval evidence. The visual line is a local review reference only, not approved authority.\n\nThere are 28 archived version packages under \`engine/releases/mechanics/memory-quest/\` (1.0.0–1.0.27); their JS hashes are all distinct, and HTML hashes have 27 distinct groups. Per registry policy, all are **LEGACY_BLOCKED**, not sources to restore. Release 1.0.27 contains a more flexible \`pairId\`-based payload and spoken-text/audio/image fields, but remains an archived legacy reference without approval; its validator does not require cross-modal modality inequality and must not be selected as production. Historical channel manifests also pin releases (stable 1.0.0, canary 1.0.27); current Y1M01 has no Memory Quest question. The current official build owns \`/play/memory-quest/\` from \`play/\`, not from \`dist-pages\` or the archives.\n\n\`core/duduq-world-fusion.js\` and \`core/duduq-content-audio.js\` contain shared/legacy Memory Quest integration branches, not an independently approved semantic-pair engine. Tests and audit snapshots are QA references or generated output. No change was made to the production registry, archived packages, engine channels, modules, V3, or locked mechanics.\n\n**Conclusion:** \`MEMORY_QUEST_REBUILD_REQUIRED\` for a data-driven semantic multimodal candidate. Reuse the current DUDUQ shared game shell/canonical HUD as integration references, and treat the current Memory Quest play-area/cards as an unapproved visual candidate for Augusto to review; do not declare either a Gold Master. Human homologation requires one isolated candidate with the three modes and a validated semantic pair contract.\n\n## Pair-contract demo fixtures\n\nMachine-readable fixtures for QA-only DOG/CAT/RABBIT/BIRD pairings are in [memory-quest-content-contract-v1.json](../../content/mechanics/memory-quest-content-contract-v1.json); local SVG fixtures exist under \`qa/memory-quest/fixtures/\`. They validate as content fixtures only. The present route cannot load these modes, so no playable QA URLs are claimed: audio↔image, text↔image and audio↔text must wait for the isolated candidate. These examples are not curriculum or production content.\n\n## Y1M01 and Y1M02\n\n- **Y1M01 Memory Quest fit: HIGH, audio↔image**, for supported recognition/review of greetings/name exchanges mapped to social scenes. It is not an additional question; any later use requires Augusto-approved substitution among the existing 20 activities.\n- **Y1M02 Memory Quest fit: HIGH, audio↔image**, for taught number words mapped to concrete quantities, in batches. Keep new number-name exposure at five or fewer per encounter and maintain V3's oral/visual support. No production change is authorized.\n\nFull machine reasons, targets, phases and prerequisites are in [the JSON matrix](../../content/english/master/mechanic-curricular-eligibility-v1.json).\n`;

await mkdir(path.join(root, path.dirname(jsonPath)), { recursive: true });
await mkdir(path.join(root, path.dirname(mdPath)), { recursive: true });
await writeFile(path.join(root, jsonPath), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
await writeFile(path.join(root, mdPath), markdown, 'utf8');
console.log(JSON.stringify({ status: 'PASS', moduleCount: records.length, jsonPath, mdPath, authority: v3Path }));
