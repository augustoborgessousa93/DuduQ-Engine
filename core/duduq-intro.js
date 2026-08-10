/* =========================================================
   DUDUQ CORE — INTRO CINEMATOGRÁFICA
   Premium AAA+ Brand Launch
   Versão 1.3.0

   OBJETIVOS DESTA VERSÃO
   1. Brasil Cultural com presença real de marca / outdoor
   2. "Uma criação de" com tipografia mais sofisticada
   3. EduQ Play maior e mais protagonista
   4. Melhor respiro entre logo, metadados, loading e CTA
   5. Mantém compatibilidade com duduq-intro.js 1.2.0
   ========================================================= */

:root {
  --duduq-intro-blue: #0874d8;
  --duduq-intro-blue-light: #3aa8f5;
  --duduq-intro-blue-dark: #0054aa;
  --duduq-intro-blue-deep: #073f7c;
  --duduq-intro-cyan: #73dcff;
  --duduq-intro-green: #58cc02;
  --duduq-intro-green-dark: #379800;
  --duduq-intro-gold: #ffc928;
  --duduq-intro-ink: #153d66;
  --duduq-intro-text: #55738e;
  --duduq-intro-muted: #8299ae;
  --duduq-intro-font: Nunito, ui-rounded, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --duduq-intro-brand-font: "Aptos Display", "Segoe UI Variable Display", "Avenir Next", "Helvetica Neue", Arial, sans-serif;
}

.duduq-intro,
.duduq-intro *,
.duduq-intro *::before,
.duduq-intro *::after {
  box-sizing: border-box;
}

/* =========================================================
   ROOT
   ========================================================= */

.duduq-intro {
  position: fixed;
  z-index: 99999;
  inset: 0;
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
  display: grid;
  place-items: center;
  padding: clamp(12px, 2.5vh, 30px) clamp(12px, 3vw, 44px);
  font-family: var(--duduq-intro-font);
  color: var(--duduq-intro-ink);
  background:
    radial-gradient(circle at 12% 16%, rgba(68, 183, 255, .12), transparent 28%),
    radial-gradient(circle at 88% 82%, rgba(38, 151, 238, .10), transparent 30%),
    radial-gradient(circle at 86% 12%, rgba(255, 201, 40, .045), transparent 22%),
    linear-gradient(180deg, #ffffff 0%, #ffffff 48%, #f5faff 100%);
  opacity: 0;
  isolation: isolate;
  animation: duduqIntroScreenIn 480ms cubic-bezier(.16, .82, .24, 1) forwards;
}

.duduq-intro::before {
  content: "";
  position: absolute;
  z-index: 0;
  inset: -18%;
  pointer-events: none;
  opacity: .55;
  background:
    radial-gradient(circle at 50% 45%, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 48%, rgba(10,81,143,.035) 100%),
    repeating-linear-gradient(0deg, rgba(27,111,177,.014) 0px, rgba(27,111,177,.014) 1px, transparent 1px, transparent 5px);
  animation: duduqIntroBackdropBreath 9s ease-in-out infinite;
}

/* Linha luminosa da transição Empresa -> Coleção */
.duduq-intro::after {
  content: "";
  position: absolute;
  z-index: 100;
  left: -10%;
  top: 50%;
  width: 120%;
  height: 4px;
  opacity: 0;
  pointer-events: none;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(53,169,244,.08) 14%,
    rgba(160,226,255,.50) 31%,
    #ffffff 45%,
    #ffffff 50%,
    #ffffff 55%,
    rgba(151,223,255,.52) 69%,
    rgba(35,153,237,.08) 86%,
    transparent 100%
  );
  box-shadow:
    0 0 8px rgba(255,255,255,.98),
    0 0 22px rgba(78,190,249,.68),
    0 0 55px rgba(16,125,214,.32);
  transform: translateY(-50%) scaleX(.02);
}

/* =========================================================
   ATMOSFERA
   ========================================================= */

.duduq-intro-atmosphere {
  position: absolute;
  z-index: 1;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  transition: opacity 450ms ease, filter 450ms ease;
}

.duduq-intro-orb {
  position: absolute;
  border-radius: 50%;
  opacity: .10;
  background: radial-gradient(
    circle at 35% 30%,
    rgba(255,255,255,.98),
    rgba(117,211,255,.42) 38%,
    rgba(8,116,216,.08) 70%,
    transparent 75%
  );
  animation: duduqIntroOrbFloat 9s ease-in-out infinite;
}

