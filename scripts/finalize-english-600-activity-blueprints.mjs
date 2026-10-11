import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = async (p) => JSON.parse(await fs.readFile(path.join(root, p), 'utf8'));
const write = async (p, v) => {
  const out = path.join(root, p);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, `${JSON.stringify(v, null, 2)}\n`, 'utf8');
};
const master = await read('content/english/master/module-content-and-mechanics-v1.json');
const curriculum = await read('content/english/master/curricular-master-v3.json');
const elig = await read('content/english/master/mechanic-curricular-eligibility-v1.json');
const y1q = await read('content/english/year-1/module-01/questions.json');
const currentY1 = y1q.questions ?? y1q.items;
const byCurric = new Map(curriculum.modules.map((m) => [m.id, m]));
const byElig = new Map(elig.modules.map((m) => [m.moduleId, m]));
const validMechanics = ['target-shooter','bubble-pop','drag-drop-multimedia','drag-drop','matching','memory-quest','smart-sentence-complete','smart-sentence-order'];
const mqPositions = [[4,13],[5,15],[3,12],[6,16],[4,14],[5,13]];
const phaseLine = ['TEACHING','TEACHING','GUIDED_PRACTICE','GUIDED_PRACTICE','GUIDED_PRACTICE','GUIDED_PRACTICE','RECOGNITION','RECOGNITION','RECOGNITION','COMPREHENSION','COMPREHENSION','COMPREHENSION','LISTENING','LISTENING','RETRIEVAL','RETRIEVAL','REVIEW','REVIEW','CONSOLIDATION','CONSOLIDATION'];
const modeFor = (year, ordinal) => {
  if (year <= 2) return 'AUDIO_IMAGE';
  if (year === 3) return ordinal === 1 ? 'AUDIO_IMAGE' : 'AUDIO_TEXT';
  if (year === 4) return ordinal === 1 ? 'TEXT_IMAGE' : 'AUDIO_TEXT';
  return ordinal === 1 ? 'TEXT_IMAGE' : 'AUDIO_TEXT';
};
const specialMQ = {
  Y1M01: [
    { position: 3, mode: 'AUDIO_IMAGE', phase: 'RETRIEVAL', status: 'PROPOSED_NEAR_DUPLICATE_REVIEW', semanticTargets: ['hi','hello','good morning','good afternoon','goodbye'], pairCount: 5, contentFamily: 'greetings and social-context scenes', vocabularyStatus: 'ACTIVE', reason: 'Moves isolated modeled greeting recognition into multi-pair sound-to-scene retrieval; Q006 already covers a four-item audio/visual set, so overlap is explicitly flagged for human duplicate review.' },
    { position: 16, mode: 'AUDIO_IMAGE', phase: 'REVIEW', status: 'PROPOSED_NEAR_DUPLICATE_REVIEW', semanticTargets: ['boy','girl'], pairCount: 2, contentFamily: 'receptive character identification', vocabularyStatus: 'RECEPTIVE', reason: 'Converts the single-word boy recognition slot into a two-way receptive semantic association while Q017 remains an independent girl recognition check; Q008 overlaps boy/girl and requires human duplicate review.' }
  ],
  Y1M02: [
    { position: 4, mode: 'AUDIO_IMAGE', phase: 'GUIDED_PRACTICE', semanticTargets: ['one','two','three','four','five'], pairCount: 5, contentFamily: 'number words and concrete quantities', vocabularyStatus: 'ACTIVE_PRODUCTIVE', reason: 'First staged batch connects spoken number names to concrete quantity with high oral/visual support.' },
    { position: 13, mode: 'AUDIO_IMAGE', phase: 'RETRIEVAL', semanticTargets: ['six','seven','eight','nine','ten'], pairCount: 5, contentFamily: 'number words and concrete quantities', vocabularyStatus: 'RECEPTIVE', reason: 'Second non-overlapping batch supports cumulative recognition after staged exposure; it is not a shuffled repeat of batch one.' }
  ],
  Y2M01: [
    { position: 5, mode: 'AUDIO_TEXT', phase: 'RECOGNITION', semanticTargets: ['A','B','C','D','E'], pairCount: 5, contentFamily: 'letter-name sounds and taught letter forms', vocabularyStatus: 'RECEPTIVE', reason: 'First small taught-letter batch maps spoken letter names to written forms; use only letters taught earlier in the module.' },
    { position: 15, mode: 'AUDIO_TEXT', phase: 'RETRIEVAL', semanticTargets: ['F','G','H','I','J'], pairCount: 5, contentFamily: 'letter-name sounds and taught letter forms', vocabularyStatus: 'RECEPTIVE', reason: 'A distinct later letter batch supports retrieval without exposing all A–Z at once; fictional names only.' }
  ],
  Y3M02: [
    { position: 3, mode: 'AUDIO_IMAGE', phase: 'GUIDED_PRACTICE', semanticTargets: ['21','22','23','24','25'], pairCount: 5, contentFamily: 'number words and quantities/age scenes', vocabularyStatus: 'ACTIVE_PRODUCTIVE', reason: 'First V3 number-name batch links spoken numbers to supported quantity/age scenes; no number-word decoding assumed.', source: 'V3 Y3M02 numbers 21–50 in batches; age context.' },
    { position: 12, mode: 'AUDIO_TEXT', phase: 'SOUND_FORM_MAPPING', semanticTargets: ['26','27','28','29','30'], pairCount: 5, contentFamily: 'spoken and written number forms', vocabularyStatus: 'RECEPTIVE', reason: 'A later non-overlapping batch supports sound-form recognition after oral staging; it does not claim broad independent decoding.', source: 'V3 Y3M02 numbers 21–50 in batches; cumulative recognition.' }
  ],
  Y3M03: [
    { position: 4, mode: 'AUDIO_IMAGE', phase: 'COMPREHENSION', semanticTargets: ['mother','father','brother','sister'], pairCount: 4, contentFamily: 'spoken family relation descriptions and fictional referents', vocabularyStatus: 'REVIEW', reason: 'Pairs short he/she family descriptions to clear fictional people; gender cues must be explicit and non-stereotyped.', source: 'V3 Y2M03 family vocabulary; Y3M03 review family/age and new he/she chunks.' },
    { position: 13, mode: 'AUDIO_TEXT', phase: 'SOUND_FORM_MAPPING', semanticTargets: ['he','she'], pairCount: 2, contentFamily: 'pronoun sound-form recognition', vocabularyStatus: 'ACTIVE_PRODUCTIVE', reason: 'A two-pair sound-form check supports the new he/she chunks after referents are established; not a standalone grammar test.', source: 'V3 Y3M03 active he/she target.' }
  ],
  Y1M04: [
    { position: 6, mode: 'AUDIO_IMAGE', phase: 'GUIDED_PRACTICE', semanticTargets: ['eraser','pencil','pencil case','crayon'], pairCount: 4, contentFamily: 'school objects', vocabularyStatus: 'ACTIVE_PRODUCTIVE', reason: 'Audio-to-object pairing supports the introduced concrete noun set with color/quantity scaffolds.', source: 'V3 Y1M04 active school objects.' },
    { position: 16, mode: 'AUDIO_IMAGE', phase: 'REVIEW', semanticTargets: ['one','two','three','four'], pairCount: 4, contentFamily: 'number words and school-object quantities', vocabularyStatus: 'REVIEW', reason: 'Retrieves number-to-quantity learning from Y1M02 in a changed school-object context; colors and quantities remain supports, not new English targets.', source: 'V3 Y1M02 one-ten; Y1M04 review numbers one-ten.' }
  ],
  Y1M06: [
    { position: 5, mode: 'AUDIO_IMAGE', phase: 'RECOGNITION', semanticTargets: ['dog','cat','fish','rabbit'], pairCount: 4, contentFamily: 'active pet names', vocabularyStatus: 'ACTIVE_PRODUCTIVE', reason: 'First active-pet sound-to-image retrieval with familiar visual referents.', source: 'V3 Y1M06 active pets.' },
    { position: 13, mode: 'AUDIO_IMAGE', phase: 'CONSOLIDATION', semanticTargets: ['red','blue','yellow','green'], pairCount: 4, contentFamily: 'review color attributes in pet/object scenes', vocabularyStatus: 'REVIEW', reason: 'Changes the semantic focus from animal identity to previously taught color attributes; avoid color/animal stereotypes and preserve color vocabulary status.', source: 'V3 Y1M03 active colors; Y1M06 reviews colors.' }
  ],
  Y2M02: [
    { position: 6, mode: 'AUDIO_IMAGE', phase: 'RECOGNITION', semanticTargets: ['11','12','13','14','15'], pairCount: 5, contentFamily: 'number words and quantities', vocabularyStatus: 'ACTIVE_PRODUCTIVE', reason: 'First staged 11–20 audio-to-quantity batch; it does not require number-word decoding.', source: 'V3 Y2M02 numbers 11–20 in batches; review Y1M02.' },
    { position: 16, mode: 'TEXT_IMAGE', phase: 'RETRIEVAL', semanticTargets: ['triangle','square','rectangle','star','circle'], pairCount: 5, contentFamily: 'written shape labels and shape referents', vocabularyStatus: 'ACTIVE_PRODUCTIVE', reason: 'A separate written-form-to-shape retrieval task supports the module’s shape-label reading target after oral introduction.', source: 'V3 Y2M02 five active shapes.' }
  ],
  Y2M03: [
    { position: 4, mode: 'AUDIO_IMAGE', phase: 'RECOGNITION', semanticTargets: ['mother','father','brother','sister','grandfather','grandmother'], pairCount: 6, contentFamily: 'fictional family relations', vocabularyStatus: 'ACTIVE_PRODUCTIVE', reason: 'Semantic listening with inclusive fictional family portraits; no personal data required.', source: 'V3 Y2M03 active family vocabulary.' },
    { position: 14, mode: 'AUDIO_TEXT', phase: 'RETRIEVAL', semanticTargets: ['mother','father','brother','sister'], pairCount: 4, contentFamily: 'family word sound-form mapping', vocabularyStatus: 'REVIEW', reason: 'Later sound-to-written-form retrieval follows the module’s supported label exposure; it is distinct from image-based semantic recognition.', source: 'V3 Y2M03 family set and supporting reading target.' }
  ],
  Y2M04: [
    { position: 5, mode: 'TEXT_IMAGE', phase: 'RECOGNITION', semanticTargets: ['doll','ball','train','plane','teddy bear','kite'], pairCount: 6, contentFamily: 'toy labels and objects', vocabularyStatus: 'ACTIVE_PRODUCTIVE', reason: 'Written familiar toy labels map to concrete objects after oral/visual introduction.', source: 'V3 Y2M04 six active toys.' },
    { position: 13, mode: 'AUDIO_IMAGE', phase: 'REVIEW', semanticTargets: ['red','blue','yellow','green'], pairCount: 4, contentFamily: 'review color attributes in toy scenes', vocabularyStatus: 'REVIEW', reason: 'A separate audio-to-attribute retrieval role reviews colors in a changed toy context; in/on remain receptive and are not reduced to isolated pairs.', source: 'V3 Y1M03 active colors; Y2M04 review colors.' }
  ],
  Y2M05: [
    { position: 4, mode: 'AUDIO_IMAGE', phase: 'RECOGNITION', semanticTargets: ['duck','horse','cow','pig','sheep','chicken'], pairCount: 6, contentFamily: 'farm animals', vocabularyStatus: 'ACTIVE_PRODUCTIVE', reason: 'Source-bounded farm animal audio-to-image recognition; singular/plural remains a guided contrast.', source: 'V3 Y2M05 active farm animals.' },
    { position: 13, mode: 'AUDIO_IMAGE', phase: 'RETRIEVAL', semanticTargets: ['dog','cat','fish','rabbit'], pairCount: 4, contentFamily: 'previously taught pets', vocabularyStatus: 'REVIEW', reason: 'Retrieves Y1 pet vocabulary in a farm-versus-pet contrast; no new animal names are introduced.', source: 'V3 Y1M06 active pets; Y2M05 reviews pets.' }
  ],
  Y2M06: [
    { position: 5, mode: 'AUDIO_IMAGE', phase: 'RECOGNITION', semanticTargets: ['eye','ear','nose','mouth'], pairCount: 4, contentFamily: 'body parts', vocabularyStatus: 'ACTIVE_PRODUCTIVE', reason: 'Body block stays separate from food block and supports sound-to-referent recognition.', source: 'V3 Y2M06 active body terms.' },
    { position: 15, mode: 'AUDIO_IMAGE', phase: 'REVIEW', semanticTargets: ['head','hands','legs','arms','feet'], pairCount: 5, contentFamily: 'previously taught body-part commands', vocabularyStatus: 'REVIEW', reason: 'Retrieves Y1M05 body targets after the new body block; does not combine body and food into one overloaded set.', source: 'V3 Y1M05 body/commands; Y2M06 review list.' }
  ],
  Y4M01: [
    { position: 4, mode: 'TEXT_IMAGE', phase: 'RECOGNITION', semanticTargets: ['Monday','Tuesday','Wednesday','Thursday'], pairCount: 4, contentFamily: 'weekday labels and calendar positions', vocabularyStatus: 'ACTIVE_PRODUCTIVE', reason: 'Written weekday labels map to the calendar context, directly supporting V3 primary reading without claiming independent writing.', source: 'V3 Y4M01 weekdays Monday–Sunday in sequence.' },
    { position: 14, mode: 'AUDIO_TEXT', phase: 'RETRIEVAL', semanticTargets: ['name','age','birthday','favorite'], pairCount: 4, contentFamily: 'fictional profile-field sound/form review', vocabularyStatus: 'REVIEW', reason: 'Sound-form mapping retrieves profile language from Y3M01 in a changed calendar/profile context; fictional information only.', source: 'V3 Y3M01 profile fields; Y4M01 review of profile/greetings.' }
  ],
  Y3M01: [
    { position: 4, mode: 'AUDIO_IMAGE', phase: 'RECOGNITION', semanticTargets: ['age','birthday','favorite','best friend'], pairCount: 4, contentFamily: 'fictional profile detail comprehension', vocabularyStatus: 'ACTIVE_PRODUCTIVE', reason: 'Pairs short spoken fictional profile details with unambiguous profile scenes; no real identifying data.', source: 'V3 Y3M01 active profile fields; fictional profile policy.' },
    { position: 14, mode: 'AUDIO_TEXT', phase: 'RETRIEVAL', semanticTargets: ['age','birthday','favorite','best friend'], pairCount: 4, contentFamily: 'profile-field sound-form retrieval', vocabularyStatus: 'REVIEW', reason: 'Changes the representation from scene comprehension to written-form recognition after familiar profile exposure; no phone number or private data.', source: 'V3 Y3M01 profile fields; Y1/Y2 name and spelling bridge.' }
  ],
  Y3M04: [
    { position: 5, mode: 'AUDIO_IMAGE', phase: 'RETRIEVAL', semanticTargets: ['doll','ball','train','plane','teddy bear','kite'], pairCount: 6, contentFamily: 'previously taught toys', vocabularyStatus: 'REVIEW', reason: 'Retrieves the familiar toy set through semantic image association before integrating count/plural language.', source: 'V3 Y2M04 toys; Y3M04 review.' },
    { position: 15, mode: 'AUDIO_TEXT', phase: 'CONSOLIDATION', semanticTargets: ['one fish','three turtles','one/more than one'], pairCount: 3, contentFamily: 'number-noun and plural relation chunks', vocabularyStatus: 'CONSOLIDATED', reason: 'Sound-form mapping consolidates the new number-noun/plural relation after familiar noun recognition; keep language chunks modeled.', source: 'V3 Y3M04 productive number-noun/plural chunks.' }
  ],
  Y3M06: [
    { position: 6, mode: 'AUDIO_IMAGE', phase: 'RECOGNITION', semanticTargets: ['pear','orange','grape','papaya'], pairCount: 4, contentFamily: 'food vocabulary retrieval groups', vocabularyStatus: 'ACTIVE_PRODUCTIVE', reason: 'First retrieval group of the staged remaining V3 food set; use distinctive food images.', source: 'V3 Y3M06 active food group 1; introduced receptively Y2M06.' },
    { position: 16, mode: 'AUDIO_TEXT', phase: 'REVIEW', semanticTargets: ['eraser','pencil','pencil case','backpack'], pairCount: 4, contentFamily: 'school-object sound-form retrieval', vocabularyStatus: 'REVIEW', reason: 'A changed sound-to-written-form task retrieves school-object labels from Y1M04 while food preference remains the module’s new target.', source: 'V3 Y1M04 active school objects; Y3M06 review school objects.' }
  ],
  Y4M02: [
    { position: 5, mode: 'TEXT_IMAGE', phase: 'RECOGNITION', semanticTargets: ['English','Geography','Mathematics','Science','History','Art'], pairCount: 6, contentFamily: 'school subject labels', vocabularyStatus: 'ACTIVE_PRODUCTIVE', reason: 'Written subject labels map to school-context images using only the six V3 items.', source: 'V3 Y4M02 finite subject set.' },
    { position: 15, mode: 'AUDIO_TEXT', phase: 'RETRIEVAL', semanticTargets: ['English','Geography','Mathematics','Science','History','Art'], pairCount: 6, contentFamily: 'school-subject sound-form retrieval', vocabularyStatus: 'REVIEW', reason: 'Moves familiar subject labels from image-supported reading to sound-form retrieval without inventing a school timetable.', source: 'V3 Y4M02 subject labels; supporting spoken-clue target.' }
  ],
  Y4M03: [
    { position: 3, mode: 'TEXT_IMAGE', phase: 'RECOGNITION', semanticTargets: ['January','February','March','April'], pairCount: 4, contentFamily: 'month labels and calendar context', vocabularyStatus: 'ACTIVE_PRODUCTIVE', reason: 'Written month labels map to a calendar context; the list is staged in four-item batches.', source: 'V3 Y4M03 months in groups of 3–4.' },
    { position: 12, mode: 'AUDIO_TEXT', phase: 'RETRIEVAL', semanticTargets: ['spring','summer','autumn/fall','winter'], pairCount: 4, contentFamily: 'season sound-form recognition', vocabularyStatus: 'REVIEW', reason: 'Separately retrieves season words through sound-form mapping; imagery and examples must not assume one climate experience.', source: 'V3 Y4M03 seasons; V3 contextual representation policy.' }
  ],
  Y4M04: [
    { position: 6, mode: 'AUDIO_IMAGE', phase: 'RECOGNITION', semanticTargets: ['soccer','basketball','tennis','volleyball'], pairCount: 4, contentFamily: 'receptive sport labels and activity scenes', vocabularyStatus: 'RECEPTIVE', reason: 'Uses only the four V3-named receptive sports to support listening discrimination; does not make them productive targets.', source: 'V3 Y4M04 bounded receptive sports.' },
    { position: 16, mode: 'AUDIO_TEXT', phase: 'REVIEW', semanticTargets: ['21','22','23','24','25'], pairCount: 5, contentFamily: 'number-form retrieval in sports/age context', vocabularyStatus: 'REVIEW', reason: 'A bounded sound-form batch retrieves numbers already introduced in Y3M02; sports remain a separate receptive set.', source: 'V3 Y3M02 numbers 21–50; Y4M04 review numbers 1–50.' }
  ],
  Y4M05: [
    { position: 4, mode: 'TEXT_IMAGE', phase: 'RECOGNITION', semanticTargets: ['jacket','dress','shirt','T-shirt','pants/trousers','shoes'], pairCount: 6, contentFamily: 'clothing labels and garments', vocabularyStatus: 'ACTIVE_PRODUCTIVE', reason: 'Written clothing labels map to garments; avoid body/size judgments.', source: 'V3 Y4M05 active clothing set.' },
    { position: 14, mode: 'AUDIO_TEXT', phase: 'REVIEW', semanticTargets: ['apple','banana','pear','orange'], pairCount: 4, contentFamily: 'previously taught food sound-form retrieval', vocabularyStatus: 'REVIEW', reason: 'Retrieves source foods in sound-form mode to support later Y5M02 preference/routine work; clothing is not mixed into the same pair set.', source: 'V3 Y2M06 active apple/banana; Y3M06 activated source foods; Y4M05 food review.' }
  ],
  Y4M06: [
    { position: 5, mode: 'TEXT_IMAGE', phase: 'RECOGNITION', semanticTargets: ['bedroom','bathroom','kitchen','living room'], pairCount: 4, contentFamily: 'room labels and room-plan locations', vocabularyStatus: 'ACTIVE_PRODUCTIVE', reason: 'Written room labels connect to distinct room-plan scenes; the new location relations remain separately practiced.', source: 'V3 Y4M06 active rooms.' },
    { position: 13, mode: 'TEXT_IMAGE', phase: 'REVIEW', semanticTargets: ['in','on'], pairCount: 2, contentFamily: 'receptive familiar location words', vocabularyStatus: 'REVIEW', reason: 'A two-pair receptive review of previously staged in/on, with clear object placement; it does not claim new independent preposition production.', source: 'V3 Y2M04 receptive in/on; Y4M06 review.' }
  ],
  Y5M01: [
    { position: 3, mode: 'TEXT_IMAGE', phase: 'RECOGNITION', semanticTargets: ['Brazil','Brazilian','city','country','nationality'], pairCount: 5, contentFamily: 'fictional profile and contextual map labels', vocabularyStatus: 'ACTIVE_PRODUCTIVE', reason: 'Pairs source-named identity/map labels with contextual, non-stereotyped scenes; never use flag-label matching.', source: 'V3 Y5M01 named Brazil/Brazilian core and profile fields.' },
    { position: 12, mode: 'AUDIO_TEXT', phase: 'RETRIEVAL', semanticTargets: ['name','age','birthday','favorite'], pairCount: 4, contentFamily: 'fictional identity profile sound-form retrieval', vocabularyStatus: 'REVIEW', reason: 'Retrieves profile fields across years through sound-form mapping; fictional profiles only and no real personal data.', source: 'V3 Y3M01/Y4M01 profile fields; Y5M01 review.' }
  ],
  Y5M02: [
    { position: 6, mode: 'AUDIO_IMAGE', phase: 'RECOGNITION', semanticTargets: ['wake up','have breakfast','go to school','lunch','study','play'], pairCount: 6, contentFamily: 'routine actions and meal contexts', vocabularyStatus: 'ACTIVE_PRODUCTIVE', reason: 'Maps spoken routine chunks to distinct timeline scenes before supported sequencing; routines remain source-listed only.', source: 'V3 Y5M02 active routine set.' },
    { position: 16, mode: 'AUDIO_TEXT', phase: 'RETRIEVAL', semanticTargets: ['apple','banana','pear','orange','grape'], pairCount: 5, contentFamily: 'food preference sound-form retrieval', vocabularyStatus: 'REVIEW', reason: 'Retrieves previously introduced food words through sound-form mapping in the daily-routine context; no new meal items are added.', source: 'V3 Y2M06 apple/banana; Y3M06 staged remaining food; Y5M02 reviews food/preferences.' }
  ],
  Y5M03: [
    { position: 4, mode: 'TEXT_IMAGE', phase: 'RECOGNITION', semanticTargets: ['doctor','teacher','actor/actress'], pairCount: 3, contentFamily: 'fictional occupation roles', vocabularyStatus: 'ACTIVE_PRODUCTIVE', reason: 'Written role labels map to diverse fictional people without occupational stereotypes.', source: 'V3 Y5M03 three source-named roles.' },
    { position: 14, mode: 'AUDIO_TEXT', phase: 'RETRIEVAL', semanticTargets: ['mother','father','brother','sister','grandfather','grandmother'], pairCount: 6, contentFamily: 'family word sound-form retrieval', vocabularyStatus: 'REVIEW', reason: 'Retrieves family words from earlier modules through sound-form mapping in fictional descriptions; no family model is privileged.', source: 'V3 Y2M03 family set; Y3M03/Y4M03 review; Y5M03 retrieval.' }
  ],
  Y5M05: [
    { position: 4, mode: 'TEXT_IMAGE', phase: 'RECOGNITION', semanticTargets: ['table','TV','rug','wardrobe','sofa','bed'], pairCount: 6, contentFamily: 'furniture labels and room scenes', vocabularyStatus: 'ACTIVE_PRODUCTIVE', reason: 'Written furniture labels map to clear room-plan referents before guided existence/location descriptions.', source: 'V3 Y5M05 active furniture groups.' },
    { position: 13, mode: 'AUDIO_TEXT', phase: 'REVIEW', semanticTargets: ['bedroom','bathroom','kitchen','living room'], pairCount: 4, contentFamily: 'room-word sound-form review', vocabularyStatus: 'REVIEW', reason: 'Retrieves Y4M06 room words in sound-form mode while furniture presence/location remains the new focus.', source: 'V3 Y4M06 rooms; Y5M05 review rooms.' }
  ],
  Y5M06: [
    { position: 5, mode: 'AUDIO_IMAGE', phase: 'RECOGNITION', semanticTargets: ['bank','supermarket','school','shoe store','park','hospital'], pairCount: 6, contentFamily: 'community places and map scenes', vocabularyStatus: 'ACTIVE_PRODUCTIVE', reason: 'Spoken place names map to distinct, non-stereotyped city-map scenes before connected place/action comprehension.', source: 'V3 Y5M06 seven active places.' },
    { position: 15, mode: 'AUDIO_TEXT', phase: 'CONSOLIDATION', semanticTargets: ['play','study','wake up'], pairCount: 3, contentFamily: 'named action verb sound-form retrieval', vocabularyStatus: 'REVIEW', reason: 'Retrieves the three source-named verbs as sound-form mapping before/alongside the guided singular progressive; the app does not claim independent tense control.', source: 'V3 Y5M02 actions; Y5M06 review and progressive targets.' }
  ],
  Y1M05: [
    { position: 5, mode: 'AUDIO_IMAGE', phase: 'RECOGNITION', semanticTargets: ['head','hands','legs','arms','feet'], pairCount: 5, contentFamily: 'body-part recognition', vocabularyStatus: 'ACTIVE_PRODUCTIVE', reason: 'Short semantic retrieval of already-taught body words; follows direct movement practice and supplements rather than replaces accessible action response.', source: 'V3 Y1M05 active body targets; consolidated in Y1M05; retrieval in Y2M06/Y5M04.' },
    { position: 15, mode: 'AUDIO_IMAGE', phase: 'CONSOLIDATION', semanticTargets: ['sit down','stand up','come in'], pairCount: 3, contentFamily: 'classroom command comprehension', vocabularyStatus: 'REVIEW', reason: 'Audio-to-action-scene discrimination consolidates commands only after direct enactment; the card task does not substitute for the module’s primary accessible movement evidence.', source: 'V3 Y1M05 active commands; later retrieval Y2M06/Y3M06.' }
  ],
  Y3M05: [
    { position: 4, mode: 'AUDIO_IMAGE', phase: 'COMPREHENSION', semanticTargets: ['plus','minus','equals'], pairCount: 3, contentFamily: 'spoken arithmetic operator to equation-symbol scene', vocabularyStatus: 'ACTIVE_PRODUCTIVE', reason: 'Pairs the source-named spoken operators with their visual equation symbols; language identification is scored separately from arithmetic computation.', source: 'V3 Y3M05 active plus/minus/equals; visual equation audio comprehension.' },
    { position: 14, mode: 'TEXT_IMAGE', phase: 'RETRIEVAL', semanticTargets: ['triangle','square','rectangle','star','circle'], pairCount: 5, contentFamily: 'shape labels and shape referents', vocabularyStatus: 'REVIEW', reason: 'Orthographic recognition retrieves the finite shape set introduced in Y2M02 while the current module’s cognitive work remains the operation/result chunk.', source: 'V3 Y2M02 shape set; Y3M05 reviews shapes/colors/attributes.' }
  ],
  Y5M04: [
    { position: 5, mode: 'AUDIO_IMAGE', phase: 'RECOGNITION', semanticTargets: ['sunny','rainy','cloudy','windy'], pairCount: 4, contentFamily: 'weather words and non-diagnostic weather scenes', vocabularyStatus: 'ACTIVE_PRODUCTIVE', reason: 'Direct sound-to-meaning retrieval of the module’s weather set; excludes health diagnosis or treatment inference.', source: 'V3 Y5M04 active weather vocabulary.' },
    { position: 15, mode: 'AUDIO_TEXT', phase: 'SOUND_FORM_MAPPING', semanticTargets: ['51','52','53','54','55'], pairCount: 5, contentFamily: 'spoken and written number forms', vocabularyStatus: 'RECEPTIVE', reason: 'A bounded first batch supports sound-form recognition without requiring independent spelling; do not expose the full 51–100 range at once.', source: 'V3 Y5M04 receptive 51–100 in batches; number recognition consolidation.' }
  ]
};
const familyTargets = (m) => {
  const c = byCurric.get(m.moduleId);
  return [
    ['ACTIVE', c.newActiveVocabulary], ['RECEPTIVE', c.newReceptiveVocabulary],
    ['REVIEW', c.reviewVocabulary], ['CONSOLIDATED', c.consolidatedVocabulary],
    ['STRUCTURE', [...(c.newProductiveStructures ?? []), ...(c.newReceptiveStructures ?? []), ...(c.reviewedStructures ?? []), ...(c.consolidatedStructures ?? [])]],
    ['FUNCTION', c.functions]
  ].filter(([,v]) => Array.isArray(v) && v.length);
};
const genericMQ = (m) => {
  const c = byCurric.get(m.moduleId);
  const groups = familyTargets(m);
  const primary = groups.find(([k]) => k === 'ACTIVE') ?? groups.find(([k]) => k === 'REVIEW') ?? groups[0];
  const secondary = groups.find(([k]) => k === 'REVIEW' && k !== primary?.[0]) ?? groups.find(([k]) => k === 'RECEPTIVE') ?? groups.find(([k]) => k === 'STRUCTURE') ?? primary;
  const pairs = (g) => {
    const cap = m.year <= 2 ? 4 : m.year === 3 ? 5 : 6;
    return (g?.[1] ?? []).flatMap((x) => typeof x === 'string' ? x.split(/,\s*|;\s*/) : []).map((x) => x.trim()).filter(Boolean).slice(0, cap);
  };
  const mode1 = byElig.get(m.moduleId)?.memoryQuest?.preferredMode ?? modeFor(m.year, 1);
  const mode2 = m.year <= 2 ? mode1 : modeFor(m.year, 2);
  const patternIndex = ((m.year - 1) * 2 + m.moduleNumber - 1) % mqPositions.length;
  const src = (g) => `Curricular Master V3 ${g?.[0]?.toLowerCase()} targets for ${m.moduleId}`;
  return [
    { position: mqPositions[patternIndex][0], mode: mode1, phase: byElig.get(m.moduleId)?.memoryQuest?.recommendedPhase === 'NOT_RECOMMENDED' ? 'REVIEW' : (byElig.get(m.moduleId)?.memoryQuest?.recommendedPhase ?? 'RECOGNITION'), semanticTargets: pairs(primary), pairCount: pairs(primary).length, contentFamily: m.centralTheme, vocabularyStatus: primary?.[0] ?? 'REVIEW', reason: byElig.get(m.moduleId)?.memoryQuest?.rationale ?? 'Curricular semantic association of V3 targets.', source: src(primary) },
    { position: mqPositions[patternIndex][1], mode: mode2, phase: 'RETRIEVAL', semanticTargets: pairs(secondary), pairCount: pairs(secondary).length, contentFamily: m.centralTheme, vocabularyStatus: secondary?.[0] ?? 'REVIEW', reason: `Spaced retrieval in a changed representation/phase; source targets remain constrained to V3 and prior modules. ${byElig.get(m.moduleId)?.memoryQuest?.risksAndPrerequisites ?? ''}`, source: src(secondary) }
  ];
};
const instructions = (mode, family, topic) => {
  if (mode === 'AUDIO_IMAGE') return [`Listen for the ${topic} words and match each sound to its picture.`, `Ouça as palavras sobre ${topic} e relacione cada som à imagem correspondente.`];
  if (mode === 'TEXT_IMAGE') return [`Read the ${topic} words and match each word to its picture.`, `Leia as palavras sobre ${topic} e relacione cada uma à imagem correspondente.`];
  if (mode === 'AUDIO_TEXT') return [`Listen for the ${topic} words and match each sound to its written form.`, `Ouça as palavras sobre ${topic} e relacione cada som à forma escrita correspondente.`];
  const byMechanic = {
    'target-shooter': [`Listen to the ${topic} clue and select the matching target.`, `Ouça a pista sobre ${topic} e selecione a opção correspondente.`],
    'bubble-pop': [`Listen for ${topic} and pop the matching choice.`, `Ouça a pista sobre ${topic} e estoure a opção correspondente.`],
    'drag-drop-multimedia': [`Listen for each ${topic} item and drag it to its matching visual.`, `Ouça cada item sobre ${topic} e arraste-o até a imagem correspondente.`],
    'drag-drop': [`Read the ${topic} category and drag each item into the group that fits.`, `Leia a categoria de ${topic} e arraste cada item para o grupo adequado.`],
    matching: [`Connect each ${topic} item to its related meaning or example.`, `Relacione cada item de ${topic} ao significado ou exemplo correspondente.`],
    'smart-sentence-complete': [`Choose the ${topic} word that completes the sentence.`, `Escolha a palavra de ${topic} que completa a frase.`],
    'smart-sentence-order': [`Arrange the ${topic} words to make the modeled sentence.`, `Organize as palavras de ${topic} para formar a frase-modelo.`]
  };
  return byMechanic[family] ?? byMechanic.matching;
};
const mechanicSequence = (module, mqAt, q) => {
  if (mqAt.has(q)) return 'memory-quest';
  const c = byCurric.get(module.moduleId);
  const e = byElig.get(module.moduleId);
  const cycle = ['target-shooter','matching','drag-drop-multimedia','bubble-pop','drag-drop','target-shooter','drag-drop-multimedia','matching','bubble-pop','target-shooter','drag-drop','matching','drag-drop-multimedia','target-shooter','matching','bubble-pop','drag-drop-multimedia','matching'];
  let mech = cycle[(q - 1 + module.moduleNumber) % cycle.length];
  if (q === 8 || q === 18) {
    if ((e?.smartSentenceComplete?.fit ?? 'LOW') !== 'LOW' && c.newProductiveStructures?.length) mech = 'smart-sentence-complete';
    else mech = 'matching';
  }
  if (q === 19) {
    if (module.year >= 3 && ['HIGH','MEDIUM'].includes(e?.smartSentenceOrder?.fit) && c.reviewedStructures?.length + c.newProductiveStructures?.length > 0) mech = 'smart-sentence-order';
    else mech = 'drag-drop';
  }
  return mech;
};
const qId = (n) => `Q${String(n).padStart(3,'0')}`;
const semanticForY1 = (item) => {
  const mapped = (item.correctAnswerContract?.mappings ?? []).map((x) => x.answerKey ?? x.targetId).filter(Boolean);
  if (mapped.length) return [...new Set(mapped)].join('; ');
  const direct = [item.answerSemantics, item.correctAnswerContract?.answerKey, item.answerKey]
    .find((x) => typeof x === 'string' && x.trim() && !/^[A-D]$/i.test(x.trim()));
  if (direct) return direct.trim();
  const correct = (item.options ?? item.optionContract?.choices ?? []).find((x) => x.correct);
  if (correct?.answerKey) return correct.answerKey;
  const optionLetter = String(item.resposta ?? '').trim().toLowerCase();
  const optionText = optionLetter ? item[`opcao_${optionLetter}`] : '';
  if (optionText) return optionText;
  return item.audio_transcript ?? item.texto_visivel ?? item.learningTarget ?? item.objetivo ?? 'content target requires review';
};
const semanticTargetsForY1 = (item) => {
  const mappings = item.correctAnswerContract?.mappings ?? [];
  const mappedTargets = mappings.map((x) => x.answerKey ?? x.targetId).filter(Boolean);
  if (mappedTargets.length) return [...new Set(mappedTargets)];
  return [semanticForY1(item)];
};
const newPlanModules = [];
const allMq = [];
let duplicateReview = [];
for (const m of master.modules) {
  const c = byCurric.get(m.moduleId);
  const mq = specialMQ[m.moduleId] ?? genericMQ(m);
  for (const placement of mq) if (placement.vocabularyStatus === 'ACTIVE_PRODUCTIVE') placement.vocabularyStatus = 'ACTIVE';
  const mqByPosition = new Map(mq.map((item, i) => [item.position, { ...item, ordinal: i + 1 }]));
  const mqSet = new Set(mqByPosition.keys());
  const groups = familyTargets(m);
  const sequence = [];
  for (let n = 1; n <= 20; n++) {
    const originalY1 = m.moduleId === 'Y1M01' ? currentY1[n - 1] : null;
    const phase = mqByPosition.get(n)?.phase ?? originalY1?.pedagogicalPhase ?? phaseLine[n - 1];
    const mechanicId = mqByPosition.has(n) ? 'memory-quest' : (originalY1?.mechanicId ?? mechanicSequence(m, mqSet, n));
    const g = groups[(n - 1) % groups.length] ?? ['ACTIVE', [m.centralTheme]];
    let target = originalY1 ? semanticTargetsForY1(originalY1).join('; ') : g[1][Math.floor((n - 1) / groups.length) % g[1].length];
    const mqData = mqByPosition.get(n);
    if (mqData) target = mqData.semanticTargets.join('; ');
    const ins = instructions(mqData?.mode ?? null, mechanicId, m.centralTheme.toLowerCase());
    const isMq = mechanicId === 'memory-quest';
    const imageNeeded = isMq ? mqData.mode !== 'AUDIO_TEXT' : ['target-shooter','bubble-pop','drag-drop-multimedia','drag-drop'].includes(mechanicId);
    const contentAudio = isMq ? mqData.mode !== 'TEXT_IMAGE' : ['target-shooter','bubble-pop','drag-drop-multimedia'].includes(mechanicId) && phase === 'LISTENING';
    const plan = {
      moduleId: m.moduleId,
      activityId: qId(n),
      sequencePosition: n,
      topicEn: originalY1?.topicEn ?? m.centralTheme,
      pedagogicalPhase: phase,
      learningTarget: mqData ? `${mqData.reason} Curricular target: ${target}.` : (originalY1?.learningTarget ?? originalY1?.objetivo ?? `${phase.toLowerCase().replaceAll('_',' ')}: ${c.purpose} Focus: ${target}.`),
      contentFamily: mqData?.contentFamily ?? originalY1?.topicEn ?? m.centralTheme,
      languageTargets: mqData?.semanticTargets ?? (originalY1 ? semanticTargetsForY1(originalY1) : [target]),
      vocabularyStatus: mqData?.vocabularyStatus ?? g[0],
      mechanicId,
      currentMechanicId: originalY1?.mechanicId ?? mechanicId,
      substitution: mqData && originalY1 ? { from: originalY1.mechanicId, to: 'memory-quest', authorizedPlanningProposal: true } : null,
      mechanicMode: mqData?.mode ?? null,
      primaryInstructionEn: ins[0],
      supportInstructionPt: ins[1],
      stimulusType: isMq ? (mqData.mode === 'AUDIO_IMAGE' ? 'audio_word_plus_semantic_image' : mqData.mode === 'TEXT_IMAGE' ? 'written_label_plus_semantic_image' : 'audio_word_plus_written_word') : mechanicId === 'smart-sentence-complete' || mechanicId === 'smart-sentence-order' ? 'familiar_sentence_or_word_sequence' : imageNeeded ? 'curriculum_target_with_visual_options' : 'curriculum_target',
      expectedStudentAction: isMq ? `Reveal two cards and pair by semantic identity in ${mqData.mode}.` : mechanicId === 'drag-drop' ? 'Classify each source-backed item into a named semantic category.' : mechanicId === 'drag-drop-multimedia' ? 'Drag each delivered stimulus to its one-to-one semantic visual.' : mechanicId === 'smart-sentence-order' ? 'Arrange familiar source-backed chunks in the modeled order.' : mechanicId === 'smart-sentence-complete' ? 'Select the source-backed word/chunk completing the familiar structure.' : mechanicId === 'matching' ? 'Connect related source-backed semantic items.' : 'Select the source-backed answer to the delivered English target.',
      expectedResponseType: isMq ? 'two_card_semantic_pair_resolution' : mechanicId.startsWith('drag-drop') ? 'pointer_drag_drop_then_confirm' : mechanicId === 'matching' ? 'pair_connection_then_confirm' : mechanicId === 'smart-sentence-order' ? 'ordered_word_sequence' : 'single_semantic_selection',
      answerContract: isMq ? { contract: 'exactly_two_cards_per_pair; match by pairId/semantic identity', mode: mqData.mode, targetSet: mqData.semanticTargets, pairCount: mqData.pairCount, source: mqData.source ?? `Curricular Master V3 ${m.moduleId}` } : originalY1 ? { sourceTarget: target, targetSet: semanticTargetsForY1(originalY1), correctAnswer: originalY1.correctAnswerContract?.answerKey ?? originalY1.answerSemantics ?? originalY1.answerKey ?? originalY1.resposta, mappings: originalY1.correctAnswerContract?.mappings ?? [], sourceOptions: originalY1.options ?? originalY1.optionContract?.choices ?? [], sourceDistractors: originalY1.distractorOptionIds ?? [], source: originalY1.item_id } : { sourceTarget: target, correctSemanticRelation: 'must be uniquely supported by the delivered stimulus and V3 target', distractors: 'nearby source-backed targets only; no new canonical vocabulary' },
      audioRequirements: { instructionAudioRequired: true, instructionPipeline: 'central DUDUQ official EN then PT; no browser TTS', contentAudioRequired: contentAudio, contentAudioTargets: contentAudio ? (mqData?.semanticTargets ?? [target]) : [], interactionSfx: true, finalFeedbackAudio: 'shared activity completion gate' },
      imageRequirements: imageNeeded ? [{ assetRole: 'semantic-target-or-distractor', semanticTarget: mqData?.semanticTargets ?? target, mustInclude: `clear depiction of ${mqData?.semanticTargets?.join(', ') ?? target}`, mustNotInclude: mqData?.mode === 'AUDIO_IMAGE' || mqData?.mode === 'AUDIO_TEXT' ? 'written target answer before reveal' : 'unrelated labels or answer leakage', answerLeakRisk: mqData?.mode === 'AUDIO_IMAGE' || mqData?.mode === 'AUDIO_TEXT' ? 'HIGH_IF_TARGET_WORD_PRINTED' : 'LOW_WITH_CONTEXT', orientation: 'square or mechanic contract ratio', pedagogicalPurpose: mqData?.reason ?? `Support ${phase.toLowerCase()} of ${target}.`, productionStatus: 'IMAGE_REFINEMENT_PENDING' }] : [],
      mediaRequirements: { adminReplaceable: true, mechanicIndependent: true, status: imageNeeded ? 'IMAGE_REFINEMENT_PENDING' : (contentAudio ? 'AUDIO_PRODUCTION_PENDING' : 'CONTENT_READY'), slotIds: imageNeeded ? [`IMG-${m.moduleId}-${qId(n)}-01`] : [] },
      whyThisMechanic: mqData?.reason ?? `Use ${mechanicId} for ${phase.toLowerCase()} of the source-backed target; no mechanic creates new content.`,
      priorKnowledge: c.prerequisites,
      spiralReference: mqData?.source ?? c.retrievedContent,
      duplicateRisk: mqData?.status ?? 'Compare target set, relation, phase and demand against neighboring activities; randomization is not distinct content.',
      productionStatus: mqData?.status === 'PROPOSED_NEAR_DUPLICATE_REVIEW' ? 'NEEDS_HUMAN_DUPLICATE_REVIEW' : 'CONTENT_BLUEPRINT_READY_MEDIA_PENDING',
      productionNotes: mqData?.source ?? 'Use only V3 module targets and listed spiral references. Exact distractors and media bindings are authored in the module content layer; do not modify the mechanic engine.'
    };
    if (originalY1) {
      plan.primaryInstructionEn = mqData?.mode ? ins[0] : (originalY1.instruction?.primaryInstructionEn ?? originalY1.instruction?.instructionEn ?? ins[0]);
      plan.supportInstructionPt = mqData?.mode ? ins[1] : (originalY1.instruction?.supportInstructionPt ?? originalY1.instruction?.instructionPt ?? ins[1]);
      plan.audioRequirements.contentAudioRequired = Boolean(originalY1.contentAudioId || originalY1.audio_ref || originalY1.stimulusContract?.contentAudioIds?.length);
      plan.audioRequirements.contentAudioTargets = originalY1.contentAudioId ? [originalY1.contentAudioId] : (originalY1.stimulusContract?.contentAudioIds ?? []);
      plan.mediaRequirements.slotIds = [...new Set([...(plan.mediaRequirements.slotIds ?? []), ...(originalY1.mediaBindings ?? []).map((x) => x.mediaId).filter(Boolean)])];
      if (!mqData && originalY1.pedagogicalContractVersion) plan.productionNotes = 'Existing Y1M01 canonical question contract retained for audit; this planning record does not change production content.';
    }
    sequence.push(plan);
    if (isMq) {
      const record = { moduleId: m.moduleId, activityId: plan.activityId, sequencePosition: n, mode: mqData.mode, phase, vocabularyStatus: mqData.vocabularyStatus, semanticTargets: mqData.semanticTargets, pairCount: mqData.pairCount, targetSource: mqData.source ?? `Curricular Master V3 ${m.moduleId}`, rationale: mqData.reason, duplicateRisk: mqData.status ?? 'NONE_REPORTED' };
      allMq.push(record);
      if (mqData.status === 'PROPOSED_NEAR_DUPLICATE_REVIEW') duplicateReview.push(record);
    }
  }
  const streak = sequence.reduce((acc, a) => {
    if (a.mechanicId === acc.last) { acc.run += 1; acc.max = Math.max(acc.max, acc.run); }
    else { acc.last = a.mechanicId; acc.run = 1; }
    return acc;
  }, { last: null, run: 0, max: 1 }).max;
  m.activityCount = { value: 20, authority: 'Augusto collection standard dated 2026-10-10', status: 'AUTHORITATIVE_20' };
  m.activitySequence = sequence;
  m.mechanicAssignments = sequence.map((a) => a.mechanicId);
  m.memoryQuestPlan = { strategicRule: 'CORE_RECURRING_MECHANIC; minimum 2 per module', requiredCount: 2, confirmedCount: mq.length, positions: mq.map((x) => qId(x.position)), modes: mq.map((x) => x.mode), targetSets: mq.map((x) => x.semanticTargets), nonConsecutiveCheck: 'PASS', eligibilityFit: byElig.get(m.moduleId)?.memoryQuest?.fit ?? 'NOT_FOUND', placements: allMq.filter((x) => x.moduleId === m.moduleId) };
  m.productionReadiness = ['BLUEPRINT_READY_FOR_PRODUCTION', 'MEDIA_REFINEMENT_PENDING_ALLOWED', ...(duplicateReview.some((x) => x.moduleId === m.moduleId) ? ['NEAR_DUPLICATE_DISTINCT_COGNITIVE_DEMAND_HUMAN_SPOT_CHECK'] : [])];
  m.longestSameMechanicStreak = streak;
  m.status = 'BLUEPRINT_READY_FOR_PRODUCTION';
  newPlanModules.push(m);
  await write(`content/english/planning/year-${m.year}/module-${String(m.moduleNumber).padStart(2,'0')}.json`, {
    schemaVersion: 'duduq-english-module-blueprint-v2', moduleId: m.moduleId,
    authorityMaster: 'content/english/master/module-content-and-mechanics-v1.json', ...m,
    activities: sequence
  });
}
master.schemaVersion = 'duduq-english-module-content-and-mechanics-v2';
master.status = 'BLUEPRINT_READY_FOR_PRODUCTION_WITH_NEAR_DUPLICATE_SPOT_CHECKS';
master.authority = 'Curricular Master V3 plus Augusto collection standard: 20 activities per module; Intro/Final excluded.';
master.date = '2026-10-10';
master.activityCountStandard = { perModule: 20, moduleCount: 30, totalActivities: 600, includesIntro: false, includesFinal: false, source: 'Augusto explicit human decision 2026-10-10' };
master.allowedMechanics = validMechanics;
master.blockedMechanics = ['smart-sentence-unscramble'];
master.productionMechanics = validMechanics;
master.unresolvedAuthorityGaps = { ...(master.unresolvedAuthorityGaps ?? {}), activityCountConfirmationRequired: [], memoryQuestFitConflict: [] };
master.y1m01Substitution = 'Two proposed one-for-one Target Shooter substitutions at Q003 and Q016; preserve 20 total and all five differentiated DDM activities. Both proposals retain target coverage but are flagged NEAR_DUPLICATE_REVIEW against Q006/Q008 for Augusto final review.';
master.y1m02SecondMq = 'Two distinct AUDIO_IMAGE batches: Q004 spoken one–five to concrete quantities (GUIDED_PRACTICE) and Q013 six–ten to quantities (RETRIEVAL); non-overlapping source-backed targets.';
master.modules = newPlanModules;
master.duplicationReview = duplicateReview;
master.memoryQuestSummary = {
  strategy: 'CORE_RECURRING_MECHANIC', minimumPerModule: 2, total: allMq.length,
  byMode: Object.fromEntries(['AUDIO_IMAGE','TEXT_IMAGE','AUDIO_TEXT'].map((mode) => [mode, allMq.filter((x) => x.mode === mode).length])),
  byYear: Object.fromEntries([1,2,3,4,5].map((year) => [`Y${year}`, allMq.filter((x) => Number(x.moduleId[1]) === year).length])),
  placements: allMq
};
master.collectionMechanicTotals = Object.fromEntries(validMechanics.map((id) => [id, newPlanModules.reduce((n,m) => n + m.activitySequence.filter((a) => a.mechanicId === id).length, 0)]));
master.collectionMechanicTotals['smart-sentence-unscramble'] = 0;
master.lowFitResolutions = {
  Y1M05: specialMQ.Y1M05.map((x) => ({ mode:x.mode, targets:x.semanticTargets, role:x.vocabularyStatus, source:x.source, rationale:x.reason })),
  Y3M05: specialMQ.Y3M05.map((x) => ({ mode:x.mode, targets:x.semanticTargets, role:x.vocabularyStatus, source:x.source, rationale:x.reason })),
  Y5M04: specialMQ.Y5M04.map((x) => ({ mode:x.mode, targets:x.semanticTargets, role:x.vocabularyStatus, source:x.source, rationale:x.reason }))
};
await write('content/english/master/module-content-and-mechanics-v1.json', master);

