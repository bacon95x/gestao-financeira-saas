(function () {
  function baseUrl() {
    return (window.GFP_SUPABASE_URL || "").replace(/\/$/, "");
  }

  function authHeaders() {
    var key = window.GFP_SUPABASE_ANON_KEY || "";
    var session = window.gfpSupabase && window.gfpSupabase.auth
      ? window.gfpSupabase.auth.getSession()
      : null;
    return session.then(function (res) {
      var token = res && res.data && res.data.session ? res.data.session.access_token : "";
      return {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
        apikey: key,
      };
    });
  }

  function setStatus(text, tone) {
    var el = document.getElementById("gfp-wa-status");
    if (!el) return;
    el.textContent = text;
    el.classList.remove("text-emerald-300", "text-amber-300", "text-zinc-400");
    if (tone === "ok") el.classList.add("text-emerald-300");
    else if (tone === "warn") el.classList.add("text-amber-300");
    else el.classList.add("text-zinc-400");
  }

  function setCodeBox(code, expiresAt) {
    var box = document.getElementById("gfp-wa-code-box");
    var val = document.getElementById("gfp-wa-code-val");
    var exp = document.getElementById("gfp-wa-code-exp");
    if (!box || !val) return;
    if (!code) {
      box.classList.add("hidden");
      return;
    }
    box.classList.remove("hidden");
    val.textContent = "VINCULAR " + code;
    if (exp && expiresAt) {
      try {
        var d = new Date(expiresAt);
        exp.textContent = "Válido até " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      } catch (e) {
        exp.textContent = "";
      }
    }
  }

  async function refreshStatus() {
    var base = baseUrl();
    if (!base || !window.gfpSupabase) return;
    try {
      var headers = await authHeaders();
      var res = await fetch(base + "/functions/v1/whatsapp-vincular?action=status", {
        method: "GET",
        headers: headers,
      });
      var data = await res.json();
      if (data.linked) {
        setStatus("WhatsApp vinculado ····" + (data.phone_masked || ""), "ok");
        setCodeBox(null);
      } else {
        setStatus("WhatsApp não vinculado", "warn");
      }
    } catch (e) {
      setStatus("—", "");
    }
  }

  async function gerarCodigo() {
    var base = baseUrl();
    var btn = document.getElementById("btn-wa-gerar-codigo");
    if (!base || !window.gfpSupabase) {
      alert("Faça login no dashboard primeiro.");
      return;
    }
    if (btn) btn.disabled = true;
    setStatus("Gerando código…", "warn");
    try {
      var headers = await authHeaders();
      var res = await fetch(base + "/functions/v1/whatsapp-vincular?action=gerar", {
        method: "POST",
        headers: headers,
      });
      var data = await res.json();
      if (!data.ok) {
        alert(data.error || "Não foi possível gerar o código.");
        setStatus("Erro", "warn");
        return;
      }
      setCodeBox(data.code, data.expires_at);
      setStatus("Envie a mensagem abaixo no WhatsApp do Capital Novo", "ok");
    } catch (e) {
      alert("Erro de rede. Tente de novo.");
      setStatus("Erro", "warn");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function desvincular() {
    if (!confirm("Desvincular este WhatsApp da sua conta Capital Novo?")) return;
    var base = baseUrl();
    try {
      var headers = await authHeaders();
      await fetch(base + "/functions/v1/whatsapp-vincular?action=desvincular", {
        method: "POST",
        headers: headers,
      });
      setCodeBox(null);
      setStatus("WhatsApp não vinculado", "warn");
    } catch (e) {
      alert("Não foi possível desvincular.");
    }
  }

  function initWhatsAppAssistant() {
    var wrap = document.getElementById("gfp-whatsapp-panel");
    if (!wrap) return;
    var mode = (window.GFP_STORAGE_MODE || "local").toLowerCase();
    wrap.classList.toggle("hidden", mode === "local");

    var btnGerar = document.getElementById("btn-wa-gerar-codigo");
    var btnDes = document.getElementById("btn-wa-desvincular");
    if (btnGerar) btnGerar.addEventListener("click", gerarCodigo);
    if (btnDes) btnDes.addEventListener("click", desvincular);

    if (window.gfpWaitForAuth) {
      window.gfpWaitForAuth().then(refreshStatus).catch(function () {});
    }
  }

  window.gfpInitWhatsAppAssistant = initWhatsAppAssistant;
  window.gfpRefreshWhatsAppStatus = refreshStatus;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWhatsAppAssistant);
  } else {
    initWhatsAppAssistant();
  }
})();