.duduq-intro-orb:nth-child(1) {
  width: 210px;
  height: 210px;
  top: 5%;
  left: 4%;
  animation-delay: -2s;
}

.duduq-intro-orb:nth-child(2) {
  width: 170px;
  height: 170px;
  right: 5%;
  bottom: 6%;
  animation-delay: -5s;
}

.duduq-intro-orb:nth-child(3) {
  width: 100px;
  height: 100px;
  right: 10%;
  top: 10%;
  animation-delay: -3s;
}

.duduq-intro-spark {
  position: absolute;
  width: var(--duduq-intro-spark-size, 16px);
  height: var(--duduq-intro-spark-size, 16px);
  display: grid;
  place-items: center;
  color: var(--duduq-intro-spark-color, #ffc928);
  font-size: var(--duduq-intro-spark-size, 16px);
  line-height: 1;
  opacity: 0;
  filter: drop-shadow(0 3px 6px rgba(42,105,159,.08));
  animation:
    duduqIntroSparkIn 800ms var(--duduq-intro-spark-delay, 0ms) cubic-bezier(.16,.82,.24,1.14) forwards,
    duduqIntroSparkFloat var(--duduq-intro-spark-duration, 4800ms) calc(var(--duduq-intro-spark-delay, 0ms) + 800ms) ease-in-out infinite;
}

/* =========================================================
   STAGE
   ========================================================= */

.duduq-intro-stage {
  position: relative;
  z-index: 10;
  width: min(1220px, 98vw);
  min-height: calc(100dvh - 24px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 4px clamp(8px, 2vw, 24px);
}

/* =========================================================
   ATO 1 — EMPRESA
   ========================================================= */

.duduq-intro-company {
  position: relative;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(30px, 5vh, 52px);
  transform-origin: center center;
}

.duduq-intro-kicker {
  margin: 0;
  color: #617b94;
  font-family: var(--duduq-intro-brand-font);
  font-size: clamp(17px, 1.35vw, 22px);
  font-weight: 550;
  line-height: 1.15;
  letter-spacing: .16em;
  text-transform: lowercase;
  text-wrap: balance;
  text-shadow: 0 1px 0 rgba(255,255,255,.95);
}

.duduq-intro-kicker::first-letter {
  text-transform: uppercase;
}

.duduq-intro-company-logo {
  display: block;
  width: auto;
  height: auto;
  max-width: 92vw;
  object-fit: contain;
  transform-origin: center center;
  will-change: transform, opacity, filter;
  filter: drop-shadow(0 20px 30px rgba(17,70,113,.10));
}

.duduq-intro.is-branding .duduq-intro-company {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(42px, 6.4vh, 70px);
  animation: duduqIntroBrandBlockIn 760ms 80ms cubic-bezier(.16,.82,.24,1) both;
}

.duduq-intro.is-branding .duduq-intro-kicker {
  opacity: 0;
  animation: duduqIntroBrandKickerIn 900ms 180ms ease-out forwards;
}

/*
 * A logo original da Brasil Cultural possui bastante área de canvas.
 * Por isso a versão 1.3 usa DUAS escalas:
 * - largura de layout ampla;
 * - escala visual adicional no keyframe.
 * Assim a marca finalmente ocupa a tela como protagonista.
 */
.duduq-intro.is-branding .duduq-intro-company-logo {
  width: min(max(var(--duduq-intro-company-width, 900px), 900px), 84vw);
  max-width: 1080px;
  max-height: 54vh;
  opacity: 0;
  filter:
    blur(11px)
    drop-shadow(0 28px 48px rgba(20,77,124,.15));
  animation: duduqIntroBrandLogoReveal 1550ms 220ms cubic-bezier(.12,.76,.18,1) forwards;
}

.duduq-intro.is-branding .duduq-intro-collection,
.duduq-intro.is-branding .duduq-intro-meta,
.duduq-intro.is-branding .duduq-intro-loading,
.duduq-intro.is-branding .duduq-intro-actions {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

/* =========================================================
   ATO 2 — SWITCHING
   ========================================================= */

.duduq-intro.is-switching .duduq-intro-company {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(42px, 6.4vh, 70px);
  animation: duduqIntroBrandTVOff 620ms cubic-bezier(.48,0,.74,.28) forwards;
}

.duduq-intro.is-switching .duduq-intro-company-logo {
  width: min(max(var(--duduq-intro-company-width, 900px), 900px), 84vw);
  max-width: 1080px;
  max-height: 54vh;
  transform: scale(2.15);
}

.duduq-intro.is-switching::after {
  animation: duduqIntroTVLine 700ms 90ms cubic-bezier(.18,.74,.20,1) both;
}

.duduq-intro.is-switching .duduq-intro-atmosphere {
  opacity: .18;
  filter: blur(2px);
}

.duduq-intro.is-switching .duduq-intro-collection,
.duduq-intro.is-switching .duduq-intro-meta,
.duduq-intro.is-switching .duduq-intro-loading,
.duduq-intro.is-switching .duduq-intro-actions {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

/* =========================================================
   ATO 3 — EDUQ PLAY / MISSÃO
   ========================================================= */

.duduq-intro-collection {
  position: relative;
  width: min(1020px, 95vw);
  min-height: clamp(340px, 51vh, 450px);
  display: grid;
  place-items: center;
  margin: -12px auto clamp(18px, 2.5vh, 28px);
  pointer-events: none;
  transform-origin: center center;
}

.duduq-intro-collection::before {
  content: "";
  position: absolute;
  z-index: 0;
  left: 50%;
  bottom: 0;
  width: 48%;
  height: 36px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(20,70,113,.17) 0%, rgba(20,70,113,.06) 50%, transparent 77%);
  filter: blur(12px);
  transform: translateX(-50%) scaleX(.9);
  opacity: .75;
}

.duduq-intro-collection-logo {
  position: relative;
  z-index: 2;
  display: block;
  width: auto;
  height: clamp(320px, 52vh, 445px);
  max-width: 88vw;
  object-fit: contain;
  transform-origin: center center;
  filter:
    drop-shadow(0 26px 35px rgba(14,65,108,.18))
    drop-shadow(0 6px 8px rgba(14,65,108,.07));
}

.duduq-intro-collection-shine {
  position: absolute;
  z-index: 4;
  inset: 3% 5%;
  overflow: hidden;
  border-radius: 48px;
  opacity: .65;
  pointer-events: none;
}

.duduq-intro-collection-shine::before {
  content: "";
  position: absolute;
  top: -30%;
  left: -38%;
  width: 15%;
  height: 165%;
  opacity: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.88), rgba(181,232,255,.42), transparent);
  filter: blur(7px);
  transform: rotate(14deg);
}

.duduq-intro-collection-name {
  position: relative;
  z-index: 2;
  width: 100%;
  margin: 0;
  color: var(--duduq-intro-blue);
  font-family: var(--duduq-intro-font);
  font-size: clamp(68px, 9.2vw, 116px);
  font-weight: 1000;
  line-height: .92;
  letter-spacing: -.05em;
  text-shadow: 0 3px 0 #ffffff, 0 17px 32px rgba(8,84,163,.11);
}

/* =========================================================
   META — MAIS RESPIRO
   ========================================================= */

.duduq-intro-meta {
  position: relative;
  max-width: 920px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px 12px;
  margin: 0 auto clamp(24px, 3.2vh, 34px);
}

.duduq-intro-meta-chip {
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 18px;
  color: var(--duduq-intro-blue-deep);
  border: 1.5px solid rgba(171,207,234,.94);
  border-radius: 999px;
  background: linear-gradient(180deg, #ffffff, #f3f9fe);
  box-shadow:
    0 3px 0 rgba(174,203,226,.42),
    0 9px 20px rgba(25,77,122,.05),
    inset 0 1px 0 #ffffff;
  font-family: var(--duduq-intro-font);
  font-size: clamp(13px, 1.15vw, 16px);
  font-weight: 1000;
  line-height: 1;
  letter-spacing: .02em;
  text-transform: uppercase;
}

.duduq-intro-meta-chip--primary {
  color: #ffffff;
  border-color: #0062bc;
  background: linear-gradient(180deg, #3ca6f5 0%, #1085e5 42%, #0871d2 100%);
  box-shadow:
    0 4px 0 #0055aa,
    0 10px 20px rgba(0,83,168,.13),
    inset 0 1px 0 rgba(255,255,255,.32);
}

/* =========================================================
   LOADING
   ========================================================= */

.duduq-intro-loading {
  position: relative;
  width: min(680px, 90vw);
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0 auto;
}

.duduq-intro-loading-head {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 0 3px;
}

.duduq-intro-loading-label {
  margin: 0;
  color: var(--duduq-intro-text);
  font-family: var(--duduq-intro-font);
  font-size: clamp(12px, 1vw, 14px);
  font-weight: 1000;
  line-height: 1;
  letter-spacing: .10em;
  text-transform: uppercase;
}

.duduq-intro-loading-percent {
  min-width: 45px;
  color: var(--duduq-intro-blue);
  font-family: var(--duduq-intro-font);
  font-size: clamp(12px, 1.05vw, 15px);
  font-weight: 1000;
  line-height: 1;
  text-align: right;
}

.duduq-intro-loading-track {
  position: relative;
  width: 100%;
  height: 15px;
  overflow: hidden;
  padding: 3px;
  border: 1.5px solid #c4dced;
  border-radius: 999px;
  background: linear-gradient(180deg, #e3eef6 0%, #f8fbfe 100%);
  box-shadow:
    inset 0 2px 5px rgba(31,78,119,.09),
    0 3px 9px rgba(22,70,112,.04);
}

.duduq-intro-loading-fill {
  position: relative;
  width: var(--duduq-intro-progress, 0%);
  height: 100%;
  overflow: hidden;
  border-radius: 999px;
  background: linear-gradient(90deg, #005ebd 0%, #0c83e7 34%, #42b7f4 72%, #7edfff 100%);
  box-shadow: 0 0 14px rgba(34,157,236,.31), inset 0 1px 0 rgba(255,255,255,.46);
  transition: width 380ms cubic-bezier(.19,.74,.25,1);
}

.duduq-intro-loading-fill::before {
  content: "";
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(125deg, transparent 0, transparent 12px, rgba(255,255,255,.21) 12px, rgba(255,255,255,.21) 21px);
  animation: duduqIntroLoadingStripe 760ms linear infinite;
}

.duduq-intro-loading-fill::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  width: 48px;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.95));
  filter: blur(3px);
}

.duduq-intro.is-ready .duduq-intro-loading-fill {
  background: linear-gradient(90deg, #35a900 0%, #58cc02 48%, #8ce92e 100%);
  box-shadow: 0 0 16px rgba(88,204,2,.31), inset 0 1px 0 rgba(255,255,255,.49);
}

.duduq-intro.is-ready .duduq-intro-loading-track {
  animation: duduqIntroTrackReady 430ms ease-out both;
}

.duduq-intro.is-ready .duduq-intro-loading-label {
  color: #47812d;
}

/* =========================================================
   CTA — MAIS DISTÂNCIA DO LOADING
   ========================================================= */

.duduq-intro-actions {
  position: relative;
  width: min(470px, 90vw);
  min-height: 88px;
  display: grid;
  place-items: center;
  margin: clamp(28px, 4vh, 42px) auto 0;
}

.duduq-intro-start-button {
  position: relative;
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  min-height: 68px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 14px 32px;
  overflow: hidden;
  cursor: pointer;
  color: #ffffff;
  border: 2px solid #0055aa;
  border-radius: 21px;
  background: linear-gradient(180deg, #34a3f3 0%, #1488e7 37%, #0876da 63%, #0061bd 100%);
  box-shadow:
    0 7px 0 #0053a5,
    0 17px 31px rgba(0,84,170,.21),
    inset 0 2px 0 rgba(255,255,255,.35);
  font-family: var(--duduq-intro-font);
  font-size: clamp(18px, 1.55vw, 21px);
  font-weight: 1000;
  line-height: 1;
  letter-spacing: .025em;
  text-transform: uppercase;
  opacity: 0;
  visibility: hidden;
  transform: translateY(16px) scale(.93);
  transition: transform 150ms ease, box-shadow 150ms ease, filter 150ms ease;
}

.duduq-intro-start-button::before {
  content: "";
  position: absolute;
  top: 5px;
  left: 15%;
  width: 70%;
  height: 2px;
  border-radius: 999px;
  background: rgba(255,255,255,.46);
}

.duduq-intro-start-button::after {
  content: "";
  position: absolute;
  top: -35%;
  left: -34%;
  width: 20%;
  height: 180%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.74), transparent);
  filter: blur(3px);
  transform: rotate(16deg);
  pointer-events: none;
}

.duduq-intro.is-ready .duduq-intro-start-button {
  visibility: visible;
  animation: duduqIntroStartReady 650ms cubic-bezier(.15,.80,.22,1.16) forwards;
}

.duduq-intro.is-branding .duduq-intro-start-button,
.duduq-intro.is-switching .duduq-intro-start-button {
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

.duduq-intro.is-ready .duduq-intro-start-button::after {
  animation: duduqIntroButtonShine 950ms 420ms ease-out both;
}

.duduq-intro-start-button:hover:not(:disabled) {
  transform: translateY(-3px) scale(1.012);
  filter: brightness(1.04) saturate(1.04);
  box-shadow:
    0 9px 0 #0053a5,
    0 21px 35px rgba(0,84,170,.24),
    inset 0 2px 0 rgba(255,255,255,.37);
}

.duduq-intro-start-button:active:not(:disabled) {
  transform: translateY(4px) scale(.992);
  box-shadow:
    0 3px 0 #0053a5,
    0 8px 15px rgba(0,84,170,.15),
    inset 0 2px 0 rgba(255,255,255,.26);
}

.duduq-intro-start-button:focus {
  outline: none;
}

.duduq-intro-start-button:focus-visible {
  outline: none;
  box-shadow:
    0 7px 0 #0053a5,
    0 17px 31px rgba(0,84,170,.21),
    0 0 0 5px rgba(8,116,216,.11),
    inset 0 2px 0 rgba(255,255,255,.35);
}

.duduq-intro-start-icon {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--duduq-intro-blue-dark);
  background: #ffffff;
  box-shadow: 0 2px 0 rgba(0,54,111,.20);
  font-size: 14px;
  font-weight: 1000;
  line-height: 1;
  transition: transform 170ms ease;
}

.duduq-intro-start-button:hover .duduq-intro-start-icon {
  transform: translateX(2px) scale(1.05);
}

.duduq-intro-hint {
  margin: 15px 0 0;
  color: #93a8bb;
  font-family: var(--duduq-intro-font);
  font-size: clamp(10px, .9vw, 12px);
  font-weight: 900;
  line-height: 1.25;
  opacity: 0;
  transition: opacity 300ms ease;
}

.duduq-intro.is-ready .duduq-intro-hint {
  opacity: 1;
}

/* =========================================================
   MISSION ACTIVE
   ========================================================= */

.duduq-intro.is-mission .duduq-intro-company {
  position: absolute;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.duduq-intro.is-mission .duduq-intro-collection {
  opacity: 0;
  animation: duduqIntroMissionHeroIn 1050ms 20ms cubic-bezier(.14,.80,.19,1.10) forwards;
}

.duduq-intro.is-mission .duduq-intro-collection-logo,
.duduq-intro.is-mission .duduq-intro-collection-name {
  animation: duduqIntroCollectionSpringAAA 1150ms 20ms cubic-bezier(.14,.80,.19,1.10) both;
}

.duduq-intro.is-mission .duduq-intro-collection-shine::before {
  animation: duduqIntroLogoShine 820ms 850ms ease-out both;
}

.duduq-intro.is-mission .duduq-intro-meta {
  opacity: 0;
  animation: duduqIntroMissionMetaIn 580ms 560ms cubic-bezier(.17,.78,.24,1) forwards;
}

.duduq-intro.is-mission .duduq-intro-meta-chip:nth-child(1) {
  animation: duduqIntroChipPop 520ms 590ms cubic-bezier(.15,.80,.22,1.15) both;
}

.duduq-intro.is-mission .duduq-intro-meta-chip:nth-child(2) {
  animation: duduqIntroChipPop 520ms 680ms cubic-bezier(.15,.80,.22,1.15) both;
}

.duduq-intro.is-mission .duduq-intro-meta-chip:nth-child(3) {
  animation: duduqIntroChipPop 520ms 770ms cubic-bezier(.15,.80,.22,1.15) both;
}

.duduq-intro.is-mission .duduq-intro-loading {
  opacity: 0;
  animation: duduqIntroMissionLoadingIn 560ms 800ms ease-out forwards;
}

/* =========================================================
   EXIT
   ========================================================= */

.duduq-intro.is-leaving {
  pointer-events: none;
  animation: duduqIntroScreenOut 470ms cubic-bezier(.40,0,.65,.28) forwards;
}

.duduq-intro.is-leaving .duduq-intro-stage {
  animation: duduqIntroStageOut 450ms cubic-bezier(.40,0,.65,.28) forwards;
}

/* =========================================================
   KEYFRAMES
   ========================================================= */

@keyframes duduqIntroScreenIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes duduqIntroBackdropBreath {
  0%, 100% { transform: scale(1.03); }
  50% { transform: scale(1.075); }
}

@keyframes duduqIntroBrandBlockIn {
  0% { opacity: 0; transform: scale(.965); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes duduqIntroBrandKickerIn {
  0% {
    opacity: 0;
    transform: translateY(-14px);
    filter: blur(4px);
    letter-spacing: .22em;
  }
  100% {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
    letter-spacing: .16em;
  }
}

/*
 * IMPORTANTE:
 * O scale(2.15) final compensa o canvas transparente do PNG
 * da Brasil Cultural sem exigir alteração do arquivo de asset.
 */
@keyframes duduqIntroBrandLogoReveal {
  0% {
    opacity: 0;
    transform: translateY(24px) scale(1.28);
    filter: blur(14px) drop-shadow(0 16px 28px rgba(20,77,124,.04));
  }
  34% {
    opacity: .78;
    transform: translateY(8px) scale(1.72);
    filter: blur(5px) drop-shadow(0 22px 38px rgba(20,77,124,.09));
  }
  68% {
    opacity: 1;
    transform: translateY(-5px) scale(2.22);
    filter: blur(0) drop-shadow(0 30px 50px rgba(20,77,124,.16));
  }
  84% {
    transform: translateY(2px) scale(2.10);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(2.15);
    filter: blur(0) drop-shadow(0 26px 46px rgba(20,77,124,.14));
  }
}

@keyframes duduqIntroBrandTVOff {
  0% {
    opacity: 1;
    transform: scaleX(1) scaleY(1);
    filter: blur(0) brightness(1);
  }
  36% {
    opacity: 1;
    transform: scaleX(1.018) scaleY(.38);
    filter: blur(.5px) brightness(1.08);
  }
  58% {
    opacity: 1;
    transform: scaleX(1.035) scaleY(.055);
    filter: blur(1px) brightness(1.32);
  }
  74% {
    opacity: .95;
    transform: scaleX(.78) scaleY(.018);
    filter: blur(3px) brightness(1.75);
  }
  100% {
    opacity: 0;
    transform: scaleX(.04) scaleY(.006);
    filter: blur(9px) brightness(2.2);
  }
}

@keyframes duduqIntroTVLine {
  0% { opacity: 0; transform: translateY(-50%) scaleX(.02); }
  22% { opacity: 1; transform: translateY(-50%) scaleX(.74); }
  47% { opacity: 1; height: 5px; transform: translateY(-50%) scaleX(1); }
  70% { opacity: .9; height: 2px; transform: translateY(-50%) scaleX(.50); }
  100% { opacity: 0; height: 1px; transform: translateY(-50%) scaleX(.025); filter: blur(6px); }
}

@keyframes duduqIntroMissionHeroIn {
  0% { opacity: 0; transform: translateY(30px) scale(.91); filter: blur(9px); }
  58% { opacity: 1; transform: translateY(-4px) scale(1.025); filter: blur(0); }
  100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}

@keyframes duduqIntroCollectionSpringAAA {
  0% {
    opacity: 0;
    transform: translateY(36px) scale(.58);
    filter: blur(11px) drop-shadow(0 10px 18px rgba(14,65,108,.04));
  }
  50% {
    opacity: 1;
    transform: translateY(-9px) scale(1.085);
    filter: blur(0) drop-shadow(0 29px 38px rgba(14,65,108,.20));
  }
  70% { transform: translateY(4px) scale(.972); }
  85% { transform: translateY(-2px) scale(1.014); }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0) drop-shadow(0 26px 35px rgba(14,65,108,.18));
  }
}

@keyframes duduqIntroLogoShine {
  0% { left: -36%; opacity: 0; }
  20% { opacity: .76; }
  100% { left: 128%; opacity: 0; }
}

@keyframes duduqIntroMissionMetaIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes duduqIntroChipPop {
  0% { opacity: 0; transform: translateY(12px) scale(.84); }
  65% { opacity: 1; transform: translateY(-2px) scale(1.04); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes duduqIntroMissionLoadingIn {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes duduqIntroLoadingStripe {
  from { transform: translateX(-28px); }
  to { transform: translateX(28px); }
}

@keyframes duduqIntroTrackReady {
  0% { transform: scale(1); }
  45% {
    transform: scale(1.018);
    box-shadow: 0 0 0 5px rgba(88,204,2,.06), inset 0 2px 5px rgba(31,78,119,.08);
  }
  100% { transform: scale(1); }
}

@keyframes duduqIntroStartReady {
  0% { opacity: 0; transform: translateY(18px) scale(.91); }
  62% { opacity: 1; transform: translateY(-3px) scale(1.035); }
  82% { transform: translateY(1px) scale(.992); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes duduqIntroButtonShine {
  0% { left: -32%; opacity: 0; }
  20% { opacity: .75; }
  100% { left: 128%; opacity: 0; }
}

@keyframes duduqIntroOrbFloat {
  0%, 100% { transform: translate3d(0,0,0) scale(1); }
  50% { transform: translate3d(0,-20px,0) scale(1.055); }
}

@keyframes duduqIntroSparkIn {
  0% { opacity: 0; transform: translate3d(0,12px,0) scale(.4) rotate(-25deg); }
  65% { opacity: .85; transform: translate3d(0,-3px,0) scale(1.12) rotate(8deg); }
  100% { opacity: .60; transform: translate3d(0,0,0) scale(1) rotate(0); }
}

@keyframes duduqIntroSparkFloat {
  0%, 100% { transform: translate3d(0,0,0) rotate(-5deg) scale(1); }
  50% { transform: translate3d(0,-13px,0) rotate(8deg) scale(1.05); }
}

@keyframes duduqIntroStageOut {
  0% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
  100% { opacity: 0; transform: translateY(-14px) scale(1.018); filter: blur(7px); }
}

@keyframes duduqIntroScreenOut {
  0% { opacity: 1; }
  100% { opacity: 0; visibility: hidden; }
}

/* =========================================================
   NOTEBOOK / ALTURA REDUZIDA
   ========================================================= */

@media (max-height: 760px) and (min-width: 700px) {
  .duduq-intro {
    padding: 5px 20px;
  }

  .duduq-intro-stage {
    min-height: calc(100dvh - 10px);
  }

  .duduq-intro.is-branding .duduq-intro-company,
  .duduq-intro.is-switching .duduq-intro-company {
    gap: 42px;
  }

  .duduq-intro.is-branding .duduq-intro-kicker {
    font-size: clamp(16px, 1.25vw, 20px);
  }

  .duduq-intro.is-branding .duduq-intro-company-logo,
  .duduq-intro.is-switching .duduq-intro-company-logo {
    width: min(max(var(--duduq-intro-company-width, 900px), 900px), 82vw);
    max-width: 1050px;
    max-height: 50vh;
  }

  .duduq-intro-collection {
    min-height: 310px;
    margin: -18px auto 14px;
  }

  .duduq-intro-collection-logo {
    height: clamp(280px, 47vh, 340px);
  }

  .duduq-intro-meta {
    margin: 0 auto 19px;
  }

  .duduq-intro-meta-chip {
    min-height: 34px;
    padding: 6px 14px;
    font-size: 12px;
  }

  .duduq-intro-loading {
    width: min(640px, 88vw);
    gap: 7px;
  }

  .duduq-intro-actions {
    min-height: 66px;
    margin-top: 24px;
  }

  .duduq-intro-start-button {
    min-height: 56px;
    font-size: 16px;
  }

  .duduq-intro-hint {
    margin-top: 12px;
  }
}

/* =========================================================
   TABLET
   ========================================================= */

@media (max-width: 820px) {
  .duduq-intro.is-branding .duduq-intro-company-logo,
  .duduq-intro.is-switching .duduq-intro-company-logo {
    width: min(820px, 84vw);
  }

  .duduq-intro-collection-logo {
    height: clamp(275px, 44vh, 365px);
    max-width: 90vw;
  }

  @keyframes duduqIntroBrandLogoReveal {
    0% { opacity: 0; transform: translateY(20px) scale(.92); filter: blur(12px); }
    68% { opacity: 1; transform: translateY(-4px) scale(1.34); filter: blur(0); }
    100% { opacity: 1; transform: translateY(0) scale(1.30); filter: blur(0); }
  }

  .duduq-intro.is-switching .duduq-intro-company-logo {
    transform: scale(1.30);
  }
}

/* =========================================================
   MOBILE
   ========================================================= */

@media (max-width: 560px) {
  .duduq-intro {
    padding: 8px 7px 16px;
  }

  .duduq-intro-stage {
    width: 100%;
  }

  .duduq-intro.is-branding .duduq-intro-company,
  .duduq-intro.is-switching .duduq-intro-company {
    gap: 28px;
  }

  .duduq-intro.is-branding .duduq-intro-kicker {
    font-size: 13px;
    letter-spacing: .12em;
  }

  .duduq-intro.is-branding .duduq-intro-company-logo,
  .duduq-intro.is-switching .duduq-intro-company-logo {
    width: min(460px, 88vw);
    max-height: 38vh;
  }

  .duduq-intro-collection {
    min-height: 255px;
    margin: -6px auto 12px;
  }

  .duduq-intro-collection-logo {
    height: clamp(225px, 37vh, 285px);
    max-width: 92vw;
  }

  .duduq-intro-meta {
    gap: 7px;
    margin: 0 auto 18px;
  }

  .duduq-intro-meta-chip {
    min-height: 32px;
    padding: 6px 11px;
    font-size: 11px;
  }

  .duduq-intro-loading {
    width: 91vw;
  }

  .duduq-intro-loading-track {
    height: 13px;
  }

  .duduq-intro-actions {
    width: min(380px, 91vw);
    margin-top: 22px;
  }

  .duduq-intro-start-button {
    min-height: 58px;
    border-radius: 17px;
    font-size: 16px;
  }

  .duduq-intro-start-icon {
    width: 24px;
    height: 24px;
    flex-basis: 24px;
  }
}

@media (max-width: 390px) {
  .duduq-intro-collection-logo {
    height: 215px;
  }

  .duduq-intro-meta-chip {
    padding-inline: 9px;
    font-size: 10px;
  }

  .duduq-intro-loading-label {
    font-size: 10px;
  }

  .duduq-intro-start-button {
    font-size: 15px;
  }
}

/* =========================================================
   REDUCED MOTION
   ========================================================= */

@media (prefers-reduced-motion: reduce) {
  .duduq-intro,
  .duduq-intro::before,
  .duduq-intro::after,
  .duduq-intro-company,
  .duduq-intro-kicker,
  .duduq-intro-company-logo,
  .duduq-intro-collection,
  .duduq-intro-collection-logo,
  .duduq-intro-collection-name,
  .duduq-intro-collection-shine::before,
  .duduq-intro-meta,
  .duduq-intro-meta-chip,
  .duduq-intro-loading,
  .duduq-intro-loading-fill::before,
  .duduq-intro-start-button,
  .duduq-intro-start-button::after,
  .duduq-intro-orb,
  .duduq-intro-spark,
  .duduq-intro-stage {
    animation: none !important;
    transition-duration: .01ms !important;
  }

  .duduq-intro {
    opacity: 1;
  }

  .duduq-intro.is-branding .duduq-intro-company,
  .duduq-intro.is-branding .duduq-intro-company-logo,
  .duduq-intro.is-branding .duduq-intro-kicker {
    opacity: 1;
    filter: none;
  }

  .duduq-intro.is-branding .duduq-intro-company-logo {
    transform: scale(2.15);
  }

  .duduq-intro.is-mission .duduq-intro-collection,
  .duduq-intro.is-mission .duduq-intro-collection-logo,
  .duduq-intro.is-mission .duduq-intro-collection-name,
  .duduq-intro.is-mission .duduq-intro-meta,
  .duduq-intro.is-mission .duduq-intro-loading {
    opacity: 1;
    transform: none;
    filter: none;
  }

  .duduq-intro.is-ready .duduq-intro-start-button {
    opacity: 1;
    visibility: visible;
    transform: none;
  }
}

