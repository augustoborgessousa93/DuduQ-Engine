import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const questionsPath = 'content/english/year-1/module-01/questions.json';
const registryPath = 'content/english/media/media-registry.json';
const backlogPath = 'content/english/year-1/module-01/media-replacement-backlog.json';
const questions = JSON.parse(await readFile(path.join(root, questionsPath), 'utf8'));
const registry = JSON.parse(await readFile(path.join(root, registryPath), 'utf8'));
const byId = new Map(questions.items.map(item => [item.item_id, item]));

const emojiAssets = {
  SLEEP: ['😴', 'Criança dormindo, distrator visual temporário'],
  FOOD: ['🍎', 'Criança fazendo um lanche, distrator visual temporário'],
  ART: ['🎨', 'Criança desenhando, distrator visual temporário'],
  BALL: ['⚽', 'Criança brincando com bola, distrator visual temporário'],
  BOOK: ['📚', 'Criança olhando livros, distrator visual temporário'],
  BACKPACK: ['🎒', 'Mochila escolar, distrator visual temporário'],
  NIGHT: ['🌙', 'Cena noturna, distrator visual temporário'],
  OBJECTS: ['🔢', 'Contagem de objetos, distrator visual temporário'],
  ADULT_MAN: ['👨', 'Pessoa adulta, contraste visual temporário'],
  ADULT_WOMAN: ['👩', 'Pessoa adulta, contraste visual temporário'],
  BEN: ['🧒', 'Personagem Ben representado provisoriamente'],
  THINKING: ['💬', 'Cena de conversa e escuta, representação temporária']
};

const emojiMediaId = key => `Y1M01-EMOJI-${key.replaceAll('_', '-')}-001`;
const mediaPath = key => `content/english/assets/images/year-1/module-01/temporary/${emojiMediaId(key).toLowerCase()}.svg`;
const emojiSvg = (emoji, description) => `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="${description}"><rect x="20" y="20" width="472" height="472" rx="112" fill="#fff9e7" stroke="#d8c68e" stroke-width="14"/><text x="256" y="335" text-anchor="middle" font-size="250" font-family="'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif">${emoji}</text></svg>\n`;

for (const [key, [emoji, description]] of Object.entries(emojiAssets)) {
  const assetPath = mediaPath(key);
  const absolute = path.join(root, assetPath);
  await mkdir(path.dirname(absolute), { recursive: true });
  const svg = emojiSvg(emoji, description);
  await writeFile(absolute, svg, 'utf8');
  const sha256 = createHash('sha256').update(svg).digest('hex');
  const id = emojiMediaId(key);
  const entry = {
    mediaId: id, type: 'image', kind: 'image', status: 'APPROVED',
    urlOrPath: assetPath, semantic: key.toLowerCase().replaceAll('_', ' '),
    description, temporary: true, integrationStatus: 'TEMPORARY_REPLACE_LATER',
    source: 'DUDUQ semantic emoji fallback; authored locally as an SVG asset, not AI-generated',
    assets: [{ path: assetPath, sha256, temporary: true, mediaType: 'image/svg+xml' }]
  };
  const index = registry.entries.findIndex(candidate => candidate.mediaId === id);
  if (index < 0) registry.entries.push(entry); else registry.entries[index] = entry;
}

const options = (rows, correctId) => ({
  rows: rows.map(([key, label, mediaId, assetIndex]) => ({
    optionId: key,
    answerKey: key,
    label,
    mediaId,
    ...(assetIndex === undefined ? {} : { assetIndex })
  })),
  correctOptionId: correctId,
  distractorOptionIds: rows.map(([key]) => key).filter(key => key !== correctId)
});
const media = (role, id, assetIndex) => ({ role, mediaId: id, ...(assetIndex === undefined ? {} : { assetIndex }) });
const emoji = key => emojiMediaId(key);

