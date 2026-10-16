import { readFile, writeFile, access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = async rel => JSON.parse(await readFile(path.join(root, rel), 'utf8'));
const save = async (rel, data) => {
  const file = path.join(root, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
};
const pathReady = async rel => {
  try { await access(path.join(root, rel)); return true; } catch { return false; }
};
const run = await read('content/english/production/v11-2b/audio-production-manifest.json');
const registry = await read('content/english/audio/audio-registry.json');
const runtime = await read('duduq-audio/manifests/AUDIO_MANIFEST.json');
const qcJobs = run.jobs.filter(job => job.status === 'GENERATED_QC_PASS');
const failures = [];
for (const job of qcJobs) {
  if (!job.path || !(await pathReady(job.path))) failures.push(`FILE_MISSING:${job.audioId}`);
  if (!job.qc?.pass || !job.contentHash) failures.push(`QC_OR_HASH_MISSING:${job.audioId}`);
}
if (failures.length) throw new Error(`V11_2B_AUDIO_RUNTIME_REGISTRATION_BLOCKED:${failures.slice(0, 25).join('|')}`);
const entriesById = new Map(registry.entries.map((entry, index) => [entry.audioId, index]));
const runtimeById = new Map(runtime.items.map((entry, index) => [entry.audioId || entry.id, index]));
let registered = 0;
for (const job of qcJobs) {
  const manifestJob = run.jobs.find(row => row.audioId === job.audioId);
  const canonical = run.reused.find(row => row.audioId === job.audioId);
  if (canonical) continue;
  const registryEntry = {
    audioId: job.audioId, type: /INSTRUCTION/i.test(job.role) ? `instruction-${job.locale === 'pt-BR' ? 'pt' : 'en'}` : 'learner-content',
    transcript: job.spokenTarget, speechText: job.spokenTarget, language: job.locale === 'pt-BR' ? 'pt' : 'en', locale: job.locale,
    semanticRole: job.role, semanticType: job.semanticType, speakerRole: 'single', voiceProfile: run.goldVoice,
    voiceVersion: run.goldVoice, engine: run.engine, model: run.model, deliveryProfile: 'NATURAL_CLEAR_V2', version: '1.0',
    status: 'APPROVED', approvalStatus: 'TECHNICAL_PASS_HUMAN_PENDING', humanPronunciationReview: 'HUMAN_REVIEW_PENDING',
    urlOrPath: job.path, outputPath: job.path, masterAudioPath: job.masterAudioPath,
    contentHash: job.contentHash, masterContentHash: job.masterAudioHash || job.masterContentHash,
    qcStatus: 'PASS', qc: job.qc, usedByItems: job.users, generatedAt: new Date().toISOString(),
    provenance: { feature: run.feature || 'DUDUQ_PHYSICAL_ASSET_FACTORY_EXECUTION_V11_2B', canonicalKey: job.canonicalKey }
  };
  const registryIndex = entriesById.get(job.audioId);
  if (registryIndex === undefined) { entriesById.set(job.audioId, registry.entries.length); registry.entries.push(registryEntry); }
  else registry.entries[registryIndex] = registryEntry;
  const runtimeEntry = {
    id: job.audioId, audioId: job.audioId, module: job.users[0]?.slice(0, 5) || 'SHARED', activity: job.users,
    type: registryEntry.type, displayText: job.spokenTarget, speechText: job.spokenTarget, locale: job.locale,
    voiceProfile: run.goldVoice, voiceVersion: run.goldVoice, engine: run.engine, model: run.model,
    audioPath: job.path, masterAudioPath: job.masterAudioPath, status: 'APPROVED', approvalStatus: 'TECHNICAL_PASS_HUMAN_PENDING',
    humanPronunciationReview: 'HUMAN_REVIEW_PENDING', cacheKey: job.cacheKey, contentHash: job.contentHash,
    masterContentHash: registryEntry.masterContentHash, qc: job.qc, deliveryProfile: 'NATURAL_CLEAR_V2'
  };
  const runtimeIndex = runtimeById.get(job.audioId);
  if (runtimeIndex === undefined) { runtimeById.set(job.audioId, runtime.items.length); runtime.items.push(runtimeEntry); }
  else runtime.items[runtimeIndex] = runtimeEntry;
  registered++;
}
registry.updatedAt = new Date().toISOString();
runtime.updatedAt = new Date().toISOString();
await save('content/english/audio/audio-registry.json', registry);
await save('duduq-audio/manifests/AUDIO_MANIFEST.json', runtime);
console.log(JSON.stringify({ status: 'PASS', technicalPassHumanPending: registered, filesChecked: qcJobs.length,
  runtimeManifestEntries: runtime.items.filter(row => row.approvalStatus === 'TECHNICAL_PASS_HUMAN_PENDING').length,
  humanApprovedByScript: 0 }, null, 2));
