/**
 * Modo demonstração do Capital Novo.
 * Ativado por ?demo=1 (com sessionStorage gfp_demo_active) ou sessão já marcada.
 * NÃO sincroniza com a nuvem — dados fictícios locais apenas.
 */
(function () {
  "use strict";

  var DEMO_FLAG = "gfp_demo_active";
  var DEMO_EMAIL_KEY = "gfp_demo_email";
  var DEMO_BACKUP_KEY = "gfp_demo_backup_v1";

  function qsDemo() {
    try {
      return new URLSearchParams(window.location.search).get("demo") === "1";
    } catch (e) {
      return false;
    }
  }

  function isDemoActive() {
    if (window.gfpIsDemo === true) return true;
    try {
      if (sessionStorage.getItem(DEMO_FLAG) === "1") return true;
    } catch (e) {}
    return qsDemo();
  }

  function getDemoEmail() {
    try {
      return (sessionStorage.getItem(DEMO_EMAIL_KEY) || "").trim().toLowerCase();
    } catch (e) {
      return "";
    }
  }

  function markDemoSession(email) {
    try {
      sessionStorage.setItem(DEMO_FLAG, "1");
      if (email) sessionStorage.setItem(DEMO_EMAIL_KEY, String(email).trim().toLowerCase());
    } catch (e) {}
    window.gfpIsDemo = true;
    window.GFP_STORAGE_MODE = "local";
  }

  function clearDemoSession() {
    try {
      sessionStorage.removeItem(DEMO_FLAG);
      sessionStorage.removeItem(DEMO_EMAIL_KEY);
    } catch (e) {}
    window.gfpIsDemo = false;
  }

  function hoyISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function ymKey(d) {
    return d.getFullYear() + "-" + d.getMonth();
  }

  function id(prefix) {
    return (
      (prefix || "d") +
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 8)
    );
  }

  function diasAtras(n) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }

  /** Snapshot localStorage com dados fáceis de entender (gastos do dia a dia). */
  function buildDemoSnapshot() {
    var hoje = hoyISO();
    var now = new Date();
    var year = String(now.getFullYear());
    var monthIdx = String(now.getMonth());
    var jurosKey = ymKey(now);

    var catNubank = {
      id: "demo-card-nubank",
      nome: "Nubank",
      matches: ["Nubank"],
      diaVencimento: 10,
      matchCategorias: [],
      vencimentoAnual: null,
      diaFechamentoFatura: 3,
    };
    var catInter = {
      id: "demo-card-inter",
      nome: "Inter",
      matches: ["Inter"],
      diaVencimento: 15,
      matchCategorias: [],
      vencimentoAnual: null,
      diaFechamentoFatura: 8,
    };

    var renda1 = 5500;
    var renda2 = 1200;
    var rendaTotal = renda1 + renda2;
    var rendaMeses = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    rendaMeses[now.getMonth()] = rendaTotal;

    var saldoPartes = [
      { id: "renda-1", label: "Salário", valor: renda1 },
      { id: "renda-2", label: "Freelance", valor: renda2 },
      { id: "outros-a", label: "", valor: 0 },
    ];

    var partesPorMes = {};
    partesPorMes[year + "-" + monthIdx] = saldoPartes.map(function (p) {
      return { id: p.id, label: p.label, valor: p.valor };
    });

    var gastos = [
      {
        id: id("g"),
        data: diasAtras(2),
        valor: 287.4,
        descricao: "Mercado da semana",
        categoria: "Mercado",
        meioPagamento: "Pix",
        origem: "Nubank",
      },
      {
        id: id("g"),
        data: diasAtras(5),
        valor: 48.9,
        descricao: "Uber para o trabalho",
        categoria: "Transporte",
        meioPagamento: "Débito",
        origem: "Inter",
      },
      {
        id: id("g"),
        data: diasAtras(8),
        valor: 75,
        descricao: "Jantar com a família",
        categoria: "Lazer",
        meioPagamento: "Dinheiro",
        origem: "",
      },
      {
        id: id("g"),
        data: diasAtras(3),
        valor: 55.9,
        descricao: "Netflix",
        categoria: "Lazer",
        meioPagamento: "Crédito",
        origem: "Nubank",
        cartao: "Nubank",
      },
      {
        id: id("g"),
        data: diasAtras(6),
        valor: 189.9,
        descricao: "Farmácia e remédios",
        categoria: "Mercado",
        meioPagamento: "Crédito",
        origem: "Inter",
        cartao: "Inter",
      },
    ];

    var contasPagarAnual = {};
    contasPagarAnual[year] = {};
    contasPagarAnual[year][catNubank.id] = {};
    contasPagarAnual[year][catNubank.id][monthIdx] = {
      gastoAtual: 55.9,
      ultimaAtualizacao: hoje,
      vencimento: String(catNubank.diaVencimento),
      valorPago: null,
      dataPago: "",
      diaFechamentoFatura: catNubank.diaFechamentoFatura,
    };
    contasPagarAnual[year][catInter.id] = {};
    contasPagarAnual[year][catInter.id][monthIdx] = {
      gastoAtual: 189.9,
      ultimaAtualizacao: hoje,
      vencimento: String(catInter.diaVencimento),
      valorPago: null,
      dataPago: "",
      diaFechamentoFatura: catInter.diaFechamentoFatura,
    };

    var calendarioJuros = {};
    calendarioJuros[jurosKey] = [
      {
        id: id("j"),
        juros: 49.9,
        oQueE: "Anuidade cartão Nubank",
        quando: String(catNubank.diaVencimento),
        origem: "Nubank",
        congelado: false,
      },
    ];

    var compraPetr = {
      id: id("c"),
      data: diasAtras(40),
      investido: 1000,
      preco: 36.5,
      qty: 1000 / 36.5,
      criadoEm: Date.now() - 40 * 86400000,
    };
    var compraMxrf = {
      id: id("c"),
      data: diasAtras(25),
      investido: 800,
      preco: 10.05,
      qty: 800 / 10.05,
      criadoEm: Date.now() - 25 * 86400000,
    };
    var compraBova = {
      id: id("c"),
      data: diasAtras(18),
      investido: 1200,
      preco: 125,
      qty: 1200 / 125,
      criadoEm: Date.now() - 18 * 86400000,
    };
    var compraAapl = {
      id: id("c"),
      data: diasAtras(12),
      investido: 2500,
      preco: 190,
      qty: 2500 / 190,
      criadoEm: Date.now() - 12 * 86400000,
    };

    var ativos = {
      cotacaoAuto: false,
      reinvestirAuto: false,
      tickerSelecionado: "PETR4",
      metasAlocacao: { acao: 30, fii: 25, etf: 15, exterior: 10 },
      posicoes: [
        {
          id: id("p"),
          ticker: "PETR4",
          classe: "acao",
          compras: [compraPetr],
          vendas: [],
        },
        {
          id: id("p"),
          ticker: "MXRF11",
          classe: "fii",
          compras: [compraMxrf],
          vendas: [],
        },
        {
          id: id("p"),
          ticker: "BOVA11",
          classe: "etf",
          compras: [compraBova],
          vendas: [],
        },
        {
          id: id("p"),
          ticker: "AAPL",
          classe: "exterior",
          compras: [compraAapl],
          vendas: [],
          precoManual: 195,
        },
      ],
      proventos: [],
      proventosPendentes: [],
      ultimoProventosSyncAt: 0,
    };

    var patrimonio = [
      {
        id: id("pat"),
        descricao: "Imóvel",
        futuro: false,
        aportes: [{ id: id("a"), valor: 420000, data: "2020-03-15" }],
      },
      {
        id: id("pat"),
        descricao: "Carro",
        futuro: false,
        aportes: [{ id: id("a"), valor: 48000, data: "2023-08-01" }],
      },
      {
        id: id("pat"),
        descricao: "CDB",
        futuro: false,
        aportes: [{ id: id("a"), valor: 18500, data: diasAtras(60) }],
      },
    ];

    var bitcoin = {
      precoManual: "65000",
      precoAuto: false,
      linhas: [
        {
          id: id("btc"),
          data: "2024-02-20",
          investidoBrl: 2000,
          precoAquisicaoUsd: 40000,
          cotacaoBrlPorUsd: 5,
        },
      ],
      tabelaInvestidoMoedaUsd: false,
    };

    var invest = {
      inicialUSD: "",
      inicialBRL: "0,00",
      aporteUSD: "",
      aporteBRL: "2.000,00",
      lucroMensalPct: "0,7207",
      inflacaoAnualAtiva: true,
      inflacaoAnualPct: "4",
      cotacaoManual: "5,00",
      cotacaoAuto: false,
      simulacaoEmUSD: false,
      retiradaMes: "120",
      retiradaRenda: "4.000,00",
    };

    return {
      gfp_lista_categorias_v1: JSON.stringify(["Mercado", "Moradia", "Transporte", "Lazer"]),
      gfp_lista_origens_v1: JSON.stringify(["Nubank", "Inter", "Itaú"]),
      gfp_gastos_v1: JSON.stringify(gastos),
      gfp_saldo_partes_v1: JSON.stringify(saldoPartes),
      gfp_saldo_partes_por_mes_v1: JSON.stringify(partesPorMes),
      gfp_saldo_v1: String(rendaTotal),
      gfp_renda_mensal_v1: JSON.stringify(rendaMeses),
      gfp_renda_dashboard_mes_idx_v1: String(now.getMonth()),
      gfp_renda_dashboard_ref_v1: JSON.stringify({ y: now.getFullYear(), m: now.getMonth() }),
      gfp_dashboard_gastos_ref_v1: JSON.stringify({ y: now.getFullYear(), m: now.getMonth() }),
      gfp_contas_pagar_catalog_v1: JSON.stringify([catNubank, catInter]),
      gfp_contas_pagar_anual_v1: JSON.stringify(contasPagarAnual),
      gfp_contas_fixas_catalog_v1: JSON.stringify([]),
      gfp_contas_fixas_anual_v1: JSON.stringify({}),
      gfp_calendario_juros_v1: JSON.stringify(calendarioJuros),
      gfp_calendario_origens_ordem_v1: "lancamentos",
      gfp_ativos_v1: JSON.stringify(ativos),
      gfp_patrimonio_v1: JSON.stringify(patrimonio),
      gfp_bitcoin_v1: JSON.stringify(bitcoin),
      gfp_invest_v1: JSON.stringify(invest),
      gfp_contas_v1: JSON.stringify([]),
      gfp_dashboard_anotacoes_v1: JSON.stringify({}),
      gfp_tour_dashboard_v1: "1",
    };
  }

  function backupCurrentFinancialKeys() {
    var bag = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (
          k &&
          k.indexOf("gfp_") === 0 &&
          k !== "gfp_theme_fundo" &&
          k !== "gfp_appearance" &&
          k !== "gfp_fundo_iluminacao" &&
          k !== "gfp_cloud_synced_at"
        ) {
          bag[k] = localStorage.getItem(k);
        }
      }
      sessionStorage.setItem(DEMO_BACKUP_KEY, JSON.stringify(bag));
    } catch (e) {}
  }

  function clearFinancialKeys() {
    var keys = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (
          k &&
          k.indexOf("gfp_") === 0 &&
          k !== "gfp_theme_fundo" &&
          k !== "gfp_appearance" &&
          k !== "gfp_fundo_iluminacao" &&
          k !== "gfp_cloud_synced_at"
        ) {
          keys.push(k);
        }
      }
      keys.forEach(function (k) {
        localStorage.removeItem(k);
      });
    } catch (e) {}
  }

  function applySnapshot(snap) {
    Object.keys(snap).forEach(function (k) {
      try {
        localStorage.setItem(k, snap[k] == null ? "" : String(snap[k]));
      } catch (e) {}
    });
  }

  /** Preparar localStorage com dados demo. Chamar ANTES de load(). */
  function seedDemoLocalStorage() {
    if (!isDemoActive()) return false;
    window.GFP_STORAGE_MODE = "local";
    window.gfpIsDemo = true;
    backupCurrentFinancialKeys();
    clearFinancialKeys();
    applySnapshot(buildDemoSnapshot());
    return true;
  }

  function restoreBackupAfterDemo() {
    try {
      var raw = sessionStorage.getItem(DEMO_BACKUP_KEY);
      clearFinancialKeys();
      if (raw) {
        var bag = JSON.parse(raw);
        if (bag && typeof bag === "object") applySnapshot(bag);
      }
      sessionStorage.removeItem(DEMO_BACKUP_KEY);
    } catch (e) {}
    clearDemoSession();
  }

  function mountDemoBanner() {
    if (!isDemoActive()) return;
    if (document.getElementById("gfp-demo-banner")) return;
    var email = getDemoEmail();
    var bar = document.createElement("div");
    bar.id = "gfp-demo-banner";
    bar.className =
      "sticky top-0 z-[9990] border-b border-amber-500/30 bg-gradient-to-r from-amber-950/95 via-[#1a1020]/95 to-violet-950/95 px-4 py-2.5 text-sm text-amber-50 shadow-lg backdrop-blur";
    bar.innerHTML =
      '<div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">' +
      '<p class="min-w-0 leading-snug">' +
      '<strong class="text-amber-200">Modo demonstração</strong>' +
      (email ? ' · liberado para <span class="tabular-nums text-white">' + email + "</span>" : "") +
      " · dados de exemplo, nada é salvo na sua conta." +
      "</p>" +
      '<div class="flex flex-wrap items-center gap-2">' +
      '<a href="/#oferta" class="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-black transition hover:bg-emerald-400">Assinar agora</a>' +
      '<button type="button" id="gfp-demo-sair" class="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/10">Sair da demo</button>' +
      "</div></div>";
    var body = document.body;
    if (body.firstChild) body.insertBefore(bar, body.firstChild);
    else body.appendChild(bar);
    var btn = document.getElementById("gfp-demo-sair");
    if (btn) {
      btn.addEventListener("click", function () {
        restoreBackupAfterDemo();
        window.location.replace("/");
      });
    }
  }

  window.gfpIsDemoMode = isDemoActive;
  window.gfpMarkDemoSession = markDemoSession;
  window.gfpGetDemoEmail = getDemoEmail;
  window.gfpSeedDemoLocalStorage = seedDemoLocalStorage;
  window.gfpMountDemoBanner = mountDemoBanner;
  window.gfpRestoreBackupAfterDemo = restoreBackupAfterDemo;
  window.gfpClearDemoSession = clearDemoSession;

  if (isDemoActive()) {
    window.gfpIsDemo = true;
    window.GFP_STORAGE_MODE = "local";
  }
})();