const targetOptions = {
  'Y1M01-Q001': options([
    ['farewell', 'Cena de despedida', 'IMG-Y1M01-FAREWELL-GENERIC-001'], ['sleep', 'Criança dormindo', emoji('SLEEP')],
    ['hello', 'Duas crianças se cumprimentando', 'IMG-Y1M01-GREETING-GENERIC-001'], ['snack', 'Criança fazendo um lanche', emoji('FOOD')]
  ], 'hello'),
  'Y1M01-Q003': options([
    ['afternoon', 'Cena de tarde', 'IMG-Y1M01-GREETING-AFTERNOON-001'], ['night', 'Cena noturna', emoji('NIGHT')],
    ['farewell', 'Cena de despedida', 'IMG-Y1M01-FAREWELL-GENERIC-001'], ['morning', 'Chegada à escola pela manhã', 'IMG-Y1M01-GREETING-MORNING-001']
  ], 'morning'),
  'Y1M01-Q004': options([
    ['morning', 'Cena de manhã', 'IMG-Y1M01-GREETING-MORNING-001'], ['afternoon', 'Cena de tarde', 'IMG-Y1M01-GREETING-AFTERNOON-001'],
    ['night', 'Cena noturna', emoji('NIGHT')], ['sleep', 'Criança dormindo', emoji('SLEEP')]
  ], 'afternoon'),
  'Y1M01-Q010': options([
    ['farewell', 'Cena de despedida', 'IMG-Y1M01-FAREWELL-GENERIC-001'], ['sleep', 'Criança dormindo', emoji('SLEEP')],
    ['greeting', 'Duas crianças conversando e se cumprimentando', 'IMG-Y1M01-DIALOGUE-HELLO-HI-001'], ['play', 'Criança brincando com bola', emoji('BALL')]
  ], 'greeting'),
  'Y1M01-Q011': options([
    ['farewell', 'Cena de despedida', 'IMG-Y1M01-FAREWELL-GENERIC-001'], ['question', 'Personagem fazendo uma pergunta', 'IMG-Y1M01-NAME-QUESTION-001'],
    ['greeting', 'Cena de cumprimento', 'IMG-Y1M01-GREETING-GENERIC-001'], ['counting', 'Contagem de objetos', emoji('OBJECTS')]
  ], 'question'),
  'Y1M01-Q012': options([
    ['mia', 'Mia', 'IMG-Y1M01-NAME-TAGS-001', 1], ['ana', 'Ana', 'IMG-Y1M01-NAME-TAGS-001', 0],
    ['ben', 'Ben', emoji('BEN')], ['leo', 'Leo', 'IMG-Y1M01-NAME-TAGS-001', 2]
  ], 'leo'),
  'Y1M01-Q013': options([
    ['ana', 'Ana', 'IMG-Y1M01-NAME-TAGS-001', 0], ['leo', 'Leo', 'IMG-Y1M01-NAME-TAGS-001', 2],
    ['ben', 'Ben', emoji('BEN')], ['mia', 'Mia', 'IMG-Y1M01-NAME-TAGS-001', 1]
  ], 'mia'),
  'Y1M01-Q015': options([
    ['farewell', 'Duas pessoas se despedindo', 'IMG-Y1M01-FAREWELL-GENERIC-001'], ['greeting', 'Duas pessoas se cumprimentando', 'IMG-Y1M01-GREETING-INFORMAL-001'],
    ['solo', 'Uma pessoa sozinha', emoji('THINKING')], ['conversation', 'Duas crianças em uma conversa', 'IMG-Y1M01-NAME-QUESTION-ANSWER-001']
  ], 'conversation'),
  'Y1M01-Q016': options([
    ['girl', 'Menina', 'IMG-Y1M01-BOY-GIRL-001', 1], ['boy', 'Menino', 'IMG-Y1M01-BOY-GIRL-001', 0],
    ['adult-man', 'Pessoa adulta', emoji('ADULT_MAN')], ['adult-woman', 'Pessoa adulta', emoji('ADULT_WOMAN')]
  ], 'boy'),
  'Y1M01-Q017': options([
    ['boy', 'Menino', 'IMG-Y1M01-BOY-GIRL-001', 0], ['adult-man', 'Pessoa adulta', emoji('ADULT_MAN')],
    ['girl', 'Menina', 'IMG-Y1M01-BOY-GIRL-001', 1], ['adult-woman', 'Pessoa adulta', emoji('ADULT_WOMAN')]
  ], 'girl'),
  'Y1M01-Q018': options([
    ['ana', 'Ana', 'IMG-Y1M01-NAME-TAGS-001', 0], ['leo', 'Leo', 'IMG-Y1M01-NAME-LEO-001'],
    ['ben', 'Ben', emoji('BEN')], ['mia', 'Mia', 'IMG-Y1M01-INTRODUCTION-MIA-001']
  ], 'mia'),
  'Y1M01-Q019': options([
    ['leo-morning', 'Leo chegando pela manhã', 'IMG-Y1M01-INTRODUCTION-LEO-MORNING-001'], ['mia-afternoon', 'Mia à tarde', 'IMG-Y1M01-INTRODUCTION-MIA-001'],
    ['ana-farewell', 'Ana indo embora', 'IMG-Y1M01-FAREWELL-ANA-001'], ['sleep', 'Criança dormindo', emoji('SLEEP')]
  ], 'leo-morning')
};

