// Preencha com os dados do seu projeto Supabase (Settings → API).
window.GFP_SUPABASE_URL = "https://rghwbjysexlhroidtelx.supabase.co";
window.GFP_SUPABASE_ANON_KEY = "sb_publishable_vVMZInEBwUmvMwZW7w240Q_CxhutxEy";

// Stripe (produção) — link BRL R$ 29,90/mês (Capital Novo PT)
window.GFP_STRIPE_PAYMENT_LINK = "https://buy.stripe.com/7sY7sL1qSborep6axq1Nu03";
window.GFP_STRIPE_PRICE_ID = "price_1TfP4hEYrZTD5Sl51ggP3EiW";
// Stripe USD US$ 9,90/mês (Capital novo EN)
window.GFP_STRIPE_PAYMENT_LINK_USD = "https://buy.stripe.com/fZueVdc5w50380I34Y1Nu02";
window.GFP_STRIPE_PRICE_ID_USD = "";

// E-mails com acesso sem assinatura (admin / dono). Coloque o seu:
window.GFP_ADMIN_EMAILS = ["baconx95@gmail.com", "anbtunado@gmail.com", "bnbezerra@gmail.com"];
// false = remove "Criar conta de teste" (produção)
window.GFP_ALLOW_TEST_SIGNUP = false;

// WhatsApp Capital Novo — número para vincular e usar o assistente
window.GFP_WHATSAPP_DISPLAY = "+55 11 97773-2973";
window.GFP_WHATSAPP_E164 = "5511977732973";

// Etapa 3 — onde salvar os dados do dashboard:
// "local" = só navegador (como hoje)
// "cloud" = só Supabase
// "both"  = navegador + nuvem (transição / teste)
window.GFP_STORAGE_MODE = "cloud";
