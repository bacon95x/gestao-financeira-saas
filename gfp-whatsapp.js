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

  function setWaBadge(linked) {
    var badge = document.getElementById("gfp-wa-badge");
    if (!badge) return;
    badge.classList.toggle("hidden", !!linked);
  }

  function setPanelOpen(open) {
    var panel = document.getElementById("gfp-whatsapp-panel");
    var toggle = document.getElementById("btn-wa-toggle");
    if (!panel || !toggle) return;
    panel.classList.toggle("hidden", !open);
    panel.classList.toggle("flex", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function togglePanel() {
    var panel = document.getElementById("gfp-whatsapp-panel");
    if (!panel) return;
    setPanelOpen(panel.classList.contains("hidden"));
  }

  function whatsappDisplay() {
    return window.GFP_WHATSAPP_DISPLAY || "+55 11 97773-2973";
  }

  function whatsappE164() {
    return String(window.GFP_WHATSAPP_E164 || "5511977732973").replace(/\D/g, "");
  }

  function whatsappUrl(prefill) {
    var url = "https://wa.me/" + whatsappE164();
    if (prefill) url += "?text=" + encodeURIComponent(prefill);
    return url;
  }

  function initWhatsAppPhoneLinks() {
    var display = whatsappDisplay();
    var link = document.getElementById("gfp-wa-phone-link");
    if (link) {
      link.textContent = display;
      link.href = whatsappUrl();
    }
  }

  function setCodeBox(code, expiresAt) {
    var box = document.getElementById("gfp-wa-code-box");
    var val = document.getElementById("gfp-wa-code-val");
    var exp = document.getElementById("gfp-wa-code-exp");
    var openChat = document.getElementById("gfp-wa-open-chat");
    if (!box || !val) return;
    if (!code) {
      box.classList.add("hidden");
      return;
    }
    box.classList.remove("hidden");
    var msg = "VINCULAR " + code;
    val.textContent = msg;
    if (openChat) openChat.href = whatsappUrl(msg);
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
        setStatus("Vinculado ····" + (data.phone_masked || ""), "ok");
        setCodeBox(null);
        setWaBadge(true);
      } else {
        setStatus("Não vinculado — use o número abaixo", "warn");
        setWaBadge(false);
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
    setPanelOpen(true);
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
      setStatus("Envie a mensagem abaixo para " + whatsappDisplay(), "ok");
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
      setWaBadge(false);
    } catch (e) {
      alert("Não foi possível desvincular.");
    }
  }

  function initWhatsAppAssistant() {
    if (window.__gfpWaInited) return;
    window.__gfpWaInited = true;

    var wrap = document.getElementById("gfp-whatsapp-wrap");
    if (!wrap) return;
    var mode = (window.GFP_STORAGE_MODE || "local").toLowerCase();
    wrap.classList.toggle("hidden", mode === "local");

    var btnToggle = document.getElementById("btn-wa-toggle");
    var btnGerar = document.getElementById("btn-wa-gerar-codigo");
    var btnDes = document.getElementById("btn-wa-desvincular");
    if (btnToggle) {
      btnToggle.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        togglePanel();
      });
    }
    document.addEventListener("click", function (e) {
      var panel = document.getElementById("gfp-whatsapp-panel");
      if (!wrap || !panel || panel.classList.contains("hidden")) return;
      if (!wrap.contains(e.target)) setPanelOpen(false);
    });
    if (btnGerar) btnGerar.addEventListener("click", gerarCodigo);
    if (btnDes) btnDes.addEventListener("click", desvincular);
    initWhatsAppPhoneLinks();
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }

    if (window.gfpWaitForAuth) {
      window.gfpWaitForAuth().then(refreshStatus).catch(function () {});
    }
  }

  window.gfpInitWhatsAppAssistant = initWhatsAppAssistant;
  window.gfpRefreshWhatsAppStatus = refreshStatus;
})();
