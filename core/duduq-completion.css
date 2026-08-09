/* =========================================================
   DUDUQ CORE — COMPLETION
   Visual premium da tela central de conclusão.
   Versão 1.0.0
   ========================================================= */

/* =========================================================
   TOKENS VISUAIS
   Alterações futuras podem começar por aqui.
   ========================================================= */

:root {
  --duduq-completion-blue:
    #0567c9;

  --duduq-completion-blue-dark:
    #00458f;

  --duduq-completion-blue-light:
    #eaf5ff;

  --duduq-completion-ink:
    #17375e;

  --duduq-completion-text:
    #52677e;

  --duduq-completion-gold:
    #ffbd22;

  --duduq-completion-gold-light:
    #fff1a8;

  --duduq-completion-card:
    rgba(255, 255, 255, 0.965);

  --duduq-completion-radius:
    34px;

  --duduq-completion-font:
    Fredoka,
    Nunito,
    ui-rounded,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}


/* =========================================================
   TELA
   ========================================================= */

.duduq-completion {
  position:
    relative;

  isolation:
    isolate;

  width:
    100%;

  min-height:
    100vh;

  display:
    grid;

  place-items:
    center;

  box-sizing:
    border-box;

  overflow:
    hidden;

  padding:
    clamp(
      22px,
      4vw,
      48px
    );

  font-family:
    var(
      --duduq-completion-font
    );

  color:
    var(
      --duduq-completion-ink
    );

  background:
    linear-gradient(
      180deg,
      rgba(
        244,
        251,
        255,
        0.08
      ),
      rgba(
        215,
        239,
        255,
        0.16
      )
    );

  backdrop-filter:
    blur(2px)
    saturate(1.06);

  -webkit-backdrop-filter:
    blur(2px)
    saturate(1.06);

  animation:
    duduqCompletionScreenIn
    420ms
    ease-out
    both;
}


/* =========================================================
   LUZ AMBIENTE
   ========================================================= */

.duduq-completion::before {
  content:
    "";

  position:
    absolute;

  z-index:
    -1;

  inset:
    0;

  pointer-events:
    none;

  background:
    radial-gradient(
      circle
      at
      50%
      38%,
      rgba(
        255,
        255,
        255,
        0.42
      )
      0%,
      rgba(
        255,
        255,
        255,
        0.10
      )
      35%,
      rgba(
        255,
        255,
        255,
        0
      )
      67%
    );
}


/* =========================================================
   CARD PRINCIPAL
   ========================================================= */

.duduq-completion-card {
  position:
    relative;

  z-index:
    3;

  width:
    min(
      700px,
      94vw
    );

  min-height:
    0;

  box-sizing:
    border-box;

  display:
    flex;

  flex-direction:
    column;

  align-items:
    center;

  justify-content:
    center;

  gap:
    16px;

  padding:
    clamp(
      30px,
      4.8vw,
      48px
    )
    clamp(
      24px,
      5vw,
      52px
    )
    clamp(
      28px,
      4vw,
      42px
    );

  overflow:
    visible;

  text-align:
    center;

  border:
    2px
    solid
    rgba(
      196,
      214,
      232,
      0.92
    );

  border-radius:
    var(
      --duduq-completion-radius
    );

  background:
    linear-gradient(
      180deg,
      rgba(
        255,
        255,
        255,
        0.985
      )
      0%,
      var(
        --duduq-completion-card
      )
      58%,
      rgba(
        249,
        253,
        255,
        0.98
      )
      100%
    );

  box-shadow:
    0
    7px
    0
    rgba(
      145,
      170,
      196,
      0.60
    ),
    0
    24px
    58px
    rgba(
      29,
      67,
      108,
      0.20
    ),
    0
    0
    42px
    rgba(
      72,
      167,
      255,
      0.10
    ),
    inset
    0
    1px
    0
    rgba(
      255,
      255,
      255,
      1
    );

  animation:
    duduqCompletionCardIn
    640ms
    cubic-bezier(
      0.18,
      0.89,
      0.32,
      1.15
    )
    both;
}


/* brilho muito sutil */

.duduq-completion-card::before {
  content:
    "";

  position:
    absolute;

  pointer-events:
    none;

  inset:
    3px;

  border-radius:
    calc(
      var(
        --duduq-completion-radius
      )
      - 4px
    );

  border:
    1px
    solid
    rgba(
      255,
      255,
      255,
      0.72
    );
}