const instructions = {
  'Y1M01-Q001': ['Acerte o alvo!', 'Escute com atenção.', 'Escolha a imagem que mostra duas crianças se cumprimentando.'],
  'Y1M01-Q002': ['Estoure a bolha!', 'Observe cada imagem.', 'Estoure a bolha da cena em que amigos se cumprimentam.'],
  'Y1M01-Q003': ['Acerte o alvo!', 'Pense no horário.', 'Escolha a cena que mostra a chegada pela manhã.'],
  'Y1M01-Q004': ['Acerte o alvo!', 'Observe o período do dia.', 'Escolha a cena que combina com a tarde.'],
  'Y1M01-Q005': ['Estoure a bolha!', 'Observe a ação.', 'Estoure a bolha da cena em que alguém está indo embora.'],
  'Y1M01-Q006': ['Arraste e aprenda!', 'Ouça com atenção.', 'Arraste o áudio para a cena da manhã.'],
  'Y1M01-Q007': ['Arraste e aprenda!', 'Observe o horário.', 'Arraste o áudio para a cena da tarde.'],
  'Y1M01-Q008': ['Arraste e aprenda!', 'Observe a ação.', 'Arraste o áudio para a cena de despedida.'],
  'Y1M01-Q009': ['Encontre as cenas!', 'Ouça cada áudio.', 'Arraste cada áudio para a cena correspondente: manhã, tarde ou despedida.'],
  'Y1M01-Q010': ['Acerte o alvo!', 'Escute as duas falas.', 'Escolha a imagem que mostra as crianças se cumprimentando.'],
  'Y1M01-Q011': ['Acerte o alvo!', 'Escute a pergunta.', 'Escolha a imagem que mostra alguém perguntando o nome.'],
  'Y1M01-Q012': ['Acerte o alvo!', 'Escute o nome.', 'Escolha o personagem que diz o próprio nome.'],
  'Y1M01-Q013': ['Acerte o alvo!', 'Escute o diálogo.', 'Escolha a personagem que responde à pergunta sobre o nome.'],
  'Y1M01-Q014': ['Arraste e aprenda!', 'Ouça o nome.', 'Arraste o áudio para o crachá da pessoa que está se apresentando.'],
  'Y1M01-Q015': ['Acerte o alvo!', 'Escute as duas falas.', 'Escolha a cena que mostra uma pessoa perguntando e outra respondendo.'],
  'Y1M01-Q016': ['Acerte o alvo!', 'Observe os personagens.', 'Escolha a imagem do menino.'],
  'Y1M01-Q017': ['Acerte o alvo!', 'Observe os personagens.', 'Escolha a imagem da menina.'],
  'Y1M01-Q018': ['Acerte o alvo!', 'Escute o nome.', 'Escolha Mia, que está se apresentando.'],
  'Y1M01-Q019': ['Acerte o alvo!', 'Escute o nome e observe o horário.', 'Escolha a cena de Leo chegando pela manhã.'],
  'Y1M01-Q020': ['Estoure a bolha!', 'Escute o nome e observe a ação.', 'Estoure a bolha da Ana indo embora.']
};

