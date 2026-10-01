const AUDIO_ROOT = "/core/assets/audio/";

export const DUDUQ_SOUND_MANIFEST = Object.freeze({
  uiClick: Object.freeze({ file: "click.mp3", volume: 0.35, channel: "sfx", preload: "auto" }),
  pickup: Object.freeze({ file: "click.mp3", volume: 0.35, channel: "sfx", preload: "auto" }),
  dragStart: Object.freeze({ file: "swoosh-sound-effect--transitions.mp3", volume: 0.30, channel: "sfx", preload: "auto" }),
  snap: Object.freeze({ file: "pop.mp3", volume: 0.42, channel: "sfx", preload: "auto" }),
  correct: Object.freeze({ file: "correct.mp3", volume: 0.48, channel: "sfx", preload: "auto" }),
  error: Object.freeze({ file: "error.mp3", volume: 0.40, channel: "sfx", preload: "auto" }),
  complete: Object.freeze({ file: "you win.mp3", volume: 0.52, channel: "sfx", preload: "metadata" }),
  transition: Object.freeze({ file: "swoosh.mp3", volume: 0.35, channel: "sfx", preload: "metadata" }),
  bubblePop: Object.freeze({ file: "bubble-pop.mp3", volume: 0.40, channel: "sfx", preload: "metadata" }),
  ding: Object.freeze({ file: "ding.mp3", volume: 0.40, channel: "sfx", preload: "metadata" }),
  introMusic: Object.freeze({ file: "happy-fun-EduQ_Play.mp3", volume: 0.35, channel: "music", preload: "metadata", loop: true }),
  voiceCorrect: Object.freeze({
    files: Object.freeze([
      "feedback-correct-01.wav",
      "feedback-correct-02.wav",
      "feedback-correct-03.wav",
      "feedback-correct-04.wav"
    ]),
    volume: 0.75,
    channel: "voice",
    preload: "metadata"
  }),
  voiceError: Object.freeze({
    files: Object.freeze([
      "feedback-error-01.wav",
      "feedback-error-02.wav",
      "feedback-error-03.wav",
      "feedback-error-04.wav"
    ]),
    volume: 0.75,
    channel: "voice",
    preload: "metadata"
  })
});

export const DUDUQ_SOUND_ASSET_ROOT = AUDIO_ROOT;
export const DUDUQ_SOUND_SOURCE = Object.freeze({
  repository: "augustoborgessousa93/Assets-DuduQ",
  folder: "Efeitos sonoros",
  commit: "c9803dca253a4208bbb3a05d505ff43c8ef403c5",
  voiceCommit: "ae9be9f0a52368c8fa56f56a1eb18e9f8bc68607"
});
