(() => {
  "use strict";
  const STORAGE_KEY = "duduq-tv-entry";
  const FALLBACK_URL = "/play/matching/";
  let navigating = false;
  const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const nextFrame = () => new Promise((resolve) => window.requestAnimationFrame(resolve));
  const isInternalPlayUrl = (value) => String(value || "").trim().startsWith("/play/");
  const resolveNextUrl = (value) => isInternalPlayUrl(value) ? String(value).trim() : FALLBACK_URL;
  function getOverlay() {
    let overlay = document.querySelector(".duduq-tv-transition");
    if (!overlay) { overlay = document.createElement("div"); overlay.className = "duduq-page-transition duduq-tv-transition"; overlay.setAttribute("aria-hidden", "true"); document.body.append(overlay); }
    return overlay;
  }
  async function navigate(nextUrl, options = {}) {
    if (navigating) return false;
    navigating = true;
    const reduced = reducedMotion(), destination = resolveNextUrl(nextUrl), overlay = getOverlay();
    const trigger = options.trigger instanceof Element ? options.trigger : null;
    const exitTarget = options.exitTarget instanceof Element ? options.exitTarget : null;
    trigger?.classList.add("is-portal-pressed");
    await wait(reduced ? 0 : 80);
    exitTarget?.classList.add("duduq-tv-collapse"); overlay.classList.add("is-tv-off");
    await wait(reduced ? 170 : 330);
    try { sessionStorage.setItem(STORAGE_KEY, "1"); sessionStorage.removeItem("duduq-enter-transition"); } catch (_) {}
    window.location.href = destination;
    return true;
  }
  async function playEntryIfNeeded(options = {}) {
    let pending = false;
    try { pending = sessionStorage.getItem(STORAGE_KEY) === "1"; sessionStorage.removeItem(STORAGE_KEY); } catch (_) {}
    if (!pending) return false;
    const overlay = getOverlay();
    const target = options.target instanceof Element ? options.target : document.querySelector(options.target || "#game");
    overlay.classList.add("is-tv-entry-line"); target?.classList.add("duduq-tv-entry-target");
    await nextFrame(); overlay.classList.add("is-tv-entry-open"); target?.classList.add("is-tv-opening");
    await wait(reducedMotion() ? 170 : 360);
    overlay.remove(); target?.classList.remove("duduq-tv-entry-target", "is-tv-opening");
    return true;
  }
  window.DuduQPageTransition = Object.freeze({ navigate, playEntryIfNeeded, resolveNextUrl, mode: "TV_SWITCH" });
  if (document.querySelector("#game")) playEntryIfNeeded();
})();