/* =========================================================
   ÁREA DO MASCOTE
   ========================================================= */

.duduq-completion-hero {
  position:
    relative;

  width:
    clamp(
      150px,
      18vw,
      205px
    );

  height:
    clamp(
      150px,
      18vw,
      205px
    );

  display:
    grid;

  place-items:
    center;

  margin:
    -6px
    0
    -12px;

  flex:
    0
    0
    auto;
}


/* halo */

.duduq-completion-hero::before {
  content:
    "";

  position:
    absolute;

  inset:
    13%;

  border-radius:
    50%;

  background:
    radial-gradient(
      circle,
      rgba(
        124,
        202,
        255,
        0.30
      )
      0%,
      rgba(
        91,
        178,
        255,
        0.12
      )
      42%,
      rgba(
        91,
        178,
        255,
        0
      )
      72%
    );

  filter:
    blur(3px);

  transform:
    scale(1.14);

  animation:
    duduqCompletionHalo
    2200ms
    ease-in-out
    infinite
    alternate;
}


/* mascote */

.duduq-completion-mascot {
  position:
    relative;

  z-index:
    2;

  width:
    100%;

  height:
    100%;

  display:
    block;

  object-fit:
    contain;

  filter:
    drop-shadow(
      0
      14px
      16px
      rgba(
        26,
        73,
        118,
        0.18
      )
    );

  transform-origin:
    50%
    78%;

  animation:
    duduqCompletionMascotIn
    820ms
    cubic-bezier(
      0.18,
      0.89,
      0.30,
      1.30
    )
    both;
}


/* =========================================================
   SELO DE CONQUISTA
   ========================================================= */

.duduq-completion-achievement {
  position:
    relative;

  z-index:
    5;

  width:
    50px;

  height:
    50px;

  box-sizing:
    border-box;

  display:
    grid;

  place-items:
    center;

  margin:
    -26px
    0
    -2px;

  border:
    4px
    solid
    rgba(
      255,
      255,
      255,
      0.96
    );

  border-radius:
    50%;

  background:
    linear-gradient(
      180deg,
      #ffd862
      0%,
      var(
        --duduq-completion-gold
      )
      100%
    );

  box-shadow:
    0
    5px
    0
    #d58b00,
    0
    9px
    17px
    rgba(
      158,
      104,
      0,
      0.18
    );

  animation:
    duduqCompletionAchievementIn
    720ms
    360ms
    cubic-bezier(
      0.18,
      0.89,
      0.32,
      1.28
    )
    both;
}


.duduq-completion-achievement-star {
  display:
    block;

  color:
    #ffffff;

  font-size:
    25px;

  line-height:
    1;

  text-shadow:
    0
    2px
    0
    rgba(
      155,
      98,
      0,
      0.20
    );
}


/* =========================================================
   TÍTULO
   ========================================================= */

.duduq-completion-title {
  position:
    relative;

  z-index:
    2;

  margin:
    2px
    0
    0;

  max-width:
    100%;

  color:
    var(
      --duduq-completion-blue
    );

  font-family:
    var(
      --duduq-completion-font
    );

  font-size:
    clamp(
      36px,
      5vw,
      54px
    );

  font-weight:
    900;

  line-height:
    1.04;

  letter-spacing:
    -0.025em;

  text-wrap:
    balance;

  text-shadow:
    0
    2px
    0
    rgba(
      255,
      255,
      255,
      0.90
    );

  animation:
    duduqCompletionContentIn
    520ms
    190ms
    ease-out
    both;
}


/* =========================================================
   MENSAGEM
   ========================================================= */

.duduq-completion-message {
  position:
    relative;

  z-index:
    2;

  max-width:
    570px;

  margin:
    0;

  color:
    var(
      --duduq-completion-text
    );

  font-family:
    var(
      --duduq-completion-font
    );

  font-size:
    clamp(
      17px,
      2.05vw,
      21px
    );

  font-weight:
    700;

  line-height:
    1.42;

  letter-spacing:
    -0.008em;

  text-wrap:
    balance;

  animation:
    duduqCompletionContentIn
    520ms
    260ms
    ease-out
    both;
}


/* =========================================================
   BADGE DE PROGRESSO CONCLUÍDO
   ========================================================= */

