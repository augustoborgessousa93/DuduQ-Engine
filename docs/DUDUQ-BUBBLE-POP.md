# DUDUQ Bubble Pop

Status: **BASELINE V1 FROZEN**

## Owners

- Engine: `core/duduq-bubble-pop-engine.js`
- Renderer: `play/bubble-pop/bubble-pop.js`
- Route: `http://127.0.0.1:4175/play/bubble-pop/`

## Activity contract

The activity configuration supplies a prompt, a pool of distractors and multiple required targets. A target can contain `type: "text"` with `value`, or `type: "image"` with `src`/`imageSrc` and `alt`.

The engine owns required, found and pending targets. The canonical counter is `FOUND / REQUIRED`; distractors do not change it and found targets are not counted again.

## Frozen gameplay

- Interactive spawn is progressive and pedagogical: distractors appear first, then correct targets are mixed into the flow.
- Interactive Bubbles use the full-stage movement layer: `#game > .bubble-pop-movement-layer`.
- Entries originate beyond the real bottom, left or right stage edge.
- Decorative Bubbles are non-interactive, subtle and remain in their approved independent layer.
- The visual pop lifecycle is `bubble-idle.png → bubble-pop-ring.png → local correct/incorrect feedback → removed`.
- `bubble-pop-burst.png` and `bubble-pop-splash.png` remain assets only; they are not part of V1 playback.
- A Bubble locks on its first valid input. Its educational content is removed at pop start.

## Completion contract

Local correct/incorrect feedback is used during play. The canonical footer appears only after every required target has been found, presents Continue, and never advances automatically. The completion state triggers the canonical celebration layer (confetti and explosion); the correct voice feedback also plays at completion.

## Preserved shell

The Matching/Target Shooter canonical Header, Question HUD, progress, fullscreen and feedback footer are consumed unchanged. Matching, Target Shooter and Drag Drop are outside the Bubble Pop V1 scope.
