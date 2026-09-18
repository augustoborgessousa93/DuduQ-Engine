import {
  markComponent,
  GameAudioButton,
  GameFullscreenButton,
  SuccessActionButton,
  ErrorActionButton,
  StatusBadge,
  DuduQMascot
} from "./core/ui/index.js";

export { markComponent };
export const AudioHeaderButton = GameAudioButton;
export const FullscreenHeaderButton = GameFullscreenButton;
export const StatusIcon = StatusBadge;
export const ContinueButton = SuccessActionButton;
export const RetryButton = ErrorActionButton;
export const HudMascot = (image) => DuduQMascot(image, "idle");
export const FeedbackMascot = (image, outcome = "correct") => DuduQMascot(image, outcome);

export function mountMatchingComponents(root = document) {
  AudioHeaderButton(root.querySelector(".audio-button"));
  FullscreenHeaderButton(root.querySelector(".fullscreen-button"));
  HudMascot(root.querySelector('[data-asset="mascot-idle"]'));
  FeedbackMascot(root.querySelector('[data-asset="feedback-mascot"]'), "correct");
  return root;
}