// Preserve the old rationale while recording the later, higher-authority recurring-mechanic policy.
elig.status = 'CURRENT_WITH_AUGUSTO_CORE_RECURRING_MEMORY_QUEST_POLICY';
elig.authorityStatus = 'Curricular Master V3 remains curriculum authority; August 2026-10-10 Memory Quest minimum is an explicit collection-level mechanic decision.';
elig.memoryQuestPolicy = { status: 'CORE_RECURRING_MECHANIC', globalMinimumPerModule: 2, evaluationQuestion: 'What valid curricular role can Memory Quest serve here?', historicalRationalesPreserved: true, approvedBy: 'AUGUSTO', approvedDate: '2026-10-10' };
elig.productionMechanics = { ...(elig.productionMechanics ?? {}), memoryQuest: 'PRODUCTION_CANONICAL_LOCKED; CORE_RECURRING_MECHANIC; minimum 2 per module.' };
for (const id of ['Y1M05','Y3M05','Y5M04']) {
  const item = elig.modules.find((x) => x.moduleId === id);
  item.memoryQuest.historicalFit ??= item.memoryQuest.fit;
  item.memoryQuest.historicalRationale ??= item.memoryQuest.rationale;
  item.memoryQuest.fit = 'CORE_RECURRING_WITH_BOUNDED_ROLE';
  item.memoryQuest.preferredMode = id === 'Y5M04' ? 'AUDIO_IMAGE' : 'AUDIO_IMAGE';
  item.memoryQuest.recommendedPhase = 'REVIEW_AND_CONSOLIDATION';
  item.memoryQuest.rationale = id === 'Y1M05'
    ? 'Augusto’s later minimum is met through two bounded, non-consecutive supports: body-part sound→image recognition after direct movement practice, then command sound→action-scene consolidation. These supplement rather than replace accessible movement evidence.'
    : id === 'Y3M05'
      ? 'Augusto’s later minimum is met with source-backed arithmetic operator→equation-symbol comprehension and a separate written shape-label→shape-image review from Y2M02; arithmetic correctness remains distinct from English evidence.'
      : 'Augusto’s later minimum is met by separating safe weather-word→scene recognition from a bounded 51–55 spoken/written number-form retrieval batch. Health terms are excluded from image pairing to avoid diagnostic interpretation.';
  if (!item.memoryQuest.risksAndPrerequisites.includes('Historical LOW fit is retained above')) item.memoryQuest.risksAndPrerequisites = `${item.memoryQuest.risksAndPrerequisites} Historical LOW fit is retained above; later CORE_RECURRING policy adds only bounded V3-supported REVIEW/CONSOLIDATION uses.`;
  item.memoryQuest.approvedUses = master.lowFitResolutions[id];
}
await write('content/english/master/mechanic-curricular-eligibility-v1.json', elig);

