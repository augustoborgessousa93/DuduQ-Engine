/* =========================================================
   DUDUQ CHANNEL LOADER v1.0.0
   Stable/Canary + releases imutáveis + hotfix central
   ========================================================= */

(function () {
  "use strict";

  const VERSION = "1.0.0";

  if (window.DuduQChannelLoader?.version === VERSION) {
    return;
  }

  const config =
    window.DUDUQ_GAME_CONFIG || {};

  const engineBase =
    String(
      config.engineBase ||
      window.DUDUQ_ENGINE_BASE ||
      new URL("./", window.location.href).origin
    ).replace(/\/$/, "");

  window.DUDUQ_ENGINE_BASE =
    engineBase;

  function absolute(path) {
    const value =
      String(path || "").trim();

    if (!value) return "";

    if (/^https?:\/\//i.test(value)) {
      return value;
    }

    return new URL(
      value,
      engineBase + "/"
    ).href;
  }

  function setError(message, error) {
    console.error(
      "[DuduQ Channel Loader]",
      message,
      error || ""
    );

    const root =
      document.getElementById("root");

    if (root) {
      root.textContent =
        "Erro ao carregar o DuduQ: " + message;
    }
  }

  function loadStyle(item) {
    return new Promise(
      function (resolve, reject) {
        const id =
          item.id || "";

        if (
          id &&
          document.getElementById(id)
        ) {
          resolve(true);
          return;
        }

        const link =
          document.createElement("link");

        if (id) link.id = id;

        link.rel = "stylesheet";
        link.href = absolute(item.href);
        link.dataset.duduqRelease =
          String(item.release || "");

        link.onload =
          function () {
            resolve(true);
          };

        link.onerror =
          function () {
            reject(
              new Error(
                "Falha no CSS " + item.href
              )
            );
          };

        document.head.appendChild(link);
      }
    );
  }

  function loadScript(item) {
    return new Promise(
      function (resolve, reject) {
        const id =
          item.id || "";

        if (
          id &&
          document.getElementById(id)
        ) {
          resolve(true);
          return;
        }

        const script =
          document.createElement("script");

        if (id) script.id = id;

        script.src = absolute(item.src);
        script.async = false;
        script.dataset.duduqRelease =
          String(item.release || "");

        script.onload =
          function () {
            resolve(true);
          };

        script.onerror =
          function () {
            reject(
              new Error(
                "Falha no script " + item.src
              )
            );
          };

        document.head.appendChild(script);
      }
    );
  }

  async function fetchManifest() {
    const channel =
      String(
        config.channel ||
        "stable-v1"
      ).trim();

    const url =
      engineBase +
      "/engine/channels/" +
      encodeURIComponent(channel) +
      ".json?t=" +
      Date.now();

    const response =
      await fetch(
        url,
        {
          cache: "no-store",
          credentials: "same-origin"
        }
      );

    if (!response.ok) {
      throw new Error(
        "Canal " +
        channel +
        ": HTTP " +
        response.status
      );
    }

    const manifest =
      await response.json();

    if (
      Number(manifest.contractMajor) !== 1
    ) {
      throw new Error(
        "Contrato incompatível: " +
        manifest.contractMajor
      );
    }

    return manifest;
  }

  async function start() {
    try {
      const manifest =
        await fetchManifest();

      window.DUDUQ_ENGINE_MANIFEST =
        Object.freeze(manifest);

      const styles =
        Array.isArray(manifest.core?.styles)
          ? manifest.core.styles
          : [];

      await Promise.all(
        styles.map(loadStyle)
      );

      const preMechanic =
        Array.isArray(
          manifest.core?.preMechanicScripts
        )
          ? manifest.core.preMechanicScripts
          : [];

      for (
        const item of preMechanic
      ) {
        await loadScript(item);
      }

      const requested =
        Array.isArray(
          config.requiredMechanics
        ) &&
        config.requiredMechanics.length
          ? config.requiredMechanics
          : Object.keys(
              manifest.mechanics || {}
            );

      for (
        const mechanicId of requested
      ) {
        const mechanic =
          manifest.mechanics?.[mechanicId];

        if (!mechanic?.adapter) {
          throw new Error(
            "Mecânica não publicada no canal: " +
            mechanicId
          );
        }

        await loadScript({
          id:
            "duduq-mechanic-" +
            mechanicId,
          src:
            mechanic.adapter,
          release:
            mechanic.release
        });
      }

      if (manifest.core?.router) {
        await loadScript(
          manifest.core.router
        );
      }

      const contentScript =
        String(
          config.contentScript || ""
        ).trim();

      if (!contentScript) {
        throw new Error(
          "contentScript não informado."
        );
      }

      await loadScript({
        id: "duduq-game-content",
        src: new URL(
          contentScript,
          window.location.href
        ).href,
        release:
          config.contentVersion || ""
      });

      window.DUDUQ_ENGINE_READY = true;

      window.dispatchEvent(
        new CustomEvent(
          "duduq:engine-ready",
          {
            detail: {
              channel:
                manifest.channel,
              revision:
                manifest.revision,
              manifest
            }
          }
        )
      );
    } catch (error) {
      setError(
        error?.message ||
        "falha desconhecida",
        error
      );
    }
  }

  window.DuduQChannelLoader =
    Object.freeze({
      version: VERSION,
      start
    });

  start();
})();
