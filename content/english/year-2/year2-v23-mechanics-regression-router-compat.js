/* DUDUQ English Year 2 — mechanics regression post-hotfix Router compatibility
   Keeps smart Bubble visuals in metadata.imageAssetKey (supported by Router),
   removes duplicate option image URLs, and restores the canonical Word Slash
   1.0.17 spawn physics after the Year 2 presentation hotfix.
*/
(function () {
  "use strict";

  const factory = window.DuduQYear2V23Factory;
  if (!factory || typeof factory.buildModule !== "function") {
    throw new Error("[DuduQ Year2 Mechanics Router Compat] Factory v2.3 indisponível.");
  }
  if (factory.__mechanicsRegressionRouterCompatApplied) return;

  const VERSION = "1.0.1-mechanics-regression-rc2";
  const originalBuild = factory.buildModule.bind(factory);

  function questions(module) {
    return (module?.activities || []).flatMap((activity) => activity?.questions || []);
  }

  function disableMainImage(question) {
    question.image = { ...(question.image || {}), enabled: false, src: null, alt: "" };
    question.media = question.media || {};
    question.media.image = { ...(question.media.image || {}), enabled: false, src: null, alt: "" };
    if (question?.stimulus?.image) {
      question.stimulus.image = { ...question.stimulus.image, enabled: false, src: null, alt: "" };
    }
  }

  function normalizeBubble(question) {
    if (question?.delivery?.mechanic !== "bubble-pop") return false;

    disableMainImage(question);
    for (const alternative of question.alternatives || []) {
      if (!alternative || typeof alternative !== "object") continue;
      // Bubble Pop Router accepts metadata.imageAssetKey, not option image URLs.
      // Preserve the smart official-bank key and remove only its duplicate URL alias.
      alternative.image = {
        ...(alternative.image || {}),
        enabled: false,
        src: null,
        alt: alternative?.image?.alt || ""
      };
      if (alternative?.audio) {
        alternative.audio = {
          ...alternative.audio,
          enabled: false,
          src: null,
          text: ""
        };
      }
    }
    question.delivery = { ...(question.delivery || {}), allowImage: true, allowAudio: true };
    question.metadata = question.metadata || {};
    question.metadata.mechanicsRegressionRouterCompatibility = {
      version: VERSION,
      mechanic: "bubble-pop",
      questionImageDisabled: true,
      optionImageUrlDisabled: true,
      optionImageAssetKeyPreserved: true,
      optionAudioDisabled: true,
      sourceAnswerPreserved: true,
      contentChanged: false
    };
    return true;
  }

  /*
   * The RC1 Year 2 hotfix tried to make Word Slash objects visible immediately
   * by changing the approved 1.0.17 launch trajectory and shortening its first
   * spawn delay inside the fetched runtime HTML. Browser diagnostics proved that
   * the payload is valid (C/A/B/D text cards) and srcdoc is mounted, but execution
   * locks as the patched runtime starts. Word Slash 1.0.17 was homologated with
   * its original below-the-arena launch physics, so this compatibility guard
   * reverses only those two Year 2 runtime substitutions. The immutable release
   * and Canary manifest remain untouched.
   */
  function installCanonicalWordSlashRuntimeGuard() {
    if (window.__DUDUQ_YEAR2_WORD_SLASH_CANONICAL_PHYSICS_GUARD__) return;
    if (typeof window.fetch !== "function" || typeof window.Response !== "function") return;

    const upstreamFetch = window.fetch.bind(window);
    window.fetch = function year2CanonicalWordSlashFetch(input, init) {
      return upstreamFetch(input, init).then(async (response) => {
        const url = typeof input === "string" ? input : (input?.url || response.url || "");
        if (!/\/DUDUQ_WORD_SLASH\.html(?:\?|$)/i.test(String(url))) return response;

        let html = await response.text();
        html = html.replace(
          "const startY = Math.max(8, arenaHeight - metrics.height - 10);",
          "const startY = arenaHeight + metrics.height + 12;"
        );
        html = html.replace(
          'const initialIds = presentation.initialObjectIds || []; if (initialIds.length) initialIds.forEach((id, index) => timers.push(schedule(() => spawnObject(id), 90 + index * 220))); else timers.push(schedule(() => spawnObject(), 90));',
          '(presentation.initialObjectIds || []).forEach((id, index) => timers.push(schedule(() => spawnObject(id), 180 + index * 300)));'
        );

        return new Response(html, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      });
    };

    window.__DUDUQ_YEAR2_WORD_SLASH_CANONICAL_PHYSICS_GUARD__ = VERSION;
  }

  function postProcess(module) {
    let bubbleItems = 0;
    for (const question of questions(module)) {
      if (normalizeBubble(question)) bubbleItems += 1;
    }
    installCanonicalWordSlashRuntimeGuard();

    const audit = Object.freeze({
      version: VERSION,
      patchedBubbleItems: bubbleItems,
      optionImageAssetKeyPreserved: true,
      canonicalWordSlashPhysicsRestored: true,
      wordSlashReleaseModified: false,
      canaryModified: false,
      contentChanged: false,
      sourceAnswersPreserved: true
    });
    return Object.freeze({
      ...module,
      mechanicsRegressionRouterCompatibilityAudit: audit,
      audit: { ...(module.audit || {}), mechanicsRegressionRouterCompatibility: audit }
    });
  }

  window.DuduQYear2V23Factory = Object.freeze({
    ...factory,
    buildModule(config) {
      return postProcess(originalBuild(config));
    },
    __mechanicsRegressionRouterCompatApplied: true,
    mechanicsRegressionRouterCompatVersion: VERSION
  });
})();
