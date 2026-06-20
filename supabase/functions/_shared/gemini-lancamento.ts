import type { LancamentoDraft } from "./gfp-dados.ts";

export type GeminiParseResult = {
  intent: "lancamento" | "outro";
  lancamento: Partial<LancamentoDraft> | null;
  faltando: string[];
};

const MEIOS = ["Dinheiro", "Pix", "Crédito", "Débito", "Vale alimentação", "outros"];

export async function parseLancamentoComGemini(
  texto: string,
  contexto: {
    hojeISO: string;
    categorias: string[];
    origens: string[];
    meiosUsados: string[];
  }
): Promise<GeminiParseResult> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return { intent: "outro", lancamento: null, faltando: ["config"] };
  }

  const prompt = `Você extrai lançamentos financeiros de mensagens em português do Brasil.
Hoje: ${contexto.hojeISO}
Categorias do usuário: ${contexto.categorias.slice(0, 40).join(", ") || "outros"}
Origens (cartões) do usuário: ${contexto.origens.slice(0, 20).join(", ") || "nenhuma"}
Meios que o usuário já usou: ${contexto.meiosUsados.join(", ") || "Pix"}

Meios válidos: ${MEIOS.join(", ")}
Se meio for Crédito, origem deve ser um cartão da lista ou o nome citado.

Mensagem: """${texto}"""

Responda SOMENTE JSON válido (sem markdown):
{
  "intent": "lancamento" | "outro",
  "lancamento": {
    "data": "YYYY-MM-DD ou null",
    "valor": number ou null,
    "categoria": "string ou null",
    "meioPagamento": "string ou null",
    "origem": "string ou null",
    "descricao": "string ou null",
    "parcelas": number ou null
  },
  "faltando": ["data"|"valor"|"categoria"|"meioPagamento"|"origem"]
}

Regras:
- "hoje" → ${contexto.hojeISO}; "ontem" → calcule
- intent=lancamento só se for registrar gasto
- faltando lista campos obrigatórios ainda ausentes (origem só se Crédito)`;

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
    encodeURIComponent(apiKey);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
    }),
  });

  if (!res.ok) {
    console.error("Gemini error:", await res.text());
    return { intent: "outro", lancamento: null, faltando: [] };
  }

  const data = await res.json();
  const rawText =
    data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  const jsonStr = rawText.replace(/^```json?\s*|\s*```$/g, "").trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      intent: parsed.intent === "lancamento" ? "lancamento" : "outro",
      lancamento: parsed.lancamento || null,
      faltando: Array.isArray(parsed.faltando) ? parsed.faltando : [],
    };
  } catch {
    console.error("Gemini JSON parse fail:", rawText);
    return { intent: "outro", lancamento: null, faltando: [] };
  }
}

export function mergeDraft(
  partial: Partial<LancamentoDraft> | null,
  faltando: string[]
): { draft: LancamentoDraft | null; stillMissing: string[] } {
  if (!partial) return { draft: null, stillMissing: faltando };
  const missing: string[] = [];
  const data = partial.data && /^\d{4}-\d{2}-\d{2}$/.test(partial.data) ? partial.data : "";
  const valor = typeof partial.valor === "number" && partial.valor > 0 ? partial.valor : 0;
  const categoria = (partial.categoria || "").trim();
  const meio = MEIOS.includes((partial.meioPagamento || "").trim())
    ? (partial.meioPagamento || "").trim()
    : (partial.meioPagamento || "").trim() || "";
  const origem = (partial.origem || "").trim();

  if (!data) missing.push("data");
  if (!valor) missing.push("valor");
  if (!categoria) missing.push("categoria");
  if (!meio) missing.push("meioPagamento");
  if (meio === "Crédito" && !origem) missing.push("origem");

  const uniq = [...new Set(missing.filter((f) => {
    if (f === "data") return !data;
    if (f === "valor") return !valor;
    if (f === "categoria") return !categoria;
    if (f === "meioPagamento") return !meio;
    if (f === "origem") return meio === "Crédito" && !origem;
    return true;
  }))];

  if (uniq.length) {
    return {
      draft: null,
      stillMissing: uniq,
    };
  }

  return {
    draft: {
      data,
      valor,
      categoria,
      meioPagamento: meio,
      descricao: (partial.descricao || categoria).trim(),
      origem: meio === "Crédito" ? origem : undefined,
      parcelas:
        typeof partial.parcelas === "number" && partial.parcelas >= 2
          ? partial.parcelas
          : undefined,
    },
    stillMissing: [],
  };
}

export function labelCampo(campo: string): string {
  const map: Record<string, string> = {
    data: "data",
    valor: "valor",
    categoria: "categoria",
    meioPagamento: "meio de pagamento",
    origem: "origem (cartão)",
  };
  return map[campo] || campo;
}