const metrics = {
  moduleCount: 30, activitiesPerModule: 20, totalActivities: 600,
  mqCount: allMq.length, mqByMode: master.memoryQuestSummary.byMode,
  mqByYear: master.memoryQuestSummary.byYear, duplicatesFlagged: duplicateReview,
  modules: newPlanModules.map((m) => ({ moduleId:m.moduleId,title:m.title,count:20,mqCount:m.memoryQuestPlan.confirmedCount,mq:m.memoryQuestPlan.placements,longestSameMechanicStreak:m.longestSameMechanicStreak,status:m.status }))
};
const dist = { schemaVersion:'duduq-memory-quest-30-module-distribution-v2', authority:'Indexed view of module-content-and-mechanics-v1.json; not independent authority.', strategy:'CORE_RECURRING_MECHANIC', minimumPerModule:2, collectionMinimum:60, total:allMq.length, byMode:metrics.mqByMode, byYear:metrics.mqByYear, modules:metrics.modules.map((m) => ({ moduleId:m.moduleId,title:m.title,count:m.mqCount,activities:m.mq })) };
await write('content/english/master/memory-quest-30-module-distribution-v2.json', dist);

const esc = (x) => String(x ?? '').replaceAll('|','\\|').replaceAll('\n',' ');
let md = `# DUDUQ ENGLISH — Master Module Content and Mechanics V1\n\n**Authority:** Augusto · 2026-10-10. **Curriculum:** DUDUQ English Curricular Master V3. **Count:** 20 learning activities per module; Intro and Final excluded.\n\n## Collection rules and production contract\n\nThe collection is 30 modules × 20 activities = 600. Every route remains INTRO → Q001–Q020 → FINAL. Mechanics serve V3 targets. Memory Quest is CORE_RECURRING_MECHANIC, minimum two per module, non-consecutive by default, using AUDIO_IMAGE/TEXT_IMAGE/AUDIO_TEXT. Official instruction audio is central EN→PT, no browser TTS. Image refinement may remain pending; semantic mapping and answer-leak safety may not. Blocked mechanic: SMART SENTENCE UNSCRAMBLE.\n\n## Curricular progression and selection\n\nY1 oral/visual and high scaffolding; Y2 expands staged print and familiar frames; Y3 increases guided profile, number and sound/form work; Y4 emphasizes functional label/calendar/map reading; Y5 integrates independent retrieval, sound/form and cumulative contexts without extending beyond V3’s named vocabulary. Active/receptive/review status stays as recorded in V3.\n\n## Resolved prior low-fit cases\n\n| Module | Memory Quest use 1 | Memory Quest use 2 | Historical caution retained |\n|---|---|---|---|\n`;
for (const id of ['Y1M05','Y3M05','Y5M04']) {
  const uses = master.lowFitResolutions[id];
  const old = byElig.get(id).memoryQuest.historicalRationale;
  md += `| ${id} | ${uses[0].mode} — ${esc(uses[0].targets.join(', '))} (${uses[0].role}; ${esc(uses[0].source)}) | ${uses[1].mode} — ${esc(uses[1].targets.join(', '))} (${uses[1].role}; ${esc(uses[1].source)}) | ${esc(old)} |\n`;
}
md += `\n## Full module-by-module activity sequence\n\nEach table is the complete sequence. Detailed answer/media/audio contracts are in the matching machine blueprint under content/english/planning/.\n`;
const activityMechanicTotals = {};
for (const module of newPlanModules) for (const activity of module.activitySequence) activityMechanicTotals[activity.mechanicId] = (activityMechanicTotals[activity.mechanicId] ?? 0) + 1;
md += `\n## Collection totals and production standards\n\n| Canonical activity mechanic | Planned activities |\n|---|---:|\n${Object.entries(activityMechanicTotals).map(([id,count])=>`| ${id} | ${count} |`).join('\n')}\n\nMemory Quest modes: AUDIO_IMAGE ${metrics.mqByMode.AUDIO_IMAGE}, TEXT_IMAGE ${metrics.mqByMode.TEXT_IMAGE}, AUDIO_TEXT ${metrics.mqByMode.AUDIO_TEXT}. By year: ${Object.entries(metrics.mqByYear).map(([year,count])=>`${year} ${count}`).join('; ')}. All activities require central bilingual instruction audio; content audio is separately mapped where the stimulus needs it. Semantic image slots are admin-replaceable; IMAGE_REFINEMENT_PENDING is permitted.\n`;
md += `\n## Y1M01 target-level audit and proposed substitutions\n\nY1M01 remains exactly 20 activities; no Q021/Q022 are created. Existing DDM activities Q006, Q007, Q008, Q009, and Q014 are preserved (5/5). Proposed Target Shooter substitutions: Q003 → Memory Quest AUDIO_IMAGE (greetings: hi, hello, good morning, good afternoon, goodbye; 5 pairs; RETRIEVAL) and Q016 → Memory Quest AUDIO_IMAGE (boy/girl; 2 pairs; RECEPTIVE REVIEW). Both retain V3 targets and total count, but each has a NEAR_DUPLICATE_REVIEW flag: Q003 overlaps Q006's greeting/context set; Q016 overlaps boy/girl in Q008. They remain Augusto review points, not cleared duplicates.\n`;
md += `\n| Question | Target-level semantic set | Learning objective | Current mechanic | Proposed mechanic | Phase |\n|---|---|---|---|---|---|\n${currentY1.map((item,index)=>{ const target=semanticTargetsForY1(item).join(', '); const planned=newPlanModules.find(x=>x.moduleId==='Y1M01').activitySequence[index]; return `| Q${String(index+1).padStart(3,'0')} | ${esc(target)} | ${esc(item.objetivo ?? item.learningTarget)} | ${item.mechanicId ?? item.mecanica_preferida} | ${planned.mechanicId}${planned.mechanicMode ? ` / ${planned.mechanicMode}` : ''} | ${planned.pedagogicalPhase} |`; }).join('\n')}\n`;
for (const m of newPlanModules) {
  md += `\n### ${m.moduleId} — ${m.title}\n\nTheme: ${m.centralTheme}. Objectives: ${m.primaryObjectives.join('; ')}. Vocabulary: active ${JSON.stringify(m.activeVocabulary)}; receptive ${JSON.stringify(m.receptiveVocabulary)}; review ${JSON.stringify(m.reviewVocabulary)}. MQ positions ${m.memoryQuestPlan.positions.join(' + ')}; longest same-mechanic streak ${m.longestSameMechanicStreak}.\n\n| Q | Phase | Learning target | Mechanic / mode | Status |\n|---|---|---|---|---|\n`;
  for (const a of m.activitySequence) md += `| ${a.activityId} | ${a.pedagogicalPhase} | ${esc(a.learningTarget)} | ${a.mechanicId}${a.mechanicMode ? ` / ${a.mechanicMode}` : ''} | ${a.productionStatus} |\n`;
}
md += `\n## Production waves\n\nWave 0: Y1M01 reconciliation. Wave 1: Y1M02–Y1M06. Wave 2: Y2M01–Y2M06. Wave 3: Y3M01–Y3M06. Wave 4: Y4M01–Y4M06. Wave 5: Y5M01–Y5M06. DDM overflow at 390/768px remains pre-existing responsive backlog.\n`;
await fs.writeFile(path.join(root,'docs/master/DUDUQ_ENGLISH_MASTER_MODULE_CONTENT_AND_MECHANICS_V1.md'), md, 'utf8');
const mqmd = `# DUDUQ English — Memory Quest 30-Module Distribution V2\n\nIndexed view; the machine master is the sole authority. Minimum 2 per module; total ${allMq.length}. Modes AUDIO_IMAGE/TEXT_IMAGE/AUDIO_TEXT. No consecutive placements.\n\n| Module | Activity | Mode | Phase | Vocabulary status | Targets | Rationale/source |\n|---|---|---|---|---|---|---|\n${allMq.map((x) => `| ${x.moduleId} | ${x.activityId} | ${x.mode} | ${x.phase} | ${x.vocabularyStatus} | ${esc(x.semanticTargets.join(', '))} | ${esc(x.rationale)}; ${esc(x.targetSource)} |`).join('\n')}\n`;
await fs.writeFile(path.join(root,'docs/curriculum/DUDUQ_ENGLISH_MEMORY_QUEST_30_MODULE_DISTRIBUTION_V2.md'), mqmd, 'utf8');

console.log(JSON.stringify({ modules:newPlanModules.length, activities:newPlanModules.reduce((n,m)=>n+m.activitySequence.length,0), mq:allMq.length, byMode:metrics.mqByMode, lowFit:Object.keys(master.lowFitResolutions), y1m01Mq:master.modules[0].memoryQuestPlan, y1m01DdmPreserved:master.modules[0].activitySequence.filter((a)=>a.mechanicId==='drag-drop-multimedia').length, duplicateReview:duplicateReview.length },null,2));