.duduq-completion-progress {
  position:
    relative;

  z-index:
    2;

  display:
    inline-flex;

  align-items:
    center;

  justify-content:
    center;

  gap:
    10px;

  max-width:
    100%;

  min-height:
    52px;

  box-sizing:
    border-box;

  margin:
    5px
    0
    1px;

  padding:
    9px
    20px
    9px
    11px;

  color:
    #07539e;

  border:
    2px
    solid
    rgba(
      144,
      199,
      247,
      0.72
    );

  border-radius:
    999px;

  background:
    linear-gradient(
      180deg,
      #f5fbff
      0%,
      var(
        --duduq-completion-blue-light
      )
      100%
    );

  box-shadow:
    0
    4px
    12px
    rgba(
      55,
      129,
      199,
      0.09
    ),
    inset
    0
    1px
    0
    #ffffff;

  animation:
    duduqCompletionContentIn
    520ms
    330ms
    ease-out
    both;
}


.duduq-completion-progress-icon {
  width:
    31px;

  height:
    31px;

  flex:
    0
    0
    31px;

  display:
    grid;

  place-items:
    center;

  color:
    #ffffff;

  border-radius:
    50%;

  background:
    linear-gradient(
      180deg,
      #36b96b
      0%,
      #13984b
      100%
    );

  box-shadow:
    0
    3px
    0
    #087438;

  font-size:
    18px;

  font-weight:
    900;

  line-height:
    1;
}


.duduq-completion-progress-text {
  font-family:
    var(
      --duduq-completion-font
    );

  font-size:
    clamp(
      14px,
      1.65vw,
      17px
    );

  font-weight:
    850;

  line-height:
    1.2;

  text-align:
    left;
}


/* =========================================================
   ÁREA DE BOTÕES
   ========================================================= */

.duduq-completion-actions {
  position:
    relative;

  z-index:
    2;

  width:
    100%;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  flex-wrap:
    wrap;

  gap:
    13px;

  margin-top:
    4px;

  animation:
    duduqCompletionContentIn
    520ms
    410ms
    ease-out
    both;
}


/* =========================================================
   BOTÃO BASE
   ========================================================= */

.duduq-completion-button {
  appearance:
    none;

  -webkit-appearance:
    none;

  min-height:
    58px;

  box-sizing:
    border-box;

  padding:
    12px
    27px;

  border-radius:
    18px;

  font-family:
    var(
      --duduq-completion-font
    );

  font-size:
    16px;

  font-weight:
    900;

  line-height:
    1;

  letter-spacing:
    0.015em;

  cursor:
    pointer;

  user-select:
    none;

  -webkit-user-select:
    none;

  touch-action:
    manipulation;

  transition:
    transform
    140ms
    ease,
    box-shadow
    140ms
    ease,
    filter
    140ms
    ease;
}


/* =========================================================
   BOTÃO PRINCIPAL
   ========================================================= */

.duduq-completion-button--primary {
  min-width:
    230px;

  color:
    #ffffff;

  border:
    2px
    solid
    #00458f;

  background:
    linear-gradient(
      180deg,
      #2187e8
      0%,
      #0870d2
      48%,
      #0059b8
      100%
    );

  box-shadow:
    0
    6px
    0
    #003e82,
    0
    12px
    22px
    rgba(
      0,
      75,
      154,
      0.20
    ),
    inset
    0
    2px
    0
    rgba(
      255,
      255,
      255,
      0.28
    );

  text-shadow:
    0
    1px
    1px
    rgba(
      0,
      49,
      102,
      0.30
    );
}


.duduq-completion-button--primary:hover {
  transform:
    translateY(
      -2px
    );

  filter:
    brightness(
      1.035
    );

  box-shadow:
    0
    8px
    0
    #003e82,
    0
    16px
    28px
    rgba(
      0,
      75,
      154,
      0.22
    ),
    inset
    0
    2px
    0
    rgba(
      255,
      255,
      255,
      0.30
    );
}


.duduq-completion-button--primary:active {
  transform:
    translateY(
      4px
    );

  box-shadow:
    0
    2px
    0
    #003e82,
    0
    7px
    14px
    rgba(
      0,
      75,
      154,
      0.16
    );
}


/* =========================================================
   BOTÃO SECUNDÁRIO
   ========================================================= */

.duduq-completion-button--secondary {
  min-width:
    180px;

  color:
    var(
      --duduq-completion-ink
    );

  border:
    2px
    solid
    #bfd0df;

  background:
    #ffffff;

  box-shadow:
    0
    4px
    0
    #acbdce,
    0
    9px
    18px
    rgba(
      36,
      72,
      108,
      0.10
    );
}


