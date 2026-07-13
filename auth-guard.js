(function () {
  async function gfpAuthGuard() {
    var loading = document.getElementById("gfp-auth-loading");
    function fail(url) {
      window.location.replace(url || "/");
    }

    function finishReady() {
      if (loading) loading.remove();
      document.documentElement.classList.add("gfp-auth-ready");
    }

    function activateDemoMode() {
      var email = "";
      try {
        email = (sessionStorage.getItem("gfp_demo_email") || "").trim().toLowerCase();
      } catch (e) {}
      if (typeof window.gfpMarkDemoSession === "function") {
        window.gfpMarkDemoSession(email || "demo@capitalnovo.app");
      } else {
        window.gfpIsDemo = true;
        window.GFP_STORAGE_MODE = "local";
      }
      window.gfpUser = {
        id: "demo-user",
        email: email || "demo@capitalnovo.app",
        app_metadata: { demo: true },
        user_metadata: { demo: true },
      };
      window.gfpSupabase = {
        auth: {
          getSession: function () {
            return Promise.resolve({ data: { session: null }, error: null });
          },
          signOut: function () {
            return Promise.resolve({ error: null });
          },
          onAuthStateChange: function () {
            return { data: { subscription: { unsubscribe: function () {} } } };
          },
        },
        from: function () {
          return {
            select: function () {
              return {
                eq: function () {
                  return {
                    maybeSingle: function () {
                      return Promise.resolve({ data: null, error: null });
                    },
                  };
                },
              };
            },
            upsert: function () {
              return Promise.resolve({ data: null, error: null });
            },
          };
        },
      };
      finishReady();
    }

    try {
      var wantsDemo = false;
      try {
        wantsDemo =
          new URLSearchParams(window.location.search).get("demo") === "1" ||
          sessionStorage.getItem("gfp_demo_active") === "1";
      } catch (e) {}

      if (
        !window.GFP_SUPABASE_URL ||
        !window.GFP_SUPABASE_ANON_KEY ||
        window.GFP_SUPABASE_URL.indexOf("SEU_PROJETO") !== -1 ||
        window.GFP_SUPABASE_ANON_KEY.indexOf("COLE_") !== -1
      ) {
        if (wantsDemo) {
          activateDemoMode();
          return;
        }
        fail("/?erro=config");
        return;
      }
      if (!window.supabase || !window.supabase.createClient) {
        if (wantsDemo) {
          activateDemoMode();
          return;
        }
        fail("/?erro=supabase");
        return;
      }

      var sb = window.supabase.createClient(window.GFP_SUPABASE_URL, window.GFP_SUPABASE_ANON_KEY);
      window.gfpSupabase = sb;
      var result = await sb.auth.getSession();
      var session = result && result.data ? result.data.session : null;

      // Demo sem sessão real: libera dashboard com dados fictícios.
      if (!session && wantsDemo) {
        activateDemoMode();
        return;
      }

      if (!session) {
        fail("/");
        return;
      }

      // Sessão real: não força demo (protege dados da conta).
      try {
        sessionStorage.removeItem("gfp_demo_active");
      } catch (e) {}
      window.gfpIsDemo = false;

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
      finishReady();
    } catch (e) {
      console.error("Auth guard:", e);
      try {
        if (
          new URLSearchParams(window.location.search).get("demo") === "1" ||
          sessionStorage.getItem("gfp_demo_active") === "1"
        ) {
          activateDemoMode();
          return;
        }
      } catch (e2) {}
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
      if (window.gfpIsDemo || (typeof window.gfpIsDemoMode === "function" && window.gfpIsDemoMode())) {
        if (typeof window.gfpRestoreBackupAfterDemo === "function") {
          window.gfpRestoreBackupAfterDemo();
        } else if (typeof window.gfpClearDemoSession === "function") {
          window.gfpClearDemoSession();
        }
        window.location.replace("/");
        return;
      }
      if (typeof window.gfpClearLocalFinancialDataIfCloud === "function") {
        window.gfpClearLocalFinancialDataIfCloud();
      }
      if (window.gfpSupabase && window.gfpSupabase.auth && window.gfpSupabase.auth.signOut) {
        await window.gfpSupabase.auth.signOut();
      }
    } catch (e) {
      console.warn("Logout:", e);
    }
    window.location.replace("/");
  };
})();
