import { readFile, writeFile, mkdir, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = async relative => JSON.parse(await readFile(path.join(root, relative), 'utf8'));
const save = async (relative, value) => {
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`);
};
const contracts = await load('content/english/production/v11-1b/deterministic-activity-contracts.json');
const media = await load('content/english/production/v11-2/media-concept-binding-map.json');
const audio = await load('content/english/production/v11-2b/audio-production-manifest.json');
const audioBindings = await load('content/english/production/v11-2b/audio-concept-binding-map.json');
const mediaRegistry = await load('content/english/media/media-registry.json');
const audioRegistry = await load('content/english/audio/audio-registry.json');
const rawAudioDir = path.join(root, 'duduq-audio/.runtime/production-work/V11_2B');
const rawAudioFiles = await readdir(rawAudioDir).catch(() => []);
const registeredMedia = new Set(mediaRegistry.entries.map(row => row.mediaId));
const registeredAudio = new Set(audioRegistry.entries.map(row => row.audioId));
const audioReady = new Set([
  ...audio.reused.map(row => row.audioId),
  ...audio.jobs.filter(row => row.status === 'GENERATED_QC_PASS').map(row => row.audioId),
  ...audioRegistry.entries.filter(row => row.status === 'APPROVED' && row.qcStatus === 'PASS' && (row.urlOrPath || row.outputPath)).map(row => row.audioId)
]);
const modules = [...new Set(contracts.contracts.map(row => row.moduleId))].sort();
const moduleRows = await Promise.all(modules.map(async moduleId => {
  const items = contracts.contracts.filter(row => row.moduleId === moduleId);
  const allBound = items.filter(row => {
    const mediaIds = row.requiredMedia.filter(req => req.mediaConceptId !== 'NO_MEDIA').map(req => media.bindings[req.mediaConceptId]?.mediaId);
    const audioReqs = [
      ...row.requiredAudio.instruction,
      ...row.requiredAudio.learnerTargets,
      ...(row.requiredAudio.completedSentence || []),
      ...(row.requiredAudio.optionTargets || [])
    ];
    const audioIds = audioReqs.map(req => audioBindings.bindings[req.audioConceptId]?.audioId);
    return mediaIds.every(id => id && registeredMedia.has(id)) && audioIds.every(id => id && audioReady.has(id) && registeredAudio.has(id));
  }).length;
  const base = `content/english/year-${moduleId[1]}/module-${moduleId.slice(-2)}`;
  const route = `play/english/year-${moduleId[1]}/module-${moduleId.slice(-2)}/index.html`;
  const fileExists = async relative => access(path.join(root, relative)).then(() => true, () => false);
  const materialized = (await fileExists(`${base}/module.json`)) && (await fileExists(`${base}/questions.json`)) && (await fileExists(route));
  return { moduleId, activities: items.length, sourceReady: allBound, materialized };
}));
const generatedMedia = mediaRegistry.entries.filter(row => row.source === 'DUDUQ_V11_2B_DETERMINISTIC_VECTOR');
const audioCounts = audio.jobs.reduce((out, row) => {
  out[row.status] = (out[row.status] || 0) + 1;
  return out;
}, {});
const report = {
  schemaVersion: 'duduq-v11-2b-industrial-production-status-v1',
  updatedAt: new Date().toISOString(),
  feature: 'DUDUQ_PHYSICAL_ASSET_FACTORY_EXECUTION_V11_2B',
  input: { deterministicContracts: contracts.contracts.length, modules: modules.length },
  media: {
    requirementsBound: media.bindingCount,
    existingGroupsReused: media.reused.length,
    localSvgAssetsRegistered: generatedMedia.length,
    unresolvedRequirements: media.pending.length,
    uniqueRegistryIds: new Set(mediaRegistry.entries.map(row => row.mediaId)).size === mediaRegistry.entries.length,
    refinementPending: generatedMedia.filter(row => row.refinementStatus === 'IMAGE_REFINEMENT_PENDING').length + media.reused.length
  },
  audio: {
    canonicalGroups: audio.totalCanonicalGroups,
    existingGroupsReused: audio.reused.length,
    newJobs: audio.jobs.length,
    rawWavFilesProduced: rawAudioFiles.filter(name => name.toLowerCase().endsWith('.wav')).length,
    generatedQcPass: audioCounts.GENERATED_QC_PASS || 0,
    pendingOrFailed: audio.jobs.filter(row => row.status !== 'GENERATED_QC_PASS').length,
    statuses: audioCounts,
    uniqueRegistryIds: new Set(audioRegistry.entries.map(row => row.audioId)).size === audioRegistry.entries.length
  },
  production: {
    sourceReadyActivities: moduleRows.reduce((sum, row) => sum + row.sourceReady, 0),
    materializedModules: moduleRows.filter(row => row.materialized).length,
    modules: moduleRows,
    structuralBlockers: []
  },
  build: 'NOT_RUN', cloudflare: 'NOT_RUN', git: { commit: 'NONE', push: 'NONE', tag: 'NONE' }
};
await save('content/english/production/v11-2b/industrial-production-status.json', report);
console.log(JSON.stringify({
  statusFile: 'content/english/production/v11-2b/industrial-production-status.json',
  media: report.media,
  audio: report.audio,
  production: { sourceReadyActivities: report.production.sourceReadyActivities, materializedModules: report.production.materializedModules }
}, null, 2));