const bubbleDistractors = {
  'Y1M01-Q002': [emoji('SLEEP'), emoji('FOOD'), emoji('ART'), emoji('BALL'), emoji('BOOK'), emoji('BACKPACK')],
  'Y1M01-Q005': ['IMG-Y1M01-GREETING-GENERIC-001', 'IMG-Y1M01-GREETING-AFTERNOON-001', 'IMG-Y1M01-GREETING-MORNING-001', emoji('SLEEP'), emoji('FOOD'), emoji('BALL')],
  'Y1M01-Q020': ['IMG-Y1M01-GREETING-MORNING-001', 'IMG-Y1M01-GREETING-INFORMAL-001', emoji('SLEEP'), emoji('ART'), emoji('FOOD'), emoji('BALL')]
};
const bubblePoolLabels = ['Cena de descanso', 'Cena de lanche', 'Cena de desenho', 'Cena de brincadeira', 'Cena de leitura', 'Material escolar'];

for (const [itemId, contract] of Object.entries(instructions)) {
  const item = byId.get(itemId);
  if (!item) throw new Error(`MISSING_ITEM:${itemId}`);
  const [title, subtitle, text] = contract;
  item.pedagogicalContractVersion = 'DUDUQ_UNIVERSAL_PEDAGOGICAL_EXPERIENCE_V1';
  item.instruction = { title, subtitle, text, language: 'pt-BR', spokenText: `${title} ${subtitle} ${text}`,
    instructionAudioId: `AUD-Y1M01-INSTRUCTION-${itemId.slice(-3)}` };
  item.contentAudioId = item.audio_ref || null;
  item.answerSemantics = item.resposta;
  item.semanticReview = 'NEEDS_HUMAN_REVIEW';
  item.instructionReplay = true;
}

for (const [itemId, contract] of Object.entries(targetOptions)) {
  const item = byId.get(itemId);
  const keys = contract.rows.map(option => option.optionId);
  item.opcao_a = contract.rows[0].label; item.opcao_b = contract.rows[1].label;
  item.opcao_c = contract.rows[2].label; item.opcao_d = contract.rows[3].label;
  item.resposta = String.fromCharCode(65 + keys.indexOf(contract.correctOptionId));
  item.answerKey = contract.correctOptionId;
  item.answerSemantics = contract.correctOptionId;
  item.options = contract.rows.map(({ optionId, label, mediaId, assetIndex }) => ({ optionId, answerKey: optionId, label, mediaId,
    ...(assetIndex === undefined ? {} : { assetIndex }), correct: optionId === contract.correctOptionId,
    semanticReview: 'NEEDS_HUMAN_REVIEW' }));
  item.distractorOptionIds = contract.distractorOptionIds;
  item.mediaBindings = contract.rows.map(({ optionId, mediaId, assetIndex }) => media(`option_${String.fromCharCode(97 + keys.indexOf(optionId))}`, mediaId, assetIndex));
}

for (const [itemId, ids] of Object.entries(bubbleDistractors)) {
  const item = byId.get(itemId);
  const semanticCorrectKey = { 'Y1M01-Q002': 'informal-greeting', 'Y1M01-Q005': 'farewell', 'Y1M01-Q020': 'ana-leaving' }[itemId];
  item.answerKey = semanticCorrectKey;
  item.options = [{ optionId: semanticCorrectKey, answerKey: semanticCorrectKey, label: item.objetivo, mediaId: item.image_ref, correct: true },
    ...ids.map((mediaId, index) => ({ optionId: `distractor-${index + 1}`, answerKey: `distractor-${index + 1}`, label: bubblePoolLabels[index], mediaId, correct: false, semanticReview: 'NEEDS_HUMAN_REVIEW' }))];
  item.distractorOptionIds = ids.map((_, index) => `distractor-${index + 1}`);
  item.bubbleDistractorPool = ids.map((mediaId, index) => ({ id: `${itemId}-distractor-${index + 1}`, mediaId, label: bubblePoolLabels[index], type: 'image' }));
  item.alternativePolicy = { minDistinctDistractors: 6, actualDistinctDistractors: 6, semanticReview: 'NEEDS_HUMAN_REVIEW' };
}

