import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.resolve(process.argv[2] || '');
const sourceRepo = 'https://github.com/augustoborgessousa93/Assets-DuduQ';
const sourceBranch = 'main';
const sourceCommit = '21d6f583333c45109d0e16ec40f77d86dffa54f5';
const sourceDirectory = 'Imagens Ilustrativa';
const requirementManifestPath = path.join(repoRoot, 'content/english/media/image-generation-manifest.json');
const outputPath = path.join(repoRoot, 'content/english/year-1/module-01/image-resolution-map.json');
const qaAssetDirectory = path.join(repoRoot, 'qa/y1m01-image-bank/assets');
const mediaManifestPath = requirementManifestPath;

if (!sourceRoot || !fs.existsSync(sourceRoot)) {
  throw new Error('Pass the local read-only clone folder `Imagens Ilustrativa` as the first argument.');
}

const curated = [
  {
    id: 'Y1M01-MEDIA-01', status: 'REVIEW_REQUIRED', purpose: 'Generic greeting discrimination; learners identify a greeting without reading.',
    assets: [{ file: 'criancas_se_cumprimentando_children_greeting_hello.png', type: 'candidate', confidence: 0.72, reason: 'A visually inspected pair of children greeting each other with a handshake; there is no text and the action reads as greeting, but it does not show the explicitly requested wave and has no school setting.', composition: 'Could serve as a two-speaker greeting scene only if the handshake is accepted as the greeting gesture; do not treat as exact until reviewed.' }]
  },
  {
    id: 'Y1M01-MEDIA-02', status: 'REVIEW_REQUIRED', purpose: 'Informal greeting gesture recognition.',
    assets: [{ file: 'Hello - oi.png', type: 'candidate', confidence: 0.76, reason: 'Visually inspected single child smiles and waves; isolated transparent cutout, no text. It lacks the required school context and does not itself form a scene.', composition: 'Potential cutout for runtime composition if an approved neutral school backdrop exists; current bank scene backdrops introduce time/arrival cues.' }]
  },
  {
    id: 'Y1M01-MEDIA-03', status: 'EXACT_REUSE', purpose: 'Recognize a morning greeting from morning light and school arrival.',
    assets: [{ file: 'chegada_escola_manha_arriving_at_school_morning.png', type: 'exact', confidence: 0.94, reason: 'Visually inspected full scene: school gate/building, low bright morning sun, children arriving, foreground girl waves. No visible wording, no departure action, and the morning/arrival cue is clear.', composition: 'Use as a single scene; preserve the original crop and do not pair it with afternoon/farewell cues.' }]
  },
  {
    id: 'Y1M01-MEDIA-04', status: 'REVIEW_REQUIRED', purpose: 'Distinguish an afternoon greeting using afternoon light in a school context.',
    assets: [
      { file: 'Good Afternoon.png', type: 'candidate', confidence: 0.78, reason: 'Visually inspected child waving against a strong orange sunset; clearly afternoon/evening, no text, but the scene is a waterfront/park rather than school.', composition: 'Strong afternoon light/action candidate, but setting mismatch must be approved.' },
      { file: 'boy_tarde_afternoon_periodo_da_tarde.png', type: 'candidate', confidence: 0.39, reason: 'Visually inspected daytime park scene with a boy; sun is high and there is no greeting gesture or school context, so the filename alone overstates its fit.', composition: 'Not a safe exact match; included as a lower-confidence alternative for human review.' }
    ]
  },
  {
    id: 'Y1M01-MEDIA-05', status: 'REVIEW_REQUIRED', purpose: 'Recognize farewell as one child leaving and waving at a school exit.',
    assets: [
      { file: 'Bye - tchau.png', type: 'candidate', confidence: 0.70, reason: 'Visually inspected isolated child smiling and waving, no text and no arrival cue, but there is no school exit in the image.', composition: 'Could be layered over an approved school exit background, but a suitable uncomplicated background is not established.' },
      { file: 'Bye-tchau.png', type: 'candidate', confidence: 0.45, reason: 'Visually inspected static scene with two children waving against a plain white background; no school exit and it does not meet the single-child composition.', composition: 'Lower-confidence alternative; the white field would need a suitable runtime scene treatment.' },
      { file: 'Bye-Tchau.gif', type: 'candidate', confidence: 0.35, reason: 'Visually inspected animated waving child; the visible background is saturated chroma green and there is no school setting, so the source is not ready for direct reuse.', composition: 'Do not use as-is; any keying/derivative would need separate approval and visual QA.' },
      { file: 'saida_da_escola_leaving_school_school_exit.png', type: 'candidate', confidence: 0.66, reason: 'Visually inspected school doorway/stairs and children moving out with a bus; it communicates departure but shows more than one departing child and no clear wave. An analog clock is also visible.', composition: 'Strong setting/departure candidate, but it does not satisfy the single-child-plus-wave requirement alone.' }
    ]
  },
  {
    id: 'Y1M01-MEDIA-06', status: 'REVIEW_REQUIRED', purpose: 'Compare morning, afternoon and farewell through clearly separated time/context scenes.',
    assets: [
      { file: 'chegada_escola_manha_arriving_at_school_morning.png', type: 'candidate', confidence: 0.80, reason: 'Visually inspected and provides an unambiguous school-arrival/morning panel.', composition: 'Use as one independent panel.' },
      { file: 'Good Afternoon.png', type: 'candidate', confidence: 0.64, reason: 'Visually inspected and provides an unambiguous sunset/afternoon panel, though not a school setting.', composition: 'Use only as an independent panel after human approval of the setting mismatch.' },
      { file: 'saida_da_escola_leaving_school_school_exit.png', type: 'candidate', confidence: 0.63, reason: 'Visually inspected and provides a school-exit/departure panel; it has no wave and includes multiple departing children.', composition: 'Three panels can be laid out by the existing runtime; scene differences and clue clarity require review.' }
    ]
  },
  {
    id: 'Y1M01-MEDIA-07', status: 'REVIEW_REQUIRED', purpose: 'Relate a two-speaker greeting gesture to the Hello/Hi dialogue audio.',
    assets: [{ file: 'criancas_se_cumprimentando_children_greeting_hello.png', type: 'candidate', confidence: 0.74, reason: 'Visually inspected two children make a friendly handshake, with no embedded dialogue or words. Gesture is social greeting but not the brief’s clearest wave; transparent cutout has no school setting.', composition: 'Candidate for a two-speaker scene only after review; never bake dialogue text into artwork.' }]
  },
  {
    id: 'Y1M01-MEDIA-08', status: 'COMPOSITE_FROM_EXISTING', purpose: 'Show one speaker asking a name without requiring the learner to read a written question.',
    assets: [{ file: 'My name.png', type: 'composite', confidence: 0.83, reason: 'Visually inspected single child points to a blank name badge; a large question-mark symbol is pictorial rather than a written question. It is a strong speaker cue, though no school background is present.', composition: 'Pair with the canonical runtime question/audio icon as UI, not as baked artwork; retain the blank tag and do not add a written question.' }]
  },
  {
    id: 'Y1M01-MEDIA-09', status: 'COMPOSITE_FROM_EXISTING', purpose: 'Identify Leo visually while using a short, readable name tag.',
    assets: [{ file: 'Leo.png', type: 'composite', confidence: 0.84, reason: 'Visually inspected isolated child portrait; its source identity is the Leo character asset, no embedded text.', composition: 'Compose with the canonical runtime short label “LEO”; the label is a runtime layer, not part of the source art.' }]
  },
  {
    id: 'Y1M01-MEDIA-10', status: 'COMPOSITE_FROM_EXISTING', purpose: 'Pick Mia from a visual set while preserving the ANA/MIA/LEO names.',
    assets: [
      { file: 'Mia.png', type: 'composite', confidence: 0.86, reason: 'Visually inspected Mia character cutout; visual identity is distinguishable from the other named character assets.', composition: 'Runtime character card with short MIA tag.' },
      { file: 'Leo.png', type: 'component', confidence: 0.83, reason: 'Visually inspected named character cutout; no text.', composition: 'Runtime character card with short LEO tag.' },
      { file: 'Ana.png', type: 'component', confidence: 0.83, reason: 'Visually inspected Ana character cutout waving; no text.', composition: 'Runtime character card with short ANA tag.' }
    ]
  },
  {
    id: 'Y1M01-MEDIA-11', status: 'COMPOSITE_FROM_EXISTING', purpose: 'Read the short ANA/MIA/LEO tags on a consistent character-card set.',
    assets: [
      { file: 'Ana.png', type: 'composite', confidence: 0.84, reason: 'Visually inspected named character cutout, no embedded label.', composition: 'Place on a consistent runtime card and render the canonical ANA label outside the artwork.' },
      { file: 'Mia.png', type: 'component', confidence: 0.86, reason: 'Visually inspected named character cutout, no embedded label.', composition: 'Place on the same runtime card system with MIA label.' },
      { file: 'Leo.png', type: 'component', confidence: 0.83, reason: 'Visually inspected named character cutout, no embedded label.', composition: 'Place on the same runtime card system with LEO label.' }
    ]
  },
  {
    id: 'Y1M01-MEDIA-12', status: 'COMPOSITE_FROM_EXISTING', purpose: 'Present a two-turn question/answer exchange through character cards and audio controls.',
    assets: [
      { file: 'Leo.png', type: 'composite', confidence: 0.78, reason: 'Visually inspected single-character portrait, suitable as one side of a two-card interaction.', composition: 'Pair with Mia.png and canonical runtime question/response audio icons; no dialogue text baked into the image.' },
      { file: 'Mia.png', type: 'component', confidence: 0.78, reason: 'Visually inspected single-character portrait, suitable as the response side.', composition: 'Pair with canonical runtime response audio icon; preserve separate cards.' }
    ]
  },
  {
    id: 'Y1M01-MEDIA-13', status: 'REVIEW_REQUIRED', purpose: 'Compare boy/girl with an inclusive trio, without gender stereotypes or color-only cues.',
    assets: [
      { file: 'boy - menino.png', type: 'candidate', confidence: 0.58, reason: 'Visually inspected isolated blond boy in blue/red clothing; no words. Clothing and presentation are strongly gender-coded, so it does not satisfy the neutral-clothing rule on its own.', composition: 'Candidate only; review whether a runtime set can avoid making color/clothing the gender clue.' },
      { file: 'Girl - menina.png', type: 'candidate', confidence: 0.54, reason: 'Visually inspected isolated girl with bows and pink/purple clothing; no words. Presentation is strongly gender-coded.', composition: 'Candidate only; do not use outfit color as the answer cue.' },
      { file: 'wheelchair_boy.png', type: 'candidate', confidence: 0.68, reason: 'Visually inspected boy using a wheelchair, providing representation diversity; clothing remains blue-coded and source is a cutout.', composition: 'Potential inclusive third character, pending human review of trio balance and neutral visual cues.' }
    ]
  },
  {
    id: 'Y1M01-MEDIA-14', status: 'COMPOSITE_FROM_EXISTING', purpose: 'Identify Mia in a short self-introduction without relying on long text.',
    assets: [{ file: 'Mia.png', type: 'composite', confidence: 0.86, reason: 'Visually inspected named character cutout, no baked name label or sentence.', composition: 'Add only a short runtime MIA tag; keep transcript/audio separate.' }]
  },
  {
    id: 'Y1M01-MEDIA-15', status: 'REVIEW_REQUIRED', purpose: 'Contrast Leo/name context across three time scenes without sharing time cues.',
    assets: [
      { file: 'Leo.png', type: 'candidate', confidence: 0.63, reason: 'Visually inspected named Leo cutout, but it has no morning context.', composition: 'Runtime Leo identifier may be composited with separate time scenes.' },
      { file: 'chegada_escola_manha_arriving_at_school_morning.png', type: 'candidate', confidence: 0.70, reason: 'Visually inspected school arrival and morning sun, but the foreground character is not the named Leo asset.', composition: 'Potential morning panel; identity mismatch requires compositing/review.' },
      { file: 'Good Afternoon.png', type: 'candidate', confidence: 0.50, reason: 'Visually inspected afternoon scene; no Leo and no school setting.', composition: 'Potential contrasting panel only if school-setting mismatch is approved.' },
      { file: 'saida_da_escola_leaving_school_school_exit.png', type: 'candidate', confidence: 0.50, reason: 'Visually inspected school-exit scene; no clearly identifiable Leo.', composition: 'Potential third panel only; verify distinct time cues and identity before reuse.' }
    ]
  },
  {
    id: 'Y1M01-MEDIA-16', status: 'REVIEW_REQUIRED', purpose: 'Identify Ana as the child leaving while peers remain at the school exit.',
    assets: [
      { file: 'Ana.png', type: 'candidate', confidence: 0.62, reason: 'Visually inspected waving Ana character cutout; no school exit or leaving direction.', composition: 'Can identify Ana in a runtime character layer but does not itself show departure.' },
      { file: 'saida_da_escola_leaving_school_school_exit.png', type: 'candidate', confidence: 0.57, reason: 'Visually inspected school exit with multiple children leaving; it lacks a clear Ana match and shows peers departing rather than staying.', composition: 'Strong exit setting but conflicts with “Ana leaving, peers staying”; do not use without human approval.' }
    ]
  }
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}
function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function imageSize(file, ext) {
  const bytes = fs.readFileSync(file);
  if ((ext === '.png' || ext === '') && bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (ext === '.gif') return { width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) };
  if (ext === '.svg') {
    const svg = bytes.toString('utf8');
    const width = Number(svg.match(/\bwidth=["']([\d.]+)/i)?.[1]);
    const height = Number(svg.match(/\bheight=["']([\d.]+)/i)?.[1]);
    return { width: Number.isFinite(width) ? width : null, height: Number.isFinite(height) ? height : null };
  }
  return { width: null, height: null };
}
function words(filename) {
  return [...new Set(filename.replace(/\.[^.]+$/, '').replace(/([a-z])([A-Z])/g, '$1 $2').split(/[^\p{L}\p{N}]+/u).filter(Boolean).map((word) => word.toLowerCase()))];
}

const files = walk(sourceRoot).sort((a, b) => a.localeCompare(b));
const records = files.map((absolute) => {
  const stat = fs.statSync(absolute);
  const filename = path.basename(absolute);
  const extension = path.extname(filename).toLowerCase();
  const digest = sha256(absolute);
  const dims = imageSize(absolute, extension);
  const relativePath = `${sourceDirectory}/${path.relative(sourceRoot, absolute).split(path.sep).join('/')}`;
  return {
    sourceFilename: filename,
    sourcePath: relativePath,
    extension: extension || '(no extension)',
    fileSize: stat.size,
    sourceSHA: digest,
    assetGroupSHA: digest,
    dimensions: dims,
    visualConcept: `Filename-derived: ${filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')} (not visually confirmed outside the Y1M01 candidate set).`,
    semanticKeywords: words(filename),
    embeddedText: 'UNKNOWN (not individually OCR-reviewed)',
    characterNames: 'UNKNOWN (except candidates separately visually assessed below)',
    action: 'UNKNOWN (except candidates separately visually assessed below)',
    setting: 'UNKNOWN (except candidates separately visually assessed below)',
    timeOfDay: 'UNKNOWN (except candidates separately visually assessed below)',
    possibleReuseTopics: words(filename),
    visualInspection: 'INVENTORIED; not selected as a serious Y1M01 candidate'
  };
});
const byFilename = new Map(records.map((record) => [record.sourceFilename, record]));
const bySha = new Map(records.map((record) => [record.sourceSHA, record]));
const visualNotes = {
  'criancas_se_cumprimentando_children_greeting_hello.png': { visualConcept: 'Two smiling children greeting with a handshake; transparent-background 3D character cutouts.', embeddedText: 'NONE_VISIBLE', characterNames: 'UNKNOWN', action: 'Handshake/greeting; not waving.', setting: 'Transparent cutout; no scene setting.', timeOfDay: 'UNKNOWN', possibleReuseTopics: ['greeting', 'social interaction', 'two speakers'] },
  'Hello - oi.png': { visualConcept: 'Single smiling child waving, close portrait; transparent-background 3D cutout.', embeddedText: 'NONE_VISIBLE', characterNames: 'UNKNOWN', action: 'Friendly wave.', setting: 'Transparent cutout; no scene setting.', timeOfDay: 'UNKNOWN', possibleReuseTopics: ['hello', 'informal greeting', 'wave'] },
  'Good Morning.png': { visualConcept: 'Child waking up in bed with rising sun; 3D bedroom scene.', embeddedText: 'NONE_VISIBLE', characterNames: 'UNKNOWN', action: 'Waking/stretching, not arriving at school.', setting: 'Bedroom.', timeOfDay: 'Sunrise/morning.', possibleReuseTopics: ['morning routine', 'waking up'] },
  'chegada_escola_manha_arriving_at_school_morning.png': { visualConcept: 'Girl turns and waves at a school gate as students arrive; bright low morning sun.', embeddedText: 'NONE_VISIBLE', characterNames: 'UNKNOWN', action: 'School arrival and wave.', setting: 'School gate/building.', timeOfDay: 'Morning/sunrise.', possibleReuseTopics: ['school arrival', 'morning greeting', 'school'] },
  'boy_manha_morning_sunrise_sol_nascendo.png': { visualConcept: 'Boy waking beside bedroom window with sunrise.', embeddedText: 'NONE_VISIBLE', characterNames: 'UNKNOWN', action: 'Waking/stretching.', setting: 'Bedroom.', timeOfDay: 'Sunrise/morning.', possibleReuseTopics: ['morning routine', 'waking up'] },
  'girl_manha_morning_sunrise_sol_nascendo.png': { visualConcept: 'Girl waking beside bedroom window with sunrise.', embeddedText: 'NONE_VISIBLE', characterNames: 'UNKNOWN', action: 'Waking/stretching.', setting: 'Bedroom.', timeOfDay: 'Sunrise/morning.', possibleReuseTopics: ['morning routine', 'waking up'] },
  'Good Afternoon.png': { visualConcept: 'Girl waves in a vivid sunset waterfront/park scene.', embeddedText: 'NONE_VISIBLE', characterNames: 'UNKNOWN', action: 'Friendly wave.', setting: 'Waterfront/park, no school visible.', timeOfDay: 'Strong sunset/late afternoon.', possibleReuseTopics: ['afternoon greeting', 'sunset', 'wave'] },
  'boy_tarde_afternoon_periodo_da_tarde.png': { visualConcept: 'Boy sitting outdoors under a high sun; park/field scene.', embeddedText: 'NONE_VISIBLE', characterNames: 'UNKNOWN', action: 'Resting outdoors; not greeting.', setting: 'Park/field.', timeOfDay: 'Bright daytime; exact afternoon is ambiguous.', possibleReuseTopics: ['outdoor afternoon', 'daytime'] },
  'Bye - tchau.png': { visualConcept: 'Single smiling child waving with backpack; transparent-background cutout.', embeddedText: 'NONE_VISIBLE', characterNames: 'UNKNOWN', action: 'Farewell wave.', setting: 'Transparent cutout; no school exit.', timeOfDay: 'UNKNOWN', possibleReuseTopics: ['farewell', 'goodbye', 'wave'] },
  'Bye-tchau.png': { visualConcept: 'Two children waving against a plain white scene background.', embeddedText: 'NONE_VISIBLE', characterNames: 'UNKNOWN', action: 'Two-person wave/farewell.', setting: 'Plain white background; no school exit.', timeOfDay: 'UNKNOWN', possibleReuseTopics: ['farewell', 'goodbye', 'wave'] },
  'Bye-Tchau.gif': { visualConcept: 'Animated child waving against saturated chroma-green background.', embeddedText: 'NONE_VISIBLE', characterNames: 'UNKNOWN', action: 'Animated farewell wave.', setting: 'Chroma-green background; no school exit.', timeOfDay: 'UNKNOWN', possibleReuseTopics: ['farewell', 'goodbye', 'wave', 'animation'] },
  'saida_da_escola_leaving_school_school_exit.png': { visualConcept: 'Two children descend school steps by an open doorway and school bus.', embeddedText: 'NONE_VISIBLE', characterNames: 'UNKNOWN', action: 'Multiple children leaving school; no clear wave.', setting: 'School doorway/exit, stairs, bus.', timeOfDay: 'UNKNOWN; analog clock present.', possibleReuseTopics: ['school exit', 'departure', 'farewell'] },
  'Leo.png': { visualConcept: 'Isolated blond boy character giving a thumbs-up.', embeddedText: 'NONE_VISIBLE', characterNames: 'Leo (asset filename/character identity)', action: 'Thumbs-up pose.', setting: 'Transparent cutout.', timeOfDay: 'UNKNOWN', possibleReuseTopics: ['Leo', 'character card', 'name tag'] },
  'Mia.png': { visualConcept: 'Isolated girl character waving.', embeddedText: 'NONE_VISIBLE', characterNames: 'Mia (asset filename/character identity)', action: 'Wave.', setting: 'Transparent cutout.', timeOfDay: 'UNKNOWN', possibleReuseTopics: ['Mia', 'character card', 'name tag'] },
  'Ana.png': { visualConcept: 'Isolated red-haired girl character waving.', embeddedText: 'NONE_VISIBLE', characterNames: 'Ana (asset filename/character identity)', action: 'Wave.', setting: 'Transparent cutout.', timeOfDay: 'UNKNOWN', possibleReuseTopics: ['Ana', 'character card', 'name tag'] },
  'My name.png': { visualConcept: 'Single boy points to a blank name badge; large pictorial question mark.', embeddedText: 'NO_WRITTEN_WORDS; pictorial question-mark symbol and blank badge.', characterNames: 'UNKNOWN', action: 'Points to self/name badge.', setting: 'Transparent cutout.', timeOfDay: 'UNKNOWN', possibleReuseTopics: ['name question', 'self-introduction', 'name tag'] },
  'boy - menino.png': { visualConcept: 'Isolated blond boy in blue/red clothing.', embeddedText: 'NONE_VISIBLE', characterNames: 'UNKNOWN', action: 'Neutral standing portrait.', setting: 'Transparent cutout.', timeOfDay: 'UNKNOWN', possibleReuseTopics: ['boy', 'character card'] },
  'Girl - menina.png': { visualConcept: 'Isolated girl with bows in pink/purple clothing.', embeddedText: 'NONE_VISIBLE', characterNames: 'UNKNOWN', action: 'Neutral standing portrait.', setting: 'Transparent cutout.', timeOfDay: 'UNKNOWN', possibleReuseTopics: ['girl', 'character card'] },
  'father-pai.png': { visualConcept: 'Isolated smiling adult man.', embeddedText: 'NONE_VISIBLE', characterNames: 'UNKNOWN', action: 'Standing portrait.', setting: 'Transparent cutout.', timeOfDay: 'UNKNOWN', possibleReuseTopics: ['adult', 'family', 'father'] },
  'mother - mãe.png': { visualConcept: 'Isolated smiling adult woman.', embeddedText: 'NONE_VISIBLE', characterNames: 'UNKNOWN', action: 'Standing portrait.', setting: 'Transparent cutout.', timeOfDay: 'UNKNOWN', possibleReuseTopics: ['adult', 'family', 'mother'] },
  'y3-duo-leo-mia-context.png': { visualConcept: 'Two children side by side smiling and gesturing; transparent cutout.', embeddedText: 'NONE_VISIBLE', characterNames: 'Leo and Mia (filename identity)', action: 'Friendly pose; not clearly a wave/dialogue exchange.', setting: 'Transparent cutout.', timeOfDay: 'UNKNOWN', possibleReuseTopics: ['Leo', 'Mia', 'two children', 'dialogue'] },
  'y3-duo-leo-maya-context.png': { visualConcept: 'Two children facing each other in a conversational pose; transparent cutout.', embeddedText: 'NONE_VISIBLE', characterNames: 'Leo and Maya (filename identity)', action: 'Conversation gesture.', setting: 'Transparent cutout.', timeOfDay: 'UNKNOWN', possibleReuseTopics: ['Leo', 'Maya', 'dialogue', 'conversation'] }
};
for (const [filename, notes] of Object.entries(visualNotes)) {
  const record = byFilename.get(filename);
  if (record) Object.assign(record, notes, { visualInspection: 'VISUALLY_INSPECTED' });
}

fs.mkdirSync(qaAssetDirectory, { recursive: true });
for (const entry of curated) {
  for (const candidate of entry.assets) {
    const asset = byFilename.get(candidate.file);
    if (!asset) throw new Error(`Candidate not found in source bank: ${candidate.file}`);
    const aliases = records.filter((record) => record.sourceSHA === asset.sourceSHA);
    const previewName = `${asset.sourceSHA.slice(0, 12)}-${candidate.file.replace(/[^a-zA-Z0-9._-]+/g, '-')}`;
    const previewPath = path.join(qaAssetDirectory, previewName);
    if (!fs.existsSync(previewPath)) fs.copyFileSync(path.join(sourceRoot, path.relative(`${sourceDirectory}/`, asset.sourcePath)), previewPath);
    candidate.sourceFilename = candidate.file;
    candidate.sourcePath = asset.sourcePath;
    candidate.sourceSHA = asset.sourceSHA;
    candidate.sourceRepo = sourceRepo;
    candidate.sourceBranch = sourceBranch;
    candidate.sourceCommit = sourceCommit;
    candidate.extension = asset.extension;
    candidate.fileSize = asset.fileSize;
    candidate.dimensions = asset.dimensions;
    candidate.aliasesSameSHA = aliases.filter((record) => record.sourceFilename !== asset.sourceFilename).map((record) => record.sourcePath);
    candidate.qaPreviewPath = `/qa/y1m01-image-bank/assets/${previewName}`;
    candidate.requiresComposition = candidate.type === 'composite' || candidate.type === 'component' || Boolean(candidate.composition);
    candidate.matchType = candidate.type;
    delete candidate.file;
  }
}

const manifest = JSON.parse(fs.readFileSync(requirementManifestPath, 'utf8'));
const requirementMap = new Map(manifest.entries.map((entry) => [entry.requirementId, entry]));
if (curated.length !== 16 || manifest.entries.length !== 16) throw new Error('Expected 16 curated entries and 16 manifest entries.');
const entries = curated.map((resolution) => {
  const requirement = requirementMap.get(resolution.id);
  if (!requirement) throw new Error(`Requirement not found: ${resolution.id}`);
  return {
    ...requirement,
    resolutionStatus: resolution.status,
    humanApproval: 'PENDING — classification is a proposal, not an approval',
    futureGenerationPlanning: resolution.status === 'EXACT_REUSE' || resolution.status === 'COMPOSITE_FROM_EXISTING'
      ? 'HOLD_PENDING_HUMAN_APPROVAL; do not queue image generation'
      : resolution.status === 'TO_GENERATE' ? 'TO_GENERATE' : 'HUMAN_REVIEW_BEFORE_GENERATION_DECISION',
    pedagogicalPurpose: resolution.purpose,
    candidateAssets: resolution.assets
  };
});
const groups = new Map();
for (const record of records) groups.set(record.sourceSHA, (groups.get(record.sourceSHA) || 0) + 1);
const audit = {
  schemaVersion: '1.0',
  auditType: 'Y1M01_SMART_IMAGE_BANK_AUDIT',
  createdAt: new Date().toISOString(),
  source: { repository: sourceRepo, branch: sourceBranch, commit: sourceCommit, folder: sourceDirectory, readOnlyClone: true },
  summary: {
    bankFilesInventoried: records.length,
    uniqueVisualFilesBySHA: groups.size,
    aliasFiles: records.length - groups.size,
    imageRequirements: entries.length,
    exactReuse: entries.filter((entry) => entry.resolutionStatus === 'EXACT_REUSE').length,
    compositeFromExisting: entries.filter((entry) => entry.resolutionStatus === 'COMPOSITE_FROM_EXISTING').length,
    reviewRequired: entries.filter((entry) => entry.resolutionStatus === 'REVIEW_REQUIRED').length,
    toGenerate: entries.filter((entry) => entry.resolutionStatus === 'TO_GENERATE').length,
    estimatedNewImagesNeededNow: entries.filter((entry) => entry.resolutionStatus === 'TO_GENERATE').length,
    potentialGenerationAfterRejectedReview: entries.filter((entry) => entry.resolutionStatus === 'REVIEW_REQUIRED').length,
    generatedImages: 0,
    approvalPolicy: 'No requirement is approved automatically; exact/composite proposals require human approval before import/production.'
  },
  sourceInventory: records,
  requirements: entries
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');

// Keep the generation planner phase-aware without pre-approving reuse candidates.
const planned = JSON.parse(fs.readFileSync(mediaManifestPath, 'utf8'));
for (const entry of planned.entries) {
  const resolution = entries.find((item) => item.requirementId === entry.requirementId);
  if (!resolution) continue;
  entry.status = resolution.resolutionStatus === 'EXACT_REUSE'
    ? 'EXACT_REUSE_PENDING_HUMAN_APPROVAL'
    : resolution.resolutionStatus === 'COMPOSITE_FROM_EXISTING'
      ? 'COMPOSITE_PENDING_HUMAN_APPROVAL'
      : resolution.resolutionStatus;
}
fs.writeFileSync(mediaManifestPath, `${JSON.stringify(planned, null, 2)}\n`, 'utf8');

console.log(JSON.stringify(audit.summary, null, 2));
