(function () {
  var SYNC_INTERVAL_MS = 45000;
  var lastCloudHash = "";
  var autoTimer = null;
  var cloudStatus = "idle";

  function gfpCloudMode() {
    var m = (window.GFP_STORAGE_MODE || "local").toLowerCase();
    return m === "cloud" || m === "both" ? m : "local";
  }

  function gfpSnapshotFromLocalStorage() {
    var out = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.startsWith("gfp_")) out[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    return out;
  }

  function gfpClearLocalStorageGfp() {
    var keys = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.startsWith("gfp_")) keys.push(k);
      }
      keys.forEach(function (k) {
        localStorage.removeItem(k);
      });
    } catch (e) {}
  }

  function gfpApplySnapshotToLocalStorage(bag) {
    if (!bag || typeof bag !== "object") return;
    var keys = Object.keys(bag).filter(function (k) {
      return k.startsWith("gfp_");
    });
    if (!keys.length) return;
    gfpClearLocalStorageGfp();
    keys.forEach(function (k) {
      var v = bag[k];
      try {
        localStorage.setItem(k, v == null ? "" : String(v));
      } catch (e) {}
    });
  }

  function gfpHashSnapshot(snap) {
    try {
      return JSON.stringify(snap);
    } catch (e) {
      return "";
    }
  }

  function gfpSetCloudStatus(text, tone) {
    cloudStatus = text;
    var el = document.getElementById("gfp-cloud-status");
    if (!el) return;
    el.textContent = text;
    el.classList.remove("text-emerald-300", "text-amber-300", "text-red-300", "text-zinc-400");
    if (tone === "ok") el.classList.add("text-emerald-300");
    else if (tone === "warn") el.classList.add("text-amber-300");
    else if (tone === "err") el.classList.add("text-red-300");
    else el.classList.add("text-zinc-400");
  }

  function gfpWaitForAuth(maxMs) {
    maxMs = maxMs || 15000;
    return new Promise(function (resolve, reject) {
      var start = Date.now();
      function tick() {
        if (
          window.gfpSupabase &&
          window.gfpUser &&
          document.documentElement.classList.contains("gfp-auth-ready")
        ) {
          resolve();
          return;
        }
        if (Date.now() - start > maxMs) {
          reject(new Error("Autenticação não disponível."));
          return;
        }
        setTimeout(tick, 50);
      }
      tick();
    });
  }

  async function gfpCloudLoadIfEnabled() {
    var mode = gfpCloudMode();
    if (mode === "local") return false;

    var sb = window.gfpSupabase;
    var uid = window.gfpUser && window.gfpUser.id;
    if (!sb || !uid) return false;

    gfpSetCloudStatus("Carregando nuvem…", "warn");

    var res = await sb
      .from("gfp_dados")
      .select("payload, updated_at")
      .eq("user_id", uid)
      .maybeSingle();

    if (res.error) {
      gfpSetCloudStatus("Erro ao carregar nuvem", "err");
      console.error("gfp cloud load:", res.error);
      return false;
    }

    if (!res.data || !res.data.payload) {
      gfpSetCloudStatus("Nuvem vazia (primeiro acesso)", "warn");
      return false;
    }

    var payload = res.data.payload;
    var bag =
      payload && typeof payload === "object" && payload.data && typeof payload.data === "object"
        ? payload.data
        : payload;

    if (!bag || typeof bag !== "object") {
      gfpSetCloudStatus("Dados na nuvem inválidos", "err");
      return false;
    }

    var local = gfpSnapshotFromLocalStorage();
    var localKeys = Object.keys(local).filter(function (k) {
      return (
        k.indexOf("theme") === -1 &&
        k.indexOf("appearance") === -1 &&
        k.indexOf("iluminacao") === -1
      );
    });

    var shouldApply = mode === "cloud" || localKeys.length === 0;
    if (!shouldApply) {
      gfpSetCloudStatus("Local + nuvem (local mantido)", "ok");
      lastCloudHash = gfpHashSnapshot(local);
      return false;
    }

    gfpApplySnapshotToLocalStorage(bag);
    lastCloudHash = gfpHashSnapshot(bag);
    gfpSetCloudStatus("Carregado da nuvem", "ok");
    return true;
  }

  async function gfpCloudSaveNow() {
    var mode = gfpCloudMode();
    if (mode === "local") {
      return { ok: false, reason: "Modo local — nuvem desligada no config.js" };
    }

    var sb = window.gfpSupabase;
    var uid = window.gfpUser && window.gfpUser.id;
    if (!sb || !uid) {
      return { ok: false, reason: "Sessão não encontrada." };
    }

    var snap = gfpSnapshotFromLocalStorage();
    var payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: snap,
    };

    gfpSetCloudStatus("Salvando na nuvem…", "warn");

    var res = await sb.from("gfp_dados").upsert(
      {
        user_id: uid,
        payload: payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (res.error) {
      gfpSetCloudStatus("Erro ao salvar na nuvem", "err");
      console.error("gfp cloud save:", res.error);
      return { ok: false, reason: res.error.message || "Erro ao salvar." };
    }

    lastCloudHash = gfpHashSnapshot(snap);
    gfpSetCloudStatus("Nuvem sincronizada", "ok");
    return { ok: true };
  }

  function gfpStartAutoCloudSave() {
    if (gfpCloudMode() === "local") return;
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = setInterval(function () {
      var snap = gfpSnapshotFromLocalStorage();
      var h = gfpHashSnapshot(snap);
      if (!h || h === lastCloudHash) return;
      gfpCloudSaveNow().catch(function (e) {
        console.warn("Auto cloud save:", e);
      });
    }, SYNC_INTERVAL_MS);
    window.addEventListener("beforeunload", function () {
      var snap = gfpSnapshotFromLocalStorage();
      var h = gfpHashSnapshot(snap);
      if (h && h !== lastCloudHash && navigator.sendBeacon && window.gfpSupabase) {
        /* sendBeacon não suporta Supabase auth facilmente — save síncrono leve */
      }
    });
  }

  function gfpInitCloudControls() {
    var mode = gfpCloudMode();
    var wrap = document.getElementById("gfp-cloud-controls");
    if (wrap) wrap.classList.toggle("hidden", mode === "local");

    var btn = document.getElementById("btn-cloud-sync");
    if (btn) {
      btn.addEventListener("click", function () {
        btn.disabled = true;
        gfpCloudSaveNow()
          .then(function (r) {
            if (!r.ok) alert(r.reason || "Não foi possível salvar na nuvem.");
          })
          .finally(function () {
            btn.disabled = false;
          });
      });
    }

    if (mode !== "local") {
      gfpStartAutoCloudSave();
      gfpSetCloudStatus("Nuvem ativa (" + mode + ")", "ok");
    }
  }

  window.gfpWaitForAuth = gfpWaitForAuth;
  window.gfpCloudLoadIfEnabled = gfpCloudLoadIfEnabled;
  window.gfpCloudSaveNow = gfpCloudSaveNow;
  window.gfpInitCloudControls = gfpInitCloudControls;
  window.gfpCloudMode = gfpCloudMode;
})();
