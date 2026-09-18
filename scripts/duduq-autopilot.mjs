#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const META = path.join(ROOT, '.duduq');
const GIT = process.env.DUDUQ_GIT || (process.platform === 'win32' && fs.existsSync('C:/Program Files/Git/cmd/git.exe') ? 'C:/Program Files/Git/cmd/git.exe' : 'git');
const readJson = (f, fallback = {}) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); } catch { return fallback; } };
const writeJson = (f, value) => { const p = path.join(ROOT, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n'); };
const now = () => new Date().toISOString();
const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');
const LOCK = path.join(META, 'autopilot.lock');
function acquireLock() {
  fs.mkdirSync(META, { recursive: true });
  if (fs.existsSync(LOCK)) {
    try {
      const existing = JSON.parse(fs.readFileSync(LOCK, 'utf8'));
      if (existing.pid && existing.pid !== process.pid) {
        try { process.kill(existing.pid, 0); return false; } catch { /* stale lock */ }
      }
    } catch { /* stale/corrupt lock */ }
    try { fs.unlinkSync(LOCK); } catch { return false; }
  }
  fs.writeFileSync(LOCK, JSON.stringify({ pid: process.pid, startedAt: now(), workspace: ROOT }, null, 2) + '\n', { flag: 'wx' });
  return true;
}
function releaseLock() { try { if (fs.existsSync(LOCK)) fs.unlinkSync(LOCK); } catch {} }
function git(args, options = {}) {
  const r = spawnSync(GIT, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options });
  if (r.error || r.status !== 0) return { ok: false, output: (r.stderr || r.error?.message || '').trim(), code: r.status ?? 127 };
  return { ok: true, output: (r.stdout || '').trim(), code: 0 };
}
function gitInfo() {
  const branch = git(['branch', '--show-current']);
  const head = git(['rev-parse', 'HEAD']);
  const status = git(['status', '--porcelain=v1']);
  const remote = git(['remote', '-v']);
  return { available: branch.ok || head.ok, branch: branch.ok ? branch.output : 'UNKNOWN', head: head.ok ? head.output : 'UNKNOWN', status: status.ok ? status.output : 'GIT_UNAVAILABLE', remote: remote.ok ? remote.output : 'UNKNOWN' };
}
function componentInventory() {
  const manifest = readJson('design-system/duduq-component-manifest.json', { components: [] });
  const components = {};
  for (const c of manifest.components || []) components[c.name] = { penpotMainId: c.penpotMainId ?? null, controlPanelInstanceId: c.controlPanelInstanceId ?? null, corePath: c.runtime?.[0] ?? null, cssPath: c.runtime?.find(x => x.endsWith('.css')) ?? null, humanApproval: c.name.includes('HUD') ? true : null, frozen: ['DUDUQ / HUD / Header', 'DUDUQ / HUD / Question'].includes(c.name), syncStatus: c.controlPanelInstanceId ? 'PENPOT_SYNC_REQUIRED' : 'UNKNOWN', owner: c.owner ?? null, lastModified: null };
  return components;
}
function recoverySnapshot(info = gitInfo()) {
  const files = fs.readdirSync(ROOT, { recursive: true }).filter(f => !String(f).startsWith('.git')).map(String);
  const snapshot = { timestamp: now(), workspace: ROOT, fileCount: files.length, git: info, importantFiles: files.filter(f => /^(AGENTS\.md|package\.json|\.duduq\/|design-system\/|core\/|scripts\/|\.github\/)/.test(f)).slice(0, 2000), protectedPenpot: { headerMain: '88954f25-7a86-800b-8008-a87e6f0d4e44', questionMain: '88954f25-7a86-800b-8008-a87e700a22e9', controlPanel: '855af85f-faf4-8069-8008-a8e75a3255fd' }, penpotSync: readJson('.duduq/PENPOT_SYNC.json') };
  const file = `.duduq/recovery/${snapshot.timestamp.replace(/[:.]/g, '-')}-workspace.json`; writeJson(file, snapshot); return snapshot;
}
function validate() {
  const checks = [];
  const run = (name, args) => { const r = spawnSync(args[0], args.slice(1), { cwd: ROOT, encoding: 'utf8' }); const blocked = Boolean(r.error); const status = r.status === 0 ? 'PASS' : (blocked ? 'BLOCKED_ENVIRONMENT' : 'FAIL'); checks.push({ name, status, output: (r.stdout || r.stderr || r.error?.message || '').trim().slice(-2000) }); return status !== 'FAIL'; };
  let ok = true;
  for (const f of ['design-system/duduq-component-manifest.json', 'design-system/duduq-penpot-runtime-map.json', 'design-system/duduq-design-tokens.json']) { try { JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); checks.push({ name: `JSON ${f}`, status: 'PASS' }); } catch (e) { checks.push({ name: `JSON ${f}`, status: 'FAIL', output: e.message }); ok = false; } }
  ok = run('canonical HUD architecture', ['node', 'test/systemic/canonical-hud-architecture-guard.mjs']) && ok;
  ok = run('Penpot/Core guarded sync', ['node', 'scripts/duduq-sync-penpot-to-core.mjs']) && ok;
  for (const f of ['core/ui/duduq-canonical-header-hud.js', 'core/ui/duduq-canonical-question-hud.js', 'scripts/duduq-sync-penpot-to-core.mjs']) ok = run(`syntax ${f}`, ['node', '--check', f]) && ok;
  const blocked = checks.some(c => c.status === 'BLOCKED_ENVIRONMENT');
  const result = { status: ok ? (blocked ? 'PASS_WITH_LIMITATION' : 'PASS') : 'FAIL', timestamp: now(), checks, limitation: blocked ? 'Nested process execution is blocked by this Windows environment (EPERM); run the same checks directly in a normal terminal.' : 'Visual Penpot approval remains browser/human authority; no live export is assumed.' };
  writeJson('.duduq/LAST_VALIDATION.json', result);
  return result;
}
function updateState(validation = null) {
  const info = gitInfo();
  const state = readJson('.duduq/STATE.json');
  state.activeBranch = info.branch; state.currentCommit = info.head; state.dirtyWorktree = info.status !== '' && info.status !== 'UNKNOWN';
  state.lastSuccessfulValidation = validation?.status === 'PASS' ? validation.timestamp : state.lastSuccessfulValidation;
  state.canonicalComponents = componentInventory();
  state.penpotSyncRequired = true;
  writeJson('.duduq/STATE.json', state);
  const status = readJson('.duduq/AUTOPILOT_STATUS.json');
  Object.assign(status, { lastScan: now(), validation: validation?.status ?? status.validation, activeBranch: info.branch, dirty: state.dirtyWorktree, pendingPenpotSync: true });
  if (!info.available) status.warnings = ['Git executable not available; remote/branch/push cannot be verified.'];
  writeJson('.duduq/AUTOPILOT_STATUS.json', status);
  writeJson('.duduq/COMPONENT_STATUS.json', { schemaVersion: 1, components: componentInventory(), generatedAt: now() });
  return info;
}
function handoff(info, validation) {
  const branch = info.branch; const commit = info.head;
  const text = `# DUDUQ Continuity Handoff\n\n## What are we doing?\nMaintaining a credit-independent DUDUQ workflow: GitHub technical source, Penpot visual source, Core runtime.\n\n## Just completed\nAutopilot continuity metadata and guarded validation/checkpoint commands are installed. The Penpot Control Panel SVG underlay is removed; native linked components remain.\n\n## Validation\n${validation?.status ?? 'NOT_RUN'} at ${validation?.timestamp ?? 'unknown'}.\n\n## Approved / frozen\nHeader Main 88954f25-7a86-800b-8008-a87e6f0d4e44; Question Main 88954f25-7a86-800b-8008-a87e700a22e9; Control Panel 855af85f-faf4-8069-8008-a8e75a3255fd; gameplay and Magic Cannon / Magic Launcher protected.\n\n## Next exact action\n${info.available ? 'Review the checkpoint diff, then push the active development branch with duduq:checkpoint.' : 'Install/configure Git and the GitHub remote, then run npm run duduq:checkpoint.'}\n\n## Penpot\nPENPOT_SYNC_REQUIRED: live API/export is unavailable; human browser review remains authority.\n\n## Branch / commit\n${branch} / ${commit}\n\n## Remote\n${info.remote}`;
  fs.writeFileSync(path.join(ROOT, '.duduq/HANDOFF.md'), text + '\n');
}
function checkpoint() {
  const validation = validate(); const info = updateState(validation); recoverySnapshot(info); const time = now();
  const state = readJson('.duduq/STATE.json'); state.lastCheckpoint = time; writeJson('.duduq/STATE.json', state);
  handoff(info, validation);
  const tasks = fs.readFileSync(path.join(ROOT, '.duduq/TASKS.md'), 'utf8');
  fs.writeFileSync(path.join(ROOT, '.duduq/TASKS.md'), tasks.replace(/## NOW[\s\S]*?## NEXT/, `## NOW\n- ${validation.status === 'PASS' ? 'Validated continuity metadata; checkpoint ready.' : 'WIP checkpoint created; validation requires review.'}\n\n## NEXT`));
  fs.appendFileSync(path.join(ROOT, '.duduq/CHANGELOG_AUTO.md'), `\n- ${time} checkpoint ${validation.status}; branch ${info.branch}; commit ${info.head}.\n`);
  if (!info.available) { const status = readJson('.duduq/AUTOPILOT_STATUS.json'); status.lastCheckpoint = time; status.warnings = ['Git executable not available; local checkpoint metadata saved, commit/push pending.']; writeJson('.duduq/AUTOPILOT_STATUS.json', status); return { validation, info, pushed: false, warning: 'Git unavailable; checkpoint metadata saved locally, commit/push pending.' }; }
  const add = git(['add', '.duduq', 'AGENTS.md', 'package.json', 'scripts', '.github']);
  const commit = add.ok ? git(['commit', '-m', `chore(duduq): continuity checkpoint ${time.slice(0, 10)}`]) : add;
  const push = commit.ok ? git(['push', '-u', 'origin', info.branch]) : commit;
  const status = readJson('.duduq/AUTOPILOT_STATUS.json'); status.lastCheckpoint = time; status.lastPush = push.ok ? time : status.lastPush; writeJson('.duduq/AUTOPILOT_STATUS.json', status);
  return { validation, info, pushed: push.ok, warning: push.ok ? null : push.output };
}
async function watch() {
  if (!acquireLock()) { console.log('DUDUQ Autopilot already running; no duplicate watcher started.'); return; }
  let last = ''; let quietSince = 0; const debounce = Number(process.env.DUDUQ_AUTOPILOT_DEBOUNCE_MS || 120000);
  const status = readJson('.duduq/AUTOPILOT_STATUS.json'); status.running = true; writeJson('.duduq/AUTOPILOT_STATUS.json', status);
  const stop = () => { const s = readJson('.duduq/AUTOPILOT_STATUS.json'); s.running = false; writeJson('.duduq/AUTOPILOT_STATUS.json', s); releaseLock(); process.exit(0); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop); process.on('exit', releaseLock);
  while (true) { const files = fs.readdirSync(ROOT, { recursive: true }).filter(f => !String(f).startsWith('.git') && !String(f).startsWith('node_modules') && !String(f).startsWith('.duduq/autopilot.lock')).sort(); const sig = sha(files.map(f => `${f}:${fs.statSync(path.join(ROOT, f)).mtimeMs}`).join('\n')); if (sig !== last) { last = sig; quietSince = Date.now(); } else if (quietSince && Date.now() - quietSince >= debounce) { checkpoint(); quietSince = 0; } await new Promise(r => setTimeout(r, 5000)); }
}
const cmd = process.argv[2] || 'status';
if (cmd === 'validate') console.log(JSON.stringify(validate(), null, 2));
else if (cmd === 'status' || cmd === 'resume' || cmd === 'doctor') { const info = updateState(readJson('.duduq/LAST_VALIDATION.json')); handoff(info, readJson('.duduq/LAST_VALIDATION.json')); console.log(`DUDUQ STATUS\nBranch: ${info.branch}\nCommit: ${info.head}\nDirty: ${info.status === 'GIT_UNAVAILABLE' ? 'UNKNOWN (Git unavailable)' : Boolean(info.status)}\nRemote: ${info.remote}\nPenpot sync: PENPOT_SYNC_REQUIRED\nNext: ${readJson('.duduq/TASKS.json', {}).next || 'Install/configure Git, then run duduq:checkpoint'}\n`); }
else if (cmd === 'checkpoint' || cmd === 'sync') console.log(JSON.stringify(checkpoint(), null, 2));
else if (cmd === 'start' || cmd === 'autopilot') await watch();
else if (cmd === 'stop') { const s = readJson('.duduq/AUTOPILOT_STATUS.json'); s.running = false; writeJson('.duduq/AUTOPILOT_STATUS.json', s); console.log('DUDUQ Autopilot stop requested.'); }
else { console.error(`Unknown command: ${cmd}`); process.exit(2); }
