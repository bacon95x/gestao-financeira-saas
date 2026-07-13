import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@19?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STRIPE_API_VERSION = "2026-05-27.dahlia";

function isExpired(periodEnd: string | null | undefined): boolean {
  if (!periodEnd) return false;
  const t = Date.parse(periodEnd);
  return Number.isFinite(t) && t < Date.now();
}

/** Na API 2025+, current_period_end saiu da assinatura e foi para items.data[]. */
function periodEndIso(sub: Stripe.Subscription): string | null {
  const anySub = sub as unknown as {
    current_period_end?: number;
    items?: { data?: Array<{ current_period_end?: number }> };
  };
  const fromItem = anySub.items?.data?.[0]?.current_period_end;
  const fromSub = anySub.current_period_end;
  const ts = typeof fromItem === "number" ? fromItem : typeof fromSub === "number" ? fromSub : null;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
      return new Response(JSON.stringify({ active: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: sub } = await admin
      .from("gfp_assinaturas")
      .select("status, current_period_end, stripe_subscription_id, stripe_customer_id")
      .eq("email", email)
      .maybeSingle();

    if (!sub) {
      return new Response(JSON.stringify({ active: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let status = String(sub.status || "").toLowerCase();
    let periodEnd = sub.current_period_end as string | null;
    let stripeSubId = (sub.stripe_subscription_id as string | null) || null;

    // Blindagem 1: se o período pago já acabou, trata como cancelado mesmo se o webhook falhou.
    if (status === "active" && isExpired(periodEnd)) {
      status = "canceled";
      await admin
        .from("gfp_assinaturas")
        .update({ status: "canceled", updated_at: new Date().toISOString() })
        .eq("email", email);
    }

    // Blindagem 2: se ainda parece ativo, consulta o Stripe ao vivo (fonte da verdade).
    if (status === "active" && Deno.env.get("STRIPE_SECRET_KEY")) {
      try {
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
          apiVersion: STRIPE_API_VERSION as any,
          httpClient: Stripe.createFetchHttpClient(),
        });

        let stripeSub: Stripe.Subscription | null = null;
        if (stripeSubId) {
          stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
        } else if (sub.stripe_customer_id) {
          const list = await stripe.subscriptions.list({
            customer: String(sub.stripe_customer_id),
            status: "all",
            limit: 5,
          });
          stripeSub =
            list.data.find((s) => s.status === "active" || s.status === "trialing") ||
            list.data[0] ||
            null;
          if (stripeSub) stripeSubId = stripeSub.id;
        }

        if (stripeSub) {
          const liveActive = stripeSub.status === "active" || stripeSub.status === "trialing";
          const liveEnd = periodEndIso(stripeSub);

          // Se o Stripe já cancelou, ou o período acabou: libera só até current_period_end.
          if (!liveActive || isExpired(liveEnd)) {
            status = liveActive && !isExpired(liveEnd) ? "active" : "canceled";
            if (status !== "active") {
              await admin
                .from("gfp_assinaturas")
                .update({
                  status: "canceled",
                  stripe_subscription_id: stripeSubId,
                  current_period_end: liveEnd,
                  updated_at: new Date().toISOString(),
                })
                .eq("email", email);
            }
          } else {
            // Sincroniza período vigente (útil quando checkout não gravou current_period_end).
            if (liveEnd && liveEnd !== periodEnd) {
              periodEnd = liveEnd;
              await admin
                .from("gfp_assinaturas")
                .update({
                  current_period_end: liveEnd,
                  stripe_subscription_id: stripeSubId,
                  updated_at: new Date().toISOString(),
                })
                .eq("email", email);
            }
            status = "active";
          }
        }
      } catch (e) {
        // Se o Stripe falhar, cai no status local (já filtrado por period_end acima).
        console.error("verificar-assinatura Stripe:", e);
      }
    }

    const active = status === "active";
    return new Response(JSON.stringify({ active }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ active: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