for (const item of questions.items.filter(entry => (entry.runtimeMechanic || entry.mecanica_preferida) === 'drag-drop-multimedia')) {
  if (item.item_id === 'Y1M01-Q009') {
    item.options = (item.audioBindings || []).map((binding, index) => ({
      optionId: binding.answerKey, answerKey: binding.answerKey, label: String(item.audio_transcript).split(/\s+\/\s+/)[index],
      mediaId: binding.mediaId, audioId: binding.audioId, correct: true
    }));
    item.answerKey = 'morning+afternoon+farewell';
    item.distractorOptionIds = [];
  } else {
    const answerKey = item.correctAnswerKey;
    item.answerKey = answerKey;
    item.options = (item.mediaBindings || []).map((binding, index) => ({
      optionId: binding.answerKey, answerKey: binding.answerKey,
      label: binding.label || item[`opcao_${String.fromCharCode(97 + index)}`] || binding.answerKey,
      mediaId: binding.mediaId, ...(binding.assetIndex === undefined ? {} : { assetIndex: binding.assetIndex }),
      correct: binding.answerKey === answerKey, semanticReview: 'NEEDS_HUMAN_REVIEW'
    }));
    item.distractorOptionIds = item.options.filter(option => !option.correct).map(option => option.optionId);
  }
  if ((item.options || []).some(option => !option.mediaId || !option.label)) throw new Error(`DND_OPTION_MISSING:${item.item_id}`);
}

for (const item of questions.items.filter(entry => (entry.runtimeMechanic || entry.mecanica_preferida) === 'target-shooter')) {
  if (!targetOptions[item.item_id]) throw new Error(`TARGET_OPTIONS_NOT_DEFINED:${item.item_id}`);
  item.targetPolicy = { exactCount: 4, correctCount: 1, distractorCount: 3, correctOptionId: item.answerKey, randomizedPosition: true };
}
for (const item of questions.items.filter(entry => (entry.runtimeMechanic || entry.mecanica_preferida) === 'drag-drop-multimedia')) {
  item.targetPolicy = { exactCount: item.item_id === 'Y1M01-Q009' ? 3 : 3, correctCount: item.item_id === 'Y1M01-Q009' ? 3 : 1,
    distractorCount: item.item_id === 'Y1M01-Q009' ? 0 : 2, canonicalCapacity: 3 };
  for (const binding of item.mediaBindings || []) if (!binding.mediaId) throw new Error(`DND_MEDIA_EMPTY:${item.item_id}:${binding.role}`);
}

for (const item of questions.items) {
  if (item.options) item.optionContract = {
    mechanic: item.runtimeMechanic || item.mecanica_preferida,
    choices: item.options,
    correctOptionId: item.answerKey,
    distractorOptionIds: item.distractorOptionIds || [],
    allVisualOptionsResolveByMediaId: true
  };
}

for (const entry of registry.entries) {
  if (entry.mediaId.startsWith('Y1M01-EMOJI-')) entry.backlogStatus = 'ACCEPTED_FOR_V1_REPLACE_LATER';
}
await writeFile(path.join(root, questionsPath), `${JSON.stringify(questions, null, 2)}\n`, 'utf8');
await writeFile(path.join(root, registryPath), `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
const temporaryMedia = registry.entries.filter(entry => entry.mediaId.startsWith('Y1M01-EMOJI-')).map(entry => ({
  mediaId: entry.mediaId, currentAsset: entry.urlOrPath, reasonForFutureReplacement: entry.description,
  priority: 'LOW', status: 'ACCEPTED_FOR_V1_REPLACE_LATER'
}));
await writeFile(path.join(root, backlogPath), `${JSON.stringify({ schemaVersion: '1.0', moduleId: 'Y1M01', entries: temporaryMedia }, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ status: 'PASS', questions: questions.items.length, targetShooter: Object.keys(targetOptions).length,
  bubblePop: Object.keys(bubbleDistractors).length, distinctTemporaryMedia: Object.keys(emojiAssets).length,
  instructionContracts: Object.keys(instructions).length }, null, 2));
