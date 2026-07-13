import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@19?target=denonext";

const STRIPE_API_VERSION = "2026-05-27.dahlia";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  // Conta em produção usa API Dahlia (2026). Versão antiga (2024-11-20) derruba a function.
  apiVersion: STRIPE_API_VERSION as any,
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();

function emailFromSession(session: Stripe.Checkout.Session): string | null {
  const e = session.customer_details?.email || session.customer_email;
  return e ? String(e).trim().toLowerCase() : null;
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

async function upsertAssinatura(row: {
  email: string;
  status: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  current_period_end?: string | null;
}) {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { error } = await admin.from("gfp_assinaturas").upsert(
    {
      email: row.email,
      status: row.status,
      stripe_customer_id: row.stripe_customer_id ?? null,
      stripe_subscription_id: row.stripe_subscription_id ?? null,
      current_period_end: row.current_period_end ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email" }
  );
  if (error) throw error;
}

Deno.serve(async (req) => {
  const sig = req.headers.get("Stripe-Signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!sig || !secret) {
    return new Response("Webhook não configurado", { status: 400 });
  }
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      secret,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    return new Response(`Assinatura inválida: ${err}`, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const email = emailFromSession(session);
      if (email) {
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id ?? null;
        let periodEnd: string | null = null;
        if (subId) {
          try {
            const sub = await stripe.subscriptions.retrieve(subId);
            periodEnd = periodEndIso(sub);
          } catch (e) {
            console.error("checkout.session.completed: falha ao buscar período", e);
          }
        }
        await upsertAssinatura({
          email,
          status: "active",
          stripe_customer_id:
            typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
          stripe_subscription_id: subId,
          current_period_end: periodEnd,
        });
      }
    }
    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.created"
    ) {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
      let email: string | null = null;
      if (customerId) {
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer.deleted && customer.email) {
          email = customer.email.trim().toLowerCase();
        }
      }
      if (email) {
        const active = sub.status === "active" || sub.status === "trialing";
        await upsertAssinatura({
          email,
          status: active ? "active" : sub.status,
          stripe_customer_id: customerId ?? null,
          stripe_subscription_id: sub.id,
          current_period_end: periodEndIso(sub),
        });
      }
    }
    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
      if (customerId) {
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer.deleted && customer.email) {
          await upsertAssinatura({
            email: customer.email.trim().toLowerCase(),
            status: "canceled",
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            current_period_end: periodEndIso(sub),
          });
        }
      }
    }
  } catch (e) {
    console.error(e);
    return new Response(`Erro: ${e}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
