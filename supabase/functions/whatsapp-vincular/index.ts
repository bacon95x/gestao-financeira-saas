import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

function randomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) {
      return new Response(JSON.stringify({ ok: false, error: "Não autenticado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ ok: false, error: "Sessão inválida." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "gerar";

    if (req.method === "GET" && action === "status") {
      const { data: v } = await admin
        .from("gfp_whatsapp_vinculos")
        .select("phone_e164, linked_at")
        .eq("user_id", userId)
        .maybeSingle();
      return new Response(
        JSON.stringify({
          ok: true,
          linked: !!v,
          phone_masked: v?.phone_e164
            ? "···" + String(v.phone_e164).slice(-4)
            : null,
          linked_at: v?.linked_at || null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && action === "desvincular") {
      await admin.from("gfp_whatsapp_vinculos").delete().eq("user_id", userId);
      await admin.from("gfp_whatsapp_codigos").delete().eq("user_id", userId);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && action === "gerar") {
      const code = randomCode();
      const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const { error } = await admin.from("gfp_whatsapp_codigos").upsert(
        {
          user_id: userId,
          code,
          expires_at: expires,
          created_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (error) throw error;
      return new Response(
        JSON.stringify({
          ok: true,
          code,
          expires_at: expires,
          instrucao: "No WhatsApp do Capital Novo, envie: VINCULAR " + code,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ ok: false, error: "Ação inválida." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
