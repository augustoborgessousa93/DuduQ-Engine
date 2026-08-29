import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";
const MODULE_URL = `${BASE_URL}/content/english/year-2/module-01/`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readGuardState(page) {
  const deadline = Date.now() + 15000;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const frameHandle = await page.locator("#root iframe").first().elementHandle();
      if (!frameHandle) throw new Error("Iframe da mecânica não foi montado.");

      const frame = await frameHandle.contentFrame();
      if (!frame) throw new Error("Não foi possível acessar o iframe da mecânica.");

      // Marker, stylesheet e efeito visual precisam ser observados de forma atômica
      // no mesmo documento. O iframe pode navegar/recarregar durante o handoff da
      // Intro; separar essas leituras permitia combinar o marker do documento antigo
      // com o DOM do documento novo e gerar um falso negativo.
      const state = await frame.evaluate(() => {
        const markerActive = document.documentElement.getAttribute(
          "data-duduq-year2-internal-completion-guard"
        ) === "active";
        const styleInstalled = Boolean(
          document.getElementById("duduq-year2-internal-completion-guard")
        );

        if (markerActive && !styleInstalled) {
          return {
            invariantBroken: true,
            markerActive,
            styleInstalled,
            frameUrl: location.href
          };
        }

        if (!markerActive || !styleInstalled || !document.body) return null;

        const fake = document.createElement("section");
        fake.className = "duduq-engine-complete";
        fake.innerHTML = "<h2>Parabéns! Lição concluída</h2>";
        document.body.appendChild(fake);

        const computed = getComputedStyle(fake);
        const result = {
          invariantBroken: false,
          markerActive,
          styleInstalled,
          visibility: computed.visibility,
          opacity: computed.opacity,
          pointerEvents: computed.pointerEvents,
          text: fake.textContent.trim(),
          frameUrl: location.href
        };

        fake.remove();
        return result;
      });

      if (state?.invariantBroken) {
        throw new Error(
          `Guard marcou o documento como ativo sem instalar o CSS: ${JSON.stringify(state)}`
        );
      }

      if (state) return state;

      lastError = new Error("Guard ainda não está completo no documento atual.");
      await page.waitForTimeout(120);
    } catch (error) {
      lastError = error;
      const message = String(error?.message || error);
      const navigationRace = /Execution context was destroyed|navigation|detached|Target page, context or browser has been closed/i.test(message);
      if (!navigationRace && !/Guard ainda não está completo/i.test(message)) throw error;
      await page.waitForTimeout(120);
    }
  }

  throw new Error(
    `Guard não ficou estável no iframe final em 15s. Último erro: ${String(lastError?.message || lastError || "desconhecido")}`
  );
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 645 } });

try {
  await page.goto(MODULE_URL, { waitUntil: "domcontentloaded" });

  await page.waitForFunction(() => Boolean(
    window.__DUDUQ_YEAR2_INTERNAL_COMPLETION_GUARD__ &&
    window.DuduQ &&
    window.DuduQIntro
  ), null, { timeout: 30000 });

  const started = await page.evaluate(() => window.DuduQ?.getSession?.()?.module === 1);
  if (!started) {
    const start = page.getByRole("button", { name: /INICIAR MISSÃO/i }).first();
    await start.waitFor({ state: "visible", timeout: 20000 });
    await start.click();
  }

  await page.waitForFunction(() => {
    const session = window.DuduQ?.getSession?.();
    return Boolean(
      session?.module === 1 &&
      session.totalSteps > 0 &&
      !session.transitioning &&
      document.querySelector("#root iframe")
    );
  }, null, { timeout: 30000 });

  const state = await readGuardState(page);

  assert(state.styleInstalled, "Guard CSS não foi instalado no iframe.");
  assert(state.markerActive, "Guard não marcou o iframe final como ativo.");
  assert(
    state.text.includes("Lição concluída"),
    "Sentinela de conclusão interna não foi criada corretamente."
  );
  assert(
    state.visibility === "hidden" && state.opacity === "0",
    `Conclusão interna ainda pode aparecer: ${JSON.stringify(state)}`
  );
  assert(
    state.pointerEvents === "none",
    `Conclusão interna ainda recebe interação: ${state.pointerEvents}`
  );

  const parentState = await page.evaluate(() => ({
    guardVersion: window.__DUDUQ_YEAR2_INTERNAL_COMPLETION_GUARD__?.version || "",
    parentStyleInjected: Boolean(
      document.getElementById("duduq-year2-internal-completion-guard")
    )
  }));

  assert(
    parentState.guardVersion === "1.0.0-year2-host-owned-completion",
    `Versão inesperada do guard: ${parentState.guardVersion}`
  );
  assert(
    parentState.parentStyleInjected === false,
    "O guard não pode ocultar a conclusão oficial do Host no documento principal."
  );

  console.log(JSON.stringify({
    status: "PASS",
    contract: "YEAR2_INTERNAL_COMPLETION_FLASH_GUARD_RC1",
    state,
    parentState
  }, null, 2));
} finally {
  await browser.close();
}
