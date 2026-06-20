import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  appendGasto,
  loadUserBag,
  parseGastos,
  parseStringList,
  STORAGE_LISTA_CATEGORIAS,
  STORAGE_LISTA_ORIGENS,
  userHasActiveSubscription,
  type LancamentoDraft,
} from "../_shared/gfp-dados.ts";
import {
  labelCampo,
  mergeDraft,
  parseLancamentoComGemini,
} from "../_shared/gemini-lancamento.ts";
import {
  formatDateBR,
  formatMoneyBR,
  normalizePhoneE164,
  sendWhatsAppText,
  verifyMetaSignature,
} from "../_shared/whatsapp-api.ts";

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function isSim(text: string): boolean {
  return /^(sim|s|yes|ok|confirmo|confirma)$/i.test(text.trim());
}

function isNao(text: string): boolean {
  return /^(n[aã]o|nao|n|cancelar|cancela)$/i.test(text.trim());
}

function resumoLancamento(d: LancamentoDraft): string {
  let s =
    "• " +
    (d.descricao || d.categoria) +
    " — " +
    formatMoneyBR(d.valor) +
    "\n• Data: " +
    formatDateBR(d.data) +
    "\n• Categoria: " +
    d.categoria +
    "\n• Meio: " +
    d.meioPagamento;
  if (d.meioPagamento === "Crédito" && d.origem) s += "\n• Origem: " + d.origem;
  return s;
}

function sugestoesFaltando(
  faltando: string[],
  categorias: string[],
  origens: string[],
  meiosUsados: string[]
): string {
  const lines: string[] = [];
  if (faltando.includes("meioPagamento")) {
    const sugs = [...new Set(["Pix", "Crédito", "Débito", ...meiosUsados])].slice(0, 4);
    lines.push("Meio — ex.: " + sugs.join(", "));
  }
  if (faltando.includes("origem") && origens.length) {
    lines.push("Origem — ex.: " + origens.slice(0, 4).join(", "));
  }
  if (faltando.includes("categoria") && categorias.length) {
    lines.push("Categoria — ex.: " + categorias.slice(0, 5).join(", "));
  }
  if (faltando.includes("valor")) lines.push("Informe o valor (ex.: 45,90).");
  if (faltando.includes("data")) lines.push("Informe a data (ex.: hoje, ontem, 12/06).");
  return lines.join("\n");
}

async function tryVincular(
  admin: ReturnType<typeof adminClient>,
  phone: string,
  text: string
): Promise<boolean> {
  const m = text.trim().match(/^vincular\s*(\d{6})$/i);
  if (!m) return false;
  const code = m[1];
  const { data: row } = await admin
    .from("gfp_whatsapp_codigos")
    .select("user_id, expires_at")
    .eq("code", code)
    .maybeSingle();
  if (!row || new Date(row.expires_at).getTime() < Date.now()) {
    await sendWhatsAppText(
      phone,
      "Código inválido ou expirado. No dashboard Capital Novo, gere um código novo e envie:\nVINCULAR 123456"
    );
    return true;
  }
  const active = await userHasActiveSubscription(admin, row.user_id);
  if (!active) {
    await sendWhatsAppText(phone, "Assinatura Capital Novo inativa. Renove em capitalnovo.com.br");
    return true;
  }
  await admin.from("gfp_whatsapp_vinculos").delete().eq("user_id", row.user_id);
  await admin.from("gfp_whatsapp_vinculos").upsert({
    phone_e164: phone,
    user_id: row.user_id,
    linked_at: new Date().toISOString(),
  });
  await admin.from("gfp_whatsapp_codigos").delete().eq("user_id", row.user_id);
  await admin.from("gfp_whatsapp_pendentes").delete().eq("phone_e164", phone);
  await sendWhatsAppText(
    phone,
    "WhatsApp vinculado ao Capital Novo.\n\nExemplo de lançamento:\n«45 mercado hoje pix»\n\nDigite AJUDA para dicas."
  );
  return true;
}

