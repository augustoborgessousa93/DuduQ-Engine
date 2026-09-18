# DUDUQ Target Shooter — Gold Master Lock

Status: HUMAN APPROVED. Candidate is frozen; changes require an explicit confirmed-bug pass.

## Locked scene

- Viewport reference: 1366×768, DPR 1.
- Header: 149/12/1056/94 (Core geometry; candidate integration centered).
- Question wide: 270/126/826/86 (Core `QuestionPanel`, wide variant).
- Dog: 264/269/224/211.
- Cat: 483/230/225/213.
- Rabbit: 705/305/184/236.
- Fish: 861/237/246/228.
- Launcher approved root: authored 503/542/360/220, rendered 499.6/542/367.2/224.4 at scale 1.02.
- Launcher logical local pivot: 180/126. Muzzle marker: 180/16. Neutral visual aim: 1.409°.

## Target anchors and states

The target ring is the visual anchor. Status badges are positioned at the ring's upper-right -45° circumference point, using a single target-local rule. Animal artwork uses measured local optical corrections; Fish is centered on its wider frame. Projectile and impact use the effective target center (root center X, ring center Y).

Initial state is IDLE for all targets. Blue is transient hover/selection only. Incorrect state is revealed after impact/evaluation and shakes briefly; correct state pulses and subdues non-correct targets. Reset clears all state and FX.

## Freeze boundaries

Core, Matching, Drag & Drop, Penpot, production, geometry lock, and approved assets are read-only for this candidate. The old side-view launcher files remain reference-only and inactive.
