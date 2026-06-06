// Preencha com os dados do seu projeto Supabase (Settings → API).
window.GFP_SUPABASE_URL = "https://rghwbjysexlhroidtelx.supabase.co";
window.GFP_SUPABASE_ANON_KEY = "sb_publishable_vVMZInEBwUmvMwZW7w240Q_CxhutxEy";

// Stripe (modo teste) — link de pagamento da assinatura R$ 29,90/mês
window.GFP_STRIPE_PAYMENT_LINK = "https://buy.stripe.com/test_4gM9AU5qe4Pq4bafc85gc00";
window.GFP_STRIPE_PRICE_ID = "price_1Tf4NdIW1rzzRy9NMLXoZokk";

// E-mails com acesso sem assinatura (admin / dono). Coloque o seu:
window.GFP_ADMIN_EMAILS = ["baconx95@gmail.com"];
// false = remove "Criar conta de teste" (produção)
window.GFP_ALLOW_TEST_SIGNUP = false;

// Etapa 3 — onde salvar os dados do dashboard:
// "local" = só navegador (como hoje)
// "cloud" = só Supabase
// "both"  = navegador + nuvem (transição / teste)
window.GFP_STORAGE_MODE = "both";
