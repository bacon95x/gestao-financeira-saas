(function () {
  async function gfpAuthGuard() {
    var loading = document.getElementById("gfp-auth-loading");
    function fail(url) {
      window.location.replace(url || "/");
    }
    try {
      if (
        !window.GFP_SUPABASE_URL ||
        !window.GFP_SUPABASE_ANON_KEY ||
        window.GFP_SUPABASE_URL.indexOf("SEU_PROJETO") !== -1 ||
        window.GFP_SUPABASE_ANON_KEY.indexOf("COLE_") !== -1
      ) {
        fail("/?erro=config");
        return;
      }
      if (!window.supabase || !window.supabase.createClient) {
        fail("/?erro=supabase");
        return;
      }
      var sb = window.supabase.createClient(window.GFP_SUPABASE_URL, window.GFP_SUPABASE_ANON_KEY);
      window.gfpSupabase = sb;
      var result = await sb.auth.getSession();
      var session = result && result.data ? result.data.session : null;
      if (!session) {
        fail("/");
        return;
      }
      window.gfpUser = session.user;
      var email = (session.user.email || "").trim().toLowerCase();
      var admins = Array.isArray(window.GFP_ADMIN_EMAILS) ? window.GFP_ADMIN_EMAILS : [];
      var isAdmin = admins.some(function (a) {
        return String(a || "").trim().toLowerCase() === email;
      });
      if (!isAdmin && email) {
        var base = window.GFP_SUPABASE_URL.replace(/\/$/, "");
        var vRes = await fetch(base + "/functions/v1/verificar-assinatura", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + window.GFP_SUPABASE_ANON_KEY,
            apikey: window.GFP_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ email: email }),
        });
        var vData = await vRes.json();
        if (!vData || !vData.active) {
          await sb.auth.signOut();
          fail("/?erro=assinatura");
          return;
        }
      }
      sb.auth.onAuthStateChange(function (event, newSession) {
        if (event === "SIGNED_OUT" || !newSession) {
          window.location.replace("/");
        }
      });
      if (loading) loading.remove();
      document.documentElement.classList.add("gfp-auth-ready");
    } catch (e) {
      console.error("Auth guard:", e);
      fail("/?erro=auth");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", gfpAuthGuard);
  } else {
    gfpAuthGuard();
  }

  window.gfpLogout = async function gfpLogout() {
    try {
      if (typeof window.gfpClearLocalFinancialDataIfCloud === "function") {
        window.gfpClearLocalFinancialDataIfCloud();
      }
      if (window.gfpSupabase) await window.gfpSupabase.auth.signOut();
    } catch (e) {
      console.warn("Logout:", e);
    }
    window.location.replace("/");
  };
})();
