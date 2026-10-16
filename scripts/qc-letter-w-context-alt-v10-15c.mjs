import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const execFile = promisify(execFileCb);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = value => path.relative(root, value).split(path.sep).join('/');
const readJson = async file => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const toWsl = async value => (await execFile('wsl.exe', ['-d', 'Ubuntu', '-u', 'augus', '--', 'wslpath', '-a', value.replaceAll('\\', '/')], { windowsHide: true })).stdout.trim();
const out = path.join(root, 'duduq-audio/.runtime/production-work/V10-15C-EW-candidates');
const source = path.join(out, 'w-w-context-target.wav');
const master = path.join(out, 'w-context-alt-master.wav');
const mp3 = path.join(out, 'w-context-alt.mp3');
const sidecar = `${master}.production.json`;
for (const file of [master, mp3, sidecar]) {
  try { await readFile(file); throw new Error(`ALT_QC_OUTPUT_EXISTS:${rel(file)}`); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const settings = (await readJson('duduq-audio/config/gold-voice-worker.json')).productionPostProcessing;
const payloadFile = path.join(out, 'w-context-alt-process.json');
await writeFile(payloadFile, JSON.stringify({ settings, items: [{ id: 'CANDIDATE-AUD-EN-LETTER-W-CONTEXT',
  sourceWav: await toWsl(source), masterPath: await toWsl(master), audioPath: await toWsl(mp3),
  masterAudioPath: rel(master), audioPathRelative: rel(mp3), voiceVersion: 'DUDUQ_GOLD_VOICE_v1',
  engine: 'chatterbox-multilingual-v3', model: 'Chatterbox Multilingual V3', cacheKey: 'candidate-only' }] }, null, 2) + '\n');
const processPy = await toWsl(path.join(root, 'duduq-audio/scripts/process-production-audio.py'));
const payload = await toWsl(payloadFile);
const result = await execFile('wsl.exe', ['-d', 'Ubuntu', '-u', 'augus', '--', '/home/augus/.duduq/chatterbox-venv/bin/python', processPy, payload],
  { windowsHide: true, maxBuffer: 4 * 1024 * 1024, encoding: 'utf8' });
const qc = JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
if (qc.failures?.length || qc.results?.length !== 1 || !qc.results[0].onsetQc?.pass || !qc.results[0].masterQc?.pass || !qc.results[0].mp3Qc?.pass) throw new Error(`ALT_W_CONTEXT_QC_FAILED:${JSON.stringify(qc.failures)}`);
const report = { status: 'TECHNICAL_PASS_HUMAN_PENDING', source: rel(source), master: rel(master), mp3: rel(mp3), result: qc.results[0] };
await writeFile(path.join(out, 'w-context-alt-qc.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, source: report.source,
  durationSeconds: report.result.masterQc.durationSeconds,
  outputLufs: report.result.normalization.measuredOutputLufs,
  truePeakDb: report.result.normalization.measuredTruePeakDb,
  clippedSamples: report.result.masterQc.clippedSamples }, null, 2));
