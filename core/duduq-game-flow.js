/* Shared delivery flow. Mechanics report completion; this registry owns destinations. */
(function (global) {
  "use strict";

  const mechanics = Object.freeze({
    matching: "target-shooter",
    "target-shooter": "matching"
  });
  const destinations = Object.freeze({
    "target-shooter": "/play/target-shooter/",
    matching: "/play/matching/"
  });
  // Keep the approved mechanic feedback perceptible before the document transition.
  const timing = Object.freeze({ feedbackHoldMs: 900 });
  let state = "IDLE";
  let pending = null;

  const wait = (milliseconds) => new Promise((resolve) => global.setTimeout(resolve, milliseconds));
  const setState = (next) => {
    state = next;
    document.documentElement.dataset.duduqFlowState = next;
  };

  function resolveDestination(mechanic) {
    return destinations[mechanic] || null;
  }

  async function complete({ mechanic, result, context } = {}) {
    if (state !== "IDLE") return false;
    const next = mechanics[mechanic];
    if (!next || !resolveDestination(next)) return false;

    pending = { mechanic, next, result: result || null, context: context || null };
    setState("SUCCESS_PENDING");
    await wait(timing.feedbackHoldMs);
    if (state !== "SUCCESS_PENDING") return false;

    setState("TRANSITIONING");
    global.DuduqSound?.play("transition");
    // A real document boundary disposes the completed mechanic and all of its listeners.
    global.location.assign(`/play/transition/?next=${encodeURIComponent(next)}`);
    return true;
  }

  global.DuduQGameFlow = Object.freeze({
    complete,
    resolveDestination,
    getState: () => state,
    getPending: () => pending,
    registry: mechanics,
    timing
  });
})(window);
