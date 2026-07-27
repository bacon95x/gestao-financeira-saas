/**
 * Capital Novo — i18n PT/EN
 * Uso: data-i18n="key" | data-i18n-html | data-i18n-placeholder | data-i18n-title | data-i18n-aria
 * API: GFP.t(key), GFP.getLang(), GFP.setLang('en'|'pt'), GFP.applyI18n(root?)
 */
(function (global) {
  var STORAGE_KEY = "gfp_lang";
  var dict = {
    pt: {
      "lang.switchTo": "EN",
      "lang.switchTitle": "Switch to English",
      "lang.aria": "Idioma",

      "landing.meta.title": "Capital Novo · Organize hoje. Construa o capital de amanhã.",
      "landing.meta.desc":
        "Capital Novo — dashboard financeiro pessoal. Gastos, contas fixas, cartões, patrimônio e simulador de longo prazo em um só painel, com privacidade.",
      "landing.eyebrow": "Dashboard financeiro inteligente",
      "landing.hero.title":
        'Organize hoje.<br />Construa o capital<br /><span class="text-zinc-500">de amanhã.</span>',
      "landing.hero.sub":
        "O Capital Novo reúne gastos, contas e investimentos em um painel elegante — para você ter controle da sua vida financeira com visão de longo prazo para seu patrimônio.",
      "landing.cta.demo": "Ver demonstração grátis",
      "landing.cta.start": "Começar por R$ 29,90/mês",
      "landing.cta.hint": "Explore o dashboard com dados de exemplo — sem cartão e sem compromisso.",

      "landing.login.title": "Já tem senha? Entre",
      "landing.login.email": "E-mail",
      "landing.login.password": "Senha",
      "landing.login.submit": "Entrar",
      "landing.login.forgot": "Esqueci minha senha",
      "landing.login.create": "Acabei de pagar · criar minha senha",
      "landing.login.resetHint": "Enviaremos um link para redefinir a senha no e-mail da sua conta.",
      "landing.login.resetEmail": "E-mail da conta",
      "landing.login.resetSubmit": "Enviar link de redefinição",
      "landing.login.createTitle": "Pagamento confirmado",
      "landing.login.createHint":
        'Crie sua senha com o <strong class="text-zinc-300">mesmo e-mail</strong> que você usou para o pagamento.',
      "landing.login.createSubmit": "Criar senha e entrar",
      "landing.login.showPassword": "Mostrar senha",

      "landing.compare.title": "Sem controle vs. Com Capital Novo",
      "landing.compare.before": "Antes",
      "landing.compare.after": "Depois",
      "landing.compare.b1": "✗ Planilhas e cadernos que trazem dor de cabeça e desorganização",
      "landing.compare.b2": "✗ Esqueceu de pagar uma conta e levou multa",
      "landing.compare.b3": "✗ Surpresa na fatura todo mês",
      "landing.compare.b4": "✗ Patrimônio “mais ou menos” na cabeça",
      "landing.compare.a1": "✓ Tudo registrado em um painel só",
      "landing.compare.a2": "✓ Saiba quando e o que precisa pagar antecipadamente",
      "landing.compare.a3": "✓ Saldo e categorias sempre visíveis",
      "landing.compare.a4": "✓ Patrimônio e metas com números reais",

      "landing.benefits.title": "Feito para quem leva dinheiro a sério",
      "landing.benefits.sub": "Seis pilares que só o Capital Novo entrega com essa profundidade.",
      "landing.benefits.1.t": "Onde vai cada real",
      "landing.benefits.1.d":
        "Gráficos por categoria e origem para você saber exatamente o que gasta em cada parte da sua vida.",
      "landing.benefits.2.t": "Cartões sob controle",
      "landing.benefits.2.d": "Controle todos os seus cartões de crédito em um só lugar e organize o seu dia a dia.",
      "landing.benefits.3.t": "Projete o seu sonho",
      "landing.benefits.3.d":
        "Simulador profissional de longo prazo: juros compostos, aportes em dólar e real e patrimônio real descontado da inflação.",
      "landing.benefits.4.t": "Patrimônio personalizado",
      "landing.benefits.4.d": "O único dashboard que permite personalizar 100% como o seu patrimônio é constituído.",
      "landing.benefits.5.t": "Lance pelo WhatsApp",
      "landing.benefits.5.d":
        "Registre um gasto com uma mensagem rápida — uma linha ou um dado por linha. Consulte seus números pelo celular. Tudo sincroniza direto no dashboard.",
      "landing.benefits.6.t": "Segurança e privacidade",
      "landing.benefits.6.d":
        "Seus dados financeiros são exclusivos da sua conta. Só você acessa — nem nossa equipe vê suas finanças.",

      "landing.testimonials.title": "Depoimentos",
      "landing.testimonials.1.q":
        '"O Capital Novo virou meu ritual de domingo.<br />Em 20 minutos sei onde estou e para onde vou."',
      "landing.testimonials.1.a": "— Ricardo A. · assinante",
      "landing.testimonials.2.q":
        '"O simulador me deixa testar cenários com ou sem inflação. Pela primeira vez enxerguei se minha meta de aposentadoria era realista."',
      "landing.testimonials.2.a": "— Marina S. · assinante",
      "landing.testimonials.3.q":
        '"Personalizei tudo do meu jeito — categorias, metas e a composição do patrimônio. Do gasto do dia a dia até cada ativo, ficou realmente meu."',
      "landing.testimonials.3.a": "— Lucas F. · assinante",
      "landing.offer.badge": "7 DIAS PARA TESTAR",
      "landing.offer.priceSuffix": "/mês",
      "landing.offer.hint":
        "Acesso ao dashboard financeiro completo. Pagamento processado por provedor de cobrança certificado.",
      "landing.offer.cta": "Assinar agora",

      "landing.faq.title": "Dúvidas Frequentes",
      "landing.faq.1.q": "É seguro?",
      "landing.faq.1.a":
        "Sim. Cada conta é individual — ninguém mais acessa seus números, gastos ou investimentos. Seus dados ficam protegidos com login e senha, e a comunicação com o servidor usa criptografia. O Capital Novo não vende nem compartilha suas informações com terceiros.",
      "landing.faq.2.q": "Como funciona a assistente do WhatsApp? É IA?",
      "landing.faq.2.a":
        'A assistente do WhatsApp é um canal prático para <strong class="font-medium text-zinc-400">lançar gastos e consultar seus números</strong> sem abrir o site. Você manda uma mensagem, confirma com <em>SIM</em> ou <em>NÃO</em>, e o lançamento vai direto para o seu dashboard — sincronizado na nuvem.<br /><br /><strong class="font-medium text-zinc-400">Não é inteligência artificial generativa</strong> (não é um chatbot estilo ChatGPT). Não inventamos categorias nem decidimos gastos por você. O fluxo é guiado: menus para consultas e lançamentos no formato que você informa — uma frase ou um dado por linha.<br /><br />Isso mantém a mesma filosofia do Capital Novo: <strong class="font-medium text-zinc-400">você registra com consciência</strong>. A assistente só organiza o que você enviou e pede confirmação antes de salvar. Áreas mais sensíveis do dashboard — como sua renda ou seu patrimônio — ficam privadas e acessíveis só no site, não pelo WhatsApp.<br /><br />Para ativar, vincule seu número no dashboard (Assistente WhatsApp). Assinantes ativos têm acesso ao bot.',
      "landing.faq.3.q": "Por que não usam IA ou Open Finance?",
      "landing.faq.3.a":
        'Apps com Open Finance ou IA enxergam só o nome da maquininha e a categoria do estabelecimento — não sabem o que você comprou de verdade. Comprou um pneu de moto numa loja cadastrada como petshop? A IA marca como "pets". Para ter precisão, você acaba corrigindo manualmente mesmo.<br /><br />E há um problema maior: quando a IA faz tudo sozinha, o usuário não "sente" o gasto. A automação retira a consciência financeira. A organização vira só mais um extrato que você abre no fim do mês e se assusta com o total — como fatura de cartão que ninguém acompanhou no dia a dia.<br /><br />No Capital Novo, cada lançamento é seu — e esse esforço é proposital. Registrar "R$ 300 — pneu da moto" faz o cérebro registrar o gasto; ajudamos na mudança de comportamento financeiro, não só em tirar um retrato do passado. A IA te dá comodidade com erros; nós te damos disciplina e mentalidade para sua liberdade financeira.',
      "landing.faq.4.q": "Posso cancelar?",
      "landing.faq.4.a":
        'Sim, quando quiser. Não há fidelidade nem multa. Você cancela direto pelo dashboard (botão Assinatura). Se assinou há menos de 7 dias e quer reembolso integral, escreva para <a href="mailto:contato@capitalnovo.com.br" class="text-violet-400 hover:text-violet-300">contato@capitalnovo.com.br</a> com o mesmo e-mail da conta. Depois dos 7 dias, o acesso continua até o fim do período já pago, sem nova cobrança.',
      "landing.faq.5.q": "Funciona no celular?",
      "landing.faq.5.a":
        "Funciona em qualquer dispositivo com navegador — celular, tablet ou computador. Não precisa instalar app: abra o site, faça login e pronto. Tudo fica sincronizado na nuvem, então o que você registra no celular aparece no desktop e vice-versa. Pelo WhatsApp, você também lança e consulta sem abrir o dashboard.",
      "landing.faq.6.q": "É consultoria?",
      "landing.faq.6.a":
        "Não. O Capital Novo é uma ferramenta de organização financeira pessoal — ajuda você a ver gastos, contas, patrimônio e metas em um só lugar. Não recomendamos onde investir, não damos orientação tributária e não substituímos um contador ou planejador financeiro. A decisão é sempre sua.",

      "landing.demo.title": "Ver demonstração",
      "landing.demo.body":
        "Informe seu e-mail para liberar o painel com dados de exemplo. Sem cartão, sem compromisso — só para você conhecer o Capital Novo por dentro.",
      "landing.demo.email": "Seu e-mail",
      "landing.demo.continue": "Entrar na demonstração",
      "landing.demo.cancel": "Cancelar",
      "landing.demo.privacy":
        "Podemos enviar novidades do produto para este e-mail. Você pode pedir para sair da lista quando quiser.",

      "landing.footer.legal":
        "Ferramenta de organização financeira pessoal. Não constitui consultoria ou recomendação de investimentos.",
      "landing.footer.privacy": "Política de Privacidade",
      "landing.footer.terms": "Termos de Uso",
      "landing.footer.contact": "Contato",

      "dash.authLoading": "Verificando acesso…",
      "dash.tagline": "Seus gastos e investimentos em um só lugar",
      "dash.bg": "Fundo",
      "dash.bg.violet": "Roxo",
      "dash.bg.orange": "Laranja",
      "dash.bg.blue": "Azul",
      "dash.bg.green": "Verde",
      "dash.light": "Iluminação",
      "dash.light.low": "Baixa",
      "dash.light.high": "Alta",
      "dash.theme": "Tema",
      "dash.theme.light": "Claro",
      "dash.theme.dark": "Escuro",
      "dash.how": "Como funciona?",
      "dash.presentation": "Apresentação",
      "dash.backup": "Backup",
      "dash.subscription": "Assinatura",
      "dash.logout": "Sair",
      "dash.export": "Exportar",
      "dash.import": "Importar",
      "dash.cloud": "Nuvem",
      "dash.cloudSave": "Salvar na nuvem",
      "dash.nav": "Seções",
      "dash.tab.dashboard": "Dashboard",
      "dash.tab.lancamentos": "Lançamentos",
      "dash.tab.fixas": "Contas fixas",
      "dash.tab.cartoes": "Cartões",
      "dash.tab.juros": "Juros/taxas",
      "dash.tab.invest": "Investimentos",
      "dash.tab.patrimonio": "Patrimônio",
      "dash.tab.ativos": "Meus Ativos",
      "dash.tab.bitcoin": "Bitcoin",
      "dash.tab.dashboardTitle": "Voltar ao início · visão geral",
    },
    en: {
      "lang.switchTo": "PT",
      "lang.switchTitle": "Mudar para português",
      "lang.aria": "Language",

      "landing.meta.title": "Capital Novo · Organize today. Build tomorrow's capital.",
      "landing.meta.desc":
        "Capital Novo — personal finance dashboard. Expenses, bills, cards, net worth and long-term simulator in one private panel.",
      "landing.eyebrow": "Smart finance dashboard",
      "landing.hero.title":
        'Organize today.<br />Build tomorrow\'s<br /><span class="text-zinc-500">capital.</span>',
      "landing.hero.sub":
        "Capital Novo brings expenses, bills and investments into one elegant panel — so you stay in control with a long-term view of your wealth.",
      "landing.cta.demo": "Try the free demo",
      "landing.cta.start": "Start at R$ 29.90/mo",
      "landing.cta.hint": "Explore the dashboard with sample data — no card, no commitment.",

      "landing.login.title": "Already have a password? Sign in",
      "landing.login.email": "Email",
      "landing.login.password": "Password",
      "landing.login.submit": "Sign in",
      "landing.login.forgot": "Forgot my password",
      "landing.login.create": "Just paid · create my password",
      "landing.login.resetHint": "We'll send a reset link to your account email.",
      "landing.login.resetEmail": "Account email",
      "landing.login.resetSubmit": "Send reset link",
      "landing.login.createTitle": "Payment confirmed",
      "landing.login.createHint":
        'Create your password with the <strong class="text-zinc-300">same email</strong> you used for payment.',
      "landing.login.createSubmit": "Create password and sign in",
      "landing.login.showPassword": "Show password",

      "landing.compare.title": "Out of control vs. With Capital Novo",
      "landing.compare.before": "Before",
      "landing.compare.after": "After",
      "landing.compare.b1": "✗ Spreadsheets and notebooks that create chaos",
      "landing.compare.b2": "✗ Missed a bill and paid a late fee",
      "landing.compare.b3": "✗ Card statement surprises every month",
      "landing.compare.b4": "✗ Net worth only as a rough guess in your head",
      "landing.compare.a1": "✓ Everything in one panel",
      "landing.compare.a2": "✓ Know what to pay and when, in advance",
      "landing.compare.a3": "✓ Balance and categories always visible",
      "landing.compare.a4": "✓ Net worth and goals with real numbers",

      "landing.benefits.title": "Built for people who take money seriously",
      "landing.benefits.sub": "Six pillars only Capital Novo delivers at this depth.",
      "landing.benefits.1.t": "Where every dollar goes",
      "landing.benefits.1.d":
        "Charts by category and source so you know exactly what you spend in each part of life.",
      "landing.benefits.2.t": "Cards under control",
      "landing.benefits.2.d": "Manage all your credit cards in one place and organize your day-to-day.",
      "landing.benefits.3.t": "Project your dream",
      "landing.benefits.3.d":
        "Professional long-term simulator: compound interest, USD and BRL contributions, and real wealth after inflation.",
      "landing.benefits.4.t": "Custom net worth",
      "landing.benefits.4.d": "The only dashboard that lets you fully customize how your net worth is built.",
      "landing.benefits.5.t": "Log via WhatsApp",
      "landing.benefits.5.d":
        "Record an expense with a quick message — one line or one field per line. Check numbers on your phone. Everything syncs to the dashboard.",
      "landing.benefits.6.t": "Security and privacy",
      "landing.benefits.6.d":
        "Your financial data belongs only to your account. Only you can access it — not even our team sees your finances.",

      "landing.testimonials.title": "Testimonials",
      "landing.testimonials.1.q":
        '"Capital Novo became my Sunday ritual.<br />In 20 minutes I know where I stand and where I\'m going."',
      "landing.testimonials.1.a": "— Ricardo A. · subscriber",
      "landing.testimonials.2.q":
        '"The simulator lets me test scenarios with or without inflation. For the first time I could see if my retirement goal was realistic."',
      "landing.testimonials.2.a": "— Marina S. · subscriber",
      "landing.testimonials.3.q":
        '"I customized everything my way — categories, goals and how my net worth is built. From daily spending to every asset, it truly feels mine."',
      "landing.testimonials.3.a": "— Lucas F. · subscriber",
      "landing.offer.badge": "7 DAYS TO TRY",
      "landing.offer.priceSuffix": "/mo",
      "landing.offer.hint":
        "Full finance dashboard access. Payment processed by a certified billing provider.",
      "landing.offer.cta": "Subscribe now",

      "landing.faq.title": "FAQ",
      "landing.faq.1.q": "Is it secure?",
      "landing.faq.1.a":
        "Yes. Each account is individual — nobody else can see your numbers, expenses or investments. Data is protected with login and password, and server communication uses encryption. Capital Novo does not sell or share your information with third parties.",
      "landing.faq.2.q": "How does the WhatsApp assistant work? Is it AI?",
      "landing.faq.2.a":
        'The WhatsApp assistant is a practical channel to <strong class="font-medium text-zinc-400">log expenses and check your numbers</strong> without opening the site. You send a message, confirm with <em>YES</em> or <em>NO</em>, and the entry goes straight to your dashboard — synced in the cloud.<br /><br /><strong class="font-medium text-zinc-400">It is not generative AI</strong> (not a ChatGPT-style chatbot). We do not invent categories or decide expenses for you. The flow is guided: menus for lookups and entries in the format you provide — one sentence or one field per line.<br /><br />This keeps Capital Novo\'s philosophy: <strong class="font-medium text-zinc-400">you record with awareness</strong>. The assistant only organizes what you sent and asks for confirmation before saving. More sensitive areas of the dashboard — like income or net worth — stay private on the website, not via WhatsApp.<br /><br />To enable it, link your number in the dashboard (WhatsApp Assistant). Active subscribers have access to the bot.',
      "landing.faq.3.q": "Why not use AI or Open Finance?",
      "landing.faq.3.a":
        'Apps with Open Finance or AI often only see the merchant name and category — not what you actually bought. Bought a motorcycle tire at a store labeled as a pet shop? The AI tags it as "pets". For accuracy, you end up correcting it manually anyway.<br /><br />There is a bigger issue: when AI does everything for you, you stop "feeling" the expense. Automation removes financial awareness. Organization becomes just another statement you open at month-end and get shocked by the total — like a card bill nobody tracked day to day.<br /><br />At Capital Novo, every entry is yours — on purpose. Logging "R$ 300 — motorcycle tire" makes your brain register the spend; we help change financial behavior, not only take a photo of the past. AI gives convenience with mistakes; we give discipline and mindset for financial freedom.',
      "landing.faq.4.q": "Can I cancel?",
      "landing.faq.4.a":
        'Yes, anytime. No lock-in and no penalty. You cancel from the dashboard (Subscription button). If you subscribed less than 7 days ago and want a full refund, email <a href="mailto:contato@capitalnovo.com.br" class="text-violet-400 hover:text-violet-300">contato@capitalnovo.com.br</a> with the same account email. After 7 days, access continues until the end of the period already paid, with no further charge.',
      "landing.faq.5.q": "Does it work on mobile?",
      "landing.faq.5.a":
        "It works on any device with a browser — phone, tablet or computer. No app install needed: open the site, sign in, and you're ready. Everything syncs in the cloud, so what you log on your phone shows up on desktop and vice versa. Via WhatsApp you can also log and check numbers without opening the dashboard.",
      "landing.faq.6.q": "Is this financial advice?",
      "landing.faq.6.a":
        "No. Capital Novo is a personal finance organization tool — it helps you see expenses, bills, net worth and goals in one place. We do not recommend where to invest, give tax advice, or replace an accountant or financial planner. The decision is always yours.",

      "landing.demo.title": "Try the demo",
      "landing.demo.body":
        "Enter your email to unlock the panel with sample data. No card, no commitment — just to explore Capital Novo from the inside.",
      "landing.demo.email": "Your email",
      "landing.demo.continue": "Enter the demo",
      "landing.demo.cancel": "Cancel",
      "landing.demo.privacy":
        "We may send product updates to this email. You can ask to leave the list anytime.",

      "landing.footer.legal":
        "Personal finance organization tool. Not investment advice or consulting.",
      "landing.footer.privacy": "Privacy Policy",
      "landing.footer.terms": "Terms of Use",
      "landing.footer.contact": "Contact",

      "dash.authLoading": "Checking access…",
      "dash.tagline": "Your expenses and investments in one place",
      "dash.bg": "Background",
      "dash.bg.violet": "Violet",
      "dash.bg.orange": "Orange",
      "dash.bg.blue": "Blue",
      "dash.bg.green": "Green",
      "dash.light": "Glow",
      "dash.light.low": "Low",
      "dash.light.high": "High",
      "dash.theme": "Theme",
      "dash.theme.light": "Light",
      "dash.theme.dark": "Dark",
      "dash.how": "How it works?",
      "dash.presentation": "Presentation",
      "dash.backup": "Backup",
      "dash.subscription": "Subscription",
      "dash.logout": "Log out",
      "dash.export": "Export",
      "dash.import": "Import",
      "dash.cloud": "Cloud",
      "dash.cloudSave": "Save to cloud",
      "dash.nav": "Sections",
      "dash.tab.dashboard": "Dashboard",
      "dash.tab.lancamentos": "Transactions",
      "dash.tab.fixas": "Fixed bills",
      "dash.tab.cartoes": "Cards",
      "dash.tab.juros": "Interest/fees",
      "dash.tab.invest": "Investments",
      "dash.tab.patrimonio": "Net worth",
      "dash.tab.ativos": "My Assets",
      "dash.tab.bitcoin": "Bitcoin",
      "dash.tab.dashboardTitle": "Back to home · overview",
    },
  };

  function normalizeLang(raw) {
    if (!raw) return null;
    var s = String(raw).toLowerCase();
    if (s === "en" || s.indexOf("en") === 0) return "en";
    if (s === "pt" || s.indexOf("pt") === 0) return "pt";
    return null;
  }

  function detectLang() {
    try {
      var stored = normalizeLang(localStorage.getItem(STORAGE_KEY));
      if (stored) return stored;
    } catch (e) {}
    try {
      var nav = navigator.language || (navigator.languages && navigator.languages[0]) || "pt";
      return normalizeLang(nav) || "pt";
    } catch (e2) {
      return "pt";
    }
  }

  var current = detectLang();

  function t(key) {
    var pack = dict[current] || dict.pt;
    if (pack[key] != null) return pack[key];
    if (dict.pt[key] != null) return dict.pt[key];
    return key;
  }

  function setHtmlLang() {
    try {
      document.documentElement.lang = current === "en" ? "en" : "pt-BR";
      document.documentElement.setAttribute("data-lang", current);
    } catch (e) {}
  }

  function applyI18n(root) {
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (!key) return;
      el.textContent = t(key);
    });
    scope.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-html");
      if (!key) return;
      el.innerHTML = t(key);
    });
    scope.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-placeholder");
      if (!key) return;
      el.setAttribute("placeholder", t(key));
    });
    scope.querySelectorAll("[data-i18n-title]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-title");
      if (!key) return;
      el.setAttribute("title", t(key));
    });
    scope.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-aria");
      if (!key) return;
      el.setAttribute("aria-label", t(key));
    });

    var titleEl = document.querySelector('meta[name="description"]');
    var pageTitle = document.querySelector("title[data-i18n-doc]");
    if (pageTitle) pageTitle.textContent = t(pageTitle.getAttribute("data-i18n-doc"));
    var metaDesc = document.querySelector('meta[name="description"][data-i18n-doc]');
    if (metaDesc) metaDesc.setAttribute("content", t(metaDesc.getAttribute("data-i18n-doc")));

    document.querySelectorAll("[data-gfp-lang-btn]").forEach(function (btn) {
      btn.textContent = t("lang.switchTo");
      btn.setAttribute("title", t("lang.switchTitle"));
      btn.setAttribute("aria-label", t("lang.aria") + ": " + t("lang.switchTitle"));
    });
  }

  function setLang(lang, opts) {
    var next = normalizeLang(lang) || "pt";
    if (next === current && !(opts && opts.force)) {
      applyI18n();
      return;
    }
    current = next;
    try {
      localStorage.setItem(STORAGE_KEY, current);
    } catch (e) {}
    setHtmlLang();
    applyI18n();
    try {
      document.dispatchEvent(
        new CustomEvent("gfp:langchange", { detail: { lang: current } })
      );
    } catch (e2) {}
  }

  function toggleLang() {
    setLang(current === "en" ? "pt" : "en");
  }

  function createLangButton(extraClass) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("data-gfp-lang-btn", "1");
    btn.className =
      extraClass ||
      "inline-flex shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold tracking-wide text-zinc-200 transition hover:bg-white/10 hover:text-white";
    btn.addEventListener("click", function (ev) {
      ev.preventDefault();
      toggleLang();
    });
    return btn;
  }

  function mountLangToggle(target, extraClass) {
    if (!target) return null;
    var existing = target.querySelector("[data-gfp-lang-btn]");
    if (existing) {
      applyI18n(target);
      return existing;
    }
    var btn = createLangButton(extraClass);
    target.appendChild(btn);
    applyI18n(btn.parentNode || document);
    return btn;
  }

  setHtmlLang();

  global.GFP = global.GFP || {};
  global.GFP.i18n = {
    t: t,
    getLang: function () {
      return current;
    },
    setLang: setLang,
    toggleLang: toggleLang,
    applyI18n: applyI18n,
    mountLangToggle: mountLangToggle,
    createLangButton: createLangButton,
    dict: dict,
  };
  global.GFP.t = t;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      applyI18n();
    });
  } else {
    applyI18n();
  }
})(typeof window !== "undefined" ? window : this);
