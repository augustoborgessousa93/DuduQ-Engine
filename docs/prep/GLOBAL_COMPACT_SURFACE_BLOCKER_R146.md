# BLOCKER GLOBAL — compact mechanic surface under Canary R146

Preparation record only. This file does not change Core, Router, mechanics, module content, or release selection.

## Classification

`BLOCKER_GLOBAL — SHARED_COMPACT_MECHANIC_SURFACE`

The M04 official sharded homologation proved desktop and Full HD can complete the 10/10 contract, while tablet and mobile expose only a 150 px public mechanic iframe. A fail-closed comparison with already frozen modules proves this is not an M04-local layout defect.

## Evidence chain

### Official M04 sharded gate

Run `33455363921`:

- `desktop-1366x768`: PASS;
- `fullhd-1920x1080`: PASS;
- `tablet-768x1024`: FAIL at compact public surface;
- `mobile-390x844`: FAIL at compact public surface;
- aggregate correctly failed because the result was 2/4, not 4/4.

At failure, the M04 session existed, `transitioning=false`, Transition was `idle`, Target Shooter was mounted with three enabled targets, and there were no blocking `pageerror` or `critical404` signals.

### M03 frozen comparison

A compact diagnostic showed the same 150 px public iframe on M03 and M04. M03's Drag & Drop cards happened to be inside the exposed/scrolled slice, while M04's Target Shooter targets were outside it. This ruled out the M04 local helper as the owner of the surface height.

### M01 frozen Target Shooter × M04 Target Shooter comparison

Run `33455904240` compared M01 FROZEN and M04 using the same Target Shooter mechanic and the same compact viewports.

Tablet `768x1024`:

- M01 iframe: `768 × 150`;
- M04 iframe: `768 × 150`;
- M01 visible TS targets inside the 150 px viewport: `0`;
- M04 visible TS targets inside the 150 px viewport: `0`;
- both sessions stable and Transition `idle`;
- `pageErrors=[]`, `critical404=[]`.

Mobile `390x844`:

- M01 iframe: `390 × 150`;
- M04 iframe: `390 × 150`;
- M01 visible TS targets inside the 150 px viewport: `0`;
- M04 visible TS targets inside the 150 px viewport: `0`;
- both sessions stable and Transition `idle`;
- `pageErrors=[]`, `critical404=[]`.

The target coordinates are materially outside the visible iframe in both frozen M01 and M04, so this is not a difference in M04 content or local visual composition.

## Shared ownership evidence

The shared Target Shooter 1.0.21 adapter mounts its mechanic iframe at `width:100%` and `height:100%` inside the host-provided mechanic container. The observed host container (`.duduq-mechanic-frame`) itself resolves to 150 px in compact viewports. The shared runtime surface guard does not assign the missing height; it audits/guards the surface instead.

Therefore a local M04 CSS workaround would hide a shared infrastructure defect and is prohibited.

## Required resolution protocol

Before M04 can be frozen — and before future compact homologations relying on this surface can be trusted — a separate shared-infrastructure candidate must:

1. identify the canonical owner of `.duduq-mechanic-frame` sizing;
2. fix compact height without changing the pedagogical/content contracts;
3. validate at least frozen M01 Target Shooter and one frozen Drag & Drop module on tablet/mobile;
4. run shared regressions for desktop/fullHD/tablet/mobile;
5. promote through the normal release/Canary protocol rather than patching M04 locally;
6. then rerun the M04 official 4/4 gate against the promoted shared baseline.

Until that happens, M04 remains not frozen and the official score remains Year 1 `3/6`, total `3/30`.
