import { DUDUQ_SOUND_ASSET_ROOT, DUDUQ_SOUND_MANIFEST } from "./duduq-sound-manifest.js";

const clampVolume = value => Math.min(1, Math.max(0, Number(value) || 0));
const channelVolumes = { sfx: 1, music: 1, voice: 1 };
const players = new Map();
const volumeRamps = new Map();
const lastVoiceVariant = new Map();
let activeVoice = null;

function cancelVolumeRamp(player) {
  const ramp = volumeRamps.get(player);
  if (!ramp) return;
  cancelAnimationFrame(ramp.frame);
  volumeRamps.delete(player);
  ramp.resolve(false);
}

function rampVolume(player, targetVolume, durationMs, onComplete) {
  cancelVolumeRamp(player);
  const duration = Math.max(0, Number(durationMs) || 0);
  if (!duration || typeof requestAnimationFrame !== "function") {
    player.volume = targetVolume;
    onComplete?.();
    return Promise.resolve(true);
  }

  const initialVolume = player.volume;
  const startedAt = performance.now();
  return new Promise(resolve => {
    const ramp = { frame: 0, resolve };
    const tick = now => {
      if (volumeRamps.get(player) !== ramp) return;
      const progress = Math.min(1, (now - startedAt) / duration);
      player.volume = initialVolume + (targetVolume - initialVolume) * progress;
      if (progress < 1) {
        ramp.frame = requestAnimationFrame(tick);
        return;
      }
      volumeRamps.delete(player);
      onComplete?.();
      resolve(true);
    };
    volumeRamps.set(player, ramp);
    ramp.frame = requestAnimationFrame(tick);
  });
}

for (const sound of Object.values(DUDUQ_SOUND_MANIFEST)) {
  if (typeof Audio === "undefined") continue;
  const files = sound.files || (sound.file ? [sound.file] : []);
  for (const file of files) {
    if (players.has(file)) continue;
    const player = new Audio(new URL(encodeURIComponent(file), `${location.origin}${DUDUQ_SOUND_ASSET_ROOT}`).href);
    player.preload = sound.preload;
    player.loop = sound.loop === true;
    players.set(file, player);
  }
}

function stopActiveVoice() {
  if (!activeVoice) return;
  activeVoice.pause();
  try { activeVoice.currentTime = 0; } catch {}
  activeVoice.onended = null;
  activeVoice = null;
}

function chooseVoiceVariant(key, files) {
  if (files.length < 2) return 0;
  const previous = lastVoiceVariant.get(key);
  const candidates = files.map((_, index) => index).filter(index => index !== previous);
  const selected = candidates[Math.floor(Math.random() * candidates.length)];
  lastVoiceVariant.set(key, selected);
  return selected;
}

const DuduqSound = Object.freeze({
  play(name, options = {}) {
    const sound = DUDUQ_SOUND_MANIFEST[name];
    const player = sound && players.get(sound.file);
    if (!sound || !player) return Promise.resolve(false);

    cancelVolumeRamp(player);
    player.pause();
    try { player.currentTime = 0; } catch {}
    const targetVolume = clampVolume(options.volume ?? sound.volume) * channelVolumes[sound.channel];
    const fadeInMs = Math.max(0, Number(options.fadeInMs) || 0);
    player.volume = fadeInMs ? 0 : targetVolume;
    player.loop = sound.loop === true;
    return player.play().then(() => fadeInMs ? rampVolume(player, targetVolume, fadeInMs) : true).catch(() => {
      cancelVolumeRamp(player);
      player.volume = targetVolume;
      return false;
    });
  },

  fadeOut(name, durationMs = 300) {
    const sound = DUDUQ_SOUND_MANIFEST[name];
    const player = sound && players.get(sound.file);
    if (!sound || !player) return Promise.resolve(false);
    return rampVolume(player, 0, durationMs, () => {
      player.pause();
      try { player.currentTime = 0; } catch {}
      player.volume = sound.volume * channelVolumes[sound.channel];
    });
  },

  stop(name) {
    const sound = DUDUQ_SOUND_MANIFEST[name];
    const player = sound && players.get(sound.file);
    if (!sound || !player) return false;
    cancelVolumeRamp(player);
    player.pause();
    try { player.currentTime = 0; } catch {}
    player.volume = sound.volume * channelVolumes[sound.channel];
    return true;
  },

  playVoice(kind, options = {}) {
    const key = kind === "correct" ? "voiceCorrect" : kind === "error" ? "voiceError" : null;
    const sound = key && DUDUQ_SOUND_MANIFEST[key];
    if (!sound || !sound.files?.length) return Promise.resolve(false);
    const file = sound.files[chooseVoiceVariant(key, sound.files)];
    const player = players.get(file);
    if (!player) return Promise.resolve(false);

    stopActiveVoice();
    player.pause();
    try { player.currentTime = 0; } catch {}
    player.volume = clampVolume(options.volume ?? sound.volume) * channelVolumes.voice;
    player.loop = false;
    activeVoice = player;
    player.onended = () => {
      if (activeVoice === player) activeVoice = null;
      try { options.onEnded?.(); } catch {}
    };
    return player.play().then(() => true).catch(() => {
      if (activeVoice === player) activeVoice = null;
      return false;
    });
  },

  setSfxVolume(value) { channelVolumes.sfx = clampVolume(value); },
  setMusicVolume(value) { channelVolumes.music = clampVolume(value); },
  setVoiceVolume(value) { channelVolumes.voice = clampVolume(value); },
  getManifest() { return DUDUQ_SOUND_MANIFEST; }
});

if (typeof window !== "undefined") {
  window.DuduqSound = DuduqSound;
}

export { DuduqSound };
