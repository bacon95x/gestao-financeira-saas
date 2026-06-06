(function () {
  var SYNC_INTERVAL_MS = 45000;
  var STORAGE_SYNCED_AT = "gfp_cloud_synced_at";
  var lastCloudHash = "";
  var autoTimer = null;

  function gfpCloudMode() {
    var m = (window.GFP_STORAGE_MODE || "local").toLowerCase();
    return m === "cloud" || m === "both" ? m : "local";
  }

  function gfpIsMetaKey(k) {
    return k === STORAGE_SYNCED_AT;
  }

  function gfpIsPreferenceKey(k) {
    return (
      k.indexOf("theme") !== -1 ||
      k.indexOf("appearance") !== -1 ||
      k.indexOf("iluminacao") !== -1
    );
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

  function gfpSnapshotForCloud() {
    var snap = gfpSnapshotFromLocalStorage();
    Object.keys(snap).forEach(function (k) {
      if (gfpIsMetaKey(k)) delete snap[k];
    });
    return snap;
  }

  function gfpFinancialKeyCount(snap) {
    return Object.keys(snap).filter(function (k) {
      return k.startsWith("gfp_") && !gfpIsMetaKey(k) && !gfpIsPreferenceKey(k);
    }).length;
  }

  function gfpClearLocalStorageGfp() {
    var keys = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.startsWith("gfp_") && !gfpIsMetaKey(k)) keys.push(k);
      }
      keys.forEach(function (k) {
        localStorage.removeItem(k);
      });
    } catch (e) {}
  }

  function gfpApplySnapshotToLocalStorage(bag, cloudUpdatedAt) {
    if (!bag || typeof bag !== "object") return;
    var keys = Object.keys(bag).filter(function (k) {
      return k.startsWith("gfp_") && !gfpIsMetaKey(k);
    });
    if (!keys.length) return;
    gfpClearLocalStorageGfp();
    keys.forEach(function (k) {
      var v = bag[k];
      try {
        localStorage.setItem(k, v == null ? "" : String(v));
      } catch (e) {}
    });
    if (cloudUpdatedAt) {
      try {
        localStorage.setItem(STORAGE_SYNCED_AT, String(cloudUpdatedAt));
      } catch (e) {}
    }
  }

  function gfpHashSnapshot(snap) {
    try {
      return JSON.stringify(snap);
    } catch (e) {
      return "";
    }
  }

  function gfpSetCloudStatus(text, tone) {
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

  function gfpShouldLoadCloudOverLocal(mode, localSnap, cloudUpdatedAt) {
    if (mode === "cloud") return true;
    if (gfpFinancialKeyCount(localSnap) === 0) return true;
    if (!cloudUpdatedAt) return false;

    var localSyncedAt = localSnap[STORAGE_SYNCED_AT] || null;
    if (!localSyncedAt) return true;

    try {
      return new Date(cloudUpdatedAt).getTime() > new Date(localSyncedAt).getTime();
    } catch (e) {
      return false;
    }
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
      lastCloudHash = gfpHashSnapshot(gfpSnapshotForCloud());
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
    var cloudUpdatedAt = res.data.updated_at;

    if (!gfpShouldLoadCloudOverLocal(mode, local, cloudUpdatedAt)) {
      gfpSetCloudStatus("Navegador mais recente — salvando na nuvem…", "warn");
      lastCloudHash = gfpHashSnapshot(gfpSnapshotForCloud());
      gfpCloudSaveNow().catch(function (e) {
        console.warn("Sync local → nuvem:", e);
      });
      return false;
    }

    gfpApplySnapshotToLocalStorage(bag, cloudUpdatedAt);
    lastCloudHash = gfpHashSnapshot(gfpSnapshotForCloud());
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

    var now = new Date().toISOString();
    var snap = gfpSnapshotForCloud();
    var payload = {
      version: 1,
      exportedAt: now,
      data: snap,
    };

    gfpSetCloudStatus("Salvando na nuvem…", "warn");

    var res = await sb.from("gfp_dados").upsert(
      {
        user_id: uid,
        payload: payload,
        updated_at: now,
      },
      { onConflict: "user_id" }
    );

    if (res.error) {
      gfpSetCloudStatus("Erro ao salvar na nuvem", "err");
      console.error("gfp cloud save:", res.error);
      return { ok: false, reason: res.error.message || "Erro ao salvar." };
    }

    try {
      localStorage.setItem(STORAGE_SYNCED_AT, now);
    } catch (e) {}

    lastCloudHash = gfpHashSnapshot(snap);
    gfpSetCloudStatus("Nuvem sincronizada", "ok");
    return { ok: true };
  }

  function gfpStartAutoCloudSave() {
    if (gfpCloudMode() === "local") return;
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = setInterval(function () {
      var snap = gfpSnapshotForCloud();
      var h = gfpHashSnapshot(snap);
      if (!h || h === lastCloudHash) return;
      gfpCloudSaveNow().catch(function (e) {
        console.warn("Auto cloud save:", e);
      });
    }, SYNC_INTERVAL_MS);
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