async function handleMessage(admin: ReturnType<typeof adminClient>, phone: string, text: string) {
  const body = text.trim();
  if (!body) return;

  if (/^vincular\b/i.test(body)) {
    if (await tryVincular(admin, phone, body)) return;
    await sendWhatsAppText(
      phone,
      "Para vincular:\n1) Dashboard → Assistente WhatsApp → Gerar código\n2) Envie: VINCULAR 123456\n(só números, 6 dígitos)"
    );
    return;
  }

  if (/^ajuda$/i.test(body)) {
    await sendWhatsAppText(
      phone,
      "Capital Novo — assistente\n\n• Lançar: «50 mercado hoje pix»\n• Crédito: «89 restaurante ontem crédito Nubank»\n• Confirme com SIM ou cancele com NÃO\n\nCampos: valor, o quê, data, meio; em crédito, origem."
    );
    return;
  }

  const { data: vinculo } = await admin
    .from("gfp_whatsapp_vinculos")
    .select("user_id")
    .eq("phone_e164", phone)
    .maybeSingle();

  if (!vinculo) {
    await sendWhatsAppText(
      phone,
      "Conta não vinculada. No site capitalnovo.com.br → dashboard → Assistente WhatsApp → gere o código e envie:\nVINCULAR 123456"
    );
    return;
  }

  const userId = vinculo.user_id;
  const active = await userHasActiveSubscription(admin, userId);
  if (!active) {
    await sendWhatsAppText(phone, "Assinatura inativa. Acesse capitalnovo.com.br para renovar.");
    return;
  }

  const { data: pend } = await admin
    .from("gfp_whatsapp_pendentes")
    .select("draft")
    .eq("phone_e164", phone)
    .maybeSingle();

  if (pend?.draft && isSim(body)) {
    const draft = pend.draft as LancamentoDraft;
    await appendGasto(admin, userId, draft);
    await admin.from("gfp_whatsapp_pendentes").delete().eq("phone_e164", phone);
    await sendWhatsAppText(
      phone,
      "Salvo no Capital Novo.\n\n" +
        resumoLancamento(draft) +
        "\n\nAbra o dashboard para ver (sync automático)."
    );
    return;
  }

  if (pend?.draft && isNao(body)) {
    await admin.from("gfp_whatsapp_pendentes").delete().eq("phone_e164", phone);
    await sendWhatsAppText(phone, "Cancelado. Nada foi salvo.");
    return;
  }

  if (pend?.draft) {
    await sendWhatsAppText(phone, "Há um lançamento pendente. Responda SIM para salvar ou NÃO para cancelar.");
    return;
  }

  const bag = await loadUserBag(admin, userId);
  const categorias = parseStringList(bag, STORAGE_LISTA_CATEGORIAS, [
    "outros",
    "mercado",
    "restaurante",
    "transporte",
  ]);
  const origens = parseStringList(bag, STORAGE_LISTA_ORIGENS, []);
  const gastos = parseGastos(bag);
  const meiosUsados = [
    ...new Set(
      gastos
        .map((g) => (g.meioPagamento || "").trim())
        .filter(Boolean)
    ),
  ];

  const parsed = await parseLancamentoComGemini(body, {
    hojeISO: hojeISO(),
    categorias,
    origens,
    meiosUsados,
  });

  if (parsed.intent !== "lancamento") {
    await sendWhatsAppText(
      phone,
      "Não entendi como lançamento. Exemplo:\n«45 mercado hoje pix»\n\nAJUDA — ver exemplos."
    );
    return;
  }

  const { draft, stillMissing } = mergeDraft(parsed.lancamento, parsed.faltando);

  if (!draft) {
    const falt = stillMissing.map(labelCampo).join(", ");
    const sug = sugestoesFaltando(stillMissing, categorias, origens, meiosUsados);
    await sendWhatsAppText(
      phone,
      "Falta: " +
        falt +
        ".\n\n" +
        (sug || "Complete a mensagem (ex.: «50 mercado hoje pix»).") +
        "\n\nOu diga tudo de uma vez."
    );
    return;
  }

  await admin.from("gfp_whatsapp_pendentes").upsert({
    phone_e164: phone,
    draft,
    updated_at: new Date().toISOString(),
  });

  await sendWhatsAppText(
    phone,
    "Confirma este lançamento?\n\n" + resumoLancamento(draft) + "\n\nResponda SIM ou NÃO."
  );
}

function extractMessages(payload: unknown): { from: string; text: string }[] {
  const out: { from: string; text: string }[] = [];
  if (!payload || typeof payload !== "object") return out;
  const entry = (payload as { entry?: unknown[] }).entry;
  if (!Array.isArray(entry)) return out;
  for (const e of entry) {
    const changes = (e as { changes?: unknown[] }).changes;
    if (!Array.isArray(changes)) continue;
    for (const ch of changes) {
      const value = (ch as { value?: { messages?: unknown[] } }).value;
      const messages = value?.messages;
      if (!Array.isArray(messages)) continue;
      for (const msg of messages) {
        const m = msg as { from?: string; type?: string; text?: { body?: string } };
        if (m.type === "text" && m.text?.body && m.from) {
          out.push({ from: normalizePhoneE164(m.from), text: m.text.body });
        }
      }
    }
  }
  return out;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const verify = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
    if (mode === "subscribe" && token && verify && token === verify && challenge) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();
  const appSecret = Deno.env.get("WHATSAPP_APP_SECRET") || "";
  if (appSecret) {
    const sig = req.headers.get("X-Hub-Signature-256");
    const ok = await verifyMetaSignature(rawBody, sig, appSecret);
    if (!ok) {
      return new Response("Invalid signature", { status: 401 });
    }
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const admin = adminClient();
  const messages = extractMessages(payload);

  for (const { from, text } of messages) {
    if (!from) continue;
    try {
      await handleMessage(admin, from, text);
    } catch (err) {
      console.error("handleMessage", from, err);
      await sendWhatsAppText(from, "Erro temporário. Tente de novo em instantes.");
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
