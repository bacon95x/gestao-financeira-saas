import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const STORAGE_GASTOS = "gfp_gastos_v1";
export const STORAGE_LISTA_CATEGORIAS = "gfp_lista_categorias_v1";
export const STORAGE_LISTA_ORIGENS = "gfp_lista_origens_v1";

export type GfpGasto = {
  id: string;
  data: string;
  valor: number;
  descricao?: string;
  categoria?: string;
  meioPagamento?: string;
  origem?: string;
  parcelas?: number;
};

export type LancamentoDraft = {
  data: string;
  valor: number;
  categoria: string;
  meioPagamento: string;
  origem?: string;
  descricao?: string;
  parcelas?: number;
};

function bagFromPayload(payload: unknown): Record<string, string> {
  if (!payload || typeof payload !== "object") return {};
  const p = payload as Record<string, unknown>;
  const bag =
    p.data && typeof p.data === "object" && !Array.isArray(p.data)
      ? (p.data as Record<string, string>)
      : (p as Record<string, string>);
  return bag && typeof bag === "object" ? bag : {};
}

export async function loadUserBag(
  admin: SupabaseClient,
  userId: string
): Promise<Record<string, string>> {
  const { data, error } = await admin
    .from("gfp_dados")
    .select("payload")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return bagFromPayload(data?.payload);
}

export async function saveUserBag(
  admin: SupabaseClient,
  userId: string,
  bag: Record<string, string>
): Promise<void> {
  const now = new Date().toISOString();
  const payload = {
    version: 1,
    exportedAt: now,
    data: bag,
  };
  const { error } = await admin.from("gfp_dados").upsert(
    {
      user_id: userId,
      payload,
      updated_at: now,
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export function parseGastos(bag: Record<string, string>): GfpGasto[] {
  const raw = bag[STORAGE_GASTOS];
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function parseStringList(bag: Record<string, string>, key: string, fallback: string[]): string[] {
  const raw = bag[key];
  if (!raw) return fallback;
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return fallback;
    return arr.map((x) => String(x || "").trim()).filter(Boolean);
  } catch {
    return fallback;
  }
}

export function uid(): string {
  return crypto.randomUUID();
}

export async function appendGasto(
  admin: SupabaseClient,
  userId: string,
  draft: LancamentoDraft
): Promise<GfpGasto> {
  const bag = await loadUserBag(admin, userId);
  const gastos = parseGastos(bag);
  const novo: GfpGasto = {
    id: uid(),
    data: draft.data,
    valor: draft.valor,
    meioPagamento: draft.meioPagamento,
    categoria: draft.categoria,
    descricao: draft.descricao || draft.categoria,
  };
  if (draft.origem) novo.origem = draft.origem;
  if (draft.parcelas && draft.parcelas >= 2) novo.parcelas = draft.parcelas;
  gastos.push(novo);
  bag[STORAGE_GASTOS] = JSON.stringify(gastos);
  await saveUserBag(admin, userId, bag);
  return novo;
}

export async function userHasActiveSubscription(
  admin: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(userId);
  if (userErr || !userData?.user?.email) return false;
  const email = userData.user.email.trim().toLowerCase();
  const { data: sub } = await admin
    .from("gfp_assinaturas")
    .select("status")
    .eq("email", email)
    .maybeSingle();
  return !!sub && sub.status === "active";
}