.duduq-completion-button--secondary:hover {
  transform:
    translateY(
      -1px
    );

  background:
    #f8fcff;
}


.duduq-completion-button--secondary:active {
  transform:
    translateY(
      3px
    );

  box-shadow:
    0
    1px
    0
    #acbdce;
}


/* foco acessível */

.duduq-completion-button:focus-visible {
  outline:
    4px
    solid
    rgba(
      255,
      195,
      45,
      0.72
    );

  outline-offset:
    5px;
}


/* =========================================================
   RODAPÉ OPCIONAL
   ========================================================= */

.duduq-completion-footer {
  position:
    relative;

  z-index:
    2;

  max-width:
    540px;

  margin:
    2px
    0
    0;

  color:
    #77899b;

  font-size:
    13px;

  font-weight:
    700;

  line-height:
    1.35;
}


/* =========================================================
   CONFETE
   ========================================================= */

.duduq-completion-confetti {
  position:
    absolute;

  z-index:
    2;

  inset:
    0;

  overflow:
    hidden;

  pointer-events:
    none;
}


.duduq-completion-star {
  position:
    absolute;

  top:
    -8vh;

  left:
    var(
      --duduq-star-x,
      50%
    );

  display:
    block;

  color:
    var(
      --duduq-completion-gold
    );

  font-size:
    var(
      --duduq-star-size,
      18px
    );

  line-height:
    1;

  opacity:
    0;

  filter:
    drop-shadow(
      0
      3px
      3px
      rgba(
        75,
        67,
        21,
        0.14
      )
    );

  animation-name:
    duduqCompletionStarFall;

  animation-duration:
    var(
      --duduq-star-duration,
      2100ms
    );

  animation-delay:
    var(
      --duduq-star-delay,
      0ms
    );

  animation-timing-function:
    cubic-bezier(
      0.22,
      0.61,
      0.36,
      1
    );

  animation-fill-mode:
    both;
}


.duduq-completion-star[data-variant="2"] {
  color:
    #39a5f6;
}


.duduq-completion-star[data-variant="3"] {
  color:
    #ffd95e;
}


/* =========================================================
   ANIMAÇÕES
   ========================================================= */

@keyframes duduqCompletionScreenIn {

  from {
    opacity:
      0;
  }

  to {
    opacity:
      1;
  }
}


@keyframes duduqCompletionCardIn {

  0% {
    opacity:
      0;

    transform:
      translateY(
        28px
      )
      scale(
        0.965
      );
  }

  62% {
    opacity:
      1;

    transform:
      translateY(
        -4px
      )
      scale(
        1.006
      );
  }

  100% {
    opacity:
      1;

    transform:
      translateY(
        0
      )
      scale(
        1
      );
  }
}


@keyframes duduqCompletionMascotIn {

  0% {
    opacity:
      0;

    transform:
      translateY(
        18px
      )
      scale(
        0.68
      )
      rotate(
        -5deg
      );
  }

  55% {
    opacity:
      1;

    transform:
      translateY(
        -5px
      )
      scale(
        1.07
      )
      rotate(
        2deg
      );
  }

  78% {
    transform:
      translateY(
        1px
      )
      scale(
        0.985
      )
      rotate(
        -1deg
      );
  }

  100% {
    opacity:
      1;

    transform:
      translateY(
        0
      )
      scale(
        1
      )
      rotate(
        0deg
      );
  }
}


@keyframes duduqCompletionAchievementIn {

  0% {
    opacity:
      0;

    transform:
      scale(
        0.35
      )
      rotate(
        -30deg
      );
  }

  75% {
    opacity:
      1;

    transform:
      scale(
        1.10
      )
      rotate(
        4deg
      );
  }

  100% {
    opacity:
      1;

    transform:
      scale(
        1
      )
      rotate(
        0deg
      );
  }
}


@keyframes duduqCompletionContentIn {

  from {
    opacity:
      0;

    transform:
      translateY(
        10px
      );
  }

  to {
    opacity:
      1;

    transform:
      translateY(
        0
      );
  }
}


@keyframes duduqCompletionHalo {

  from {
    opacity:
      0.60;

    transform:
      scale(
        1.03
      );
  }

  to {
    opacity:
      1;

    transform:
      scale(
        1.20
      );
  }
}


@keyframes duduqCompletionStarFall {

  0% {
    opacity:
      0;

    transform:
      translate3d(
        0,
        -5vh,
        0
      )
      rotate(
        0deg
      )
      scale(
        0.65
      );
  }

  12% {
    opacity:
      1;
  }

  72% {
    opacity:
      0.95;
  }

  100% {
    opacity:
      0;

    transform:
      translate3d(
        var(
          --duduq-star-drift,
          0px
        ),
        108vh,
        0
      )
      rotate(
        calc(
          var(
            --duduq-star-rotation,
            180deg
          )
          + 360deg
        )
      )
      scale(
        1.04
      );
  }
}


/* =========================================================
   RESPONSIVIDADE — TABLET
   ========================================================= */

@media (
  max-width:
  820px
) {

  .duduq-completion {
    padding:
      20px;
  }

  .duduq-completion-card {
    width:
      min(
        660px,
        95vw
      );

    gap:
      14px;

    padding:
      28px
      28px
      32px;
  }

  .duduq-completion-hero {
    width:
      165px;

    height:
      165px;
  }

  .duduq-completion-title {
    font-size:
      clamp(
        34px,
        7vw,
        48px
      );
  }
}


/* =========================================================
   RESPONSIVIDADE — CELULAR
   ========================================================= */

@media (
  max-width:
  560px
) {

  .duduq-completion {
    min-height:
      100svh;

    padding:
      15px;
  }

  .duduq-completion-card {
    width:
      100%;

    gap:
      12px;

    padding:
      24px
      18px
      28px;

    border-radius:
      27px;
  }

  .duduq-completion-hero {
    width:
      142px;

    height:
      142px;

    margin-bottom:
      -10px;
  }

  .duduq-completion-achievement {
    width:
      44px;

    height:
      44px;

    margin-top:
      -23px;

    border-width:
      3px;
  }

  .duduq-completion-achievement-star {
    font-size:
      21px;
  }

  .duduq-completion-title {
    font-size:
      clamp(
        31px,
        10vw,
        41px
      );
  }

  .duduq-completion-message {
    font-size:
      17px;
  }

  .duduq-completion-progress {
    min-height:
      48px;

    padding:
      8px
      15px
      8px
      9px;
  }

  .duduq-completion-progress-icon {
    width:
      29px;

    height:
      29px;

    flex-basis:
      29px;
  }

  .duduq-completion-progress-text {
    font-size:
      14px;
  }

  .duduq-completion-actions {
    flex-direction:
      column;

    width:
      100%;

    gap:
      11px;
  }

  .duduq-completion-button {
    width:
      min(
        100%,
        300px
      );

    min-height:
      56px;
  }
}


/* =========================================================
   TELAS BAIXAS
   Evita que o card fique cortado em notebooks menores.
   ========================================================= */

@media (
  max-height:
  720px
)
and
(
  min-width:
  561px
) {

  .duduq-completion {
    align-items:
      center;

    padding:
      15px
      24px;
  }

  .duduq-completion-card {
    gap:
      10px;

    padding-top:
      20px;

    padding-bottom:
      24px;
  }

  .duduq-completion-hero {
    width:
      132px;

    height:
      132px;

    margin-bottom:
      -11px;
  }

  .duduq-completion-achievement {
    width:
      42px;

    height:
      42px;

    margin-top:
      -21px;
  }

  .duduq-completion-achievement-star {
    font-size:
      20px;
  }

  .duduq-completion-title {
    font-size:
      40px;
  }

  .duduq-completion-message {
    font-size:
      17px;
  }

  .duduq-completion-progress {
    min-height:
      46px;

    margin-top:
      2px;
  }

  .duduq-completion-button {
    min-height:
      53px;
  }
}


/* =========================================================
   ACESSIBILIDADE — MOVIMENTO REDUZIDO
   ========================================================= */

@media (
  prefers-reduced-motion:
  reduce
) {

  .duduq-completion,
  .duduq-completion-card,
  .duduq-completion-mascot,
  .duduq-completion-achievement,
  .duduq-completion-title,
  .duduq-completion-message,
  .duduq-completion-progress,
  .duduq-completion-actions,
  .duduq-completion-hero::before {
    animation:
      none
      !important;

    transition:
      none
      !important;
  }

  .duduq-completion-confetti {
    display:
      none
      !important;
  }
}
